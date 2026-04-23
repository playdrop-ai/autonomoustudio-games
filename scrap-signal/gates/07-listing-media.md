# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero family, screenshots, gameplay video, and player-facing listing copy for the shipped `Scrap Signal` build using the PlayDrop-first listing workflow.

## Output

- Finalized a matched fallback landscape hero, portrait hero, and full-bleed square icon family grounded in the shipped storm-sea arena, cyan beacon glow, rust drone pressure, and amber battery language after the PlayDrop AI image path failed closed with server-side `500` errors.
- Wired the final listing block into `catalogue.json` and drafted the player-facing listing copy plus the three-post X thread in the `listing/` folder.
- Re-validated the exact release state with `npm run validate` and `playdrop project validate .`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `playdrop browse --kind app --app-type game --limit 12 --json`
- `playdrop detail autonomoustudio/app/relayline --json`
- `playdrop search "beacon icon" --kind asset --asset-category IMAGE --limit 5 --json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/marketing.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/scripts/export-listing-art.mjs`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/ai-art/jobs-image-20260410.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/ai-art/fallback-family-review.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/catalogue.json`
- `npm run validate`
- `playdrop project validate .`

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
- [x] The listing promise, hero, icon, and X copy target the same audience as the actual gameplay loop and do not sell a different fantasy.
- [x] The listing description explains how to play, including the core input, the battery-return scoring loop, and the beacon-blackout fail pressure.
- [x] The listing description and X copy describe the current shipped mechanics only; removed inputs, modes, and unsupported surfaces are gone.
- [x] The icon is bespoke, simple, and readable at small size.
- [x] The icon is full-bleed square art, not a badge or medallion sitting on a flat matte, empty border, or placeholder background.
- [x] The hero art is bespoke, visually strong, and not a screenshot with filler text dumped on top.
- [x] A strong real-build screenshot was captured before hero generation and used as the reference input for the PlayDrop AI hero attempts.
- [x] Portrait and landscape heroes read as one matched family when reviewed side by side.
- [x] The game name appears in the central composition band of both hero images.
- [x] The primary hero was attempted through PlayDrop AI with the game name explicitly requested in the centered composition, and the gate records why the release used a local fallback instead.
- [x] The sibling hero was produced from the approved fallback visual system so the family stays matched when the PlayDrop AI path failed.
- [x] The final icon was derived from the approved fallback hero family because the PlayDrop AI path failed.
- [x] Listing art was explored through PlayDrop browse/search/detail and PlayDrop AI generation, with at least 3 candidates considered before final selection.
- [x] The gate notes record the exact PlayDrop AI prompts, CLI options, reference inputs, and why the final fallback family won.
- [x] The non-PlayDrop fallback explains why the PlayDrop path failed and why the fallback was necessary.
- [x] Marketing art uses minimal text and only where it materially strengthens the asset.
- [x] Marketing art does not materially oversell the live game’s visual quality.
- [x] Screenshots are taken from the real build and show real gameplay moments.
- [x] A real gameplay video exists, is reviewed, and starts on actual gameplay.
- [x] The X-first video asset is a single landscape gameplay MP4 that is strong enough to post publicly.
- [x] Listing media matches the current shipped build and is good enough to post on X.

## Feedback Applied Before PASS

- The first PlayDrop AI listing pass failed closed because every hero attempt returned the same server-side `500` response before any JSON payload was written. I preserved the exact prompts, CLI options, and stderr output in `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/ai-art/jobs-image-20260410.json` plus the paired `*.stderr` files before switching to fallback work.
- Because the official PlayDrop AI path was unavailable, I used a local composition fallback built directly from the real gameplay screenshots instead of stalling release prep or introducing unrelated third-party art tooling. The fallback family is exported from `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/marketing.html` through `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/scripts/export-listing-art.mjs`.
- The first exported fallback icon kept the right composition but exceeded the PlayDrop publish cap at `863096` bytes. I quantized the same approved square asset down to `166K` before the live upload so the shipped family still matches the reviewed composition.
- No extra non-PlayDrop art generator was used after the outage. The shipped family stays grounded in the real build, the real screenshots, and the actual runtime palette.

## Prompt Log And Reference Chain

- PlayDrop AI landscape candidate `A`
  - CLI options: `playdrop ai create image "Premium storefront landscape hero art for the game Scrap Signal based on the attached real gameplay screenshot. Keep the same top-down beacon-defense shooter premise: a bright cyan rescue beacon near center, a small white salvage skiff circling through rust-red scrap drones, and amber battery canisters being hauled back through rain and sea spray. Put the title SCRAP SIGNAL in the centered composition band with minimal clean lettering. No HUD, no subtitles, no extra UI, no border, no badge, no realism, and do not oversell beyond the real game." --asset-name scrap-signal-hero-landscape-a --asset-display-name "Scrap Signal Hero Landscape A" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-1.png --ratio 16:9 --resolution 1280x720 --timeout 180 --poll 2000 --json`
  - Result: failed before generation with `AI create failed with status 500.`
- PlayDrop AI landscape candidate `B`
  - CLI options: `playdrop ai create image "Storefront key art for Scrap Signal derived from the attached live gameplay shot. Show the cyan beacon glowing through a storm-dark sea, the white salvage skiff cutting a tight orbit, rust-red scrap drones crashing inward, and amber battery canisters returning to safety. Render the exact title SCRAP SIGNAL large and readable across the center band. Premium game-store hero image, not a screenshot, no HUD, no border, no subtitle text, and no unrelated characters." --asset-name scrap-signal-hero-landscape-b --asset-display-name "Scrap Signal Hero Landscape B" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-1.png --ratio 16:9 --resolution 1280x720 --timeout 180 --poll 2000 --json`
  - Result: failed before generation with `AI create failed with status 500.`
- PlayDrop AI landscape candidate `C`
  - CLI options: `playdrop ai create image "Marketing hero for Scrap Signal based on the attached real build screenshot. Keep the live game's simple stylized look: one bright rescue beacon, one small skiff, rust-red drone pressure, amber battery pickups, dark water, and rain-lit spray. Turn that into polished key art with a stronger central composition and the exact title SCRAP SIGNAL clearly centered. Minimal text only, no HUD, no button chrome, no screenshot frame, and do not oversell the runtime beyond its honest arcade look." --asset-name scrap-signal-hero-landscape-c --asset-display-name "Scrap Signal Hero Landscape C" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-1.png --ratio 16:9 --resolution 1280x720 --timeout 180 --poll 2000 --json`
  - Result: failed before generation with `AI create failed with status 500.`
- Final fallback family
  - Landscape hero source: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/marketing.html`
  - Portrait hero source: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/marketing.html`
  - Icon source: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/marketing.html`
  - Export path: `npm run export:listing-art`
  - Why it won: it keeps the real beacon-defense screenshot language, the actual cyan-rust-amber palette, and the centered-name requirement without pretending the live build is more detailed than it is.

## Family Review

- The shipped landscape and portrait heroes clearly belong to one family: the same storm-sea backdrop, centered dark title band, cyan beacon halo, rust drone shapes, and amber battery accents pulled from the actual build.
- The final icon stays full-bleed and readable at small size. It keeps the beacon, skiff, and drone pressure in a square crop without turning into a badge, medallion, or framed emblem.
- Compared against the raw screenshots, the shipped family feels purpose-built for store use, but it still stays honest because the scene language, palette, and focal objects all come directly from the real gameplay captures.

## Evidence

- Listing copy: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/copy.md`
- X thread draft: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/X_THREAD.md`
- Final icon: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/icon.png`
- Final landscape hero: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/hero-landscape.png`
- Final portrait hero: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/hero-portrait.png`
- Landscape screenshot 1: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-1.png`
- Landscape screenshot 2: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-2.png`
- Gameplay video: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-recording.mp4`
- Fallback family review: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/ai-art/fallback-family-review.png`
- AI attempt log: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/ai-art/jobs-image-20260410.json`
- Browse/detail/search logs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/ai-art/playdrop-browse-apps.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/ai-art/playdrop-detail-relayline.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/ai-art/playdrop-search-beacon-icon.json`
- Final metadata wired: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/catalogue.json`
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None.
