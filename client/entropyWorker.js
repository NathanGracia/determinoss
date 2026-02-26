// Web Worker: receives raw RGBA pixel arrays, computes delta + SHA-256
let prevPixels = null;

self.onmessage = async (e) => {
  const { pixels } = e.data; // Uint8ClampedArray (RGBA, 320×240 = 307200 bytes)

  if (!prevPixels) {
    prevPixels = pixels;
    return;
  }

  // Compute per-pixel absolute delta
  const delta = new Uint8Array(pixels.length);
  let sum = 0;
  for (let i = 0; i < pixels.length; i++) {
    const d = Math.abs(pixels[i] - prevPixels[i]);
    delta[i] = d;
    sum += d;
  }

  prevPixels = pixels;

  // Filter static frames
  if (sum < 256) return;

  // SHA-256 of the delta buffer
  const hashBuffer = await crypto.subtle.digest('SHA-256', delta);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const seed = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  self.postMessage({ seed });
};
