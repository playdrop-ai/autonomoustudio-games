import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(scriptDir, "..");
const cli = resolve(gameDir, "../../playdrop/packages/playdrop-cli/bin/playdrop");
const outputDir = "assets/marketing/video-campaign/source-captures/applovin-continuous-native-v8";

const result = spawnSync(process.execPath, [
  cli,
  "project", "capture", ".",
  "--app", "block-burst",
  "--duration", "12",
  "--width", "540",
  "--height", "960",
  "--fps", "60",
  "--poster-at", "10",
  "--audio",
  "--output-dir", outputDir,
], {
  cwd: gameDir,
  stdio: "inherit",
});

if (result.status !== 0) {
  throw new Error(`Native AppLovin capture failed with exit code ${result.status}`);
}
