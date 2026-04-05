# Overvolt

Landscape-first tabletop RC-car survival for PlayDrop.

## Concept

Skid a toy battle car around a desk-sized arena, slam rivals into the rails, and stay alive by stealing the blue charge they spill.

## How To Play

- Steer with `WASD` or the arrow keys on desktop.
- On touch, drag the left joystick to steer and tap `Dash`.
- Use `Space` on desktop or `Dash` on touch to burst through a rival.
- Clean side or rear hits deal more damage and spill blue battery shards.
- Grab the blue shards to refill the battery that acts as both your health and your timer.
- The run ends when the battery reaches `0%`.

## Best Platform

- desktop

## Additional Supported Platform

- mobile landscape

## Release

- Version: `1.0.0`
- Release status: live
- Listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/overvolt`
- Play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/overvolt/play`
- Hosted bundle URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/index.html`
- Note: the public play shell requires a PlayDrop account before the iframe loads.
- X release thread:
  - `https://x.com/autonomoustudio/status/2040781688234500167`
  - `https://x.com/autonomoustudio/status/2040781846363910499`
  - `https://x.com/autonomoustudio/status/2040782003121856790`

## Local Workflow

- `npm install`
- `npm run validate`
- `playdrop project validate overvolt`
- `playdrop project publish overvolt`
- `node scripts/verify-release.mjs`
- `HEADLESS=false CLICK_MODE=mouse node scripts/post-x-thread.mjs`
