import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = dirname(fileURLToPath(import.meta.url));
const campaignDir = resolve(projectDir, '..');
const gameDir = resolve(campaignDir, '../../..');
const source = resolve(campaignDir, 'source-captures/portrait-final/listing.mp4');
const hero = resolve(gameDir, 'assets/marketing/playdrop/hero-portrait-9x16-v3.png');
const finalDir = resolve(campaignDir, 'final');
const output = resolve(finalDir, 'flighty-saucer-social-short-portrait-9x16-en-US.mp4');
const poster = resolve(finalDir, 'flighty-saucer-social-short-portrait-9x16-en-US-poster.png');

mkdirSync(finalDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

const filter = [
  '[0:v]fps=60,trim=duration=0.8,setpts=PTS-STARTPTS,settb=expr=1/60,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[h0]',
  '[1:v]trim=start=0:end=3.9,setpts=PTS-STARTPTS,fps=60,settb=expr=1/60,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[casual]',
  '[h0][casual]xfade=transition=fade:duration=0.2:offset=0.6[opening]',
  '[1:v]trim=start=20.65:end=24.9,setpts=PTS-STARTPTS,fps=60,settb=expr=1/60,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[advanced]',
  '[1:v]trim=start=24.9:end=25.35,setpts=2.18*(PTS-STARTPTS),fps=60,settb=expr=1/60,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[crash]',
  '[opening][advanced][crash]concat=n=3:v=1:a=0,fps=60,settb=expr=1/60,setpts=PTS-STARTPTS[main]',
  '[2:v]fps=60,trim=duration=1.5,setpts=PTS-STARTPTS,settb=expr=1/60,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[h1]',
  '[main][h1]xfade=transition=fade:duration=0.35:offset=9.379,format=yuv420p[v]',
  'anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=0.6,asetpts=PTS-STARTPTS[s0]',
  '[1:a]atrim=start=0:end=3.9,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08,afade=t=out:st=3.78:d=0.12[c0]',
  '[1:a]atrim=start=20.65:end=24.9,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08[a0]',
  '[1:a]atrim=start=24.9:end=25.35,asetpts=PTS-STARTPTS,atempo=0.5,atempo=0.917431,afade=t=out:st=0.729:d=0.25[crashA]',
  'anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=1.15,asetpts=PTS-STARTPTS[s1]',
  '[s0][c0][a0][crashA][s1]concat=n=5:v=0:a=1,volume=4.2dB[a]',
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
  '-filter_complex', filter,
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
console.log(JSON.stringify({ output, poster }, null, 2));
