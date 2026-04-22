import test from "node:test";
import assert from "node:assert/strict";

import { GameAudio } from "../src/audio.ts";

class FakeHtmlAudioElement {
  loop = false;
  preload = "";
  volume = 1;
  paused = true;

  constructor(_url: string) {}

  load(): void {}

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

class FakeGainNode {
  gain = { value: 1 };

  connect(): void {}

  disconnect(): void {}
}

class FakeAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;

  connect(): void {}

  disconnect(): void {}

  start(): void {}

  stop(): void {
    this.onended?.();
  }
}

class FakeAudioContext {
  readonly destination = {};
  readonly sampleRate = 48_000;
  state: AudioContextState = "suspended";
  onstatechange: (() => void) | null = null;

  constructor(_options?: AudioContextOptions) {}

  createGain(): GainNode {
    return new FakeGainNode() as GainNode;
  }

  createBuffer(_channels: number, _length: number, _sampleRate: number): AudioBuffer {
    return {} as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    return new FakeAudioBufferSourceNode() as AudioBufferSourceNode;
  }

  resume(): Promise<void> {
    this.state = "running";
    this.onstatechange?.();
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.state = "suspended";
    this.onstatechange?.();
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = "closed";
    this.onstatechange?.();
    return Promise.resolve();
  }

  decodeAudioData(_audioData: ArrayBuffer): Promise<AudioBuffer> {
    return Promise.resolve({} as AudioBuffer);
  }
}

function installAudioEnvironment() {
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const previousDocument = (globalThis as typeof globalThis & { document?: unknown }).document;
  const previousAudio = (globalThis as typeof globalThis & { Audio?: unknown }).Audio;
  const previousHtmlAudioElement = (globalThis as typeof globalThis & { HTMLAudioElement?: unknown }).HTMLAudioElement;
  const previousFetch = globalThis.fetch;

  (globalThis as typeof globalThis & { Audio: typeof FakeHtmlAudioElement }).Audio = FakeHtmlAudioElement;
  (globalThis as typeof globalThis & { HTMLAudioElement: typeof FakeHtmlAudioElement }).HTMLAudioElement =
    FakeHtmlAudioElement;
  (globalThis as typeof globalThis & { document: Record<string, unknown> }).document = {
    visibilityState: "visible",
    addEventListener: () => undefined,
  };
  (globalThis as typeof globalThis & { window: Record<string, unknown> }).window = {
    location: {
      href: "https://example.test/?playdrop_channel=dev",
    },
    AudioContext: FakeAudioContext,
    addEventListener: () => undefined,
  };
  globalThis.fetch = async (input: string | URL | Request) =>
    ({
      ok: false,
      url: String(input),
      arrayBuffer: async () => new ArrayBuffer(0),
    }) as Response;

  return () => {
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    } else {
      (globalThis as typeof globalThis & { window: unknown }).window = previousWindow;
    }
    if (previousDocument === undefined) {
      delete (globalThis as typeof globalThis & { document?: unknown }).document;
    } else {
      (globalThis as typeof globalThis & { document: unknown }).document = previousDocument;
    }
    if (previousAudio === undefined) {
      delete (globalThis as typeof globalThis & { Audio?: unknown }).Audio;
    } else {
      (globalThis as typeof globalThis & { Audio: unknown }).Audio = previousAudio;
    }
    if (previousHtmlAudioElement === undefined) {
      delete (globalThis as typeof globalThis & { HTMLAudioElement?: unknown }).HTMLAudioElement;
    } else {
      (globalThis as typeof globalThis & { HTMLAudioElement: unknown }).HTMLAudioElement = previousHtmlAudioElement;
    }
  };
}

test("audio load rejects on SFX preload failure and later gameplay SFX calls stay safe", async () => {
  const restoreEnvironment = installAudioEnvironment();
  try {
    const audio = new GameAudio();
    await assert.rejects(audio.load(), /Failed to load audio asset:/);

    audio.notifyUserGesture();
    assert.doesNotThrow(() => {
      audio.playMatch("sun");
      audio.playAshBreak();
      audio.playGameOver();
    });
  } finally {
    restoreEnvironment();
  }
});
