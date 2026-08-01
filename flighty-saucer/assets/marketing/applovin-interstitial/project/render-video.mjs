import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = dirname(fileURLToPath(import.meta.url));
const campaignDir = resolve(projectDir, '..');
const gameDir = resolve(campaignDir, '../../..');
const source = resolve(
  gameDir,
  'assets/marketing/video-social-v3/source-captures/portrait-final/listing.mp4',
);
const hero = resolve(gameDir, 'assets/marketing/playdrop/hero-portrait-9x16-v3.png');
const outputDir = resolve(campaignDir, 'portrait');
const reviewDir = resolve(campaignDir, 'review');
const output = resolve(outputDir, 'video.mp4');
const endCard = resolve(outputDir, 'end-card.png');
const poster = resolve(outputDir, 'poster.png');

mkdirSync(outputDir, { recursive: true });
mkdirSync(reviewDir, { recursive: true });

function run(command, args) {
  const normalizedArgs = command === 'ffmpeg'
    ? ['-hide_banner', '-loglevel', 'error', ...args]
    : args;
  const result = spawnSync(command, normalizedArgs, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

const filter = [
  '[0:v]fps=30,trim=duration=0.6,setpts=PTS-STARTPTS,settb=expr=1/30,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[hero]',
  '[1:v]trim=start=0:end=3.4,setpts=PTS-STARTPTS,fps=30,settb=expr=1/30,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[casual]',
  '[hero][casual]xfade=transition=fade:duration=0.15:offset=0.45[opening]',
  '[1:v]trim=start=20.65:end=24.9,setpts=PTS-STARTPTS,fps=30,settb=expr=1/30,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[advanced]',
  '[1:v]trim=start=24.9:end=25.35,setpts=2.18*(PTS-STARTPTS),fps=30,settb=expr=1/30,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[crash]',
  '[opening][advanced][crash]concat=n=3:v=1:a=0,fps=30,settb=expr=1/30,setpts=PTS-STARTPTS,format=yuv420p[v]',
  'anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=0.45,asetpts=PTS-STARTPTS[silent]',
  '[1:a]atrim=start=0:end=3.4,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08,afade=t=out:st=3.28:d=0.12[casualA]',
  '[1:a]atrim=start=20.65:end=24.9,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08[advancedA]',
  '[1:a]atrim=start=24.9:end=25.35,asetpts=PTS-STARTPTS,atempo=0.5,atempo=0.917431,afade=t=out:st=0.729:d=0.25[crashA]',
  '[silent][casualA][advancedA][crashA]concat=n=4:v=0:a=1,volume=4.2dB[a]',
].join(';');

run('ffmpeg', [
  '-y',
  '-loop', '1',
  '-framerate', '30',
  '-i', hero,
  '-i', source,
  '-filter_complex', filter,
  '-map', '[v]',
  '-map', '[a]',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-r', '30',
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

copyFileSync(hero, endCard);

run('ffmpeg', [
  '-y', '-ss', '1.2', '-i', output, '-frames:v', '1', '-update', '1', poster,
]);

const frames = [
  ['first-frame.png', '0.05'],
  ['first-action.png', '1.20'],
  ['advanced-action.png', '5.50'],
  ['crash.png', '8.75'],
  ['final-frame.png', '8.85'],
];

for (const [name, timestamp] of frames) {
  run('ffmpeg', [
    '-y', '-ss', timestamp, '-i', output, '-frames:v', '1', '-update', '1', resolve(reviewDir, name),
  ]);
}

run('ffmpeg', [
  '-y',
  '-i', output,
  '-vf', 'fps=2,scale=180:320:flags=lanczos,tile=6x3:padding=8:margin=8',
  '-frames:v', '1',
  '-update', '1',
  resolve(reviewDir, 'complete-contact-sheet.png'),
]);

run('ffmpeg', [
  '-y',
  '-i', output,
  '-vf', 'fps=5,scale=135:240:flags=lanczos,tile=8x6:padding=8:margin=8',
  '-frames:v', '1',
  '-update', '1',
  resolve(reviewDir, 'interaction-contact-sheet.png'),
]);

console.log(JSON.stringify({ output, endCard, poster, reviewDir }, null, 2));
