# 03-simplify - Simplify

## Instruction

- Cut the spec down to the smallest strong v1 while preserving the differentiator, best platform, and enough session depth or replayability that the result still feels like a game instead of a demo.

## Output

- Wrote `SIMPLIFY_v1.md` for `Wickstreet`, locking the smallest strong v1 around one map, one courier, one closure system, and one endless blackout score chase.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SIMPLIFY_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/03-simplify.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/SPECS_v1.md`

## Checklist Results

- [x] The simplified version is the smallest strong v1, not just the shortest document.
- [x] The differentiator survives the simplify pass.
- [x] The simplify pass does not leave behind a thin clone with a different wrapper.
- [x] Extra platforms, screens, features, and content have been cut aggressively.
- [x] The remaining input model is clear and well matched to the best platform.
- [x] The remaining HUD and screen count are minimal and readable.
- [x] The remaining art and asset scope are small enough to finish well.
- [x] The simplified v1 still has enough session depth or replayability to feel like a game, not a demo.
- [x] Anything removed from v1 is explicitly written down.

## Feedback Applied Before PASS

- The broader spec still left room for moving hazards, multiple districts, and richer city simulation touches. I cut all of that. The final v1 keeps only route pressure, timer pressure, and rerolled barriers.
- I considered cutting the next-request preview to shrink the HUD further, but that would have weakened the core differentiator too much. I kept it and removed lower-value extras instead.

## Evidence

- Simplify doc: `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/SIMPLIFY_v1.md`
- Removed features are explicitly captured under `Not In v1`

## Verdict

PASS

## Required Fixes If Failed

- None
