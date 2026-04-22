import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const HTML_TEMPLATE = 'template.html';
const HTML_TARGET = 'dist/index.html';
const SCRIPT_TARGET = 'bundle.js';

const buildOptions = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  loader: {
    '.png': 'dataurl',
  },
  legalComments: 'none',
  minify: true,
  sourcemap: false,
  write: true,
  logLevel: 'silent',
  outfile: `dist/${SCRIPT_TARGET}`,
  plugins: [],
};

function writeHtml() {
  const template = readFileSync(HTML_TEMPLATE, 'utf8');
  if (!template.includes('<!-- APP_SCRIPT -->')) {
    throw new Error('[pocket-bastion] HTML template missing <!-- APP_SCRIPT --> placeholder');
  }

  const finalHtml = template.replace('<!-- APP_SCRIPT -->', `<script src="./${SCRIPT_TARGET}"></script>`);

  mkdirSync(dirname(HTML_TARGET), { recursive: true });
  writeFileSync(HTML_TARGET, finalHtml, 'utf8');

  console.log(`[pocket-bastion] Wrote ${HTML_TARGET}`);
}

buildOptions.plugins.push({
  name: 'inline-template',
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length > 0) return;
      writeHtml();
    });
  },
});

const watchMode = process.argv.includes('--watch');

if (watchMode) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.rebuild();
  await ctx.watch();
  console.log('[pocket-bastion] Watching for changes...');
} else {
  await esbuild.build(buildOptions);
}
