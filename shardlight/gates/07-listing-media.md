# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Final PlayDrop-generated landscape hero, matched portrait sibling, full-bleed icon, canonical screenshot/video files, synced store copy, and a populated `listing` block in `catalogue.json`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/store-copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_720x1280-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/listing/family-review.jpg`
- `playdrop browse --kind app --limit 10 --json`
- `playdrop search puzzle --limit 5 --json`
- `playdrop detail kenneynl/asset-pack/puzzle-pack --json`
- `playdrop detail autonomoustudio/app/fruit-salad --json`
- `playdrop detail autonomoustudio/app/latchbloom --json`

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

## PlayDrop-First Exploration

- Reference gameplay screenshot used for hero generation:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_1280x720-screenshot-1.png`
- Browse/search/detail checks:
  - `playdrop browse --kind app --limit 10 --json`
  - `playdrop search puzzle --limit 5 --json`
  - `playdrop detail kenneynl/asset-pack/puzzle-pack --json`
  - `playdrop detail autonomoustudio/app/fruit-salad --json`
  - `playdrop detail autonomoustudio/app/latchbloom --json`

### Landscape Hero Candidates

- Candidate A
  - Prompt: `Marketing hero art for the real mobile puzzle game Shardlight. Show a bronze excavation slab half-buried in warm desert sand with glowing blue and amber clue tiles, a few cursed crystal marks, and atmospheric dust. The game name SHARDLIGHT must appear in large carved luminous letters centered in the composition band. Bespoke PlayDrop store hero, premium game key art, minimal text, not a screenshot.`
  - Options: `--asset-name shardlight-hero-landscape-a --asset-display-name "Shardlight Hero Landscape A" --asset-description "Landscape hero candidate A for Shardlight" --visibility private --ratio 16:9 --image1 listing/shardlight_1280x720-screenshot-1.png`
  - Generated ref: `asset:autonomoustudio/shardlight-hero-landscape-a@r1`
- Candidate B
  - Prompt: `Marketing hero art for the real mobile puzzle game Shardlight. Show a dramatic top-lit relic chamber with a glowing puzzle board, bright clue digits, crystalline curse sigils, and a beam of desert light cutting through dust. The game name SHARDLIGHT must appear centered and clearly readable across the middle of the image. Premium PlayDrop listing hero, minimal text, no UI chrome, not a screenshot.`
  - Options: `--asset-name shardlight-hero-landscape-b --asset-display-name "Shardlight Hero Landscape B" --asset-description "Landscape hero candidate B for Shardlight" --visibility private --ratio 16:9 --image1 listing/shardlight_1280x720-screenshot-1.png`
  - Generated ref: `asset:autonomoustudio/shardlight-hero-landscape-b@r1`
- Candidate C
  - Prompt: `Marketing hero art for the real mobile puzzle game Shardlight. Show a close, tactile excavation board framed by desert gloom, luminous clue numbers, cracked stone, and radiant gemstone highlights. The title SHARDLIGHT must be integrated in the center composition band in bold carved letters. Strong bespoke mobile game cover art, elegant and readable, minimal text, not a screenshot.`
  - Options: `--asset-name shardlight-hero-landscape-c --asset-display-name "Shardlight Hero Landscape C" --asset-description "Landscape hero candidate C for Shardlight" --visibility private --ratio 16:9 --image1 listing/shardlight_1280x720-screenshot-1.png`
  - Generated ref: `asset:autonomoustudio/shardlight-hero-landscape-c@r1`

### Final Portrait And Icon

- Portrait sibling
  - Final prompt: `Create a matching 9:16 portrait PlayDrop listing hero for the real mobile puzzle game Shardlight using this approved landscape hero as the exact source image. Recompose one single excavation board slab vertically without adding any new headers, numerals, large standalone gems, secondary boards, or any text other than SHARDLIGHT. Keep one carved-stone board filling most of the frame, with SHARDLIGHT on one centered stone nameplate across the middle composition band. No duplicated panels, no top letters, no empty tray, no HUD frame, minimal text, premium bespoke hero art, not a screenshot.`
  - Options: `--asset-name shardlight-hero-portrait-v3 --asset-display-name "Shardlight Hero Portrait V3" --asset-description "Portrait hero final reroll for Shardlight with one board and no extra lettering" --visibility private --ratio 9:16 --image1 listing/hero-landscape.png`
  - Generated ref: `asset:autonomoustudio/shardlight-hero-portrait-v3@r1`
- Icon
  - Final prompt: `Create a full-bleed square icon for the real mobile puzzle game Shardlight derived from this approved hero. Show a single glowing amber shard set into cracked bronze stone with subtle blue crystal highlights near the corners. No words, no letters, no runes, no title, no emblem frame, no badge, no medallion, no border, and no flat matte background. Edge-to-edge art, simple and readable at small size, faithful to the real game palette.`
  - Options: `--asset-name shardlight-icon-v2 --asset-display-name "Shardlight Icon V2" --asset-description "Square icon reroll for Shardlight with no lettering or badge framing" --visibility private --ratio 1:1 --image1 listing/hero-landscape.png`
  - Generated ref: `asset:autonomoustudio/shardlight-icon-v2@r1`

## Feedback Applied Before PASS

- Landscape candidate A was attractive but the title sat too high in the frame, so it lost the central-band read the checklist requires.
- Landscape candidate B had stronger drama, but the distant board and heavy spotlighting oversold the shipped build more than candidate C.
- The first portrait sibling duplicated the board and introduced an empty tray panel. I reran the sibling step with explicit single-slab guidance.
- The second portrait sibling introduced an off-model top glyph and oversized centerpiece gem. I tightened the prompt again to forbid extra headers, letters, and secondary structures before accepting the third pass.
- The first icon introduced fake lettering and badge-like framing. I reran the icon step with a stricter single-shard, no-letters, no-frame prompt.
- Final family won because it keeps the real board language, stays within the shipped palette, puts the title in the center band on both heroes, and gives the icon a clean single-shard silhouette.
- The live `1.0.0` screenshot and video captures preserved the broken compressed board layout, so I reran the canonical screenshot/video capture after the `1.0.1` layout fix while keeping the approved hero, portrait sibling, icon, and store copy unchanged.

## Evidence

- Store copy:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/store-copy.md`
- Final listing art:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/hero-landscape.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/hero-portrait.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/icon.png`
- Final screenshot and video files:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_1280x720-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_720x1280-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_720x1280-screenshot-2.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_1280x720-recording.mp4`
- Refreshed local capture sources for `1.0.1`:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/candidate-landscape-gameplay-fixed-v2.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/candidate-portrait-start-fixed.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/candidate-portrait-gameover-fixed.png`
- Family review:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/listing/family-review.jpg`
- Metadata sync:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/catalogue.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/README.md`

## Verdict

PASS

## Required Fixes If Failed

- None
