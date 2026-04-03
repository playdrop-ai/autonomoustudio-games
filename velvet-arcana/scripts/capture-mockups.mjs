import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const files = [
  ["portrait-start.svg", "portrait-start.png", "720,1280"],
  ["portrait-gameplay.svg", "portrait-gameplay.png", "720,1280"],
  ["portrait-gameover.svg", "portrait-gameover.png", "720,1280"],
  ["desktop-start.svg", "desktop-start.png", "1600,900"],
  ["desktop-gameplay.svg", "desktop-gameplay.png", "1600,900"],
  ["desktop-gameover.svg", "desktop-gameover.png", "1600,900"],
];

for (const [svgName, pngName, viewport] of files) {
  const svgUrl = pathToFileURL(new URL(`../mockups/${svgName}`, import.meta.url).pathname).href;
  const pngPath = new URL(`../mockups/${pngName}`, import.meta.url).pathname;
  execFileSync(
    "npx",
    ["playwright", "screenshot", svgUrl, pngPath, "--viewport-size", viewport, "--wait-for-timeout", "150"],
    { stdio: "inherit" },
  );
}
