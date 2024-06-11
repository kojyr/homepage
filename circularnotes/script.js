const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const speedKnob = document.getElementById('speedKnob');
const chaosKnob = document.getElementById('chaosKnob');
const volumeKnob = document.getElementById('volumeKnob');
const resetButton = document.createElement('button');

resetButton.textContent = 'Reset';
resetButton.style.position = 'absolute';
resetButton.style.bottom = '10px';
resetButton.style.left = '10px';
resetButton.style.background = '#f0ead6';
resetButton.style.border = 'none';
resetButton.style.borderRadius = '50%';
resetButton.style.padding = '10px';
document.body.appendChild(resetButton);

const shapeButtons = {
    triangle: document.getElementById('triangleButton'),
    square: document.getElementById('squareButton'),
    pentagon: document.getElementById('pentagonButton'),
    hexagon: document.getElementById('hexagonButton'),
    dodecagon: document.getElementById('dodecagonButton'),
    circle: document.getElementById('circleButton')
};

const wall = {
    x: width / 2,
    y: height / 2,
    radius: 300,
    sides: 0 // Default shape is circle
};

const ballSize = 20;
const balls = [
    {
        x: 100,
        y: 100,
        radius: ballSize * 1.4, // Blue ball 40% larger
        color: '#4d80a6', // Desaturated blue
        isDragging: false,
        type: 'main'
    },
    {
        x: 100,
        y: 100,
        radius: ballSize * 1.2, // White ball 20% larger
        color: '#f0ead6', // Eggshell white
        isDragging: false,
        type: 'main'
    },
    {
        x: 100,
        y: 100,
        radius: ballSize, // Red ball
        color: '#a64d4d', // Desaturated red
        isDragging: false,
        type: 'main'
    },
    {
        x: width - 80, // Moved closer to the wall
        y: height - 80,
        radius: 20,
        color: '#f0ead6', // Dashed circle
        isDragging: false,
        effectRadius: ballSize * 4, // 4 times the size of the first ball
        type: 'anti-gravity'
    }
];

let chaosFactor = parseFloat(chaosKnob.value); // Adjust this value to increase or decrease chaos
let path = []; // To store the ball's path
let volume = parseFloat(volumeKnob.value); // Volume control

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let gainNode = audioContext.createGain();
gainNode.gain.value = volume;
gainNode.connect(audioContext.destination);

const equalTemperamentFrequencies = [
    261.63, // C
    277.18, // C#
    293.66, // D
    311.13, // D#
    329.63, // E
    349.23, // F
    369.99, // F#
    392.00, // G
    415.30, // G#
    440.00, // A
    466.16, // A#
    493.88  // B
];

function drawShapeButton(button, sides) {
    const size = button.offsetWidth / 2;
    const angle = (2 * Math.PI) / sides;
    const btnCtx = button.getContext('2d');
    btnCtx.clearRect(0, 0, button.offsetWidth, button.offsetHeight);
    btnCtx.beginPath();
    for (let i = 0; i < sides; i++) {
        const x = size + size * Math.cos(i * angle);
        const y = size + size * Math.sin(i * angle);
        if (i === 0) {
            btnCtx.moveTo(x, y);
        } else {
            btnCtx.lineTo(x, y);
        }
    }
    btnCtx.closePath();
    btnCtx.strokeStyle = '#f0ead6';
    btnCtx.lineWidth = 2;
    btnCtx.stroke();
}

function drawCircleButton(button) {
    const size = button.offsetWidth / 2;
    const btnCtx = button.getContext('2d');
    btnCtx.clearRect(0, 0, button.offsetWidth, button.offsetHeight);
    btnCtx.beginPath();
    btnCtx.arc(size, size, size, 0, Math.PI * 2);
    btnCtx.closePath();
    btnCtx.strokeStyle = '#f0ead6';
    btnCtx.lineWidth = 2;
    btnCtx.stroke();
}

function drawCircle(x, y, radius, color, isStroke = false, strokeColor = 'black', strokeWidth = 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (isStroke) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    } else {
        ctx.fillStyle = color;
        ctx.fill();
    }
    ctx.closePath();
}

function drawPolygon(x, y, radius, sides, color, isStroke = false, strokeColor = 'black', strokeWidth = 1) {
    const angle = (2 * Math.PI) / sides;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const px = x + radius * Math.cos(i * angle);
        const py = y + radius * Math.sin(i * angle);
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    if (isStroke) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    } else {
        ctx.fillStyle = color;
        ctx.fill();
    }
}

function playNote(freq) {
    if (!isFinite(freq)) {
        console.warn('Non-finite frequency value:', freq);
        return;
    }
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    oscillator.connect(gainNode);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

function getEqualTemperamentFrequency(index) {
    return equalTemperamentFrequencies[index % 12];
}

function update() {
    ctx.clearRect(0, 0, width, height);

    const shapeSides = wall.sides;
    const wallRadius = wall.radius;

    if (shapeSides === 0) {
        drawCircle(wall.x, wall.y, wallRadius, null, true, '#f0ead6', 10); // Wall with eggshell white stroke
    } else {
        drawPolygon(wall.x, wall.y, wallRadius, shapeSides, null, true, '#f0ead6', 10); // Wall with eggshell white stroke
    }

    // Draw the path
    ctx.lineWidth = 1;
    ctx.globalCompositeOperation = 'lighter'; // Blend mode to make crossings lighter
    ctx.beginPath();
    for (let i = 0; i < path.length - 1; i++) {
        const alpha = 0.3 - (Date.now() - path[i].time) / 60000; // Adjust alpha for 30% transparency
        ctx.strokeStyle = `rgba(240, 234, 214, ${alpha})`; // Eggshell white color with varying alpha
        ctx.moveTo(path[i].x, path[i].y);
        ctx.lineTo(path[i + 1].x, path[i + 1].y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; // Reset blend mode

    for (const ball of balls) {
        if (ball.type === 'main') {
            if (!ball.isDragging && ball.vx !== 0 && ball.vy !== 0) {
                ball.x += ball.vx;
                ball.y += ball.vy;

                // Store ball's position in the path
                path.push({ x: ball.x, y: ball.y, color: ball.color, time: Date.now() });

                // Remove old path points
                path = path.filter(p => Date.now() - p.time < 60000); // 60 seconds fade-out time

                const dx = ball.x - wall.x;
                const dy = ball.y - wall.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (shapeSides === 0) { // True circle collision detection
                    if (distance + ball.radius > wallRadius) {
                        const angle = Math.atan2(dy, dx);
                        const overlap = distance + ball.radius - wallRadius;

                        ball.x -= Math.cos(angle) * overlap;
                        ball.y -= Math.sin(angle) * overlap;

                        const normalVector = {
                            x: ball.x - wall.x,
                            y: ball.y - wall.y
                        };
                        const normalMagnitude = Math.sqrt(normalVector.x ** 2 + normalVector.y ** 2);
                        normalVector.x /= normalMagnitude;
                        normalVector.y /= normalMagnitude;
                        const dotProduct = ball.vx * normalVector.x + ball.vy * normalVector.y;

                        ball.vx -= 2 * dotProduct * normalVector.x;
                        ball.vy -= 2 * dotProduct * normalVector.y;

                        // Maintain the same speed
                        const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                        ball.vx = (ball.vx / currentSpeed) * ball.speed;
                        ball.vy = (ball.vy / currentSpeed) * ball.speed;

                        // Apply chaos to angle
                        const chaosAngle = (Math.random() - 0.5) * chaosFactor;
                        const angleWithChaos = Math.atan2(ball.vy, ball.vx) + chaosAngle;
                        ball.vx = Math.cos(angleWithChaos) * currentSpeed;
                        ball.vy = Math.sin(angleWithChaos) * currentSpeed;

                        // Inverted harmonic frequency based on vertical position
                        const baseFreq = 100 + ((height - ball.y) / height) * 800; // Inverted base frequency
                        playNote(baseFreq);
                    }
                } else { // Polygon collision detection
                    for (let i = 0; i < shapeSides; i++) {
                        const angle1 = (2 * Math.PI * i) / shapeSides;
                        const angle2 = (2 * Math.PI * (i + 1)) / shapeSides;
                        const x1 = wall.x + wallRadius * Math.cos(angle1);
                        const y1 = wall.y + wallRadius * Math.sin(angle1);
                        const x2 = wall.x + wallRadius * Math.cos(angle2);
                        const y2 = wall.y + wallRadius * Math.sin(angle2);
                        const distanceToLine = Math.abs((x2 - x1) * (y1 - ball.y) - (x1 - ball.x) * (y2 - y1)) / Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                        if (distanceToLine < ball.radius) {
                            const normalVector = {
                                x: y2 - y1,
                                y: x1 - x2
                            };
                            const normalMagnitude = Math.sqrt(normalVector.x ** 2 + normalVector.y ** 2);
                            normalVector.x /= normalMagnitude;
                            normalVector.y /= normalMagnitude;
                            const dotProduct = ball.vx * normalVector.x + ball.vy * normalVector.y;

                            ball.vx -= 2 * dotProduct * normalVector.x;
                            ball.vy -= 2 * dotProduct * normalVector.y;

                            // Maintain the same speed
                            const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                            ball.vx = (ball.vx / currentSpeed) * ball.speed;
                            ball.vy = (ball.vy / currentSpeed) * ball.speed;

                            // Apply chaos to angle
                            const chaosAngle = (Math.random() - 0.5) * chaosFactor;
                            const angleWithChaos = Math.atan2(ball.vy, ball.vx) + chaosAngle;
                            ball.vx = Math.cos(angleWithChaos) * currentSpeed;
                            ball.vy = Math.sin(angleWithChaos) * currentSpeed;

                            // Equal temperament frequency based on side index
                            const freq = getEqualTemperamentFrequency(i);
                            playNote(freq);
                            break;
                        }
                    }
                }
            }
        }
    }

    for (const ball of balls) {
        if (ball.type === 'main') {
            drawCircle(ball.x, ball.y, ball.radius, ball.color); // Draw the main balls
        } else if (ball.type === 'anti-gravity') {
            // Draw the anti-gravity ball as a dashed ring
            ctx.setLineDash([5, 5]);
            drawCircle(ball.x, ball.y, ball.effectRadius, null, true, `rgba(240, 234, 214, 0.2)`, 2);
            ctx.setLineDash([]);
        }
    }

    requestAnimationFrame(update);
}

function distance(ball1, ball2) {
    return Math.sqrt((ball1.x - ball2.x) ** 2 + (ball1.y - ball2.y) ** 2);
}

function applyAntiGravity(ball1, ball2) {    
    const dx = ball1.x - ball2.x;
    const dy = ball1.y - ball2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ball2.effectRadius) {
        const effect = 0.4 * (1 - dist / ball2.effectRadius); // 40% effect in the middle, fades out
        const angle = Math.atan2(dy, dx);
        ball1.vx += effect * Math.cos(angle);
        ball1.vy += effect * Math.sin(angle);
    }
}

canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    for (const ball of balls) {
        const isAntiGravity = ball.type === 'anti-gravity';
        const effectiveRadius = isAntiGravity ? ball.effectRadius : ball.radius;
        if (distance({ x: mouseX, y: mouseY }, ball) < effectiveRadius) {
            ball.isDragging = true;
            break;
        }
    }
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    for (const ball of balls) {
        if (ball.isDragging) {
            ball.x = mouseX;
            ball.y = mouseY;
        }
    }
});

canvas.addEventListener('mouseup', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    for (const ball of balls) {
        if (ball.isDragging) {
            ball.isDragging = false;
            if (distance({ x: mouseX, y: mouseY }, wall) <= wall.radius) {
                ball.vy = ball.speed; // Start the ball's animation if inside the wall
                hasStarted = true;
            }
        }
    }
});

resetButton.addEventListener('click', () => {
    balls[0].x = balls[1].x = balls[2].x = 100;
    balls[0].y = balls[1].y = balls[2].y = 100;
    balls[3].x = width - 80; // Adjusted for new position
    balls[3].y = height - 80; // Adjusted for new position

    for (const ball of balls) {
        ball.vx = 0;
        ball.vy = 0;
    }
    hasStarted = false;
    path = []; // Clear the path
});

// Update ball speed, chaos factor, and volume on knob changes
speedKnob.addEventListener('input', () => {
    for (const ball of balls) {
        if (ball.type === 'main') {
            ball.speed = parseInt(speedKnob.value);
            if (hasStarted) {
                ball.vx = (ball.vx / Math.abs(ball.vx)) * ball.speed;
                ball.vy = (ball.vy / Math.abs(ball.vy)) * ball.speed;
            }
        }
    }
});

chaosKnob.addEventListener('input', () => {
    chaosFactor = parseFloat(chaosKnob.value);
});

volumeKnob.addEventListener('input', () => {
    volume = parseFloat(volumeKnob.value);
    gainNode.gain.value = volume;
});

// Shape button event listeners
shapeButtons.triangle.addEventListener('click', () => wall.sides = 3);
shapeButtons.square.addEventListener('click', () => wall.sides = 4);
shapeButtons.pentagon.addEventListener('click', () => wall.sides = 5);
shapeButtons.hexagon.addEventListener('click', () => wall.sides = 6);
shapeButtons.dodecagon.addEventListener('click', () => wall.sides = 12);
shapeButtons.circle.addEventListener('click', () => wall.sides = 0);

// Draw shape buttons
for (const shape in shapeButtons) {
    const button = shapeButtons[shape];
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    button.appendChild(canvas);

    if (shape === 'circle') {
        drawCircleButton(canvas);
    } else {
        const sides = {
            triangle: 3,
            square: 4,
            pentagon: 5,
            hexagon: 6,
            dodecagon: 12
        }[shape];
        drawShapeButton(canvas, sides);
    }
}

update();