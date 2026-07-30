/**
 * App-scoped persistence backed by PlayDrop identity storage.
 * The synchronous read API keeps the hot game path simple after init.
 */

const KEY = 'flightySaucer';

const DEFAULTS = {
  best: 0,
  games: 0,
  flaps: 0,
  totalScore: 0,
  sound: true,
  haptics: true,
  quality: 'auto',
  seenHint: false,
};

let cache = null;
let sdk = null;

function read() {
  if (!cache) throw new Error('[flighty-saucer] Store used before Store.init()');
  return cache;
}

let flushTimer = 0;
let pendingWrite = Promise.resolve();
function flush() {
  if (!sdk) throw new Error('[flighty-saucer] Store flush before Store.init()');
  const snapshot = { ...read() };
  pendingWrite = pendingWrite.then(() => sdk.me.updateAppData({ [KEY]: snapshot }));
  pendingWrite.catch((error) => console.error('[flighty-saucer] save failed', error));
  return pendingWrite;
}

export const Store = {
  async init(playdropSdk) {
    sdk = playdropSdk;
    const saved = sdk.me.appData?.data?.[KEY];
    cache = { ...DEFAULTS };
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) Object.assign(cache, saved);
  },
  get(k) { return read()[k]; },
  all() { return { ...read() }; },
  set(k, v) {
    read()[k] = v;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 750);
  },
  bump(k, by = 1) { Store.set(k, (read()[k] || 0) + by); },
  flushNow() { clearTimeout(flushTimer); return flush(); },
  reset() { cache = { ...DEFAULTS }; flush(); },
};
