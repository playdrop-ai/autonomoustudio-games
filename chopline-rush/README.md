# Chopline Rush

Portrait-first 3D knife-flip arcade game for PlayDrop. Learn one precise three-tap rhythm, carve
through 60 authored levels, then use the same deterministic physics to chase an endless high score.

## Production Core

- 60 finite levels across five difficulty acts; endless remains as the mastery mode.
- Reference-faithful first-run opening: one `TAP TO FLIP` prompt, a launch that fails without a follow-up, and a visible slab wall that physically teaches the timed airborne tap.
- Fixed-step analytic knife physics with blade/handle sweeps and deterministic test hooks.
- Physical split halves, hit stop, camera trauma, landing rings, and cut-and-plant chopping-board finales.
- One point and one soft coin per cut; knife and theme unlocks remain optional side content.
- Core retry/result flow is uninterrupted by ads or rewarded prompts.

## Code Layout

- `src/main.ts` contains runtime, physics, collisions, effects, UI, and PlayDrop integration.
- `src/game/levels.ts` contains the 60 named level blueprints.
- `src/game/knifeModel.ts` normalizes semantic knife anchors into visual and collision geometry.
- `template.html` contains the portrait shell and CSS; `build.mjs` emits `dist/index.html`.
- `SPECS.md` is the detailed gameplay and release contract.
- `tests/` contains deterministic mechanics, browser smoke, bot, chunk, generator, and visual checks.

## Local Workflow

```sh
npm ci
npm run validate:local
npm run proof:mechanics
playdrop project check .
playdrop project dev .
```

The production build also exposes `window.render_game_to_text()` and `window.advanceTime(ms)` for
deterministic external playtest clients.
