# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero family, screenshots, gameplay video, and player-facing listing copy for the shipped `Whiteout Watch` build using the PlayDrop-first listing workflow.

## Output

- Captured one landscape gameplay screenshot, two portrait gameplay screenshots, and a 12-second landscape gameplay MP4 from the current tuned build.
- Finalized a matched PlayDrop AI landscape hero, portrait hero, and full-bleed square icon family grounded in the shipped storm-station dashboard, amber whiteout vortex, and cyan pulse language.
- Wired the final listing block into `catalogue.json` and drafted the player-facing listing copy plus the three-post X thread in the `listing/` folder.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `playdrop browse --kind app --creator me --limit 10 --json`
- `playdrop detail tarkum/app/watair --json`
- `playdrop search "winter icon" --kind asset --asset-category IMAGE --limit 5 --json`
- `playdrop search "storm dashboard" --kind asset --asset-category IMAGE --limit 5 --json`
- `playdrop search "weather station" --kind asset --asset-category IMAGE --limit 5 --json`
- `playdrop credits balance`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_720x1280-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/scripts/capture-media.mjs`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/family-review.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/catalogue.json`
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
- [x] The primary hero was generated through PlayDrop AI with the game name explicitly requested in the centered composition.
- [x] The sibling hero was generated from the approved hero so the family stays matched.
- [x] The final icon was generated through PlayDrop AI from the approved hero reference.
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

- The first icon attempt failed the gate because it read like a glowing circular badge inside a square crop. Replaced it with a stricter full-bleed prompt that explicitly banned medallions, borders, and empty mattes.
- Landscape candidate `A` failed because it carried too much literal UI text and secondary labels into the hero, which made it feel like decorated interface instead of hero art.
- Landscape candidate `C` failed because it stayed too close to a screenshot-plus-title treatment. Candidate `B` won because it kept the centered title band, removed the live HUD clutter, and still felt visually honest to the shipped storm-station runtime.

## Prompt Log And Reference Chain

- PlayDrop AI landscape candidate `A`
  - CLI options: `playdrop ai create image "Premium storefront hero art for the game Whiteout Watch. Use the attached real gameplay screenshot as the composition and palette reference for the frosted midnight dashboard, icy cyan system glow, amber forecast warning, and red critical alert language. Create a bespoke 16:9 marketing hero for the actual game with the exact title WHITEOUT WATCH clearly rendered in the central composition band. No HUD chrome, no screenshot frame, no extra copy, no characters, and do not oversell the runtime beyond its clean storm-station dashboard look." --asset-name whiteout-watch-hero-landscape-a --asset-display-name "Whiteout Watch Hero Landscape A" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 180 --poll 2000 --json`
  - Generated asset ref: `asset:autonomoustudio/whiteout-watch-hero-landscape-a@r1`
  - Result: succeeded, but rejected because the output retained too much literal interface copy.
- PlayDrop AI landscape candidate `B`
  - CLI options: `playdrop ai create image "Storefront key art for Whiteout Watch derived from the attached live gameplay shot. Keep the same navy weather-station instruments, cyan meter glow, amber storm forecast, and whiteout atmosphere from the shipped build, but turn them into polished 16:9 hero art. Render the exact title WHITEOUT WATCH large and readable across the center band. Premium poster art, not a screenshot, with minimal text and no invented sci-fi props or characters." --asset-name whiteout-watch-hero-landscape-b --asset-display-name "Whiteout Watch Hero Landscape B" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 180 --poll 2000 --json`
  - Generated asset ref: `asset:autonomoustudio/whiteout-watch-hero-landscape-b@r1`
  - Result: approved. It keeps the title centered, strips the live HUD down to a coherent poster treatment, and stays closest to the real station-window mood.
- PlayDrop AI landscape candidate `C`
  - CLI options: `playdrop ai create image "Marketing hero for Whiteout Watch based on the attached real build screenshot. Stay faithful to the current survival triage game: remote storm station dashboard, frosted glass, three failing systems, and visible incoming forecast. Strengthen the composition into store-ready key art and place the exact title WHITEOUT WATCH clearly in the middle of the image. No screenshot border, no subtitle, no badge framing, and no realism that oversells the live game." --asset-name whiteout-watch-hero-landscape-c --asset-display-name "Whiteout Watch Hero Landscape C" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 180 --poll 2000 --json`
  - Generated asset ref: `asset:autonomoustudio/whiteout-watch-hero-landscape-c@r1`
  - Result: succeeded, but rejected because it read too much like a screenshot with the title pasted over it.
- PlayDrop AI portrait hero
  - CLI options: `playdrop ai create image "Matched 9:16 storefront hero art for the game Whiteout Watch derived from the approved landscape hero and the attached portrait gameplay screenshot. Keep the same navy storm-station window, cyan battery glow, amber storm vortex, frosted atmosphere, and premium minimal poster treatment. Render the exact title WHITEOUT WATCH clearly in the central composition band so it matches the approved landscape hero family. No HUD chrome, no extra copy, no characters, and no invented realism beyond the shipped dashboard look." --asset-name whiteout-watch-hero-portrait-a --asset-display-name "Whiteout Watch Hero Portrait A" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/hero-landscape-b.jpg --image2 /Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_720x1280-screenshot-1.png --ratio 9:16 --resolution 864x1536 --timeout 180 --poll 2000 --json`
  - Generated asset ref: `asset:autonomoustudio/whiteout-watch-hero-portrait-a@r1`
  - Result: approved. It preserves the same title band, storm-window framing, and amber/cyan palette family as the landscape winner.
- PlayDrop AI icon candidate `A`
  - CLI options: `playdrop ai create image "Full-bleed square app icon for the game Whiteout Watch derived from the approved hero family. Use the same icy navy storm-station window, cyan pulse glow, and amber storm vortex, simplified into a bold readable icon for small sizes. No title text, no badge, no medallion, no border, no empty matte background, and no unrelated objects." --asset-name whiteout-watch-icon-a --asset-display-name "Whiteout Watch Icon A" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/hero-landscape-b.jpg --image2 /Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/hero-portrait-a.jpg --ratio 1:1 --resolution 1024x1024 --timeout 180 --poll 2000 --json`
  - Generated asset ref: `asset:autonomoustudio/whiteout-watch-icon-a@r1`
  - Result: succeeded, but rejected because it still looked like a circular medallion inside the square crop.
- PlayDrop AI icon candidate `B`
  - CLI options: `playdrop ai create image "Full-bleed square app icon for Whiteout Watch derived from the approved hero family. Do not use any circle, badge, medallion, frame, border, or empty matte background. Fill the whole square with the icy storm-station window and amber whiteout vortex cutting through frosted glass, with three cyan battery pulses integrated directly into the composition. Cropped close, bold, and readable at small size. No title text and no unrelated objects." --asset-name whiteout-watch-icon-b --asset-display-name "Whiteout Watch Icon B" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/hero-landscape-b.jpg --image2 /Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_720x1280-screenshot-2.png --ratio 1:1 --resolution 1024x1024 --timeout 180 --poll 2000 --json`
  - Generated asset ref: `asset:autonomoustudio/whiteout-watch-icon-b@r1`
  - Result: approved. It fills the square, keeps the storm-station identity, and avoids the medallion failure mode.

## Family Review

- The shipped landscape and portrait heroes read as one family: the same dark station window, amber storm core, cyan pulse accents, centered title band, and minimal-text storefront treatment.
- The final icon stays full-bleed and readable at small size. It uses the same amber storm + cyan pulses language without turning into a badge or framed emblem.
- Compared against the raw screenshots, the final family is purpose-built marketing art, but it still feels honest because the station window, storm framing, pulse glow, and cold palette all come directly from the real build captures.

## Evidence

- Listing copy: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/copy.md`
- X thread draft: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/X_THREAD.md`
- Final icon: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/icon.png`
- Final landscape hero: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/hero-landscape.png`
- Final portrait hero: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/hero-portrait.png`
- Landscape screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_1280x720-screenshot-1.png`
- Portrait screenshot 1: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_720x1280-screenshot-1.png`
- Portrait screenshot 2: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_720x1280-screenshot-2.png`
- Gameplay video: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/whiteout-watch_1280x720-recording.mp4`
- Video review data:
  - duration: `12.00s`
  - frame size: `1280x720`
  - frame rate: `25fps`
- Family review image: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/family-review.png`
- AI logs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/hero-landscape-a.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/hero-landscape-b.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/hero-landscape-c.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/hero-portrait-a.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/icon-a.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/ai-art/icon-b.json`
- Final metadata wired: `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/catalogue.json`
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
