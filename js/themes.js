import { saveState, getState } from './storage.js';

const THEMES = [
    {
        id: 'cozy-bedroom',
        name: 'Cozy Bedroom',
        image: '/assets/themes/cozy-bedroom.jpg',
        animation: 'dust',
        gradient: 'linear-gradient(135deg, #2d1b0e 0%, #4a2c17 50%, #1a0f05 100%)'
    },
    {
        id: 'rainy-window',
        name: 'Rainy Window',
        image: '/assets/themes/rainy-window.png',
        animation: 'rain',
        gradient: 'linear-gradient(135deg, #1a2a4a 0%, #2a3a5a 50%, #0d1520 100%)'
    },
    {
        id: 'cyberpunk-city',
        name: 'Cyberpunk City',
        image: '/assets/themes/cyberpunk-city.jpg',
        animation: 'rain-neon',
        gradient: 'linear-gradient(135deg, #1a0520 0%, #0d0a1a 50%, #150818 100%)'
    },
    {
        id: 'anime-study',
        name: 'Anime Study Room',
        image: '/assets/themes/anime-study.png',
        animation: 'leaves',
        gradient: 'linear-gradient(135deg, #2a4a2e 0%, #1a3a20 50%, #0d1f12 100%)'
    },
    {
        id: 'forest-cabin',
        name: 'Forest Cabin',
        image: '/assets/themes/forest-cabin.png',
        animation: 'fireflies',
        gradient: 'linear-gradient(135deg, #1a2a1e 0%, #2a3a28 50%, #0d1510 100%)'
    },
    {
        id: 'minimal-dark',
        name: 'Minimal Dark',
        image: null,
        animation: 'particles',
        gradient: 'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 50%, #0a0a14 100%)'
    },
    {
        id: 'minimal-light',
        name: 'Minimal Light',
        image: null,
        animation: 'particles-light',
        gradient: 'linear-gradient(135deg, #f0ebff 0%, #e8e0f8 50%, #f5f0ff 100%)'
    }
];

let currentTheme = null;
let onChangeCallback = null;
let switchTimeout = null;

export function getThemes() {
    return THEMES;
}

export function getCurrentTheme() {
    return currentTheme;
}

export function initThemes(onChange) {
    onChangeCallback = onChange;
    const grid = document.getElementById('theme-grid');

    THEMES.forEach(theme => {
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.dataset.theme = theme.id;

        const bg = document.createElement('div');
        bg.className = 'theme-card-bg';
        if (theme.image) {
            bg.style.backgroundImage = `url(${theme.image})`;
        } else {
            bg.style.background = theme.gradient;
        }

        const label = document.createElement('div');
        label.className = 'theme-card-label';
        label.textContent = theme.name;

        card.appendChild(bg);
        card.appendChild(label);
        card.addEventListener('click', () => setTheme(theme.id));
        grid.appendChild(card);
    });

    const saved = getState('theme') || 'cyberpunk-city';
    setTheme(saved, false);
}

function applyBgToElement(el, theme) {
    if (theme.image) {
        el.style.cssText = '';
        el.style.backgroundImage = `url(${theme.image})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.style.backgroundRepeat = 'no-repeat';
    } else {
        el.setAttribute('style',
            `background: ${theme.gradient}; background-size:cover; background-position:center; background-repeat:no-repeat;`
        );
    }
}

export function setTheme(themeId, animate = true) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;
    if (currentTheme && currentTheme.id === themeId) return;

    // Cancel any pending transition
    if (switchTimeout) {
        clearTimeout(switchTimeout);
        switchTimeout = null;
    }

    const bgCurrent = document.getElementById('bg-image');
    const bgNext = document.getElementById('bg-image-next');

    document.documentElement.setAttribute('data-theme', themeId);

    if (animate && currentTheme) {
        // Prepare next image behind current
        bgNext.className = 'bg-image';
        bgNext.style.position = 'absolute';
        bgNext.style.inset = '0';
        bgNext.style.zIndex = '0';
        bgNext.style.opacity = '1';
        applyBgToElement(bgNext, theme);

        // Fade out current to reveal next underneath
        bgCurrent.style.transition = 'opacity 0.8s ease';
        bgCurrent.style.zIndex = '1';
        bgCurrent.style.opacity = '0';

        switchTimeout = setTimeout(() => {
            // Move next to current position
            bgCurrent.className = 'bg-image';
            bgCurrent.style.cssText = '';
            bgCurrent.style.position = 'absolute';
            bgCurrent.style.inset = '0';
            bgCurrent.style.zIndex = '0';
            applyBgToElement(bgCurrent, theme);

            // Reset next
            bgNext.className = 'bg-image bg-image-next';
            bgNext.style.cssText = '';
            bgNext.style.opacity = '0';

            switchTimeout = null;
        }, 850);
    } else {
        // No animation — instant switch
        bgCurrent.className = 'bg-image';
        bgCurrent.style.cssText = '';
        bgCurrent.style.position = 'absolute';
        bgCurrent.style.inset = '0';
        bgCurrent.style.zIndex = '0';
        applyBgToElement(bgCurrent, theme);

        bgNext.className = 'bg-image bg-image-next';
        bgNext.style.cssText = '';
        bgNext.style.opacity = '0';
    }

    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.toggle('active', card.dataset.theme === themeId);
    });

    currentTheme = theme;
    saveState({ theme: themeId });
    if (onChangeCallback) onChangeCallback(theme);
}
