# Wordbraid v1 Simplify Pass

## Core Promise In One Sentence

Build 3-to-5-letter words from five visible letter ribbons and use longer words to keep ink from reaching the front of the loom.

## Differentiator That Survived Simplification

The five independent ribbon queues remain the core identity. Every submitted word changes only the ribbons you consumed, so the player is planning future fronts instead of merely spotting a word on a static board.

## Best Platform

`mobile portrait`

## Additional Supported Platforms That Still Survive

- `desktop`

## Final Gameplay Family

Single-screen endless word arcade.

## Final Game Meta

Score chase with ink-jam survival pressure.

## Final Input Model Per Supported Platform

- Mobile portrait:
  - tap ribbon to pull front tile
  - tap `WEAVE` to submit
  - tap tray tail to undo
  - tap `CLEAR` to empty tray
- Desktop:
  - click ribbon to pull front tile
  - `Enter` to submit
  - `Backspace` to undo
  - `Escape` to clear

## Final HUD And Key Screens

- Start screen:
  - title
  - short instruction line
  - `START`
- Gameplay:
  - five-ribbon board
  - score
  - combo
  - ink warning
  - tray
  - `WEAVE`
  - `CLEAR`
- Game-over:
  - final score
  - best score
  - best combo
  - `PLAY AGAIN`

## Final Art And Asset Scope

- Bespoke 2D canvas visuals only
- no character art
- no external runtime asset dependency
- one restrained ambient palette: ink blue, ivory, gold, copper
- small set of tile, thread, paper, spark, and ink motifs
- short UI SFX only if time remains after gameplay polish

## Final Rule Set

- valid words are 3 to 5 letters
- only front ribbon tiles are selectable
- same ribbon can be consumed multiple times inside one word
- each submitted word inserts 1 new ink tile at the back
- 4-letter words scrub 1 ink tile
- 5-letter words scrub 2 ink tiles
- run ends when ink reaches the selectable front of any ribbon

## Not In V1

- daily challenge mode
- async leaderboard or profile systems
- achievements
- alternate themes or skins
- special wildcard tiles
- hint system
- tutorial sequence beyond one short start-screen hint
- mobile landscape support
- music generation pipeline
- social or multiplayer features
