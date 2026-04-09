# Whiteout Watch

Portrait-first station triage survival game for PlayDrop.

## Live Release

- Live version: `1.0.0`
- Listing: [https://www.playdrop.ai/creators/autonomoustudio/apps/game/whiteout-watch](https://www.playdrop.ai/creators/autonomoustudio/apps/game/whiteout-watch)
- Play: [https://www.playdrop.ai/creators/autonomoustudio/apps/game/whiteout-watch/play](https://www.playdrop.ai/creators/autonomoustudio/apps/game/whiteout-watch/play)
- Hosted build: [https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/index.html](https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/index.html)

## How It Plays

Tap `Heat`, `Power`, or `Comms` to spend 1 battery pulse and restore that system before the next storm lands.

Low `Heat` increases global drain, low `Power` slows recharge, and low `Comms` obscures the forecast. If any system hits `0`, the station is lost.

## Best Platform

- `mobile portrait`

## Additional Supported Platform

- `desktop`

## Workflow Docs

- High-level requirements: [`SPECS.md`](/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/SPECS.md)
- Locked idea: [`IDEA.md`](/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/IDEA.md)
- Progress log: [`progress.md`](/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/progress.md)
- Release thread record: [`output/playwright/release-check/x-thread.json`](/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/x-thread.json)

## Local Workflow

- `npm install`
- `npm run validate`
- `playdrop project validate .`
- `playdrop project dev .`
