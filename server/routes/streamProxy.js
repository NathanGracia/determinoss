import { Router } from 'express';
import { spawn } from 'child_process';

const router = Router();

router.get('/', (req, res) => {
  const rtspUrl = req.query.url;
  if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
    return res.status(400).json({ error: 'url query param must be a rtsp:// URL' });
  }

  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=ffmpeg');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const ffmpeg = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-vf', 'scale=320:240',
    '-r', '1',
    '-f', 'mjpeg',
    '-q:v', '5',
    'pipe:1',
  ]);

  let boundary = Buffer.from('--ffmpeg\r\nContent-Type: image/jpeg\r\n\r\n');

  ffmpeg.stdout.on('data', (chunk) => {
    if (!res.writableEnded) {
      res.write(Buffer.concat([boundary, chunk, Buffer.from('\r\n')]));
    }
  });

  ffmpeg.stderr.on('data', (data) => {
    // ffmpeg logs to stderr — suppress in production
  });

  ffmpeg.on('error', (err) => {
    console.error('[stream-proxy] ffmpeg error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'ffmpeg not available' });
    } else {
      res.end();
    }
  });

  ffmpeg.on('close', () => {
    if (!res.writableEnded) res.end();
  });

  req.on('close', () => {
    ffmpeg.kill('SIGTERM');
  });
});

export default router;
