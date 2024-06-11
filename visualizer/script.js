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
    const ring = createRing(2, 32, 0xEFEAD8); // Using the specified color
    ring.position.z = -i * 0.5;
    rings.push(ring);
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
        // Hide login button
        document.getElementById('loginButton').style.display = 'none';
        // Wait until the Spotify Web Playback SDK is loaded
        window.onSpotifyWebPlaybackSDKReady();
    }
});

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
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();

            const audio = new Audio();
            audio.crossOrigin = 'anonymous';
            const track = audioContext.createMediaElementSource(audio);
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

                requestAnimationFrame(updateVisualizer);
            }

            updateVisualizer();
        }
    });

    player.connect();
};

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
