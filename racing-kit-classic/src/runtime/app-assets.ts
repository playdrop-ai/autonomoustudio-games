/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';

export type RacingRuntimeAssetFile = {
  role: string;
  url: string;
  contentType?: string | null;
};

export type RacingRuntimeAsset = {
  assetRef: string;
  runtimeKey: string | null;
  sourceType: 'OWNED' | 'DIRECT' | 'PACK';
  sourcePackRef?: string | null;
  files: RacingRuntimeAssetFile[];
};

export const STOCK_TRACK_RUNTIME_KEY = 'stock-track';

function cloneRuntimeAsset(asset: RacingRuntimeAsset): RacingRuntimeAsset {
  return {
    ...asset,
    files: asset.files.map((file) => ({ ...file })),
  };
}

function requireAssetsApi(sdk: PlaydropSDK) {
  if (!sdk.assets || typeof sdk.assets.resolveAppAsset !== 'function') {
    throw new Error('[starter-kit-racing] sdk.assets runtime asset APIs are unavailable');
  }
  return sdk.assets;
}

export function resolveRacingAppAssetFile(
  sdk: PlaydropSDK,
  runtimeKey: string,
  role = 'primary',
): string {
  const asset = requireAssetsApi(sdk).resolveAppAsset(runtimeKey) as RacingRuntimeAsset;
  const file = asset.files.find((entry) => entry.role === role);
  const url = typeof file?.url === 'string' ? file.url.trim() : '';
  if (!url) {
    throw new Error(`[starter-kit-racing] Missing ${role} file for app asset ${runtimeKey}`);
  }
  return url;
}

export function getDirectStockTrackAsset(sdk: PlaydropSDK): RacingRuntimeAsset {
  const asset = cloneRuntimeAsset(requireAssetsApi(sdk).resolveAppAsset(STOCK_TRACK_RUNTIME_KEY) as RacingRuntimeAsset);
  if (asset.sourceType !== 'DIRECT') {
    throw new Error(
      `[starter-kit-racing] App asset ${STOCK_TRACK_RUNTIME_KEY} must come from a DIRECT dependency, received ${asset.sourceType}`,
    );
  }
  if (!asset.assetRef || asset.assetRef.trim().length === 0) {
    throw new Error('[starter-kit-racing] Direct stock track asset is missing an assetRef');
  }
  return asset;
}
