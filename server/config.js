import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  streamUrl: process.env.STREAM_URL ?? '',
  poolSize: parseInt(process.env.POOL_SIZE ?? '100', 10),
  seedIntervalMs: parseInt(process.env.SEED_INTERVAL_MS ?? '2000', 10),
};
