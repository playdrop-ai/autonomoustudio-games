import * as THREE from 'three';

export const DISPLAY_TONE_MAPPING = THREE.CineonToneMapping;
export const DISPLAY_TONE_MAPPING_EXPOSURE = 1.45;

type DetachedPreviewRendererOptions = {
  width: number;
  height: number;
  alpha?: boolean;
  clearColor?: THREE.ColorRepresentation;
  clearAlpha?: number;
  shadowMapEnabled?: boolean;
};

export type DetachedPreviewRenderer = {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  dispose(): void;
};

export function createDetachedPreviewRenderer(
  options: DetachedPreviewRendererOptions,
): DetachedPreviewRenderer {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;

  const context = canvas.getContext('webgl2', {
    antialias: true,
    alpha: options.alpha ?? true,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });
  if (!(context instanceof WebGL2RenderingContext)) {
    throw new Error('[starter-kit-racing] WebGL2 unavailable for preview rendering');
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
    alpha: options.alpha ?? true,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(options.width, options.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = DISPLAY_TONE_MAPPING;
  renderer.toneMappingExposure = DISPLAY_TONE_MAPPING_EXPOSURE;
  renderer.shadowMap.enabled = options.shadowMapEnabled ?? false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(
    options.clearColor ?? 0x000000,
    options.clearAlpha ?? ((options.alpha ?? true) ? 0 : 1),
  );

  return {
    canvas,
    renderer,
    dispose() {
      renderer.dispose();
      context.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export async function encodeCanvasPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('[starter-kit-racing] Failed to encode preview PNG');
  }
  return blob;
}
