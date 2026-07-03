/**
 * Discord Rich Presence via Gateway WebSocket
 * Connects using a user token and sends presence updates (op 3)
 * Activity type 2 = "Listening to"
 */

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';

let ws = null;
let heartbeatInterval = null;
let heartbeatTimer = null;
let lastSequence = null;
let isConnected = false;
let currentToken = null;
let reconnectTimeout = null;
let statusCallback = null;

/**
 * Set a callback to receive connection status changes
 * @param {function} cb - Called with 'connected', 'disconnected', 'connecting', 'error'
 */
export function onStatusChange(cb) {
    statusCallback = cb;
}

function emitStatus(status) {
    if (statusCallback) statusCallback(status);
}

/**
 * Connect to Discord Gateway and authenticate
 * @param {string} token - Discord user token
 */
export function connectDiscordRPC(token) {
    if (ws) disconnectDiscordRPC();

    currentToken = token;
    emitStatus('connecting');

    try {
        ws = new WebSocket(GATEWAY_URL);
    } catch (err) {
        console.error('[Discord RPC] WebSocket creation failed:', err);
        emitStatus('error');
        return;
    }

    ws.onopen = () => {
        console.log('[Discord RPC] WebSocket opened');
    };

    ws.onmessage = (event) => {
        let payload;
        try {
            payload = JSON.parse(event.data);
        } catch {
            return;
        }

        const { op, d, s, t } = payload;

        // Track sequence number for heartbeats
        if (s !== null && s !== undefined) {
            lastSequence = s;
        }

        switch (op) {
            case 10: // Hello
                heartbeatInterval = d.heartbeat_interval;
                startHeartbeat();
                sendIdentify();
                break;

            case 11: // Heartbeat ACK
                // Connection is alive
                break;

            case 0: // Dispatch
                if (t === 'READY') {
                    isConnected = true;
                    console.log('[Discord RPC] Connected and authenticated');
                    emitStatus('connected');
                }
                break;

            case 7: // Reconnect
                console.log('[Discord RPC] Server requested reconnect');
                reconnect();
                break;

            case 9: // Invalid Session
                console.error('[Discord RPC] Invalid session');
                isConnected = false;
                emitStatus('error');
                stopHeartbeat();
                break;

            case 1: // Heartbeat request from server
                sendHeartbeat();
                break;
        }
    };

    ws.onerror = (err) => {
        console.error('[Discord RPC] WebSocket error:', err);
        emitStatus('error');
    };

    ws.onclose = (event) => {
        console.log('[Discord RPC] WebSocket closed:', event.code, event.reason);
        isConnected = false;
        stopHeartbeat();

        // Auto-reconnect on abnormal closure (not user-initiated)
        if (currentToken && event.code !== 1000 && event.code !== 4004) {
            emitStatus('connecting');
            reconnectTimeout = setTimeout(() => {
                if (currentToken) connectDiscordRPC(currentToken);
            }, 5000);
        } else {
            emitStatus('disconnected');
        }
    };
}

function sendIdentify() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const identifyPayload = {
        op: 2,
        d: {
            token: currentToken,
            properties: {
                os: 'Windows',
                browser: 'Chrome',
                device: ''
            },
            compress: false,
            intents: 0
        }
    };

    ws.send(JSON.stringify(identifyPayload));
}

function startHeartbeat() {
    stopHeartbeat();

    // Send first heartbeat after a random jitter (as per Discord docs)
    const jitter = Math.random();
    setTimeout(() => {
        sendHeartbeat();
        heartbeatTimer = setInterval(sendHeartbeat, heartbeatInterval);
    }, heartbeatInterval * jitter);
}

function sendHeartbeat() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ op: 1, d: lastSequence }));
}

function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

function reconnect() {
    stopHeartbeat();
    if (ws) {
        try { ws.close(); } catch { }
        ws = null;
    }
    if (currentToken) {
        setTimeout(() => connectDiscordRPC(currentToken), 2000);
    }
}

/**
 * Update the Discord presence with current track info
 * @param {string} title - Track title
 * @param {string} artist - Artist/channel name
 * @param {string} [artworkUrl] - Optional album art URL
 */
export function updateDiscordPresence(title, artist, artworkUrl) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isConnected) return;

    const activity = {
        name: "Akito's Music",
        type: 2, // "Listening to"
        details: title || 'Unknown Track',
        state: artist || 'Unknown Artist',
        timestamps: {
            start: Date.now()
        }
    };

    // Add artwork as large_image (fallback to app logo if none provided)
    const finalArtworkUrl = artworkUrl || (window.location.origin + '/discord-app.png');
    
    activity.assets = {
        large_image: finalArtworkUrl,
        large_text: "Akito's Music"
    };

    const presencePayload = {
        op: 3,
        d: {
            since: null,
            activities: [activity],
            status: 'online',
            afk: false
        }
    };

    ws.send(JSON.stringify(presencePayload));
    console.log('[Discord RPC] Presence updated:', title, '-', artist);
}

/**
 * Clear the Discord presence (remove activity)
 */
export function clearDiscordPresence() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isConnected) return;

    const clearPayload = {
        op: 3,
        d: {
            since: null,
            activities: [],
            status: 'online',
            afk: false
        }
    };

    ws.send(JSON.stringify(clearPayload));
    console.log('[Discord RPC] Presence cleared');
}

/**
 * Disconnect from Discord Gateway cleanly
 */
export function disconnectDiscordRPC() {
    currentToken = null;
    isConnected = false;
    stopHeartbeat();

    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    if (ws) {
        try {
            clearDiscordPresence();
            ws.close(1000, 'User disconnected');
        } catch { }
        ws = null;
    }

    emitStatus('disconnected');
    console.log('[Discord RPC] Disconnected');
}

/**
 * Check if RPC is currently connected
 */
export function isDiscordConnected() {
    return isConnected;
}
