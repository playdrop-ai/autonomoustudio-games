# 05-implementation - First Complete Build

## Instruction

- Implement the first complete playable `Switchback Dispatch` build so it matches `SIMPLIFY_v1.md`, is capture-ready, and is solid enough to move into the gameplay gate.

## Output

- Built the full v1 courier-contract loop in the local app:
  - three sequential solo contracts on the alpine loop
  - active and next delivery beacons with countdown, timer, and result states
  - medal targets, retry/back flow, and per-contract best-time persistence
- Replaced the starter-kit multiplayer demo framing with a purpose-built desktop HUD and contract-select screen.
- Restored the real PlayDrop dev flow so the app now runs through `playdrop project dev .` and can be checked in a real browser shell instead of mockups only.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/mockups/contract-select-desktop.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/mockups/gameplay-desktop.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/mockups/results-desktop.png`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/template.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/src/runtime/camera.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/src/runtime/contracts.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/src/runtime/game.ts`

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

- The first local dev attempt failed because `switchback-dispatch` had not been registered server-side. I fixed that by registering the app from a clean empty temporary directory, then returning to the real repo folder so the intended app id works with `playdrop project dev .`.
- The first browser review also failed because I opened the raw local `index.html` route, which does not provide the required PlayDrop host query params. I switched implementation QA to the generated `dist/test-host.html` page so the SDK bridge and runtime hooks are present.
- The first playable implementation pass failed on two visible issues:
  - the start CTA stack fell below the fold at `1280x720`
  - the follow camera and foreground trees made the truck disappear during active play
- I fixed those by tightening the start-overlay spacing, moving the control chip out of the main card stack, and reworking the follow-camera framing so the truck stays visible while the route ahead still reads.

## Evidence

- Validation:
  - `npm run validate`
  - `playdrop project validate .`
- Local start review:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/start-after-layout-fix-2/page.png`
- Local gameplay review:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/driving-after-camera-fix-2/page.png`
- Local timeout/result review:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/result-timeout/page.png`

## Verdict

PASS

## Required Fixes If Failed

- None
