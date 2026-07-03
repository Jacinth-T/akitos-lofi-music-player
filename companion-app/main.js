/**
 * Akito's Music — Discord RPC Companion App (Electron)
 *
 * Main process: creates the status window, system tray, and wires
 * the Discord IPC and WebSocket server modules together.
 *
 * Closing the window hides it to the tray — the app keeps running
 * in the background. Tray click or "Open" restores the window.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const DiscordIPC = require('./discord-ipc');
const WSServer = require('./ws-server');

const VERSION = '1.0.0';
const WS_PORT = 9463;

// ---- Single Instance Lock ----
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}

// ---- Logging ----
const logDir = path.join(app.getPath('appData'), 'AkitosMusic');
const logFile = path.join(logDir, 'companion.log');
try { fs.mkdirSync(logDir, { recursive: true }); } catch {}

function log(msg) {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${msg}`;
    try { fs.appendFileSync(logFile, line + '\n'); } catch {}
}

// ---- Tray Icon Generation ----
// Creates a 32x32 purple circle with white music note as a PNG nativeImage.
// Reused from the original systray2-based companion app — pixel drawing is identical.
function generateTrayIcon() {
    const size = 32;
    const raw = Buffer.alloc(size * (1 + size * 4));
    const center = size / 2;
    const outerR = size / 2 - 1;
    const innerR = outerR - 1.5;

    for (let y = 0; y < size; y++) {
        const row = y * (1 + size * 4);
        raw[row] = 0; // PNG filter: None

        for (let x = 0; x < size; x++) {
            const px = row + 1 + x * 4;
            const dx = x - center + 0.5;
            const dy = y - center + 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= innerR) {
                raw[px] = 0xbd; raw[px + 1] = 0x93; raw[px + 2] = 0xf9; raw[px + 3] = 0xff;
            } else if (dist <= outerR) {
                const a = Math.round(Math.max(0, Math.min(1, outerR - dist)) * 255);
                raw[px] = 0xbd; raw[px + 1] = 0x93; raw[px + 2] = 0xf9; raw[px + 3] = a;
            }
        }
    }

    // Draw white music note inside the circle
    for (let y = 0; y < size; y++) {
        const row = y * (1 + size * 4);
        for (let x = 0; x < size; x++) {
            const px = row + 1 + x * 4;
            if (raw[px + 3] === 0) continue;

            let drawWhite = false;

            // Note head (ellipse)
            const ex = (x - 14) / 4.5;
            const ey = (y - 21) / 3;
            if (ex * ex + ey * ey <= 1) drawWhite = true;

            // Stem
            if (x >= 18 && x <= 19 && y >= 10 && y <= 21) drawWhite = true;

            // Flag
            if (x >= 19 && x <= 23 && y >= 10 && y <= 15) {
                const fy = y - 10;
                const maxX = 19 + Math.round(fy * 0.8);
                if (x <= maxX + 1 && fy <= 4) drawWhite = true;
            }

            if (drawWhite) {
                raw[px] = 0xff; raw[px + 1] = 0xff; raw[px + 2] = 0xff;
            }
        }
    }

    const compressed = zlib.deflateSync(raw);
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(size, 0);
    ihdrData.writeUInt32BE(size, 4);
    ihdrData[8] = 8; ihdrData[9] = 6;

    const pngBuffer = Buffer.concat([
        sig,
        pngChunk('IHDR', ihdrData),
        pngChunk('IDAT', compressed),
        pngChunk('IEND', Buffer.alloc(0))
    ]);

    return nativeImage.createFromBuffer(pngBuffer);
}

function pngChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crcBuf]);
}

function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}

// ---- App State ----
let mainWindow = null;
let tray = null;
let isQuitting = false;
let discordIPC = null;
let wsServer = null;

// Cached state for re-sending when window is shown after being hidden
let cachedDiscordStatus = { status: 'connecting' };
let cachedBrowserStatus = { connected: false };
let cachedTrack = null;

// ---- Helper ----
function sendToRenderer(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

// ---- App Ready ----
app.on('ready', () => {
    log(`=== Akito's Music RPC Companion v${VERSION} started ===`);

    // ---- Tray ----
    const trayIcon = generateTrayIcon();
    tray = new Tray(trayIcon);
    tray.setToolTip(`Akito's Music RPC v${VERSION}`);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
            click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } }
        },
        {
            label: 'Open Log File',
            click: () => shell.openPath(logFile)
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => { isQuitting = true; app.quit(); }
        }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    });

    log('System tray icon created');

    // ---- Window ----
    mainWindow = new BrowserWindow({
        width: 420,
        height: 360,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        icon: trayIcon,
        title: "Akito's Music — Companion",
        backgroundColor: '#1a1a2e',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.removeMenu();
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Close-to-tray: hide window instead of quitting
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    // Re-send cached state when window is shown after being hidden
    mainWindow.on('show', () => {
        sendToRenderer('status-update', cachedDiscordStatus);
        sendToRenderer('browser-status', cachedBrowserStatus);
        sendToRenderer('track-update', cachedTrack);
    });

    // ---- Create Modules ----
    discordIPC = new DiscordIPC(log);
    wsServer = new WSServer(WS_PORT, log);

    // ---- Wire: Discord IPC → Renderer + WS Broadcast ----
    discordIPC.on('status', (data) => {
        cachedDiscordStatus = data;
        sendToRenderer('status-update', data);

        // Broadcast RPC readiness to all connected browsers
        const isReady = data.status === 'connected';
        wsServer.broadcastStatus(isReady);
    });

    // ---- Wire: WS Server → Discord IPC + Renderer ----
    wsServer.on('track-update', (data) => {
        cachedTrack = data;
        discordIPC.setActivity(data);
        sendToRenderer('track-update', data);
    });

    wsServer.on('track-clear', () => {
        cachedTrack = null;
        discordIPC.clearActivity();
        sendToRenderer('track-update', null);
    });

    wsServer.on('browser-connected', () => {
        cachedBrowserStatus = { connected: true };
        sendToRenderer('browser-status', cachedBrowserStatus);
    });

    wsServer.on('browser-disconnected', () => {
        cachedBrowserStatus = { connected: false };
        sendToRenderer('browser-status', cachedBrowserStatus);
        // Clear activity when browser disconnects (same as original)
        cachedTrack = null;
        discordIPC.clearActivity();
        sendToRenderer('track-update', null);
    });

    // ---- IPC from Renderer ----
    ipcMain.on('quit-app', () => {
        isQuitting = true;
        app.quit();
    });

    // ---- Start Modules ----
    wsServer.start();
    discordIPC.connect();
});

// ---- Second Instance: show existing window ----
app.on('second-instance', () => {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
});

// ---- Shutdown ----
app.on('before-quit', () => {
    isQuitting = true;
});

app.on('will-quit', () => {
    log('Shutting down...');
    if (discordIPC) discordIPC.destroy();
    if (wsServer) wsServer.close();
});

// ---- Error Handling ----
process.on('uncaughtException', (err) => {
    if (err.message && err.message.includes('stdin')) return;
    log(`ERROR: Uncaught: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
    log(`ERROR: Unhandled Rejection: ${reason}`);
});
