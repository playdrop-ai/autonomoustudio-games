# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references. Review exported raster or browser-rendered outputs at shipping resolutions before accepting them.

## Output

- Created browser-rendered start, gameplay, and game-over mockups for portrait and desktop in `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/scripts/render-mockups.mjs`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/scripts/capture-mockups.mjs`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/portrait-start.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/portrait-gameplay.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/portrait-gameover.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/desktop-start.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/desktop-gameplay.svg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/desktop-gameover.svg`
- Browser-rendered PNG review set at shipping resolutions:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/portrait-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/portrait-gameplay.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/portrait-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/desktop-gameplay.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/desktop-gameover.png`

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

- The first mockup draft put the start title back over the top cluster, which weakened board readability. I moved the start copy into the empty lower field so the canopy stays clear before implementation.
- The first game-over draft hid the `best` value under the CTA. I rebalanced the stat stack and button spacing on both portrait and desktop before accepting the mockups as implementation reference.

## Evidence

- Mockup source generator: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/scripts/render-mockups.mjs`
- Browser capture script: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/scripts/capture-mockups.mjs`
- Final raster proof: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/portrait-gameplay.png`
- Final desktop proof: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/desktop-gameplay.png`

## Verdict

PASS

## Required Fixes If Failed

- None
