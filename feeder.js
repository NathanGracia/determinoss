/**
 * feeder.js — runs on the local PC with the webcam.
 * Captures MJPEG frames via ffmpeg, computes entropy delta + SHA-256,
 * and sends seeds + frames to the VPS server over WebSocket.
 *
 * Setup:
 *   1. Install ffmpeg (winget install ffmpeg)
 *   2. Find your webcam name:
 *        ffmpeg -list_devices true -f dshow -i dummy
 *   3. Run:
 *        WS_URL=wss://your-domain.com/ws WEBCAM_DEVICE="Your Webcam" node feeder.js
 */

import { createHash } from 'crypto';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import jpeg from 'jpeg-js';

const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';
const WEBCAM_DEVICE = (process.env.WEBCAM_DEVICE || '').trim().replace(/^"|"$/g, '');
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 20;
const SEED_INTERVAL_MS = 2000; // send a seed at most every 2s regardless of FPS

if (!WEBCAM_DEVICE) {
  console.error('[feeder] WEBCAM_DEVICE is not set.');
  console.error(
    process.platform === 'win32'
      ? '[feeder] Run: ffmpeg -list_devices true -f dshow -i dummy'
      : '[feeder] Example: WEBCAM_DEVICE=/dev/video0'
  );
  process.exit(1);
}

// --- WebSocket with exponential backoff ---

let ws = null;
let wsReady = false;
let retryDelay = 2000;

function connectWs() {
  console.log(`[ws] connecting to ${WS_URL}`);
  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('[ws] connected');
    wsReady = true;
    retryDelay = 2000;
  });

  ws.on('close', () => {
    wsReady = false;
    console.log(`[ws] disconnected, retry in ${retryDelay}ms`);
    setTimeout(connectWs, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 30_000);
  });

  ws.on('error', (err) => console.error('[ws] error:', err.message));
}

// --- JPEG frame processing ---

let prevPixels = null;
let lastSeedAt = 0;

function processJpegFrame(jpegBytes) {
  // Send frame for live view
  if (wsReady) {
    ws.send(JSON.stringify({ type: 'frame', data: jpegBytes.toString('base64') }));
  }

  // Decode to RGBA pixels for entropy
  let decoded;
  try {
    decoded = jpeg.decode(jpegBytes, { useTArray: true });
  } catch {
    return;
  }

  const pixels = decoded.data; // RGBA

  if (!prevPixels) {
    prevPixels = pixels;
    return;
  }

  const len = Math.min(pixels.length, prevPixels.length);
  const delta = new Uint8Array(len);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const d = Math.abs(pixels[i] - prevPixels[i]);
    delta[i] = d;
    sum += d;
  }

  prevPixels = pixels;

  if (sum < 256) {
    console.log('[feeder] static frame, skipping');
    return;
  }

  const now = Date.now();
  if (now - lastSeedAt < SEED_INTERVAL_MS) return;
  lastSeedAt = now;

  const seed = createHash('sha256').update(delta).digest('hex');
  console.log(`[feeder] seed: ${seed.slice(0, 16)}… (delta sum=${sum})`);

  if (wsReady) {
    ws.send(JSON.stringify({ type: 'seed', seed }));
  }
}

// --- MJPEG stream parser ---
// ffmpeg outputs raw JPEG frames back-to-back (SOI=FFD8 … EOI=FFD9)

let streamBuffer = Buffer.alloc(0);

const SOI = Buffer.from([0xff, 0xd8]);
const EOI = Buffer.from([0xff, 0xd9]);

function parseFrames(chunk) {
  streamBuffer = Buffer.concat([streamBuffer, chunk]);

  while (true) {
    const start = streamBuffer.indexOf(SOI);
    if (start === -1) { streamBuffer = Buffer.alloc(0); break; }

    const end = streamBuffer.indexOf(EOI, start + 2);
    if (end === -1) {
      // Keep from SOI onwards, wait for more data
      streamBuffer = streamBuffer.subarray(start);
      break;
    }

    const frame = Buffer.from(streamBuffer.subarray(start, end + 2));
    processJpegFrame(frame);
    streamBuffer = streamBuffer.subarray(end + 2);
  }
}

// --- ffmpeg ---

function buildFfmpegArgs() {
  const input =
    process.platform === 'win32'
      ? ['-f', 'dshow', '-video_size', `${WIDTH}x${HEIGHT}`, '-i', `video=${WEBCAM_DEVICE}`]
      : process.platform === 'darwin'
      ? ['-f', 'avfoundation', '-video_size', `${WIDTH}x${HEIGHT}`, '-i', WEBCAM_DEVICE]
      : ['-f', 'v4l2', '-video_size', `${WIDTH}x${HEIGHT}`, '-i', WEBCAM_DEVICE];

  return [
    ...input,
    '-r', String(FPS),
    '-f', 'mjpeg',
    '-q:v', '2',
    'pipe:1',
  ];
}

function startFfmpeg() {
  const args = buildFfmpegArgs();
  console.log('[ffmpeg] starting capture…');

  const ffmpeg = spawn('ffmpeg', args);

  ffmpeg.stdout.on('data', parseFrames);
  ffmpeg.stderr.on('data', (d) => process.stderr.write(d));

  ffmpeg.on('error', (err) => {
    console.error('[ffmpeg] failed to start:', err.message);
    console.error('[ffmpeg] make sure ffmpeg is installed and in PATH');
    streamBuffer = Buffer.alloc(0);
    prevPixels = null;
    setTimeout(startFfmpeg, 5000);
  });

  ffmpeg.on('close', (code) => {
    console.error(`[ffmpeg] exited (code ${code}), restarting in 3s`);
    streamBuffer = Buffer.alloc(0);
    prevPixels = null;
    setTimeout(startFfmpeg, 3000);
  });
}

// --- Start ---
connectWs();
startFfmpeg();
