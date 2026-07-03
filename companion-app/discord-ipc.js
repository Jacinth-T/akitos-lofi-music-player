/**
 * Discord IPC Module — extracted from the original companion app
 *
 * Connects to Discord's local IPC pipe using the discord-rpc package.
 * Scans pipes 0–9, auto-reconnects on failure.
 * Emits events so main.js can wire it to the UI and WebSocket server.
 */

const { EventEmitter } = require('events');
const RPC = require('discord-rpc');
const net = require('net');

const CLIENT_ID = '1487995300059676672';

class DiscordIPC extends EventEmitter {
    /**
     * @param {function} logFn - Logging function (msg: string) => void
     */
    constructor(logFn) {
        super();
        this._log = logFn || (() => {});
        this._rpcClient = null;
        this._rpcReady = false;
        this._currentActivity = null;
        this._discordUser = null;
        this._reconnectTimeout = null;
        this._destroyed = false;
    }

    /**
     * Start the connection process.
     * Scans for Discord IPC pipes, then authenticates.
     */
    async connect() {
        if (this._destroyed) return;

        this.emit('status', { status: 'connecting' });

        const pipeIndex = await this._findPipe();

        if (pipeIndex === -1) {
            this._log('ERROR: No Discord IPC pipe found');
            this._log('Make sure Discord Desktop is running');
            this._log('Vencord users: enable "WebRichPresence (arRPC)" plugin');
            this.emit('status', { status: 'not-found' });
            this._reconnectTimeout = setTimeout(() => this.connect(), 10000);
            return;
        }

        this._rpcClient = new RPC.Client({ transport: 'ipc' });

        this._rpcClient.on('ready', () => {
            this._rpcReady = true;
            this._discordUser = this._rpcClient.user;
            const username = this._discordUser.discriminator !== '0'
                ? `${this._discordUser.username}#${this._discordUser.discriminator}`
                : this._discordUser.username;
            this._log(`Connected to Discord as ${username}`);
            this.emit('status', { status: 'connected', username });

            // If we had a pending activity, set it now
            if (this._currentActivity) this.setActivity(this._currentActivity);
        });

        this._rpcClient.on('disconnected', () => {
            this._rpcReady = false;
            this._discordUser = null;
            this._log('Disconnected from Discord, reconnecting...');
            this.emit('status', { status: 'disconnected' });
            if (!this._destroyed) {
                this._reconnectTimeout = setTimeout(() => this.connect(), 5000);
            }
        });

        try {
            this._log('Connecting to Discord RPC...');
            await this._rpcClient.login({ clientId: CLIENT_ID });
        } catch (err) {
            this._rpcReady = false;
            this._log(`ERROR: Discord connection failed: ${err.message || err}`);
            this.emit('status', { status: 'error' });
            if (!this._destroyed) {
                this._reconnectTimeout = setTimeout(() => this.connect(), 10000);
            }
        }
    }

    /**
     * Set the Discord Rich Presence activity.
     * @param {{ title: string, artist: string, artwork?: string }} data
     */
    setActivity(data) {
        this._currentActivity = data;

        if (!this._rpcReady || !this._rpcClient) return;

        this._rpcClient.setActivity({
            details: data.title || 'Unknown Track',
            state: data.artist || 'Unknown Artist',
            largeImageKey: data.artwork || undefined,
            largeImageText: "Akito's Music",
            instance: false,
            timestamps: { start: Math.floor(Date.now() / 1000) }
        }).then(() => {
            this._log(`Now playing: ${data.title} - ${data.artist}`);
        }).catch(err => {
            this._log(`ERROR: Failed to set activity: ${err.message}`);
        });
    }

    /**
     * Clear the Discord Rich Presence activity.
     */
    clearActivity() {
        this._currentActivity = null;

        if (!this._rpcReady || !this._rpcClient) return;
        this._rpcClient.clearActivity().catch(() => {});
        this._log('Activity cleared');
    }

    /**
     * Tear down the connection. Cannot be reconnected after this.
     */
    destroy() {
        this._destroyed = true;
        if (this._reconnectTimeout) {
            clearTimeout(this._reconnectTimeout);
            this._reconnectTimeout = null;
        }
        this.clearActivity();
        if (this._rpcClient) {
            try { this._rpcClient.destroy(); } catch {}
        }
        this._rpcClient = null;
        this._rpcReady = false;
    }

    /** @returns {boolean} */
    isReady() {
        return this._rpcReady;
    }

    /** @returns {object|null} */
    getUser() {
        return this._discordUser;
    }

    /**
     * Scan Discord IPC pipes 0–9 to find an active one.
     * @returns {Promise<number>} Pipe index, or -1 if not found
     */
    _findPipe() {
        return new Promise((resolve) => {
            let found = false;
            let checked = 0;

            for (let i = 0; i < 10; i++) {
                const pipePath = process.platform === 'win32'
                    ? `\\\\?\\pipe\\discord-ipc-${i}`
                    : `/tmp/discord-ipc-${i}`;

                const sock = net.connect(pipePath, () => {
                    sock.destroy();
                    if (!found) {
                        found = true;
                        this._log(`Found Discord IPC pipe: discord-ipc-${i}`);
                        resolve(i);
                    }
                });

                sock.on('error', () => {
                    checked++;
                    if (checked >= 10 && !found) resolve(-1);
                });

                setTimeout(() => { if (!found) sock.destroy(); }, 1500);
            }
        });
    }
}

module.exports = DiscordIPC;
