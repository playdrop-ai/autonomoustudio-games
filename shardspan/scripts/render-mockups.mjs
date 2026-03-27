import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("../mockups/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const desktop = { width: 1600, height: 900 };

const course = {
  start: { x: 220, y: 612, w: 250, h: 114, depth: 108, hue: "stone" },
  relayA: { x: 566, y: 486, w: 230, h: 106, depth: 100, hue: "stone" },
  relayB: { x: 964, y: 352, w: 214, h: 96, depth: 92, hue: "stone" },
  relayC: { x: 1290, y: 260, w: 180, h: 86, depth: 84, hue: "stone" },
  alt: { x: 760, y: 244, w: 208, h: 94, depth: 90, hue: "stone" },
};

const files = [
  { name: "desktop-start.svg", svg: renderStartMockup() },
  { name: "desktop-gameplay.svg", svg: renderGameplayMockup() },
  { name: "desktop-gameover.svg", svg: renderGameOverMockup() },
];

for (const file of files) {
  writeFileSync(join(outDir.pathname, file.name), file.svg);
}

function renderStartMockup() {
  return wrapSvg(
    desktop.width,
    desktop.height,
    `
      ${background()}
      ${courseScene({
        activePhase: "amber",
        progress: "0 / 4",
        timerLabel: "75.0",
        timerWidth: 1,
        nextBeacon: "Beacon One",
        player: { x: 330, y: 574, pose: "ready" },
        activeBeacon: "relayA",
        showBridgeToAlt: false,
        showHud: false,
      })}
      <g transform="translate(1244 94)">
        <rect width="238" height="64" rx="22" fill="#111826" opacity="0.88"/>
        <text x="119" y="24" text-anchor="middle" class="hintLabel">BEST RUN</text>
        <text x="119" y="48" text-anchor="middle" class="phaseLabel">38.6s</text>
      </g>
      <g transform="translate(120 108)">
        <text x="0" y="0" class="eyebrow">PHASE-SWITCH SKY RELAY</text>
        <text x="0" y="84" class="title">Shardspan</text>
        <text x="0" y="140" class="subtitle">Flip beacons. Make the next bridge real. Reach the exit before dusk wins.</text>
        <g transform="translate(0 398)">
          <rect width="280" height="86" rx="24" fill="#ffcf68"/>
          <rect x="6" y="6" width="268" height="74" rx="20" fill="url(#buttonFill)"/>
          <text x="140" y="53" text-anchor="middle" class="buttonLabel">Start Run</text>
        </g>
      </g>
      <g transform="translate(120 792)">
        <text x="0" y="0" class="hintLabel">MOVE</text>
        <text x="124" y="0" class="hintLabel">LOOK</text>
        <text x="238" y="0" class="hintLabel">JUMP</text>
        ${controlKey(0, 22, "WASD")}
        ${controlKey(124, 22, "MOUSE")}
        ${controlKey(238, 22, "SPACE")}
      </g>
    `,
  );
}

function renderGameplayMockup() {
  return wrapSvg(
    desktop.width,
    desktop.height,
    `
      ${background()}
      ${courseScene({
        activePhase: "azure",
        progress: "2 / 4",
        timerLabel: "42.8",
        timerWidth: 0.57,
        nextBeacon: "Beacon Three",
        player: { x: 880, y: 402, pose: "jump" },
        activeBeacon: "relayB",
        showBridgeToAlt: true,
      })}
    `,
  );
}

function renderGameOverMockup() {
  return wrapSvg(
    desktop.width,
    desktop.height,
    `
      ${background()}
      ${courseScene({
        activePhase: "amber",
        progress: "3 / 4",
        timerLabel: "00.0",
        timerWidth: 0.06,
        nextBeacon: "Beacon Four",
        player: { x: 1150, y: 334, pose: "fall" },
        activeBeacon: "relayC",
        showBridgeToAlt: true,
        dim: true,
      })}
      <g transform="translate(948 110)">
        <rect width="500" height="672" rx="34" fill="#0c1120" opacity="0.74"/>
        <rect x="18" y="18" width="464" height="636" rx="28" fill="#111a2e" opacity="0.96"/>
        <text x="232" y="128" text-anchor="middle" class="panelTitle">The Span Went Dark</text>
        <text x="232" y="178" text-anchor="middle" class="panelCopy">
          <tspan x="232" dy="0">One beacon remained when dusk</tspan>
          <tspan x="232" dy="30">collapsed the last route.</tspan>
        </text>
        <text x="146" y="306" text-anchor="middle" class="panelLabel">CHECKPOINTS</text>
        <text x="146" y="372" text-anchor="middle" class="panelValue">3 / 4</text>
        <text x="330" y="306" text-anchor="middle" class="panelLabel">BEST</text>
        <text x="330" y="372" text-anchor="middle" class="panelValue">38.6s</text>
        <text x="232" y="474" text-anchor="middle" class="panelLabel">FALL PENALTIES</text>
        <text x="232" y="532" text-anchor="middle" class="panelMiniValue">2</text>
        <g transform="translate(112 564)">
          <rect width="240" height="80" rx="22" fill="#ffcf68"/>
          <rect x="6" y="6" width="228" height="68" rx="18" fill="url(#buttonFill)"/>
          <text x="120" y="49" text-anchor="middle" class="buttonLabel">Retry</text>
        </g>
      </g>
    `,
  );
}

function courseScene(scene) {
  const islands = [
    island(course.start),
    island(course.relayA),
    island(course.relayB),
    island(course.relayC),
    island(course.alt),
  ].join("\n");
  const bridgePrimary = bridge(course.start, course.relayA, "amber", scene.activePhase === "amber");
  const bridgeSecondary = bridge(course.relayA, course.relayB, "azure", scene.activePhase === "azure");
  const bridgeFinal = bridge(course.relayB, course.relayC, "amber", scene.activePhase === "amber");
  const bridgeAlt = bridge(course.relayA, course.alt, "amber", scene.showBridgeToAlt && scene.activePhase === "amber", 0.38);
  const beacons = [
    beacon(course.relayA, "amber", scene.activeBeacon === "relayA"),
    beacon(course.relayB, "azure", scene.activeBeacon === "relayB"),
    beacon(course.relayC, "amber", scene.activeBeacon === "relayC"),
  ].join("\n");
  return `
    ${islands}
    ${bridgePrimary}
    ${bridgeSecondary}
    ${bridgeFinal}
    ${bridgeAlt}
    ${beacons}
    ${player(scene.player)}
    ${scene.showHud === false ? "" : hud(scene)}
  `;
}

function island({ x, y, w, h, depth }) {
  const inset = 34;
  return `
    <g>
      <polygon points="${x},${y} ${x + w},${y} ${x + w - 28},${y + h} ${x + 28},${y + h}" fill="url(#stoneTop)"/>
      <polygon points="${x + w},${y} ${x + w - 28},${y + h} ${x + w - 28},${y + h + depth} ${x + w},${y + depth}" fill="#5d5466"/>
      <polygon points="${x + 28},${y + h} ${x + w - 28},${y + h} ${x + w - 28},${y + h + depth} ${x + 28},${y + h + depth}" fill="#453d53"/>
      <polygon points="${x},${y} ${x + 28},${y + h} ${x + 28},${y + h + depth} ${x},${y + depth}" fill="#2b2432"/>
      <polygon points="${x + inset},${y + 16} ${x + w - inset},${y + 16} ${x + w - 48},${y + h - 14} ${x + 48},${y + h - 14}" fill="url(#grassTop)" opacity="0.9"/>
      <ellipse cx="${x + w * 0.5}" cy="${y + h + depth + 18}" rx="${w * 0.34}" ry="24" fill="#080b13" opacity="0.32"/>
    </g>
  `;
}

function bridge(from, to, color, active, inactiveOpacity = 0.18) {
  const startX = from.x + from.w - 44;
  const startY = from.y + from.h * 0.68;
  const endX = to.x + 44;
  const endY = to.y + to.h * 0.68;
  const dx = (endX - startX) / 6;
  const dy = (endY - startY) / 6;
  const fill = color === "amber" ? "url(#amberBridge)" : "url(#azureBridge)";
  const stroke = color === "amber" ? "#ffe39f" : "#bce8ff";
  return Array.from({ length: 5 }, (_, index) => {
    const x = startX + dx * index;
    const y = startY + dy * index;
    const nextX = x + dx * 0.88;
    const nextY = y + dy * 0.88;
    return `
      <g opacity="${active ? 1 : inactiveOpacity}">
        <polygon points="${x},${y} ${x + 12},${y - 22} ${nextX + 12},${nextY - 22} ${nextX},${nextY}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
        <polygon points="${x},${y} ${nextX},${nextY} ${nextX},${nextY + 22} ${x},${y + 22}" fill="${active ? "#342c3f" : "#1a1722"}"/>
      </g>
    `;
  }).join("\n");
}

function beacon(platform, color, active) {
  const x = platform.x + platform.w * 0.5;
  const y = platform.y + 8;
  const beam = color === "amber" ? "url(#amberBeam)" : "url(#azureBeam)";
  const glow = color === "amber" ? "#ffd76f" : "#72d9ff";
  return `
    <g>
      <ellipse cx="${x}" cy="${y + 20}" rx="76" ry="18" fill="${glow}" opacity="${active ? 0.26 : 0.12}"/>
      <rect x="${x - 10}" y="${y - 126}" width="20" height="138" rx="10" fill="${beam}" opacity="${active ? 0.95 : 0.54}"/>
      <polygon points="${x},${y - 154} ${x + 18},${y - 120} ${x},${y - 86} ${x - 18},${y - 120}" fill="${glow}" opacity="${active ? 1 : 0.66}"/>
      <polygon points="${x},${y - 74} ${x + 24},${y - 20} ${x},${y + 18} ${x - 24},${y - 20}" fill="#1b2030"/>
    </g>
  `;
}

function player({ x, y, pose }) {
  const rotation = pose === "jump" ? -14 : pose === "fall" ? 18 : 0;
  const scale = pose === "jump" ? 1.08 : 1;
  return `
    <g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">
      <ellipse cx="0" cy="48" rx="22" ry="10" fill="#080b13" opacity="0.34"/>
      <rect x="-9" y="-24" width="18" height="40" rx="9" fill="#ffe6ad"/>
      <rect x="-18" y="-8" width="36" height="18" rx="9" fill="#f9737f"/>
      <circle cx="0" cy="-36" r="14" fill="#ffe6ad"/>
      <rect x="-22" y="8" width="10" height="28" rx="5" fill="#6bd2ff"/>
      <rect x="12" y="8" width="10" height="28" rx="5" fill="#6bd2ff"/>
      <rect x="-12" y="32" width="9" height="24" rx="4.5" fill="#2f3448"/>
      <rect x="3" y="32" width="9" height="24" rx="4.5" fill="#2f3448"/>
    </g>
  `;
}

function hud(scene) {
  const phaseLabel = scene.activePhase === "amber" ? "Amber Route" : "Azure Route";
  const phaseFill = scene.activePhase === "amber" ? "#ffcf68" : "#7ad8ff";
  return `
    <g transform="translate(82 70)">
      <text x="0" y="0" class="hudLabel">TIME</text>
      <text x="0" y="54" class="hudValue">${scene.timerLabel}</text>
      <rect x="0" y="78" width="240" height="18" rx="9" fill="#172133"/>
      <rect x="0" y="78" width="${240 * scene.timerWidth}" height="18" rx="9" fill="url(#timerFill)"/>
    </g>
    <g transform="translate(1248 70)">
      <text x="270" y="0" text-anchor="end" class="hudLabel">RELAY</text>
      <text x="270" y="54" text-anchor="end" class="hudValue">${scene.progress}</text>
      <rect x="40" y="78" width="230" height="22" rx="11" fill="#152030"/>
      <rect x="40" y="78" width="230" height="22" rx="11" fill="#ffffff" opacity="0.05"/>
      <text x="155" y="94" text-anchor="middle" class="phaseLabel" fill="${phaseFill}">${phaseLabel}</text>
    </g>
    <g transform="translate(654 58)">
      <rect width="292" height="62" rx="22" fill="#111826" opacity="0.86"/>
      <text x="146" y="24" text-anchor="middle" class="hintLabel">NEXT</text>
      <text x="146" y="48" text-anchor="middle" class="phaseLabel">${scene.nextBeacon}</text>
    </g>
  `;
}

function controlKey(x, y, label) {
  return `
    <g transform="translate(${x} ${y})">
      <rect width="88" height="42" rx="14" fill="#111826" opacity="0.86"/>
      <text x="44" y="27" text-anchor="middle" class="controlLabel">${label}</text>
    </g>
  `;
}

function background() {
  return `
    <rect width="${desktop.width}" height="${desktop.height}" fill="url(#sky)"/>
    <circle cx="1210" cy="164" r="112" fill="#ffb56e" opacity="0.18"/>
    <circle cx="1350" cy="196" r="178" fill="#6d67ff" opacity="0.14"/>
    <ellipse cx="800" cy="844" rx="710" ry="176" fill="#06080f" opacity="0.4"/>
    <path d="M0 672 C240 628 480 724 760 672 C1010 624 1300 548 1600 620 L1600 900 L0 900 Z" fill="#0a1020" opacity="0.9"/>
    <path d="M0 702 C280 646 520 760 820 708 C1070 664 1320 590 1600 654 L1600 900 L0 900 Z" fill="#111a2d" opacity="0.72"/>
    ${stars()}
  `;
}

function stars() {
  const points = [
    [118, 96], [232, 168], [362, 118], [488, 214], [672, 126], [842, 206], [986, 118], [1144, 92],
    [1296, 142], [1450, 102], [1358, 278], [1194, 312], [1036, 244], [872, 298], [706, 240], [548, 314],
  ];
  return points
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff2d8" opacity="0.8"/><circle cx="${x}" cy="${y}" r="9" fill="#fff2d8" opacity="0.08"/>`)
    .join("\n");
}

function wrapSvg(width, height, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0.92" y2="1">
      <stop offset="0%" stop-color="#130f26"/>
      <stop offset="46%" stop-color="#1d1b3c"/>
      <stop offset="100%" stop-color="#101827"/>
    </linearGradient>
    <linearGradient id="stoneTop" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7f7387"/>
      <stop offset="100%" stop-color="#60586b"/>
    </linearGradient>
    <linearGradient id="grassTop" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38475a"/>
      <stop offset="100%" stop-color="#2b3645"/>
    </linearGradient>
    <linearGradient id="amberBridge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff2b0"/>
      <stop offset="100%" stop-color="#ffb646"/>
    </linearGradient>
    <linearGradient id="azureBridge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d4f7ff"/>
      <stop offset="100%" stop-color="#4fbfff"/>
    </linearGradient>
    <linearGradient id="amberBeam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff0a8" stop-opacity="0"/>
      <stop offset="40%" stop-color="#ffe97d" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ffb146" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="azureBeam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d6fbff" stop-opacity="0"/>
      <stop offset="40%" stop-color="#95ecff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#4db8ff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="buttonFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffef9c"/>
      <stop offset="100%" stop-color="#ffb147"/>
    </linearGradient>
    <linearGradient id="timerFill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffdf7a"/>
      <stop offset="100%" stop-color="#ff6f78"/>
    </linearGradient>
    <style>
      .eyebrow { fill: #9fb0c8; font: 600 18px/1.2 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: 0.28em; }
      .title { fill: #f8f4ec; font: 800 72px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: -0.04em; }
      .subtitle { fill: #d5dcec; font: 500 29px/1.42 "Avenir Next", Helvetica, Arial, sans-serif; }
      .buttonLabel { fill: #24160b; font: 800 30px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: -0.02em; }
      .hintLabel { fill: #8c9ab5; font: 700 15px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: 0.18em; text-transform: uppercase; }
      .controlLabel { fill: #e4e9f3; font: 700 16px/1 "Avenir Next", Helvetica, Arial, sans-serif; }
      .hudLabel { fill: #9fb0c8; font: 700 16px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: 0.22em; }
      .hudValue { fill: #f8f4ec; font: 800 42px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: -0.04em; }
      .phaseLabel { fill: #f8f4ec; font: 700 20px/1 "Avenir Next", Helvetica, Arial, sans-serif; }
      .accentLabel { fill: #ffcf68; font: 700 20px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: 0.1em; }
      .panelTitle { fill: #f8f4ec; font: 800 44px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: -0.04em; }
      .panelCopy { fill: #ced6e8; font: 500 22px/1.45 "Avenir Next", Helvetica, Arial, sans-serif; }
      .panelLabel { fill: #91a1bd; font: 700 15px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: 0.22em; }
      .panelValue { fill: #f8f4ec; font: 800 40px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: -0.03em; }
      .panelMiniValue { fill: #f8f4ec; font: 800 34px/1 "Avenir Next", Helvetica, Arial, sans-serif; letter-spacing: -0.03em; }
    </style>
  </defs>
  ${body}
</svg>`;
}
