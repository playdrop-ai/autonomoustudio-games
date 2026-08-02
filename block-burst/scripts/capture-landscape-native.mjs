import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(scriptDir, "..");
const cli = resolve(gameDir, "../../playdrop/packages/playdrop-cli/bin/playdrop");
const outputDir = "assets/marketing/video-campaign/source-captures/landscape-continuous-native-v1";

const result = spawnSync(process.execPath, [
  cli,
  "project", "capture", ".",
  "--app", "block-burst",
  "--duration", "18",
  "--width", "1280",
  "--height", "720",
  "--fps", "60",
  "--poster-at", "16",
  "--audio",
  "--output-dir", outputDir,
], {
  cwd: gameDir,
  stdio: "inherit",
});

if (result.status !== 0) {
  throw new Error(`Native landscape capture failed with exit code ${result.status}`);
}
