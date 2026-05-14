import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ENTRY_POINT = 'src/main.ts';
const TEMPLATE_PATH = 'template.html';
const OUTPUT_DIR = 'dist';
const OUTPUT_HTML = path.join(OUTPUT_DIR, 'index.html');
const OUTPUT_JS = path.join(OUTPUT_DIR, 'app.js');
const OUTPUT_ASSETS = path.join(OUTPUT_DIR, 'assets');
const ASSETS_SOURCE = 'assets';

function emitStaticAssets() {
  rmSync(OUTPUT_ASSETS, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  cpSync(ASSETS_SOURCE, OUTPUT_ASSETS, { recursive: true });
}

function writeOutputs(appBundle) {
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  emitStaticAssets();
  writeFileSync(OUTPUT_HTML, readFileSync(TEMPLATE_PATH, 'utf8'), 'utf8');
  writeFileSync(OUTPUT_JS, appBundle, 'utf8');
  console.log(`[starter-kit-racing] built ${OUTPUT_HTML} and ${OUTPUT_JS}`);
}

function createAppOptions({ watch }) {
  return {
    entryPoints: [ENTRY_POINT],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    outfile: OUTPUT_JS,
    external: ['three', 'three/addons/*'],
    write: false,
    sourcemap: watch,
    logLevel: 'silent',
  };
}

function readSingleOutput(result, expectedName) {
  const outputFile = result.outputFiles?.find(
    (candidate) => path.basename(candidate.path) === expectedName,
  );
  if (!outputFile) {
    throw new Error(`[starter-kit-racing] Missing ${expectedName} bundle output`);
  }
  return outputFile.text;
}

async function build({ watch } = { watch: false }) {
  if (watch) {
    let appBundle = null;

    const flushOutputs = () => {
      if (!appBundle) {
        return;
      }
      writeOutputs(appBundle);
    };

    const appCtx = await esbuild.context({
      ...createAppOptions({ watch: true }),
      plugins: [
        {
          name: 'write-app-output',
          setup(buildSetup) {
            buildSetup.onEnd((result) => {
              if (result.errors.length === 0) {
                appBundle = readSingleOutput(result, 'app.js');
                flushOutputs();
              }
            });
          },
        },
      ],
    });

    await appCtx.watch();
    const initialAppResult = await appCtx.rebuild();
    appBundle = readSingleOutput(initialAppResult, 'app.js');
    flushOutputs();
    console.log('[starter-kit-racing] watching for changes...');
    return;
  }

  const appResult = await esbuild.build({
    ...createAppOptions({ watch: false }),
    minify: true,
  });
  writeOutputs(readSingleOutput(appResult, 'app.js'));
}

build({ watch: process.argv.includes('--watch') }).catch((error) => {
  console.error(error);
  process.exit(1);
});
