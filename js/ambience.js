import { saveState, getState } from './storage.js';

let sounds = {};

const AMBIENCE_DEFS = [
    { id: 'rain', name: 'Soft Rain', icon: '🌧️', src: '/assets/audio/rain.wav' },
    { id: 'fireplace', name: 'Fireplace', icon: '🔥', src: '/assets/audio/fireplace.wav' },
    { id: 'thunder', name: 'Thunder', icon: '⛈️', src: '/assets/audio/thunder.wav' },
    { id: 'wind', name: 'Wind', icon: '💨', src: '/assets/audio/wind.wav' }
];

export function getAmbienceDefs() {
    return AMBIENCE_DEFS;
}

export function initAmbience() {
    const list = document.getElementById('ambience-list');
    const savedVolumes = getState('ambience') || {};

    AMBIENCE_DEFS.forEach(def => {
        const item = document.createElement('div');
        item.className = 'ambience-item';
        item.dataset.id = def.id;

        const savedVol = savedVolumes[def.id] || 0;
        if (savedVol > 0) item.classList.add('active');

        item.innerHTML = `
            <div class="ambience-icon">${def.icon}</div>
            <div class="ambience-info">
                <div class="ambience-name">${def.name}</div>
                <div class="ambience-slider-wrap">
                    <input type="range" class="ambience-slider" data-id="${def.id}" min="0" max="100" value="${savedVol}">
                </div>
            </div>
        `;

        const slider = item.querySelector('.ambience-slider');
        slider.addEventListener('input', (e) => {
            const vol = parseInt(e.target.value);
            setAmbienceVolume(def.id, vol);
            item.classList.toggle('active', vol > 0);
        });

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('ambience-slider')) return;
            const currentVol = parseInt(slider.value);
            if (currentVol > 0) {
                slider.value = 0;
                setAmbienceVolume(def.id, 0);
                item.classList.remove('active');
            } else {
                slider.value = 50;
                setAmbienceVolume(def.id, 50);
                item.classList.add('active');
            }
        });

        list.appendChild(item);
    });
}

function setAmbienceVolume(id, vol) {
    const def = AMBIENCE_DEFS.find(d => d.id === id);
    if (!def) return;

    if (vol > 0 && !sounds[id]) {
        const audio = new Audio(def.src);
        audio.loop = true;
        audio.volume = vol / 100;
        audio.play().catch(() => {});
        sounds[id] = audio;
    } else if (sounds[id]) {
        sounds[id].volume = vol / 100;
        if (vol === 0) {
            sounds[id].pause();
            sounds[id].currentTime = 0;
            delete sounds[id];
        }
    }

    const savedVolumes = getState('ambience') || {};
    savedVolumes[id] = vol;
    saveState({ ambience: savedVolumes });
}

export function restoreSavedAmbience() {
    const savedVolumes = getState('ambience') || {};
    Object.entries(savedVolumes).forEach(([id, vol]) => {
        if (vol > 0) {
            setAmbienceVolume(id, vol);
        }
    });
}
