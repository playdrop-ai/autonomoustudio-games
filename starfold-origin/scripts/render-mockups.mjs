import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("../mockups/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const boardRows = [
  ["sun", "wave", "leaf", "ember", "moon"],
  ["leaf", "sun", "moon", "wave", "ember"],
  ["ember", "ash", "sun", "leaf", "wave"],
  ["moon", "wave", "ember", "sun", "leaf"],
  ["leaf", "ember", "ash", "moon", "sun"],
  ["wave", "sun", "leaf", "ember", "moon"],
];

const sigils = {
  sun: { fill: "#f7b64d", glow: "#ffe6a7", icon: sunIcon() },
  moon: { fill: "#8b8dff", glow: "#d3d5ff", icon: moonIcon() },
  wave: { fill: "#3fc7e9", glow: "#b6f3ff", icon: waveIcon() },
  leaf: { fill: "#58d388", glow: "#c6ffd7", icon: leafIcon() },
  ember: { fill: "#ff6c66", glow: "#ffc0ab", icon: emberIcon() },
  ash: { fill: "#40384a", glow: "#7b5f63", icon: ashIcon() },
};

const portrait = {
  width: 720,
  height: 1280,
  boardX: 60,
  boardY: 250,
  cell: 108,
  gap: 12,
};

const desktop = {
  width: 1600,
  height: 900,
  boardX: 560,
  boardY: 130,
  cell: 86,
  gap: 10,
};

const files = [
  {
    name: "portrait-start.svg",
    svg: renderPortraitStart(),
  },
  {
    name: "portrait-gameplay.svg",
    svg: renderPortraitGameplay(),
  },
  {
    name: "portrait-gameover.svg",
    svg: renderPortraitGameOver(),
  },
  {
    name: "desktop-start.svg",
    svg: renderDesktopStart(),
  },
  {
    name: "desktop-gameplay.svg",
    svg: renderDesktopGameplay(),
  },
  {
    name: "desktop-gameover.svg",
    svg: renderDesktopGameOver(),
  },
];

for (const file of files) {
  writeFileSync(join(outDir.pathname, file.name), file.svg);
}

function renderPortraitStart() {
  const ui = `
    <text x="64" y="108" class="eyebrow">CONSTELLATION SWIPE</text>
    <text x="60" y="168" class="title">Starfold</text>
    <text x="60" y="206" class="subtitle">Swipe the shrine. Trigger chains. Keep the ash back.</text>
    <g transform="translate(206 1080)">
      <rect width="308" height="92" rx="26" fill="#f0c875"/>
      <rect x="6" y="6" width="296" height="80" rx="22" fill="url(#buttonFill)" opacity="0.95"/>
      <text x="154" y="57" text-anchor="middle" class="buttonLabel">Begin</text>
    </g>
  `;
  return wrapSvg(portrait.width, portrait.height, boardShell(portrait, boardRows) + ui);
}

function renderPortraitGameplay() {
  const ui = `
    <text x="64" y="108" class="hudLabel">SCORE</text>
    <text x="64" y="152" class="hudValue">12,840</text>
    <text x="656" y="108" text-anchor="end" class="hudLabel">ASH</text>
    <text x="656" y="152" text-anchor="end" class="hudValue">6 / 10</text>
    <g transform="translate(402 196)">
      <text x="0" y="0" text-anchor="middle" class="combo">STAR CHAIN</text>
    </g>
  `;
  return wrapSvg(portrait.width, portrait.height, boardShell(portrait, boardRows, { highlightRow: 2 }) + ui);
}

function renderPortraitGameOver() {
  const ui = `
    <g transform="translate(88 140)">
      <rect width="544" height="1000" rx="40" fill="#0f0b1f" opacity="0.72"/>
      <rect x="22" y="22" width="500" height="956" rx="32" fill="#16102d" opacity="0.92"/>
      <text x="272" y="168" text-anchor="middle" class="panelTitle">Ash Took The Shrine</text>
      <text x="272" y="226" text-anchor="middle" class="panelCopy">One more line could have saved it.</text>
      <text x="272" y="382" text-anchor="middle" class="panelLabel">RUN SCORE</text>
      <text x="272" y="462" text-anchor="middle" class="panelValue">18,420</text>
      <text x="272" y="584" text-anchor="middle" class="panelLabel">BEST</text>
      <text x="272" y="648" text-anchor="middle" class="panelMiniValue">22,180</text>
      <g transform="translate(116 760)">
        <rect width="312" height="92" rx="26" fill="#f0c875"/>
        <rect x="6" y="6" width="300" height="80" rx="22" fill="url(#buttonFill)" opacity="0.95"/>
        <text x="156" y="57" text-anchor="middle" class="buttonLabel">Fold Again</text>
      </g>
    </g>
  `;
  return wrapSvg(portrait.width, portrait.height, boardShell(portrait, boardRows, { dimBoard: true }) + ui);
}

function renderDesktopStart() {
  const ui = `
    <text x="132" y="156" class="eyebrow">PORTRAIT-FIRST PUZZLE</text>
    <text x="128" y="230" class="title">Starfold</text>
    <text x="128" y="280" class="subtitle">Swipe whole rows and columns to trigger glowing chain reactions.</text>
    <text x="128" y="314" class="subtitle">Every fourth move births new ash. Clear beside it before the shrine fills.</text>
    <g transform="translate(128 584)">
      <rect width="268" height="84" rx="24" fill="#f0c875"/>
      <rect x="6" y="6" width="256" height="72" rx="20" fill="url(#buttonFill)" opacity="0.95"/>
      <text x="134" y="52" text-anchor="middle" class="buttonLabel">Begin</text>
    </g>
  `;
  return wrapSvg(desktop.width, desktop.height, boardShell(desktop, boardRows) + ui);
}

function renderDesktopGameplay() {
  const ui = `
    <text x="132" y="156" class="hudLabel">SCORE</text>
    <text x="132" y="204" class="hudValue">12,840</text>
    <text x="1468" y="156" text-anchor="end" class="hudLabel">ASH</text>
    <text x="1468" y="204" text-anchor="end" class="hudValue">6 / 10</text>
    <text x="800" y="88" text-anchor="middle" class="desktopTitle">Starfold</text>
  `;
  return wrapSvg(desktop.width, desktop.height, boardShell(desktop, boardRows, { highlightCol: 3 }) + ui);
}

function renderDesktopGameOver() {
  const ui = `
    <g transform="translate(368 120)">
      <rect width="864" height="660" rx="40" fill="#0f0b1f" opacity="0.72"/>
      <rect x="18" y="18" width="828" height="624" rx="32" fill="#16102d" opacity="0.94"/>
      <text x="432" y="144" text-anchor="middle" class="panelTitle">Ash Took The Shrine</text>
      <text x="432" y="194" text-anchor="middle" class="panelCopy">The best runs stay calm until the last four moves.</text>
      <text x="270" y="356" text-anchor="middle" class="panelLabel">RUN SCORE</text>
      <text x="270" y="432" text-anchor="middle" class="panelValue">18,420</text>
      <text x="594" y="356" text-anchor="middle" class="panelLabel">BEST</text>
      <text x="594" y="432" text-anchor="middle" class="panelValue">22,180</text>
      <g transform="translate(298 500)">
        <rect width="268" height="84" rx="24" fill="#f0c875"/>
        <rect x="6" y="6" width="256" height="72" rx="20" fill="url(#buttonFill)" opacity="0.95"/>
        <text x="134" y="52" text-anchor="middle" class="buttonLabel">Fold Again</text>
      </g>
    </g>
  `;
  return wrapSvg(desktop.width, desktop.height, boardShell(desktop, boardRows, { dimBoard: true }) + ui);
}

function boardShell(layout, rows, options = {}) {
  const boardWidth = layout.cell * 5 + layout.gap * 4;
  const boardHeight = layout.cell * 6 + layout.gap * 5;
  const board = boardGrid(layout, rows, options);
  return `
    ${background(layout.width, layout.height)}
    <g filter="url(#boardGlow)">
      <rect x="${layout.boardX - 18}" y="${layout.boardY - 18}" width="${boardWidth + 36}" height="${boardHeight + 36}" rx="42" fill="#1e1537" opacity="0.65"/>
    </g>
    <rect x="${layout.boardX - 10}" y="${layout.boardY - 10}" width="${boardWidth + 20}" height="${boardHeight + 20}" rx="36" fill="url(#boardFrame)"/>
    <rect x="${layout.boardX}" y="${layout.boardY}" width="${boardWidth}" height="${boardHeight}" rx="30" fill="url(#boardFill)"/>
    ${board}
  `;
}

function boardGrid(layout, rows, options) {
  const groups = [];
  for (let row = 0; row < rows.length; row += 1) {
    for (let col = 0; col < rows[row].length; col += 1) {
      const value = rows[row][col];
      const x = layout.boardX + col * (layout.cell + layout.gap);
      const y = layout.boardY + row * (layout.cell + layout.gap);
      const isHighlightRow = options.highlightRow === row;
      const isHighlightCol = options.highlightCol === col;
      groups.push(drawToken(value, x, y, layout.cell, {
        pulse: isHighlightRow || isHighlightCol,
        dim: options.dimBoard,
      }));
    }
  }
  return groups.join("\n");
}

function drawToken(name, x, y, size, options) {
  const token = sigils[name];
  const shadowOpacity = options.dim ? 0.24 : 0.46;
  const faceOpacity = options.dim ? 0.4 : 1;
  const pulse = options.pulse
    ? `<rect x="${x - 8}" y="${y - 8}" width="${size + 16}" height="${size + 16}" rx="${size * 0.24}" fill="none" stroke="${token.glow}" stroke-width="6" opacity="0.42"/>`
    : "";
  const iconSize = size * 0.46;
  const iconX = x + size / 2 - iconSize / 2;
  const iconY = y + size / 2 - iconSize / 2;
  return `
    ${pulse}
    <rect x="${x}" y="${y + 8}" width="${size}" height="${size}" rx="${size * 0.22}" fill="#05040b" opacity="${shadowOpacity}"/>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.22}" fill="#1f1a33" opacity="${faceOpacity}"/>
    <rect x="${x + 4}" y="${y + 4}" width="${size - 8}" height="${size - 8}" rx="${size * 0.2}" fill="${token.fill}" opacity="${options.dim ? 0.5 : 0.98}"/>
    <rect x="${x + 10}" y="${y + 10}" width="${size - 20}" height="${size - 20}" rx="${size * 0.18}" fill="url(#tokenShade)" opacity="${options.dim ? 0.25 : 0.42}"/>
    <g transform="translate(${iconX} ${iconY}) scale(${iconSize / 100})" opacity="${options.dim ? 0.46 : 0.98}">
      ${token.icon}
    </g>
  `;
}

function background(width, height) {
  return `
    <rect width="${width}" height="${height}" fill="url(#night)"/>
    <circle cx="${width * 0.14}" cy="${height * 0.18}" r="${width * 0.14}" fill="#3a2d7d" opacity="0.36"/>
    <circle cx="${width * 0.86}" cy="${height * 0.22}" r="${width * 0.18}" fill="#6b2b47" opacity="0.22"/>
    <circle cx="${width * 0.68}" cy="${height * 0.8}" r="${width * 0.3}" fill="#1b4f6b" opacity="0.18"/>
    ${sparkles(width, height)}
  `;
}

function sparkles(width, height) {
  const points = [
    [0.12, 0.1],
    [0.24, 0.32],
    [0.78, 0.12],
    [0.9, 0.3],
    [0.7, 0.64],
    [0.18, 0.72],
    [0.42, 0.84],
    [0.85, 0.88],
  ];
  return points
    .map(
      ([x, y]) =>
        `<circle cx="${width * x}" cy="${height * y}" r="2.4" fill="#f7dfb8" opacity="0.75"/><circle cx="${width * x}" cy="${height * y}" r="8" fill="#f7dfb8" opacity="0.08"/>`,
    )
    .join("\n");
}

function wrapSvg(width, height, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c0a16"/>
      <stop offset="58%" stop-color="#140f27"/>
      <stop offset="100%" stop-color="#1f1324"/>
    </linearGradient>
    <linearGradient id="boardFrame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0c875"/>
      <stop offset="100%" stop-color="#7d5b2a"/>
    </linearGradient>
    <linearGradient id="boardFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#261d44"/>
      <stop offset="100%" stop-color="#120e24"/>
    </linearGradient>
    <linearGradient id="buttonFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff3cb"/>
      <stop offset="100%" stop-color="#f4b353"/>
    </linearGradient>
    <linearGradient id="tokenShade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#120e24"/>
    </linearGradient>
    <filter id="boardGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <style>
      text {
        font-family: "Avenir Next", "Trebuchet MS", sans-serif;
      }
      .eyebrow {
        fill: #f0c875;
        font-size: 19px;
        font-weight: 700;
        letter-spacing: 0.32em;
      }
      .title {
        fill: #fff6de;
        font-size: 64px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .desktopTitle {
        fill: #fff6de;
        font-size: 34px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      .subtitle {
        fill: #dddae8;
        font-size: 24px;
        font-weight: 500;
      }
      .hudLabel {
        fill: #f0c875;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.18em;
      }
      .hudValue {
        fill: #fff6de;
        font-size: 38px;
        font-weight: 800;
      }
      .combo {
        fill: #ffe7a6;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 0.22em;
      }
      .buttonLabel {
        fill: #1a1324;
        font-size: 32px;
        font-weight: 800;
      }
      .panelTitle {
        fill: #fff6de;
        font-size: 50px;
        font-weight: 800;
      }
      .panelCopy {
        fill: #d6d3e0;
        font-size: 24px;
        font-weight: 500;
      }
      .panelLabel {
        fill: #f0c875;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.18em;
      }
      .panelValue {
        fill: #fff6de;
        font-size: 66px;
        font-weight: 800;
      }
      .panelMiniValue {
        fill: #fff6de;
        font-size: 48px;
        font-weight: 800;
      }
    </style>
  </defs>
  ${body}
</svg>
`;
}

function sunIcon() {
  return `
    <circle cx="50" cy="50" r="18" fill="#fff8df"/>
    <g stroke="#fff8df" stroke-width="8" stroke-linecap="round">
      <path d="M50 6v18"/>
      <path d="M50 76v18"/>
      <path d="M6 50h18"/>
      <path d="M76 50h18"/>
      <path d="M20 20l13 13"/>
      <path d="M67 67l13 13"/>
      <path d="M20 80l13-13"/>
      <path d="M67 33l13-13"/>
    </g>
  `;
}

function moonIcon() {
  return `
    <path d="M67 18c-6 2-18 9-18 28 0 17 12 24 18 26-7 9-17 14-30 14-23 0-41-18-41-40S14 6 37 6c14 0 24 4 30 12z" fill="#f4f2ff"/>
    <circle cx="54" cy="43" r="15" fill="#8b8dff"/>
  `;
}

function waveIcon() {
  return `
    <path d="M6 38c12-10 21-10 33 0s21 10 33 0 21-10 22-10" stroke="#ecfdff" stroke-width="8" stroke-linecap="round"/>
    <path d="M6 62c12-10 21-10 33 0s21 10 33 0 21-10 22-10" stroke="#ecfdff" stroke-width="8" stroke-linecap="round"/>
  `;
}

function leafIcon() {
  return `
    <path d="M18 58c0-22 18-40 40-40 10 0 19 4 26 10-1 30-24 54-54 54-7-7-12-15-12-24z" fill="#effff4"/>
    <path d="M26 72c18-20 29-31 48-48" stroke="#58d388" stroke-width="7" stroke-linecap="round"/>
  `;
}

function emberIcon() {
  return `
    <path d="M50 8c9 12 22 22 22 38 0 13-10 26-22 40-12-14-22-27-22-40 0-16 13-26 22-38z" fill="#fff2d9"/>
    <path d="M50 26c6 8 14 15 14 25 0 8-6 15-14 24-8-9-14-16-14-24 0-10 8-17 14-25z" fill="#ff8462"/>
  `;
}

function ashIcon() {
  return `
    <path d="M16 28 38 14l28 10 18 24-12 30-32 8-20-18-4-24z" fill="#6b5a68"/>
    <path d="M28 30 54 42 38 76" stroke="#ff9f66" stroke-width="7" stroke-linecap="round"/>
    <path d="M54 42 74 60" stroke="#ff9f66" stroke-width="6" stroke-linecap="round"/>
  `;
}
