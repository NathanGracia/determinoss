import { Router } from 'express';
import { seedPool } from '../seedPool.js';

const router = Router();

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send the latest known seed immediately if available
  const latest = seedPool.latest();
  if (latest) {
    res.write(`data: ${JSON.stringify({ seed: latest.seed, timestamp: latest.timestamp })}\n\n`);
  }

  const unsubscribe = seedPool.subscribe((entry) => {
    res.write(`data: ${JSON.stringify({ seed: entry.seed, timestamp: entry.timestamp })}\n\n`);
  });

  // Keepalive every 15s
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15_000);

  req.on('close', () => {
    clearInterval(keepalive);
    unsubscribe();
  });
});

export default router;
