import { saveState, getState } from './storage.js';

let isNight = false;
let onChangeCallback = null;

export function initDayNight(onChange) {
    onChangeCallback = onChange;
    const saved = getState('daynight');
    isNight = saved === 'night';
    applyMode(false);

    document.getElementById('daynight-toggle').addEventListener('click', toggle);
    document.getElementById('daynight-quick').addEventListener('click', toggle);
}

export function toggle() {
    isNight = !isNight;
    applyMode(true);
}

export function getMode() {
    return isNight ? 'night' : 'day';
}

function applyMode(animate) {
    const mode = isNight ? 'night' : 'day';
    document.documentElement.setAttribute('data-daynight', mode);

    if (animate) {
        document.body.style.transition = 'filter 1.2s ease';
        document.body.style.filter = 'brightness(0.8)';
        requestAnimationFrame(() => {
            setTimeout(() => {
                document.body.style.filter = '';
            }, 100);
        });
    }

    saveState({ daynight: mode });
    if (onChangeCallback) onChangeCallback(mode);
}
