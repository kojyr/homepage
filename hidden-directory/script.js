document.addEventListener('DOMContentLoaded', (event) => {
    const panorama = document.getElementById('panorama');
    const container = document.getElementById('container');

    container.addEventListener('mousemove', (e) => {
        const containerWidth = container.clientWidth;
        const imageWidth = panorama.clientWidth;
        const mouseX = e.clientX;

        // Calculate the percentage of mouse position relative to the container width
        const mousePercentage = mouseX / containerWidth;

        // Calculate the maximum translation value based on the image width
        const maxTranslateX = imageWidth - containerWidth;

        // Calculate the translation value
        const translateX = maxTranslateX * mousePercentage;

        // Apply the translation to the image
        panorama.style.transform = `translateX(${-translateX}px)`;
    });
});
