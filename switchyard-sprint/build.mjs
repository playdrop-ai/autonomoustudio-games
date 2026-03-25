import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const HTML_TEMPLATE = "template.html";
const HTML_TARGET = "dist/index.html";
const DIST_DIR = "dist";
const STATIC_DIRS = ["assets", "listing"];

const buildOptions = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2020",
  sourcemap: false,
  write: false,
  logLevel: "silent",
  outfile: "bundle.js",
  plugins: [],
};

function cleanDist() {
  rmSync(DIST_DIR, { force: true, recursive: true });
}

function inlineHtml(result) {
  const output = result?.outputFiles?.find((file) => file.path.endsWith(".js"));
  if (!output) {
    throw new Error("[switchyard-sprint] Failed to produce bundle output");
  }

  const template = readFileSync(HTML_TEMPLATE, "utf8");
  if (!template.includes("<!-- APP_SCRIPT -->")) {
    throw new Error("[switchyard-sprint] HTML template missing <!-- APP_SCRIPT --> placeholder");
  }

  const escapedBundle = output.text.replace(/<\/script>/gi, "<\\/script>");
  const inlineScript = `<script>\n${escapedBundle}\n</script>`;
  const finalHtml = template.replace("<!-- APP_SCRIPT -->", inlineScript);

  mkdirSync(dirname(HTML_TARGET), { recursive: true });
  writeFileSync(HTML_TARGET, finalHtml, "utf8");
}

function copyStaticFiles() {
  for (const directory of STATIC_DIRS) {
    if (!existsSync(directory)) {
      continue;
    }

    cpSync(directory, join(DIST_DIR, directory), { recursive: true });
  }
}

buildOptions.plugins.push({
  name: "inline-template",
  setup(build) {
    build.onStart(() => {
      cleanDist();
    });

    build.onEnd((result) => {
      if (result.errors.length > 0) {
        return;
      }

      inlineHtml(result);
      copyStaticFiles();
      console.log(`[switchyard-sprint] Wrote ${HTML_TARGET}`);
    });
  },
});

const watchMode = process.argv.includes("--watch");

if (watchMode) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.rebuild();
  await ctx.watch();
  console.log("[switchyard-sprint] Watching for changes...");
} else {
  await esbuild.build(buildOptions);
}
