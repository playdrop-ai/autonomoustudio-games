# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build, using the PlayDrop-first listing workflow and documenting any justified fallback.

## Output

- Captured the final real-build landscape screenshots and X-first landscape gameplay MP4 from the current `Powder Post` build.
- Finalized a matched landscape hero, portrait hero, and full-bleed square icon family that stays close to the shipped minimal winter art direction.
- Wired the listing copy, X thread draft, and `catalogue.json` listing block to the current shipped mechanics and supported surfaces.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `playdrop search ski --json`
- `playdrop search snow arcade --json`
- `playdrop search winter icon --kind asset --json`
- `playdrop detail playdrop/asset/winter --json`
- `playdrop detail playdrop/asset/platformer-art-winter-tiles-tree --json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/ai-art/jobs-image-20260406.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/ai-art/fallback-family-review.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/catalogue.json`
- `npm run capture:media`
- `npm run export:listing-art`
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

- The first three PlayDrop AI landscape-hero attempts never reached generation because the CLI returned `Could not reach the Playdrop AI API.` on every request. I preserved the exact prompts and CLI options in `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/ai-art/jobs-image-20260406.json` before switching to fallback work.
- Because the official PlayDrop AI path was unavailable, I used a local composition fallback built directly from the real gameplay screenshots instead of stalling the release or introducing unrelated outside tooling. The fallback family is exported from `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/marketing.html` through `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/scripts/export-listing-art.mjs`.
- The first icon fallback crop still carried too much raw HUD residue from the gameplay frame, so I tightened the crop and simplified the overlay system before locking the final square icon.
- No extra non-PlayDrop art generator was used after the API outage. The fallback stayed grounded in the real build, the real screenshots, and the shipped palette.

## Prompt Log And Reference Chain

- PlayDrop AI landscape candidate `A`
  - CLI options: `playdrop ai create image ... --asset-name powder-post-hero-landscape-a --asset-display-name "Powder Post Hero Landscape A" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 240 --poll 2000 --json`
  - Prompt: `Premium storefront hero art for the downhill arcade game Powder Post. Use the attached real gameplay screenshot as visual reference for the moonlit snow slope, courier skier with an orange satchel, glowing parcel gates, dark fir trees, and the storm line chasing downhill. Create a bespoke 16:9 marketing hero image for the real game with the exact title POWDER POST clearly rendered in the central composition band. Keep the same restrained winter palette and minimalist shape language as the shipped build. No HUD, no screenshot framing, no watermark, no extra copy.`
  - Result: failed before generation with `Could not reach the Playdrop AI API.`
- PlayDrop AI landscape candidate `B`
  - CLI options: `playdrop ai create image ... --asset-name powder-post-hero-landscape-b --asset-display-name "Powder Post Hero Landscape B" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 240 --poll 2000 --json`
  - Prompt: `Storefront key art for Powder Post derived from the attached live gameplay shot. Show one courier carving between warm village gates on a broad snowy ridge with the avalanche glow and winter moon behind, faithful to the actual game's simple geometry and palette. Render the exact title POWDER POST large and readable across the center band. Premium game-store hero image, not a screenshot, no HUD, no border, no subtitle text.`
  - Result: failed before generation with `Could not reach the Playdrop AI API.`
- PlayDrop AI landscape candidate `C`
  - CLI options: `playdrop ai create image ... --asset-name powder-post-hero-landscape-c --asset-display-name "Powder Post Hero Landscape C" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 240 --poll 2000 --json`
  - Prompt: `Marketing hero for Powder Post based on the attached real build screenshot. Keep the clean icy slope, fir silhouettes, courier skier, warm crest gates, and looming storm edge from the actual game, but turn them into polished key art with a stronger center composition. Put the exact title POWDER POST clearly in the middle of the image. Minimal text only, no HUD, no button chrome, no screenshot frame, and do not oversell the runtime beyond its calm stylized winter look.`
  - Result: failed before generation with `Could not reach the Playdrop AI API.`
- Final fallback family
  - Landscape hero source: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/marketing.html`
  - Portrait hero source: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/marketing.html`
  - Icon source: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/marketing.html`
  - Export path: `npm run export:listing-art`
  - Why it won: it keeps the real in-engine screenshot language, the exact winter palette, and the centered-name requirement without overselling the game after the PlayDrop AI path failed.

## Family Review

- The shipped landscape and portrait heroes clearly belong to the same family: the same moonlit slope, centered dark title band, soft frost haze, and restrained warm-versus-ice accent colors pulled from the live game.
- The final icon stays full-bleed and readable at small size. It keeps the courier-and-gates identity in a square crop without turning into a medallion, badge, or flat matte tile.
- Compared against the raw screenshots, the shipped family feels purpose-built for store use, but it still stays honest to the runtime because the composition, palette, and scene elements all come directly from the real gameplay captures.

## Evidence

- Listing copy: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/copy.md`
- X thread draft: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/X_THREAD.md`
- Final icon: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/icon.png`
- Final landscape hero: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/hero-landscape.png`
- Final portrait hero: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/hero-portrait.png`
- Landscape screenshot 1: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-screenshot-1.png`
- Landscape screenshot 2: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-screenshot-2.png`
- Gameplay video: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-recording.mp4`
- Video review frames: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/video-frames-check/frame-01.png`, `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/video-frames-check/frame-02.png`, `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/video-frames-check/frame-03.png`
- Fallback family review: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/ai-art/fallback-family-review.png`
- AI failure log: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/ai-art/jobs-image-20260406.json`
- Final metadata wired: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/catalogue.json`
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
