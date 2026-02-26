// Detects stream type from URL and attaches the appropriate element/loader
export async function loadStream(url, container) {
  // Remove existing media element
  container.innerHTML = '';

  if (!url) return null;

  // RTSP → proxy through server
  if (url.startsWith('rtsp://')) {
    const proxyUrl = `/stream-proxy?url=${encodeURIComponent(url)}`;
    const img = document.createElement('img');
    img.src = proxyUrl;
    img.width = 320;
    img.height = 240;
    container.appendChild(img);
    return img;
  }

  // HLS (.m3u8)
  if (url.endsWith('.m3u8')) {
    const video = document.createElement('video');
    video.width = 320;
    video.height = 240;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    container.appendChild(video);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = url;
    } else {
      // Use hls.js
      const { default: Hls } = await import('hls.js');
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
      } else {
        console.error('[videoLoader] HLS not supported');
      }
    }
    video.play().catch(() => {});
    return video;
  }

  // MJPEG or any HTTP stream → <img>
  const img = document.createElement('img');
  img.src = url;
  img.width = 320;
  img.height = 240;
  container.appendChild(img);
  return img;
}
