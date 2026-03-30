# 05-implementation - Implementation

## Instruction

- Implement the simplified game to a capture-ready state, matching the locked docs and mockups closely enough that the gameplay gate can judge the shipped build rather than a prototype.

## Output

- Shipped a full first-release build of `Drifthook` with portrait-first input, desktop support, score persistence, audio cues, balanced spawn/catch logic, and reproducible real-build capture tooling.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/mockups/gameplay-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/mockups/gameplay-desktop.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/src/game/logic.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/src/render/canvas.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/src/ui/dom.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/tests/logic.test.ts`

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

- Earlier runtime review showed the active lake felt too empty between catches, so I added ambient fish movement to keep the water alive without changing the actual catch logic.
- Narrow portrait review exposed top-HUD crowding, so I adjusted the DOM layout to move the order strip into a safer stacked position on smaller portrait screens.
- Early browser checks surfaced an avoidable audio unlock warning and a missing favicon request; both were fixed before final capture.

## Evidence

- Validation:
  - `npm run validate`
  - `playdrop project validate .`
- Logic and balance:
  - `npm test`
  - `npm run balance`
- Real-build capture pipeline:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/scripts/capture-media.mjs`
  - `npm run capture:media`
- Current real-build screenshots:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/portrait-gameplay.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/portrait-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/landscape-gameplay.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/landscape-gameover.png`
- Current gameplay video:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook-gameplay.mp4`

## Verdict

PASS

## Required Fixes If Failed

- None
