# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references.

## Output

- Created desktop mockups for start, gameplay, and end-state screens in `mockups/`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/scripts/render-mockups.mjs`
- browser-rendered `1600x900` PNG exports captured from the local SVG mockups

## Checklist Results

- [x] Mockups look like the intended shipped game, not like annotated design boards.
- [x] Mockups contain no reviewer notes, designer comments, or temporary explanation text.
- [x] Any text shown in gameplay mockups is real shipped UI text, not concept copy.
- [x] The best platform framing is explicit and edge to edge.
- [x] There are no large dead zones, detached webpage frames, or scrolling layouts.
- [x] Visual hierarchy, spacing, and alignment are clean enough to use as implementation reference.
- [x] The mockups prove the real interaction model for the chosen input.
- [x] The mockups were reviewed as exported raster or browser-rendered outputs at shipping resolutions.
- [x] Marketing art exploration is separate from gameplay mockups.

## Feedback Applied Before PASS

- The first desktop pass stacked the start title into the gameplay HUD space and placed a gameplay accent line on top of the next-beacon pill. I removed the start HUD, moved the start metadata into its own badge, and simplified the gameplay top-center stack before rerendering the PNG review set.

## Evidence

- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/mockups/desktop-start.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/mockups/desktop-gameplay.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/mockups/desktop-gameover.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/mockups/desktop-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/mockups/desktop-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/mockups/desktop-gameover.png`

## Verdict

PASS

## Required Fixes If Failed

- None
