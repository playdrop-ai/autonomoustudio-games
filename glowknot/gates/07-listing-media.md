# 07-listing-media - Listing And Store Media

## Instruction

- Create the final `Glowknot` listing pack and release copy from the real current build using the PlayDrop listing workflow, then verify that the media family is strong enough for publish and the draft X copy matches the shipped mechanics only.

## Output

- Captured the final real-build portrait screenshot, landscape screenshot, and trimmed landscape gameplay video from the shipped build.
- Explored five PlayDrop AI landscape-hero candidates before locking a final landscape winner, then generated the matched portrait sibling and square icon from the approved hero.
- Updated `catalogue.json`, `README.md`, and the draft X thread copy so the public-facing explanation matches the live v1 rules, controls, and supported surfaces.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `playdrop search lantern --json`
- `playdrop search bubble --json`
- `playdrop search puzzle --json`
- `playdrop search festival --json`
- `playdrop detail autonomoustudio/app/drifthook --json`
- `playdrop detail autonomoustudio/app/starfold --json`
- `playdrop detail kenneynl/asset-pack/puzzle-pack-2 --json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/glowknot_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/glowknot_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/glowknot_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/README.md`

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

- The first landscape batch proved the search space but did not yet pass:
  - `hero-b` invented the wrong title and extra tagline text.
  - `hero-a` kept HUD residue and gameplay counters.
  - `hero-c` had the strongest mood but pushed the title too low.
  - `hero-d` cleaned the HUD artifacts but still ignored the centered-title requirement.
- I redid the landscape pass from the strongest centered composition reference and locked `hero-e` as the final winner because it keeps the lantern canopy and silk-knot frame, removes gameplay clutter, and renders `GLOWKNOT` in a clear central band.
- The first landscape MP4 had a blank white lead-in frame. I patched `scripts/capture-media.mjs` to trim the lead-in, reran the capture, and rechecked the start frames before passing the gate.
- No non-PlayDrop art fallback was needed.

## Evidence

- Final listing assets:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/icon.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/hero-landscape.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/hero-portrait.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/glowknot_1280x720-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/glowknot_720x1280-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/glowknot_1280x720-recording.mp4`
- Video review proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/video-frames-check/frame-00.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/video-frames-check/frame-10.png`
  - `ffprobe` confirmed the final X-first video is `1280x720` H.264 and `12.000000` seconds.
- X draft copy:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/X_THREAD.md`
- PlayDrop AI record:
  - Candidate `glowknot-hero-a`:
    - CLI options: `--ratio 16:9 --resolution 1536x864 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/glowknot_1280x720-screenshot-1.png`
    - Prompt: `Marketing hero art for the mobile puzzle game Glowknot. Night festival alley, glowing paper lantern canopy, colored lantern orbs and severed silk anchor knots, cinematic warm-vs-cool contrast, polished bespoke key art, central title band with the exact game name GLOWKNOT clearly rendered in the center, minimal extra text, not a screenshot, premium game-store hero image.`
    - Generated asset ref: `asset:autonomoustudio/glowknot-hero-a@r1`
    - Result: centered title but failed because HUD/counter residue survived.
  - Candidate `glowknot-hero-b`:
    - CLI options: `--ratio 16:9 --resolution 1536x864 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/glowknot_1280x720-screenshot-1.png`
    - Prompt: `Marketing hero art for Glowknot. Stylized portrait of a lantern-bubble canopy, floating silk knots, deep blue festival night, premium bespoke storefront illustration, central game title with the exact text GLOWKNOT, minimal extra text, no screenshot framing, no HUD.`
    - Generated asset ref: `asset:autonomoustudio/glowknot-hero-b@r1`
    - Result: failed because it invented the wrong title/tagline family.
  - Candidate `glowknot-hero-c`:
    - CLI options: `--ratio 16:9 --resolution 1536x864 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/glowknot/listing/glowknot_1280x720-screenshot-1.png`
    - Prompt: `Premium storefront hero for Glowknot. Midnight sky, floating lantern canopy snapping free, glowing knot cords, rich negative space, crisp readable center title with the exact text GLOWKNOT, strong bespoke game-poster illustration derived from the provided gameplay frame, no UI, no screenshot framing, minimal supporting text.`
    - Generated asset ref: `asset:autonomoustudio/glowknot-hero-c@r1`
    - Result: strongest mood pass, but title landed too low for the centered-band requirement.
  - Candidate `glowknot-hero-d`:
    - CLI options: `--ratio 16:9 --resolution 1536x864 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/glowknot/tmp/hero-review/hero-c.jpg`
    - Prompt: `Premium storefront hero for Glowknot. Preserve the floating lantern canopy, luminous silk cords, rich midnight sky, and premium illustrated feel from the reference. Remove all HUD, counters, subtitles, lorem ipsum, and extra labels. Put the exact title GLOWKNOT large, clean, and clearly readable in the central horizontal composition band. Bespoke game-store hero art, no screenshot framing.`
    - Generated asset ref: `asset:autonomoustudio/glowknot-hero-d@r1`
    - Result: cleaner than `hero-c`, but still missed the centered-title requirement.
  - Final landscape winner `glowknot-hero-e`:
    - CLI options: `--ratio 16:9 --resolution 1536x864 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/glowknot/tmp/hero-review/hero-a.jpg`
    - Prompt: `Premium storefront hero for Glowknot. Use the reference composition with lantern canopies framing a central title band. Remove the score plaque, shot counter, crowd silhouettes, and any gameplay UI or labels. Keep the silk-knot framing around the title area. Render the exact title GLOWKNOT large and clearly readable in the center band. Bespoke polished key art for the real game, not a screenshot.`
    - Generated asset ref: `asset:autonomoustudio/glowknot-hero-e@r1`
    - Why it won: it kept the best lantern-canopy composition, removed all HUD residue, preserved the silk-knot identity, and finally placed the title squarely in the center band without overselling the build.
  - Final portrait sibling `glowknot-hero-portrait-a`:
    - CLI options: `--ratio 9:16 --resolution 1080x1920 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/glowknot/tmp/hero-review/hero-e.jpg`
    - Prompt: `Portrait storefront hero for Glowknot derived from the approved landscape hero reference. Keep the same floating lantern canopy, silk-knot title frame, midnight festival alley palette, and premium illustrated style. Render the exact title GLOWKNOT clearly in the central composition band. No HUD, no counters, no subtitles, no extra labels. Matched sibling hero for the same game family.`
    - Generated asset ref: `asset:autonomoustudio/glowknot-hero-portrait-a@r1`
    - Why it won: it keeps the same canopy, palette, and knot frame while moving the title into the portrait-safe center band.
  - Final icon `glowknot-icon-a`:
    - CLI options: `--ratio 1:1 --resolution 1024x1024 --visibility private --image1 /Users/oliviermichon/Documents/autonomoustudio-games/glowknot/tmp/hero-review/hero-e.jpg`
    - Prompt: `Square full-bleed app icon for Glowknot derived from the approved hero reference. Focus on one bold glowing lantern knot with rich warm-vs-cool light, crisp silhouette, premium painterly detail, and enough contrast to read at small sizes. No badge, no medallion, no border, no matte, no frame, no tiny text, no screenshot UI. Full-bleed square icon art for the real game.`
    - Generated asset ref: `asset:autonomoustudio/glowknot-icon-a@r1`
    - Why it won: it compresses the rope-knot identity into a readable full-bleed square without collapsing into a badge-on-matte layout.

## Verdict

PASS

## Required Fixes If Failed

- None
