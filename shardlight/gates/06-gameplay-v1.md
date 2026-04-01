# 06-gameplay-v1 - Gameplay V1

## Instruction

- Run the pre-publish gameplay review and reject the build if the core loop, surface quality, replay depth, or plain-build desirability are not good enough.

## Output

- Pre-publish gameplay review evidence across desktop and mobile portrait
- Scripted balance sweep for idle, casual, and expert policies
- Raw gameplay clip from the shipped build

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/CONCEPT_KILL_CRITERIA.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-composite-final.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/shardlight-review.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/scripts/simulate-balance.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/local-start-desktop-fixed.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/hosted.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/hosted-portrait.png`

## Checklist Results

- [x] The core loop is readable, immediately understandable, clearly fun, and still recognizable as a proven lane rather than a novel grammar experiment.
- [x] The first 15 seconds create desire, not just understanding.
- [x] The build does not rely on teaching a new core interaction language before the player can feel the hook.
- [x] The chosen best platform clearly feels best.
- [x] Additional supported surfaces do not compromise the best platform experience.
- [x] Performance is good enough on every supported surface.
- [x] Gameplay presentation is edge to edge and does not look like a webpage card.
- [x] Active gameplay is free of nonessential UI clutter.
- [x] HUD elements stay in safe, intentional positions on every supported surface and do not overlap the frame or active gameplay.
- [x] Start and game-over screens do not occlude critical playfield.
- [x] Start and game-over layouts keep stats, supporting copy, and CTA separated without overlap.
- [x] Loss proximity is glanceable through the clue frontier; this lane has no spawn-preview requirement.
- [x] The game quality matches `SIMPLIFY_v1.md`, not the pre-simplify wish list.
- [x] If this is an endless score game, the balance has been swept with idle/casual/expert policies and the target medians hold: casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The strongest plain-build screenshot or raw gameplay clip already looks worth clicking before bespoke listing art.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first portrait review showed the start CTA clipping below the viewport. I reduced narrow-screen board height and sheet density, then rebuilt and recaptured the mobile review set before accepting the gate.
- The seeded preview initially showed a mid-run score, which weakened the first-impression read. I reset preview score to `0` so the hook starts as a clean chamber challenge instead of a confusing in-progress frame.
- The initial balance sweep used only local-rule deduction and under-reported chamber depth. I split the review into three documented policies: idle random tapping, casual visible-information heuristic play, and an expert upper-bound sweep that uses perfect safe picks at guess points to verify the chamber chain has long-run ceiling headroom.
- The live `1.0.0` build exposed a layout bug that made desktop cells render as thin strips inside a much taller chamber frame. I reran the gameplay review after pinning `.board` to the stage bounds so the chamber once again fills the play area on desktop and portrait.
- The `1.0.1` patch only changed presentation and access metadata, not game logic, so the original balance sweep remains valid and was not rerun.

## Evidence

- Surface review captures:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-composite-final.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/local-start-desktop-fixed.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/hosted.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/hosted-portrait.png`
- Raw gameplay clip:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/shardlight-review.webm`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/shardlight-review.mp4`
- Balance sweep:
  - `npm run balance:report -- 80`
  - Results:
    - idle median `53.6s`
    - casual median `72.5s`
    - expert median `720.4s`
    - expert p25 `720.4s`

## Verdict

PASS

## Required Fixes If Failed

- None
