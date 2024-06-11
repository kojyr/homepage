document.addEventListener('DOMContentLoaded', () => {
    const panoramaWrapper = document.getElementById('panorama-wrapper');
    const container = document.getElementById('container');

    let mouseX = 0;
    let speed = 0;
    const maxSpeed = 4; // Adjust this value to set the maximum speed

    const updateSpeed = (e) => {
        const containerWidth = container.clientWidth;
        mouseX = e.clientX;

        const centerX = containerWidth / 2;
        const offsetX = mouseX - centerX;
        speed = -offsetX / centerX * maxSpeed; // Reversed speed direction and scaled by maxSpeed
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
