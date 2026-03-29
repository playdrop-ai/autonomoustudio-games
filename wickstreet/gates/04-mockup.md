# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references. Review exported raster outputs at shipping resolutions before accepting them.

## Output

- Rendered start, gameplay, and game-over mockups for both supported surfaces in `mockups/`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/scripts/render_mockups.py`
- exported raster outputs at `932x430` and `1440x900`

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

- The first mockup pass still framed the town inside a rounded card with too much outer margin. That failed the edge-to-edge bar. I removed the detached frame, expanded the neighborhood to the full viewport, and rerendered every mockup.
- The initial desktop layout felt too boxed in. I enlarged the active play surface and kept the HUD in compact safe-band cards so the desktop version still reads as full-screen gameplay rather than a smaller board in a background.

## Evidence

- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/mockups/mobile-landscape-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/mockups/mobile-landscape-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/mockups/mobile-landscape-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/mockups/desktop-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/mockups/desktop-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/mockups/desktop-gameover.png`
- Review sheet: `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/mockups/review-sheet.png`

## Verdict

PASS

## Required Fixes If Failed

- None
