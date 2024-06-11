// Initialize Three.js scene, camera, and renderer
let scene, camera, renderer;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    animate();
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    updateVisualizer(); // Call the visualizer update function
    renderer.render(scene, camera);
}

// Call init to set everything up
init();

/* 
  ____  _            
 / ___|| |_ _ __ __ _ 
 \___ \| __| '__/ _` |
  ___) | |_| | | (_| |
 |____/ \__|_|  \__,_|
                      
Step 1: Create Rings 
We will create multiple rings to form the visualizer's tube-like structure. 
These rings will vary in size and properties to create an engaging effect.
*/

function createRing(radius, segments, color) {
    const geometry = new THREE.RingGeometry(radius - 0.1, radius, segments);
    const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    return ring;
}

let rings = [];
const numRings = 100;
for (let i = 1; i <= numRings; i++) {
    const ring = createRing(2, 32, 0xffffff);
    ring.position.z = -i * 0.5;
    rings.push(ring);
}

/* 
  _     _             
 | |   (_)            
 | |    _ _ __   __ _ 
 | |   | | '_ \ / _` |
 | |___| | | | | (_| |
 |_____|_|_| |_|\__, |
                 __/ |
                |___/ 
Step 2: Create Lines 
Lines will stretch along the sides of the tube, adding another layer to our visualizer.
*/

function createLine(length, color) {
    const material = new THREE.LineBasicMaterial({ color: color });
    const points = [];
    points.push(new THREE.Vector3(-length / 2, 0, 0));
    points.push(new THREE.Vector3(length / 2, 0, 0));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    return line;
}

let lines = [];
for (let i = 1; i <= 10; i++) {
    lines.push(createLine(10, 0xffffff));
}

/* 
  ____  _ _       _     
 | __ )(_) |_ ___| |__  
 |  _ \| | __/ __| '_ \ 
 | |_) | | || (__| | | |
 |____/|_|\__\___|_| |_|
                        
Step 3: Create Blobs 
Blobs will move towards the camera to create a dynamic visual effect.
*/

function createBlob(radius, color) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.z = -10;
    scene.add(sphere);
    return sphere;
}

let blobs = [];
for (let i = 0; i < 5; i++) {
    blobs.push(createBlob(0.5, 0xff0000));
}

/* 
  ____            _   _         
 / ___|  ___ _ __| |_(_) ___ ___ 
 \___ \ / _ \ '__| __| |/ __/ __|
  ___) |  __/ |  | |_| | (__\__ \
 |____/ \___|_|   \__|_|\___|___/
                                 
Step 2: Integrate Spotify Web Playback SDK 
Set up the Spotify player to play music and provide audio data for the visualizer.
*/

const clientId = '49a092ec097744df8e6fe06a93132afb'; // Your client ID
const redirectUri = 'http://www.ollestromdahl.com/visualizer/'; // Update your redirect URI

// Load Spotify SDK and initialize player when ready
window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new Spotify.Player({
        name: 'Web Playback SDK Template',
        getOAuthToken: cb => { cb(accessToken); }, // Provide access token
        volume: 0.5
    });

    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        // Use the Spotify Web API to start playback
        playMusic(accessToken, device_id);
    });

    player.addListener('player_state_changed', state => {
        if (state && state.track_window.current_track) {
            const audio = new Audio(state.track_window.current_track.uri);
            audio.crossOrigin = "anonymous";

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const track = audioContext.createMediaElementSource(audio);
            const analyser = audioContext.createAnalyser();
            track.connect(analyser);
            analyser.connect(audioContext.destination);

            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            function updateVisualizer() {
                analyser.getByteFrequencyData(dataArray);

                // Update rings based on frequency data
                for (let i = 0; i < numRings; i++) {
                    const scale = dataArray[i % bufferLength] / 128.0;
                    rings[i].scale.set(scale, scale, 1);
                    rings[i].position.z += 0.1;
                    if (rings[i].position.z > camera.position.z) {
                        rings[i].position.z = -numRings * 0.5;
                    }
                }
            }

            audio.play();
            updateVisualizer();
        }
    });

    player.connect();
};

// Login button event listener
document.getElementById('loginButton').addEventListener('click', () => {
    const scopes = 'streaming user-read-email user-read-private';
    const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location = authUrl;
});

// Check for access token in URL
let accessToken;
window.addEventListener('load', () => {
    const hash = window.location.hash.substring(1); // Get the part of the URL after #
    const params = new URLSearchParams(hash); // Parse the parameters from the hash
    accessToken = params.get('access_token'); // Get the access token

    if (accessToken) {
        // Wait until the Spotify Web Playback SDK is loaded
        window.onSpotifyWebPlaybackSDKReady();
    }
});

function playMusic(token, device_id) {
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: ['spotify:track:6v6AOyEwnzthASohlRwYrS?si=cd456a7a108e4153'] }), // Replace with your track URI
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }).then(response => {
        if (!response.ok) {
            console.error('Failed to start playback:', response);
        }
    }).catch(error => {
        console.error('Error starting playback:', error);
    });
}
