import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const HTML_TEMPLATE = 'template.html';
const HTML_TARGET = 'flighty-saucer.html';
const CSS_SOURCE = 'src/style.css';

const buildOptions = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  sourcemap: false,
  write: false,
  logLevel: 'silent',
  outfile: 'bundle.js'
};

function inlineHtml(result) {
  const output = result?.outputFiles?.find((file) => file.path.endsWith('.js'));
  if (!output) throw new Error('[template-three-js] Failed to produce bundle output');
  const template = readFileSync(HTML_TEMPLATE, 'utf8');
  const css = readFileSync(CSS_SOURCE, 'utf8');
  const escapedBundle = output.text.replace(/<\/script>/gi, '<\\/script>');
  mkdirSync(dirname(HTML_TARGET), { recursive: true });
  const html = template
    .replace('/* APP_STYLE */', css)
    .replace('<!-- APP_SCRIPT -->', `<script>\n${escapedBundle}\n</script>`);
  writeFileSync(HTML_TARGET, html, 'utf8');
  console.log(`[flighty-saucer] Wrote ${HTML_TARGET}`);
}

buildOptions.plugins = [{
  name: 'inline-template',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length === 0) inlineHtml(result);
    });
  }
}];

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.rebuild();
  await ctx.watch();
  console.log('[template-three-js] Watching for changes...');
} else {
  await esbuild.build(buildOptions);
}
