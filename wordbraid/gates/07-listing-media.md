# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Built a full `Wordbraid` listing package with a matched PlayDrop-generated hero family, a full-bleed PlayDrop-generated icon, real-build portrait and landscape screenshots, a real landscape gameplay MP4, and listing/X copy that teaches the exact input and fail rule.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/copy.md`
- `playdrop browse --kind app --limit 12 --json`
- `playdrop detail autonomoustudio/app/drifthook --json`
- `playdrop detail autonomoustudio/app/pocket-bastion --json`
- `playdrop browse --kind asset-pack --limit 6 --json`

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
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

- The first three landscape candidates were close but not shippable as the family anchor.
- `wordbraid-hero-landscape-test` kept the real loom well, but the title sat too high and did not own the center band strongly enough.
- `wordbraid-hero-landscape-a` had the title in the middle, but it obscured too much of the board and read more like text-over-art than a balanced product hero.
- `wordbraid-hero-landscape-b` drifted too far from the real shipped board, introduced extra ribbon theatrics, and felt closer to generic fantasy key art than `Wordbraid`.
- The corrective `wordbraid-hero-landscape-c` kept the true loom silhouette, centered the title in a readable plaque, and still looked like the shipped game. That made it the right anchor for the portrait sibling and icon.
- The first media-capture pass also exposed that browser-side `topCandidates` was not the same path as the offline casual policy, so the loss seed could stall before reaching a game-over screen. I rewrote the capture script to use preplanned pull sequences from the actual game logic, which made the screenshots and MP4 deterministic.

## Prompt Log And Reference Chain

- Real-build reference screenshot captured before hero generation:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-end.png`

- Listing exploration references:
  - `playdrop browse --kind app --limit 12 --json`
  - `playdrop detail autonomoustudio/app/drifthook --json`
  - `playdrop detail autonomoustudio/app/pocket-bastion --json`
  - `playdrop browse --kind asset-pack --limit 6 --json`

- Common PlayDrop AI CLI options used for listing art:
  - `playdrop ai create image <prompt> --visibility private --subcategory generic --timeout 180 --poll 2000 --json`

- Landscape candidate 1
  - Asset ref: `asset:autonomoustudio/wordbraid-hero-landscape-test@r1`
  - Output: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/ai-art/wordbraid-hero-landscape-test.png`
  - CLI specifics: `--image1 /Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-end.png --ratio 16:9 --asset-name wordbraid-hero-landscape-test --asset-display-name "Wordbraid Hero Landscape Test" --asset-description "Landscape marketing hero for Wordbraid derived from the real gameplay screenshot."`
  - Prompt: `Premium marketing hero art for Wordbraid, a nocturne word-braiding arcade game. Use the attached gameplay screenshot for the real five-ribbon letterpress loom, ivory tiles, copper ink danger, and deep ink-blue palette. Compose a polished 16:9 landscape hero with a strong centered composition and a centered title treatment reading 'Wordbraid'. No UI chrome, no screenshot frame, no watermark.`

- Landscape candidate 2
  - Asset ref: `asset:autonomoustudio/wordbraid-hero-landscape-a@r1`
  - Output: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/ai-art/wordbraid-hero-landscape-a.png`
  - CLI specifics: `--image1 /Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-end.png --ratio 16:9 --asset-name wordbraid-hero-landscape-a --asset-display-name "Wordbraid Hero Landscape A" --asset-description "Landscape marketing hero for Wordbraid derived from the real gameplay screenshot."`
  - Prompt: `Premium key art for Wordbraid. Use the attached gameplay screenshot for the real five-ribbon ivory letter loom, copper thread frame, and ink-blue night palette. Compose a dramatic 16:9 landscape hero with the board centered, copper ink heat curling from the most dangerous lanes, and the game name 'Wordbraid' rendered large in the central composition band. Keep it elegant, premium, and clearly based on the shipped game. No UI chrome, no screenshot framing, no watermark.`

- Landscape candidate 3
  - Asset ref: `asset:autonomoustudio/wordbraid-hero-landscape-b@r1`
  - Output: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/ai-art/wordbraid-hero-landscape-b.jpg`
  - CLI specifics: `--image1 /Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-end.png --ratio 16:9 --asset-name wordbraid-hero-landscape-b --asset-display-name "Wordbraid Hero Landscape B" --asset-description "Landscape marketing hero for Wordbraid derived from the real gameplay screenshot."`
  - Prompt: `Marketing hero art for Wordbraid, a tactile word-braiding arcade game. Use the attached gameplay screenshot as the visual truth for the five vertical ribbon lanes, ivory type blocks, warm copper frame, and dark indigo backdrop. Create a polished 16:9 hero with a bold centered title reading 'Wordbraid', richer depth, stronger braided thread motifs, and enough breathing room that the title and loom feel like one premium family. No UI, no fake buttons, no screenshot border, no watermark.`

- Approved landscape family anchor
  - Asset ref: `asset:autonomoustudio/wordbraid-hero-landscape-c@r1`
  - Output source: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/ai-art/wordbraid-hero-landscape-c.jpg`
  - Shipped file: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/hero-landscape.png`
  - CLI specifics: `--image1 /Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/local-desktop-end.png --ratio 16:9 --asset-name wordbraid-hero-landscape-c --asset-display-name "Wordbraid Hero Landscape C" --asset-description "Landscape marketing hero for Wordbraid derived from the real gameplay screenshot."`
  - Prompt: `Premium marketing hero art for the real game Wordbraid. Use the attached gameplay screenshot as a strict visual reference for the five vertical ribbon lanes, ivory letter blocks, copper frame, and deep indigo background. Create a polished 16:9 landscape key art with the loom centered and fully readable. Place the title 'Wordbraid' centered in the central composition band on a subtle copper plaque or luminous ribbon overlay that does not hide more than one row of tiles. Add restrained braided-thread and ember motifs around the frame. Premium, tactile, clearly based on the shipped build. No UI chrome, no fake buttons, no screenshot border, no watermark.`

- Portrait sibling
  - Asset ref: `asset:autonomoustudio/wordbraid-hero-portrait-a@r1`
  - Output source: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/ai-art/wordbraid-hero-portrait-a.jpg`
  - Shipped file: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/hero-portrait.png`
  - CLI specifics: `--image1 /Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/ai-art/wordbraid-hero-landscape-c.jpg --ratio 9:16 --asset-name wordbraid-hero-portrait-a --asset-display-name "Wordbraid Hero Portrait A" --asset-description "Portrait marketing hero for Wordbraid derived from the approved landscape hero."`
  - Prompt: `Reframe the approved Wordbraid landscape hero into a 9:16 portrait marketing hero while preserving the same indigo background, copper loom frame, ivory letter blocks, ember accents, and centered title treatment. Keep the product clearly in the same art family, with the loom dominant and the title 'Wordbraid' centered in the central composition band. No UI, no watermark.`

- Icon
  - Asset ref: `asset:autonomoustudio/wordbraid-icon-a@r1`
  - Output source: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/ai-art/wordbraid-icon-a.jpg`
  - Shipped file: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/icon.png`
  - CLI specifics: `--image1 /Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/ai-art/wordbraid-hero-landscape-c.jpg --ratio 1:1 --asset-name wordbraid-icon-a --asset-display-name "Wordbraid Icon A" --asset-description "Full-bleed square icon for Wordbraid derived from the approved hero."`
  - Prompt: `Create a premium full-bleed square icon for Wordbraid using the approved hero as the style reference. Center a cropped copper-and-ivory loom emblem with braided-thread detail and ember glow so it fills the square edge to edge. No flat matte, no empty border, no floating circular badge, no text, no watermark.`

## Family Review

- The shipped landscape and portrait heroes clearly belong to one family: same loom frame, same indigo field, same ember accents, and the same centered `Wordbraid` plaque treatment.
- The landscape hero wins because it still looks like the true build. It sells the game without inventing a different playfield language.
- The portrait hero holds the same title treatment in the center band and keeps the loom readable instead of turning into a text poster.
- The icon is full-bleed to the edges and reads like a woven product emblem, not a circular badge dropped on a matte.
- None of the shipped art materially oversells the live build. The listing family is richer than the raw UI, but it still honestly reflects the real copper-loom / ivory-tile direction.

## Real Build Media

- Copy file:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/copy.md`

- Final listing art:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/hero-landscape.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/hero-portrait.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/icon.png`

- Screenshot capture script and deterministic seed plans:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/scripts/capture-media.mjs`
  - Showcase seed: `144`
  - Loss/video seed: `95`

- Real-build screenshots:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/wordbraid_720x1280-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/wordbraid_720x1280-screenshot-2.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/wordbraid_1280x720-screenshot-1.png`

- Real gameplay video:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/wordbraid_1280x720-recording.mp4`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/review-media/wordbraid-gameplay.mp4`

## Evidence

- Landscape hero normalized to `1600x900`
- Portrait hero normalized to `1080x1920`
- Icon confirmed at `1024x1024`
- Portrait screenshots confirmed at `720x1280`
- Landscape screenshot confirmed at `1280x720`
- Gameplay video confirmed at `1280x720`, `25fps`, `13.12s`
- Video review frames:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/video-check/frame-3s.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/tmp/video-check/frame-10s.png`
- Final validation passed with listing media in place:
  - `npm run validate`
  - `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
