# 03-simplify - Simplify

## Instruction

- Cut the spec down to the smallest strong v1 while preserving the differentiator and best platform.

## Output

- Wrote `SIMPLIFY_v1.md` for `Latchbloom`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SIMPLIFY_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/03-simplify.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/SPECS_v1.md`

## Checklist Results

- [x] The simplified version is the smallest strong v1, not just the shortest document.
- [x] The differentiator survives the simplify pass.
- [x] The simplify pass does not leave behind a thin clone with a different wrapper.
- [x] Extra platforms, screens, features, and content have been cut aggressively.
- [x] The remaining input model is clear and well matched to the best platform.
- [x] The remaining HUD and screen count are minimal and readable.
- [x] The remaining art and asset scope are small enough to finish well.
- [x] Anything removed from v1 is explicitly written down.

## Feedback Applied Before PASS

- The first spec still carried a denser `5`-lane, `5`-blossom network with a larger preview queue. The simplify pass cut that to `4` lanes, `4` blossoms, and a `2`-item preview so the portrait layout can stay clean and the art set can stay small without losing the routing hook.

## Evidence

- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/SIMPLIFY_v1.md`

## Verdict

PASS

## Required Fixes If Failed

- None
