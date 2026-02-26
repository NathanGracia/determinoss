// WebSocket client with exponential backoff reconnection
export function createWsClient({ onOpen, onClose } = {}) {
  let ws = null;
  let delay = 1000;
  let stopped = false;

  function connect() {
    if (stopped) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);

    ws.addEventListener('open', () => {
      console.log('[ws] connected');
      delay = 1000;
      onOpen?.();
    });

    ws.addEventListener('close', () => {
      console.log(`[ws] disconnected, reconnecting in ${delay}ms`);
      onClose?.();
      if (!stopped) {
        setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30_000);
      }
    });

    ws.addEventListener('error', (e) => {
      console.error('[ws] error', e);
    });
  }

  connect();

  return {
    send(data) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        return true;
      }
      return false;
    },
    stop() {
      stopped = true;
      ws?.close();
    },
  };
}
