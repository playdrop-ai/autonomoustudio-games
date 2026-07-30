import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const HTML_TEMPLATE = 'template.html';
const HTML_TARGETS = ['flighty-saucer.html', 'dist/flighty-saucer.html'];
const CSS_SOURCE = 'src/style.css';
const PREVIEW_HAND_SOURCE = 'assets/ui/preview-tap-hand.png';

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
  const previewHand = readFileSync(PREVIEW_HAND_SOURCE).toString('base64');
  const escapedBundle = output.text.replace(/<\/script>/gi, '<\\/script>');
  const html = template
    .replace('/* APP_STYLE */', css)
    .replace('__PREVIEW_HAND_SRC__', `data:image/png;base64,${previewHand}`)
    .replace('<!-- APP_SCRIPT -->', `<script>\n${escapedBundle}\n</script>`);
  for (const htmlTarget of HTML_TARGETS) {
    mkdirSync(dirname(htmlTarget), { recursive: true });
    writeFileSync(htmlTarget, html, 'utf8');
    console.log(`[flighty-saucer] Wrote ${htmlTarget}`);
  }
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
