import type nipplejsRuntime from 'nipplejs';
import type { JoystickManager, JoystickOutputData } from 'nipplejs';
import type { GLTFLoader as GLTFLoaderType } from 'three/addons/loaders/GLTFLoader.js';

type StarterKitVendorRuntime = {
  THREE: typeof import('three');
  GLTFLoader: typeof GLTFLoaderType;
  RAPIER: any;
  nipplejs: typeof nipplejsRuntime;
};

declare global {
  interface Window {
    __starterKit3dPlatformerVendorRuntime__?: StarterKitVendorRuntime;
  }
}

function readVendorRuntime(): StarterKitVendorRuntime {
  const runtime = window.__starterKit3dPlatformerVendorRuntime__;
  if (!runtime) {
    throw new Error('[starter-kit-3d-platformer] vendor runtime unavailable');
  }
  return runtime;
}

const runtime = readVendorRuntime();

export const THREE = runtime.THREE;
export const GLTFLoader = runtime.GLTFLoader;
export const RAPIER = runtime.RAPIER;
export const nipplejs = runtime.nipplejs;

export type { JoystickManager, JoystickOutputData };
