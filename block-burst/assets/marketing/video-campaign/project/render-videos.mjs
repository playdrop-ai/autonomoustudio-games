import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectDir = dirname(fileURLToPath(import.meta.url));
const campaignDir = resolve(projectDir, "..");
const marketingDir = resolve(campaignDir, "..");
const gameDir = resolve(marketingDir, "../..");
const reviewDir = resolve(campaignDir, "review");

const heroPortrait = resolve(marketingDir, "playdrop/hero-portrait.png");
const heroInstagram = resolve(marketingDir, "social-media/instagram/feed/carousel/01-hero.png");
const heroPinterest = resolve(marketingDir, "social-media/pinterest/static/01-hero.png");
const plateDir = resolve(projectDir, "caption-plates/transparent");
const plates = [
  resolve(plateDir, "01-drag-drop-burst.png"),
  resolve(plateDir, "02-plan-every-piece.png"),
  resolve(plateDir, "03-chain-big-combos.png"),
  resolve(plateDir, "04-beat-your-best.png"),
];

const appLovinContinuousSource = resolve(campaignDir, "source-captures/bomb-physics-wave-native-v4/mobile-portrait-listing.mp4");
const playdropPortraitSource = resolve(campaignDir, "source-captures/bomb-physics-wave-native-v4/mobile-portrait-listing.mp4");
const landscapeContinuousSource = resolve(campaignDir, "source-captures/bomb-physics-wave-landscape-native-v1/mobile-landscape-listing.mp4");
const instagramSource = resolve(campaignDir, "source-captures/bomb-physics-wave-instagram-native-v1/mobile-portrait-listing.mp4");
const pinterestSource = resolve(campaignDir, "source-captures/bomb-physics-wave-pinterest-native-v1/mobile-portrait-listing.mp4");

const portraitOutput = resolve(marketingDir, "social-media/short/portrait-9x16.mp4");
const landscapeOutput = resolve(marketingDir, "social-media/trailer/landscape-16x9.mp4");
const instagramOutput = resolve(marketingDir, "social-media/instagram/feed/video-3x4.mp4");
const pinterestOutput = resolve(marketingDir, "social-media/short/pinterest-2x3.mp4");
const appLovinDir = resolve(marketingDir, "applovin-interstitial/portrait");
const playdropPortraitOutput = resolve(marketingDir, "playdrop/capture/portrait-listing.mp4");
const playdropLandscapeOutput = resolve(marketingDir, "playdrop/capture/landscape-listing.mp4");

for (const path of [reviewDir, dirname(portraitOutput), dirname(landscapeOutput), dirname(instagramOutput), dirname(pinterestOutput), appLovinDir, resolve(marketingDir, "playdrop/capture")]) {
  mkdirSync(path, { recursive: true });
}

function run(command, args) {
  const normalized = command === "ffmpeg" ? ["-hide_banner", "-loglevel", "error", ...args] : args;
  const result = spawnSync(command, normalized, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function encodeArgs(output) {
  return [
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-colorspace", "bt709",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-ac", "2",
    "-movflags", "+faststart",
    "-t", "14.000",
    output,
  ];
}

function renderShort({ source, hero, width, height, plateWidth, plateY, output }) {
  const inputs = ["-y", "-loop", "1", "-framerate", "30", "-i", hero, "-i", source];
  for (const plate of plates) inputs.push("-loop", "1", "-framerate", "30", "-i", plate);

  const timings = [
    [0.75, 2.70],
    [3.65, 2.70],
    [6.55, 2.70],
    [9.45, 3.50],
  ];
  const filters = [
    `[0:v]fps=30,trim=duration=0.6,setpts=PTS-STARTPTS,settb=expr=1/30,scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv420p[h0]`,
    `[1:v]trim=start=0:end=13.55,setpts=PTS-STARTPTS,fps=30,settb=expr=1/30,scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv420p[g0]`,
  ];
  let previous = "g0";
  for (let index = 0; index < timings.length; index += 1) {
    const [start, duration] = timings[index];
    const inputIndex = index + 2;
    const fadeOut = duration - 0.22;
    filters.push(
      `[${inputIndex}:v]fps=30,crop=1600:320:36:310,scale=${plateWidth}:-2:flags=lanczos,format=rgba,trim=duration=${duration},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.18:alpha=1,fade=t=out:st=${fadeOut}:d=0.22:alpha=1,setpts=PTS+${start}/TB[p${index}]`,
      `[${previous}][p${index}]overlay=x=(W-w)/2:y=${plateY}:eof_action=pass:repeatlast=0[g${index + 1}]`,
    );
    previous = `g${index + 1}`;
  }
  filters.push(
    `[${previous}]format=yuv420p,settb=expr=1/30[gc]`,
    "[h0][gc]xfade=transition=fade:duration=0.15:offset=0.45,format=yuv420p[v]",
    "anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=0.45,asetpts=PTS-STARTPTS[s0]",
    "[1:a]atrim=start=0:end=13.55,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08,afade=t=out:st=13.30:d=0.25,volume=1dB,alimiter=limit=0.891:level=false[ga]",
    "[s0][ga]concat=n=2:v=0:a=1[a]",
  );

  run("ffmpeg", [...inputs, "-filter_complex", filters.join(";"), ...encodeArgs(output)]);
}

function renderAppLovin() {
  const output = resolve(appLovinDir, "video.mp4");
  const appLovinPlates = [plates[0], plates[1], plates[2], plates[3]];
  const inputs = ["-y", "-i", appLovinContinuousSource];
  for (const plate of appLovinPlates) inputs.push("-loop", "1", "-framerate", "30", "-i", plate);
  const timings = [
    [0.10, 2.35],
    [2.85, 2.55],
    [5.95, 2.55],
    [9.55, 2.25],
  ];
  const finalDuration = 12;
  const filters = [
    `[0:v]trim=start=0:end=${finalDuration},setpts=PTS-STARTPTS,fps=30,settb=expr=1/30,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[game]`,
  ];
  let previous = "game";
  for (let index = 0; index < timings.length; index += 1) {
    const [start, duration] = timings[index];
    const inputIndex = index + 1;
    filters.push(
      `[${inputIndex}:v]fps=30,crop=1600:320:36:310,scale=920:-2:flags=lanczos,format=rgba,trim=duration=${duration},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.18:alpha=1,fade=t=out:st=${duration - 0.22}:d=0.22:alpha=1,setpts=PTS+${start}/TB[p${index}]`,
      `[${previous}][p${index}]overlay=x=(W-w)/2:y=1650:eof_action=pass:repeatlast=0[g${index}]`,
    );
    previous = `g${index}`;
  }
  filters.push(
    `[${previous}]format=yuv420p,settb=expr=1/30[v]`,
    `[0:a]atrim=start=0:end=${finalDuration},asetpts=PTS-STARTPTS,afade=t=out:st=11.78:d=0.22,volume=1dB,alimiter=limit=0.891:level=false[a]`,
  );
  run("ffmpeg", [
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart", "-t", finalDuration.toFixed(3), output,
  ]);
}

function renderContinuousPortrait() {
  const inputs = ["-y", "-i", appLovinContinuousSource];
  for (const plate of plates) inputs.push("-loop", "1", "-framerate", "60", "-i", plate);
  const timings = [
    [0.10, 2.35],
    [2.85, 2.55],
    [5.95, 2.55],
    [9.55, 2.25],
  ];
  const filters = [
    "[0:v]trim=start=0:end=12,setpts=PTS-STARTPTS,fps=60,settb=expr=1/60,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[game]",
  ];
  let previous = "game";
  for (let index = 0; index < timings.length; index += 1) {
    const [start, duration] = timings[index];
    const inputIndex = index + 1;
    filters.push(
      `[${inputIndex}:v]fps=60,crop=1600:320:36:310,scale=920:-2:flags=lanczos,format=rgba,trim=duration=${duration},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.18:alpha=1,fade=t=out:st=${duration - 0.22}:d=0.22:alpha=1,setpts=PTS+${start}/TB[p${index}]`,
      `[${previous}][p${index}]overlay=x=(W-w)/2:y=1650:eof_action=pass:repeatlast=0[g${index}]`,
    );
    previous = `g${index}`;
  }
  filters.push(
    `[${previous}]format=yuv420p,settb=expr=1/60[v]`,
    "[0:a]atrim=start=0:end=12,asetpts=PTS-STARTPTS,afade=t=out:st=11.78:d=0.22,volume=1dB,alimiter=limit=0.891:level=false[a]",
  );
  run("ffmpeg", [
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "60",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart", "-t", "12.000", portraitOutput,
  ]);
}

function renderCleanListing({ source, output, width, height, duration }) {
  run("ffmpeg", [
    "-y", "-i", source,
    "-filter_complex",
    `[0:v]trim=start=0:end=${duration},setpts=PTS-STARTPTS,fps=60,settb=expr=1/60,scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv420p[v];[0:a]atrim=start=0:end=${duration},asetpts=PTS-STARTPTS,afade=t=out:st=${duration - 0.22}:d=0.22,volume=1dB,alimiter=limit=0.891:level=false[a]`,
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "60",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart", "-t", duration.toFixed(3), output,
  ]);
}

function renderContinuousLandscape() {
  const inputs = ["-y", "-i", landscapeContinuousSource];
  for (const plate of plates) inputs.push("-loop", "1", "-framerate", "60", "-i", plate);
  const timings = [
    [0.10, 2.35],
    [3.10, 2.45],
    [6.65, 2.65],
    [13.20, 3.45],
  ];
  const filters = [
    "[0:v]trim=start=0:end=17,setpts=PTS-STARTPTS,fps=60,settb=expr=1/60,scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p[game]",
  ];
  let previous = "game";
  for (let index = 0; index < timings.length; index += 1) {
    const [start, duration] = timings[index];
    const inputIndex = index + 1;
    filters.push(
      `[${inputIndex}:v]fps=60,crop=1600:320:36:310,scale=820:-2:flags=lanczos,format=rgba,trim=duration=${duration},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.18:alpha=1,fade=t=out:st=${duration - 0.22}:d=0.22:alpha=1,setpts=PTS+${start}/TB[p${index}]`,
      `[${previous}][p${index}]overlay=x=W-w-55:y=850:eof_action=pass:repeatlast=0[g${index}]`,
    );
    previous = `g${index}`;
  }
  filters.push(
    `[${previous}]format=yuv420p,settb=expr=1/60[v]`,
    "[0:a]atrim=start=0:end=17,asetpts=PTS-STARTPTS,afade=t=out:st=16.78:d=0.22,volume=1dB,alimiter=limit=0.891:level=false[a]",
  );
  run("ffmpeg", [
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "60",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart", "-t", "17.000", landscapeOutput,
  ]);
}

function contactSheet(input, output, filter) {
  run("ffmpeg", ["-y", "-i", input, "-vf", filter, "-frames:v", "1", "-update", "1", output]);
}

const only = process.argv.find((arg) => arg.startsWith("--only="))?.split("=")[1];
if (!only) {
  renderContinuousPortrait();
  renderCleanListing({ source: playdropPortraitSource, output: playdropPortraitOutput, width: 1080, height: 1920, duration: 12 });
  renderShort({ source: instagramSource, hero: heroInstagram, width: 1080, height: 1440, plateWidth: 920, plateY: 1180, output: instagramOutput });
  renderShort({ source: pinterestSource, hero: heroPinterest, width: 1000, height: 1500, plateWidth: 860, plateY: 1250, output: pinterestOutput });
  renderContinuousLandscape();
  renderCleanListing({ source: landscapeContinuousSource, output: playdropLandscapeOutput, width: 1920, height: 1080, duration: 17 });
}
if (only === "core") {
  renderContinuousPortrait();
  renderCleanListing({ source: playdropPortraitSource, output: playdropPortraitOutput, width: 1080, height: 1920, duration: 12 });
  renderContinuousLandscape();
  renderCleanListing({ source: landscapeContinuousSource, output: playdropLandscapeOutput, width: 1920, height: 1080, duration: 17 });
}
if (only === "playdrop-portrait" || only === "playdrop-listings") {
  const portraitListingOutput = resolve(marketingDir, "playdrop/capture/portrait-listing.mp4");
  renderCleanListing({ source: playdropPortraitSource, output: portraitListingOutput, width: 1080, height: 1920, duration: 12 });
  contactSheet(portraitListingOutput, resolve(reviewDir, "playdrop-portrait-debris-contact.png"), "fps=1/2.4,scale=216:384:flags=lanczos,tile=5x1:padding=8:margin=8");
}
if (only === "playdrop-listings") {
  const landscapeListingOutput = resolve(marketingDir, "playdrop/capture/landscape-listing.mp4");
  renderCleanListing({ source: landscapeContinuousSource, output: landscapeListingOutput, width: 1920, height: 1080, duration: 17 });
  contactSheet(landscapeListingOutput, resolve(reviewDir, "playdrop-landscape-listing-contact.png"), "fps=1/4,scale=320:180:flags=lanczos,tile=5x1:padding=8:margin=8");
}
if (!only || only === "applovin") {
  renderAppLovin();
  copyFileSync(heroPortrait, resolve(appLovinDir, "end-card.png"));
  run("ffmpeg", ["-y", "-ss", "10.10", "-i", resolve(appLovinDir, "video.mp4"), "-frames:v", "1", "-update", "1", resolve(appLovinDir, "poster.png")]);
  contactSheet(resolve(appLovinDir, "video.mp4"), resolve(reviewDir, "applovin-portrait-contact.png"), "fps=1/2.4,scale=216:384:flags=lanczos,tile=5x1:padding=8:margin=8");
  contactSheet(resolve(appLovinDir, "video.mp4"), resolve(reviewDir, "applovin-interaction-contact.png"), "fps=5,scale=108:192:flags=lanczos,tile=10x6:padding=4:margin=4");
}
if (!only || only === "core") {
  contactSheet(portraitOutput, resolve(reviewDir, "portrait-teaser-contact.png"), "fps=1/2.8,scale=216:384:flags=lanczos,tile=5x1:padding=8:margin=8");
  contactSheet(landscapeOutput, resolve(reviewDir, "landscape-trailer-contact.png"), "fps=1/4,scale=320:180:flags=lanczos,tile=6x1:padding=8:margin=8");
  contactSheet(instagramOutput, resolve(reviewDir, "instagram-3x4-contact.png"), "fps=1/2.8,scale=216:288:flags=lanczos,tile=5x1:padding=8:margin=8");
  contactSheet(pinterestOutput, resolve(reviewDir, "pinterest-2x3-contact.png"), "fps=1/2.8,scale=200:300:flags=lanczos,tile=5x1:padding=8:margin=8");
  run("ffmpeg", [
    "-y",
    "-i", resolve(reviewDir, "portrait-teaser-contact.png"),
    "-i", resolve(reviewDir, "landscape-trailer-contact.png"),
    "-i", resolve(reviewDir, "instagram-3x4-contact.png"),
    "-i", resolve(reviewDir, "pinterest-2x3-contact.png"),
    "-filter_complex", "[0:v]scale=1600:-2[p];[1:v]scale=1600:-2[l];[2:v]scale=1600:-2[i];[3:v]scale=1600:-2[n];[p][l][i][n]vstack=inputs=4[v]",
    "-map", "[v]", "-frames:v", "1", "-update", "1", resolve(reviewDir, "video-package-contact.png"),
  ]);
}

if (!only || only === "core" || only === "playdrop-listings") {
  for (const [source, destination] of [
    [playdropPortraitOutput, resolve(marketingDir, "videos/portrait.mp4")],
    [playdropPortraitOutput, resolve(marketingDir, "captures/mobile-portrait.mp4")],
    [playdropLandscapeOutput, resolve(marketingDir, "videos/landscape.mp4")],
    [playdropLandscapeOutput, resolve(marketingDir, "captures/mobile-landscape.mp4")],
  ]) {
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
}

console.log(JSON.stringify({ portraitOutput, landscapeOutput, instagramOutput, pinterestOutput, appLovinDir, reviewDir }, null, 2));
