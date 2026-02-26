class FrameStore {
  constructor() {
    this.latest = null;
    this.subscribers = new Set();
  }

  push(buffer) {
    this.latest = buffer;
    for (const cb of this.subscribers) cb(buffer);
  }

  subscribe(cb) {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }
}

export const frameStore = new FrameStore();
