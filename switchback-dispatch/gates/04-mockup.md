# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references. Review exported raster or browser-rendered outputs at shipping resolution before implementation.

## Output

- Created browser-rendered desktop mockups for:
  - contract select
  - active gameplay
  - result screen

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/SIMPLIFY_v1.md`
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
- [x] Hazard, reward, and fail-state signifiers are visually distinct and semantically intuitive in the mockups.
- [x] If touch is primary, the mockups show the real affordance for any frequent secondary action instead of implying a hidden gesture.
- [x] The mockups were reviewed as exported raster or browser-rendered outputs at shipping resolutions.
- [x] Marketing art exploration is separate from gameplay mockups.

## Feedback Applied Before PASS

- The first contract-select pass was too tall for `1280x720`: the controls chip collided with the card stack and the third contract card fell partly off the frame. I shortened the subtitle, moved the controls chip to the bottom-right, converted non-active contracts into compact cards, and rerendered the screen.
- I kept the gameplay HUD to three compact clusters only after checking the raster output. Anything denser started to turn the scene into UI-first framing instead of a playable road view.

## Evidence

- Mockup sources:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/mockups/contract-select.html`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/mockups/gameplay.html`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/mockups/results.html`
- Reviewed desktop raster outputs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/mockups/contract-select-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/mockups/gameplay-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/mockups/results-desktop.png`
- Render command path:
  - `npx playwright screenshot --viewport-size "1280,720" --wait-for-timeout 200 file:///...`

## Verdict

PASS

## Required Fixes If Failed

- None
