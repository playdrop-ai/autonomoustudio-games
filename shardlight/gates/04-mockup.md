# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references.

## Output

- Rendered portrait and desktop start, gameplay, and game-over mockups as SVG source plus raster PNG exports at shipping resolutions.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/scripts/render-mockups.mjs`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/portrait-start.svg.raster.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/portrait-gameplay.svg.raster.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/portrait-gameover.svg.raster.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/desktop-start.svg.raster.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/desktop-gameplay.svg.raster.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/desktop-gameover.svg.raster.png`

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

- The first raster pass still carried a persistent `Shardlight` title into the gameplay and game-over screens, which would not exist during active play. I removed that title from non-start states and rerendered the entire set before accepting the gate.
- The final set keeps the portrait-first board dominant, preserves the same board composition on desktop, and leaves only real shipped UI text on the gameplay mockups.

## Evidence

- Mockup generator: `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/scripts/render-mockups.mjs`
- SVG source:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/portrait-start.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/portrait-gameplay.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/portrait-gameover.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/desktop-start.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/desktop-gameplay.svg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/desktop-gameover.svg`
- Raster review exports:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/portrait-start.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/portrait-gameplay.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/portrait-gameover.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/desktop-start.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/desktop-gameplay.svg.raster.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/mockups/desktop-gameover.svg.raster.png`
- Render commands:
  - `node scripts/render-mockups.mjs`
  - `for f in mockups/*.svg; do sips -s format png "$f" --out "$f.raster.png"; done`

## Verdict

PASS

## Required Fixes If Failed

- None
