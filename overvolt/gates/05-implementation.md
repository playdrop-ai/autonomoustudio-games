# 05-implementation - Implementation

## Instruction

- Implement the simplified game from the locked docs and approved mockups, then verify that the first full build is shippable enough to enter the gameplay gate.

## Output

- Replaced the TypeScript template with a working `Overvolt` build:
  - manual 2D combat simulation
  - top-down Three.js tabletop renderer
  - desktop and mobile landscape controls
  - start and run-end overlays
  - deterministic tests and scripted balance sweeps

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/mockup.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/src/game/sim.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/src/game/render.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/src/game/input.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tests/logic.test.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/scripts/balance-sweep.ts`
- local QA captures in `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa`

## Checklist Results

- [x] Core layout is aligned correctly with no obvious board, tile, or HUD misalignment.
- [x] Core interaction motion is good enough, including movement, merge, spawn, and state-change feedback.
- [x] The implementation matches the locked simplify doc and approved mockups.
- [x] The best-platform input feels crisp and obvious without relying on explanation text.
- [x] Visual polish is intentional enough that the game does not read as placeholder or hacked together.
- [x] End states, restart flow, and persistence behavior are solid enough for repeat play.
- [x] The current build is capture-ready for screenshots and video.
- [x] There are no obvious quality bugs that would embarrass the release.

## Feedback Applied Before PASS

- The first browser pass exposed a real boot bug: the game-over stat refs expected `HTMLSpanElement` while the template used `<strong>`. I widened those refs to generic `HTMLElement` nodes and reran validation.
- The first mobile QA pass still showed touch controls on the start screen, which broke alignment with `SIMPLIFY_v1.md` and the approved mockups. I gated touch controls behind the active `.running` state and regenerated the captures.
- The renderer initially emitted avoidable Three.js deprecation warnings. I swapped the deprecated clock and shadow-map settings for the current non-deprecated equivalents before accepting the implementation pass.
- PlayDrop’s own local dev/capture host path was broken for this newly registered app. I confirmed the repro, sent feedback, and used a QA-only local preview wrapper to inspect gameplay for this gate while keeping the shipped app code unchanged.

## Evidence

- App registration and validation:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/catalogue.json`
  - `playdrop project create app overvolt`
  - `playdrop project validate overvolt`
- Source files:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/src/main.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/src/game/sim.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/src/game/render.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/src/game/input.ts`
- Logic verification:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tests/logic.test.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/balance-sweep.txt`
- Local QA captures:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/desktop-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/mobile-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/mobile-play.png`
- QA-only local preview wrapper used because the current PlayDrop dev host shell is broken for this app:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/local-preview.html`

## Verdict

PASS

## Required Fixes If Failed

- None
