# 05-implementation - Implementation

## Instruction

- Build the game to match the simplified concept and approved mockups with correct layout, readability, and motion quality.

## Output

- Updated `Latchbloom` to the `1.0.2` ruleset with runtime backdrop loading, a preload fallback path, ghosted next-preview timing ring, compact portrait HUD placement, stable game-over spacing, and a clean PlayDrop source-upload path via `.playdropignore`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/src/game/backdrops.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/assets/backdrops/latchbloom-board-landscape.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/assets/backdrops/latchbloom-board-portrait.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/.playdropignore`
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

- The original implementation shipped the wrong fail-pressure model and hid the next spawn away from the board. That `1.0.1` fix remains, and `1.0.2` extends it with the requested ghosted blossom preview and circular charge ring so the spawn timing is readable without extra label text.
- The `1.0.1` portrait HUD still overlapped the top of the frame and the live game still felt cheaper than the hero art. I added the runtime backdrop pipeline, aligned the board to painted portrait and landscape greenhouse backdrops, moved the portrait HUD into a safe top rail, and recaptured both supported surfaces.
- The game-over layout was rebuilt into fixed stat rows, and the PlayDrop publish path was hardened with `.playdropignore` after the source archive was found to be pulling in generated `output/` artifacts.

## Evidence

- Logic tests: `npm test`
- Build validation: `npm run validate`
- PlayDrop validation: `playdrop project validate .`
- Implementation proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameplay.png`
- Desktop implementation proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameplay.png`
- Live desktop gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-build-1.0.2-desktop-gameplay-v2.png`
- Live portrait gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-build-1.0.2-portrait-gameplay.png`

## Verdict

PASS

## Required Fixes If Failed

- None
