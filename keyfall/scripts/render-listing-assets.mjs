import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const listingDir = new URL("../listing/", import.meta.url);
mkdirSync(listingDir, { recursive: true });

const shots = {
  desktop: pngData("screenshot-desktop-live.png"),
  portrait: pngData("screenshot-portrait-live.png"),
};

const outputs = [
  ["hero-landscape-a.svg", buildLandscapeHero("hero-landscape-a", { variant: "a" })],
  ["hero-landscape-b.svg", buildLandscapeHero("hero-landscape-b", { variant: "b" })],
  ["hero-landscape-c.svg", buildLandscapeHero("hero-landscape-c", { variant: "c" })],
  ["hero-portrait-a.svg", buildPortraitHero("hero-portrait-a", { variant: "a" })],
  ["hero-portrait-b.svg", buildPortraitHero("hero-portrait-b", { variant: "b" })],
  ["hero-portrait-c.svg", buildPortraitHero("hero-portrait-c", { variant: "c" })],
  ["icon-a.svg", buildIcon("icon-a", { variant: "a" })],
  ["icon-b.svg", buildIcon("icon-b", { variant: "b" })],
  ["icon-c.svg", buildIcon("icon-c", { variant: "c" })],
];

for (const [name, svg] of outputs) {
  writeFileSync(join(listingDir.pathname, name), svg);
}

copyFileSync(join(listingDir.pathname, "hero-landscape-b.svg"), join(listingDir.pathname, "hero-landscape-final.svg"));
copyFileSync(join(listingDir.pathname, "hero-portrait-b.svg"), join(listingDir.pathname, "hero-portrait-final.svg"));
copyFileSync(join(listingDir.pathname, "icon-b.svg"), join(listingDir.pathname, "icon-final.svg"));

function buildLandscapeHero(theme, { variant }) {
  const base = {
    width: 1600,
    height: 900,
    shot: { uri: shots.desktop, x: 560, y: 96, width: 480, height: 720, radius: 42, opacity: 0.97, id: `${theme}-shot-main` },
    title: { x: 800, y: 448, size: 230 },
    rings: { x: 800, y: 540, start: 470, gap: 132 },
  };

  if (variant === "a") {
    base.shot = { uri: shots.desktop, x: 620, y: 108, width: 360, height: 700, radius: 28, opacity: 0.92, id: `${theme}-shot-main` };
    base.title = { x: 800, y: 440, size: 224 };
    base.rings = { x: 820, y: 500, start: 380, gap: 120 };
  }

  if (variant === "c") {
    base.shot = { uri: shots.desktop, x: 220, y: 116, width: 520, height: 664, radius: 40, opacity: 0.92, id: `${theme}-shot-main` };
    base.title = { x: 1060, y: 440, size: 204 };
    base.rings = { x: 520, y: 558, start: 500, gap: 136 };
  }

  const secondaryShots =
    variant === "c"
      ? [
          { uri: shots.desktop, x: 858, y: 172, width: 284, height: 520, radius: 28, opacity: 0.28, id: `${theme}-shot-side-1` },
          { uri: shots.desktop, x: 1188, y: 220, width: 188, height: 360, radius: 24, opacity: 0.22, id: `${theme}-shot-side-2` },
        ]
      : [];

  const glows =
    variant === "b"
      ? [
          softGlow(theme, 330, 210, 260, "#123a58", 0.72),
          softGlow(theme, 1280, 250, 220, "#3a1536", 0.56),
          softGlow(theme, 820, 700, 360, "#0d4a57", 0.28),
        ]
      : [];

  const tiles =
    variant === "a"
      ? [
          tileRect(theme, 260, 240, 96, 84, "#63e6ff"),
          tileRect(theme, 1280, 230, 92, 82, "#ff88a5"),
          tileRect(theme, 1240, 630, 88, 80, "#ffd780"),
        ]
      : variant === "b"
        ? [
            tileRect(theme, 446, 646, 126, 108, "#63e6ff"),
            tileRect(theme, 1082, 332, 118, 102, "#ff88a5"),
            tileRect(theme, 1008, 612, 110, 96, "#ff88a5"),
            tileRect(theme, 544, 280, 96, 84, "#ffd780"),
          ]
        : [
            tileRect(theme, 1080, 272, 106, 92, "#63e6ff"),
            tileRect(theme, 1208, 356, 94, 84, "#ff88a5"),
            tileRect(theme, 1310, 438, 88, 76, "#ffd780"),
          ];

  return wrap(theme, base.width, base.height, [
    ...glows,
    heroShot(theme, base.shot),
    ...secondaryShots.map((shot) => heroShot(theme, shot)),
    rings(base.rings.x, base.rings.y, base.rings.start, base.rings.gap, 3, base.width / 360),
    ...tiles,
    titleLockup(theme, base.title.x, base.title.y, base.title.size),
  ]);
}

function buildPortraitHero(theme, { variant }) {
  const base = {
    width: 1080,
    height: 1920,
    shot: { uri: shots.portrait, x: 244, y: 332, width: 592, height: 1220, radius: 46, opacity: 0.98, id: `${theme}-shot-main` },
    title: { x: 540, y: 966, size: 210 },
    rings: { x: 540, y: 1140, start: 460, gap: 170 },
  };

  if (variant === "a") {
    base.shot = { uri: shots.portrait, x: 208, y: 350, width: 664, height: 1160, radius: 44, opacity: 0.96, id: `${theme}-shot-main` };
    base.title = { x: 540, y: 940, size: 194 };
    base.rings = { x: 540, y: 1140, start: 420, gap: 160 };
  }

  if (variant === "c") {
    base.shot = { uri: shots.portrait, x: 174, y: 262, width: 432, height: 1320, radius: 46, opacity: 0.92, id: `${theme}-shot-main` };
    base.title = { x: 694, y: 1020, size: 192 };
    base.rings = { x: 416, y: 1180, start: 540, gap: 190 };
  }

  const secondaryShots =
    variant === "c"
      ? [{ uri: shots.portrait, x: 640, y: 372, width: 240, height: 760, radius: 34, opacity: 0.26, id: `${theme}-shot-side-1` }]
      : [];

  const glows =
    variant === "b"
      ? [
          softGlow(theme, 230, 350, 240, "#103a58", 0.66),
          softGlow(theme, 840, 310, 230, "#351739", 0.58),
          softGlow(theme, 520, 1580, 300, "#0f4a57", 0.24),
        ]
      : [];

  const tiles =
    variant === "a"
      ? [
          tileRect(theme, 208, 370, 108, 94, "#63e6ff"),
          tileRect(theme, 812, 410, 108, 94, "#ff88a5"),
          tileRect(theme, 758, 1400, 98, 86, "#ffd780"),
        ]
      : variant === "b"
        ? [
            tileRect(theme, 282, 402, 118, 104, "#63e6ff"),
            tileRect(theme, 774, 454, 114, 102, "#ff88a5"),
            tileRect(theme, 706, 1450, 106, 96, "#ff88a5"),
            tileRect(theme, 352, 1364, 94, 84, "#ffd780"),
          ]
        : [
            tileRect(theme, 740, 408, 98, 88, "#63e6ff"),
            tileRect(theme, 828, 516, 92, 82, "#ff88a5"),
            tileRect(theme, 876, 620, 84, 74, "#ffd780"),
          ];

  return wrap(theme, base.width, base.height, [
    ...glows,
    heroShot(theme, base.shot),
    ...secondaryShots.map((shot) => heroShot(theme, shot)),
    rings(base.rings.x, base.rings.y, base.rings.start, base.rings.gap, 3, 4),
    ...tiles,
    titleLockup(theme, base.title.x, base.title.y, base.title.size),
  ]);
}

function buildIcon(theme, { variant }) {
  const common = [rings(512, 620, 300, 104, 3, 4)];
  const runway = tileRunway(theme, 246, 164, 532, 676);

  const shapes =
    variant === "a"
      ? [
          runway,
          tileRect(theme, 382, 624, 112, 112, "#63e6ff"),
          tileRect(theme, 532, 430, 102, 102, "#ff88a5"),
          tileRect(theme, 614, 298, 74, 74, "#ffd780"),
        ]
      : variant === "b"
        ? [
            softGlow(theme, 512, 720, 260, "#0f4a57", 0.28),
            runway,
            tileRect(theme, 340, 650, 148, 148, "#63e6ff"),
            tileRect(theme, 554, 444, 132, 132, "#ff88a5"),
            tileRect(theme, 476, 268, 100, 100, "#ff88a5"),
            tileRect(theme, 606, 202, 70, 70, "#ffd780"),
          ]
        : [
            softGlow(theme, 292, 258, 220, "#113b58", 0.62),
            softGlow(theme, 744, 250, 220, "#36173a", 0.56),
            laneBars(),
          ];

  return wrap(theme, 1024, 1024, [...common, ...shapes]);
}

function wrap(theme, width, height, content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="${theme}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08131d"/>
      <stop offset="58%" stop-color="#102433"/>
      <stop offset="100%" stop-color="#170f1b"/>
    </linearGradient>
    <linearGradient id="${theme}-runway" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#aab8bf"/>
      <stop offset="100%" stop-color="#6f818a"/>
    </linearGradient>
    <filter id="${theme}-blur"><feGaussianBlur stdDeviation="28"/></filter>
    <filter id="${theme}-soft"><feGaussianBlur stdDeviation="58"/></filter>
    <filter id="${theme}-title"><feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#050b13" flood-opacity="0.42"/></filter>
    <filter id="${theme}-shot-shadow"><feDropShadow dx="0" dy="24" stdDeviation="36" flood-color="#050b13" flood-opacity="0.38"/></filter>
    <linearGradient id="${theme}-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#06111a" stop-opacity="0.72"/>
      <stop offset="35%" stop-color="#06111a" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#06111a" stop-opacity="0.58"/>
    </linearGradient>
    <style>
      text { font-family: "Avenir Next", "SF Pro Display", "Trebuchet MS", sans-serif; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#${theme}-bg)"/>
  <circle cx="${width * 0.18}" cy="${height * 0.22}" r="${width * 0.2}" fill="#123a58" opacity="0.18"/>
  <circle cx="${width * 0.82}" cy="${height * 0.18}" r="${width * 0.18}" fill="#351739" opacity="0.16"/>
  ${content.join("\n")}
</svg>`;
}

function heroShot(theme, shot) {
  return `
    <defs>
      <clipPath id="${shot.id}">
        <rect x="${shot.x}" y="${shot.y}" width="${shot.width}" height="${shot.height}" rx="${shot.radius}"/>
      </clipPath>
    </defs>
    <rect x="${shot.x}" y="${shot.y}" width="${shot.width}" height="${shot.height}" rx="${shot.radius}" fill="#0b1018" opacity="0.78" filter="url(#${theme}-shot-shadow)"/>
    <image href="${shot.uri}" x="${shot.x}" y="${shot.y}" width="${shot.width}" height="${shot.height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${shot.id})" opacity="${shot.opacity}"/>
    <rect x="${shot.x}" y="${shot.y}" width="${shot.width}" height="${shot.height}" rx="${shot.radius}" fill="url(#${theme}-shade)" opacity="0.36"/>
  `;
}

function softGlow(theme, cx, cy, r, color, opacity) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}" filter="url(#${theme}-soft)"/>`;
}

function rings(cx, cy, startRadius, gap, count, strokeWidth) {
  return Array.from({ length: count }, (_, index) => {
    const radius = startRadius + gap * index;
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" stroke="#69e6ff" stroke-width="${strokeWidth}" stroke-opacity="${
      0.1 - index * 0.018
    }" fill="none"/>`;
  }).join("");
}

function titleLockup(theme, x, y, size) {
  return `
    <text x="${x}" y="${y + 16}" fill="#050b13" opacity="0.42" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="800" letter-spacing="-0.05em">Keyfall</text>
    <text x="${x}" y="${y}" fill="#f7fbff" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="800" letter-spacing="-0.05em">Keyfall</text>
  `;
}

function tileRunway(theme, x, topY, width, height) {
  const left = x;
  const right = x + width;
  const farWidth = width * 0.48;
  const farLeft = x + (width - farWidth) / 2;
  const farRight = farLeft + farWidth;
  return `
    <polygon points="${left},${topY + height} ${right},${topY + height} ${farRight},${topY} ${farLeft},${topY}" fill="url(#${theme}-runway)" opacity="0.94"/>
    <line x1="${left + width * 0.25}" y1="${topY + height}" x2="${farLeft + farWidth * 0.25}" y2="${topY}" stroke="#d7fbff" stroke-opacity="0.18" stroke-width="4"/>
    <line x1="${left + width * 0.5}" y1="${topY + height}" x2="${farLeft + farWidth * 0.5}" y2="${topY}" stroke="#d7fbff" stroke-opacity="0.18" stroke-width="4"/>
    <line x1="${left + width * 0.75}" y1="${topY + height}" x2="${farLeft + farWidth * 0.75}" y2="${topY}" stroke="#d7fbff" stroke-opacity="0.18" stroke-width="4"/>
    <line x1="${left - 16}" y1="${topY + height * 0.78}" x2="${right + 16}" y2="${topY + height * 0.78}" stroke="#69e6ff" stroke-opacity="0.16" stroke-width="6"/>
    <line x1="${left - 12}" y1="${topY + height * 0.54}" x2="${right + 12}" y2="${topY + height * 0.54}" stroke="#69e6ff" stroke-opacity="0.14" stroke-width="5"/>
    <line x1="${left - 8}" y1="${topY + height * 0.32}" x2="${right + 8}" y2="${topY + height * 0.32}" stroke="#69e6ff" stroke-opacity="0.12" stroke-width="4"/>
  `;
}

function tileRect(theme, x, y, width, height, color) {
  const radius = Math.round(Math.min(width, height) * 0.22);
  return `
    <g filter="url(#${theme}-blur)">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${color}" opacity="0.28"/>
    </g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${color}"/>
    <rect x="${x + width * 0.12}" y="${y + height * 0.12}" width="${width * 0.76}" height="${height * 0.28}" rx="${
      radius * 0.45
    }" fill="#f7fbff" opacity="0.16"/>
  `;
}

function laneBars() {
  return `
    <g transform="translate(252 246)">
      <rect x="0" y="0" width="116" height="424" rx="34" fill="#111b27" opacity="0.92"/>
      <rect x="136" y="0" width="116" height="424" rx="34" fill="#111b27" opacity="0.92"/>
      <rect x="272" y="0" width="116" height="424" rx="34" fill="#111b27" opacity="0.92"/>
      <rect x="408" y="0" width="116" height="424" rx="34" fill="#111b27" opacity="0.92"/>
      <rect x="36" y="54" width="44" height="164" rx="22" fill="#63e6ff"/>
      <rect x="308" y="248" width="44" height="120" rx="22" fill="#ff88a5"/>
    </g>
  `;
}

function pngData(fileName) {
  return `data:image/png;base64,${readFileSync(join(listingDir.pathname, fileName)).toString("base64")}`;
}
