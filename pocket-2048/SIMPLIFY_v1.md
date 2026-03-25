# Pocket 2048 - SIMPLIFY v1

## Core promise

Pocket 2048 is a crisp portrait-first 2048 that feels excellent to swipe on a phone and stays readable and satisfying on desktop.

## Locked frame

- Best platform: mobile portrait
- Additional supported platforms: desktop only
- Final gameplay family: UI / 2D board puzzle
- Final game meta: Single Loop

## Final input model

- Mobile portrait: direct swipe gestures only
- Desktop: arrow keys or WASD, with mouse drag only if it is trivial and solid

## Final HUD and screens

- Gameplay:
  - current score
  - subtle restart control
  - optional first-run microhint that disappears after the first move
- End states:
  - one lightweight win overlay at 2048
  - one game-over overlay with score, best score, and restart

There is no title screen, no tutorial popup, no settings screen, and no persistent best-score panel during active play.

## Final art and asset scope

- Code-rendered board, tiles, gradients, shadows, and typography
- One consistent premium mobile-app visual language
- Bespoke listing assets:
  - icon
  - hero portrait
  - hero landscape
  - screenshots from the real runtime
  - one short gameplay video

## Not in v1

- Undo
- Daily challenge
- Achievements
- Online scores
- Login-dependent progression
- Multiple board sizes
- Theme switching
- Soundtrack or SFX if they slow shipping
- Mobile landscape support
- Any mechanic change that makes it no longer obviously 2048
