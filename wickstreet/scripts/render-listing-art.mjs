import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const listingDir = path.join(rootDir, 'listing');
const shotPath = path.join(rootDir, 'tmp', 'crops', 'hero-reference.png');
const cropPath = path.join(rootDir, 'tmp', 'crops', 'icon-reference.png');

if (!fs.existsSync(shotPath) || !fs.existsSync(cropPath)) {
  throw new Error('wickstreet_art_refs_missing: run node scripts/capture-media.mjs first');
}

fs.mkdirSync(listingDir, { recursive: true });

const shotData = `data:image/png;base64,${fs.readFileSync(shotPath, 'base64')}`;
const cropData = `data:image/png;base64,${fs.readFileSync(cropPath, 'base64')}`;
const browser = await chromium.launch({ headless: true });

try {
  for (const variant of ['a', 'b', 'c']) {
    await renderArt({
      variant,
      kind: 'hero-landscape',
      width: 1600,
      height: 900,
      outputPng: path.join(listingDir, `hero-landscape-${variant}.png`),
      outputSvg: path.join(listingDir, `hero-landscape-${variant}.svg`),
    });
    await renderArt({
      variant,
      kind: 'hero-portrait',
      width: 1080,
      height: 1920,
      outputPng: path.join(listingDir, `hero-portrait-${variant}.png`),
      outputSvg: path.join(listingDir, `hero-portrait-${variant}.svg`),
    });
    await renderArt({
      variant,
      kind: 'icon',
      width: 1024,
      height: 1024,
      outputPng: path.join(listingDir, `icon-${variant}.png`),
      outputSvg: path.join(listingDir, `icon-${variant}.svg`),
    });
  }

  console.log(JSON.stringify({
    ok: true,
    listingDir,
  }, null, 2));
} finally {
  await browser.close();
}

async function renderArt({ variant, kind, width, height, outputPng, outputSvg }) {
  const svg = buildSvg({ variant, kind, width, height });
  fs.writeFileSync(outputSvg, svg, 'utf8');

  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`
    <!doctype html>
    <html>
      <body style="margin:0;background:#050c16;overflow:hidden;">
        ${svg}
      </body>
    </html>
  `, { waitUntil: 'load' });
  await page.screenshot({ path: outputPng });
  await page.close();
}

function buildSvg({ variant, kind, width, height }) {
  const id = `${kind}-${variant}`.replace(/[^a-z0-9-]/gi, '-');
  const isIcon = kind === 'icon';
  const isPortrait = kind === 'hero-portrait';
  const bgSource = isIcon ? cropData : shotData;
  const fontSize = isPortrait ? 170 : 132;
  const titleY = isPortrait ? height * 0.52 : height * 0.5;
  const titleScale = variant === 'c' ? 1.06 : variant === 'b' ? 1.0 : 0.96;
  const accentX = variant === 'a' ? width * 0.22 : variant === 'b' ? width * 0.76 : width * 0.52;
  const accentY = variant === 'a' ? height * 0.68 : variant === 'b' ? height * 0.24 : height * 0.78;
  const panelNodes = isIcon ? '' : heroPanels({ variant, kind, width, height });
  const titleNode = isIcon ? '' : titleLockup({ width, height, fontSize, titleY, titleScale, variant, id });
  const subjectNode = isIcon
    ? iconScene({ variant, width, height, id })
    : heroScene({ variant, kind, width, height, id });

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#091221"/>
      <stop offset="52%" stop-color="#102845"/>
      <stop offset="100%" stop-color="#08101c"/>
    </linearGradient>
    <linearGradient id="${id}-glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffd879"/>
      <stop offset="52%" stop-color="#ff8f5b"/>
      <stop offset="100%" stop-color="#43d3df"/>
    </linearGradient>
    <linearGradient id="${id}-road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(15,29,49,0.0)"/>
      <stop offset="100%" stop-color="rgba(8,16,29,0.82)"/>
    </linearGradient>
    <filter id="${id}-blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${isIcon ? 18 : 28}"/>
    </filter>
    <filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${isIcon ? 42 : 56}"/>
    </filter>
    <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${isPortrait ? 24 : 18}" stdDeviation="${isPortrait ? 24 : 18}" flood-color="#040811" flood-opacity="0.46"/>
    </filter>
    <clipPath id="${id}-panel-left">
      <rect x="${width * 0.06}" y="${isPortrait ? height * 0.08 : height * 0.18}" width="${isPortrait ? width * 0.84 : width * 0.22}" height="${isPortrait ? height * 0.22 : height * 0.54}" rx="${isPortrait ? 46 : 30}"/>
    </clipPath>
    <clipPath id="${id}-panel-right">
      <rect x="${isPortrait ? width * 0.16 : width * 0.74}" y="${isPortrait ? height * 0.72 : height * 0.12}" width="${isPortrait ? width * 0.68 : width * 0.18}" height="${isPortrait ? height * 0.16 : height * 0.34}" rx="${isPortrait ? 40 : 26}"/>
    </clipPath>
    <mask id="${id}-vignette">
      <rect width="${width}" height="${height}" fill="white"/>
      <ellipse cx="${accentX}" cy="${accentY}" rx="${width * (isPortrait ? 0.34 : 0.28)}" ry="${height * (isPortrait ? 0.22 : 0.18)}" fill="black" opacity="0.34"/>
    </mask>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#${id}-bg)"/>
  <image href="${bgSource}" x="${-width * 0.08}" y="${-height * 0.04}" width="${width * 1.16}" height="${height * 1.08}" preserveAspectRatio="xMidYMid slice" opacity="${isIcon ? 0.92 : 0.74}" filter="url(#${id}-blur)"/>
  <rect width="${width}" height="${height}" fill="#08101c" opacity="${isIcon ? 0.22 : 0.34}" mask="url(#${id}-vignette)"/>
  ${rainLayer({ width, height, variant })}
  ${roadBands({ width, height, variant, kind, id })}
  ${panelNodes}
  ${subjectNode}
  ${sigilChips({ width, height, variant, kind })}
  ${titleNode}
</svg>`;
}

function heroPanels({ variant, kind, width, height }) {
  const isPortrait = kind === 'hero-portrait';
  const leftOpacity = variant === 'b' ? 0.24 : 0.32;
  const rightOpacity = variant === 'c' ? 0.34 : 0.26;
  return `
  <image href="${shotData}" x="${width * (isPortrait ? -0.08 : -0.12)}" y="${height * (isPortrait ? -0.04 : 0.02)}" width="${width * (isPortrait ? 1.08 : 0.46)}" height="${height * (isPortrait ? 0.4 : 0.72)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${kind}-${variant}-panel-left)" opacity="${leftOpacity}"/>
  <rect x="${width * 0.06}" y="${isPortrait ? height * 0.08 : height * 0.18}" width="${isPortrait ? width * 0.84 : width * 0.22}" height="${isPortrait ? height * 0.22 : height * 0.54}" rx="${isPortrait ? 46 : 30}" fill="rgba(8,16,29,0.16)" stroke="rgba(186,220,255,0.18)" stroke-width="${isPortrait ? 3 : 2}"/>
  <image href="${cropData}" x="${isPortrait ? width * 0.06 : width * 0.66}" y="${isPortrait ? height * 0.68 : height * 0.02}" width="${isPortrait ? width * 0.88 : width * 0.36}" height="${isPortrait ? height * 0.28 : height * 0.56}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${kind}-${variant}-panel-right)" opacity="${rightOpacity}"/>
  <rect x="${isPortrait ? width * 0.16 : width * 0.74}" y="${isPortrait ? height * 0.72 : height * 0.12}" width="${isPortrait ? width * 0.68 : width * 0.18}" height="${isPortrait ? height * 0.16 : height * 0.34}" rx="${isPortrait ? 40 : 26}" fill="rgba(8,16,29,0.18)" stroke="rgba(255,235,196,0.18)" stroke-width="${isPortrait ? 3 : 2}"/>
  `;
}

function titleLockup({ width, height, fontSize, titleY, titleScale, variant, id }) {
  const subtitle = variant === 'a' ? 'MATCH THE GLOW. RELIGHT THE BLOCK.' : variant === 'b' ? 'RUN THE ROUTE BEFORE THE BLACKOUT WINS.' : 'QUEUE THE NEXT HOME. CUT THE STREET. STAY LIT.';
  return `
  <g filter="url(#${id}-shadow)">
    <text x="${width / 2}" y="${titleY}" text-anchor="middle" dominant-baseline="middle"
      font-family="'Avenir Next', 'Helvetica Neue', Arial, sans-serif"
      font-size="${fontSize * titleScale}" font-weight="900" letter-spacing="${fontSize * 0.065}" fill="#f7f7f2">WICKSTREET</text>
  </g>
  <text x="${width / 2}" y="${titleY + fontSize * 0.6}" text-anchor="middle" dominant-baseline="middle"
    font-family="'Avenir Next', 'Helvetica Neue', Arial, sans-serif"
    font-size="${Math.round(fontSize * 0.16)}" font-weight="700" letter-spacing="${Math.round(fontSize * 0.09)}" fill="rgba(232,244,255,0.72)">${subtitle}</text>
  `;
}

function roadBands({ width, height, variant, kind, id }) {
  const isIcon = kind === 'icon';
  const centerWidth = isIcon ? width * 0.54 : width * (kind === 'hero-portrait' ? 0.64 : 0.42);
  const centerX = (width - centerWidth) / 2;
  const skew = variant === 'b' ? width * 0.08 : variant === 'c' ? -width * 0.06 : width * 0.04;
  return `
  <g opacity="${isIcon ? 0.72 : 0.58}">
    <path d="M ${centerX + skew} 0 L ${centerX + centerWidth + skew} 0 L ${centerX + centerWidth - skew} ${height} L ${centerX - skew} ${height} Z" fill="#203049"/>
    <path d="M ${centerX + skew + centerWidth * 0.18} 0 L ${centerX + skew + centerWidth * 0.2} 0 L ${centerX - skew + centerWidth * 0.62} ${height} L ${centerX - skew + centerWidth * 0.6} ${height} Z" fill="rgba(188,214,244,0.18)"/>
    <path d="M ${centerX + skew + centerWidth * 0.8} 0 L ${centerX + skew + centerWidth * 0.82} 0 L ${centerX - skew + centerWidth * 0.38} ${height} L ${centerX - skew + centerWidth * 0.36} ${height} Z" fill="rgba(188,214,244,0.18)"/>
    <ellipse cx="${width * (variant === 'a' ? 0.52 : variant === 'b' ? 0.48 : 0.5)}" cy="${height * (kind === 'hero-portrait' ? 0.58 : 0.56)}" rx="${centerWidth * 0.54}" ry="${height * 0.24}" fill="url(#${id}-glow)" opacity="${isIcon ? 0.36 : 0.28}" filter="url(#${id}-soft)"/>
  </g>`;
}

function heroScene({ variant, kind, width, height, id }) {
  const isPortrait = kind === 'hero-portrait';
  const courierX = variant === 'b' ? width * 0.28 : variant === 'c' ? width * 0.66 : width * 0.22;
  const courierY = isPortrait ? height * 0.72 : height * 0.68;
  const houseX = variant === 'b' ? width * 0.78 : variant === 'c' ? width * 0.24 : width * 0.74;
  const houseY = isPortrait ? height * 0.28 : height * 0.24;
  return `
  ${homeCluster({ x: houseX, y: houseY, scale: isPortrait ? 1.16 : 1.0, id })}
  ${courierFigure({ x: courierX, y: courierY, scale: isPortrait ? 1.2 : 1.0, id, variant })}
  ${orbTrail({ x1: courierX, y1: courierY - 48, x2: houseX - 10, y2: houseY + 40, scale: isPortrait ? 1.18 : 1.0, id })}
  `;
}

function iconScene({ variant, width, height, id }) {
  const centerX = width * 0.52;
  const centerY = height * 0.56;
  return `
  <image href="${cropData}" x="-40" y="-10" width="${width + 80}" height="${height + 20}" preserveAspectRatio="xMidYMid slice" opacity="0.28" filter="url(#${id}-blur)"/>
  <rect width="${width}" height="${height}" fill="rgba(8,16,29,0.24)"/>
  ${homeCluster({ x: width * 0.72, y: height * 0.26, scale: 0.9, id })}
  ${courierFigure({ x: width * 0.34, y: height * 0.7, scale: 1.16, id, variant })}
  <circle cx="${centerX}" cy="${centerY}" r="${width * 0.13}" fill="url(#icon-${variant}-glow)" opacity="0.86"/>
  <circle cx="${centerX}" cy="${centerY}" r="${width * 0.06}" fill="#fff3c8"/>
  <path d="M ${width * 0.18} ${height * 0.86} Q ${width * 0.42} ${height * 0.58}, ${width * 0.72} ${height * 0.28}" stroke="rgba(255,237,195,0.82)" stroke-width="${width * 0.024}" stroke-linecap="round" fill="none"/>
  <path d="M ${width * 0.14} ${height * 0.84} Q ${width * 0.38} ${height * 0.54}, ${width * 0.68} ${height * 0.24}" stroke="rgba(67,211,223,0.38)" stroke-width="${width * 0.044}" stroke-linecap="round" fill="none" filter="url(#${id}-soft)"/>
  `;
}

function courierFigure({ x, y, scale, id, variant }) {
  const body = 52 * scale;
  const satchelX = variant === 'c' ? x + body * 0.42 : x + body * 0.34;
  return `
  <g filter="url(#${id}-shadow)">
    <ellipse cx="${x}" cy="${y}" rx="${body * 0.9}" ry="${body * 1.04}" fill="rgba(255,216,121,0.18)" filter="url(#${id}-soft)"/>
    <circle cx="${x}" cy="${y - body * 0.92}" r="${body * 0.28}" fill="#ffe8b7"/>
    <path d="M ${x - body * 0.36} ${y - body * 0.56} Q ${x} ${y - body * 1.02} ${x + body * 0.44} ${y - body * 0.44} L ${x + body * 0.18} ${y + body * 0.54} Q ${x} ${y + body * 0.86} ${x - body * 0.26} ${y + body * 0.48} Z" fill="#f1cb56"/>
    <circle cx="${satchelX}" cy="${y - body * 0.12}" r="${body * 0.22}" fill="#ffd879"/>
    <circle cx="${satchelX}" cy="${y - body * 0.12}" r="${body * 0.38}" fill="rgba(255,216,121,0.34)" filter="url(#${id}-soft)"/>
  </g>
  `;
}

function homeCluster({ x, y, scale, id }) {
  const w = 220 * scale;
  const h = 148 * scale;
  return `
  <g filter="url(#${id}-shadow)">
    <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${28 * scale}" fill="#1a3047" stroke="#4a6b8d" stroke-width="${4 * scale}"/>
    <rect x="${x - w * 0.17}" y="${y - h * 0.18}" width="${w * 0.16}" height="${h * 0.16}" rx="${8 * scale}" fill="#ffe39b"/>
    <rect x="${x + w * 0.02}" y="${y - h * 0.18}" width="${w * 0.16}" height="${h * 0.16}" rx="${8 * scale}" fill="#ffe39b"/>
    <rect x="${x - w * 0.17}" y="${y + h * 0.04}" width="${w * 0.16}" height="${h * 0.16}" rx="${8 * scale}" fill="#ffd779"/>
    <rect x="${x + w * 0.02}" y="${y + h * 0.04}" width="${w * 0.16}" height="${h * 0.16}" rx="${8 * scale}" fill="#ffd779"/>
    <circle cx="${x + w * 0.24}" cy="${y + h * 0.18}" r="${24 * scale}" fill="rgba(67,211,223,0.28)" filter="url(#${id}-soft)"/>
    ${sigil('drop', x + w * 0.24, y + h * 0.18, 32 * scale, '#43d3df')}
  </g>
  `;
}

function orbTrail({ x1, y1, x2, y2, scale, id }) {
  return `
  <path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 110 * scale}, ${x2} ${y2}" stroke="rgba(255,224,146,0.9)" stroke-width="${14 * scale}" stroke-linecap="round" fill="none"/>
  <path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 110 * scale}, ${x2} ${y2}" stroke="rgba(67,211,223,0.32)" stroke-width="${28 * scale}" stroke-linecap="round" fill="none" filter="url(#${id}-soft)"/>
  `;
}

function sigilChips({ width, height, variant, kind }) {
  const isIcon = kind === 'icon';
  const size = isIcon ? 94 : kind === 'hero-portrait' ? 104 : 82;
  const chips = [
    { kind: 'sun', x: width * 0.1, y: height * 0.16, color: '#f0a53d' },
    { kind: 'drop', x: width * 0.9, y: height * 0.18, color: '#43d3df' },
    { kind: 'leaf', x: width * 0.12, y: height * 0.84, color: '#72d97c' },
    { kind: 'star', x: width * 0.9, y: height * 0.82, color: '#f073c2' },
  ];
  return chips.map(chip => `
    <g transform="translate(${chip.x} ${chip.y})">
      <rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size * 0.28}" fill="rgba(8,16,29,0.72)" stroke="rgba(238,245,255,0.14)" stroke-width="${isIcon ? 3 : 2}"/>
      ${sigil(chip.kind, 0, 0, size * 0.28, chip.color)}
    </g>
  `).join('\n');
}

function rainLayer({ width, height, variant }) {
  const lines = [];
  for (let index = 0; index < 36; index += 1) {
    const x = (index * 73 + variant.charCodeAt(0) * 19) % Math.round(width + 140);
    const y = (index * 41 + variant.charCodeAt(0) * 13) % Math.round(height + 120);
    lines.push(`<line x1="${x}" y1="${y}" x2="${x - 38}" y2="${y + 92}" stroke="rgba(222,235,255,0.14)" stroke-width="3" stroke-linecap="round"/>`);
  }
  return `<g>${lines.join('')}</g>`;
}

function sigil(kind, x, y, size, color) {
  if (kind === 'sun') {
    return `
      <g transform="translate(${x} ${y})" stroke="${color}" stroke-width="${size * 0.18}" stroke-linecap="round" fill="none">
        <circle r="${size * 0.42}" fill="${color}" opacity="0.16"/>
        <circle r="${size * 0.22}" fill="${color}" stroke="none"/>
        <path d="M 0 ${-size * 0.62} L 0 ${-size * 0.38} M 0 ${size * 0.38} L 0 ${size * 0.62} M ${-size * 0.62} 0 L ${-size * 0.38} 0 M ${size * 0.38} 0 L ${size * 0.62} 0 M ${-size * 0.44} ${-size * 0.44} L ${-size * 0.26} ${-size * 0.26} M ${size * 0.44} ${size * 0.44} L ${size * 0.26} ${size * 0.26} M ${-size * 0.44} ${size * 0.44} L ${-size * 0.26} ${size * 0.26} M ${size * 0.44} ${-size * 0.44} L ${size * 0.26} ${-size * 0.26}"/>
      </g>`;
  }
  if (kind === 'drop') {
    return `<path d="M ${x} ${y - size * 0.62} C ${x + size * 0.4} ${y - size * 0.12}, ${x + size * 0.34} ${y + size * 0.46}, ${x} ${y + size * 0.56} C ${x - size * 0.34} ${y + size * 0.46}, ${x - size * 0.4} ${y - size * 0.12}, ${x} ${y - size * 0.62} Z" fill="${color}"/>`;
  }
  if (kind === 'leaf') {
    return `
      <g transform="translate(${x} ${y})">
        <path d="M 0 ${-size * 0.62} C ${size * 0.42} ${-size * 0.28}, ${size * 0.48} ${size * 0.2}, 0 ${size * 0.58} C ${-size * 0.48} ${size * 0.2}, ${-size * 0.42} ${-size * 0.28}, 0 ${-size * 0.62} Z" fill="${color}"/>
        <path d="M 0 ${-size * 0.46} L 0 ${size * 0.42}" stroke="#eef4ff" stroke-width="${size * 0.09}" stroke-linecap="round"/>
      </g>`;
  }
  return `
    <g transform="translate(${x} ${y})" fill="${color}">
      <path d="M 0 ${-size * 0.68} L ${size * 0.18} ${-size * 0.18} L ${size * 0.68} 0 L ${size * 0.18} ${size * 0.18} L 0 ${size * 0.68} L ${-size * 0.18} ${size * 0.18} L ${-size * 0.68} 0 L ${-size * 0.18} ${-size * 0.18} Z"/>
    </g>`;
}
