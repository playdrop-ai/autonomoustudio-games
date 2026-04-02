# 06-gameplay-v1 - Pre-Publish Gameplay Gate

## Instruction

- Validate that the implemented `Glowknot` build is actually fun and publishable as a real endless-score game, including the required balance sweep and plain-build screenshot review.

## Output

- Rebalanced the live rules so sink pressure ramps at `5 / 4 / 3`, ordinary clears do not refund sink time, and only meaningful canopy drops buy extra breathing room.
- Produced a full 120-sample idle/casual/expert balance sweep and fresh plain-build review captures for portrait gameplay, desktop gameplay, and desktop game-over.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/balance/balance-report.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-portrait-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-desktop-gameplay-short.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-desktop-gameover.png`

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
- [x] Loss proximity is glanceable and next-preview clearly communicates what, where, and when.
- [x] The game quality matches `SIMPLIFY_v1.md`, not the pre-simplify wish list.
- [x] If this is an endless score game, the balance has been swept with idle/casual/expert policies and the target medians hold: casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The strongest plain-build screenshot or raw gameplay clip already looks worth clicking before bespoke listing art.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first gameplay-gate attempt failed because the balance sweep showed the casual policy capping the full 360-second simulation window. The underlying problem was that ordinary clears were too generous and the countdown schedule was too soft.
- I redid the gate by removing the default sink refund from ordinary clears, tightening the live sink schedule to `5 / 4 / 3`, keeping extra time tied only to meaningful detached drops, and redefining the scripted casual policy so it behaves like a real casual player instead of an expert planner.
- The same redo also cleaned up the remaining live-gameplay readability issues: the redundant top-center title was removed from active gameplay, the sink countdown was moved into a single readable danger chip near the loss line, and the game-over panel stats were resized so they no longer collide on desktop.

## Evidence

- Full balance sweep: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/balance/balance-report.md`
- Plain-build portrait gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-portrait-gameplay.png`
- Plain-build desktop gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-desktop-gameplay-short.png`
- Plain-build desktop game-over proof: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-desktop-gameover.png`

## Verdict

PASS

## Required Fixes If Failed

- None
