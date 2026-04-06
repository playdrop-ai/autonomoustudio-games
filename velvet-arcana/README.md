# Velvet Arcana

Portrait-first Golf-style solitaire for PlayDrop.

## Current Local Direction

The local project is in a `v2` redesign pass. The build target is a tighter Golf-style board with `7` stacked columns, top-card-only interaction, and a three-spread difficulty arc driven by information:

- `Past`: next stock card preview
- `Present`: reference Golf behavior
- `Future`: buried cards stay hidden until exposed

## How To Play In The Redesign Build

- Play only the exposed top card in a column.
- A playable card must be exactly `1` rank higher or lower than the active card.
- `A` and `K` wrap.
- Tap the stock when no useful exposed top card remains.
- Clear all `35` tableau cards to finish the spread.
- Clear `Past`, `Present`, and `Future` in sequence for the full run.

## Best Platform

- mobile portrait

## Additional Supported Platform

- desktop

## Local Workflow

- `npm install`
- `npm test`
- `npm run validate`
- `playdrop project validate .`
- `playdrop project dev .`

## Release Status

- Current live PlayDrop release: `1.0.5`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/velvet-arcana`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/velvet-arcana/play`
- Note: the local repo may contain redesign work that is newer than the currently live public build until the next republish pass.
