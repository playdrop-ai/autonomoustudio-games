export type QualityProfileName = 'desktop' | 'desktop-safari' | 'mobile-safari';

export type ShadowProfile = 'soft' | 'basic';

export type QualityProfile = {
  name: QualityProfileName;
  perfUiEnabled: boolean;
  pixelRatioCap: number;
  antialias: boolean;
  shadowMapSize: number;
  shadowProfile: ShadowProfile;
  cloudsEnabled: boolean;
  decorativeShadowsEnabled: boolean;
  decorationUpdateIntervalFrames: number;
  effectUpdateIntervalFrames: number;
  aiUpdateIntervalFrames: number;
};

export type RuntimeDeviceInfo = {
  category?: string | null;
  inputs?: Record<string, boolean | undefined> | null;
};

export type RuntimeDeviceFlags = {
  isMobile: boolean;
  hasTouchInput: boolean;
  hasKeyboardInput: boolean;
};

const DESKTOP_PROFILE: QualityProfile = {
  name: 'desktop',
  perfUiEnabled: false,
  pixelRatioCap: 2,
  antialias: true,
  shadowMapSize: 2048,
  shadowProfile: 'soft',
  cloudsEnabled: true,
  decorativeShadowsEnabled: true,
  decorationUpdateIntervalFrames: 1,
  effectUpdateIntervalFrames: 1,
  aiUpdateIntervalFrames: 1,
};

const DESKTOP_SAFARI_PROFILE: QualityProfile = {
  name: 'desktop-safari',
  perfUiEnabled: false,
  pixelRatioCap: 1,
  antialias: false,
  shadowMapSize: 0,
  shadowProfile: 'basic',
  cloudsEnabled: false,
  decorativeShadowsEnabled: false,
  decorationUpdateIntervalFrames: 2,
  effectUpdateIntervalFrames: 2,
  aiUpdateIntervalFrames: 2,
};

const MOBILE_SAFARI_PROFILE: QualityProfile = {
  name: 'mobile-safari',
  perfUiEnabled: false,
  pixelRatioCap: 1,
  antialias: false,
  shadowMapSize: 0,
  shadowProfile: 'basic',
  cloudsEnabled: false,
  decorativeShadowsEnabled: false,
  decorationUpdateIntervalFrames: 2,
  effectUpdateIntervalFrames: 2,
  aiUpdateIntervalFrames: 2,
};

export function detectRuntimeDeviceFlags(device: RuntimeDeviceInfo | null | undefined): RuntimeDeviceFlags {
  const category = device?.category ?? null;
  const inputs = device?.inputs ?? {};
  const isMobileCategory = category === 'phone' || category === 'tablet';
  const hasTouchInput = inputs.touch === true;
  const hasKeyboardInput = Object.prototype.hasOwnProperty.call(inputs, 'keyboard')
    ? inputs.keyboard === true
    : !isMobileCategory && !hasTouchInput;

  return {
    isMobile: isMobileCategory || (hasTouchInput && !hasKeyboardInput),
    hasTouchInput,
    hasKeyboardInput,
  };
}

export function resolveQualityProfile(
  device: RuntimeDeviceInfo | null | undefined,
  options: {
    perfUiEnabled?: boolean;
    profileName?: QualityProfileName | null;
  } = {},
): QualityProfile {
  const flags = detectRuntimeDeviceFlags(device);
  const baseProfile =
    options.profileName === 'desktop'
      ? DESKTOP_PROFILE
      : options.profileName === 'desktop-safari'
        ? DESKTOP_SAFARI_PROFILE
        : options.profileName === 'mobile-safari'
          ? MOBILE_SAFARI_PROFILE
          : flags.isMobile
            ? MOBILE_SAFARI_PROFILE
            : DESKTOP_PROFILE;

  return {
    ...baseProfile,
    perfUiEnabled: options.perfUiEnabled === true,
  };
}
