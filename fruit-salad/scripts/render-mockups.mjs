import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("../mockups/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const colors = {
  coral: { fill: "#f46f69", glow: "#ffd0c9" },
  gold: { fill: "#f5ba57", glow: "#ffe4ab" },
  jade: { fill: "#55d6a3", glow: "#c6ffe7" },
  cyan: { fill: "#55c8f5", glow: "#c8efff" },
  plum: { fill: "#9f7ef5", glow: "#e0d3ff" },
};

const startRows = [
  ["gold", "coral", "jade", "plum", "cyan", "gold", null],
  ["coral", "cyan", "gold", "plum", "jade", "coral", "gold"],
  ["jade", "gold", "cyan", "coral", "plum", "jade", null],
  [null, "plum", "gold", "cyan", "gold", "coral", "jade"],
  [null, null, "coral", "jade", "gold", "cyan", null],
  [null, null, null, "plum", "coral", null, null],
];

const gameplayRows = [
  ["gold", "coral", "jade", "plum", "cyan", "gold", null],
  ["coral", "cyan", "gold", null, "jade", "coral", "gold"],
  ["jade", "gold", "cyan", null, "plum", "jade", null],
  [null, "plum", null, null, "gold", "coral", "jade"],
  [null, null, null, null, "gold", "cyan", null],
  [null, null, null, null, "coral", null, null],
];

const gameOverRows = [
  ["gold", "coral", "jade", "plum", "cyan", "gold", null],
  ["coral", "cyan", "gold", "plum", "jade", "coral", "gold"],
  ["jade", "gold", "cyan", null, "plum", "jade", null],
  [null, "plum", "gold", "cyan", "gold", "coral", "jade"],
  [null, null, "coral", "jade", "gold", "cyan", null],
  [null, null, null, "plum", "coral", null, null],
  [null, null, "jade", "gold", "cyan", "coral", null],
];

const portrait = {
  width: 720,
  height: 1280,
  boardX: 72,
  boardY: 170,
  cell: 74,
  rowStep: 64,
  launcherX: 360,
  launcherY: 1138,
  dangerY: 1018,
  anchorXs: [176, 360, 544],
};

const desktop = {
  width: 1600,
  height: 900,
  boardX: 444,
  boardY: 92,
  cell: 72,
  rowStep: 62,
  launcherX: 800,
  launcherY: 806,
  dangerY: 706,
  anchorXs: [612, 800, 988],
};

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
  const board = boardShell(layout, startRows, {
    score: "0",
    lineText: "SAFE",
    current: "gold",
    reserve: "plum",
  });
  const copy = layout.width === portrait.width
    ? `
      <text x="${layout.width / 2}" y="962" text-anchor="middle" class="startTitle">Fruit Salad</text>
      <text x="${layout.width / 2}" y="1000" text-anchor="middle" class="startCopy">Cut the knot. Drop the canopy.</text>
      <g transform="translate(140 1038)">
        ${cta(440, 94, "Light The Alley")}
      </g>
    `
    : `
      <text x="${layout.width / 2}" y="656" text-anchor="middle" class="startTitle">Fruit Salad</text>
      <text x="${layout.width / 2}" y="694" text-anchor="middle" class="startCopy">Aim true. Sever the canopy. Keep the line alive.</text>
      <g transform="translate(646 710)">
        ${cta(308, 82, "Light The Alley")}
      </g>
    `;
  return wrapSvg(layout.width, layout.height, board + copy);
}

function renderGameplay(layout) {
  const board = boardShell(layout, gameplayRows, {
    score: "18,420",
    lineText: "2 STEPS",
    current: "coral",
    reserve: "jade",
    accentText: "DROP x12",
    aimTo: layout.width === portrait.width ? [256, 624] : [686, 402],
    falling: [
      { color: "plum", x: layout.width === portrait.width ? 236 : 630, y: layout.width === portrait.width ? 598 : 382 },
      { color: "cyan", x: layout.width === portrait.width ? 312 : 704, y: layout.width === portrait.width ? 660 : 446 },
      { color: "gold", x: layout.width === portrait.width ? 388 : 778, y: layout.width === portrait.width ? 724 : 510 },
      { color: "jade", x: layout.width === portrait.width ? 464 : 854, y: layout.width === portrait.width ? 790 : 576 },
    ],
    brokenAnchor: 1,
  });
  const accent = layout.width === portrait.width
    ? `<text x="${layout.width / 2}" y="154" text-anchor="middle" class="combo">DROP x12</text>`
    : `<text x="${layout.width / 2}" y="70" text-anchor="middle" class="combo">DROP x12</text>`;
  return wrapSvg(layout.width, layout.height, board + accent);
}

function renderGameOver(layout) {
  const board = boardShell(layout, gameOverRows, {
    score: "31,280",
    lineText: "BROKEN",
    current: "cyan",
    reserve: "gold",
    dim: true,
  });
  const panel = layout.width === portrait.width
    ? `
      <g transform="translate(82 196)">
        <rect width="556" height="882" rx="44" fill="#081017" opacity="0.74"/>
        <rect x="18" y="18" width="520" height="846" rx="34" fill="#11202f" opacity="0.94"/>
        <text x="278" y="142" text-anchor="middle" class="panelTitle">The Canopy Sank</text>
        <text x="278" y="194" text-anchor="middle" class="panelCopy">One clean anchor cut would have bought another round.</text>
        <text x="278" y="340" text-anchor="middle" class="panelLabel">RUN SCORE</text>
        <text x="278" y="424" text-anchor="middle" class="panelValue">31,280</text>
        <text x="278" y="540" text-anchor="middle" class="panelLabel">BEST DROP</text>
        <text x="278" y="610" text-anchor="middle" class="panelMiniValue">12 lanterns</text>
        <text x="278" y="676" text-anchor="middle" class="panelLabel">BEST</text>
        <text x="278" y="736" text-anchor="middle" class="panelMiniValue">38,940</text>
        <g transform="translate(118 758)">
          ${cta(320, 92, "Relight")}
        </g>
      </g>
    `
    : `
      <g transform="translate(398 110)">
        <rect width="804" height="660" rx="42" fill="#081017" opacity="0.72"/>
        <rect x="18" y="18" width="768" height="624" rx="32" fill="#11202f" opacity="0.94"/>
        <text x="402" y="128" text-anchor="middle" class="panelTitle">The Canopy Sank</text>
        <text x="402" y="178" text-anchor="middle" class="panelCopy">The next safe shot was there. The line just got there first.</text>
        <text x="240" y="320" text-anchor="middle" class="panelLabel">RUN SCORE</text>
        <text x="240" y="396" text-anchor="middle" class="panelValue">31,280</text>
        <text x="564" y="320" text-anchor="middle" class="panelLabel">BEST DROP</text>
        <text x="564" y="396" text-anchor="middle" class="panelValue">12 lanterns</text>
        <text x="402" y="470" text-anchor="middle" class="panelLabel">BEST</text>
        <text x="402" y="526" text-anchor="middle" class="panelMiniValue">38,940</text>
        <g transform="translate(248 548)">
          ${cta(308, 82, "Relight")}
        </g>
      </g>
    `;
  return wrapSvg(layout.width, layout.height, board + panel);
}

function boardShell(layout, rows, options) {
  return `
    ${background(layout)}
    ${dangerLine(layout, options.lineText, options.dim)}
    ${anchors(layout, rows, options)}
    ${boardLanterns(layout, rows, options)}
    ${launcher(layout, options)}
    ${hud(layout, options)}
    ${aimGuide(layout, options)}
    ${fallingLanterns(options.falling ?? [], options.dim)}
  `;
}

function background(layout) {
  const lanternRailY = layout.boardY - 42;
  return `
    <rect width="${layout.width}" height="${layout.height}" fill="url(#night)"/>
    <circle cx="${layout.width * 0.16}" cy="${layout.height * 0.12}" r="${layout.width * 0.13}" fill="#f19a53" opacity="0.1"/>
    <circle cx="${layout.width * 0.84}" cy="${layout.height * 0.18}" r="${layout.width * 0.16}" fill="#4a79ff" opacity="0.12"/>
    <circle cx="${layout.width * 0.66}" cy="${layout.height * 0.82}" r="${layout.width * 0.26}" fill="#113342" opacity="0.24"/>
    <rect x="0" y="${layout.height * 0.8}" width="${layout.width}" height="${layout.height * 0.2}" fill="url(#fog)"/>
    <path d="M 0 ${layout.height * 0.79} C ${layout.width * 0.16} ${layout.height * 0.76}, ${layout.width * 0.28} ${layout.height * 0.83}, ${layout.width * 0.46} ${layout.height * 0.78} C ${layout.width * 0.62} ${layout.height * 0.73}, ${layout.width * 0.78} ${layout.height * 0.84}, ${layout.width} ${layout.height * 0.77} L ${layout.width} ${layout.height} L 0 ${layout.height} Z" fill="#060b11" opacity="0.74"/>
    <line x1="0" y1="${lanternRailY}" x2="${layout.width}" y2="${lanternRailY}" stroke="#3b2c35" stroke-width="8" opacity="0.62"/>
    ${sparkles(layout)}
  `;
}

function sparkles(layout) {
  const points = [
    [0.14, 0.08],
    [0.26, 0.22],
    [0.34, 0.12],
    [0.68, 0.1],
    [0.82, 0.26],
    [0.58, 0.34],
    [0.14, 0.62],
    [0.9, 0.72],
  ];
  return points
    .map(
      ([x, y]) =>
        `<circle cx="${layout.width * x}" cy="${layout.height * y}" r="2.2" fill="#fce7b8" opacity="0.78"/><circle cx="${layout.width * x}" cy="${layout.height * y}" r="9" fill="#fce7b8" opacity="0.08"/>`,
    )
    .join("\n");
}

function dangerLine(layout, lineText, dim = false) {
  return `
    <line x1="${layout.boardX - 24}" y1="${layout.dangerY}" x2="${layout.width - layout.boardX + 24}" y2="${layout.dangerY}" stroke="#ff726f" stroke-width="4" stroke-linecap="round" stroke-dasharray="20 14" opacity="${dim ? 0.32 : 0.78}"/>
    <g transform="translate(${layout.width - layout.boardX - 142} ${layout.dangerY - 44})">
      <rect width="136" height="44" rx="18" fill="#2b1318" opacity="${dim ? 0.5 : 0.82}"/>
      <text x="68" y="29" text-anchor="middle" class="lineText">${lineText}</text>
    </g>
  `;
}

function anchors(layout, rows, options) {
  const topY = layout.boardY - 48;
  const boardTopTargets = [
    cellCenter(layout, 0, 1),
    cellCenter(layout, 0, 3),
    cellCenter(layout, 0, 5),
  ];
  return layout.anchorXs
    .map((anchorX, index) => {
      const target = boardTopTargets[index];
      const broken = options.brokenAnchor === index;
      const rope = broken
        ? `
            <path d="M ${anchorX} ${topY + 16} C ${anchorX - 6} ${topY + 54}, ${anchorX - 20} ${target[1] - 54}, ${anchorX - 14} ${target[1] - 30}" stroke="#7c4a39" stroke-width="6" stroke-linecap="round" opacity="0.75"/>
            <path d="M ${anchorX + 12} ${target[1] - 40} l 12 18" stroke="#ffd7cb" stroke-width="3" stroke-linecap="round" opacity="0.62"/>
          `
        : `<path d="M ${anchorX} ${topY + 16} C ${anchorX - 4} ${topY + 62}, ${target[0] - 12} ${target[1] - 64}, ${target[0]} ${target[1] - 44}" stroke="#7c4a39" stroke-width="6" stroke-linecap="round" opacity="0.9"/>`;
      return `
        <g>
          ${rope}
          <circle cx="${anchorX}" cy="${topY}" r="20" fill="#6f4331"/>
          <circle cx="${anchorX}" cy="${topY}" r="13" fill="#d39a51"/>
          <circle cx="${anchorX}" cy="${topY}" r="7" fill="#fff1c8" opacity="0.7"/>
        </g>
      `;
    })
    .join("\n");
}

function boardLanterns(layout, rows, options) {
  const result = [];
  for (let row = 0; row < rows.length; row += 1) {
    for (let col = 0; col < rows[row].length; col += 1) {
      const color = rows[row][col];
      if (!color) continue;
      const [cx, cy] = cellCenter(layout, row, col);
      result.push(drawLantern(color, cx, cy, layout.cell * 0.42, { dim: options.dim }));
    }
  }
  return result.join("\n");
}

function hud(layout, options) {
  const title = layout.width === portrait.width
    ? `<text x="${layout.width / 2}" y="74" text-anchor="middle" class="hudTitle">Fruit Salad</text>`
    : "";
  return `
    ${title}
    <g transform="translate(${layout.boardX - 12} ${layout.width === portrait.width ? 46 : 38})">
      <rect width="${layout.width === portrait.width ? 184 : 198}" height="72" rx="24" fill="#0e1a25" opacity="0.88"/>
      <text x="22" y="26" class="hudLabel">SCORE</text>
      <text x="22" y="58" class="hudValue">${options.score}</text>
    </g>
    <g transform="translate(${layout.width - layout.boardX - (layout.width === portrait.width ? 182 : 200)} ${layout.width === portrait.width ? 46 : 38})">
      <rect width="${layout.width === portrait.width ? 182 : 200}" height="72" rx="24" fill="#0e1a25" opacity="0.88"/>
      <text x="${layout.width === portrait.width ? 91 : 100}" y="26" text-anchor="middle" class="hudLabel">SINK LINE</text>
      <text x="${layout.width === portrait.width ? 91 : 100}" y="58" text-anchor="middle" class="hudValue">${options.lineText}</text>
    </g>
  `;
}

function launcher(layout, options) {
  const reserveX = layout.width === portrait.width ? layout.launcherX - 146 : layout.launcherX - 188;
  const reserveY = layout.launcherY - 14;
  return `
    <g transform="translate(${layout.launcherX} ${layout.launcherY})">
      <circle r="${layout.cell * 0.54}" fill="#0a151d" opacity="0.94"/>
      <circle r="${layout.cell * 0.47}" fill="#17313d"/>
      <circle r="${layout.cell * 0.38}" fill="#274d57"/>
      ${drawLantern(options.current, 0, 0, layout.cell * 0.34, { centered: true, dim: options.dim })}
    </g>
    <g transform="translate(${reserveX} ${reserveY})">
      <rect x="-52" y="-52" width="104" height="104" rx="30" fill="#0e1a25" opacity="0.88"/>
      <text x="0" y="-18" text-anchor="middle" class="reserveLabel">RESERVE</text>
      ${drawLantern(options.reserve, 0, 18, layout.cell * 0.24, { centered: true, dim: options.dim })}
    </g>
  `;
}

function aimGuide(layout, options) {
  if (!options.aimTo || options.dim) return "";
  return `
    <line x1="${layout.launcherX}" y1="${layout.launcherY}" x2="${options.aimTo[0]}" y2="${options.aimTo[1]}" stroke="#fff1c8" stroke-width="4" stroke-dasharray="12 10" opacity="0.74"/>
  `;
}

function fallingLanterns(items, dim = false) {
  return items
    .map(({ color, x, y }) => drawLantern(color, x, y, 30, { dim, falling: true }))
    .join("\n");
}

function drawLantern(colorKey, x, y, radius, options = {}) {
  const color = colors[colorKey];
  const dimOpacity = options.dim ? 0.42 : 1;
  const glowOpacity = options.dim ? 0.18 : 0.38;
  const tx = options.centered ? x : x;
  const ty = options.centered ? y : y;
  return `
    <g transform="translate(${tx} ${ty})" opacity="${dimOpacity}">
      <circle r="${radius + 8}" fill="${color.glow}" opacity="${glowOpacity}"/>
      <ellipse rx="${radius}" ry="${radius * 0.94}" fill="#0b1016" opacity="0.42" transform="translate(0 9)"/>
      <ellipse rx="${radius}" ry="${radius * 0.92}" fill="${color.fill}"/>
      <ellipse rx="${radius * 0.72}" ry="${radius * 0.28}" cy="-${radius * 0.22}" fill="#ffffff" opacity="0.18"/>
      <rect x="-${radius * 0.28}" y="-${radius * 1.04}" width="${radius * 0.56}" height="${radius * 0.28}" rx="${radius * 0.1}" fill="#5f4031"/>
      <path d="M 0 ${radius * 0.8} L 0 ${radius * 1.28}" stroke="#dba55d" stroke-width="${Math.max(2, radius * 0.12)}" stroke-linecap="round"/>
      <circle cx="0" cy="${radius * 1.42}" r="${Math.max(3, radius * 0.12)}" fill="#fce2a3"/>
    </g>
  `;
}

function cellCenter(layout, row, col) {
  const offset = row % 2 ? layout.cell / 2 : 0;
  const x = layout.boardX + offset + col * layout.cell + layout.cell / 2;
  const y = layout.boardY + row * layout.rowStep + layout.cell / 2;
  return [x, y];
}

function cta(width, height, label) {
  return `
    <rect width="${width}" height="${height}" rx="28" fill="#f5ba57"/>
    <rect x="6" y="6" width="${width - 12}" height="${height - 12}" rx="24" fill="url(#buttonFill)"/>
    <text x="${width / 2}" y="${height / 2 + 10}" text-anchor="middle" class="buttonLabel">${label}</text>
  `;
}

function wrapSvg(width, height, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090c12"/>
      <stop offset="52%" stop-color="#101521"/>
      <stop offset="100%" stop-color="#170f18"/>
    </linearGradient>
    <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#17303a" stop-opacity="0"/>
      <stop offset="100%" stop-color="#17303a" stop-opacity="0.34"/>
    </linearGradient>
    <linearGradient id="buttonFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffd27c"/>
      <stop offset="100%" stop-color="#f39f45"/>
    </linearGradient>
    <style>
      text { font-family: "Avenir Next", "Nunito Sans", "Trebuchet MS", sans-serif; }
      .eyebrow { font-size: 15px; letter-spacing: 0.28em; fill: rgba(252, 236, 209, 0.74); }
      .title { font-size: 64px; font-weight: 700; fill: #fff4dc; }
      .subtitle { font-size: 24px; fill: rgba(255, 244, 220, 0.82); }
      .hudTitle { font-size: 24px; letter-spacing: 0.16em; text-transform: uppercase; fill: rgba(255, 244, 220, 0.86); }
      .hudLabel { font-size: 12px; letter-spacing: 0.22em; fill: rgba(255, 244, 220, 0.58); }
      .hudValue { font-size: 26px; font-weight: 700; fill: #fff4dc; }
      .reserveLabel { font-size: 12px; letter-spacing: 0.18em; fill: rgba(255, 244, 220, 0.56); }
      .lineText { font-size: 18px; font-weight: 700; fill: #ffd9ce; letter-spacing: 0.08em; }
      .combo { font-size: 20px; letter-spacing: 0.18em; fill: #ffe7b2; }
      .startTitle { font-size: 52px; font-weight: 700; fill: #fff4dc; }
      .startCopy { font-size: 22px; fill: rgba(255, 244, 220, 0.82); }
      .buttonLabel { font-size: 28px; font-weight: 700; fill: #412413; }
      .panelTitle { font-size: 48px; font-weight: 700; fill: #fff4dc; }
      .panelCopy { font-size: 22px; fill: rgba(255, 244, 220, 0.82); }
      .panelLabel { font-size: 14px; letter-spacing: 0.22em; fill: rgba(255, 244, 220, 0.56); }
      .panelValue { font-size: 52px; font-weight: 700; fill: #fff4dc; }
      .panelMiniValue { font-size: 34px; font-weight: 700; fill: #ffe7b2; }
    </style>
  </defs>
  ${body}
</svg>`;
}
