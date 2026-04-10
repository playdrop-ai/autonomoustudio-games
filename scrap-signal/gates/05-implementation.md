# 05-implementation - Implementation

## Instruction

- Build the game to match the simplified concept and approved mockups with correct layout, readability, and motion quality. Keep the PlayDrop source upload bounded and verify the real build before the gameplay gate.

## Output

- Implemented the full `Scrap Signal` desktop v1 runtime on the locked PlayDrop TypeScript path.
- Added browser-reviewed runtime captures, a reviewed landscape gameplay MP4, logic tests, and deterministic capture tooling inside the game folder.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-start-desktop.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-play-desktop.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-end-desktop.png`
- Runtime source:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/main.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/constants.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/sim.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/render.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/types.ts`
- Verification commands:
  - `npm run validate`
  - `playdrop project validate .`
  - `npm run capture:media`

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

- The first implementation pass still rendered mid-run HUD values on the start screen, which broke the approved mockup match. I split the fresh-shift preview state from the showcase gameplay state so the start overlay now reads coherently while the capture flow still has a strong midgame scene.
- The first implementation review also exposed that the battery-carry differentiator appeared too late in the opening session beat. I moved carrier access earlier so the loop is visible before the run feels like a generic kill-only arena.
- The first browser capture pass was too brittle and produced weak evidence because it depended on stale `dist/` output and ad hoc timing. I made `npm run capture:media` rebuild first and drive deterministic review scenes from the real runtime before passing the gate.

## Evidence

- Runtime shell: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/main.ts`
- Simulation and rendering:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/constants.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/sim.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/render.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/types.ts`
- Logic tests: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/tests/logic.test.ts`
- Capture tooling: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/scripts/capture-media.mjs`
- Source-upload guardrail: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/.playdropignore`
- Runtime review captures:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/runtime-review/desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/runtime-review/desktop-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/runtime-review/desktop-gameover.png`
- Capture-ready listing artifacts from the built runtime:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-2.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-recording.mp4`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/video-frames-check/frame-01.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/video-frames-check/frame-02.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/video-frames-check/frame-03.png`

## Verdict

PASS

## Required Fixes If Failed

- None
