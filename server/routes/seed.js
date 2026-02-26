import { Router } from 'express';
import { seedPool } from '../seedPool.js';

const router = Router();

router.get('/', (req, res) => {
  if (seedPool.isEmpty()) {
    return res.status(503).json({ error: 'no seed available — no client connected yet' });
  }
  const entry = seedPool.latest();
  res.json({
    seed: entry.seed,
    timestamp: entry.timestamp,
    age_ms: Date.now() - entry.timestamp,
  });
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
