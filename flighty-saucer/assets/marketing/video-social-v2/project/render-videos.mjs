import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = dirname(fileURLToPath(import.meta.url));
const campaignDir = resolve(projectDir, '..');
const gameDir = resolve(campaignDir, '../../..');
const finalDir = resolve(campaignDir, 'final');
const reviewDir = resolve(campaignDir, 'review/final');

const openingSeconds = 0.8;
const gameplaySeconds = 9.5;
const closingSeconds = 1.5;

mkdirSync(finalDir, { recursive: true });
mkdirSync(reviewDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function render({
  name,
  hero,
  source,
  width,
  height,
  reviewScale,
  cueReviewScale,
  audioGainDb,
}) {
  const output = resolve(finalDir, `${name}.mp4`);
  const poster = resolve(finalDir, `${name}-poster.png`);
  const firstFrame = resolve(reviewDir, `${name}-first-frame.png`);
  const finalFrame = resolve(reviewDir, `${name}-final-frame.png`);
  const contactSheet = resolve(reviewDir, `${name}-contact-sheet-complete.png`);
  const cueSheet = resolve(reviewDir, `${name}-contact-sheet-tap-cue.png`);

  const videoFilter = [
    `[0:v]fps=60,trim=duration=${openingSeconds},setpts=PTS-STARTPTS,scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv420p[v0]`,
    `[1:v]trim=start=0:duration=${gameplaySeconds},setpts=PTS-STARTPTS,scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv420p[v1]`,
    `[2:v]fps=60,trim=duration=${closingSeconds},setpts=PTS-STARTPTS,scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv420p[v2]`,
    `[v0][v1][v2]concat=n=3:v=1:a=0[v]`,
    `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${openingSeconds},asetpts=PTS-STARTPTS[a0]`,
    `[1:a]atrim=start=0:duration=${gameplaySeconds},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08,afade=t=out:st=9.25:d=0.25[a1]`,
    `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${closingSeconds},asetpts=PTS-STARTPTS[a2]`,
    `[a0][a1][a2]concat=n=3:v=0:a=1,volume=${audioGainDb}dB[a]`,
  ].join(';');

  run('ffmpeg', [
    '-y',
    '-loop', '1',
    '-framerate', '60',
    '-i', hero,
    '-i', source,
    '-loop', '1',
    '-framerate', '60',
    '-i', hero,
    '-filter_complex', videoFilter,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-r', '60',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-colorspace', 'bt709',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-movflags', '+faststart',
    '-shortest',
    output,
  ]);

  copyFileSync(hero, poster);

  run('ffmpeg', ['-y', '-v', 'error', '-ss', '0', '-i', output, '-frames:v', '1', firstFrame]);
  run('ffmpeg', ['-y', '-v', 'error', '-sseof', '-0.05', '-i', output, '-frames:v', '1', finalFrame]);
  run('ffmpeg', [
    '-y', '-v', 'error', '-i', output,
    '-vf', `fps=1,scale=${reviewScale},tile=5x3`,
    '-frames:v', '1', contactSheet,
  ]);
  run('ffmpeg', [
    '-y', '-v', 'error', '-ss', `${openingSeconds}`, '-t', `${gameplaySeconds}`, '-i', output,
    '-vf', `fps=10,scale=${cueReviewScale},tile=10x10`,
    '-frames:v', '1', cueSheet,
  ]);

  return { output, poster };
}

const portrait = render({
  name: 'flighty-saucer-social-short-portrait-9x16-en-US',
  hero: resolve(gameDir, 'assets/marketing/playdrop/hero-portrait-9x16-v3.png'),
  source: resolve(campaignDir, 'source-captures/portrait-final/listing.mp4'),
  width: 1080,
  height: 1920,
  reviewScale: '216:384',
  cueReviewScale: '108:192',
  audioGainDb: 4.2,
});

const landscape = render({
  name: 'flighty-saucer-trailer-landscape-16x9-en-US',
  hero: resolve(gameDir, 'assets/marketing/playdrop/hero-landscape-16x9-v3.png'),
  source: resolve(campaignDir, 'source-captures/landscape-final/listing.mp4'),
  width: 1920,
  height: 1080,
  reviewScale: '384:216',
  cueReviewScale: '192:108',
  audioGainDb: 4.4,
});

console.log(JSON.stringify({ portrait, landscape }, null, 2));
