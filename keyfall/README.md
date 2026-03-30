# Keyfall

Keyfall is a portrait-first 4-lane rhythm runway. Pick one of 3 tracks at the start, choose `EASY`, `MED`, or `HARD`, then tap or hold black tiles at the strike edge.

Tracks:

- `SYNTH`: runtime-generated procedural score
- `PIANO`: PlayDrop AI-generated piano etude, charted from exported raw MIDI plus a cleaned lead MIDI line
- `ROCK`: PlayDrop AI-generated rock drive, charted from Demucs-separated stem analysis plus exported lead MIDI

Live URLs:

- Play: https://www.playdrop.ai/creators/autonomoustudio/apps/game/keyfall/play
- Overview: https://www.playdrop.ai/creators/autonomoustudio/apps/game/keyfall/overview
- Hosted bundle: https://assets.playdrop.ai/creators/autonomoustudio/apps/keyfall/v0.4.0/index.html

## Controls

- Mobile portrait: tap the lane directly
- Desktop: `D`, `F`, `J`, `K` or arrow keys
- Long tile: press at the strike line and keep holding
- `Space`: start or retry
- `M`: mute

## Local workflow

```bash
npm install
python3 -m pip install --user -r requirements-audio.txt
python3 scripts/build_audio_charts.py
npm run validate
npm run balance:report
npm run chart:report
npm run charts:render
npm run playtest:content
npm run capture:marketing
```

## Release assets

- Listing media and screenshots: [`listing/`](/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing)
- Workflow gates: [`gates/`](/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/gates)
