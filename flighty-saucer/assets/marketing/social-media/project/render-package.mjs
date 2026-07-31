import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = dirname(fileURLToPath(import.meta.url));
const socialDir = resolve(projectDir, '..');
const gameDir = resolve(socialDir, '../../..');
const portraitMaster = resolve(
  gameDir,
  'assets/marketing/video-social-v3/final/flighty-saucer-social-short-portrait-9x16-en-US.mp4',
);
const landscapeMaster = resolve(
  gameDir,
  'assets/marketing/video-social-v2/final/flighty-saucer-trailer-landscape-16x9-en-US.mp4',
);
const portraitGameplay = resolve(
  gameDir,
  'assets/marketing/video-social-v2/source-captures/portrait-final/listing.mp4',
);

const openingSeconds = 0.8;
const gameplaySeconds = 9.5;
const closingSeconds = 1.5;

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function requireFile(file) {
  if (!existsSync(file)) {
    throw new Error(`Required source file is missing: ${file}`);
  }
}

function renderAdaptation({ output, hero, width, height, crop }) {
  requireFile(hero);
  requireFile(portraitGameplay);
  mkdirSync(dirname(output), { recursive: true });

  const videoFilter = [
    `[0:v]fps=60,trim=duration=${openingSeconds},setpts=PTS-STARTPTS,scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv420p[v0]`,
    `[1:v]trim=start=0:duration=${gameplaySeconds},setpts=PTS-STARTPTS,${crop},scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv420p[v1]`,
    `[2:v]fps=60,trim=duration=${closingSeconds},setpts=PTS-STARTPTS,scale=${width}:${height}:flags=lanczos,setsar=1,format=yuv420p[v2]`,
    `[v0][v1][v2]concat=n=3:v=1:a=0[v]`,
    `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${openingSeconds},asetpts=PTS-STARTPTS[a0]`,
    `[1:a]atrim=start=0:duration=${gameplaySeconds},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08,afade=t=out:st=9.25:d=0.25[a1]`,
    `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${closingSeconds},asetpts=PTS-STARTPTS[a2]`,
    `[a0][a1][a2]concat=n=3:v=0:a=1,volume=4.2dB[a]`,
  ].join(';');

  run('ffmpeg', [
    '-y',
    '-loop',
    '1',
    '-framerate',
    '60',
    '-i',
    hero,
    '-i',
    portraitGameplay,
    '-loop',
    '1',
    '-framerate',
    '60',
    '-i',
    hero,
    '-filter_complex',
    videoFilter,
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-r',
    '60',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-colorspace',
    'bt709',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    '-shortest',
    output,
  ]);
}

requireFile(portraitMaster);
requireFile(landscapeMaster);

mkdirSync(resolve(socialDir, 'short'), { recursive: true });
mkdirSync(resolve(socialDir, 'trailer'), { recursive: true });
copyFileSync(portraitMaster, resolve(socialDir, 'short/portrait-9x16.mp4'));
copyFileSync(landscapeMaster, resolve(socialDir, 'trailer/landscape-16x9.mp4'));

renderAdaptation({
  output: resolve(socialDir, 'short/pinterest-2x3.mp4'),
  hero: resolve(socialDir, 'pinterest/static/01-hero.png'),
  width: 1000,
  height: 1500,
  crop: 'crop=540:810:0:75',
});

renderAdaptation({
  output: resolve(socialDir, 'instagram/feed/video-3x4.mp4'),
  hero: resolve(socialDir, 'instagram/feed/carousel/01-hero.png'),
  width: 1080,
  height: 1440,
  crop: 'crop=540:720:0:120',
});

console.log(
  JSON.stringify(
    {
      portrait: resolve(socialDir, 'short/portrait-9x16.mp4'),
      pinterest: resolve(socialDir, 'short/pinterest-2x3.mp4'),
      landscape: resolve(socialDir, 'trailer/landscape-16x9.mp4'),
      instagram: resolve(socialDir, 'instagram/feed/video-3x4.mp4'),
    },
    null,
    2,
  ),
);
