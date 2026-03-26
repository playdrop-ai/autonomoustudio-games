# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references.

## Output

- Created supported-surface mockups for start, gameplay, and end states in `mockups/`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/mockups/portrait-start.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/mockups/portrait-gameplay.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/mockups/portrait-gameover.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/mockups/desktop-start.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/mockups/desktop-gameplay.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/mockups/desktop-gameover.svg`

## Checklist Results

- [x] Mockups look like the intended shipped game, not like annotated design boards.
- [x] Mockups contain no reviewer notes, designer comments, or temporary explanation text.
- [x] Any text shown in gameplay mockups is real shipped UI text, not concept copy.
- [x] The best platform framing is explicit and edge to edge.
- [x] There are no large dead zones, detached webpage frames, or scrolling layouts.
- [x] Visual hierarchy, spacing, and alignment are clean enough to use as implementation reference.
- [x] The mockups prove the real interaction model for the chosen input.
- [x] Marketing art exploration is separate from gameplay mockups.

## Feedback Applied Before PASS

- The first composition pass still wanted explanatory copy in gameplay. I removed that from the gameplay screens and kept explanatory text only on the start state so the active board remains a true implementation target.

## Evidence

- Mockup generator: `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/scripts/render-mockups.mjs`
- Output folder: `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/mockups`

## Verdict

PASS

## Required Fixes If Failed

- None
