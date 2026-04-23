# Starfold

Portrait-first chain-reaction puzzle for PlayDrop.

## Concept

Swipe one whole row or column. After each move, any orthogonally connected group of 3+ matching sigils disappears. Clear beside ash three times to purge it before the shrine runs out of moves. Ash starts slow, then turns relentless in long runs.

## How To Play

- Swipe any row left or right, or any column up or down, to rotate that whole line by one space.
- Any orthogonally connected group of 3 or more matching sigils disappears and scores points.
- Ash does not match on its own. Clear beside ash to damage it one step at a time: `ash3 -> ash2 -> ash1 -> gone`.
- Ash starts by spreading every fourth move, then accelerates hard in longer runs.
- A swipe only counts if it creates a clear. Invalid shifts snap back.
- The run ends when no legal scoring move remains.

## Best Platform

- mobile portrait

## Additional Supported Platforms

- mobile landscape
- desktop

## Playdrop v0.5 update

- Optional account flow with post-run score saving
- Preview-ready board boot on supported Playdrop surfaces
- Live highest-score leaderboard
- Eleven achievements with bespoke store art, including lifetime progress goals
- Approved shrine artwork now drives the runtime board background, frame, and tile set
- Minimal HUD stays outside the frame on portrait, mobile landscape, and desktop
- Refined board frame and smoother elimination chaining
- Row and column drags now follow the pointer directly, with a subtle frame-edge fade on moving tiles
- Staged ash damage raises the pressure without removing comeback clears

## Controls

- Mobile portrait: swipe directly across a row or column to shift that line by one cell.
- Mobile landscape: swipe directly across a row or column to shift that line by one cell.
- Desktop: click-drag across a row or column to shift that line by one cell.

## Local workflow

- `npm install`
- `npm run validate`
- `playdrop project validate .`
- `playdrop project dev .`

## Release

- Version: `1.4.19`
- Released: `2026-04-22`
- PlayDrop listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/starfold`
- PlayDrop overview URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/starfold/overview`
- Play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/starfold/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/starfold/v1.4.19/index.html`
- X gameplay post: not posted
- X link post: not posted
