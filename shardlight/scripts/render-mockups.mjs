import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("../mockups/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const portrait = {
  name: "portrait",
  width: 720,
  height: 1280,
  boardX: 52,
  boardY: 184,
  boardW: 616,
  boardH: 780,
  overlayW: 568,
  overlayH: 252,
  overlayY: 980,
  titleY: 116,
};

const desktop = {
  name: "desktop",
  width: 1600,
  height: 900,
  boardX: 500,
  boardY: 70,
  boardW: 600,
  boardH: 760,
  overlayW: 520,
  overlayH: 220,
  overlayY: 646,
  titleY: 88,
};

const startBoard = [
  "cccccccc",
  "cce1cccc",
  "cee12ccc",
  "e112cccc",
  "cccccccc",
  "cccccccc",
  "cccccccc",
  "cccccccc",
  "cccccccc",
  "cccccccc",
];

const gameplayBoard = [
  "ee12fccc",
  "ee122ccc",
  "e1122ccc",
  "12f11ccc",
  "c2211ccc",
  "cc1f111c",
  "cc111eec",
  "ccc11eec",
  "cccc111c",
  "cccccf1c",
];

const gameoverBoard = [
  "ee12fccc",
  "ee122ccc",
  "e1122ccc",
  "12f11ccc",
  "c2211ccc",
  "cc1f111c",
  "cc11122c",
  "ccc12x2c",
  "cccc222c",
  "cccccf1c",
];

const files = [
  { name: "portrait-start.svg", svg: renderScreen(portrait, "start") },
  { name: "portrait-gameplay.svg", svg: renderScreen(portrait, "gameplay") },
  { name: "portrait-gameover.svg", svg: renderScreen(portrait, "gameover") },
  { name: "desktop-start.svg", svg: renderScreen(desktop, "start") },
  { name: "desktop-gameplay.svg", svg: renderScreen(desktop, "gameplay") },
  { name: "desktop-gameover.svg", svg: renderScreen(desktop, "gameover") },
];

for (const file of files) {
  writeFileSync(join(outDir.pathname, file.name), file.svg);
}

function renderScreen(layout, screen) {
  const boardState =
    screen === "start" ? startBoard : screen === "gameplay" ? gameplayBoard : gameoverBoard;
  const hud =
    screen === "start"
      ? { score: "0", chamber: "1" }
      : screen === "gameplay"
        ? { score: "3840", chamber: "7" }
        : { score: "6180", chamber: "9" };
  const overlay = screen === "start" ? startOverlay(layout) : screen === "gameover" ? gameoverOverlay(layout) : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" fill="none">
  <defs>
    <linearGradient id="bgFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#16171c"/>
      <stop offset="52%" stop-color="#241f1b"/>
      <stop offset="100%" stop-color="#4f3a28"/>
    </linearGradient>
    <linearGradient id="boardShell" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5a4736"/>
      <stop offset="100%" stop-color="#251a12"/>
    </linearGradient>
    <linearGradient id="boardFace" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c49a62"/>
      <stop offset="100%" stop-color="#6f4a2b"/>
    </linearGradient>
    <linearGradient id="coveredTile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d6b27f"/>
      <stop offset="100%" stop-color="#8c623b"/>
    </linearGradient>
    <linearGradient id="revealedTile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e8d7b7"/>
      <stop offset="100%" stop-color="#b48a59"/>
    </linearGradient>
    <linearGradient id="buttonFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffd88a"/>
      <stop offset="100%" stop-color="#ffad43"/>
    </linearGradient>
    <filter id="amberGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${layout.name === "portrait" ? 10 : 8}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      text { font-family: "Avenir Next", "Nunito Sans", "Trebuchet MS", sans-serif; }
      .title { font-size: ${layout.name === "portrait" ? 58 : 52}px; font-weight: 700; fill: #fff2d5; }
      .subtitle { font-size: ${layout.name === "portrait" ? 24 : 20}px; fill: rgba(255, 242, 213, 0.8); }
      .hudLabel { font-size: ${layout.name === "portrait" ? 12 : 11}px; letter-spacing: 0.24em; fill: rgba(255, 235, 199, 0.62); }
      .hudValue { font-size: ${layout.name === "portrait" ? 30 : 27}px; font-weight: 700; fill: #fff2d5; }
      .panelTitle { font-size: ${layout.name === "portrait" ? 44 : 36}px; font-weight: 700; fill: #fff2d5; }
      .panelCopy { font-size: ${layout.name === "portrait" ? 22 : 18}px; fill: rgba(255, 242, 213, 0.82); }
      .panelLabel { font-size: ${layout.name === "portrait" ? 14 : 12}px; letter-spacing: 0.2em; fill: rgba(255, 235, 199, 0.58); }
      .panelValue { font-size: ${layout.name === "portrait" ? 48 : 42}px; font-weight: 700; fill: #fff2d5; }
      .buttonLabel { font-size: ${layout.name === "portrait" ? 28 : 24}px; font-weight: 700; fill: #492b14; }
      .digit { font-size: ${layout.name === "portrait" ? 28 : 26}px; font-weight: 700; dominant-baseline: middle; text-anchor: middle; }
      .tiny { font-size: ${layout.name === "portrait" ? 13 : 12}px; font-weight: 700; letter-spacing: 0.2em; fill: rgba(255, 237, 206, 0.72); }
    </style>
  </defs>
  ${background(layout, screen === "start")}
  ${boardShell(layout)}
  ${hudRail(layout, hud)}
  ${boardMural(layout)}
  ${boardTiles(layout, boardState)}
  ${screen === "gameplay" ? gameplayHighlights(layout) : ""}
  ${overlay}
</svg>`;
}

function background(layout, showTitle) {
  return `
  <rect width="${layout.width}" height="${layout.height}" fill="url(#bgFill)"/>
  <circle cx="${layout.width * 0.18}" cy="${layout.height * 0.18}" r="${layout.width * 0.22}" fill="#f7b45a" opacity="0.12"/>
  <circle cx="${layout.width * 0.82}" cy="${layout.height * 0.24}" r="${layout.width * 0.19}" fill="#ab6b3c" opacity="0.14"/>
  <circle cx="${layout.width * 0.62}" cy="${layout.height * 0.84}" r="${layout.width * 0.34}" fill="#3d2414" opacity="0.38"/>
  <path d="M 0 ${layout.height * 0.82} C ${layout.width * 0.18} ${layout.height * 0.76}, ${layout.width * 0.38} ${layout.height * 0.88}, ${layout.width * 0.58} ${layout.height * 0.8} C ${layout.width * 0.74} ${layout.height * 0.74}, ${layout.width * 0.88} ${layout.height * 0.9}, ${layout.width} ${layout.height * 0.84} L ${layout.width} ${layout.height} L 0 ${layout.height} Z" fill="#140f0c" opacity="0.72"/>
  ${dust(layout)}
  ${showTitle ? `<text x="${layout.width / 2}" y="${layout.titleY}" class="title" text-anchor="middle">Shardlight</text>` : ""}
  `;
}

function dust(layout) {
  const points = [
    [0.11, 0.16],
    [0.22, 0.27],
    [0.34, 0.14],
    [0.69, 0.18],
    [0.82, 0.33],
    [0.58, 0.48],
    [0.15, 0.71],
    [0.87, 0.78],
  ];
  return points
    .map(
      ([x, y]) => `
    <circle cx="${layout.width * x}" cy="${layout.height * y}" r="${layout.name === "portrait" ? 3 : 2.4}" fill="#ffefc9" opacity="0.7"/>
    <circle cx="${layout.width * x}" cy="${layout.height * y}" r="${layout.name === "portrait" ? 10 : 8}" fill="#ffefc9" opacity="0.06"/>`,
    )
    .join("");
}

function boardShell(layout) {
  return `
  <g>
    <rect x="${layout.boardX - 12}" y="${layout.boardY - 14}" width="${layout.boardW + 24}" height="${layout.boardH + 28}" rx="34" fill="url(#boardShell)"/>
    <rect x="${layout.boardX}" y="${layout.boardY}" width="${layout.boardW}" height="${layout.boardH}" rx="28" fill="url(#boardFace)"/>
    <rect x="${layout.boardX + 18}" y="${layout.boardY + 98}" width="${layout.boardW - 36}" height="${layout.boardH - 128}" rx="24" fill="#6d4a2e" opacity="0.64"/>
    <rect x="${layout.boardX + 22}" y="${layout.boardY + 102}" width="${layout.boardW - 44}" height="${layout.boardH - 136}" rx="20" fill="#8a6036" opacity="0.62"/>
  </g>
  `;
}

function hudRail(layout, hud) {
  const left = layout.boardX + 30;
  const right = layout.boardX + layout.boardW - 30;
  const y = layout.boardY + 34;
  return `
  <g>
    <text x="${left}" y="${y}" class="hudLabel">SCORE</text>
    <text x="${left}" y="${y + 36}" class="hudValue">${hud.score}</text>
    <text x="${right}" y="${y}" class="hudLabel" text-anchor="end">CHAMBER</text>
    <text x="${right}" y="${y + 36}" class="hudValue" text-anchor="end">${hud.chamber}</text>
  </g>
  `;
}

function boardMural(layout) {
  const x = layout.boardX + 40;
  const y = layout.boardY + 132;
  const w = layout.boardW - 80;
  const h = layout.boardH - 176;
  return `
  <g filter="url(#amberGlow)" opacity="0.42">
    <circle cx="${x + w * 0.22}" cy="${y + h * 0.28}" r="${w * 0.13}" fill="#ffb347" opacity="0.24"/>
    <circle cx="${x + w * 0.66}" cy="${y + h * 0.58}" r="${w * 0.18}" fill="#ffd67c" opacity="0.22"/>
    <path d="M ${x + w * 0.12} ${y + h * 0.64} C ${x + w * 0.24} ${y + h * 0.44}, ${x + w * 0.42} ${y + h * 0.4}, ${x + w * 0.52} ${y + h * 0.24} C ${x + w * 0.62} ${y + h * 0.08}, ${x + w * 0.84} ${y + h * 0.1}, ${x + w * 0.9} ${y + h * 0.28}" stroke="#ffdd87" stroke-width="${layout.name === "portrait" ? 22 : 18}" stroke-linecap="round" opacity="0.26"/>
    <path d="M ${x + w * 0.2} ${y + h * 0.86} C ${x + w * 0.34} ${y + h * 0.74}, ${x + w * 0.48} ${y + h * 0.72}, ${x + w * 0.62} ${y + h * 0.82}" stroke="#ffb347" stroke-width="${layout.name === "portrait" ? 18 : 14}" stroke-linecap="round" opacity="0.24"/>
    <polygon points="${x + w * 0.76},${y + h * 0.34} ${x + w * 0.8},${y + h * 0.44} ${x + w * 0.72},${y + h * 0.52} ${x + w * 0.66},${y + h * 0.42}" fill="#ffe49c" opacity="0.4"/>
  </g>
  `;
}

function boardTiles(layout, boardState) {
  const cols = 8;
  const rows = 10;
  const gap = 6;
  const boardInnerX = layout.boardX + 36;
  const boardInnerY = layout.boardY + 116;
  const tileW = (layout.boardW - 72 - gap * (cols - 1)) / cols;
  const tileH = (layout.boardH - 156 - gap * (rows - 1)) / rows;
  let out = "";
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = boardState[row][col];
      const x = boardInnerX + col * (tileW + gap);
      const y = boardInnerY + row * (tileH + gap);
      if (cell === "c" || cell === "f" || cell === "x") {
        out += coveredCell(x, y, tileW, tileH, cell);
      } else {
        out += revealedCell(x, y, tileW, tileH, cell);
      }
    }
  }
  return `<g>${out}</g>`;
}

function coveredCell(x, y, w, h, cell) {
  const flag =
    cell === "f"
      ? `
      <polygon points="${x + w * 0.5},${y + h * 0.18} ${x + w * 0.68},${y + h * 0.42} ${x + w * 0.5},${y + h * 0.7} ${x + w * 0.32},${y + h * 0.42}" fill="#151110"/>
      <polygon points="${x + w * 0.49},${y + h * 0.26} ${x + w * 0.6},${y + h * 0.42} ${x + w * 0.49},${y + h * 0.58} ${x + w * 0.38},${y + h * 0.42}" fill="#ffb347"/>
      `
      : "";
  const burst =
    cell === "x"
      ? `
      <circle cx="${x + w * 0.5}" cy="${y + h * 0.5}" r="${w * 0.2}" fill="#ff6b3d" opacity="0.9"/>
      <path d="M ${x + w * 0.24} ${y + h * 0.28} L ${x + w * 0.76} ${y + h * 0.72}" stroke="#3f1307" stroke-width="4" stroke-linecap="round"/>
      <path d="M ${x + w * 0.76} ${y + h * 0.28} L ${x + w * 0.24} ${y + h * 0.72}" stroke="#3f1307" stroke-width="4" stroke-linecap="round"/>
      `
      : "";
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="url(#coveredTile)"/>
      <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="12" fill="#d9b98b" opacity="0.16"/>
      <path d="M ${x + w * 0.18} ${y + h * 0.28} C ${x + w * 0.42} ${y + h * 0.12}, ${x + w * 0.68} ${y + h * 0.12}, ${x + w * 0.84} ${y + h * 0.28}" stroke="#fff1c9" stroke-width="4" opacity="0.24" stroke-linecap="round"/>
      ${flag}
      ${burst}
    </g>
  `;
}

function revealedCell(x, y, w, h, cell) {
  const digit = cell === "e" ? "" : `<text x="${x + w / 2}" y="${y + h / 2 + 1}" class="digit" fill="${digitColor(cell)}">${cell}</text>`;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="url(#revealedTile)" opacity="0.5"/>
      <rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h - 3}" rx="12" fill="#e8d8b6" opacity="0.16"/>
      ${digit}
    </g>
  `;
}

function digitColor(digit) {
  return (
    {
      "1": "#5ec8ff",
      "2": "#6be18c",
      "3": "#ffbe59",
      "4": "#ff7460",
    }[digit] || "#fff2d5"
  );
}

function gameplayHighlights(layout) {
  const points = [
    [0.24, 0.33],
    [0.7, 0.47],
    [0.58, 0.76],
  ];
  return points
    .map(([x, y]) => {
      const cx = layout.boardX + 36 + (layout.boardW - 72) * x;
      const cy = layout.boardY + 116 + (layout.boardH - 156) * y;
      return `
      <circle cx="${cx}" cy="${cy}" r="${layout.name === "portrait" ? 10 : 8}" fill="#ffd67c" opacity="0.9"/>
      <circle cx="${cx}" cy="${cy}" r="${layout.name === "portrait" ? 24 : 20}" fill="#ffd67c" opacity="0.16"/>
      `;
    })
    .join("");
}

function startOverlay(layout) {
  const x = (layout.width - layout.overlayW) / 2;
  return `
  <g transform="translate(${x} ${layout.overlayY})">
    <rect width="${layout.overlayW}" height="${layout.overlayH}" rx="34" fill="#140f0c" opacity="0.74"/>
    <rect x="12" y="12" width="${layout.overlayW - 24}" height="${layout.overlayH - 24}" rx="28" fill="#2f2219" opacity="0.96"/>
    <text x="${layout.overlayW / 2}" y="74" class="panelTitle" text-anchor="middle">Clear the chamber.</text>
    <text x="${layout.overlayW / 2}" y="112" class="panelCopy" text-anchor="middle">Keep the dig alive.</text>
    <g transform="translate(${(layout.overlayW - 196) / 2} ${layout.overlayH - 92})">
      <rect width="196" height="64" rx="26" fill="url(#buttonFill)"/>
      <text x="98" y="40" class="buttonLabel" text-anchor="middle">Play</text>
    </g>
  </g>
  `;
}

function gameoverOverlay(layout) {
  const x = (layout.width - layout.overlayW) / 2;
  return `
  <g transform="translate(${x} ${layout.overlayY})">
    <rect width="${layout.overlayW}" height="${layout.overlayH}" rx="34" fill="#120d0b" opacity="0.82"/>
    <rect x="12" y="12" width="${layout.overlayW - 24}" height="${layout.overlayH - 24}" rx="28" fill="#2d1c16" opacity="0.98"/>
    <text x="${layout.overlayW / 2}" y="48" class="panelLabel" text-anchor="middle">FINAL SCORE</text>
    <text x="${layout.overlayW / 2}" y="102" class="panelValue" text-anchor="middle">6180</text>
    <text x="${layout.overlayW / 2}" y="138" class="panelCopy" text-anchor="middle">Deepest chamber 9</text>
    <g transform="translate(${(layout.overlayW - 196) / 2} ${layout.overlayH - 88})">
      <rect width="196" height="64" rx="26" fill="url(#buttonFill)"/>
      <text x="98" y="40" class="buttonLabel" text-anchor="middle">Retry</text>
    </g>
  </g>
  `;
}
