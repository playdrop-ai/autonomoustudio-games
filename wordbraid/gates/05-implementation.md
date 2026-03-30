# 05-implementation - Implementation

## Instruction

- Complete the first full playable implementation pass for Wordbraid and verify that the build, interaction loop, persistence, and capture workflow are solid enough to advance to the gameplay gate.

## Output

- A working portrait-first Wordbraid build with desktop support, deterministic ribbon/ink logic, local best-score persistence, automated local capture helpers, and passing implementation verification commands.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/mockups/mobile-portrait-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/mockups/mobile-portrait-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/mockups/mobile-portrait-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/mockups/desktop-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/mockups/desktop-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/mockups/desktop-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`

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

- Fixed Node/TS import resolution by switching runtime imports to explicit `.ts` paths and enabling `allowImportingTsExtensions`.
- Registered the app on PlayDrop after `project dev` exposed that the first create step had not completed server-side registration.
- Removed the unnecessary `sdk.me.login()` bootstrap dependency after it blocked shell initialization during capture attempts.
- Added safe-braid filtering and dead-end rejection messaging so valid-looking words that would stall the loom no longer crash automation or the live loop.
- Added a reusable local Playwright capture script to generate start/gameplay/end proof on both supported surfaces.
- Added catalogue `emoji` and `color` metadata to clear the PlayDrop validation warning.

## Evidence

- Command pass: `npm test`
- Command pass: `npm run validate`
- Command pass: `playdrop project validate .`
- Balance report: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/balance/balance-report.md`
- Local capture helper: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/scripts/capture-local-states.mjs`
- Portrait captures: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-mobile-start.png`
- Portrait captures: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-mobile-gameplay.png`
- Portrait captures: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-mobile-end.png`
- Desktop captures: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-start.png`
- Desktop captures: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-gameplay.png`
- Desktop captures: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-end.png`

## Verdict

PASS

## Required Fixes If Failed

- None
