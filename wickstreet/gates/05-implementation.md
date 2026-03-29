# 05-implementation - Implementation

## Instruction

- Implement the simplified Wickstreet build so the approved mockups, input model, persistence, and repeat-play flow all work in a real browser build before the gameplay gate.

## Output

- A complete TypeScript PlayDrop app with deterministic game logic, canvas rendering, DOM HUD/overlays, persistence, seeded balance scripts, and a Playwright verifier for desktop and mobile landscape.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/mockups/review-sheet.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/src/game/logic.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/src/render/canvas.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/src/ui/dom.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tests/logic.test.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/scripts/verify-gameplay.mjs`

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

- The first implementation pass failed the release balance bar because the storm never became demanding enough. I tightened the live timer curve, increased later barrier density, and recalibrated the scripted casual policy so the seeded balance sweep now reflects the intended session bands.
- The first browser layout audit showed the gameplay HUD still sitting underneath the start and game-over overlays. I hid the active-play HUD and request strip whenever the game is not in `playing` state so the key screens read cleanly.
- Local `playdrop project capture` still reproduced a PlayDrop shell/session failure even on the untouched registered template. I kept the build capture-ready by adding a query-gated automation snapshot hook and a real Playwright verifier that drives the actual app on desktop and mobile landscape for screenshot and video proof.

## Evidence

- Validation: `npm run validate`
- Logic tests: `npm test`
- PlayDrop validation: `playdrop project validate .`
- Local verification runner: `node scripts/verify-gameplay.mjs tmp/verification-local local`
- Start/play/game-over browser captures:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/desktop-playing.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/desktop-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/mobile-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/mobile-playing.png`

## Verdict

PASS

## Required Fixes If Failed

- None
