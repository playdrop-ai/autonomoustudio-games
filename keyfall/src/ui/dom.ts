import type { PreviewCluster, Screen } from "../game/logic.ts";

export interface UIState {
  screen: Screen;
  score: number;
  bestScore: number;
  combo: number;
  bestCombo: number;
  lives: number;
  songLabel: string;
  preview: PreviewCluster[];
  muted: boolean;
}

export interface UIRefs {
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  preview: HTMLDivElement;
  scoreValue: HTMLDivElement;
  comboValue: HTMLDivElement;
  songValue: HTMLDivElement;
  livesValue: HTMLDivElement;
  startOverlay: HTMLDivElement;
  gameOverOverlay: HTMLDivElement;
  startButton: HTMLButtonElement;
  retryButton: HTMLButtonElement;
  muteButton: HTMLButtonElement;
  gameOverScore: HTMLDivElement;
  gameOverBest: HTMLDivElement;
  gameOverCombo: HTMLDivElement;
}

export function createUI(): UIRefs {
  document.title = "Keyfall";
  document.body.style.margin = "0";
  document.body.style.background = "#050b13";
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";

  const stage = document.createElement("div");
  stage.style.position = "fixed";
  stage.style.inset = "0";
  stage.style.overflow = "hidden";
  stage.style.background = "radial-gradient(circle at top, #0f2236 0%, #050b13 68%)";
  document.body.appendChild(stage);

  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  stage.appendChild(canvas);

  const hud = document.createElement("div");
  hud.style.position = "absolute";
  hud.style.inset = "0";
  hud.style.pointerEvents = "none";
  hud.style.fontFamily = "\"Avenir Next\", \"SF Pro Display\", sans-serif";
  hud.style.color = "#f7fbff";
  stage.appendChild(hud);

  const scoreTag = label("Score", 28, 28);
  const scoreValue = value("0", 28, 56, "left");
  const songValue = value("GLASS", 0, 56, "right");
  songValue.style.right = "28px";
  songValue.style.fontSize = "clamp(34px, 8vw, 46px)";
  songValue.style.lineHeight = "0.9";
  songValue.style.textAlign = "right";
  const comboValue = value("x1", 0, 100, "right");
  comboValue.style.right = "28px";
  comboValue.style.fontSize = "clamp(30px, 7vw, 42px)";
  comboValue.style.lineHeight = "0.9";
  comboValue.style.textAlign = "right";
  const livesValue = document.createElement("div");
  livesValue.style.position = "absolute";
  livesValue.style.left = "50%";
  livesValue.style.top = "30px";
  livesValue.style.transform = "translateX(-50%)";
  livesValue.style.display = "flex";
  livesValue.style.gap = "12px";
  const preview = document.createElement("div");
  preview.style.position = "absolute";
  preview.style.left = "50%";
  preview.style.top = "124px";
  preview.style.transform = "translateX(-50%)";
  preview.style.display = "flex";
  preview.style.gap = "10px";
  preview.style.alignItems = "center";

  const muteButton = chipButton("Mute");
  muteButton.style.position = "absolute";
  muteButton.style.left = "50%";
  muteButton.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + 16px)";
  muteButton.style.transform = "translateX(-50%)";
  muteButton.style.pointerEvents = "auto";

  const startOverlay = overlayPanel("Keyfall");
  const startButton = actionButton("Play");
  startOverlay.appendChild(startButton);

  const gameOverOverlay = overlayPanel("");
  const gameOverScore = overlayValue("0");
  const gameOverBest = overlayMeta("Best 0");
  const gameOverCombo = overlayMeta("Combo 0");
  const retryButton = actionButton("Retry");
  gameOverOverlay.append(gameOverScore, gameOverBest, gameOverCombo, retryButton);
  gameOverOverlay.style.visibility = "hidden";

  hud.append(scoreTag, scoreValue, songValue, comboValue, livesValue, preview, muteButton, startOverlay, gameOverOverlay);

  return {
    stage,
    canvas,
    preview,
    scoreValue,
    comboValue,
    songValue,
    livesValue,
    startOverlay,
    gameOverOverlay,
    startButton,
    retryButton,
    muteButton,
    gameOverScore,
    gameOverBest,
    gameOverCombo,
  };
}

export function updateUI(refs: UIRefs, state: UIState): void {
  refs.scoreValue.textContent = String(state.score);
  refs.comboValue.textContent = `x${state.combo}`;
  refs.songValue.textContent = state.songLabel;
  refs.muteButton.textContent = state.muted ? "Sound" : "Mute";

  refs.livesValue.replaceChildren(...Array.from({ length: 4 }, (_, index) => pip(index < state.lives)));
  refs.preview.replaceChildren(...state.preview.map((entry) => previewItem(entry)));

  refs.startOverlay.style.visibility = state.screen === "start" ? "visible" : "hidden";
  refs.gameOverOverlay.style.visibility = state.screen === "gameover" ? "visible" : "hidden";
  refs.gameOverScore.textContent = String(state.score);
  refs.gameOverBest.textContent = `Best ${state.bestScore}`;
  refs.gameOverCombo.textContent = `Combo ${state.bestCombo}`;
}

function label(text: string, left: number, top: number): HTMLDivElement {
  const element = document.createElement("div");
  element.textContent = text;
  element.style.position = "absolute";
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.fontSize = "18px";
  element.style.fontWeight = "700";
  element.style.letterSpacing = "0.08em";
  element.style.color = "#a7b9c9";
  element.style.textTransform = "uppercase";
  return element;
}

function value(text: string, left: number, top: number, align: "left" | "right"): HTMLDivElement {
  const element = document.createElement("div");
  element.textContent = text;
  element.style.position = "absolute";
  element.style.top = `${top}px`;
  if (align === "left") element.style.left = `${left}px`;
  else element.style.right = `${left}px`;
  element.style.fontSize = "clamp(34px, 8vw, 46px)";
  element.style.fontWeight = "800";
  element.style.letterSpacing = "-0.04em";
  return element;
}

function overlayPanel(title: string): HTMLDivElement {
  const panel = document.createElement("div");
  panel.style.position = "absolute";
  panel.style.left = "50%";
  panel.style.top = "34%";
  panel.style.transform = "translate(-50%, -34%)";
  panel.style.width = "min(72vw, 360px)";
  panel.style.padding = "22px";
  panel.style.borderRadius = "28px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.alignItems = "center";
  panel.style.gap = "12px";
  panel.style.background = "rgba(10, 16, 24, 0.8)";
  panel.style.backdropFilter = "blur(16px)";
  panel.style.pointerEvents = "auto";
  if (title) {
    const heading = document.createElement("div");
    heading.textContent = title;
    heading.style.fontSize = "clamp(46px, 14vw, 64px)";
    heading.style.fontWeight = "800";
    heading.style.letterSpacing = "-0.05em";
    panel.appendChild(heading);
  }
  return panel;
}

function actionButton(text: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = text;
  button.style.border = "0";
  button.style.borderRadius = "26px";
  button.style.padding = "12px 28px";
  button.style.background = "linear-gradient(135deg, #fff1b8 0%, #ffc56a 100%)";
  button.style.color = "#17120d";
  button.style.font = "700 clamp(22px, 6vw, 28px) \"Avenir Next\", sans-serif";
  button.style.pointerEvents = "auto";
  button.style.boxShadow = "0 8px 30px rgba(255, 197, 106, 0.3)";
  return button;
}

function chipButton(text: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = text;
  button.style.border = "1px solid rgba(255,255,255,0.12)";
  button.style.borderRadius = "999px";
  button.style.padding = "10px 18px";
  button.style.background = "rgba(10, 16, 24, 0.58)";
  button.style.color = "#f7fbff";
  button.style.font = "600 16px \"Avenir Next\", sans-serif";
  return button;
}

function overlayValue(text: string): HTMLDivElement {
  const element = document.createElement("div");
  element.textContent = text;
  element.style.fontSize = "clamp(62px, 16vw, 82px)";
  element.style.fontWeight = "800";
  element.style.letterSpacing = "-0.06em";
  return element;
}

function overlayMeta(text: string): HTMLDivElement {
  const element = document.createElement("div");
  element.textContent = text;
  element.style.fontSize = "clamp(20px, 5vw, 28px)";
  element.style.fontWeight = "700";
  element.style.color = "#a7b9c9";
  return element;
}

function pip(active: boolean): HTMLDivElement {
  const element = document.createElement("div");
  element.style.width = "16px";
  element.style.height = "16px";
  element.style.borderRadius = "50%";
  element.style.background = active ? "#fff0b5" : "#18222f";
  return element;
}

function previewItem(entry: PreviewCluster): HTMLDivElement {
  const item = document.createElement("div");
  item.style.width = "40px";
  item.style.height = "40px";
  item.style.borderRadius = "14px";
  item.style.background = "rgba(10, 16, 24, 0.72)";
  item.style.display = "flex";
  item.style.alignItems = "center";
  item.style.justifyContent = "center";
  item.style.gap = "4px";
  if (entry.kind === "hold") {
    const bar = laneBar("#ffd780");
    bar.style.height = "28px";
    item.appendChild(bar);
  } else {
    entry.lanes.forEach((_, index) => {
      item.appendChild(laneBar(index === 0 ? "#63e6ff" : "#ff88a5"));
    });
  }
  return item;
}

function laneBar(color: string): HTMLDivElement {
  const element = document.createElement("div");
  element.style.width = "10px";
  element.style.height = "20px";
  element.style.borderRadius = "999px";
  element.style.background = color;
  return element;
}
