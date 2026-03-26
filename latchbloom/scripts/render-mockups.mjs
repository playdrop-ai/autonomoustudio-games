import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("../mockups/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const blossoms = {
  rose: { fill: "#ff6f98", glow: "#ffd2df", icon: roseIcon() },
  iris: { fill: "#8a7bff", glow: "#ddd9ff", icon: irisIcon() },
  sun: { fill: "#ffd765", glow: "#fff0b7", icon: sunIcon() },
  mint: { fill: "#56d8ac", glow: "#cbffe7", icon: mintIcon() },
};

const vaseOrder = ["rose", "iris", "sun", "mint"];

const rowStates = [
  ["cross", "straight"],
  ["cross"],
  ["straight", "cross"],
  ["straight"],
  ["cross", "straight"],
];

const portrait = {
  width: 720,
  height: 1280,
  boardX: 70,
  boardY: 168,
  boardWidth: 580,
  boardHeight: 970,
};

const desktop = {
  width: 1600,
  height: 900,
  boardX: 448,
  boardY: 54,
  boardWidth: 704,
  boardHeight: 792,
};

const gameplayBlossoms = [
  { kind: "rose", lane: 2, progress: 0.78 },
  { kind: "mint", lane: 0, progress: 1.94 },
  { kind: "sun", lane: 3, progress: 2.82 },
  { kind: "iris", lane: 1, progress: 4.28 },
];

const startBlossoms = [
  { kind: "rose", lane: 0, progress: 0.86 },
  { kind: "mint", lane: 2, progress: 1.96 },
  { kind: "sun", lane: 3, progress: 3.02 },
];

const gameOverBlossoms = [
  { kind: "mint", lane: 3, progress: 1.15 },
  { kind: "rose", lane: 1, progress: 2.54 },
  { kind: "iris", lane: 0, progress: 4.55 },
];

const files = [
  { name: "portrait-start.svg", svg: renderPortraitStart() },
  { name: "portrait-gameplay.svg", svg: renderPortraitGameplay() },
  { name: "portrait-gameover.svg", svg: renderPortraitGameOver() },
  { name: "desktop-start.svg", svg: renderDesktopStart() },
  { name: "desktop-gameplay.svg", svg: renderDesktopGameplay() },
  { name: "desktop-gameover.svg", svg: renderDesktopGameOver() },
];

for (const file of files) {
  writeFileSync(join(outDir.pathname, file.name), file.svg);
}

function renderPortraitStart() {
  const board = boardShell(portrait, startBlossoms, {
    score: "0",
    preview: ["iris", "sun"],
    vaseState: [
      { fill: 1, thorns: 0 },
      { fill: 0, thorns: 0 },
      { fill: 0, thorns: 0 },
      { fill: 0, thorns: 0 },
    ],
  });
  const ui = `
    <text x="64" y="108" class="eyebrow">GREENHOUSE ROUTING ARCADE</text>
    <text x="60" y="168" class="title">Latchbloom</text>
    <text x="60" y="208" class="subtitle">Tap the brass latches. Match the vases. Keep the thorns down.</text>
    <g transform="translate(212 1076)">
      <rect width="296" height="92" rx="28" fill="#f2bf63"/>
      <rect x="6" y="6" width="284" height="80" rx="24" fill="url(#buttonFill)"/>
      <text x="148" y="57" text-anchor="middle" class="buttonLabel">Open The Glasshouse</text>
    </g>
  `;
  return wrapSvg(portrait.width, portrait.height, board + ui);
}

function renderPortraitGameplay() {
  const board = boardShell(portrait, gameplayBlossoms, {
    score: "12,480",
    preview: ["rose", "mint"],
    vaseState: [
      { fill: 2, thorns: 0 },
      { fill: 1, thorns: 1 },
      { fill: 0, thorns: 0 },
      { fill: 2, thorns: 0 },
    ],
    accentText: "STREAK x4",
  });
  return wrapSvg(portrait.width, portrait.height, board);
}

function renderPortraitGameOver() {
  const board = boardShell(portrait, gameOverBlossoms, {
    score: "18,720",
    preview: ["sun", "rose"],
    vaseState: [
      { fill: 1, thorns: 1 },
      { fill: 2, thorns: 2 },
      { fill: 0, thorns: 3 },
      { fill: 1, thorns: 0 },
    ],
    dim: true,
  });
  const ui = `
    <g transform="translate(86 154)">
      <rect width="548" height="970" rx="44" fill="#0d1620" opacity="0.76"/>
      <rect x="18" y="18" width="512" height="934" rx="34" fill="#112232" opacity="0.96"/>
      <text x="274" y="160" text-anchor="middle" class="panelTitle">The Greenhouse Choked</text>
      <text x="274" y="216" text-anchor="middle" class="panelCopy">One more clean bouquet would have cleared the thorns.</text>
      <text x="274" y="382" text-anchor="middle" class="panelLabel">RUN SCORE</text>
      <text x="274" y="462" text-anchor="middle" class="panelValue">18,720</text>
      <text x="274" y="594" text-anchor="middle" class="panelLabel">BEST</text>
      <text x="274" y="660" text-anchor="middle" class="panelMiniValue">22,960</text>
      <g transform="translate(124 760)">
        <rect width="300" height="92" rx="28" fill="#f2bf63"/>
        <rect x="6" y="6" width="288" height="80" rx="24" fill="url(#buttonFill)"/>
        <text x="150" y="57" text-anchor="middle" class="buttonLabel">Bloom Again</text>
      </g>
    </g>
  `;
  return wrapSvg(portrait.width, portrait.height, board + ui);
}

function renderDesktopStart() {
  const board = boardShell(desktop, startBlossoms, {
    score: "0",
    preview: ["iris", "sun"],
    vaseState: [
      { fill: 1, thorns: 0 },
      { fill: 0, thorns: 0 },
      { fill: 0, thorns: 0 },
      { fill: 0, thorns: 0 },
    ],
  });
  const ui = `
    <text x="800" y="86" text-anchor="middle" class="desktopTitle">Latchbloom</text>
    <text x="800" y="128" text-anchor="middle" class="desktopSubtitle">Toggle the route. Fill the vases. Clear the thorns.</text>
    <g transform="translate(650 736)">
      <rect width="300" height="88" rx="28" fill="#f2bf63"/>
      <rect x="6" y="6" width="288" height="76" rx="24" fill="url(#buttonFill)"/>
      <text x="150" y="54" text-anchor="middle" class="buttonLabel">Open The Glasshouse</text>
    </g>
  `;
  return wrapSvg(desktop.width, desktop.height, board + ui);
}

function renderDesktopGameplay() {
  const board = boardShell(desktop, gameplayBlossoms, {
    score: "12,480",
    preview: ["rose", "mint"],
    vaseState: [
      { fill: 2, thorns: 0 },
      { fill: 1, thorns: 1 },
      { fill: 0, thorns: 0 },
      { fill: 2, thorns: 0 },
    ],
    accentText: "STREAK x4",
  });
  return wrapSvg(desktop.width, desktop.height, board);
}

function renderDesktopGameOver() {
  const board = boardShell(desktop, gameOverBlossoms, {
    score: "18,720",
    preview: ["sun", "rose"],
    vaseState: [
      { fill: 1, thorns: 1 },
      { fill: 2, thorns: 2 },
      { fill: 0, thorns: 3 },
      { fill: 1, thorns: 0 },
    ],
    dim: true,
  });
  const ui = `
    <g transform="translate(426 124)">
      <rect width="748" height="652" rx="40" fill="#0d1620" opacity="0.76"/>
      <rect x="18" y="18" width="712" height="616" rx="32" fill="#112232" opacity="0.96"/>
      <text x="374" y="138" text-anchor="middle" class="panelTitle">The Greenhouse Choked</text>
      <text x="374" y="188" text-anchor="middle" class="panelCopy">Your next burst was one blossom late.</text>
      <text x="230" y="344" text-anchor="middle" class="panelLabel">RUN SCORE</text>
      <text x="230" y="420" text-anchor="middle" class="panelValue">18,720</text>
      <text x="518" y="344" text-anchor="middle" class="panelLabel">BEST</text>
      <text x="518" y="420" text-anchor="middle" class="panelValue">22,960</text>
      <g transform="translate(224 500)">
        <rect width="300" height="88" rx="28" fill="#f2bf63"/>
        <rect x="6" y="6" width="288" height="76" rx="24" fill="url(#buttonFill)"/>
        <text x="150" y="54" text-anchor="middle" class="buttonLabel">Bloom Again</text>
      </g>
    </g>
  `;
  return wrapSvg(desktop.width, desktop.height, board + ui);
}

function boardShell(layout, blossomState, options) {
  const geometry = createGeometry(layout);
  const board = drawBoard(geometry, blossomState, options);
  const hud = drawHud(layout, options);
  return `
    ${background(layout.width, layout.height)}
    ${board}
    ${hud}
  `;
}

function createGeometry(layout) {
  const laneCenters = [0, 1, 2, 3].map((index) => layout.boardX + 88 + index * ((layout.boardWidth - 176) / 3));
  const topY = layout.boardY + 116;
  const rowGap = (layout.boardHeight - 372) / 5;
  const rowBoundaries = Array.from({ length: 6 }, (_, index) => topY + index * rowGap);
  const latchRows = Array.from({ length: 5 }, (_, index) => (rowBoundaries[index] + rowBoundaries[index + 1]) / 2);
  const vaseY = layout.boardY + layout.boardHeight - 94;
  return { layout, laneCenters, rowBoundaries, latchRows, vaseY };
}

function drawBoard(geometry, blossomState, options) {
  const { layout } = geometry;
  return `
    <g filter="url(#glassGlow)">
      <rect x="${layout.boardX - 18}" y="${layout.boardY - 18}" width="${layout.boardWidth + 36}" height="${layout.boardHeight + 36}" rx="46" fill="#163549" opacity="0.38"/>
    </g>
    <rect x="${layout.boardX - 8}" y="${layout.boardY - 8}" width="${layout.boardWidth + 16}" height="${layout.boardHeight + 16}" rx="42" fill="url(#frameFill)"/>
    <rect x="${layout.boardX}" y="${layout.boardY}" width="${layout.boardWidth}" height="${layout.boardHeight}" rx="36" fill="url(#glassFill)"/>
    ${laneBackplates(geometry, options)}
    ${networkLines(geometry, options)}
    ${drawLatches(geometry, options)}
    ${drawVases(geometry, options)}
    ${drawBlossoms(geometry, blossomState, options)}
    ${glassForeground(layout, options)}
  `;
}

function laneBackplates(geometry, options) {
  const { laneCenters, rowBoundaries, vaseY } = geometry;
  return laneCenters
    .map(
      (x) => `
        <path d="M ${x} ${rowBoundaries[0] - 42} C ${x - 8} ${rowBoundaries[1] + 18}, ${x + 10} ${rowBoundaries[3] + 26}, ${x} ${vaseY - 68}" stroke="#d5fff1" stroke-width="68" stroke-linecap="round" opacity="${options.dim ? 0.08 : 0.13}"/>
        <path d="M ${x} ${rowBoundaries[0] - 42} C ${x - 8} ${rowBoundaries[1] + 18}, ${x + 10} ${rowBoundaries[3] + 26}, ${x} ${vaseY - 68}" stroke="#6de1cf" stroke-width="4" stroke-linecap="round" opacity="${options.dim ? 0.12 : 0.24}"/>
      `,
    )
    .join("\n");
}

function networkLines(geometry, options) {
  const { laneCenters, rowBoundaries, vaseY } = geometry;
  const lines = [];
  for (let row = 0; row < 5; row += 1) {
    const pairs = activePairs(row);
    const yTop = rowBoundaries[row];
    const yBottom = rowBoundaries[row + 1];
    const used = new Set();
    pairs.forEach((pair, pairIndex) => {
      const state = rowStates[row][pairIndex];
      const [a, b] = pair;
      used.add(a);
      used.add(b);
      const startAX = laneCenters[a];
      const startBX = laneCenters[b];
      const endAX = state === "cross" ? laneCenters[b] : laneCenters[a];
      const endBX = state === "cross" ? laneCenters[a] : laneCenters[b];
      lines.push(segmentPath(startAX, endAX, yTop, yBottom, options));
      lines.push(segmentPath(startBX, endBX, yTop, yBottom, options));
    });
    for (let lane = 0; lane < laneCenters.length; lane += 1) {
      if (!used.has(lane)) {
        lines.push(segmentPath(laneCenters[lane], laneCenters[lane], yTop, yBottom, options));
      }
    }
  }
  lines.push(
    ...laneCenters.map((x) =>
      segmentPath(x, x, rowBoundaries[5], vaseY - 72, options, {
        width: 12,
        glowOpacity: options.dim ? 0.1 : 0.18,
      }),
    ),
  );
  return lines.join("\n");
}

function segmentPath(x1, x2, y1, y2, options, custom = {}) {
  const curve = Math.abs(x2 - x1) * 0.45;
  const width = custom.width ?? 14;
  const glowOpacity = custom.glowOpacity ?? (options.dim ? 0.11 : 0.22);
  return `
    <path d="M ${x1} ${y1} C ${x1} ${y1 + curve}, ${x2} ${y2 - curve}, ${x2} ${y2}" stroke="#eefdf7" stroke-width="${width}" stroke-linecap="round" fill="none" opacity="${glowOpacity}"/>
    <path d="M ${x1} ${y1} C ${x1} ${y1 + curve}, ${x2} ${y2 - curve}, ${x2} ${y2}" stroke="#6de1cf" stroke-width="${Math.max(4, width - 8)}" stroke-linecap="round" fill="none" opacity="${options.dim ? 0.18 : 0.38}"/>
  `;
}

function drawLatches(geometry, options) {
  const { laneCenters, latchRows } = geometry;
  const parts = [];
  for (let row = 0; row < latchRows.length; row += 1) {
    const pairs = activePairs(row);
    pairs.forEach((pair, pairIndex) => {
      const [a, b] = pair;
      const state = rowStates[row][pairIndex];
      const centerX = (laneCenters[a] + laneCenters[b]) / 2;
      const centerY = latchRows[row];
      const crossed = state === "cross";
      parts.push(`
        <g transform="translate(${centerX} ${centerY})">
          <circle r="28" fill="#402614" opacity="${options.dim ? 0.48 : 0.72}"/>
          <circle r="23" fill="#9d6a34" opacity="${options.dim ? 0.72 : 0.98}"/>
          <circle r="18" fill="url(#latchFill)" opacity="${options.dim ? 0.62 : 1}"/>
          <rect x="-14" y="-4" width="28" height="8" rx="4" transform="rotate(${crossed ? 35 : 0})" fill="#fff4d4" opacity="${options.dim ? 0.56 : 0.92}"/>
          <rect x="-14" y="-4" width="28" height="8" rx="4" transform="rotate(${crossed ? -35 : 90})" fill="#f3cb6f" opacity="${options.dim ? 0.56 : 0.92}"/>
          <circle r="4.5" fill="#fff8df" opacity="${options.dim ? 0.4 : 0.9}"/>
        </g>
      `);
    });
  }
  return parts.join("\n");
}

function drawVases(geometry, options) {
  const { laneCenters, vaseY } = geometry;
  return vaseOrder
    .map((kind, index) => {
      const x = laneCenters[index];
      const state = options.vaseState[index];
      const blossom = blossoms[kind];
      const fillDots = Array.from({ length: 3 }, (_, dot) => {
        const filled = dot < state.fill;
        return `<circle cx="${x - 24 + dot * 24}" cy="${vaseY + 26}" r="7.5" fill="${filled ? blossom.fill : "#214257"}" opacity="${filled ? 0.96 : 0.72}"/>`;
      }).join("");
      const thorns = Array.from({ length: state.thorns }, (_, thorn) => {
        const tx = x - 24 + thorn * 24;
        return `<path d="M ${tx} ${vaseY - 52} l 8 -18 l 8 18" fill="none" stroke="#2a1718" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
      }).join("");
      return `
        <g transform="translate(${x} ${vaseY})">
          <ellipse cy="12" rx="48" ry="18" fill="#0a1621" opacity="${options.dim ? 0.24 : 0.42}"/>
          <path d="M -42 -10 C -36 42, -26 82, 0 92 C 26 82, 36 42, 42 -10 Z" fill="#17354a" opacity="${options.dim ? 0.56 : 0.96}"/>
          <path d="M -34 -6 C -28 34, -18 62, 0 70 C 18 62, 28 34, 34 -6 Z" fill="url(#vaseFill)" opacity="${options.dim ? 0.44 : 0.88}"/>
          <circle cy="-28" r="22" fill="${blossom.fill}" opacity="${options.dim ? 0.36 : 0.96}"/>
          <g transform="translate(-16 -44) scale(0.32)" opacity="${options.dim ? 0.32 : 1}">
            ${blossom.icon}
          </g>
          ${fillDots}
          ${thorns}
        </g>
      `;
    })
    .join("\n");
}

function drawBlossoms(geometry, blossomState, options) {
  return blossomState
    .map((blossom) => {
      const position = blossomPosition(geometry, blossom.lane, blossom.progress);
      const art = blossoms[blossom.kind];
      return `
        <g transform="translate(${position.x} ${position.y}) scale(${position.scale})">
          <circle r="28" fill="${art.glow}" opacity="${options.dim ? 0.16 : 0.28}"/>
          <circle r="21" fill="${art.fill}" opacity="${options.dim ? 0.4 : 0.98}"/>
          <g transform="translate(-16 -16) scale(0.32)" opacity="${options.dim ? 0.4 : 1}">
            ${art.icon}
          </g>
        </g>
      `;
    })
    .join("\n");
}

function blossomPosition(geometry, startLane, progress) {
  const { laneCenters, rowBoundaries, vaseY } = geometry;
  const points = [{ lane: startLane, x: laneCenters[startLane], y: rowBoundaries[0] - 42 }];
  let lane = startLane;
  for (let row = 0; row < 5; row += 1) {
    lane = nextLane(lane, row);
    points.push({ lane, x: laneCenters[lane], y: rowBoundaries[row + 1] });
  }
  points.push({ lane, x: laneCenters[lane], y: vaseY - 74 });
  const segment = Math.max(0, Math.min(points.length - 2, Math.floor(progress)));
  const local = Math.max(0, Math.min(0.999, progress - segment));
  const start = points[segment];
  const end = points[segment + 1];
  const x = start.x + (end.x - start.x) * local;
  const y = start.y + (end.y - start.y) * local;
  const scale = 0.94 + local * 0.08;
  return { x, y, scale };
}

function nextLane(lane, row) {
  const pairs = activePairs(row);
  const states = rowStates[row];
  for (let index = 0; index < pairs.length; index += 1) {
    const [a, b] = pairs[index];
    if (lane === a || lane === b) {
      return states[index] === "cross" ? (lane === a ? b : a) : lane;
    }
  }
  return lane;
}

function activePairs(row) {
  return row % 2 === 0 ? [[0, 1], [2, 3]] : [[1, 2]];
}

function glassForeground(layout, options) {
  return `
    <rect x="${layout.boardX + 16}" y="${layout.boardY + 16}" width="${layout.boardWidth - 32}" height="${layout.boardHeight - 32}" rx="28" fill="none" stroke="#edfff7" stroke-width="2" opacity="${options.dim ? 0.08 : 0.18}"/>
    <path d="M ${layout.boardX + 40} ${layout.boardY + 76} C ${layout.boardX + 200} ${layout.boardY + 40}, ${layout.boardX + 380} ${layout.boardY + 100}, ${layout.boardX + layout.boardWidth - 40} ${layout.boardY + 52}" stroke="#f7fff9" stroke-width="18" stroke-linecap="round" opacity="${options.dim ? 0.04 : 0.08}"/>
  `;
}

function drawHud(layout, options) {
  const previewGroup = options.preview
    .map((kind, index) => {
      const art = blossoms[kind];
      const x = layout.width - 112 - index * 52;
      return `
        <circle cx="${x}" cy="126" r="19" fill="${art.fill}" opacity="${options.dim ? 0.4 : 0.96}"/>
        <g transform="translate(${x - 12} ${114}) scale(0.24)" opacity="${options.dim ? 0.36 : 1}">
          ${art.icon}
        </g>
      `;
    })
    .join("");
  const accent = options.accentText
    ? `<text x="${layout.width / 2}" y="${layout.boardY + 60}" text-anchor="middle" class="accent">${options.accentText}</text>`
    : "";
  return `
    <text x="64" y="108" class="hudLabel">SCORE</text>
    <text x="64" y="154" class="hudValue">${options.score}</text>
    <text x="${layout.width - 64}" y="108" text-anchor="end" class="hudLabel">NEXT</text>
    ${previewGroup}
    ${accent}
  `;
}

function background(width, height) {
  return `
    <rect width="${width}" height="${height}" fill="url(#night)"/>
    <circle cx="${width * 0.12}" cy="${height * 0.14}" r="${width * 0.16}" fill="#1c4654" opacity="0.34"/>
    <circle cx="${width * 0.84}" cy="${height * 0.18}" r="${width * 0.14}" fill="#43235a" opacity="0.28"/>
    <circle cx="${width * 0.7}" cy="${height * 0.76}" r="${width * 0.24}" fill="#133645" opacity="0.26"/>
    ${panePattern(width, height)}
    ${motes(width, height)}
  `;
}

function panePattern(width, height) {
  const columns = [0.08, 0.24, 0.76, 0.92];
  return columns
    .map(
      (x) => `
        <rect x="${width * x - 28}" y="-24" width="56" height="${height + 48}" fill="#d6fff7" opacity="0.03"/>
        <rect x="${width * x - 6}" y="-24" width="12" height="${height + 48}" fill="#f3fff9" opacity="0.05"/>
      `,
    )
    .join("\n");
}

function motes(width, height) {
  const points = [
    [0.16, 0.12],
    [0.26, 0.32],
    [0.86, 0.28],
    [0.72, 0.16],
    [0.24, 0.72],
    [0.68, 0.62],
    [0.82, 0.84],
    [0.14, 0.88],
  ];
  return points
    .map(
      ([x, y]) =>
        `<circle cx="${width * x}" cy="${height * y}" r="2.2" fill="#fff3c9" opacity="0.68"/><circle cx="${width * x}" cy="${height * y}" r="9" fill="#fff3c9" opacity="0.05"/>`,
    )
    .join("\n");
}

function wrapSvg(width, height, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#09131d"/>
      <stop offset="52%" stop-color="#0f1f2f"/>
      <stop offset="100%" stop-color="#1a1632"/>
    </linearGradient>
    <linearGradient id="frameFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#39647a"/>
      <stop offset="100%" stop-color="#153043"/>
    </linearGradient>
    <linearGradient id="glassFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#14374a"/>
      <stop offset="100%" stop-color="#0e2232"/>
    </linearGradient>
    <linearGradient id="vaseFill" x1="0" y1="-1" x2="0" y2="1">
      <stop offset="0%" stop-color="#224b67"/>
      <stop offset="100%" stop-color="#132a3e"/>
    </linearGradient>
    <linearGradient id="buttonFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f9da90"/>
      <stop offset="100%" stop-color="#e9aa37"/>
    </linearGradient>
    <linearGradient id="latchFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffd98a"/>
      <stop offset="100%" stop-color="#c88429"/>
    </linearGradient>
    <filter id="glassGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="28"/>
    </filter>
    <style>
      text { font-family: "Avenir Next", "SF Pro Display", "Trebuchet MS", sans-serif; }
      .eyebrow { fill: #9ee3cf; font-size: 22px; letter-spacing: 0.22em; font-weight: 700; }
      .title { fill: #f7fff8; font-size: 64px; font-weight: 700; }
      .subtitle { fill: #c4ddd8; font-size: 27px; font-weight: 500; }
      .desktopTitle { fill: #f7fff8; font-size: 54px; font-weight: 700; }
      .desktopSubtitle { fill: #c4ddd8; font-size: 24px; font-weight: 500; }
      .buttonLabel { fill: #322006; font-size: 26px; font-weight: 700; }
      .hudLabel { fill: #9ee3cf; font-size: 22px; letter-spacing: 0.16em; font-weight: 700; }
      .hudValue { fill: #f8fff8; font-size: 42px; font-weight: 700; }
      .accent { fill: #fff0ae; font-size: 26px; font-weight: 700; letter-spacing: 0.12em; }
      .panelTitle { fill: #f8fff8; font-size: 42px; font-weight: 700; }
      .panelCopy { fill: #c4ddd8; font-size: 24px; font-weight: 500; }
      .panelLabel { fill: #9ee3cf; font-size: 22px; font-weight: 700; letter-spacing: 0.16em; }
      .panelValue { fill: #fff3c2; font-size: 54px; font-weight: 700; }
      .panelMiniValue { fill: #fff3c2; font-size: 44px; font-weight: 700; }
    </style>
  </defs>
  ${body}
</svg>`;
}

function roseIcon() {
  return `
    <circle cx="50" cy="50" r="14" fill="#fff7fb"/>
    <circle cx="30" cy="50" r="16" fill="#ffe6ef"/>
    <circle cx="70" cy="50" r="16" fill="#ffe6ef"/>
    <circle cx="50" cy="30" r="16" fill="#ffe6ef"/>
    <circle cx="50" cy="70" r="16" fill="#ffe6ef"/>
  `;
}

function irisIcon() {
  return `
    <path d="M50 10 L62 36 L90 50 L62 64 L50 90 L38 64 L10 50 L38 36 Z" fill="#f4f0ff"/>
    <circle cx="50" cy="50" r="10" fill="#e5deff"/>
  `;
}

function sunIcon() {
  return `
    <circle cx="50" cy="50" r="16" fill="#fff8d2"/>
    <path d="M50 8 L58 28 L82 18 L72 40 L92 50 L72 60 L82 82 L58 72 L50 92 L42 72 L18 82 L28 60 L8 50 L28 40 L18 18 L42 28 Z" fill="#fff2a7"/>
  `;
}

function mintIcon() {
  return `
    <path d="M50 10 C62 24 62 38 50 50 C38 38 38 24 50 10 Z" fill="#f1fff9"/>
    <path d="M90 50 C76 62 62 62 50 50 C62 38 76 38 90 50 Z" fill="#e2fff4"/>
    <path d="M50 90 C38 76 38 62 50 50 C62 62 62 76 50 90 Z" fill="#f1fff9"/>
    <path d="M10 50 C24 38 38 38 50 50 C38 62 24 62 10 50 Z" fill="#e2fff4"/>
    <circle cx="50" cy="50" r="10" fill="#d5fff0"/>
  `;
}
