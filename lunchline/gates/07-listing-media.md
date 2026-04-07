# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build, using the PlayDrop-first listing workflow and documenting any justified fallback.

## Output

- Captured the final real-build landscape screenshot, two portrait screenshots, and the X-first landscape gameplay MP4 from the current `Lunchline` build.
- Finalized a matched landscape hero, portrait hero, and full-bleed square icon family that stays grounded in the shipped warm lunch-counter art direction.
- Wired the listing copy, X thread draft, and `catalogue.json` listing block to the current shipped mechanics and supported surfaces.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `playdrop browse --kind app --app-type game --limit 8 --json`
- `playdrop search "food puzzle" --kind app --json`
- `playdrop search "bento icon" --kind asset --json`
- `playdrop search "restaurant poster" --kind asset --json`
- `playdrop detail playdrop/asset/sushi-restaurant-kit-food-roll --json`
- `playdrop detail playdrop/asset/sushi-restaurant-kit-environment-counter-end --json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_720x1280-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/ai-art/jobs-image-20260407.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/ai-art/fallback-family-review.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/catalogue.json`
- `node scripts/capture-media.mjs`
- `node scripts/export-listing-art.mjs`
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

- The PlayDrop-first path was retried with three explicit landscape-hero prompts against the real gameplay screenshot, and all three failed immediately with `Could not reach the Playdrop AI API.` The exact prompts and CLI options are preserved in `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/ai-art/jobs-image-20260407.json`.
- Because the official PlayDrop AI path was unavailable, I used a local composition fallback built directly from the real gameplay captures instead of introducing unrelated third-party art tools or stalling the release. The fallback family is exported from `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/marketing.html` through `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/scripts/export-listing-art.mjs`.
- The first icon fallback still read too much like a poster crop because the title was stamped into the square art. I removed the title from the final icon and re-exported the family so the shipped square asset reads as a true full-bleed icon instead of a tiny hero.
- No extra non-PlayDrop art generator was used after the API outage. The final family stays grounded in the real screenshots, the shipped ingredient palette, and the live game geometry.

## Prompt Log And Reference Chain

- PlayDrop AI landscape candidate `A`
  - CLI options: `playdrop ai create image ... --asset-name lunchline-hero-landscape-a --asset-display-name "Lunchline Hero Landscape A" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 90 --poll 2000 --json`
  - Prompt: `Premium storefront hero art for the lunch-rush puzzle game Lunchline. Use the attached real gameplay screenshot as the composition and palette reference for clustered ingredients, bento-box order pressure, warm canteen lighting, and clean rounded shapes. Create a bespoke 16:9 marketing hero image for the real game with the exact title LUNCHLINE clearly rendered in the central composition band. No HUD, no screenshot frame, no extra copy, and do not oversell the runtime beyond its bright stylized food-counter look.`
  - Result: failed before generation with `Could not reach the Playdrop AI API.`
- PlayDrop AI landscape candidate `B`
  - CLI options: `playdrop ai create image ... --asset-name lunchline-hero-landscape-b --asset-display-name "Lunchline Hero Landscape B" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 90 --poll 2000 --json`
  - Prompt: `Storefront key art for Lunchline derived from the attached live gameplay shot. Show appetizing ingredient clusters, a lunchbox order card, and fast lunch-rush energy in the same warm orange, cream, and charcoal palette as the shipped build. Render the exact title LUNCHLINE large and readable across the center band. Premium game-store hero image, not a screenshot, no HUD chrome, no watermark, no subtitle text.`
  - Result: failed before generation with `Could not reach the Playdrop AI API.`
- PlayDrop AI landscape candidate `C`
  - CLI options: `playdrop ai create image ... --asset-name lunchline-hero-landscape-c --asset-display-name "Lunchline Hero Landscape C" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 90 --poll 2000 --json`
  - Prompt: `Marketing hero for Lunchline based on the attached real build screenshot. Keep the playful food-board geometry, bento order framing, and lunch-counter palette from the actual game, but turn them into polished key art with a stronger centered composition. Put the exact title LUNCHLINE clearly in the middle of the image. Minimal text only, no HUD, no screenshot border, and stay faithful to the real puzzle rather than inventing a different fantasy.`
  - Result: failed before generation with `Could not reach the Playdrop AI API.`
- Final fallback family
  - Landscape hero source: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/marketing.html` candidate `B`
  - Portrait hero source: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/marketing.html` portrait `B`
  - Icon source: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/marketing.html` icon `B`
  - Export path: `node scripts/export-listing-art.mjs`
  - Why it won: candidate `B` keeps the centered-name requirement, the warm lunch-counter framing, and the real ingredient palette while staying close to the current runtime instead of drifting into poster-only food illustration.

## Family Review

- The shipped landscape and portrait heroes clearly belong to the same family: the same warm wood counter framing, cream service card, centered dark title band, and the same ingredient-chip palette lifted from the real build.
- The final icon stays full-bleed and readable at small size. It keeps the order-card plus board identity in a square crop without turning into a badge, medallion, or matte-backed logo tile.
- Compared against the raw screenshots, the shipped family feels purpose-built for store use, but it still stays honest to the runtime because the composition, board geometry, and color language all come directly from the actual gameplay captures.

## Evidence

- Listing copy: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/copy.md`
- X thread draft: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/X_THREAD.md`
- Final icon: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/icon.png`
- Final landscape hero: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/hero-landscape.png`
- Final portrait hero: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/hero-portrait.png`
- Landscape screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_1280x720-screenshot-1.png`
- Portrait screenshot 1: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_720x1280-screenshot-1.png`
- Portrait screenshot 2: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_720x1280-screenshot-2.png`
- Gameplay video: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/lunchline_1280x720-recording.mp4`
- Video review data:
  - duration: `12.0s`
  - frame size: `1280x720`
  - frame rate: `25fps`
- Fallback family review: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/ai-art/fallback-family-review.png`
- AI failure log: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/ai-art/jobs-image-20260407.json`
- Final metadata wired: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/catalogue.json`
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
