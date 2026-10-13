const bg = document.getElementById("bg");
const ctx = bg.getContext("2d");
const circles = [];
const stageHeight = 360;
var stageWidth = 480;
const frameDuration = 1 / 30;
let width = 0;
let height = 0;
let simulationTime = 0;
let accumulator = 0;
let lastTimestamp = performance.now();

for (let index = 0; index < 60; index++) {
    circles.push({
        x: Math.random() * stageWidth - stageWidth / 2,
        y: Math.random() * stageHeight - stageHeight / 2,
        sizePercent: 50 + Math.random() * 20,
        active: true,
    });
}

function resizeCanvas() {
    const bounds = bg.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    width = bounds.width;
    height = bounds.height;
    bg.width = Math.round(width * pixelRatio);
    bg.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    stageWidth = stageHeight * (width / height);
    const scale = height / stageHeight;
    for (const circle of circles) {
        circle.radius = (17 * circle.sizePercent / 100 * scale) / 2;
        circle.x = width / 2 + circle.stageX * scale;
        circle.y = height / 2 - circle.stageY * scale;
    }
}

for (const circle of circles) {
    circle.stageX = circle.x;
    circle.stageY = circle.y;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function render(timestamp) {
    accumulator += Math.min((timestamp - lastTimestamp) / 1000, frameDuration * 3);
    lastTimestamp = timestamp;

    while (accumulator >= frameDuration) {
        simulationTime += frameDuration;
        for (const circle of circles) {
            if (!circle.active) continue;

            const angle = (simulationTime * 100 + circle.sizePercent * 213.4) * Math.PI / 180;
            circle.stageX += Math.sin(angle) * 2;
            circle.stageY += 1 + circle.sizePercent / 10;
            if (circle.stageY > 200) {
                circle.stageY = -200
                circle.stageX = Math.random() * stageWidth - stageWidth / 2;
            };
        }
        accumulator -= frameDuration;
    }

    const scale = height / stageHeight;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#00271d");
    gradient.addColorStop(1, "#009975");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (const circle of circles) {
        if (!circle.active) continue;

        circle.x = width / 2 + circle.stageX * scale;
        circle.y = height / 2 - circle.stageY * scale;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        const opacity = Math.max(0, Math.min(100, circle.sizePercent * 2 - 100));
        ctx.fillStyle = `rgba(111, 255, 219, ${opacity / 100})`;
        ctx.fill();
    }

    requestAnimationFrame(render);
}
requestAnimationFrame((timestamp) => {
    lastTimestamp = timestamp;
    render(timestamp);
});