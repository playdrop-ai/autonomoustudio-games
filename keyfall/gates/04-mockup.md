# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and review exported raster outputs before implementation.

## Output

- Rendered portrait and desktop start, gameplay, and game-over mockups as SVG plus raster PNG exports.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/scripts/render-mockups.mjs`
- raster exports generated with `sips`

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

- The first desktop raster pass used Quick Look thumbnails and cropped the true framing. I replaced that with exact-size PNG exports through `sips` so the review matched the intended desktop canvas.
- The first start mockup crowded the title into the preview strip. I moved the title higher and kept the `Play` chip isolated near the bottom so the runway stays readable.

## Evidence

- SVG source:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/portrait-start.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/portrait-gameplay.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/portrait-gameover.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/desktop-start.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/desktop-gameplay.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/desktop-gameover.svg`
- Raster review exports:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/portrait-start.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/portrait-gameplay.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/portrait-gameover.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/desktop-start.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/desktop-gameplay.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/mockups/desktop-gameover.svg.raster.png`

## Verdict

PASS

## Required Fixes If Failed

- None
