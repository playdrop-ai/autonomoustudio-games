export type RuntimeBackdropVariant = "landscape" | "portrait";

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type BackdropFitMode = "cover" | "bottom-board-fit";

interface RuntimeBackdropSpec {
  src: string;
  boardRect: NormalizedRect;
  fitMode: BackdropFitMode;
  targetBoardWidthFraction?: number;
}

export interface RuntimeBackdropAsset extends RuntimeBackdropSpec {
  image: HTMLImageElement;
}

export interface RuntimeBackdropPack {
  landscape: RuntimeBackdropAsset;
  portrait: RuntimeBackdropAsset;
}

const BACKDROP_SPECS: Record<RuntimeBackdropVariant, RuntimeBackdropSpec> = {
  landscape: {
    src: "assets/backdrops/latchbloom-board-landscape.jpg",
    boardRect: {
      x: 0.287,
      y: 0.07,
      width: 0.427,
      height: 0.8,
    },
    fitMode: "cover",
  },
  portrait: {
    src: "assets/backdrops/latchbloom-board-portrait-square.jpg",
    boardRect: {
      x: 0.267,
      y: 0.152,
      width: 0.466,
      height: 0.528,
    },
    fitMode: "cover",
  },
};

export function backdropVariantForViewport(width: number, height: number): RuntimeBackdropVariant {
  return width <= height ? "portrait" : "landscape";
}

export async function preloadBackdropPack(): Promise<RuntimeBackdropPack | null> {
  try {
    const [landscape, portrait] = await Promise.all([
      loadBackdrop("landscape"),
      loadBackdrop("portrait"),
    ]);

    return {
      landscape,
      portrait,
    };
  } catch (error) {
    console.warn("[latchbloom] Falling back to procedural backdrop", error);
    return null;
  }
}

async function loadBackdrop(variant: RuntimeBackdropVariant): Promise<RuntimeBackdropAsset> {
  const spec = BACKDROP_SPECS[variant];
  const image = await loadImage(spec.src);
  return {
    ...spec,
    image,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load backdrop: ${src}`));
    image.src = src;
  });
}
