# Latchbloom

Portrait-first blossom-routing arcade game for PlayDrop.

## Concept

Tap brass latches to reroute falling blossoms into the matching vases, bloom bouquets, and erase strikes before the greenhouse shuts down.

## How To Play

- Tap a brass latch to swap or straighten the lane pair it controls.
- Watch the ghosted blossom above the board to see both the upcoming blossom and the lane it will enter from. Its ring fills as the spawn approaches.
- Route each blossom into the vase with the same flower icon to score.
- Every correct delivery fills that vase's bouquet meter.
- Every third correct blossom in the same vase blooms the bouquet and clears `1` global strike if any are active.
- Every wrong delivery adds `1` global strike.
- The run ends at `3` total strikes.

## Best Platform

- mobile portrait

## Additional Supported Platform

- desktop

## Controls

- Mobile portrait: tap latches directly on the glasshouse board.
- Desktop: click latches directly on the glasshouse board.

## Local workflow

- `npm install`
- `npm run validate`
- `playdrop project validate .`
- `playdrop project dev .`

## Release

- Version: `1.0.3`
- Released: `2026-03-26`
- PlayDrop listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/latchbloom`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/latchbloom/v1.0.3/index.html`
- Listing/media refresh: real PlayDrop AI-generated hero pair, icon, and gameplay backdrops replaced the earlier fallback composites.
- X release thread: deferred on `2026-03-26` after repeated suspicious-activity-style friction in the authenticated browser flow.
