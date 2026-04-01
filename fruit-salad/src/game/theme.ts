import type { LanternColor } from "./logic";

import appleUrl from "../assets/theme/apple.png";
import backgroundUrl from "../assets/theme/background.png";
import blueberryUrl from "../assets/theme/blueberry.png";
import grapeUrl from "../assets/theme/grape.png";
import limeUrl from "../assets/theme/lime.png";
import orangeUrl from "../assets/theme/orange.png";

export interface FruitThemeEntry {
  fruitName: string;
  spriteUrl: string;
  glow: string;
  accent: string;
}

export interface ThemeAssets {
  background: HTMLImageElement;
  fruits: Record<LanternColor, HTMLImageElement>;
}

export const fruitPalette: Record<LanternColor, FruitThemeEntry> = {
  coral: {
    fruitName: "apple",
    spriteUrl: appleUrl,
    glow: "#ffb48f",
    accent: "#d6423a",
  },
  gold: {
    fruitName: "orange",
    spriteUrl: orangeUrl,
    glow: "#ffd188",
    accent: "#f28d20",
  },
  jade: {
    fruitName: "lime",
    spriteUrl: limeUrl,
    glow: "#d1ff98",
    accent: "#7ebb2a",
  },
  cyan: {
    fruitName: "blueberry",
    spriteUrl: blueberryUrl,
    glow: "#9dc4ff",
    accent: "#5271d9",
  },
  plum: {
    fruitName: "grape",
    spriteUrl: grapeUrl,
    glow: "#d7b0ff",
    accent: "#8d49d0",
  },
};

export const GAME_COPY = {
  title: "Fruit Salad",
  subtitlePortrait: "Match fruit. Cut the vine. Drop the bunch.",
  subtitleLandscape: "Aim clean. Slice the vine chain. Keep the bowl clear.",
  startButton: "Start Tossing",
  gameOverTitle: "The Bowl Overflowed",
  gameOverPortrait: "One better vine cut would have cleared the whole bunch.",
  gameOverLandscape: "The smart vine cut was there. The sink line just got there first.",
  replayButton: "Toss Again",
  scoreLabel: "SCORE",
  dangerLabel: "NEXT DROP",
  dropPrefix: "BUNCH DROP",
  bestLabel: "BEST",
  bestDropLabel: "BEST DROP",
  runScoreLabel: "RUN SCORE",
} as const;

export async function loadThemeAssets(): Promise<ThemeAssets> {
  const [background, coral, gold, jade, cyan, plum] = await Promise.all([
    loadImage(backgroundUrl, "background"),
    loadImage(fruitPalette.coral.spriteUrl, "apple"),
    loadImage(fruitPalette.gold.spriteUrl, "orange"),
    loadImage(fruitPalette.jade.spriteUrl, "lime"),
    loadImage(fruitPalette.cyan.spriteUrl, "blueberry"),
    loadImage(fruitPalette.plum.spriteUrl, "grape"),
  ]);

  return {
    background,
    fruits: {
      coral,
      gold,
      jade,
      cyan,
      plum,
    },
  };
}

function loadImage(url: string, label: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`[fruit-salad] failed to load ${label} image`));
    image.src = url;
  });
}
