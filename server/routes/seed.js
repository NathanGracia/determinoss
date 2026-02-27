import { Router } from 'express';
import { seedPool } from '../seedPool.js';
import { frameStore } from '../frameStore.js';
import { config } from '../config.js';

const router = Router();

router.get('/', (req, res) => {
  if (seedPool.isEmpty()) {
    return res.status(503).json({ error: 'no seed available — no client connected yet' });
  }
  const entry = seedPool.latest();
  const response = {
    seed: entry.seed,
    timestamp: entry.timestamp,
    age_ms: Date.now() - entry.timestamp,
  };

  if (req.query.token !== undefined) {
    if (req.query.token !== config.viewerToken) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    response.frame_jpeg = frameStore.latest
      ? frameStore.latest.toString('base64')
      : null;
  }

  res.json(response);
});

router.get('/history', (req, res) => {
  const n = Math.min(parseInt(req.query.n ?? '10', 10), 100);
  const history = seedPool.history(n);
  res.json(history.map((e) => ({
    seed: e.seed,
    timestamp: e.timestamp,
    age_ms: Date.now() - e.timestamp,
  })));
});

export default router;
