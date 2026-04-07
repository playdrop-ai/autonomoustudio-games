# 04-mockup - Mockup

## Instruction

- Create gameplay mockups from the simplified plan so implementation has literal shipping-resolution targets for the real game screens and supported surfaces.

## Output

- Built a responsive gameplay mockup at `mockups/lunchline-mockup.html`.
- Captured browser-rendered start, gameplay, and game-over screens for portrait and desktop.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/SIMPLIFY_v1.md`
- `/Users/oliviermichon/.codex/plugins/cache/local-plugins/playdrop/local/skills/gameplay-mockups/SKILL.md`
- `/Users/oliviermichon/.codex/plugins/cache/openai-curated/game-studio/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/game-ui-frontend/SKILL.md`

## Checklist Results

- [x] Mockups look like the intended shipped game, not like annotated design boards.
- [x] Mockups contain no reviewer notes, designer comments, or temporary explanation text.
- [x] Any text shown in gameplay mockups is real shipped UI text, not concept copy.
- [x] The best platform framing is explicit and edge to edge.
- [x] There are no large dead zones, detached webpage frames, or scrolling layouts.
- [x] Visual hierarchy, spacing, and alignment are clean enough to use as implementation reference.
- [x] The mockups prove the real interaction model for the chosen input.
- [x] If built from a starter, demo, template, or remix path, the mockups would not be honestly mistaken for that source by someone familiar with it.
- [x] The mockups prove a distinct first impression in the actual gameplay frame, not just extra wrapper UI around an inherited scene.
- [x] Hazard, reward, and fail-state signifiers are visually distinct and semantically intuitive in the mockups.
- [x] If touch is primary, the mockups show the real affordance for any frequent secondary action instead of implying a hidden gesture.
- [x] The mockups were reviewed as exported raster or browser-rendered outputs at shipping resolutions.
- [x] Marketing art exploration is separate from gameplay mockups.

## Feedback Applied Before PASS

- Dropped the idea of a permanent combo or streak widget after the first mockup pass. It added chrome without improving the board read, so the live HUD stays at score, complaints, and the active order only.
- Kept desktop support on the same portrait-first board inside a wider counter stage instead of inventing a separate landscape gameplay layout that would weaken the best platform.

## Evidence

- Mockup source: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/mockups/lunchline-mockup.html`
- Portrait start: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/mockup-review/mobile-portrait-start.png`
- Portrait gameplay: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/mockup-review/mobile-portrait-play.png`
- Portrait game-over: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/mockup-review/mobile-portrait-gameover.png`
- Desktop start: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/mockup-review/desktop-start.png`
- Desktop gameplay: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/mockup-review/desktop-play.png`
- Desktop game-over: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/mockup-review/desktop-gameover.png`

## Verdict

PASS

## Required Fixes If Failed

- None
