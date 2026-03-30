# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Finalized the `1.0.0` Drifthook listing family with a PlayDrop-generated matched landscape hero, portrait hero, and full-bleed square icon, plus standardized real-build screenshots, a landscape gameplay MP4, and player-facing listing copy wired into `catalogue.json`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook_720x1280-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/hero-landscape-b.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/hero-landscape-c.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/hero-portrait-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/hero-portrait-b.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/icon-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/icon-b.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/jobs-image-20260328.json`
- `playdrop ai jobs browse --type image --limit 30 --json`

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
- [x] The listing description explains how to play, including the core input, what clears, the main fail pressure or objective, and the exact match rule if players could misread it.
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

- The first landscape hero attempt, `drifthook-hero-landscape-20260328-a`, failed on the PlayDrop image path with `image_generation_timeout`, so I reran the same step instead of advancing.
- Landscape candidate `B` rendered successfully, but it leaned too cinematic relative to the real game and risked overselling the shipped visual density. Landscape candidate `C` kept the same moonlit lake language while staying closer to the actual quiet, sparse runtime, so `C` became the approved family anchor.
- Portrait candidate `A` was serviceable, but `B` preserved the same restrained atmosphere and title band with a cleaner mobile read. I selected `B` so the 9:16 listing keeps the same family tone as the approved landscape anchor.
- Icon candidate `A` failed the full-bleed rule because the lower portion read like a matte band rather than continuous scene art. I rejected it and shipped icon `B`, which keeps one clear lantern-and-hook focal point and carries scene detail to all four edges.
- The original portrait screenshots were captured at `768x1280`. Before passing the gate, I normalized the shipped portrait listing files to `720x1280` so filenames, metadata, and evidence all match the intended listing surface cleanly.

## Prompt Log And Reference Chain

- Approved family anchor
  - CLI options: `playdrop ai create image ... --asset-name drifthook-hero-landscape-20260328-c --asset-display-name "Drifthook Hero Landscape C" --visibility public --image1 /Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/landscape-gameplay.png --ratio 16:9 --json`
  - Rejected first attempt: `assetName=drifthook-hero-landscape-20260328-a`, `status=FAILURE`, `error=image_generation_timeout`
  - Alternate reviewed candidate: `asset:autonomoustudio/drifthook-hero-landscape-20260328-b@r1`
  - Selected landscape hero ref: `asset:autonomoustudio/drifthook-hero-landscape-20260328-c@r1`
  - Prompt: `Store hero art for Drifthook. Use the attached gameplay screenshot as style reference. Create a premium 16:9 landscape composition showing a glowing lantern lure suspended over deep moonlit water with a few stylized fish silhouettes and a warm moon reflection. Keep the title 'Drifthook' large and centered in the middle band of the image. Match the real game's quiet night-fishing palette and do not add UI, border, watermark, or extra text.`
- Portrait sibling generation
  - CLI options: `playdrop ai create image ... --asset-name drifthook-hero-portrait-20260328-b --asset-display-name "Drifthook Hero Portrait B" --visibility public --image1 /Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/hero-landscape-c.jpg --image2 /Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/portrait-gameplay.png --ratio 9:16 --json`
  - Alternate reviewed candidate: `asset:autonomoustudio/drifthook-hero-portrait-20260328-a@r1`
  - Selected portrait hero ref: `asset:autonomoustudio/drifthook-hero-portrait-20260328-b@r1`
  - Prompt: `Create a matched 9:16 portrait hero for Drifthook from the approved landscape hero reference. Keep the same quiet night-fishing atmosphere, moonlit water, glowing lantern lure, and cohesive title style. Render 'Drifthook' clearly in the middle band of the image and compose the scene so the lantern line and underwater depth read strongly on mobile. No UI, no border, no watermark, no extra copy.`
- Icon generation
  - CLI options: `playdrop ai create image ... --asset-name drifthook-icon-20260328-b --asset-display-name "Drifthook Icon B" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/hero-landscape-c.jpg --ratio 1:1 --resolution 1024x1024 --json`
  - Rejected icon candidate: `asset:autonomoustudio/drifthook-icon-20260328-a@r1`
  - Selected icon ref: `asset:autonomoustudio/drifthook-icon-20260328-b@r1`
  - Prompt: `Create a premium full-bleed square icon for Drifthook using the approved hero as style reference. Fill the square with a glowing fishing float and hook descending through moonlit blue water, with soft fish silhouettes and lake shadows carried to every edge. The icon must feel like one strong scene, readable at small size. No text, no watermark, no white matte, no empty border, no circular badge, no framed emblem.`

## Family Review

- The shipped landscape and portrait heroes clearly belong to the same family: the same moonlit lake split, the same glowing lantern lure, the same sparse fish silhouettes, and the same centered `Drifthook` title band.
- The final icon reads as the same product at small size without turning into a badge, emblem, or flat-matte sticker. The lantern and hook stay central while the fish and reeds keep the square full-bleed.
- Compared against the rejected candidates, the shipped family is the most honest to the real game. It keeps the moody night-fishing fantasy without promising a busier or more detailed runtime than players will actually get.

## Evidence

- Icon size confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/icon.png` (`1024x1024`)
- Landscape hero size confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/hero-landscape.png` (`1600x900`)
- Portrait hero size confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/hero-portrait.png` (`1080x1920`)
- Landscape screenshot confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook_1280x720-screenshot-1.png` (`1280x720`)
- Portrait screenshots confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook_720x1280-screenshot-1.png` and `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook_720x1280-screenshot-2.png` (`720x1280`)
- Gameplay video confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook_1280x720-recording.mp4` (`1280x720`, `12.0s`, `25fps`)
- Listing copy wired: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/copy.md`
- Final metadata wired: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/catalogue.json`
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`
- AI job log captured: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/ai-art/jobs-image-20260328.json`

## Verdict

PASS

## Required Fixes If Failed

- None
