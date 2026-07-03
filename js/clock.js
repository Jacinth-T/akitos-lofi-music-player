let clockEl, periodEl;

export function initClock() {
    clockEl = document.getElementById('clock-time');
    periodEl = document.getElementById('clock-period');
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    clockEl.textContent = `${hours}:${minutes}`;
    periodEl.textContent = period;
}
