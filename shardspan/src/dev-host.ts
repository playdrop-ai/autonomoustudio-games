/// <reference types="playdrop-sdk-types" />

import type { QualityProfileName } from '../perf-shared/quality';

export {};

type HostLoadingState = {
  status: 'loading' | 'ready' | 'error';
  message?: string;
  progress?: number;
};

type HarnessRuntimeConfig = {
  perfUiEnabled?: boolean;
  benchmarkEnabled?: boolean;
  qualityProfile?: QualityProfileName;
};

type HarnessDevice = {
  category: 'desktop' | 'phone' | 'tablet';
  inputs: {
    keyboard: boolean;
    mouse: boolean;
    touch: boolean;
    gamepad: boolean;
  };
};

declare global {
  interface Window {
    __starterKit3dPlatformerHarnessLoadingState__?: HostLoadingState;
    __starterKit3dPlatformerHarnessConfig__?: HarnessRuntimeConfig;
  }
}

type HarnessSdk = {
  host: {
    setLoadingState: (state: HostLoadingState) => void;
  };
  device: HarnessDevice;
  libs: {
    three: {
      load: (options?: { addons?: string[] }) => Promise<Record<string, unknown>>;
    };
    rapier: {
      load: () => Promise<unknown>;
    };
    nipplejs: {
      load: () => Promise<unknown>;
    };
  };
};

const host = {
  setLoadingState(state: HostLoadingState): void {
    window.__starterKit3dPlatformerHarnessLoadingState__ = state;
  },
};

let sdkPromise: Promise<HarnessSdk> | null = null;

function readHarnessConfig(): HarnessRuntimeConfig {
  const searchParams = new URLSearchParams(window.location.search);
  const qualityProfile = searchParams.get('profile');
  return {
    perfUiEnabled: searchParams.get('perfUi') === '1',
    benchmarkEnabled: searchParams.get('benchmark') === '1',
    qualityProfile:
      qualityProfile === 'desktop' ||
      qualityProfile === 'desktop-safari' ||
      qualityProfile === 'mobile-safari'
        ? qualityProfile
        : undefined,
  };
}

function resolveHarnessDevice(): HarnessDevice {
  const searchParams = new URLSearchParams(window.location.search);
  const qualityOverride = searchParams.get('quality');
  if (qualityOverride === 'mobile-safari') {
    return {
      category: 'phone',
      inputs: {
        keyboard: false,
        mouse: false,
        touch: true,
        gamepad: false,
      },
    };
  }
  if (qualityOverride === 'desktop') {
    return {
      category: 'desktop',
      inputs: {
        keyboard: true,
        mouse: true,
        touch: false,
        gamepad: false,
      },
    };
  }

  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const hasTouch = coarsePointer || navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const userAgent = navigator.userAgent;
  const isTablet = /\b(iPad|Tablet)\b/i.test(userAgent);

  return {
    category: hasTouch ? (isTablet ? 'tablet' : 'phone') : 'desktop',
    inputs: {
      keyboard: !hasTouch,
      mouse: !hasTouch,
      touch: hasTouch,
      gamepad: false,
    },
  };
}

async function createSdk(): Promise<HarnessSdk> {
  const [
    threeModule,
    gltfLoaderModule,
    rapierModule,
    nipplejsModule,
  ] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('@dimforge/rapier3d-compat'),
    import('nipplejs'),
  ]);

  const rapier = rapierModule.default;
  await rapier.init();

  return {
    host,
    device: resolveHarnessDevice(),
    libs: {
      three: {
        load: async () => ({
          ...threeModule,
          GLTFLoader: gltfLoaderModule.GLTFLoader,
        }),
      },
      rapier: {
        load: async () => rapier,
      },
      nipplejs: {
        load: async () => nipplejsModule.default,
      },
    },
  };
}

window.__starterKit3dPlatformerHarnessConfig__ = readHarnessConfig();

const harnessPlaydrop = {
  host,
  init: async (): Promise<HarnessSdk> => {
    if (!sdkPromise) {
      sdkPromise = createSdk();
    }
    return sdkPromise;
  },
} as unknown as NonNullable<Window['playdrop']>;

window.playdrop = harnessPlaydrop;
