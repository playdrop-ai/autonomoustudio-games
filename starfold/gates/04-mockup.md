# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references.

## Output

- Created supported-surface mockups for start, gameplay, and end states in `art-direction/mockups/`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `SIMPLIFY_v1.md`
- `art-direction/mockups/portrait-start.svg`
- `art-direction/mockups/portrait-gameplay.svg`
- `art-direction/mockups/portrait-gameover.svg`
- `art-direction/mockups/desktop-start.svg`
- `art-direction/mockups/desktop-gameplay.svg`
- `art-direction/mockups/desktop-gameover.svg`

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

- Mockup generator: `scripts/render-mockups.mjs`
- Output folder: `art-direction/mockups/`

## Verdict

PASS

## Required Fixes If Failed

- None
