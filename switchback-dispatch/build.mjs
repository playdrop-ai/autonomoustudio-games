import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ENTRY_POINT = 'src/main.ts';
const DEV_HOST_ENTRY_POINT = 'src/dev-host.ts';
const TEMPLATE_PATH = 'template.html';
const OUTPUT_DIR = 'dist';
const OUTPUT_HTML = path.join(OUTPUT_DIR, 'index.html');
const OUTPUT_JS = path.join(OUTPUT_DIR, 'app.js');
const OUTPUT_DEV_HOST_HTML = path.join(OUTPUT_DIR, 'test-host.html');
const OUTPUT_DEV_HOST_JS = path.join(OUTPUT_DIR, 'dev-host.js');
const OUTPUT_ASSETS = path.join(OUTPUT_DIR, 'assets');
const OUTPUT_VENDOR = path.join(OUTPUT_DIR, 'vendor', 'three');
const ASSETS_SOURCE = 'assets';
const THREE_BUILD_SOURCE = path.join('node_modules', 'three', 'build');
const THREE_ADDONS_SOURCE = path.join('node_modules', 'three', 'examples', 'jsm');
const TEST_HOST_IMPORT_MAP = `<script type="importmap">\n      {\n        "imports": {\n          "three": "./vendor/three/build/three.module.js",\n          "three/addons/": "./vendor/three/examples/jsm/"\n        }\n      }\n    </script>\n`;

function emitStaticAssets() {
  rmSync(OUTPUT_ASSETS, { recursive: true, force: true });
  rmSync(OUTPUT_VENDOR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  cpSync(ASSETS_SOURCE, OUTPUT_ASSETS, { recursive: true });
  mkdirSync(OUTPUT_VENDOR, { recursive: true });
  cpSync(THREE_BUILD_SOURCE, path.join(OUTPUT_VENDOR, 'build'), { recursive: true });
  cpSync(THREE_ADDONS_SOURCE, path.join(OUTPUT_VENDOR, 'examples', 'jsm'), { recursive: true });
}

function createDevHostHtml(html) {
  const sdkScript = '<script src="https://assets.playdrop.ai/sdk/playdrop.js"></script>\n';
  const htmlWithoutSdk = html.replace(sdkScript, '');
  const marker = '<script type="module">';
  const index = htmlWithoutSdk.indexOf(marker);
  if (index === -1) {
    throw new Error('[starter-kit-racing] Failed to locate bootstrap script in template.html');
  }
  return `${htmlWithoutSdk.slice(0, index)}${TEST_HOST_IMPORT_MAP}    <script type="module" src="./dev-host.js"></script>\n    ${htmlWithoutSdk.slice(index)}`;
}

function writeOutputs({ appBundle, devHostBundle = null, emitDevHost }) {
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  emitStaticAssets();
  const html = readFileSync(TEMPLATE_PATH, 'utf8');
  writeFileSync(OUTPUT_HTML, html, 'utf8');
  writeFileSync(OUTPUT_JS, appBundle, 'utf8');
  if (emitDevHost) {
    if (!devHostBundle) {
      throw new Error('[starter-kit-racing] Missing dev-host.js bundle output');
    }
    writeFileSync(OUTPUT_DEV_HOST_JS, devHostBundle, 'utf8');
    writeFileSync(OUTPUT_DEV_HOST_HTML, createDevHostHtml(html), 'utf8');
    console.log(
      `[starter-kit-racing] built ${OUTPUT_HTML}, ${OUTPUT_JS}, ${OUTPUT_DEV_HOST_HTML}, and ${OUTPUT_DEV_HOST_JS}`,
    );
    return;
  }
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

function createDevHostOptions({ watch }) {
  return {
    entryPoints: [DEV_HOST_ENTRY_POINT],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    outfile: OUTPUT_DEV_HOST_JS,
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
    let devHostBundle = null;

    const flushOutputs = () => {
      if (!appBundle || !devHostBundle) {
        return;
      }
      writeOutputs({
        appBundle,
        devHostBundle,
        emitDevHost: true,
      });
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

    const devHostCtx = await esbuild.context({
      ...createDevHostOptions({ watch: true }),
      plugins: [
        {
          name: 'write-dev-host-output',
          setup(buildSetup) {
            buildSetup.onEnd((result) => {
              if (result.errors.length === 0) {
                devHostBundle = readSingleOutput(result, 'dev-host.js');
                flushOutputs();
              }
            });
          },
        },
      ],
    });

    await appCtx.watch();
    await devHostCtx.watch();
    const [initialAppResult, initialDevHostResult] = await Promise.all([
      appCtx.rebuild(),
      devHostCtx.rebuild(),
    ]);
    appBundle = readSingleOutput(initialAppResult, 'app.js');
    devHostBundle = readSingleOutput(initialDevHostResult, 'dev-host.js');
    flushOutputs();
    console.log('[starter-kit-racing] watching for changes...');
    return;
  }

  const [appResult, devHostResult] = await Promise.all([
    esbuild.build({
      ...createAppOptions({ watch: false }),
      minify: true,
    }),
    esbuild.build({
      ...createDevHostOptions({ watch: false }),
      minify: true,
    }),
  ]);
  writeOutputs({
    appBundle: readSingleOutput(appResult, 'app.js'),
    devHostBundle: readSingleOutput(devHostResult, 'dev-host.js'),
    emitDevHost: true,
  });
}

build({ watch: process.argv.includes('--watch') }).catch((error) => {
  console.error(error);
  process.exit(1);
});
