# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Finalized the `1.0.0` `Overvolt` listing family with a PlayDrop-generated matched landscape hero, portrait hero, and full-bleed square icon, plus two real-build landscape screenshots, a trimmed landscape gameplay MP4, and player-facing listing copy wired into `catalogue.json`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `playdrop search car --json`
- `playdrop search battery --json`
- `playdrop detail autonomoustudio/app/drifthook --json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/overvolt_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/overvolt_1280x720-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/overvolt_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/hero-landscape-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/hero-landscape-b.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/hero-landscape-c.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/hero-portrait-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/icon-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/icon-b.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/jobs-image-20260405.json`

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
- [x] The listing description explains how to play, including the core input, what clears, the main fail pressure or objective, and the exact match rule if players could misread it.
- [x] The listing description and X copy describe the current shipped mechanics only; removed inputs, modes, or supported surfaces are gone.
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

- The first screenshot pool proved the lane but not every candidate was good enough for the store pack. Earlier gameplay QA stills left the player car too close to the edge or carried too much dead space, so I promoted the cleaner contact frame and a calmer mid-run frame into the final screenshot set.
- The first trimmed MP4 still opened on the start overlay rather than on live gameplay. I re-trimmed the capture to start at `2.0s`, rechecked the first frames, and kept only the cut that begins on actual play.
- Landscape candidate `A` failed because it invented an extra subtitle line, which broke the minimal-text rule immediately.
- Landscape candidate `B` rendered cleanly but pushed the title into a side plaque and leaned too cinematic relative to the real top-down tabletop read. I rejected it rather than letting the listing oversell the build.
- Landscape candidate `C` kept the strongest honest read of the real game: warm workshop tabletop, top-down toy-car duel, centered `OVERVOLT` title band, and no fake density. That became the approved family anchor.
- Icon candidate `A` failed because it drifted toward a more realistic badge-like car render. Icon `B` kept the chunky toy silhouette and full-bleed edge treatment, so `B` shipped.
- The project still had `listing/` inside `.playdropignore` from the starter scaffold. I removed that ignore entry before passing the gate so the publish bundle will actually contain the final store assets.
- No non-PlayDrop art fallback was needed.

## Prompt Log And Reference Chain

- Approved family anchor
  - CLI options: `--asset-name overvolt-hero-landscape-20260405-c --asset-display-name "Overvolt Hero Landscape C" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/overvolt_1280x720-screenshot-1.png --ratio 16:9 --resolution 1536x864 --timeout 300 --poll 2000 --json`
  - Alternate reviewed candidates:
    - `asset:autonomoustudio/overvolt-hero-landscape-20260405-a@r1`
    - `asset:autonomoustudio/overvolt-hero-landscape-20260405-b@r1`
  - Selected landscape hero ref: `asset:autonomoustudio/overvolt-hero-landscape-20260405-c@r1`
  - Prompt: `Storefront hero for Overvolt using the attached gameplay screenshot as a hard style reference. Keep the toy tabletop arena, one red RC battle car, one cyan rival car, scattered blue battery pickups, and the warm workshop desk atmosphere. Make the scene feel tense and energetic without inventing dense background detail or realistic car rendering. Render the exact title OVERVOLT large and centered in the main composition band. No HUD, no controller UI, no score boxes, no extra copy. Polished bespoke key art for the real shipped game.`
- Portrait sibling generation
  - CLI options: `--asset-name overvolt-hero-portrait-20260405-a --asset-display-name "Overvolt Hero Portrait A" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/hero-landscape-c.jpg --image2 /Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/overvolt_1280x720-screenshot-1.png --ratio 9:16 --resolution 1080x1920 --timeout 300 --poll 2000 --json`
  - Selected portrait hero ref: `asset:autonomoustudio/overvolt-hero-portrait-20260405-a@r1`
  - Prompt: `Portrait storefront hero for Overvolt derived from the approved landscape hero reference. Keep the same warm tabletop arena, red toy battle car, cyan rival car, blue battery charge, and restrained top-down toy-car style. Render the exact title OVERVOLT clearly in the central vertical safe band, matched to the approved landscape hero family. No HUD, no score panels, no joystick ring, no subtitle, no extra labels. Premium but honest hero art for the real shipped game.`
- Icon generation
  - CLI options: `--asset-name overvolt-icon-20260405-b --asset-display-name "Overvolt Icon B" --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/hero-landscape-c.jpg --image2 /Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/hero-portrait-a.jpg --ratio 1:1 --resolution 1024x1024 --timeout 300 --poll 2000 --json`
  - Rejected icon candidate: `asset:autonomoustudio/overvolt-icon-20260405-a@r1`
  - Selected icon ref: `asset:autonomoustudio/overvolt-icon-20260405-b@r1`
  - Prompt: `Full-bleed square icon for Overvolt derived from the approved hero family. Show one blocky top-down toy battle car on the warm tabletop with blue electric charge spilling around it. Keep the shape simple and clearly toy-like, matching the real game's chunky car silhouette. No windshield realism, no detailed interior, no realistic headlights, no badge, no medallion, no sticker, no rounded-square inset, no frame, no border, no matte, no text, no HUD. The scene must carry all the way to the edges of the square.`

## Family Review

- The shipped landscape and portrait heroes clearly belong to the same family: the same warm tabletop palette, the same restrained top-down toy-car silhouettes, the same blue charge accents, and the same centered `OVERVOLT` title band.
- The final icon reads as the same product at small size without collapsing into a framed badge. One chunky car silhouette and the electric spill stay central while the square remains edge to edge.
- Compared against the rejected candidates, the shipped family is the most honest to the actual build. It improves the click value without promising richer camera angles, denser scene dressing, or more realistic car rendering than the player will really get.

## Evidence

- Icon size confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/icon.png` (`1024x1024`)
- Landscape hero size confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/hero-landscape.png` (`1600x900`)
- Portrait hero size confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/hero-portrait.png` (`1080x1920`)
- Landscape screenshots confirmed:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/overvolt_1280x720-screenshot-1.png` (`1280x720`)
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/overvolt_1280x720-screenshot-2.png` (`1280x720`)
- Gameplay video confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/overvolt_1280x720-recording.mp4` (`1280x720`, `6.52s`, `25fps`)
- Listing copy wired: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/copy.md`
- Final metadata wired: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/catalogue.json`
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate overvolt`
- AI job log captured: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/ai-art/jobs-image-20260405.json`

## Verdict

PASS

## Required Fixes If Failed

- None
