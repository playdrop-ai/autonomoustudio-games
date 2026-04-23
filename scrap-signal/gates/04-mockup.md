# 04-mockup - Mockup

## Instruction

- Create literal gameplay mockups for the simplified game and iterate until they are strong implementation references. Review exported raster outputs at shipping resolution before accepting them.

## Output

- Built `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-mockup.html`.
- Exported the final desktop gameplay mockups:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-start-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-play-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-end-desktop.png`

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/MOCKUP_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/mockups/whiteout-watch-mockup.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/mockups/relayline-mockup.html`
- `python3 -m http.server 8123` from `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal`
- Playwright wrapper at `/Users/oliviermichon/.codex/skills/playwright/scripts/playwright_cli.sh`

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

- The first mockup pass failed the signifier bar because the `Carrier` enemy used too much amber and could be honestly misread as the battery reward object.
- I changed the carrier silhouette to a rust-red hazard body with only a small amber cargo core, then re-exported all three desktop PNGs and re-reviewed them before passing the gate.

## Evidence

- Mockup source: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-mockup.html`
- Final raster outputs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-start-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-play-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/mockups/scrap-signal-end-desktop.png`
- Browser-rendered export path:
  - local server `http://127.0.0.1:8123/mockups/scrap-signal-mockup.html?screen=start|play|end`
  - Playwright element screenshots of `#frame`

## Verdict

PASS

## Required Fixes If Failed

- None
