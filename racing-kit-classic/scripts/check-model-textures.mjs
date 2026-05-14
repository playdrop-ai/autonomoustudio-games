import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const MODELS_DIR = new URL('../assets/models/', import.meta.url);

function readGlbJson(filePath) {
  const buffer = readFileSync(filePath);
  const magic = buffer.toString('utf8', 0, 4);
  if (magic !== 'glTF') {
    throw new Error(`[starter-kit-racing] ${path.basename(filePath)} is not a valid GLB file.`);
  }
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.toString('utf8', 16, 20);
  if (jsonChunkType !== 'JSON') {
    throw new Error(`[starter-kit-racing] ${path.basename(filePath)} is missing the GLB JSON chunk.`);
  }
  return JSON.parse(buffer.toString('utf8', 20, 20 + jsonChunkLength));
}

function main() {
  const dirPath = MODELS_DIR.pathname;
  const failures = [];

  for (const entry of readdirSync(dirPath).sort()) {
    if (!entry.endsWith('.glb')) {
      continue;
    }
    const filePath = path.join(dirPath, entry);
    const document = readGlbJson(filePath);
    const externalImages = Array.isArray(document.images)
      ? document.images.filter((image) => typeof image?.uri === 'string' && image.uri.trim().length > 0)
      : [];
    if (externalImages.length > 0) {
      failures.push(
        `${entry} references external image URIs: ${externalImages.map((image) => image.uri).join(', ')}`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `[starter-kit-racing] Models must embed all textures before publish.\n${failures.join('\n')}`,
    );
  }

  console.log('[starter-kit-racing] All GLB model textures are embedded.');
}

main();
