import { saveState, getState } from './storage.js';

let ytPlayer = null;
let ytReady = false;
let scWidget = null;
let currentSource = null;
let isPlaying = false;
let loopMode = 0;
let isShuffle = false;
let onStateChange = null;
let currentArtwork = null;

let queue = [];
let queueIndex = -1;

const titleEl = () => document.getElementById('player-title');
const artistEl = () => document.getElementById('player-artist');

export function initPlayer(stateCallback) {
    onStateChange = stateCallback;
    loadYouTubeAPI();

    document.getElementById('btn-play').addEventListener('click', togglePlay);
    document.getElementById('btn-next').addEventListener('click', next);
    document.getElementById('btn-prev').addEventListener('click', prev);
    document.getElementById('btn-loop').addEventListener('click', toggleLoop);
    document.getElementById('btn-shuffle').addEventListener('click', toggleShuffle);

    const volSlider = document.getElementById('volume-slider');
    const volGlow = document.getElementById('volume-glow');
    const savedVol = getState('volume') || 70;
    volSlider.value = savedVol;
    updateVolumeGlow(savedVol);
    setVolume(savedVol / 100);

    volSlider.addEventListener('input', (e) => {
        const v = parseInt(e.target.value);
        setVolume(v / 100);
        updateVolumeGlow(v);
        saveState({ volume: v });
        updateVolumeIcon(v);
    });

    document.getElementById('btn-volume').addEventListener('click', () => {
        const current = parseInt(volSlider.value);
        if (current > 0) {
            volSlider.dataset.prev = current;
            volSlider.value = 0;
            setVolume(0);
            updateVolumeGlow(0);
            updateVolumeIcon(0);
        } else {
            const prev = parseInt(volSlider.dataset.prev || 70);
            volSlider.value = prev;
            setVolume(prev / 100);
            updateVolumeGlow(prev);
            updateVolumeIcon(prev);
        }
    });

    updateVolumeIcon(savedVol);

    document.getElementById('music-url-submit').addEventListener('click', submitUrl);
    document.getElementById('music-url-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitUrl();
    });

    const savedUrl = getState('musicUrl');
    if (savedUrl) {
        document.getElementById('music-url-input').value = savedUrl;
    }
}

function updateVolumeGlow(val) {
    const glow = document.getElementById('volume-glow');
    glow.style.width = `${val}%`;
}

function updateVolumeIcon(val) {
    document.getElementById('icon-vol-on').style.display = val > 0 ? 'block' : 'none';
    document.getElementById('icon-vol-off').style.display = val > 0 ? 'none' : 'block';
    document.getElementById('btn-volume').classList.toggle('active', val === 0);
}

function submitUrl() {
    const input = document.getElementById('music-url-input');
    const url = input.value.trim();
    if (!url) return;
    saveState({ musicUrl: url });
    loadUrl(url);
}

export function loadUrl(url) {
    cleanupCurrent();

    const yt = parseYouTube(url);
    if (yt) {
        currentSource = 'youtube';
        loadYouTube(yt);
        return;
    }

    const sc = parseSoundCloud(url);
    if (sc) {
        currentSource = 'soundcloud';
        loadSoundCloud(url);
        return;
    }

    titleEl().textContent = 'Unsupported link';
    artistEl().textContent = 'Try YouTube or SoundCloud';
}

function parseYouTube(url) {
    try {
        const u = new URL(url);
        const listId = u.searchParams.get('list');
        let videoId = null;

        if (u.hostname.includes('youtu.be')) {
            videoId = u.pathname.slice(1);
        } else if (u.hostname.includes('youtube.com')) {
            videoId = u.searchParams.get('v');
        }

        if (listId) return { type: 'playlist', listId, videoId };
        if (videoId) return { type: 'video', videoId };
        return null;
    } catch {
        return null;
    }
}

function parseSoundCloud(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes('soundcloud.com')) return { url };
        return null;
    } catch {
        return null;
    }
}

function loadYouTubeAPI() {
    if (window.YT) {
        createYTPlayer();
        return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = createYTPlayer;
}

function createYTPlayer() {
    ytPlayer = new YT.Player('yt-player', {
        height: '1',
        width: '1',
        playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin
        },
        events: {
            onReady: () => {
                ytReady = true;
                const savedVol = getState('volume') || 70;
                ytPlayer.setVolume(savedVol);

                const savedUrl = getState('musicUrl');
                if (savedUrl && parseYouTube(savedUrl)) {
                    loadUrl(savedUrl);
                }
            },
            onStateChange: (e) => {
                if (e.data === YT.PlayerState.PLAYING) {
                    isPlaying = true;
                    updatePlayIcon();
                    updateYTInfo();
                    updateQueueFromYT();
                } else if (e.data === YT.PlayerState.PAUSED) {
                    isPlaying = false;
                    updatePlayIcon();
                } else if (e.data === YT.PlayerState.ENDED) {
                    if (loopMode === 2) {
                        ytPlayer.seekTo(0);
                        ytPlayer.playVideo();
                    } else if (loopMode === 1) {
                        if (queue.length <= 1) {
                            ytPlayer.seekTo(0);
                            ytPlayer.playVideo();
                        } else {
                            next();
                        }
                    } else {
                        next();
                    }
                }
                if (onStateChange) onStateChange(isPlaying);
            }
        }
    });
}

function loadYouTube(parsed) {
    if (!ytReady) {
        setTimeout(() => loadYouTube(parsed), 500);
        return;
    }

    titleEl().textContent = 'Loading...';
    artistEl().textContent = 'YouTube';

    // Reset queue
    queue = [];
    queueIndex = -1;

    if (parsed.type === 'playlist') {
        ytPlayer.loadPlaylist({
            list: parsed.listId,
            listType: 'playlist',
            index: 0,
            startSeconds: 0
        });
        if (loopMode === 1) ytPlayer.setLoop(true);
        if (isShuffle) ytPlayer.setShuffle(true);

        // Poll until playlist data is available
        pollForPlaylist();
    } else {
        ytPlayer.loadVideoById(parsed.videoId);
        queue = [{ title: 'Loading...', artist: 'YouTube', videoId: parsed.videoId }];
        queueIndex = 0;
        renderQueue();
    }
}

let playlistPollTimer = null;

function pollForPlaylist() {
    if (playlistPollTimer) clearInterval(playlistPollTimer);
    let attempts = 0;
    playlistPollTimer = setInterval(() => {
        attempts++;
        if (attempts > 30) {
            clearInterval(playlistPollTimer);
            playlistPollTimer = null;
            return;
        }
        if (!ytPlayer || !ytReady) return;
        try {
            const playlist = ytPlayer.getPlaylist();
            if (playlist && playlist.length > 0) {
                clearInterval(playlistPollTimer);
                playlistPollTimer = null;
                // Initialize queue with placeholder titles
                queue = playlist.map((vid, i) => ({
                    title: `Track ${i + 1}`,
                    artist: 'YouTube',
                    videoId: vid
                }));
                queueIndex = ytPlayer.getPlaylistIndex();
                // Update current track with real title
                const data = ytPlayer.getVideoData();
                if (data && data.title && queueIndex >= 0) {
                    queue[queueIndex].title = data.title;
                    queue[queueIndex].artist = data.author || 'YouTube';
                }
                renderQueue();
                // Fetch real titles for ALL tracks
                fetchAllTrackTitles(playlist);
            }
        } catch { }
    }, 500);
}

async function fetchAllTrackTitles(videoIds) {
    // Fetch titles in batches of 5 to avoid hammering the API
    const batchSize = 5;
    for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        const promises = batch.map((vid, j) => {
            const idx = i + j;
            // Skip if we already have a real title (not a placeholder)
            if (queue[idx] && !queue[idx].title.startsWith('Track ')) {
                return Promise.resolve();
            }
            return fetchTrackTitle(vid, idx);
        });
        await Promise.all(promises);
        renderQueue();
    }
}

async function fetchTrackTitle(videoId, index) {
    try {
        const resp = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && data.title && queue[index]) {
            queue[index].title = data.title;
            queue[index].artist = data.author_name || 'YouTube';
        }
    } catch { }
}

function updateYTInfo() {
    if (!ytPlayer || !ytReady) return;
    try {
        const data = ytPlayer.getVideoData();
        if (data && data.title) {
            titleEl().textContent = data.title;
            artistEl().textContent = data.author || 'YouTube';

            // Set album art from YouTube thumbnail
            if (data.video_id) {
                setArtwork(`https://img.youtube.com/vi/${data.video_id}/mqdefault.jpg`);
            }

            // Sync with queue panel
            if (queueIndex >= 0 && queue[queueIndex]) {
                const isPlaceholder = queue[queueIndex].title === 'Loading...' || queue[queueIndex].title.startsWith('Track ');
                if (isPlaceholder) {
                    queue[queueIndex].title = data.title;
                    queue[queueIndex].artist = data.author || 'YouTube';
                    renderQueue();
                }
            }
        }
    } catch { }
}

function updateQueueFromYT() {
    if (!ytPlayer || !ytReady) return;
    try {
        const playlist = ytPlayer.getPlaylist();
        const idx = ytPlayer.getPlaylistIndex();
        const data = ytPlayer.getVideoData();

        if (playlist && playlist.length > 0) {
            // If queue wasn't initialized yet
            if (queue.length !== playlist.length) {
                queue = playlist.map((vid, i) => ({
                    title: `Track ${i + 1}`,
                    artist: 'YouTube',
                    videoId: vid
                }));
            }
            // Always update the currently playing track's title
            if (idx >= 0 && data?.title) {
                queue[idx] = {
                    title: data.title,
                    artist: data.author || 'YouTube',
                    videoId: playlist[idx]
                };
            }
            queueIndex = idx;
            renderQueue();
        }
    } catch { }
}

function loadSoundCloud(url) {
    titleEl().textContent = 'Loading...';
    artistEl().textContent = 'SoundCloud';

    let container = document.getElementById('sc-player-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'sc-player-container';
        container.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
        document.body.appendChild(container);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'sc-player';
    iframe.width = '100%';
    iframe.height = '166';
    iframe.allow = 'autoplay';
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&buying=false&sharing=false&download=false&show_artwork=false&show_playcount=false&show_user=false&color=%23a78bfa`;
    container.innerHTML = '';
    container.appendChild(iframe);

    loadSCAPI(() => {
        scWidget = SC.Widget(iframe);
        scWidget.bind(SC.Widget.Events.READY, () => {
            scWidget.play();
            scWidget.getCurrentSound((sound) => {
                if (sound) {
                    titleEl().textContent = sound.title || 'SoundCloud';
                    artistEl().textContent = sound.user?.username || 'SoundCloud';
                    if (sound.artwork_url) {
                        setArtwork(sound.artwork_url.replace('-large', '-t500x500'));
                    }
                }
            });
            const savedVol = getState('volume') || 70;
            scWidget.setVolume(savedVol);
        });
        scWidget.bind(SC.Widget.Events.PLAY, () => {
            isPlaying = true;
            updatePlayIcon();
            scWidget.getCurrentSound((sound) => {
                if (sound) {
                    titleEl().textContent = sound.title || 'SoundCloud';
                    artistEl().textContent = sound.user?.username || 'SoundCloud';
                    if (sound.artwork_url) {
                        setArtwork(sound.artwork_url.replace('-large', '-t500x500'));
                    }
                }
            });
            if (onStateChange) onStateChange(true);
        });
        scWidget.bind(SC.Widget.Events.PAUSE, () => {
            isPlaying = false;
            updatePlayIcon();
            if (onStateChange) onStateChange(false);
        });
        scWidget.bind(SC.Widget.Events.FINISH, () => {
            if (loopMode === 2) {
                scWidget.seekTo(0);
                scWidget.play();
            } else {
                next();
            }
        });
    });
}

function loadSCAPI(cb) {
    if (window.SC && SC.Widget) {
        cb();
        return;
    }
    const s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    s.onload = cb;
    document.head.appendChild(s);
}

function cleanupCurrent() {
    if (currentSource === 'youtube' && ytPlayer && ytReady) {
        try { ytPlayer.stopVideo(); } catch { }
    }
    if (currentSource === 'soundcloud' && scWidget) {
        try { scWidget.pause(); } catch { }
    }
    isPlaying = false;
    updatePlayIcon();
}

export function togglePlay() {
    if (!currentSource) {
        submitUrl();
        return;
    }

    if (currentSource === 'youtube' && ytPlayer && ytReady) {
        if (isPlaying) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.playVideo();
        }
    } else if (currentSource === 'soundcloud' && scWidget) {
        scWidget.toggle();
    }
}

export function next() {
    if (currentSource === 'youtube' && ytPlayer && ytReady) {
        ytPlayer.nextVideo();
    } else if (currentSource === 'soundcloud' && scWidget) {
        scWidget.next();
    }
}

export function prev() {
    if (currentSource === 'youtube' && ytPlayer && ytReady) {
        ytPlayer.previousVideo();
    } else if (currentSource === 'soundcloud' && scWidget) {
        scWidget.prev();
    }
}

export function toggleLoop() {
    loopMode = (loopMode + 1) % 3;
    const btn = document.getElementById('btn-loop');
    const iconLoop = document.getElementById('icon-loop');
    const iconLoopOne = document.getElementById('icon-loop-one');
    
    if (loopMode === 0) {
        btn.classList.remove('active');
        iconLoop.style.display = 'block';
        iconLoopOne.style.display = 'none';
        btn.title = 'Loop: Off';
    } else if (loopMode === 1) {
        btn.classList.add('active');
        iconLoop.style.display = 'block';
        iconLoopOne.style.display = 'none';
        btn.title = 'Loop: All';
    } else if (loopMode === 2) {
        btn.classList.add('active');
        iconLoop.style.display = 'none';
        iconLoopOne.style.display = 'block';
        btn.title = 'Loop: One';
    }

    if (currentSource === 'youtube' && ytPlayer && ytReady) {
        if (loopMode === 1) {
            ytPlayer.setLoop(true);
        } else {
            ytPlayer.setLoop(false);
        }
    }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    document.getElementById('btn-shuffle').classList.toggle('active', isShuffle);
    if (currentSource === 'youtube' && ytPlayer && ytReady) {
        ytPlayer.setShuffle(isShuffle);
    }
}

function setVolume(v) {
    if (currentSource === 'youtube' && ytPlayer && ytReady) {
        ytPlayer.setVolume(v * 100);
    } else if (currentSource === 'soundcloud' && scWidget) {
        scWidget.setVolume(v * 100);
    }
}

function updatePlayIcon() {
    document.getElementById('icon-play').style.display = isPlaying ? 'none' : 'block';
    document.getElementById('icon-pause').style.display = isPlaying ? 'block' : 'none';
}

function renderQueue() {
    const list = document.getElementById('queue-list');
    if (!list) return;
    list.innerHTML = '';

    if (queue.length === 0) {
        list.innerHTML = '<div class="queue-empty">No tracks in queue</div>';
        return;
    }

    queue.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'queue-item' + (i === queueIndex ? ' active' : '');
        el.innerHTML = `
            <span class="queue-index">${i === queueIndex ? '▶' : i + 1}</span>
            <div class="queue-item-info">
                <div class="queue-item-title">${item.title}</div>
                <div class="queue-item-artist">${item.artist}</div>
            </div>
        `;
        if (i !== queueIndex) {
            el.addEventListener('click', () => {
                if (currentSource === 'youtube' && ytPlayer && ytReady) {
                    ytPlayer.playVideoAt(i);
                }
            });
        }
        list.appendChild(el);
    });

    const activeItem = list.querySelector('.queue-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

export function getIsPlaying() {
    return isPlaying;
}

export function getCurrentTrackInfo() {
    const title = titleEl()?.textContent || 'Unknown Track';
    const artist = artistEl()?.textContent || 'Unknown Artist';
    return { title, artist, isPlaying, artwork: currentArtwork };
}

function setArtwork(url) {
    currentArtwork = url;
    const el = document.getElementById('player-artwork');
    if (!el) return;
    if (url) {
        el.innerHTML = `<img src="${url}" alt="Album Art" onerror="this.parentElement.innerHTML='<svg width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'currentColor\\' opacity=\\'0.5\\'><path d=\\'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\\'/></svg>'">`;
    }
}

export function getArtwork() {
    return currentArtwork;
}
