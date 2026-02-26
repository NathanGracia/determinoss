const seedDisplay = document.getElementById('seed-display');
const seedTimestamp = document.getElementById('seed-timestamp');
const sseDot = document.getElementById('sse-dot');
const sseStatus = document.getElementById('sse-status');

function connect() {
  const es = new EventSource('/seed/stream');

  es.onopen = () => {
    sseDot.classList.add('live');
    sseStatus.textContent = 'Live';
  };

  es.onmessage = (e) => {
    const { seed, timestamp } = JSON.parse(e.data);
    seedDisplay.textContent = seed;
    seedTimestamp.textContent = new Date(timestamp).toLocaleTimeString();
  };

  es.onerror = () => {
    sseDot.classList.remove('live');
    sseStatus.textContent = 'Reconnecting…';
    es.close();
    setTimeout(connect, 3000);
  };
}

connect();
