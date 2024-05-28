document.addEventListener('DOMContentLoaded', () => {
    const panoramaWrapper = document.getElementById('panorama-wrapper');
    const container = document.getElementById('container');

    let mouseX = 0;
    let speed = 0;

    const updateSpeed = (e) => {
        const containerWidth = container.clientWidth;
        mouseX = e.clientX;

        const centerX = containerWidth / 2;
        const offsetX = mouseX - centerX;
        speed = -offsetX / centerX * 2; // Reversed speed direction
    };

    container.addEventListener('mousemove', updateSpeed);

    const updatePosition = () => {
        const images = document.querySelectorAll('.panorama');
        const imageWidth = images[0].clientWidth;
        let currentX = parseFloat(panoramaWrapper.style.transform.replace('translateX(', '').replace('px)', '')) || 0;

        currentX += speed;

        if (currentX <= -imageWidth) {
            currentX += imageWidth;
        } else if (currentX >= 0) {
            currentX -= imageWidth;
        }

        panoramaWrapper.style.transform = `translateX(${currentX}px)`;

        requestAnimationFrame(updatePosition);
    };

    requestAnimationFrame(updatePosition);
});
