let canvas, ctx;
let animationId = null;
let particles = [];
let currentAnim = null;
let isNight = false;

export function initAnimations() {
    canvas = document.getElementById('animation-canvas');
    ctx = canvas.getContext('2d');
    handleResize();
    window.addEventListener('resize', handleResize);
}

function handleResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

export function setAnimation(type) {
    if (animationId) cancelAnimationFrame(animationId);
    particles = [];
    currentAnim = type;
    if (type) startAnimation(type);
}

export function setNight(night) {
    isNight = night;
}

function startAnimation(type) {
    switch (type) {
        case 'rain': initRain(false); break;
        case 'rain-neon': initRain(true); break;
        case 'dust': initDust(); break;
        case 'fireflies': initFireflies(); break;
        case 'leaves': initLeaves(); break;
        case 'particles': initFloatingParticles(false); break;
        case 'particles-light': initFloatingParticles(true); break;
        default: initFloatingParticles(false);
    }
    loop();
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    switch (currentAnim) {
        case 'rain':
        case 'rain-neon': drawRain(); break;
        case 'dust': drawDust(); break;
        case 'fireflies': drawFireflies(); break;
        case 'leaves': drawLeaves(); break;
        case 'particles':
        case 'particles-light': drawFloatingParticles(); break;
    }
    animationId = requestAnimationFrame(loop);
}

function initRain(neon) {
    const count = neon ? 200 : 150;
    particles = [];
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            length: Math.random() * 20 + 10,
            speed: Math.random() * 6 + 4,
            opacity: Math.random() * 0.3 + 0.1,
            width: Math.random() * 1.5 + 0.5,
            drift: Math.random() * 0.5 - 0.25
        });
    }
}

function drawRain() {
    const neon = currentAnim === 'rain-neon';
    particles.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.drift * 3, p.y + p.length);
        if (neon) {
            ctx.strokeStyle = `rgba(150, 200, 255, ${p.opacity * (isNight ? 1.2 : 0.8)})`;
        } else {
            ctx.strokeStyle = `rgba(180, 210, 240, ${p.opacity * (isNight ? 1 : 0.7)})`;
        }
        ctx.lineWidth = p.width;
        ctx.stroke();

        p.y += p.speed;
        p.x += p.drift;

        if (p.y > canvas.height) {
            p.y = -p.length;
            p.x = Math.random() * canvas.width;
        }
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
    });

    if (neon) {
        for (let i = 0; i < 2; i++) {
            const splash = particles[Math.floor(Math.random() * particles.length)];
            if (splash.y + splash.length >= canvas.height - 5) {
                ctx.beginPath();
                ctx.arc(splash.x, canvas.height - 2, Math.random() * 3 + 1, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(150, 200, 255, ${Math.random() * 0.3})`;
                ctx.fill();
            }
        }
    }
}

function initDust() {
    particles = [];
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: (Math.random() - 0.5) * 0.2 - 0.1,
            opacity: Math.random() * 0.4 + 0.1,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: Math.random() * 0.02 + 0.005
        });
    }
}

function drawDust() {
    particles.forEach(p => {
        p.phase += p.phaseSpeed;
        const wobbleX = Math.sin(p.phase) * 0.5;
        const wobbleY = Math.cos(p.phase * 0.7) * 0.3;
        const glow = (Math.sin(p.phase * 0.5) + 1) * 0.5;
        const alpha = p.opacity * (0.5 + glow * 0.5) * (isNight ? 0.6 : 1);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
        ctx.fill();

        if (p.size > 2) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 230, 180, ${alpha * 0.2})`;
            ctx.fill();
        }

        p.x += p.speedX + wobbleX;
        p.y += p.speedY + wobbleY;

        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
    });
}

function initFireflies() {
    particles = [];
    for (let i = 0; i < 25; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.8,
            size: Math.random() * 3 + 2,
            speedX: (Math.random() - 0.5) * 0.4,
            speedY: (Math.random() - 0.5) * 0.3,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: Math.random() * 0.03 + 0.01,
            hue: Math.random() > 0.5 ? 60 : 120
        });
    }
}

function drawFireflies() {
    particles.forEach(p => {
        p.phase += p.phaseSpeed;
        const glow = (Math.sin(p.phase) + 1) * 0.5;
        const nightBoost = isNight ? 1.5 : 0.7;
        const alpha = glow * 0.8 * nightBoost;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha * 0.15})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${alpha * 0.3})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 95%, ${alpha})`;
        ctx.fill();
        ctx.restore();

        p.x += p.speedX + Math.sin(p.phase * 0.5) * 0.3;
        p.y += p.speedY + Math.cos(p.phase * 0.7) * 0.2;

        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height;
        if (p.y > canvas.height + 20) p.y = -20;
    });
}

function initLeaves() {
    particles = [];
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 6 + 4,
            speedX: Math.random() * 0.5 + 0.1,
            speedY: Math.random() * 0.3 + 0.2,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
            phase: Math.random() * Math.PI * 2,
            opacity: Math.random() * 0.4 + 0.2,
            hue: Math.random() > 0.5 ? 100 : 30
        });
    }
}

function drawLeaves() {
    particles.forEach(p => {
        p.phase += 0.01;
        p.rotation += p.rotSpeed;
        const wobble = Math.sin(p.phase) * 1.5;
        const alpha = p.opacity * (isNight ? 0.5 : 1);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 50%, ${isNight ? 30 : 45}%, ${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.strokeStyle = `hsla(${p.hue}, 40%, ${isNight ? 25 : 35}%, ${alpha * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.restore();

        p.x += p.speedX + wobble * 0.1;
        p.y += p.speedY;

        if (p.y > canvas.height + 20) {
            p.y = -20;
            p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width + 20) p.x = -20;
    });
}

function initFloatingParticles(light) {
    particles = [];
    const count = 50;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.15,
            speedY: (Math.random() - 0.5) * 0.1 - 0.05,
            opacity: Math.random() * 0.3 + 0.05,
            phase: Math.random() * Math.PI * 2,
            light: light
        });
    }
}

function drawFloatingParticles() {
    particles.forEach(p => {
        p.phase += 0.008;
        const glow = (Math.sin(p.phase) + 1) * 0.5;
        const alpha = p.opacity * (0.3 + glow * 0.7);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        if (p.light) {
            ctx.fillStyle = `rgba(100, 80, 150, ${alpha})`;
        } else {
            ctx.fillStyle = `rgba(180, 170, 220, ${alpha * (isNight ? 1 : 0.6)})`;
        }
        ctx.fill();

        p.x += p.speedX + Math.sin(p.phase) * 0.1;
        p.y += p.speedY + Math.cos(p.phase * 0.5) * 0.05;

        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
        if (p.y < -5) p.y = canvas.height + 5;
        if (p.y > canvas.height + 5) p.y = -5;
    });
}

export function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    particles = [];
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}
