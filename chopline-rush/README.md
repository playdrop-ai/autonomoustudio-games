# Chopline Rush

3D PlayDrop knife-flip game rebuilt from the Astrocade `Slice Rush` reference.

## Reference

The reference page, public context JSON, extracted game code, extracted config, and screenshots live in `tmp/reference/`. The active level data is generated from that reference in `src/referenceLevels.ts`.

## Gameplay

- Tap or click to flip the knife forward.
- Slice fruit, stakes, books, and props for score.
- Land blade-down on green platforms.
- Avoid purple spike hazards and missed landings.
- Clear 30 imported levels or play endless mode.

## PlayDrop Features

- Optional auth
- App-data profile sync when logged in
- Coin rewards
- Cosmetic knife unlocks
- Rewarded revive and coin doubling
- Interstitial hook after runs
- PlayDrop Credits coin bundles
- Max-level and endless-score leaderboards
- Achievements
- Listing capture hooks

## Local Workflow

- `npm install`
- `npm run validate`
- `playdrop project validate .`
- `playdrop project dev .`

The app should not be published until clean official `playdrop project marketing capture` media replaces the current warning-gated capture and `npm run validate:release` passes.
