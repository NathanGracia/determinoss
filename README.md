# determinoss

Cryptographic seed generator powered by lava lamp entropy — inspired by [Cloudflare's LavaRand](https://blog.cloudflare.com/lavarand-in-production-the-nitty-gritty-technical-details/).

A webcam films a lava lamp 24/7. Each frame is compared to the previous one: the per-pixel delta is hashed with SHA-256, producing a 256-bit seed that is physically unpredictable. Seeds are exposed via REST API and SSE stream.

![meme](client/meme.png)

---

## How it works

```
Lava lamp + webcam (local PC)
  └── feeder.js
        ├── ffmpeg captures frames at 1fps
        ├── per-pixel delta between consecutive frames
        ├── SHA-256(delta) → 64-char hex seed
        └── WebSocket → VPS server

VPS server (24/7)
  ├── SeedPool — ring buffer of last 100 seeds
  ├── GET  /seed              → latest seed + age_ms
  ├── GET  /seed/history?n=   → last N seeds
  ├── GET  /seed/stream       → SSE live feed
  └── GET  /live?token=       → MJPEG webcam stream (password protected)
```

Static frames (no movement) are discarded. Only genuine visual entropy makes it into the pool.

---

## Stack

- **Server**: Node.js (ESM), Express 5, ws, dotenv
- **Client**: Vite 7, vanilla JS, SSE
- **Feeder**: Node.js, ffmpeg (dshow/v4l2/avfoundation), jpeg-js

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/NathanGracia/determinoss
cd determinoss
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `POOL_SIZE` | Max seeds in memory | `100` |
| `SEED_INTERVAL_MS` | Unused (feeder controls rate) | `2000` |
| `VIEWER_TOKEN` | Password for `/live` stream | `changeme` |

### 3. Run (development)

```bash
# Terminal 1 — Express server
npm run dev:server

# Terminal 2 — Vite dev server
npm run dev:client
# → http://localhost:5173
```

### 4. Run the feeder (local PC with webcam)

Find your webcam name (Windows):
```bash
ffmpeg -list_devices true -f dshow -i dummy
```

Start the feeder:
```bash
# Windows CMD
set WS_URL=ws://localhost:3000/ws && set WEBCAM_DEVICE=HD Pro Webcam C920 && node feeder.js

# Linux / macOS
WS_URL=ws://localhost:3000/ws WEBCAM_DEVICE=/dev/video0 node feeder.js
```

---

## Deployment (VPS + Docker + Caddy)

### Build & run

```bash
docker build -t determinoss .
docker run -d --name determinoss --restart unless-stopped --network web --env-file .env determinoss
```

### Caddy config

```caddy
determinoss.nathangracia.com {
    reverse_proxy determinoss:3000
}
```

### Feeder (local PC → VPS)

```bash
# Windows CMD
set WS_URL=wss://determinoss.nathangracia.com/ws && set WEBCAM_DEVICE=HD Pro Webcam C920 && node feeder.js
```

The feeder must run permanently on the machine with the webcam. The VPS only receives seeds and video frames — it never accesses the camera directly.

---

## API

```bash
# Latest seed
curl https://determinoss.nathangracia.com/seed

# Last 20 seeds
curl https://determinoss.nathangracia.com/seed/history?n=20

# Live SSE stream
curl -N https://determinoss.nathangracia.com/seed/stream
```

### Response format

```json
{
  "seed": "a3f1c8e2d4b6...",
  "timestamp": 1772149899000,
  "age_ms": 412
}
```

---

## Project structure

```
determinoss/
├── feeder.js              # Local PC: captures webcam, sends seeds to VPS
├── server/
│   ├── index.js           # HTTP server + WebSocket
│   ├── config.js          # Env config
│   ├── seedPool.js        # Ring buffer (100 seeds) with pub/sub
│   ├── frameStore.js      # Latest JPEG frame store
│   ├── wsHandler.js       # Handles incoming seeds + frames
│   └── routes/
│       ├── seed.js        # GET /seed, GET /seed/history
│       ├── seedStream.js  # GET /seed/stream (SSE)
│       ├── live.js        # GET /live (MJPEG, token auth)
│       └── streamProxy.js # GET /stream-proxy (RTSP→MJPEG via ffmpeg)
└── client/
    ├── index.html         # Web UI
    └── main.js            # SSE connection, seed display
```
