# Flighty Saucer — Product Specification

## Player promise

Fly a tiny saucer through a vivid, shifting low-poly world with one responsive
tap. Every clean gate should feel readable, fair, and satisfying.

## Requirements

- Rename the supplied game to **Flighty Saucer** throughout.
- Preserve its one-touch flight loop, procedural saucer, gates, hazards, biome
  progression, synthesized audio, and adaptive rendering.
- Ship as a registered PlayDrop TypeScript app using the SDK-pinned Three.js
  runtime.
- Treat mobile portrait as the primary surface; also support mobile landscape
  and desktop.
- Respect CSS safe-area insets and Mobile Safari visual viewport, audio,
  backgrounding, pause/resume, and WebGL context restoration behavior.
- Open directly on the flight scene with only the best score visible.
- Keep gates, hazards, physics, scoring, and player statistics dormant until
  the first player input.
- Fade the best score out and reveal the run score when the first input starts
  active flight.
- Persist best score and cumulative stats through PlayDrop app data only during
  player-controlled sessions. Preview autoplay must never write player data,
  achievements, leaderboard scores, or statistics.
- Publish a high-score leaderboard and flight achievements.
- Provide complete PlayDrop lifecycle, deterministic playtest tapes, truthful
  listing media, and a private production draft for review.

## Controls

- Tap/click/Space/Up/W: start and flap.
- R: restart.
- F: performance overlay.

## Quality bar

- Stable 60 fps target with fixed-step physics and adaptive render scale.
- No content behind iPhone notches or the home indicator.
- No continued simulation while the host, document, or WebGL context is paused.
- Host pause and resume must preserve the current run.
