# determinoss — Claude Code guide

## What this project is

Lava lamp entropy → cryptographic seeds. A local `feeder.js` script captures a webcam via ffmpeg, computes SHA-256 of per-pixel frame deltas, and sends 64-char hex seeds to a VPS server over WebSocket. The server exposes seeds via REST + SSE. The webcam MJPEG stream is also relayed to the server and served behind a token.

## Stack

- **Runtime**: Node.js 22, ESM (`"type": "module"` in package.json)
- **Server**: Express 5, ws 8, dotenv 17
- **Client**: Vite 7, vanilla JS (no framework), SSE
- **Feeder**: Node.js + ffmpeg (dshow on Windows) + jpeg-js

## Key architecture decisions

- `feeder.js` runs on the local PC (has the webcam). The VPS never touches the camera.
- WebSocket at `/ws` receives both `{type: "seed"}` and `{type: "frame"}` JSON messages from feeder.
- `SeedPool` is a ring buffer (100 entries) with pub/sub — used by SSE route.
- `FrameStore` holds the latest JPEG buffer — used by `/live` MJPEG route.
- Express 5 catch-all: use `app.use((req, res) => ...)` not `app.get('*', ...)` (path-to-regexp v8 incompatibility).
- Vite proxy: `/ws` must be `'^/ws$'` (exact match) to avoid matching `/wsClient.js`.

## Important files

| File | Role |
|---|---|
| `feeder.js` | ffmpeg MJPEG → jpeg-js decode → delta SHA-256 → WS |
| `server/index.js` | http.Server shared between Express + WebSocketServer |
| `server/seedPool.js` | RingBuffer with subscribe/unsubscribe |
| `server/frameStore.js` | Latest JPEG frame + pub/sub |
| `server/wsHandler.js` | Validates seeds (64-char hex), stores frames |
| `server/routes/live.js` | MJPEG stream, token auth via `?token=` |
| `server/routes/seedStream.js` | SSE, keepalive every 15s |
| `client/main.js` | EventSource to `/seed/stream`, updates UI |
| `vite.config.js` | Proxy `/seed`, `/live`, `/stream-proxy`, `^/ws$` to :3000 |

## Environment variables

```
PORT=3000
POOL_SIZE=100
SEED_INTERVAL_MS=2000
VIEWER_TOKEN=changeme      # password for /live stream
STREAM_URL=                # unused in production
```

## Run locally

```bash
npm run dev:server         # Express on :3000
npm run dev:client         # Vite on :5173

# Feeder (Windows CMD)
set WS_URL=ws://localhost:3000/ws && set WEBCAM_DEVICE=HD Pro Webcam C920 && node feeder.js
```

## Deploy

```bash
# VPS
docker build -t determinoss .
docker run -d --name determinoss --restart unless-stopped --network web --env-file .env determinoss

# Caddy (already configured at determinoss.nathangracia.com)
# reverse_proxy determinoss:3000
```

## Known quirks

- `WEBCAM_DEVICE` env var must be trimmed — Windows CMD `&&` chaining adds a trailing space. Already handled in feeder.js with `.trim().replace(/^"|"$/g, '')`.
- ffmpeg stderr is logged to process.stderr in development. Suppress in production by changing the `ffmpeg.stderr.on` handler back to `() => {}`.
- `/live` serves MJPEG at ~1fps (lava lamp moves slowly, fine for display).
- Pool returns 503 if empty (no feeder connected yet), 200 with last known seed if feeder disconnected.
