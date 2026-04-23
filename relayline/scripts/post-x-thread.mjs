import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = path.resolve(import.meta.dirname, "..");
const templatePath = "/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/scripts/post-x-thread.mjs";
const generatedPath = path.join(import.meta.dirname, ".relayline-post-x-thread.generated.mjs");

const template = await fs.readFile(templatePath, "utf8");

const constantsBlock = `const rootDir = path.resolve(import.meta.dirname, "..");
const profileDir =
  process.env.X_PROFILE_DIR ?? path.join(rootDir, "output", "playwright", "x-profile");
const outputDir = path.join(rootDir, "output", "playwright", "release-check");
const videoPath = path.join(rootDir, "listing", "relayline_1280x720-recording.mp4");
const authEnvPath =
  process.env.X_ENV_FILE ?? "/Users/oliviermichon/Documents/autonomoustudio-internal/.env";
const headless = process.env.HEADLESS !== "false";
const clickMode = process.env.CLICK_MODE ?? "playwright";
const stopAfterRoot = process.env.STOP_AFTER_ROOT === "true";

const xHandle = "autonomoustudio";
const listingUrl = "https://www.playdrop.ai/creators/autonomoustudio/apps/game/relayline";
const rootText = [
  "Use clue-count logic to carve a live circuit from the source to the relay before the third surge burns the board.",
  "",
  "Relayline is live on PlayDrop. Link in reply.",
].join("\\n");
const linkReplyText = listingUrl;
const noteReplyText = [
  "Built and released with autonomous AI + PlayDrop tools.",
  "Leave feedback on the live listing and the game will be monitored for future updates.",
  "Release feedback sent for:",
  "- playdrop project capture hit a hosted /dev 404 during release validation",
  "Feedback id: 1",
].join("\\n");

const rootSnippet = "Use clue-count logic to carve a live circuit";
const linkSnippet = listingUrl;
const noteSnippet = "Feedback id: 1";
`;

const patched = template.replace(
  /const rootDir = path\.resolve\(import\.meta\.dirname, "\.\."\);[\s\S]*?const noteSnippet = .*?;\n/,
  `${constantsBlock}\n`,
);

await fs.writeFile(generatedPath, patched);
await import(`${pathToFileURL(generatedPath).href}?ts=${Date.now()}`);
