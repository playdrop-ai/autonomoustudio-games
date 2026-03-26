# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references.

## Output

- Replaced the weak `1.0.0` source-only mockup review with browser-rendered `1.0.1` captures at shipping resolutions for start, gameplay, and game-over on portrait and desktop.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameover.png`

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

- The original `1.0.0` gate should have failed because the portrait start and game-over screens covered too much of the board and were only reviewed from SVG source. I redid the mockup review using browser-rendered PNG captures from the actual build after converting start and game-over into bottom-sheet overlays that preserve the playfield silhouette.
- The original mockups also encoded the old thorn system and detached preview treatment. The final reference set now shows the shipped global strike meter and in-board lane-aware next preview.

## Evidence

- Browser-rendered mockup set: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups`
- Start proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-start.png`
- Gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameplay.png`
- Game-over proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameover.png`

## Verdict

PASS

## Required Fixes If Failed

- None
