type StarterKitVendorRuntime = {
  RAPIER: any;
};

declare global {
  interface Window {
    __starterKitRacingVendorRuntime__?: StarterKitVendorRuntime;
  }
}

function readVendorRuntime(): StarterKitVendorRuntime {
  const runtime = window.__starterKitRacingVendorRuntime__;
  if (!runtime) {
    throw new Error('[starter-kit-racing] vendor runtime unavailable');
  }
  return runtime;
}

const runtime = readVendorRuntime();

export const RAPIER = runtime.RAPIER;
