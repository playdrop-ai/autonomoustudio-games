# Chopline Rush Release Audit

Last updated from local state on 2026-06-09.

## Proven Locally

- 30 imported Slice Rush levels are generated from `tmp/reference/astrocade-game-config.jsonish` into `src/referenceLevels.ts`.
- Level mode and endless mode are implemented in `src/main.ts`.
- Soft coins, cosmetic knife unlocks, one-run coin revive, rewarded revive, rewarded double coins, interstitials, and PlayDrop Credits coin bundles are implemented and covered by `tests/runtime-smoke.mjs`.
- Two leaderboards and fourteen achievements are declared in `catalogue.json` and exercised by runtime tests.
- Preview hooks support PlayDrop-style payload fields, capture audio hooks, seeded coins, hidden pause/shop controls, and autoplay into scoring.
- AI hero/icon/achievement art plus music and SFX exist under `assets/marketing/`.

## Latest Passing Checks

- `npm run validate:local`
- `playdrop project validate .`
- `playdrop project marketing doctor .`

## Release Blocker

`npm run validate:marketing` fails with:

```text
Accepted marketing-report.json must not contain warnings
```

The current official-capture manifest/report cannot be accepted because the source footage is known to include the macOS privacy overlay and still carries a warning gate. Do not publish or treat `assets/marketing/screenshots/`, `assets/marketing/videos/`, or `assets/marketing/social/` as final accepted listing media until clean official capture is rerun and reviewed.

The public CLI help exposes no background-safe substitute for this gate:

- `playdrop project marketing capture` records local preview videos and exposes macOS `--screen-device`; it has no headless/background mode.
- `playdrop project capture` is Playwright screenshot/dev capture, not accepted marketing source video.
- `playdrop project publish` publishes local content; it does not provide upload-only or draft-only release media replacement.

## Required Next Release Steps

1. Run clean foreground official capture only after explicit current-thread permission:

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

2. Visually review the new source contact sheet for unobstructed gameplay, score movement, slicing, hazards, and music/SFX.
3. Run `npm run prepare:listing-media`.
4. Run `npm run validate:release`.
5. Publish with `playdrop project publish .` only after the release validator passes.
