import { initClock } from './clock.js';
import { initThemes } from './themes.js';
import { initAnimations, setAnimation } from './animations.js';
import { initAmbience, restoreSavedAmbience } from './ambience.js';
import { initPlayer } from './player.js';
import { saveState, getState } from './storage.js';
import { connectDiscordRPC, disconnectDiscordRPC, updateDiscordPresence, onStatusChange, isDiscordConnected } from './discord-rpc.js';
import { connectLocalRPC, disconnectLocalRPC, updateLocalPresence, onLocalStatusChange, isLocalConnected } from './discord-rpc-local.js';
import { getArtwork, getCurrentTrackInfo, togglePlay, next, prev } from './player.js';

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initAnimations();

    initThemes((theme) => {
        setAnimation(theme.animation);
    });

    initAmbience();
    initPlayer((isPlaying) => {
        const { title, artist, artwork } = getCurrentTrackInfo();
        if (isDiscordConnected()) {
            updateDiscordPresence(title, artist, artwork);
        }
        if (isLocalConnected()) {
            updateLocalPresence(title, artist, artwork);
        }
    });

    const savedAccent = getState('accent');
    if (savedAccent) {
        setAccentColor(savedAccent);
    }

    const panelTabs = document.querySelectorAll('.panel-tab');
    const toggleBtn = document.getElementById('toggle-panels-btn');
    const sidePanel = document.getElementById('side-panel');
    const queuePanel = document.getElementById('queue-panel');

    function closePanel(panel) {
        if (panel.classList.contains('open')) {
            panel.classList.remove('open');
            panel.classList.add('closing');
            panel.addEventListener('animationend', function handleAnimationEnd() {
                panel.classList.remove('closing');
                panel.removeEventListener('animationend', handleAnimationEnd);
            });
        }
    }
    
    function openPanel(panel) {
        panel.classList.remove('closing');
        panel.classList.add('open');
    }
    
    function togglePanel(panel) {
        if (panel.classList.contains('open')) {
            closePanel(panel);
        } else {
            openPanel(panel);
        }
    }

    const btnToggleAdvanced = document.getElementById('btn-toggle-advanced');
    if (btnToggleAdvanced) {
        btnToggleAdvanced.addEventListener('click', () => {
            const container = document.getElementById('advanced-settings-container');
            container.classList.toggle('expanded');
            const isExpanded = container.classList.contains('expanded');
            btnToggleAdvanced.textContent = isExpanded ? 'Hide Advanced Settings' : 'Show Advanced Settings';
        });
    }

    toggleBtn.addEventListener('click', () => {
        togglePanel(sidePanel);
    });

    const menuBtn = document.getElementById('btn-menu');
    const queueBtn = document.getElementById('btn-queue');

    const updateNavButtons = () => {
        if (menuBtn) menuBtn.classList.toggle('active', sidePanel.classList.contains('open'));
        if (queueBtn) queueBtn.classList.toggle('active', queuePanel.classList.contains('open'));
    };

    panelTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            panelTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
            updateNavButtons();
        });
    });

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            closePanel(queuePanel);
            togglePanel(sidePanel);
            updateNavButtons();
        });
    }

    document.getElementById('queue-close').addEventListener('click', () => {
        closePanel(queuePanel);
        updateNavButtons();
    });

    queueBtn.addEventListener('click', () => {
        closePanel(sidePanel);
        togglePanel(queuePanel);
        updateNavButtons();
    });

    const focusBtn = document.getElementById('btn-focus');

    const lockIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    const unlockIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;

    if (focusBtn) {
        focusBtn.addEventListener('click', () => {
            const isFocusMode = document.body.classList.toggle('focus-mode');
            focusBtn.classList.toggle('active', isFocusMode);
            if (isFocusMode) {
                focusBtn.innerHTML = unlockIcon;
                focusBtn.setAttribute('title', 'Exit Focus Mode');
            } else {
                focusBtn.innerHTML = lockIcon;
                focusBtn.setAttribute('title', 'Focus Mode');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidePanel.contains(e.target) &&
                !toggleBtn.contains(e.target) &&
                (!menuBtn || !menuBtn.contains(e.target))) {
                sidePanel.classList.remove('open');
                updateNavButtons();
            }
        }
    });

    // Initial button state sync
    updateNavButtons();

    const resumeAudio = () => {
        restoreSavedAmbience();
        document.removeEventListener('click', resumeAudio);
        document.removeEventListener('keydown', resumeAudio);
    };
    document.addEventListener('click', resumeAudio);
    document.addEventListener('keydown', resumeAudio);

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch(e.code) {
            case 'Space':
                e.preventDefault();
                const playBtn = document.getElementById('btn-play');
                if (playBtn) playBtn.click();
                break;
            case 'KeyM':
                const volBtn = document.getElementById('btn-volume');
                if (volBtn) volBtn.click();
                break;
            case 'ArrowUp':
                e.preventDefault();
                const volSliderUp = document.getElementById('volume-slider');
                if (volSliderUp) {
                    volSliderUp.value = Math.min(100, parseInt(volSliderUp.value) + 10);
                    volSliderUp.dispatchEvent(new Event('input'));
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                const volSliderDown = document.getElementById('volume-slider');
                if (volSliderDown) {
                    volSliderDown.value = Math.max(0, parseInt(volSliderDown.value) - 10);
                    volSliderDown.dispatchEvent(new Event('input'));
                }
                break;
        }
    });

    const accentBtns = document.querySelectorAll('.accent-color-btn');
    accentBtns.forEach(btn => {
        if (btn.dataset.color === savedAccent) {
            accentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
        btn.addEventListener('click', () => {
            accentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const color = btn.dataset.color;
            setAccentColor(color);
            saveState({ accent: color });
        });
    });

    // --- Discord RPC Logic ---
    const discordToggle = document.getElementById('discord-toggle');
    const discordLabel = document.getElementById('discord-toggle-label');
    const discordTokenInput = document.getElementById('discord-token-input');
    const discordStatusDot = document.getElementById('discord-status-dot');

    const savedToken = sessionStorage.getItem('discordToken');
    if (savedToken) {
        discordTokenInput.value = savedToken;
    }

    discordToggle.addEventListener('click', () => {
        const token = discordTokenInput.value.trim();
        if (discordToggle.classList.contains('active')) {
            disconnectDiscordRPC();
            sessionStorage.removeItem('discordToken');
        } else {
            if (!token) {
                alert('Please enter a Discord token.');
                return;
            }
            sessionStorage.setItem('discordToken', token);
            connectDiscordRPC(token);
        }
    });

    onStatusChange((status) => {
        discordStatusDot.className = `discord-status-dot ${status}`;
        if (status === 'connected') {
            discordToggle.classList.add('active');
            discordLabel.textContent = 'ON';
            const { title, artist, artwork } = getCurrentTrackInfo();
            updateDiscordPresence(title, artist, artwork);
        } else if (status === 'disconnected') {
            discordToggle.classList.remove('active');
            discordLabel.textContent = 'OFF';
        } else if (status === 'error') {
            discordToggle.classList.remove('active');
            discordLabel.textContent = 'ERR';
        } else if (status === 'connecting') {
            discordLabel.textContent = '...';
        }
    });

    // --- Companion App (Local RPC) Logic ---
    const companionToggle = document.getElementById('companion-toggle');
    const companionLabel = document.getElementById('companion-toggle-label');
    const companionDot = document.getElementById('companion-status-dot');

    companionToggle.addEventListener('click', () => {
        if (companionToggle.classList.contains('active')) {
            disconnectLocalRPC();
        } else {
            connectLocalRPC();
        }
    });

    onLocalStatusChange((status) => {
        companionDot.className = `discord-status-dot ${status === 'not-found' ? 'error' : status}`;
        if (status === 'connected') {
            companionToggle.classList.add('active');
            companionLabel.textContent = 'ON';
            // Send current track immediately
            const { title, artist, artwork } = getCurrentTrackInfo();
            updateLocalPresence(title, artist, artwork);
        } else if (status === 'disconnected') {
            companionToggle.classList.remove('active');
            companionLabel.textContent = 'OFF';
        } else if (status === 'not-found') {
            companionToggle.classList.remove('active');
            companionLabel.textContent = 'N/A';
        } else if (status === 'connecting') {
            companionLabel.textContent = '...';
        }
    });

    // --- PiP Logic ---
    const pipBtn = document.getElementById('pip-trigger');
    let pipWindow = null;

    if (!('documentPictureInPicture' in window)) {
        pipBtn.style.display = 'none';
    } else {
        pipBtn.addEventListener('click', async () => {
            if (pipWindow) {
                pipWindow.close();
                return;
            }

            try {
                pipWindow = await documentPictureInPicture.requestWindow({
                    width: 320,
                    height: 140
                });

                pipWindow.document.title = "Akito's Music";

                pipWindow.addEventListener('pagehide', () => {
                    pipWindow = null;
                    pipBtn.classList.remove('active');
                });

                pipBtn.classList.add('active');

                // Copy styles
                [...document.styleSheets].forEach((styleSheet) => {
                    try {
                        const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                        const style = document.createElement('style');
                        style.textContent = cssRules;
                        pipWindow.document.head.appendChild(style);
                    } catch (e) {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.type = styleSheet.type;
                        link.media = styleSheet.media;
                        link.href = styleSheet.href;
                        pipWindow.document.head.appendChild(link);
                    }
                });

                const container = document.createElement('div');
                container.style.cssText = `
                    width: 100%;
                    height: 100%;
                    background: var(--bg-primary, rgba(30, 30, 40, 0.95));
                    color: white;
                    display: flex;
                    align-items: center;
                    padding: 16px;
                    gap: 16px;
                    box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                `;

                const artworkDiv = document.createElement('div');
                artworkDiv.style.cssText = `
                    width: 80px;
                    height: 80px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                `;
                
                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = `
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                `;

                const textDiv = document.createElement('div');
                const titleEl = document.createElement('div');
                titleEl.style.cssText = 'font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                const artistEl = document.createElement('div');
                artistEl.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                
                textDiv.appendChild(titleEl);
                textDiv.appendChild(artistEl);

                const controlsDiv = document.createElement('div');
                controlsDiv.style.cssText = 'display: flex; align-items: center; gap: 12px;';
                
                const prevBtn = document.createElement('button');
                prevBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>';
                const playBtn = document.createElement('button');
                const nextBtn = document.createElement('button');
                nextBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';

                const btnStyle = 'background: transparent; border: none; color: white; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;';
                prevBtn.style.cssText = btnStyle;
                playBtn.style.cssText = btnStyle;
                nextBtn.style.cssText = btnStyle;

                [prevBtn, playBtn, nextBtn].forEach(b => {
                    b.onmouseover = () => b.style.transform = 'scale(1.1)';
                    b.onmouseout = () => b.style.transform = 'scale(1)';
                });

                prevBtn.onclick = prev;
                playBtn.onclick = togglePlay;
                nextBtn.onclick = next;

                controlsDiv.appendChild(prevBtn);
                controlsDiv.appendChild(playBtn);
                controlsDiv.appendChild(nextBtn);

                infoDiv.appendChild(textDiv);
                infoDiv.appendChild(controlsDiv);

                container.appendChild(artworkDiv);
                container.appendChild(infoDiv);

                pipWindow.document.body.appendChild(container);
                pipWindow.document.body.style.margin = '0';

                const syncPiPContent = () => {
                    const currentAccent = document.documentElement.style.getPropertyValue('--accent') || '#ff79c6';
                    playBtn.style.color = currentAccent;
                    
                    const { title, artist, isPlaying, artwork } = getCurrentTrackInfo();
                    titleEl.textContent = title;
                    artistEl.textContent = artist;
                    if (artwork) {
                        artworkDiv.innerHTML = '<img src="' + artwork + '" style="width:100%; height:100%; object-fit:cover;">';
                    } else {
                        artworkDiv.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.5"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';
                    }
                    if (isPlaying) {
                        playBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
                    } else {
                        playBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
                    }
                };

                // Sync immediately
                syncPiPContent();

                // Setup observer to keep PiP in sync based on main player DOM changes
                const observer = new MutationObserver(() => syncPiPContent());
                observer.observe(document.getElementById('player-bar'), { childList: true, subtree: true, attributes: true });
                
                pipWindow.addEventListener('unload', () => observer.disconnect());

            } catch (err) {
                console.error("PiP failed: ", err);
            }
        });
    }
});

function setAccentColor(color) {
    document.documentElement.style.setProperty('--accent', color);

    // Auto-compute a lighter glow from the hex
    // Basic conversion to set a semi-transparent glow
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
}
