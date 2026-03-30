# 06-gameplay-v1 - Gameplay Gate

## Instruction

- Run the pre-publish gameplay review for the shipped v1 build, confirm the supported surfaces, and verify that the endless-score balance sweep meets the required idle/casual/expert targets before listing and release work begins.

## Output

- A gameplay-reviewed Wordbraid build with validated portrait-first presentation, working desktop support, and a passing scripted balance report for the required idle/casual/expert policies.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/balance/balance-report.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-mobile-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-mobile-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-mobile-end.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-end.png`

## Checklist Results

- [x] The core loop is readable, understandable, and at least minimally fun.
- [x] The chosen best platform clearly feels best.
- [x] Additional supported surfaces do not compromise the best platform experience.
- [x] Performance is good enough on every supported surface.
- [x] Gameplay presentation is edge to edge and does not look like a webpage card.
- [x] Active gameplay is free of nonessential UI clutter.
- [x] HUD elements stay in safe, intentional positions on every supported surface and do not overlap the frame or active gameplay.
- [x] Start and game-over screens do not occlude critical playfield.
- [x] Start and game-over layouts keep stats, supporting copy, and CTA separated without overlap.
- [x] Loss proximity is glanceable and next-preview clearly communicates what, where, and when.
- [x] The game quality matches `SIMPLIFY_v1.md`, not the pre-simplify wish list.
- [x] If this is an endless score game, the balance has been swept with idle/casual/expert policies and the target medians hold: casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- Tightened the automated balance policies so they model low-skill simple-word play versus deliberate expert planning instead of two similarly strong solvers.
- Added safe-braid filtering and explicit dead-end rejection messaging so the loop never crashes on words that would create an impossible next state.
- Switched gameplay proof captures to the raw local app URL after the authenticated PlayDrop creator/dev page proved unreliable in the local automation context.
- Regenerated start, gameplay, and end-state captures on both supported surfaces after the final HUD and overlay pass.

## Evidence

- Balance sweep: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/balance/balance-report.md`
- Portrait start: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-mobile-start.png`
- Portrait gameplay: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-mobile-gameplay.png`
- Portrait end state: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-mobile-end.png`
- Desktop start: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-start.png`
- Desktop gameplay: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-gameplay.png`
- Desktop end state: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-end.png`

## Verdict

PASS

## Required Fixes If Failed

- None
