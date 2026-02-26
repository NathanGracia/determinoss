import { createWsClient } from './wsClient.js';

const WIDTH = 320;
const HEIGHT = 240;

const connectBtn = document.getElementById('connect-btn');
const videoContainer = document.getElementById('video-container');
const seedDisplay = document.getElementById('seed-display');
const seedTimestamp = document.getElementById('seed-timestamp');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const seedCount = document.getElementById('seed-count');

let captureInterval = null;
let worker = null;
let wsClient = null;
let totalSeeds = 0;

const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

function setStatus(connected) {
  statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  statusText.textContent = connected ? 'Connected' : 'Disconnected';
}

function startCapture(video) {
  if (captureInterval) clearInterval(captureInterval);

  captureInterval = setInterval(() => {
    ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    worker?.postMessage({ pixels: imageData.data }, [imageData.data.buffer]);
  }, 2000);
}

function initWorker() {
  if (worker) worker.terminate();
  worker = new Worker(new URL('./entropyWorker.js', import.meta.url), { type: 'module' });

  worker.onmessage = (e) => {
    const { seed } = e.data;
    const sent = wsClient?.send({ seed });
    if (sent) {
      totalSeeds++;
      seedDisplay.textContent = seed;
      seedTimestamp.textContent = new Date().toLocaleTimeString();
      seedCount.textContent = `${totalSeeds} seed${totalSeeds !== 1 ? 's' : ''} sent`;
    }
  };
}

async function connect() {
  connectBtn.disabled = true;
  connectBtn.textContent = 'Requesting camera…';

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (err) {
    alert(`Camera access denied: ${err.message}`);
    connectBtn.disabled = false;
    connectBtn.textContent = 'Start camera';
    return;
  }

  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  videoContainer.innerHTML = '';
  videoContainer.appendChild(video);
  await video.play();

  connectBtn.textContent = 'Camera active';

  initWorker();

  wsClient = createWsClient({
    onOpen: () => {
      setStatus(true);
      startCapture(video);
    },
    onClose: () => setStatus(false),
  });
}

connectBtn.addEventListener('click', connect);

// Show latest known seed on load
fetch('/seed')
  .then((r) => r.json())
  .then((data) => {
    if (data.seed) {
      seedDisplay.textContent = data.seed;
      seedTimestamp.textContent = new Date(data.timestamp).toLocaleTimeString();
    }
  })
  .catch(() => {});
