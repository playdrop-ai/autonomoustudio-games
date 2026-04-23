# Lunchline

`Lunchline` is a portrait-first lunch-rush cluster puzzle for PlayDrop. Tap connected ingredient groups to fill the current lunchbox order before the shift racks up too many complaints.

## Live

- Listing: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/lunchline`
- Play: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/lunchline/play`
- Hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/index.html`
- Current public version: `1.0.0`

## Current scope

- Best platform: `mobile portrait`
- Additional supported platform: `desktop`
- Core loop: tap clusters of matching ingredients, fill one visible lunchbox order, survive the lunch rush
- Differentiator: the active order changes which clusters matter from the first move instead of leaving the game as a generic clearer

## Workflow docs

- High-level requirements: [`SPECS.md`](/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/SPECS.md)
- Full build spec: [`SPECS_v1.md`](/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/SPECS_v1.md)
- Simplified locked v1: [`SIMPLIFY_v1.md`](/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/SIMPLIFY_v1.md)
- Progress log: [`progress.md`](/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/progress.md)

## Development

- `npm install`
- `npm run build`
- `npm run validate`
- `playdrop project validate .`
- `node scripts/capture-media.mjs`
- `node scripts/export-listing-art.mjs`
- `node scripts/release-check.mjs`
- `playdrop project dev .`
