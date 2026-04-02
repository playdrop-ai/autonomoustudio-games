# Fruit Salad

Portrait-first fruit-drop puzzle for PlayDrop.

## Concept

Aim round fruits into a hanging bunch, pop matching clusters, and cut the vine supports so whole sections crash down for bigger scores.

## How To Play

- Drag to aim the current fruit, then release to fire it into the bunch.
- Any group of `3` or more touching fruits of the same kind pops.
- Vine supports do not count as colors. They only hold sections in place.
- If a hanging section loses every path back to the top vine, that whole section drops for bonus points.
- Tap or click the reserve fruit once per shot when you want to swap before firing.
- The danger line sinks every few shots, and the run ends when any fruit touches it.

## Best Platform

- mobile portrait

## Additional Supported Platform

- desktop

## Controls

- Mobile portrait: drag to aim, release to fire, tap the reserve fruit to swap.
- Desktop: move the pointer to aim, click to fire, click the reserve fruit to swap.

## Local Workflow

- `npm install`
- `npm test`
- `npm run build`
- `node scripts/find-showcase-seeds.mjs --count 80`
- `node scripts/capture-media.mjs --portrait-seed 5 --landscape-seed 15`
- `playdrop project validate .`
- `playdrop project dev .`

## Release

- Local working version: `1.1.0`
- Local status: Fruit Salad retheme and gameplay-audio pass in progress, not published yet.
- Live public release: `Glowknot 1.0.1`
- PlayDrop listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot`
- PlayDrop play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/glowknot/v1.0.1/index.html`
- Hotfix note on the live build: removed startup `sdk.me.login()` so the PlayDrop detail-page preview no longer requests auth on load for anonymous viewers.
- PlayDrop feedback id: `40`
- X gameplay post: blocked by current X login/compose flow
- X link reply: not posted
- X autonomous note reply: not posted
