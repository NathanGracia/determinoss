import { config } from './config.js';

class SeedPool {
  constructor(size) {
    this.size = size;
    this.pool = [];
    this.subscribers = new Set();
  }

  push(seed) {
    const entry = { seed, timestamp: Date.now() };
    this.pool.push(entry);
    if (this.pool.length > this.size) {
      this.pool.shift();
    }
    for (const cb of this.subscribers) {
      cb(entry);
    }
  }

  latest() {
    return this.pool.at(-1) ?? null;
  }

  history(n = 10) {
    return this.pool.slice(-Math.min(n, this.pool.length)).reverse();
  }

  isEmpty() {
    return this.pool.length === 0;
  }

  subscribe(cb) {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }
}

export const seedPool = new SeedPool(config.poolSize);
