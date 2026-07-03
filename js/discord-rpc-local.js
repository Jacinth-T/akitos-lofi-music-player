/**
 * Discord RPC via Local Companion App
 * 
 * Connects to the Akito's Music companion app running on localhost:6463
 * via WebSocket. The companion app handles the Discord IPC connection.
 * No Discord token needed!
 */

const WS_URL = 'ws://localhost:9463';

let ws = null;
let isConnected = false;
let reconnectTimer = null;
let statusCallback = null;
let intentionalDisconnect = false;

/**
 * Set a callback to receive connection status changes
 * @param {function} cb - Called with 'connected', 'disconnected', 'connecting', 'error', 'not-found'
 */
export function onLocalStatusChange(cb) {
    statusCallback = cb;
}

function emitStatus(status) {
    if (statusCallback) statusCallback(status);
}

/**
 * Connect to the local companion app
 */
export function connectLocalRPC() {
    if (ws) disconnectLocalRPC();
    
    intentionalDisconnect = false;
    emitStatus('connecting');

    try {
        ws = new WebSocket(WS_URL);
    } catch (err) {
        console.error('[Local RPC] WebSocket creation failed:', err);
        emitStatus('not-found');
        return;
    }

    // Timeout if connection takes too long (app not running)
    const connectTimeout = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            emitStatus('not-found');
        }
    }, 3000);

    ws.onopen = () => {
        clearTimeout(connectTimeout);
        console.log('[Local RPC] Connected to companion app');
    };

    ws.onmessage = (event) => {
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch {
            return;
        }

        if (msg.type === 'hello') {
            isConnected = true;
            emitStatus('connected');
            console.log(`[Local RPC] Companion app v${msg.version} ready (Discord: ${msg.rpcReady ? 'connected' : 'connecting...'})`);
        } else if (msg.type === 'pong') {
            // Heartbeat response
        }
    };

    ws.onerror = () => {
        clearTimeout(connectTimeout);
        // Don't log the raw error object - it's not useful in browsers
    };

    ws.onclose = () => {
        clearTimeout(connectTimeout);
        isConnected = false;
        ws = null;

        if (!intentionalDisconnect) {
            emitStatus('not-found');
            // Auto-reconnect every 5 seconds
            reconnectTimer = setTimeout(() => {
                if (!intentionalDisconnect) {
                    connectLocalRPC();
                }
            }, 5000);
        } else {
            emitStatus('disconnected');
        }
    };
}

/**
 * Disconnect from the companion app
 */
export function disconnectLocalRPC() {
    intentionalDisconnect = true;
    isConnected = false;

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (ws) {
        try {
            // Tell companion to clear the activity
            ws.send(JSON.stringify({ type: 'clear' }));
            ws.close(1000, 'User disconnected');
        } catch { }
        ws = null;
    }

    emitStatus('disconnected');
    console.log('[Local RPC] Disconnected');
}

/**
 * Send track info to the companion app
 */
export function updateLocalPresence(title, artist, artwork) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isConnected) return;

    ws.send(JSON.stringify({
        type: 'update',
        title: title || 'Unknown Track',
        artist: artist || 'Unknown Artist',
        artwork: artwork || null
    }));
}

/**
 * Clear the presence via companion app
 */
export function clearLocalPresence() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isConnected) return;
    ws.send(JSON.stringify({ type: 'clear' }));
}

/**
 * Check if connected to the companion app
 */
export function isLocalConnected() {
    return isConnected;
}
