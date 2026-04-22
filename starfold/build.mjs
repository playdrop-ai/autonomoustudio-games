import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const HTML_TEMPLATE = 'template.html';
const HTML_TARGET = 'dist/index.html';
const ASSET_SOURCE = 'assets';
const ASSET_TARGET = 'dist/assets';

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
  if (existsSync(ASSET_SOURCE)) {
    rmSync(ASSET_TARGET, { recursive: true, force: true });
    mkdirSync(ASSET_TARGET, { recursive: true });
    cpSync(`${ASSET_SOURCE}/.`, ASSET_TARGET, { recursive: true, force: true });
  }

  console.log(`[template-typescript] Wrote ${HTML_TARGET}`);
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
