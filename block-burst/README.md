# Block Burst

Drag pieces onto the grid, clear full rows and columns, and chain special burst blocks before the board locks up.

## PlayDrop

- App name: `block-burst`
- Display name: `Block Burst`
- Build output: `dist/index.html`
- Main surfaces: desktop, mobile portrait, mobile landscape
- Leaderboard: `highest_score`

## Development

```bash
npm run validate
playdrop project validate block-burst
playdrop project dev block-burst
```

The app is a TypeScript Phaser project with PlayDrop SDK integration for lifecycle, leaderboard submission, rewarded ads, interstitial ads, and listing preview capture.
