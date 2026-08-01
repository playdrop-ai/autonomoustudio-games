# Chopline Rush Marketing

## Current Status

- PlayDrop AI hero art, portrait hero art, icon art, achievement badge art, music, and SFX are generated and tracked in `assets/marketing/asset-manifest.json`.
- `playdrop project marketing doctor .` passes.
- `npm run validate:local` and `playdrop project validate .` pass after the latest 3D visual parity and finish-marker pass.
- Preview capture hooks now accept the full PlayDrop-style payload (`active`, `sceneId`, `surface`, `seed`, `audioPolicy`), hide nonessential pause/shop controls, seed capture coins, honor silent audio policy through capture start, autoplay into scoring, and pass `tests/runtime-smoke.mjs`.
- `npm run validate:marketing` still fails with `Accepted marketing-report.json must not contain warnings`; this is intentional until a clean official capture replaces the current warning-gated media.
- Current live PlayDrop catalogue version is `1.0.1`; local prepared runtime version is `1.0.2`.
- Latest local visual parity proof: `tmp/visual-parity/compare-start-v13.png` and `tmp/visual-parity/compare-after-flip-v13-timed.png`.
- Latest non-accepted PlayDrop dev shell smoke screenshot: `tmp/playdrop-dev-mobile-portrait-v102-final.png`.
- Official marketing capture is currently blocked on this Mac because `playdrop project marketing capture .` records the macOS privacy overlay in the source footage, then can hang in the AVFoundation desktop recorder.
- Do not treat the existing `assets/marketing/capture-manifest.json`, `assets/marketing/marketing-report.json`, screenshots, or videos as release-accepted media. The report still contains a warning, and `assets/marketing/review/source-recapture-contact-sheet.png` shows the privacy overlay inside the captured gameplay.

## Required Official Capture

Run only after foreground recording is approved in the current thread:

```bash
playdrop project marketing capture . \
  --surfaces mobile-landscape \
  --duration 15 \
  --fps 60 \
  --audio-policy music-and-sfx \
  --seed chopline-rush-v5 \
  --output-dir assets/marketing \
  --screen-device 1
```

The command should create `assets/marketing/capture-manifest.json`, `assets/marketing/marketing-report.json`, and source captures under `assets/marketing/captures/`.

If the command hangs again on `ffmpeg -f avfoundation -i 1:none`, fix macOS screen recording availability first. Do not use Terminal.app automation, full-desktop screenshots, manual recordings, Playwright videos, or hidden/internal capture commands as substitutes.

Before rerunning, grant the process named in the macOS prompt screen and system-audio recording permission in System Settings. The capture must show unobstructed gameplay with no privacy prompt or browser permission overlay.

## Listing Media Follow-Up

After official capture passes:

1. Select a gameplay moment with slicing, hazard pressure, score movement, and audible music/SFX.
2. Render final listing screenshot/video derivatives, social video families, thumbnails, and review contact sheets:

```bash
npm run prepare:listing-media
```

The helper updates `catalogue.json` `listing.screenshotsLandscape` and `listing.videosLandscape` to the accepted `assets/marketing/` outputs.

3. Review the contact sheets in `assets/marketing/review/`.
4. Re-run:

```bash
npm run validate:release
```

5. Publish with:

```bash
playdrop project publish .
```
