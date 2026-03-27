import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("../mockups/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const portrait = {
  width: 720,
  height: 1280,
  nearY: 1140,
  farY: 226,
  nearWidth: 640,
  farWidth: 164,
  left: 40,
  topHudY: 88,
  titleY: 150,
  strikeY: 1010,
  overlayW: 520,
  overlayH: 700,
  overlayY: 246,
};

const desktop = {
  width: 1600,
  height: 900,
  nearY: 818,
  farY: 162,
  nearWidth: 760,
  farWidth: 220,
  left: 420,
  topHudY: 72,
  titleY: 96,
  strikeY: 716,
  overlayW: 640,
  overlayH: 468,
  overlayY: 206,
};

const previewSequence = [
  { lanes: [0], type: "tap" },
  { lanes: [1, 2], type: "chord" },
  { lanes: [3], type: "hold" },
];

const gameplayNotes = [
  { lane: 0, depth: 0.18, type: "tap", glow: "#5be7ff" },
  { lane: 2, depth: 0.28, type: "tap", glow: "#ff7e9f" },
  { lane: 3, depth: 0.38, type: "hold", glow: "#ffd97f", tail: 0.64 },
  { lane: 1, depth: 0.47, type: "tap", glow: "#5be7ff" },
  { lane: 0, depth: 0.58, type: "tap", glow: "#ff7e9f" },
  { lane: 1, depth: 0.63, type: "tap", glow: "#ffd97f" },
  { lanes: [2, 3], depth: 0.71, type: "chord", glow: "#5be7ff" },
  { lane: 2, depth: 0.84, type: "tap", glow: "#ff7e9f" },
];

const introNotes = [
  { lane: 1, depth: 0.3, type: "tap", glow: "#5be7ff" },
  { lane: 2, depth: 0.52, type: "hold", glow: "#ffd97f", tail: 0.72 },
  { lanes: [0, 3], depth: 0.76, type: "chord", glow: "#ff7e9f" },
];

const endNotes = [
  { lane: 0, depth: 0.24, type: "tap", glow: "#ff7e9f" },
  { lane: 1, depth: 0.42, type: "hold", glow: "#ffd97f", tail: 0.61 },
  { lanes: [2, 3], depth: 0.72, type: "chord", glow: "#5be7ff" },
];

const files = [
  { name: "portrait-start.svg", svg: renderStart(portrait) },
  { name: "portrait-gameplay.svg", svg: renderGameplay(portrait) },
  { name: "portrait-gameover.svg", svg: renderGameOver(portrait) },
  { name: "desktop-start.svg", svg: renderStart(desktop) },
  { name: "desktop-gameplay.svg", svg: renderGameplay(desktop) },
  { name: "desktop-gameover.svg", svg: renderGameOver(desktop) },
];

for (const file of files) {
  writeFileSync(join(outDir.pathname, file.name), file.svg);
}

function renderStart(layout) {
  return wrap(layout, `
    ${background(layout)}
    ${runway(layout, introNotes, { dim: false, songLabel: "SET 4", score: "0", combo: "x1", lives: 4 })}
    <text x="${layout.width / 2}" y="${layout.titleY}" class="title" text-anchor="middle">Keyfall</text>
    <g transform="translate(${(layout.width - 196) / 2} ${layout.height - 186})">
      <rect width="196" height="76" rx="30" fill="#101924" opacity="0.72"/>
      <rect x="4" y="4" width="188" height="68" rx="26" fill="url(#buttonFill)"/>
      <text x="98" y="46" class="button" text-anchor="middle">Play</text>
    </g>
  `);
}

function renderGameplay(layout) {
  return wrap(layout, `
    ${background(layout)}
    ${runway(layout, gameplayNotes, { dim: false, songLabel: "GLASS", score: "12840", combo: "x24", lives: 3 })}
  `);
}

function renderGameOver(layout) {
  return wrap(layout, `
    ${background(layout)}
    ${runway(layout, endNotes, { dim: true, songLabel: "RUSH", score: "18620", combo: "x31", lives: 0 })}
    <g transform="translate(${(layout.width - layout.overlayW) / 2} ${layout.overlayY})">
      <rect width="${layout.overlayW}" height="${layout.overlayH}" rx="38" fill="#0b1018" opacity="0.78"/>
      <rect x="16" y="16" width="${layout.overlayW - 32}" height="${layout.overlayH - 32}" rx="30" fill="#111b27" opacity="0.96"/>
      <text x="${layout.overlayW / 2}" y="122" class="panelValue" text-anchor="middle">18620</text>
      <text x="${layout.overlayW / 2}" y="178" class="panelLabel" text-anchor="middle">Best 22840</text>
      <text x="${layout.overlayW / 2}" y="230" class="panelLabel" text-anchor="middle">Combo 31</text>
      <g transform="translate(${(layout.overlayW - 196) / 2} ${layout.overlayH - 142})">
        <rect width="196" height="76" rx="30" fill="#101924" opacity="0.72"/>
        <rect x="4" y="4" width="188" height="68" rx="26" fill="url(#buttonFill)"/>
        <text x="98" y="46" class="button" text-anchor="middle">Retry</text>
      </g>
    </g>
  `);
}

function runway(layout, notes, hud) {
  const lanes = Array.from({ length: 4 }, (_, lane) => lanePolygon(layout, lane));
  const laneShapes = lanes
    .map(
      ({ points }, lane) => `
        <polygon points="${points}" fill="url(#laneFill)" opacity="${lane % 2 === 0 ? 0.94 : 0.82}"/>
      `,
    )
    .join("");
  const laneSeparators = Array.from({ length: 5 }, (_, boundary) => laneBoundary(layout, boundary)).join("");
  const phraseFrames = [0.2, 0.45, 0.7, 0.9].map((depth) => phraseGate(layout, depth)).join("");
  const strike = strikeLine(layout);
  const noteShapes = notes.map((note) => drawNote(layout, note)).join("");
  const preview = drawPreview(layout);
  const hudGroup = drawHud(layout, hud);
  return `
    <g>
      ${runwayAura(layout)}
      ${laneShapes}
      ${laneSeparators}
      ${phraseFrames}
      ${noteShapes}
      ${strike}
      ${preview}
      ${hudGroup}
    </g>
  `;
}

function background(layout) {
  return `
    <rect width="${layout.width}" height="${layout.height}" fill="url(#bgFill)"/>
    <circle cx="${layout.width * 0.16}" cy="${layout.height * 0.18}" r="${layout.width * 0.18}" fill="#1f314a" opacity="0.4"/>
    <circle cx="${layout.width * 0.84}" cy="${layout.height * 0.22}" r="${layout.width * 0.2}" fill="#341d40" opacity="0.34"/>
    <circle cx="${layout.width * 0.5}" cy="${layout.height * 0.82}" r="${layout.width * 0.44}" fill="#0c4d5b" opacity="0.18"/>
    ${sparkles(layout)}
  `;
}

function runwayAura(layout) {
  return `
    <g filter="url(#runwayGlow)">
      <polygon points="${lanePolygon(layout, 0).outerPoints} ${lanePolygon(layout, 3).outerPoints}" fill="#78e7ff" opacity="0.14"/>
    </g>
  `;
}

function lanePolygon(layout, lane) {
  const nearSlice = laneSlice(layout, lane, 0);
  const farSlice = laneSlice(layout, lane, 1);
  const outerNearLeft = nearSlice.left - 10;
  const outerNearRight = nearSlice.right + 10;
  const outerFarLeft = farSlice.left - 8;
  const outerFarRight = farSlice.right + 8;
  return {
    points: `${nearSlice.left},${layout.nearY} ${nearSlice.right},${layout.nearY} ${farSlice.right},${layout.farY} ${farSlice.left},${layout.farY}`,
    outerPoints: `${outerNearLeft},${layout.nearY} ${outerNearRight},${layout.nearY} ${outerFarRight},${layout.farY} ${outerFarLeft},${layout.farY}`,
  };
}

function laneBoundary(layout, boundary) {
  const depth0 = projectBoundary(layout, boundary, 0);
  const depth1 = projectBoundary(layout, boundary, 1);
  return `
    <line x1="${depth0}" y1="${layout.nearY}" x2="${depth1}" y2="${layout.farY}" stroke="#d7fbff" stroke-opacity="0.18" stroke-width="${layout === portrait ? 4 : 3}"/>
  `;
}

function projectBoundary(layout, boundary, depth) {
  const left = projectRunwayLeft(layout, depth);
  const width = projectRunwayWidth(layout, depth);
  return left + (width / 4) * boundary;
}

function phraseGate(layout, depth) {
  const y = projectY(layout, depth);
  const left = projectRunwayLeft(layout, depth);
  const width = projectRunwayWidth(layout, depth);
  return `
    <line x1="${left - 6}" y1="${y}" x2="${left + width + 6}" y2="${y}" stroke="#69e6ff" stroke-opacity="0.15" stroke-width="${layout === portrait ? 6 : 5}"/>
  `;
}

function strikeLine(layout) {
  const left = projectRunwayLeft(layout, 0.12);
  const width = projectRunwayWidth(layout, 0.12);
  return `
    <g>
      <line x1="${left - 16}" y1="${layout.strikeY}" x2="${left + width + 16}" y2="${layout.strikeY}" stroke="#fff0b5" stroke-width="${layout === portrait ? 8 : 6}" stroke-opacity="0.95"/>
      <line x1="${left - 10}" y1="${layout.strikeY + (layout === portrait ? 18 : 14)}" x2="${left + width + 10}" y2="${layout.strikeY + (layout === portrait ? 18 : 14)}" stroke="#ff7f9a" stroke-width="${layout === portrait ? 3 : 2}" stroke-opacity="0.44"/>
    </g>
  `;
}

function drawNote(layout, note) {
  if (note.type === "hold") {
    return drawHold(layout, note);
  }
  if (note.type === "chord") {
    return note.lanes.map((lane) => drawTap(layout, { lane, depth: note.depth, glow: note.glow, linked: true })).join("") + chordLink(layout, note);
  }
  return drawTap(layout, note);
}

function drawHold(layout, note) {
  const start = noteSlice(layout, note.lane, note.depth);
  const end = noteSlice(layout, note.lane, note.tail);
  return `
    <polygon points="${start.left},${start.y} ${start.right},${start.y} ${end.right - end.width * 0.18},${end.y} ${end.left + end.width * 0.18},${end.y}" fill="${note.glow}" fill-opacity="0.22"/>
    ${drawTap(layout, note)}
  `;
}

function chordLink(layout, note) {
  const left = noteSlice(layout, note.lanes[0], note.depth);
  const right = noteSlice(layout, note.lanes[1], note.depth);
  return `
    <rect x="${left.right - 3}" y="${left.y - left.height * 0.18}" width="${right.left - left.right + 6}" height="${left.height * 0.36}" rx="${left.height * 0.18}" fill="${note.glow}" fill-opacity="0.38"/>
  `;
}

function drawTap(layout, note) {
  const slice = noteSlice(layout, note.lane, note.depth);
  const innerLeft = slice.left + slice.width * 0.1;
  const innerRight = slice.right - slice.width * 0.1;
  const topY = slice.y - slice.height * 0.5;
  const bottomY = slice.y + slice.height * 0.5;
  const glowId = note.glow === "#5be7ff" ? "tapGlowBlue" : note.glow === "#ff7e9f" ? "tapGlowPink" : "tapGlowGold";
  return `
    <g filter="url(#${glowId})">
      <polygon points="${innerLeft},${topY} ${innerRight},${topY} ${slice.right},${bottomY} ${slice.left},${bottomY}" fill="${note.glow}" fill-opacity="0.96"/>
      <polygon points="${innerLeft + slice.width * 0.08},${topY + slice.height * 0.16} ${innerRight - slice.width * 0.08},${topY + slice.height * 0.16} ${slice.right - slice.width * 0.08},${bottomY - slice.height * 0.2} ${slice.left + slice.width * 0.08},${bottomY - slice.height * 0.2}" fill="#f7fbff" fill-opacity="0.18"/>
    </g>
  `;
}

function noteSlice(layout, lane, depth) {
  const y = projectY(layout, depth);
  const left = projectBoundary(layout, lane, depth);
  const right = projectBoundary(layout, lane + 1, depth);
  const width = right - left;
  const height = width * 0.34;
  return { left: left + width * 0.08, right: right - width * 0.08, width: width * 0.84, height, y };
}

function laneSlice(layout, lane, depth) {
  return {
    left: projectBoundary(layout, lane, depth),
    right: projectBoundary(layout, lane + 1, depth),
  };
}

function projectRunwayLeft(layout, depth) {
  const t = clamp(depth, 0, 1);
  const nearLeft = layout.left;
  const farLeft = (layout.width - layout.farWidth) / 2;
  return nearLeft + (farLeft - nearLeft) * t;
}

function projectRunwayWidth(layout, depth) {
  const t = clamp(depth, 0, 1);
  return layout.nearWidth + (layout.farWidth - layout.nearWidth) * t;
}

function projectY(layout, depth) {
  const t = clamp(depth, 0, 1);
  return layout.strikeY - (layout.strikeY - layout.farY) * t;
}

function drawPreview(layout) {
  const itemW = layout === portrait ? 52 : 44;
  const gap = layout === portrait ? 16 : 14;
  const totalW = previewSequence.length * itemW + (previewSequence.length - 1) * gap;
  const originX = (layout.width - totalW) / 2;
  const y = layout === portrait ? 132 : 102;
  return previewSequence
    .map((item, index) => {
      const x = originX + index * (itemW + gap);
      return `
        <g transform="translate(${x} ${y})">
          <rect width="${itemW}" height="${itemW}" rx="${itemW * 0.28}" fill="#0e1620" opacity="0.82"/>
          ${item.type === "chord"
            ? `<rect x="8" y="11" width="14" height="${itemW - 22}" rx="7" fill="#5be7ff"/><rect x="${itemW - 22}" y="11" width="14" height="${itemW - 22}" rx="7" fill="#ff7e9f"/>`
            : item.type === "hold"
              ? `<rect x="${itemW / 2 - 8}" y="8" width="16" height="${itemW - 16}" rx="8" fill="#ffd97f"/>`
              : `<rect x="${itemW / 2 - 10}" y="11" width="20" height="${itemW - 22}" rx="10" fill="#5be7ff"/>`}
        </g>
      `;
    })
    .join("");
}

function drawHud(layout, hud) {
  const scoreX = layout === portrait ? 56 : 128;
  const rightX = layout.width - scoreX;
  const pipY = layout.topHudY + (layout === portrait ? 54 : 42);
  return `
    <text x="${scoreX}" y="${layout.topHudY}" class="hudTag">Score</text>
    <text x="${scoreX}" y="${layout.topHudY + (layout === portrait ? 48 : 40)}" class="hudValue">${hud.score}</text>
    <text x="${rightX}" y="${layout.topHudY}" text-anchor="end" class="hudTag">${hud.songLabel}</text>
    <text x="${rightX}" y="${layout.topHudY + (layout === portrait ? 48 : 40)}" text-anchor="end" class="hudValue">${hud.combo}</text>
    ${lifePips(layout, hud.lives, pipY)}
  `;
}

function lifePips(layout, lives, y) {
  const radius = layout === portrait ? 13 : 11;
  const gap = layout === portrait ? 34 : 28;
  const total = radius * 2 * 4 + gap * 3;
  const originX = layout.width / 2 - total / 2 + radius;
  return Array.from({ length: 4 }, (_, index) => {
    const x = originX + index * (radius * 2 + gap);
    const active = index < lives;
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${active ? "#fff0b5" : "#18222f"}" fill-opacity="${active ? 0.95 : 1}"/>`;
  }).join("");
}

function sparkles(layout) {
  const points = [
    [0.14, 0.12],
    [0.26, 0.34],
    [0.74, 0.14],
    [0.88, 0.28],
    [0.7, 0.62],
    [0.22, 0.74],
    [0.54, 0.88],
  ];
  return points
    .map(
      ([x, y]) =>
        `<circle cx="${layout.width * x}" cy="${layout.height * y}" r="${layout === portrait ? 2.2 : 1.8}" fill="#fff2c8" opacity="0.72"/><circle cx="${layout.width * x}" cy="${layout.height * y}" r="${layout === portrait ? 8 : 6}" fill="#fff2c8" opacity="0.08"/>`,
    )
    .join("");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrap(layout, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" fill="none">
  <defs>
    <linearGradient id="bgFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#070c14"/>
      <stop offset="58%" stop-color="#0d1622"/>
      <stop offset="100%" stop-color="#1b1221"/>
    </linearGradient>
    <linearGradient id="laneFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c5d8dd"/>
      <stop offset="100%" stop-color="#576872"/>
    </linearGradient>
    <linearGradient id="buttonFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff2ba"/>
      <stop offset="100%" stop-color="#ffc56a"/>
    </linearGradient>
    <filter id="runwayGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${layout === portrait ? 26 : 20}"/>
    </filter>
    <filter id="tapGlowBlue" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="${layout === portrait ? 8 : 6}"/>
    </filter>
    <filter id="tapGlowPink" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="${layout === portrait ? 8 : 6}"/>
    </filter>
    <filter id="tapGlowGold" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="${layout === portrait ? 8 : 6}"/>
    </filter>
    <style>
      text { font-family: "Avenir Next", "SF Pro Display", "Trebuchet MS", sans-serif; }
      .title { fill: #f7fbff; font-size: ${layout === portrait ? 72 : 58}px; font-weight: 700; letter-spacing: 0.05em; }
      .hudTag { fill: #9eb7c7; font-size: ${layout === portrait ? 24 : 20}px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
      .hudValue { fill: #f7fbff; font-size: ${layout === portrait ? 52 : 40}px; font-weight: 700; }
      .button { fill: #16110a; font-size: ${layout === portrait ? 28 : 24}px; font-weight: 700; letter-spacing: 0.06em; }
      .panelValue { fill: #f7fbff; font-size: ${layout === portrait ? 82 : 72}px; font-weight: 700; }
      .panelLabel { fill: #aabfd0; font-size: ${layout === portrait ? 28 : 24}px; font-weight: 600; letter-spacing: 0.08em; }
    </style>
  </defs>
  ${body}
</svg>`;
}
