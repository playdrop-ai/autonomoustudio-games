import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("../mockups/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const portrait = {
  width: 720,
  height: 1280,
  boardX: 72,
  boardY: 156,
  boardWidth: 576,
  boardHeight: 970,
  cardWidth: 112,
  cardHeight: 158,
  cardOverlapX: 72,
  rowGap: 114,
  bottomY: 1090,
};

const desktop = {
  width: 1600,
  height: 900,
  boardX: 510,
  boardY: 48,
  boardWidth: 580,
  boardHeight: 804,
  cardWidth: 116,
  cardHeight: 164,
  cardOverlapX: 76,
  rowGap: 118,
  bottomY: 764,
};

const suits = {
  moon: { color: "#5d77ff", glow: "#d4deff", glyph: moonGlyph() },
  rose: { color: "#cf4e70", glow: "#ffd4df", glyph: roseGlyph() },
  sun: { color: "#f1ad2e", glow: "#ffefba", glyph: sunGlyph() },
  blade: { color: "#5c7a79", glow: "#d2ece7", glyph: bladeGlyph() },
};

const files = [
  ["portrait-start.svg", renderStart(portrait, "Past")],
  ["portrait-gameplay.svg", renderGameplay(portrait, "Present")],
  ["portrait-gameover.svg", renderGameOver(portrait, "Future")],
  ["desktop-start.svg", renderStart(desktop, "Past")],
  ["desktop-gameplay.svg", renderGameplay(desktop, "Present")],
  ["desktop-gameover.svg", renderGameOver(desktop, "Future")],
];

for (const [name, svg] of files) {
  writeFileSync(join(outDir.pathname, name), svg);
}

function renderStart(layout, spreadLabel) {
  return wrapSvg(
    layout,
    `
      ${tableBackdrop(layout)}
      ${tableFrame(layout)}
      ${tableCards(layout, { playable: [2, 5, 9], dim: false, omenSuit: "moon" })}
      ${topHud(layout, { score: "0", spreadLabel, omenSuit: "moon", best: "BEST 0" })}
      ${bottomHud(layout, { active: ["6", "rose"], reserve: ["Q", "blade"], stock: 11, chain: "" })}
      ${startOverlay(layout)}
    `,
  );
}

function renderGameplay(layout, spreadLabel) {
  return wrapSvg(
    layout,
    `
      ${tableBackdrop(layout)}
      ${tableFrame(layout)}
      ${tableCards(layout, { playable: [1, 4, 8, 15], dim: false, omenSuit: "sun" })}
      ${topHud(layout, { score: "18,440", spreadLabel, omenSuit: "sun", best: "BEST 24,180" })}
      ${bottomHud(layout, { active: ["7", "sun"], reserve: ["5", "moon"], stock: 4, chain: "CHAIN x5" })}
      ${accentBadge(layout, "OMEN READY")}
    `,
  );
}

function renderGameOver(layout, spreadLabel) {
  return wrapSvg(
    layout,
    `
      ${tableBackdrop(layout, true)}
      ${tableFrame(layout, true)}
      ${tableCards(layout, { playable: [], dim: true, omenSuit: "blade" })}
      ${topHud(layout, { score: "27,260", spreadLabel, omenSuit: "blade", best: "BEST 31,100", dim: true })}
      ${bottomHud(layout, { active: ["K", "blade"], reserve: null, stock: 0, chain: "" }, true)}
      ${gameOverOverlay(layout)}
    `,
  );
}

function wrapSvg(layout, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14080c"/>
      <stop offset="55%" stop-color="#2a1016"/>
      <stop offset="100%" stop-color="#0d0a12"/>
    </linearGradient>
    <linearGradient id="tableGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4e101e"/>
      <stop offset="100%" stop-color="#2a0710"/>
    </linearGradient>
    <linearGradient id="brassGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7dda1"/>
      <stop offset="100%" stop-color="#b37d2d"/>
    </linearGradient>
    <linearGradient id="ivoryGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff9ef"/>
      <stop offset="100%" stop-color="#efe2c8"/>
    </linearGradient>
    <linearGradient id="inkGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#321016"/>
      <stop offset="100%" stop-color="#17050a"/>
    </linearGradient>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#070206" flood-opacity="0.34"/>
    </filter>
    <style>
      .title { font: 700 54px Georgia, 'Times New Roman', serif; fill: #f5e6c0; letter-spacing: 0.4px; }
      .subtitle { font: 500 21px Georgia, 'Times New Roman', serif; fill: #dcc8a4; }
      .hudLabel { font: 700 16px Arial, sans-serif; letter-spacing: 2.4px; fill: #f4ddaa; opacity: 0.8; }
      .hudValue { font: 700 30px Georgia, 'Times New Roman', serif; fill: #fff4d8; }
      .chipText { font: 700 15px Arial, sans-serif; letter-spacing: 1.2px; fill: #29120a; }
      .buttonText { font: 700 26px Georgia, 'Times New Roman', serif; fill: #2d120b; }
      .panelLabel { font: 700 16px Arial, sans-serif; letter-spacing: 2.1px; fill: #cfb98d; }
      .panelValue { font: 700 54px Georgia, 'Times New Roman', serif; fill: #fff1cb; }
      .smallCopy { font: 500 18px Arial, sans-serif; fill: #d9c6a0; }
      .rank { font: 700 34px Georgia, 'Times New Roman', serif; }
      .miniRank { font: 700 26px Georgia, 'Times New Roman', serif; }
    </style>
  </defs>
  ${body}
</svg>`;
}

function tableBackdrop(layout, dim = false) {
  return `
    <rect width="${layout.width}" height="${layout.height}" fill="url(#bgGrad)"/>
    <ellipse cx="${layout.width / 2}" cy="${layout.height * 0.22}" rx="${layout.width * 0.38}" ry="${layout.height * 0.12}" fill="#8c332d" opacity="${dim ? 0.1 : 0.16}" filter="url(#softGlow)"/>
    <ellipse cx="${layout.width / 2}" cy="${layout.height * 0.74}" rx="${layout.width * 0.44}" ry="${layout.height * 0.16}" fill="#a45922" opacity="${dim ? 0.08 : 0.12}" filter="url(#softGlow)"/>
  `;
}

function tableFrame(layout, dim = false) {
  return `
    <g opacity="${dim ? 0.72 : 1}">
      <rect x="${layout.boardX - 18}" y="${layout.boardY - 18}" width="${layout.boardWidth + 36}" height="${layout.boardHeight + 36}" rx="46" fill="url(#brassGrad)" opacity="0.9"/>
      <rect x="${layout.boardX}" y="${layout.boardY}" width="${layout.boardWidth}" height="${layout.boardHeight}" rx="34" fill="url(#tableGrad)"/>
      <rect x="${layout.boardX + 16}" y="${layout.boardY + 16}" width="${layout.boardWidth - 32}" height="${layout.boardHeight - 32}" rx="26" stroke="#e9c98e" stroke-opacity="0.3" stroke-width="2"/>
    </g>
  `;
}

function tableCards(layout, { playable, dim, omenSuit }) {
  const rows = cardRows(layout);
  const cards = deckLayout();
  return rows
    .flatMap((row, rowIndex) =>
      row.map((slot, columnIndex) => {
        const index = rowIndex * 7 + columnIndex;
        const card = cards[index];
        const isPlayable = playable.includes(index);
        return renderCard(slot.x, slot.y, layout.cardWidth, layout.cardHeight, card[0], card[1], {
          lift: isPlayable ? -10 : 0,
          glow: isPlayable,
          dim,
          omen: card[1] === omenSuit && isPlayable,
        });
      }),
    )
    .join("");
}

function cardRows(layout) {
  const left = layout.boardX + 40;
  const top = layout.boardY + 184;
  return Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 7 }, (_, col) => ({
      x: left + col * layout.cardOverlapX + (row === 1 ? 10 : row === 2 ? 20 : 0),
      y: top + row * layout.rowGap,
    })),
  );
}

function renderCard(x, y, width, height, rank, suitKey, options) {
  const suit = suits[suitKey];
  const ink = options.dim ? "#cdbf9f" : suit.color;
  const lift = options.lift ?? 0;
  const glow = options.glow ? `<rect x="${x - 6}" y="${y + lift - 6}" width="${width + 12}" height="${height + 12}" rx="26" fill="${options.omen ? "#f7d88e" : suit.glow}" opacity="${options.omen ? 0.62 : 0.4}" filter="url(#softGlow)"/>` : "";
  return `
    ${glow}
    <g transform="translate(0 ${lift})" filter="url(#cardShadow)" opacity="${options.dim ? 0.54 : 1}">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="22" fill="url(#ivoryGrad)"/>
      <rect x="${x + 8}" y="${y + 8}" width="${width - 16}" height="${height - 16}" rx="16" fill="none" stroke="#decaa1" stroke-width="2"/>
      <text x="${x + 18}" y="${y + 40}" class="rank" fill="${ink}">${rank}</text>
      <g transform="translate(${x + width - 44} ${y + 22}) scale(0.72)" fill="${ink}">
        ${suit.glyph}
      </g>
      <g transform="translate(${x + width / 2 - 24} ${y + 54}) scale(1.4)" fill="${ink}" opacity="0.84">
        ${suit.glyph}
      </g>
      <text x="${x + width / 2}" y="${y + height - 22}" text-anchor="middle" class="miniRank" fill="${ink}" opacity="0.9">${suitKey.toUpperCase()}</text>
    </g>
  `;
}

function topHud(layout, { score, spreadLabel, omenSuit, best, dim = false }) {
  const leftX = layout.boardX + 26;
  const rightX = layout.boardX + layout.boardWidth - 190;
  const topY = layout.boardY + 28;
  return `
    <g opacity="${dim ? 0.72 : 1}">
      <text x="${leftX}" y="${topY}" class="hudLabel">SCORE</text>
      <text x="${leftX}" y="${topY + 34}" class="hudValue">${score}</text>
      <text x="${leftX}" y="${topY + 58}" class="smallCopy">${best}</text>
      <g transform="translate(${layout.boardX + layout.boardWidth / 2 - 72} ${topY - 8})">
        <rect width="144" height="40" rx="20" fill="#2a0e15" stroke="#c39b58" stroke-width="1.5"/>
        <text x="72" y="26" text-anchor="middle" class="hudLabel" style="letter-spacing:1.6px;">${spreadLabel}</text>
      </g>
      <g transform="translate(${rightX} ${topY - 8})">
        <rect width="164" height="58" rx="24" fill="#2a0e15" stroke="#c39b58" stroke-width="1.5"/>
        <text x="18" y="22" class="hudLabel">OMEN</text>
        <g transform="translate(106 14) scale(0.92)" fill="${suits[omenSuit].color}">
          ${suits[omenSuit].glyph}
        </g>
        <text x="18" y="43" class="smallCopy">${omenSuit.toUpperCase()}</text>
      </g>
    </g>
  `;
}

function bottomHud(layout, { active, reserve, stock, chain }, dim = false) {
  const centerX = layout.boardX + layout.boardWidth / 2;
  const baseY = layout.bottomY;
  return `
    <g opacity="${dim ? 0.78 : 1}">
      <g transform="translate(${centerX - 222} ${baseY})">
        <rect width="150" height="112" rx="28" fill="#2a0e15" stroke="#c39b58" stroke-width="1.5"/>
        <text x="22" y="24" class="hudLabel">RESERVE</text>
        ${
          reserve
            ? renderMiniCard(76, 58, reserve[0], reserve[1], false)
            : `<circle cx="76" cy="63" r="30" fill="#1b0b10" stroke="#866432" stroke-dasharray="5 6" stroke-width="2"/><text x="76" y="69" text-anchor="middle" class="smallCopy">EMPTY</text>`
        }
      </g>
      <g transform="translate(${centerX - 58} ${baseY - 12})">
        <rect width="116" height="132" rx="30" fill="#2a0e15" stroke="#f1c267" stroke-width="2.5"/>
        <text x="58" y="24" text-anchor="middle" class="hudLabel">ACTIVE</text>
        ${renderMiniCard(58, 72, active[0], active[1], true)}
      </g>
      <g transform="translate(${centerX + 92} ${baseY})">
        <rect width="150" height="112" rx="28" fill="#2a0e15" stroke="#c39b58" stroke-width="1.5"/>
        <text x="22" y="24" class="hudLabel">STOCK</text>
        <g transform="translate(30 38)">
          <rect width="58" height="76" rx="16" fill="#f0dfc0"/>
          <rect x="7" y="7" width="44" height="62" rx="12" fill="url(#inkGrad)"/>
          <rect x="17" y="18" width="24" height="40" rx="10" fill="none" stroke="#d8b474" stroke-width="1.5"/>
        </g>
        <text x="108" y="72" text-anchor="middle" class="panelValue" style="font-size:36px;">${stock}</text>
      </g>
      ${chain ? `<g transform="translate(${centerX - 78} ${baseY - 58})"><rect width="156" height="38" rx="19" fill="#f3d493"/><text x="78" y="25" text-anchor="middle" class="chipText">${chain}</text></g>` : ""}
    </g>
  `;
}

function renderMiniCard(cx, cy, rank, suitKey, active = false) {
  const suit = suits[suitKey];
  return `
    <g transform="translate(${cx - 32} ${cy - 42})" ${active ? `filter="url(#cardShadow)"` : ""}>
      <rect width="64" height="84" rx="16" fill="url(#ivoryGrad)"/>
      <text x="12" y="24" class="miniRank" fill="${suit.color}">${rank}</text>
      <g transform="translate(30 18) scale(0.44)" fill="${suit.color}">
        ${suit.glyph}
      </g>
      <g transform="translate(8 30) scale(0.86)" fill="${suit.color}" opacity="0.86">
        ${suit.glyph}
      </g>
    </g>
  `;
}

function startOverlay(layout) {
  const panelWidth = Math.min(layout.boardWidth - 56, 520);
  const x = layout.boardX + (layout.boardWidth - panelWidth) / 2;
  const y = layout.height - (layout === portrait ? 282 : 198);
  return `
    <text x="${layout.width / 2}" y="${layout.boardY - 34}" text-anchor="middle" class="title">Velvet Arcana</text>
    <text x="${layout.width / 2}" y="${layout.boardY - 4}" text-anchor="middle" class="subtitle">Read three spreads. Save one chain. Finish clean.</text>
    <g transform="translate(${x} ${y})">
      <rect width="${panelWidth}" height="${layout === portrait ? 170 : 144}" rx="34" fill="#13070d" opacity="0.9"/>
      <rect x="12" y="12" width="${panelWidth - 24}" height="${layout === portrait ? 146 : 120}" rx="26" fill="#211017" stroke="#c59a58" stroke-width="1.6"/>
      <text x="${panelWidth / 2}" y="48" text-anchor="middle" class="smallCopy">Tap a card that is one rank higher or lower. Use the reserve when the chain turns bad.</text>
      <g transform="translate(${panelWidth / 2 - 116} ${layout === portrait ? 86 : 74})">
        <rect width="232" height="56" rx="28" fill="url(#brassGrad)"/>
        <text x="116" y="36" text-anchor="middle" class="buttonText">Begin Reading</text>
      </g>
    </g>
  `;
}

function gameOverOverlay(layout) {
  const panelWidth = Math.min(layout.boardWidth - 68, 540);
  const panelHeight = layout === portrait ? 258 : 228;
  const x = layout.boardX + (layout.boardWidth - panelWidth) / 2;
  const y = layout.height - panelHeight - (layout === portrait ? 70 : 42);
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${panelWidth}" height="${panelHeight}" rx="34" fill="#12060b" opacity="0.94"/>
      <rect x="12" y="12" width="${panelWidth - 24}" height="${panelHeight - 24}" rx="26" fill="#211017" stroke="#c59a58" stroke-width="1.6"/>
      <text x="${panelWidth / 2}" y="54" text-anchor="middle" class="title" style="font-size:${layout === portrait ? 34 : 38}px;">The Reading Closed</text>
      <text x="${panelWidth / 2}" y="84" text-anchor="middle" class="smallCopy">No legal move remained before the final spread cleared.</text>
      <text x="${panelWidth * 0.3}" y="132" text-anchor="middle" class="panelLabel">RUN SCORE</text>
      <text x="${panelWidth * 0.3}" y="182" text-anchor="middle" class="panelValue">27,260</text>
      <text x="${panelWidth * 0.7}" y="132" text-anchor="middle" class="panelLabel">SPREADS</text>
      <text x="${panelWidth * 0.7}" y="182" text-anchor="middle" class="panelValue">2 / 3</text>
      <g transform="translate(${panelWidth / 2 - 110} ${panelHeight - 78})">
        <rect width="220" height="52" rx="26" fill="url(#brassGrad)"/>
        <text x="110" y="34" text-anchor="middle" class="buttonText">Read Again</text>
      </g>
    </g>
  `;
}

function accentBadge(layout, label) {
  return `
    <g transform="translate(${layout.boardX + layout.boardWidth / 2 - 82} ${layout.bottomY - 58})">
      <rect width="164" height="36" rx="18" fill="#f3d493"/>
      <text x="82" y="24" text-anchor="middle" class="chipText">${label}</text>
    </g>
  `;
}

function deckLayout() {
  return [
    ["3", "sun"], ["8", "blade"], ["6", "moon"], ["10", "rose"], ["9", "sun"], ["4", "blade"], ["2", "rose"],
    ["7", "moon"], ["J", "sun"], ["5", "rose"], ["A", "blade"], ["Q", "moon"], ["6", "sun"], ["9", "blade"],
    ["4", "moon"], ["8", "sun"], ["K", "rose"], ["5", "blade"], ["2", "moon"], ["7", "rose"], ["10", "blade"],
  ];
}

function moonGlyph() {
  return `<path d="M21 4c-6.4 1.4-11 7-11 13.8 0 7.9 6.4 14.2 14.2 14.2 3 0 5.7-.9 7.9-2.4-2.8 4.3-7.6 7.2-13.1 7.2C10 36.8 3.2 30 3.2 21.6 3.2 13.5 9.5 6.8 17.4 6.3c1.3-.1 2.5 0 3.6.2Z"/>`;
}

function roseGlyph() {
  return `<path d="M18 4c4.5 0 8 2.7 8 6.6 0 1.9-.9 3.7-2.5 5 4.2.5 6.9 3 6.9 6.5 0 4.8-4.8 8.4-11.2 8.4S8 26.9 8 22.1c0-3.4 2.6-5.9 6.6-6.5-1.5-1.3-2.4-3-2.4-5C12.2 6.7 14 4 18 4Zm0 28.5c-1.9 3.1-4.1 5.1-6.6 6.1 2.4-.2 4.9.2 6.6 1.4 1.7-1.1 4.2-1.6 6.6-1.4-2.6-1-4.8-3-6.6-6.1Z"/>`;
}

function sunGlyph() {
  return `<circle cx="18" cy="18" r="7.2"/><path d="M18 1.5v5.2M18 29.3v5.2M1.5 18h5.2M29.3 18h5.2M6 6l3.7 3.7M26.3 26.3 30 30M6 30l3.7-3.7M26.3 9.7 30 6" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>`;
}

function bladeGlyph() {
  return `<path d="M18 2.5 24 10l-2.7 2.6 2.5 2.5-2.3 2.3L24 22l-6 9-6-9 2.5-2.6-2.3-2.3 2.5-2.5L12 10l6-7.5Z"/>`;
}
