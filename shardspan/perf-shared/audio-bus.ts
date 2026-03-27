export type AudioBusEvent = {
  type: 'preload' | 'unlock' | 'playOneShot' | 'loopStart' | 'loopStop' | 'loopUpdate';
  url: string | null;
  durationMs: number;
  detail: string | null;
};

type AudioLoopState = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type AudioOneShotState = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type AudioBusOptions = {
  onEvent?: (event: AudioBusEvent) => void;
};

function normalizeDurationMs(durationMs: number): number {
  return Number((Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0).toFixed(3));
}

export function createWebAudioBus(options: AudioBusOptions = {}) {
  const AudioContextCtor = globalThis.AudioContext;
  if (typeof AudioContextCtor !== 'function') {
    throw new Error('[perf-shared] AudioContext unavailable');
  }

  const context = new AudioContextCtor({
    latencyHint: 'interactive',
  });
  const masterGain = context.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(context.destination);

  const buffers = new Map<string, AudioBuffer>();
  const pendingBuffers = new Map<string, Promise<AudioBuffer>>();
  const loops = new Map<string, AudioLoopState>();
  const oneShots = new Map<string, Set<AudioOneShotState>>();
  let enabled = false;

  const emit = (
    type: AudioBusEvent['type'],
    url: string | null,
    durationMs: number,
    detail: string | null = null,
  ): void => {
    options.onEvent?.({
      type,
      url,
      durationMs: normalizeDurationMs(durationMs),
      detail,
    });
  };

  const requireBuffer = (url: string): AudioBuffer => {
    const buffer = buffers.get(url);
    if (!buffer) {
      throw new Error(`[perf-shared] Sound was used before preload completed: ${url}`);
    }
    return buffer;
  };

  const disconnectLoop = (url: string, state: AudioLoopState): void => {
    try {
      state.source.stop();
    } catch {
      // `stop()` is only invalid after the source has already ended.
    }
    state.source.disconnect();
    state.gain.disconnect();
    if (loops.get(url) === state) {
      loops.delete(url);
    }
  };

  const createLoopState = (url: string): AudioLoopState => {
    const source = context.createBufferSource();
    source.buffer = requireBuffer(url);
    source.loop = true;

    const gain = context.createGain();
    source.connect(gain);
    gain.connect(masterGain);

    const state: AudioLoopState = { source, gain };
    source.onended = () => {
      if (loops.get(url) === state) {
        loops.delete(url);
      }
      source.disconnect();
      gain.disconnect();
    };
    source.start(0);
    return state;
  };

  const disconnectOneShot = (url: string, state: AudioOneShotState): void => {
    state.source.disconnect();
    state.gain.disconnect();
    const active = oneShots.get(url);
    active?.delete(state);
    if (active && active.size === 0) {
      oneShots.delete(url);
    }
  };

  const loadBuffer = async (url: string): Promise<AudioBuffer> => {
    const existingBuffer = buffers.get(url);
    if (existingBuffer) {
      return existingBuffer;
    }

    const pending = pendingBuffers.get(url);
    if (pending) {
      return pending;
    }

    const startTime = performance.now();
    const promise = (async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`[perf-shared] Failed to load sound ${url}: HTTP ${response.status}`);
      }
      const encoded = await response.arrayBuffer();
      const decoded = await context.decodeAudioData(encoded.slice(0));
      buffers.set(url, decoded);
      emit('preload', url, performance.now() - startTime, `frames ${decoded.length}`);
      return decoded;
    })().finally(() => {
      pendingBuffers.delete(url);
    });

    pendingBuffers.set(url, promise);
    return promise;
  };

  return {
    async preload(urls: readonly string[]): Promise<void> {
      const uniqueUrls = [...new Set(urls.filter((url) => url.length > 0))];
      await Promise.all(uniqueUrls.map((url) => loadBuffer(url)));
    },

    unlock(): void {
      if (enabled) {
        return;
      }
      enabled = true;
      const startTime = performance.now();
      void context.resume().then(() => {
        emit('unlock', null, performance.now() - startTime, context.state);
      });
    },

    stopLoops(): void {
      for (const [url, state] of loops.entries()) {
        const startTime = performance.now();
        disconnectLoop(url, state);
        emit('loopStop', url, performance.now() - startTime, 'stopLoops');
      }
    },

    playOneShot(url: string, volume = 1, playbackRate?: number, allowOverlap = true): void {
      if (!enabled) {
        return;
      }
      const active = oneShots.get(url);
      if (!allowOverlap && active && active.size > 0) {
        return;
      }

      const startTime = performance.now();
      const source = context.createBufferSource();
      source.buffer = requireBuffer(url);
      source.playbackRate.value = playbackRate ?? 0.9 + Math.random() * 0.2;

      const gain = context.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(masterGain);

      const state: AudioOneShotState = { source, gain };
      if (!allowOverlap) {
        const current = oneShots.get(url) ?? new Set<AudioOneShotState>();
        current.add(state);
        oneShots.set(url, current);
      }

      source.onended = () => {
        disconnectOneShot(url, state);
      };
      source.start(0);
      emit(
        'playOneShot',
        url,
        performance.now() - startTime,
        `volume ${volume.toFixed(2)} rate ${source.playbackRate.value.toFixed(2)} overlap ${allowOverlap}`,
      );
    },

    setLoop(url: string, active: boolean, volume: number, playbackRate = 1): void {
      if (!enabled) {
        return;
      }

      const startTime = performance.now();
      let state = loops.get(url) ?? null;

      if (!active) {
        if (!state) {
          return;
        }
        disconnectLoop(url, state);
        emit('loopStop', url, performance.now() - startTime, 'inactive');
        return;
      }

      let created = false;
      if (!state) {
        state = createLoopState(url);
        loops.set(url, state);
        created = true;
      }

      state.gain.gain.value = volume;
      state.source.playbackRate.value = playbackRate;

      const durationMs = performance.now() - startTime;
      if (created || durationMs >= 1) {
        emit(
          created ? 'loopStart' : 'loopUpdate',
          url,
          durationMs,
          `volume ${volume.toFixed(2)} rate ${playbackRate.toFixed(2)}`,
        );
      }
    },
  };
}
