# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build, using the PlayDrop-first listing workflow and documenting any justified fallback.

## Output

- Captured the final real-build landscape screenshot, two portrait screenshots, and the X-first landscape gameplay MP4 from the current `Relayline` build.
- Finalized a matched landscape hero, portrait hero, and full-bleed square icon family grounded in the shipped dark-grid, cyan-relay, gold-source art direction.
- Wired the listing block into `catalogue.json` and drafted the player-facing listing copy plus X thread in the `listing/` folder.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `playdrop browse --kind app --app-type game --surface mobile-portrait --limit 8 --json`
- `playdrop search "circuit puzzle" --kind app --json`
- `playdrop search "electric icon" --kind asset --json`
- `playdrop search "neon circuit" --kind asset --json`
- `playdrop credits balance`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/relayline_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/relayline_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/relayline_720x1280-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/relayline_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/marketing.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/scripts/capture-media.mjs`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/scripts/export-listing-art.mjs`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/ai-art/jobs-image-20260408.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/ai-art/fallback-family-review.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/catalogue.json`
- `npm run validate`
- `playdrop project validate .`

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
- [x] The listing promise, hero, icon, and X copy target the same audience as the actual gameplay loop and do not sell a different fantasy.
- [x] The listing description explains how to play, including the core input, what clears, the main fail pressure or objective, and the exact match rule if players could misread it.
- [x] The listing description and X copy describe the current shipped mechanics only; removed inputs, note types, modes, or supported surfaces are gone.
- [x] The icon is bespoke, simple, and readable at small size.
- [x] The icon is full-bleed square art, not a badge or medallion sitting on a flat matte, empty border, or placeholder background.
- [x] The hero art is bespoke, visually strong, and not a screenshot with filler text dumped on top.
- [x] A strong real-build screenshot was captured before hero generation and used as the reference input for the primary PlayDrop AI hero.
- [x] Portrait and landscape heroes read as one matched family when reviewed side by side.
- [x] The game name appears in the central composition band of both hero images.
- [x] The primary hero was attempted through PlayDrop AI with the game name explicitly requested in the centered composition.
- [x] The sibling hero was produced from the approved fallback visual system so the family stays matched when the PlayDrop path failed.
- [x] The final icon was derived from the approved fallback hero family because the PlayDrop AI path failed.
- [x] Listing art was explored through PlayDrop browse/search/detail and PlayDrop AI generation, with at least 3 candidates considered before final selection.
- [x] The gate notes record the exact PlayDrop AI prompts, CLI options, reference inputs, generated asset refs, and why the final family won.
- [x] If the final art used a non-PlayDrop fallback, the gate notes explain why the PlayDrop path failed and why the fallback was necessary.
- [x] Marketing art uses minimal text and only when it genuinely improves the asset.
- [x] Marketing art does not materially oversell the live game’s visual quality.
- [x] Screenshots are taken from the real build and show real gameplay moments.
- [x] A real gameplay video exists, is reviewed, and starts on actual gameplay.
- [x] The X-first video asset is a single landscape gameplay MP4 that is strong enough to post publicly.
- [x] Listing media matches the current shipped build and is good enough to post on X.

## Feedback Applied Before PASS

- The official PlayDrop AI path was attempted first with three separate landscape-hero prompts against a real gameplay screenshot, but every run failed immediately with `insufficient_funds` because `playdrop credits balance` returned `0`. The exact prompts, reference image, and CLI options are preserved in `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/ai-art/jobs-image-20260408.json`.
- The first fallback export pass failed because `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/scripts/export-listing-art.mjs` served `dist/` instead of the repo root, so `listing/marketing.html` never loaded. I switched the export server root to the game root and re-ran the export.
- The first fallback art family also failed the title-band rule because the title was clipped in both hero variants. I reduced the title scale, widened the landscape band, and overrode portrait band geometry so the final family keeps `Relayline` centered and fully readable.

## Prompt Log And Reference Chain

- PlayDrop AI landscape candidate `A`
  - CLI options: `playdrop ai create image ... --asset-name relayline-hero-landscape-a --asset-display-name "Relayline Hero Landscape A" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/desktop-1280x720.png --ratio 16:9 --resolution 1536x864 --timeout 90 --poll 2000 --json`
  - Prompt: `Premium storefront hero art for the route puzzle game Relayline. Use the attached real gameplay screenshot as the composition and palette reference for the dark grid, cyan relay glow, gold source pulse, and clue-number reveal language. Create a bespoke 16:9 marketing hero image for the real game with the exact title RELAYLINE clearly rendered in the central composition band. No HUD chrome, no screenshot frame, no extra copy, and do not oversell the runtime beyond its clean neon-circuit puzzle look.`
  - Result: failed before generation with `insufficient_funds`
- PlayDrop AI landscape candidate `B`
  - CLI options: `playdrop ai create image ... --asset-name relayline-hero-landscape-b --asset-display-name "Relayline Hero Landscape B" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/desktop-1280x720.png --ratio 16:9 --resolution 1536x864 --timeout 90 --poll 2000 --json`
  - Prompt: `Storefront key art for Relayline derived from the attached live gameplay shot. Keep the same midnight board, electric cyan relay, warm gold source, and clue-driven circuit puzzle identity from the shipped build, but turn them into a polished 16:9 hero image. Render the exact title RELAYLINE large and readable across the center band. Premium game-store hero art, not a screenshot, with minimal text and no HUD chrome.`
  - Result: failed before generation with `insufficient_funds`
- PlayDrop AI landscape candidate `C`
  - CLI options: `playdrop ai create image ... --asset-name relayline-hero-landscape-c --asset-display-name "Relayline Hero Landscape C" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/desktop-1280x720.png --ratio 16:9 --resolution 1536x864 --timeout 90 --poll 2000 --json`
  - Prompt: `Marketing hero for Relayline based on the attached real build screenshot. Stay faithful to the current route-building puzzle: dark insulated board, clear clue numerals, cyan relay target, and bright current running from source to relay. Strengthen the composition into polished key art and place the exact title RELAYLINE clearly in the middle of the image. No screenshot border, no watermark, no subtitle text, and no invented fantasy beyond the shipped electric puzzle.`
  - Result: failed before generation with `insufficient_funds`
- Final fallback family
  - Landscape hero source: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/marketing.html` candidate `B`
  - Portrait hero source: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/marketing.html` portrait `B`
  - Icon source: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/marketing.html` icon `B`
  - Export path: `node scripts/export-listing-art.mjs`
  - Why it won: candidate `B` keeps the title centered and fully readable, stays close to the shipped dark-grid runtime, and makes the source-to-relay route the clear visual identity instead of inventing unrelated poster art.

## Family Review

- The shipped landscape and portrait heroes read as one family: the same dark insulated stage, cyan and gold route language, centered title lockup, and screenshot-grounded board framing.
- The final icon stays full-bleed and readable at small size. It keeps the route identity in a square crop without turning into a badge or matte-backed emblem.
- Compared against the raw screenshots, the final family is purpose-built for store use but still honest to the runtime because the board geometry, palette, and route signifiers all come directly from the actual build captures.

## Evidence

- Listing copy: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/copy.md`
- X thread draft: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/X_THREAD.md`
- Final icon: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/icon.png`
- Final landscape hero: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/hero-landscape.png`
- Final portrait hero: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/hero-portrait.png`
- Landscape screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/relayline_1280x720-screenshot-1.png`
- Portrait screenshot 1: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/relayline_720x1280-screenshot-1.png`
- Portrait screenshot 2: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/relayline_720x1280-screenshot-2.png`
- Gameplay video: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/relayline_1280x720-recording.mp4`
- Video review data:
  - duration: `10.16s`
  - frame size: `1280x720`
  - frame rate: `25fps`
- Fallback family review: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/ai-art/fallback-family-review.png`
- AI attempt log: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/ai-art/jobs-image-20260408.json`
- Final metadata wired: `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/catalogue.json`
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
