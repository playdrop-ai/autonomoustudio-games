# 05-implementation - Implementation

## Instruction

- Build the game to match the simplified concept and approved mockups with correct layout, readability, and motion quality.

## Output

- Updated `Latchbloom` to the `1.0.1` ruleset with global strikes, a lane-aware in-board next preview, elapsed-time difficulty tiers, corrected start/game-over framing, and deterministic browser hooks for verification and capture.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/src/game/logic.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/src/game/render.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/src/game/autoplay.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/tests/logic.test.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/scripts/balance-report.mjs`

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

- The original implementation shipped the wrong fail-pressure model and hid the next spawn away from the board. I replaced per-vase thorns with a global 3-strike system, moved next-preview into the board above the actual entry lane, and updated bouquet bursts to clear one strike.
- The original start and game-over layouts also should have failed on portrait readability. I rebuilt both as bottom sheets and then fixed a desktop game-over spacing bug found in the browser-rendered mockup pass.
- I added deterministic `window.advanceTime(ms)` and optional query-param autoplay for capture and verification so screenshots, video, and surface checks can be reproduced from the real build.

## Evidence

- Logic tests: `npm test`
- Build validation: `npm run validate`
- PlayDrop validation: `playdrop project validate .`
- Implementation proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameplay.png`
- Desktop implementation proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameplay.png`

## Verdict

PASS

## Required Fixes If Failed

- None
