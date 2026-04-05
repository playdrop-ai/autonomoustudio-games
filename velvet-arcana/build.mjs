import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const HTML_TEMPLATE = 'template.html';
const HTML_TARGET = 'dist/index.html';
const ASSETS_SOURCE = 'assets';
const ASSETS_TARGET = 'dist/assets';
const DECK_SOURCE = 'art/cards/purple-deck-png';
const DECK_TARGET = 'dist/assets/purple-deck-png';

const buildOptions = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  sourcemap: false,
  write: false,
  logLevel: 'silent',
  outfile: 'bundle.js',
  plugins: [],
};

function inlineHtml(result) {
  const output = result?.outputFiles?.find(file => file.path.endsWith('.js'));
  if (!output) {
    throw new Error('[template-typescript] Failed to produce bundle output');
  }

  const template = readFileSync(HTML_TEMPLATE, 'utf8');
  if (!template.includes('<!-- APP_SCRIPT -->')) {
    throw new Error('[template-typescript] HTML template missing <!-- APP_SCRIPT --> placeholder');
  }

  const escapedBundle = output.text.replace(/<\/script>/gi, '<\\/script>');
  const inlineScript = `<script>\n${escapedBundle}\n</script>`;
  const finalHtml = template.replace('<!-- APP_SCRIPT -->', inlineScript);

  mkdirSync(dirname(HTML_TARGET), { recursive: true });
  writeFileSync(HTML_TARGET, finalHtml, 'utf8');
  copyAssets();

  console.log(`[template-typescript] Wrote ${HTML_TARGET}`);
}

function copyAssets() {
  if (!existsSync(ASSETS_SOURCE)) return;
  cpSync(ASSETS_SOURCE, ASSETS_TARGET, { recursive: true });
  if (existsSync(DECK_SOURCE)) {
    mkdirSync(dirname(DECK_TARGET), { recursive: true });
    cpSync(DECK_SOURCE, DECK_TARGET, { recursive: true });
  }
}

buildOptions.plugins.push({
  name: 'inline-template',
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length > 0) return;
      inlineHtml(result);
    });
  },
});

const watchMode = process.argv.includes('--watch');

if (watchMode) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.rebuild();
  await ctx.watch();
  console.log('[template-typescript] Watching for changes...');
} else {
  await esbuild.build(buildOptions);
}
