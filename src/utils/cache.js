// @ts-check

/**
 * Tiny LRU with TTL. Per-instance only (not shared across Vercel invocations).
 * Good enough to deduplicate repeated requests within a warm instance.
 */
export class LruCache {
  /**
   * @param {{ max: number, ttlMs: number }} opts
   */
  constructor({ max, ttlMs }) {
    this.max = max;
    this.ttlMs = ttlMs;
    /** @type {Map<string, { value: unknown, expires: number }>} */
    this.store = new Map();
  }

  /** @param {string} key */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /**
   * @param {string} key
   * @param {unknown} value
   */
  set(key, value) {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
    if (this.store.size > this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  clear() {
    this.store.clear();
  }
}
