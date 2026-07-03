const OLD_STORAGE_KEY = 'lofi-vibes-state';
const STORAGE_KEY = 'akitos-music-state';

const defaults = {
    theme: 'cyberpunk-city',
    musicUrl: '',
    volume: 70,
    ambience: {},
    visualizer: true,
    accent: '#ff79c6'
};

export function loadState() {
    try {
        let raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            raw = localStorage.getItem(OLD_STORAGE_KEY);
            if (raw) {
                localStorage.setItem(STORAGE_KEY, raw);
            }
        }
        if (!raw) return { ...defaults };
        return { ...defaults, ...JSON.parse(raw) };
    } catch {
        return { ...defaults };
    }
}

export function saveState(partial) {
    try {
        const current = loadState();
        const merged = { ...current, ...partial };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch { }
}

export function getState(key) {
    return loadState()[key];
}
