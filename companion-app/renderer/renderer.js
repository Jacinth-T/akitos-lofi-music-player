/**
 * Renderer Script — updates the status window DOM
 *
 * Receives data from the main process via the companionAPI preload bridge.
 * No Node.js access — pure DOM manipulation.
 */

const discordDot = document.getElementById('discord-dot');
const discordLabel = document.getElementById('discord-label');
const browserDot = document.getElementById('browser-dot');
const browserLabel = document.getElementById('browser-label');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const trackArtwork = document.getElementById('track-artwork');
const quitBtn = document.getElementById('quit-btn');

const MUSIC_NOTE_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.4"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';

// ---- Discord Status ----
window.companionAPI.onStatusUpdate((data) => {
    discordDot.className = `status-dot ${data.status}`;

    switch (data.status) {
        case 'connected':
            discordLabel.textContent = `Discord: Connected (${data.username})`;
            break;
        case 'connecting':
            discordLabel.textContent = 'Discord: Connecting\u2026';
            break;
        case 'not-found':
            discordLabel.textContent = 'Discord: Not found \u2014 retrying\u2026';
            break;
        case 'error':
            discordLabel.textContent = 'Discord: Connection error \u2014 retrying\u2026';
            break;
        case 'disconnected':
            discordLabel.textContent = 'Discord: Disconnected \u2014 reconnecting\u2026';
            break;
    }
});

// ---- Track Info ----
window.companionAPI.onTrackUpdate((data) => {
    if (data && data.title) {
        trackTitle.textContent = data.title;
        trackArtist.textContent = data.artist || 'Unknown Artist';

        if (data.artwork) {
            const img = document.createElement('img');
            img.src = data.artwork;
            img.alt = 'Artwork';
            img.onerror = () => { trackArtwork.innerHTML = MUSIC_NOTE_SVG; };
            trackArtwork.innerHTML = '';
            trackArtwork.appendChild(img);
        } else {
            trackArtwork.innerHTML = MUSIC_NOTE_SVG;
        }
    } else {
        trackTitle.textContent = 'Not playing';
        trackArtist.textContent = 'Waiting for browser\u2026';
        trackArtwork.innerHTML = MUSIC_NOTE_SVG;
    }
});

// ---- Browser Status ----
window.companionAPI.onBrowserStatus((data) => {
    browserDot.className = `status-dot ${data.connected ? 'connected' : ''}`;
    browserLabel.textContent = data.connected
        ? 'Browser: Connected'
        : 'Browser: Not connected';
});

// ---- Quit ----
quitBtn.addEventListener('click', () => {
    window.companionAPI.quit();
});
