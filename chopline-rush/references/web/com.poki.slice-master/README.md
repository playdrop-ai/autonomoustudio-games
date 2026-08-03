# Slice Master web reference

Canonical source: <https://poki.com/en/g/slice-master>

Evaluated on 2026-08-03 in a headed iPhone 15 Playwright session. Bot detection was disabled through
Poki's own `disableBotDetection=1` page parameter so the genuine nested game frame could be operated.
No image, video, or behavior in this folder is reconstructed.

## Capture method

- Viewport: 393 × 852 CSS px, device scale factor 3.
- Embedded canvas: 393 × 595 CSS px / 1179 × 1785 backing pixels.
- Input: one 100 ms pointer press/release per tap. The game polls mouse state between frames, so an
  instantaneous synthesized click does not faithfully register.
- Video: Playwright's session recorder, followed by direct screenshot inspection.
- Code: the public embed HTML, PlayCanvas settings/start/runtime files, asset configuration, scene
  JSON, and minified shipped game scripts were downloaded from the exact active game embed.

## Curated evidence

- `screenshots/reference-final-01-prompt.png` — clean initial tutorial composition.
- `screenshots/reference-final-02-first-flip.png` — first tap, airborne rotation, segmented trail.
- `screenshots/reference-final-03-first-landing.png` — blade-first runway landing before the apple.
- `screenshots/reference-final-04-first-slice.png` — green apple halves, debris, and `+1$`.
- `screenshots/reference-final-05-slice-landing.png` — post-slice continuation state.
- `tutorial-side-by-side.png` — four matched tutorial moments, reference on the left and Chopline on
  the right: ready, first flip, safe landing, and first slice.
- `TUTORIAL-SPECS.md` — full interaction, physics, geometry, presentation, and acceptance spec.

The clean video is at `output/playwright/slice-master/slice-master-tutorial-final.webm`.

## Downloaded source snapshot

Raw shipped files are retained under `tmp/references/web/com.poki.slice-master/`:

- `page.html` — Poki landing page.
- `embed.html` — signed game embed document.
- `config.json` — PlayCanvas asset and script manifest.
- `2360643.json` — PlayCanvas scene data.
- `__game-scripts.js` — minified production gameplay scripts.
- `__settings__.js`, `__start__.js` — runtime boot/settings.
- `playcanvas-stable.min.js` — shipped PlayCanvas runtime.
- `meta.txt` — capture identity, URLs, viewport, and checksums.

## What Chopline copies

Copy the integrated first-session lesson: planted knife, narrow gap, world-space two-line instruction,
safe first flip and blade landing, second planted jump through a green apple, physical halves, pale
segmented trail, cube debris, and `+1$`. Keep the white runway and restrained low-poly backdrop.

## What Chopline must avoid

Do not add a tutorial modal, hand cursor, ring, ghost knife, separate landing pad, second instruction,
thirteen-slab opening wall, forced first-run failure, or decorative finish gate. Those are not present
in this reference tutorial.
