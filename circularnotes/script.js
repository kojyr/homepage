const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const speedKnob = document.getElementById('speedKnob');
const chaosKnob = document.getElementById('chaosKnob');
const volumeKnob = document.getElementById('volumeKnob');
const resetButton = document.getElementById('resetButton');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');

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
        x: 150,
        y: 150,
        radius: ballSize * 1.4, // Blue ball 40% larger
        color: '#4d80a6', // Desaturated blue
        isDragging: false,
        type: 'main',
        path: [],
        speed: parseInt(speedKnob.value),
        vx: 0,
        vy: 0,
        strokeColor: '#597FA2',
        frequencyRange: [65.41, 130.81] // C2 to C3
    },
    {
        x: 150,
        y: 150,
        radius: ballSize * 1.2, // White ball 20% larger
        color: '#f0ead6', // Eggshell white
        isDragging: false,
        type: 'main',
        path: [],
        speed: parseInt(speedKnob.value),
        vx: 0,
        vy: 0,
        strokeColor: '#EFEAD8',
        frequencyRange: [130.81, 261.63] // C3 to C4
    },
    {
        x: 150,
        y: 150,
        radius: ballSize, // Red ball
        color: '#a64d4d', // Desaturated red
        isDragging: false,
        type: 'main',
        path: [],
        speed: parseInt(speedKnob.value),
        vx: 0,
        vy: 0,
        strokeColor: '#9B5250',
        frequencyRange: [261.63, 523.25] // C4 to C5
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

console.log("Balls initialized: ", balls);

let chaosFactor = parseFloat(chaosKnob.value); // Adjust this value to increase or decrease chaos
let volume = parseFloat(volumeKnob.value); // Volume control
let isRunning = false; // Animation state

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Function to resume AudioContext on user interaction
function resumeAudioContext() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

document.body.addEventListener('click', resumeAudioContext);

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

function playNoteWithFadeOut(freq) {
    if (!isFinite(freq)) {
        console.warn('Non-finite frequency value:', freq);
        return;
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain(); // Create a new gain node for each note
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const currentTime = audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume, currentTime); // Set the gain to the current volume
    gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.3); // Fade out over 0.3 seconds

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.3); // Stop the oscillator after 0.3 seconds
}

function playNoteForCircle(yPosition, frequencyRange) {
    const [minFreq, maxFreq] = frequencyRange;
    const noteIndex = Math.floor((1 - yPosition / height) * equalTemperamentFrequencies.length);
    const baseFreq = equalTemperamentFrequencies[noteIndex % equalTemperamentFrequencies.length];
    const freq = minFreq + ((baseFreq - 261.63) * (maxFreq - minFreq) / (523.25 - 261.63));
    playNoteWithFadeOut(freq);
}

function getEqualTemperamentFrequency(index) {
    return equalTemperamentFrequencies[index % equalTemperamentFrequencies.length];
}

function update() {
    if (!isRunning) return; // Exit update if paused

    ctx.clearRect(0, 0, width, height);

    const shapeSides = wall.sides;
    const wallRadius = wall.radius;

    if (shapeSides === 0) {
        drawCircle(wall.x, wall.y, wallRadius, null, true, '#151616', 10); // Wall with eggshell white stroke
    } else {
        drawPolygon(wall.x, wall.y, wallRadius, shapeSides, null, true, '#f0ead6', 10); // Wall with eggshell white stroke
    }

    balls.forEach(ball => {
        // Draw the path for each ball
        if (ball.type === 'main') {
            ctx.lineWidth = 1;
            ctx.globalCompositeOperation = 'screen'; // Use screen blend mode
            ctx.beginPath();
            for (let i = 0; i < ball.path.length - 1; i++) {
                const alpha = 0.7 - (Date.now() - ball.path[i].time) / 120; // Adjust alpha for 70% transparency
                ctx.strokeStyle = `rgba(${parseInt(ball.strokeColor.slice(1, 3), 16)}, ${parseInt(ball.strokeColor.slice(3, 5), 16)}, ${parseInt(ball.strokeColor.slice(5, 7), 16)}, ${alpha})`; // Color with varying alpha
                ctx.moveTo(ball.path[i].x, ball.path[i].y);
                ctx.lineTo(ball.path[i + 1].x, ball.path[i + 1].y);
            }
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over'; // Reset blend mode

            if (!ball.isDragging && (ball.vx !== 0 || ball.vy !== 0)) {
                ball.x += ball.vx;
                ball.y += ball.vy;

                // Store ball's position in the path
                ball.path.push({ x: ball.x, y: ball.y, time: Date.now() });

                // Remove old path points
                ball.path = ball.path.filter(p => Date.now() - p.time < 60000); // 60 seconds fade-out time

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

                        // Play note based on vertical position and ball type
                        playNoteForCircle(ball.y, ball.frequencyRange);
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
                            playNoteWithFadeOut(freq);
                            break;
                        }
                    }
                }
            }
        } else if (ball.type === 'anti-gravity') {
            // Draw the anti-gravity ball as a dashed ring
            ctx.setLineDash([5, 5]);
            drawCircle(ball.x, ball.y, ball.effectRadius, null, true, `rgba(240, 234, 214, 0.2)`, 2);
            ctx.setLineDash([]);
        }

        // Draw the ball itself
        drawCircle(ball.x, ball.y, ball.radius, ball.color, true, ball.strokeColor);
    });

    // Apply anti-gravity effect
    balls.forEach(ball1 => {
        if (ball1.type === 'main') {
            balls.forEach(ball2 => {
                if (ball2.type === 'anti-gravity') {
                    applyAntiGravity(ball1, ball2);
                }
            });
        }
    });

    requestAnimationFrame(update);
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

function resetBalls() {
    balls[0].x = balls[1].x = balls[2].x = 150;
    balls[0].y = balls[1].y = balls[2].y = 150;
    balls[3].x = width - 80; // Adjusted for new position
    balls[3].y = height - 80; // Adjusted for new position

    balls.forEach(ball => {
        ball.vx = 0;
        ball.vy = 0;
        ball.path = [];
    });

    isRunning = false; // Pause on reset
}

canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    for (let i = balls.length - 1; i >= 0; i--) { // Iterate in reverse to prioritize the top ball
        const ball = balls[i];
        const isAntiGravity = ball.type === 'anti-gravity';
        const effectiveRadius = isAntiGravity ? ball.effectRadius : ball.radius;
        if (Math.sqrt((mouseX - ball.x) ** 2 + (mouseY - ball.y) ** 2) < effectiveRadius) {
            ball.isDragging = true;
            break;
        }
    }
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    balls.forEach(ball => {
        if (ball.isDragging) {
            ball.x = mouseX;
            ball.y = mouseY;
        }
    });
});

canvas.addEventListener('mouseup', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    balls.forEach(ball => {
        if (ball.isDragging) {
            ball.isDragging = false;
            if (Math.sqrt((mouseX - wall.x) ** 2 + (mouseY - wall.y) ** 2) <= wall.radius && ball.type === 'main') {
                ball.vy = ball.speed; // Start the ball's animation if inside the wall
                ball.vx = 0;
                ball.path.push({ x: ball.x, y: ball.y, time: Date.now() });
            }
        }
    });
});

resetButton.addEventListener('click', resetBalls);

startButton.addEventListener('click', () => {
    isRunning = true;
    update();
});

pauseButton.addEventListener('click', () => {
    isRunning = false;
});

// Shape button event listeners
shapeButtons.triangle.addEventListener('click', () => wall.sides = 3);
shapeButtons.square.addEventListener('click', () => wall.sides = 4);
shapeButtons.pentagon.addEventListener('click', () => wall.sides = 5);
shapeButtons.hexagon.addEventListener('click', () => wall.sides = 6);
shapeButtons.dodecagon.addEventListener('click', () => wall.sides = 12);
shapeButtons.circle.addEventListener('click', () => wall.sides = 0);

// Initialize and start the update loop
resetBalls();
update();
