import { Router } from 'express';
import { frameStore } from '../frameStore.js';
import { config } from '../config.js';

const router = Router();
const BOUNDARY = 'determinoss';

router.get('/', (req, res) => {
  if (req.query.token !== config.viewerToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  res.setHeader('Content-Type', `multipart/x-mixed-replace; boundary=${BOUNDARY}`);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (frameStore.latest) {
    writeFrame(res, frameStore.latest);
  }

  const unsubscribe = frameStore.subscribe((frame) => {
    if (!res.writableEnded) writeFrame(res, frame);
  });

  req.on('close', unsubscribe);
});

function writeFrame(res, jpegBuffer) {
  res.write(
    `--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpegBuffer.length}\r\n\r\n`
  );
  res.write(jpegBuffer);
  res.write('\r\n');
}

export default router;
