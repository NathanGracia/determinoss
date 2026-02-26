import 'dotenv/config';
import http from 'http';
import express from 'express';
import { config } from './config.js';
import { attachWsServer } from './wsHandler.js';
import seedRouter from './routes/seed.js';
import seedStreamRouter from './routes/seedStream.js';
import streamProxyRouter from './routes/streamProxy.js';

const app = express();
app.use(express.json());

app.use('/seed/stream', seedStreamRouter);
app.use('/seed', seedRouter);
app.use('/stream-proxy', streamProxyRouter);

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (req, res) => res.sendFile('dist/index.html', { root: '.' }));
}

const server = http.createServer(app);
attachWsServer(server);

server.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
  console.log(`[server] stream URL: ${config.streamUrl || '(not configured)'}`);
});
