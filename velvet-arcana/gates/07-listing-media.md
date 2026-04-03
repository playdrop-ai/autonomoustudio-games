# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Finalized the Velvet Arcana listing family that shipped with the current live `1.0.2` release: a PlayDrop-generated matched landscape hero, portrait hero, and full-bleed square icon, plus standardized real-build screenshots, a landscape gameplay MP4, and player-facing listing/X copy wired into `catalogue.json`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/velvet-arcana_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/velvet-arcana_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/velvet-arcana_720x1280-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/velvet-arcana_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-landscape-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-landscape-b.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-landscape-c.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-landscape-d.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-portrait-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-portrait-b.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/icon-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/icon-b.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/jobs-image-20260403.json`
- `playdrop search solitaire --json`
- `playdrop search tarot --json`
- `playdrop search card --json`
- `playdrop detail autonomoustudio/app/latchbloom --json`
- `playdrop detail autonomoustudio/app/keyfall --json`
- `playdrop detail autonomoustudio/app/starfold --json`
- `playdrop ai jobs browse --type image --limit 20 --json`

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

- Landscape hero `A` was the strongest first-pass anchor, but it still included extra props like the book and coins. I used that approved composition as the refinement source for `D`, which removed the extra poster clutter while keeping the centered title band and the honest game-table language.
- Landscape hero `B` rendered successfully, but the oversized title block and bookshelf-like background pushed it too far toward poster art instead of the actual shipped table.
- Landscape hero `C` was elegant, but it felt more abstract and poster-like than the live build. It preserved the palette but read less like a real tabletop card game than `A` or the refined `D`.
- Portrait hero `A` kept the family intact and stayed clean on mobile. Portrait hero `B` introduced duplicate title treatment and stray UI-like framing, so I rejected it.
- Icon `A` stayed readable, full-bleed, and scene-based at small size. Icon `B` read more like a symmetrical emblem than a lived-in table scene, so I rejected it.
- The final shipped heroes were normalized to exact storefront sizes: the landscape hero was center-cropped from the PlayDrop output and exported to `1600x900`, and the portrait hero was lightly center-cropped and exported to `1080x1920`.
- The first publish attempt rejected `listing/icon.png` for exceeding PlayDrop's icon size cap. Before treating the media step as final, I quantized the icon and hero PNGs so the shipped bundle matched the actual upload constraints without changing the chosen art family.

## Prompt Log And Reference Chain

- Approved family anchor
  - CLI options: `playdrop ai create image ... --asset-name velvet-arcana-hero-landscape-d --asset-display-name "Velvet Arcana Hero Landscape D" --visibility public --image1 /Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-landscape-a.jpg --ratio 16:9 --json`
  - Alternate reviewed candidates: `asset:autonomoustudio/velvet-arcana-hero-landscape-a@r1`, `asset:autonomoustudio/velvet-arcana-hero-landscape-b@r1`, `asset:autonomoustudio/velvet-arcana-hero-landscape-c@r1`
  - Selected landscape hero ref: `asset:autonomoustudio/velvet-arcana-hero-landscape-d@r1`
  - Prompt: `Premium storefront hero for Velvet Arcana using the approved reference composition. Preserve the candlelit velvet table, centered title band, elegant ivory omen cards, and active glowing blade card. Remove the book, coins, and any extra poster props so the scene feels closer to the shipped game table. Keep the exact title VELVET ARCANA large and clearly readable in the center. No HUD, no screenshot framing, no watermark, no extra subtitle text.`
- Landscape exploration log
  - Candidate `A` ref: `asset:autonomoustudio/velvet-arcana-hero-landscape-a@r1`
  - Candidate `A` prompt: `Premium storefront hero art for the mobile solitaire game Velvet Arcana. Use the attached real gameplay screenshot as style reference for the candlelit velvet table, ivory cards, brass trim, and blade omen glow. Create a bespoke 16:9 marketing hero image with the exact game name VELVET ARCANA rendered clearly in the central composition band. No HUD, no screenshot framing, no watermark, no extra subtitle text.`
  - Candidate `B` ref: `asset:autonomoustudio/velvet-arcana-hero-landscape-b@r1`
  - Candidate `B` prompt: `Store hero art for Velvet Arcana. Use the provided gameplay screenshot as the visual reference, but turn it into premium key art: a rich wine-red reading table, luminous ivory omen cards, one active blade card at the center, and a reserve charm accent. Keep the exact title VELVET ARCANA large and readable in the center band. No counters, no buttons, no UI labels, no watermark, no fake subtitle.`
  - Candidate `C` ref: `asset:autonomoustudio/velvet-arcana-hero-landscape-c@r1`
  - Candidate `C` prompt: `Marketing hero for Velvet Arcana derived from the attached live gameplay screenshot. Compose a premium 16:9 storefront illustration with the velvet tarot table, three elegant omen cards in motion, warm brass glow, and the exact game name VELVET ARCANA centered cleanly across the middle of the image. Keep it faithful to the shipped game, not busier than the runtime. No HUD, no screenshot border, no extra text, no watermark.`
- Portrait sibling generation
  - CLI options: `playdrop ai create image ... --asset-name velvet-arcana-hero-portrait-20260403-a --asset-display-name "Velvet Arcana Hero Portrait A" --visibility public --image1 /Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-landscape-d.jpg --image2 /Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/velvet-arcana_720x1280-screenshot-1.png --ratio 9:16 --json`
  - Alternate reviewed candidate: `asset:autonomoustudio/velvet-arcana-hero-portrait-20260403-b@r1`
  - Selected portrait hero ref: `asset:autonomoustudio/velvet-arcana-hero-portrait-20260403-a@r1`
  - Prompt: `Create a matched 9:16 portrait hero for Velvet Arcana from the approved landscape hero reference. Keep the same candlelit velvet table, tarot-like omen cards, glowing reserve charm, and elegant centered title style. Render 'Velvet Arcana' clearly in the middle band of the image and compose the scene so the active card, reserve glow, and reading atmosphere stay legible on mobile. Match the real game's burgundy, brass, ivory, and cyan palette. No UI, no border, no watermark, no extra copy.`
- Icon generation
  - CLI options: `playdrop ai create image ... --asset-name velvet-arcana-icon-20260403-a --asset-display-name "Velvet Arcana Icon A" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-landscape-d.jpg --image2 /Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/hero-portrait-a.jpg --ratio 1:1 --resolution 1024x1024 --json`
  - Alternate reviewed candidate: `asset:autonomoustudio/velvet-arcana-icon-20260403-b@r1`
  - Selected icon ref: `asset:autonomoustudio/velvet-arcana-icon-20260403-a@r1`
  - Prompt: `Create a premium full-bleed square icon for Velvet Arcana using the approved hero art as style reference. Fill the frame with a glowing cyan reserve charm holding a single omen card over a candlelit burgundy velvet table, with ivory cards and warm brass light carried to every edge. The icon must feel like one continuous scene and stay readable at small size. No text, no watermark, no white matte, no empty border, no circular badge, no framed emblem.`

## Family Review

- The shipped landscape and portrait heroes clearly belong to the same family: the same velvet table, brass candlelight, glowing reserve plate, ivory omen cards, and centered `VELVET ARCANA` title band.
- The final icon reads as the same product at small size without turning into a sticker, medallion, or empty-matte badge. The reserve charm and blade card stay central while the surrounding cards and candles keep the square full-bleed.
- Compared against the rejected candidates, the shipped family is the most honest to the real build. It sells the candlelit reading-table fantasy without promising more environmental detail or UI complexity than players actually get.

## Evidence

- Icon size confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/icon.png` (`1024x1024`)
- Landscape hero size confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/hero-landscape.png` (`1600x900`)
- Portrait hero size confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/hero-portrait.png` (`1080x1920`)
- Landscape screenshot confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/velvet-arcana_1280x720-screenshot-1.png` (`1280x720`)
- Portrait screenshots confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/velvet-arcana_720x1280-screenshot-1.png` and `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/velvet-arcana_720x1280-screenshot-2.png` (`720x1280`)
- Gameplay video confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/velvet-arcana_1280x720-recording.mp4` (`1280x720`, `12.0s`, `25fps`)
- Video review frames confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/video-frames-check/frame-01.png`, `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/video-frames-check/frame-02.png`, and `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/video-frames-check/frame-03.png`
- Listing copy wired: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/copy.md`
- X thread draft wired: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/X_THREAD.md`
- Final metadata wired: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/catalogue.json`
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`
- AI job log captured: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/ai-art/jobs-image-20260403.json`
- The same listing family is the one now live on PlayDrop under version `1.0.2`.

## Verdict

PASS

## Required Fixes If Failed

- None
