# 05-implementation - Implementation

## Instruction

- Build the game to match the simplified concept and approved mockups with correct layout, readability, and motion quality.

## Output

- Runnable portrait-first rhythm game with desktop keyboard support, deterministic balance sweeps, passing local validation, and PlayDrop project validation.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/src/`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/tests/logic.test.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/scripts/simulate-balance.ts`

## Checklist Results

- [x] Core layout is aligned correctly with no obvious board, tile, or HUD misalignment.
- [x] Core interaction motion is good enough, including movement and hit-state feedback.
- [x] The implementation matches the locked simplify doc and approved mockups.
- [x] The best-platform input feels crisp and obvious without relying on explanation text.
- [x] Visual polish is intentional enough that the game does not read as placeholder or hacked together.
- [x] End states, restart flow, and persistence behavior are solid enough for repeat play.
- [x] The current build is capture-ready for screenshots and video.
- [x] There are no obvious quality bugs that would embarrass the release.

## Feedback Applied Before PASS

- The first strict TypeScript pass failed on `noUncheckedIndexedAccess`, exact optional types, and a conflicting `window.playdrop` declaration. I fixed the invariants explicitly instead of loosening compiler settings.
- Local browser verification initially threw a PlayDrop SDK init error before the host bridge catch path. I gated SDK init on `playdrop_channel` so local previews no longer throw while hosted PlayDrop sessions still work.
- The first portrait HUD pass let the preview chips collide with the song/combo cluster and placed the overlays too deep into the runway. I tightened the top HUD spacing and lifted the overlays before moving on to the gameplay gate.
- The HTML shell emitted a useless favicon 404. I added an inline `data:,` favicon so browser-console verification stays clean.

## Evidence

- Validation:
  - `npm run validate`
  - `playdrop project validate .`
- Core source:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/src/main.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/src/game/logic.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/src/game/audio.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/src/render/scene.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/src/ui/dom.ts`

## Verdict

PASS

## Required Fixes If Failed

- None
