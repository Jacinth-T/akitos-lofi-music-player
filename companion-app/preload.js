/**
 * Preload Script — contextBridge IPC surface for the renderer
 *
 * Exposes a safe API to the renderer process without enabling nodeIntegration.
 * The renderer calls window.companionAPI.* to receive status updates and send commands.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('companionAPI', {
    /** Subscribe to Discord connection status changes */
    onStatusUpdate: (callback) => {
        ipcRenderer.on('status-update', (_event, data) => callback(data));
    },

    /** Subscribe to track info changes (data is null when nothing is playing) */
    onTrackUpdate: (callback) => {
        ipcRenderer.on('track-update', (_event, data) => callback(data));
    },

    /** Subscribe to browser WebSocket connection status changes */
    onBrowserStatus: (callback) => {
        ipcRenderer.on('browser-status', (_event, data) => callback(data));
    },

    /** Request the app to quit */
    quit: () => {
        ipcRenderer.send('quit-app');
    }
});
