# 07-listing-media - Listing And Store Media

## Instruction

- Create the final `Switchback Dispatch` listing pack from the real current build, then verify that the listing copy, hero family, icon, screenshot, and gameplay video all sell the same desktop-only courier-contract fantasy as the shipped build.

## Output

- Captured a fresh real-build landscape screenshot, a supporting portrait screenshot, and a trimmed landscape gameplay MP4 from the current `dist/test-host.html` build using `scripts/capture-media.mjs`.
- Explored four PlayDrop AI landscape hero candidates from the strongest real gameplay screenshot, chose `hero-c` as the family anchor, then generated the matched portrait sibling and full-bleed square icon from that approved landscape winner.
- Replaced the starter-kit listing assets with the final `Switchback Dispatch` family, restored the `catalogue.json` listing block, and aligned the listing copy plus X draft with the shipped desktop-only courier rules.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `playdrop search truck --json`
- `playdrop search racing --json`
- `playdrop search mountain --json`
- `playdrop search drift --json`
- `playdrop detail playdrop/app/starter-kit-racing --json`
- `playdrop detail kenneynl/asset-pack/racing-kit --json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/switchback-dispatch_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/switchback-dispatch_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/README.md`

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

- The initial `listing/` folder still contained the starter-kit hero, icon, screenshots, video, and provenance file. I removed all inherited starter media before closing the gate so the publish bundle only carries `Switchback Dispatch` assets.
- The first capture-script pass failed because `listingCapture=1` intentionally disables the live animation loop. I patched `scripts/capture-media.mjs` to advance time manually for screenshots and to use the normal animated path for the recorded gameplay video.
- The first four landscape hero prompts explored the right direction, but only one candidate passed the credibility bar:
  - `hero-a` stayed the least faithful to the gameplay reference and had the weakest title/composition balance.
  - `hero-b` had the cleanest title treatment, but it pushed the game slightly too far into glossy poster territory.
  - `hero-d` had strong spectacle, but it oversold the real build most clearly.
  - `hero-c` won because it stayed closest to the real low-poly alpine courier game while keeping the title readable and centered without feeling like a fake poster rescue.
- The PlayDrop AI outputs arrived as JPEGs. Before passing the gate I converted the shipped `hero-landscape.png`, `hero-portrait.png`, and `icon.png` files into real PNGs so the listing assets match the file types the PlayDrop release path expects.
- The portrait sibling is the weakest asset in the final family because the title is smaller than in the landscape hero, but it still reads as the same product and still passes the family-consistency bar.
- No non-PlayDrop art fallback was needed.

## Evidence

- Final listing assets:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/icon.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/hero-landscape.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/hero-portrait.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/switchback-dispatch_1280x720-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/switchback-dispatch_1280x720-recording.mp4`
- Supporting capture proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/switchback-dispatch_720x1280-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/media-capture/video-frames-check/frame-01.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/media-capture/video-frames-check/frame-10.png`
- Media metadata:
  - `ffprobe` confirmed the final gameplay video is `1280x720`, `12.000000` seconds, H.264, `25fps`.
  - `file` confirmed the final `hero-landscape.png`, `hero-portrait.png`, and `icon.png` are real PNG files.
- Copy and metadata:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/copy.md`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/X_THREAD.md`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/catalogue.json`
- Validation:
  - `npm run validate`
  - `playdrop project validate .`

## PlayDrop AI Record

- Candidate `switchback-dispatch-hero-a`:
  - CLI options: `--ratio 16:9 --resolution 1536x864 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/switchback-dispatch_1280x720-screenshot-1.png`
  - Prompt: `Premium storefront hero art for Switchback Dispatch. Use the supplied real gameplay screenshot as strict reference for the compact low-poly alpine road, yellow courier truck, glowing delivery beacon language, pine forest, and warm dawn mountain palette. Compose a polished 16:9 key art scene with one truck carving through a steep switchback toward the next glowing beacon. Render the exact title SWITCHBACK DISPATCH large and clearly readable in the central horizontal composition band. Minimal extra text, no HUD, no screenshot framing, no fake UI, no watermark.`
  - Generated asset ref: `asset:autonomoustudio/switchback-dispatch-hero-a@r1`
  - Result: rejected because it felt least faithful to the gameplay reference and had the weakest title/composition balance.
- Candidate `switchback-dispatch-hero-b`:
  - CLI options: `--ratio 16:9 --resolution 1536x864 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/switchback-dispatch_1280x720-screenshot-1.png`
  - Prompt: `Marketing hero for Switchback Dispatch. Keep the same chunky low-poly courier truck, mountain road barriers, beacon glow, trees, and PlayDrop-scale driving scene from the gameplay reference, but turn it into bespoke poster art. Show the truck diving into one dramatic hairpin with a delivery beam ahead and tall pines framing the route. Put the exact game name SWITCHBACK DISPATCH cleanly in the center band of the landscape composition. No subtitles, no UI, no speedometer, no extra logos, not a screenshot.`
  - Generated asset ref: `asset:autonomoustudio/switchback-dispatch-hero-b@r1`
  - Result: strong runner-up because the title treatment was clean, but it oversold the real build slightly.
- Final landscape winner `switchback-dispatch-hero-c`:
  - CLI options: `--ratio 16:9 --resolution 1536x864 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/switchback-dispatch_1280x720-screenshot-1.png`
  - Prompt: `Bespoke store hero art for Switchback Dispatch. Derive it from the provided gameplay frame so the real truck silhouette, road width, beacon color, and alpine forest all stay credible. Emphasize the fantasy of urgent mountain delivery on a compact switchback loop, with one courier truck sliding through a left-hand bend while the next drop beacon burns ahead. Include the exact title SWITCHBACK DISPATCH centered and readable inside the main composition band. No HUD residue, no fake buttons, no poster taglines, no watermark.`
  - Generated asset ref: `asset:autonomoustudio/switchback-dispatch-hero-c@r1`
  - Why it won: it stayed closest to the actual low-poly courier game while still landing the title and composition strongly enough for storefront use.
- Candidate `switchback-dispatch-hero-d`:
  - CLI options: `--ratio 16:9 --resolution 1536x864 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/switchback-dispatch_1280x720-screenshot-1.png`
  - Prompt: `Premium game-store landscape hero for Switchback Dispatch. Keep the real product look from the attached screenshot: one yellow courier truck, tight mountain switchbacks, roadside barriers, warm sky, pine trees, and a glowing delivery target. Upgrade only the composition and lighting into strong key art. Frame the road and pines around a centered title band and render the exact text SWITCHBACK DISPATCH clearly there. No extra copy, no UI, no speed lines, no badge, no watermark, not a screenshot.`
  - Generated asset ref: `asset:autonomoustudio/switchback-dispatch-hero-d@r1`
  - Result: rejected because it pushed the spectacle too far and felt more like a hype poster than the real game.
- Final portrait sibling `switchback-dispatch-hero-portrait-a`:
  - CLI options: `--ratio 9:16 --resolution 1080x1920 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/tmp/hero-review/hero-c.jpg`
  - Prompt: `Portrait storefront hero for Switchback Dispatch derived directly from the approved landscape hero reference. Keep the same low-poly alpine switchback road, yellow courier truck, delivery-beacon glow, pine forest framing, and warm dawn palette. Recompose it cleanly for 9:16 while preserving the same product identity. Render the exact title SWITCHBACK DISPATCH clearly in the central portrait-safe composition band. No HUD, no fake controls, no extra subtitles, no watermark.`
  - Generated asset ref: `asset:autonomoustudio/switchback-dispatch-hero-portrait-a@r1`
  - Why it won: it keeps the same road, truck, palette, and beacon language as the landscape winner, so the family stays visually matched.
- Final icon `switchback-dispatch-icon-a`:
  - CLI options: `--ratio 1:1 --resolution 1024x1024 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/tmp/hero-review/hero-c.jpg`
  - Prompt: `Square full-bleed app icon for Switchback Dispatch derived from the approved hero reference. Focus on one bold yellow courier truck carving around a glowing delivery beacon on an alpine switchback, with pine silhouettes and warm sky color pushed to the edges. Make it simple, readable, and premium at small sizes. No text, no badge, no medallion, no border, no matte, no UI, no watermark.`
  - Generated asset ref: `asset:autonomoustudio/switchback-dispatch-icon-a@r1`
  - Why it won: it compresses the truck-plus-beacon identity into a readable full-bleed square without turning into a generic badge.

## Verdict

PASS

## Required Fixes If Failed

- None
