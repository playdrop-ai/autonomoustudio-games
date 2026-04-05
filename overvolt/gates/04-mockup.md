# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references. Review exported raster or browser-rendered outputs at shipping resolutions before accepting them.

## Output

- Created browser-rendered start, gameplay, and game-over mockups for mobile landscape and desktop in `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/SIMPLIFY_v1.md`
- `/Users/oliviermichon/.codex/plugins/cache/local-plugins/playdrop/local/skills/gameplay-mockups/SKILL.md`
- `/Users/oliviermichon/.codex/plugins/cache/openai-curated/game-studio/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/game-ui-frontend/SKILL.md`
- `/Users/oliviermichon/.codex/skills/playwright/SKILL.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/mockup.html`
- browser-rendered raster outputs at `1334x750` and `1440x900`

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

- The first raster pass still showed redundant mobile dash UI and left control surfaces visible on the non-gameplay screens. I removed the duplicate dash chip on mobile, hid controls on the start and game-over states, and recaptured the full PNG set before accepting the mockups.
- The first layout pass also risked reading like a framed web panel instead of a full game surface. I kept the desk and tabletop as the actual game frame, with the arena and HUD staying edge to edge inside the viewport rather than inside a detached card shell.

## Evidence

- Mockup source: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/mockup.html`
- Source silhouettes:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/source/player-racer.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/source/enemy-racer.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/source/heavy-truck.png`
- Mobile landscape PNGs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/start-mobile-landscape.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/gameplay-mobile-landscape.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/gameover-mobile-landscape.png`
- Desktop PNGs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/start-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/gameplay-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/mockups/gameover-desktop.png`

## Verdict

PASS

## Required Fixes If Failed

- None
