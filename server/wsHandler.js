import { WebSocketServer } from 'ws';
import { seedPool } from './seedPool.js';

const HEX_RE = /^[0-9a-f]{64}$/;

export function attachWsServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[ws] client connected: ${ip}`);

    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        ws.send(JSON.stringify({ error: 'invalid json' }));
        return;
      }

      const { seed } = msg;
      if (typeof seed !== 'string' || !HEX_RE.test(seed)) {
        ws.send(JSON.stringify({ error: 'invalid seed format' }));
        return;
      }

      seedPool.push(seed);
      ws.send(JSON.stringify({ ok: true, timestamp: Date.now() }));
    });

    ws.on('close', () => {
      console.log(`[ws] client disconnected: ${ip}`);
    });

    ws.on('error', (err) => {
      console.error(`[ws] error from ${ip}:`, err.message);
    });
  });

  return wss;
}
