# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Refreshed the `1.0.2` listing family with matched portrait and landscape heroes, a full-bleed square icon, gameplay backdrops derived from the same greenhouse art family, updated copy for the ghosted charge-ring preview, and new real-build screenshots plus a landscape gameplay MP4.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_720x1280-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-landscape-ai-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-portrait-ai-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/icon-ai-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-landscape-1.0.2-fallback.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-portrait-1.0.2-fallback-portraitbase.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/icon-1.0.2-fallback.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/backdrop-landscape-1.0.2-fallback.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/backdrop-portrait-1.0.2-fallback.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/tools/listing-art/compositor.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/tools/listing-art/icon-compositor.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/tools/listing-art/backdrop-compositor.html`
- `playdrop ai jobs browse --json --limit 12`

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
- [x] The listing description explains how to play, including the core input, what clears, the main fail pressure or objective, and the exact match rule if players could misread it.
- [x] The icon is bespoke, simple, and readable at small size.
- [x] The hero art is bespoke, visually strong, and not a screenshot with filler text dumped on top.
- [x] Listing art was explored through PlayDrop browse/search/detail and AI image generation, with at least 3 candidates considered before final selection.
- [x] If the final art is hand-authored, the gate notes explain why it beat the generated/catalog options.
- [x] Marketing art uses minimal text and only when it genuinely improves the asset.
- [x] Screenshots are taken from the real build and show real gameplay moments.
- [x] A real gameplay video exists, is reviewed, and starts on actual gameplay.
- [x] The X-first video asset is a single landscape gameplay MP4 that is strong enough to post publicly.
- [x] Listing media matches the current shipped build and is good enough to post on X.

## Feedback Applied Before PASS

- The original `1.0.0` listing art skipped the PlayDrop exploration and AI generation path entirely. The `1.0.2` pass kept that exploration requirement and then pushed further on the family match, centered title treatment, and full-bleed icon rule.
- Fresh `1.0.2` PlayDrop AI generation attempts all failed with temporary `503 high demand` metadata-generation errors, so the shipped heroes, icon, and gameplay backdrops were rebuilt from the approved PlayDrop-generated `1.0.1` base art and documented as a fallback instead of pretending they were brand-new AI outputs.
- The original media also showed the old thorn-era build. I replaced every screenshot and the gameplay video with deterministic captures from the `1.0.2` build featuring the painted greenhouse backdrop, strike HUD, and ghosted charge-ring preview.
- The final listing copy now explains the exact match rule, the bouquet clear behavior, the global 3-strike fail condition, and the meaning of the next preview ring.

## Prompt Log And Reference Chain

- Failed PlayDrop AI job `latchbloom-hero-landscape-1-0-2-a` (`16:9`, `2026-03-26T15:07:28Z`)
  - Prompt: `Premium fantasy greenhouse puzzle game key art. Keep the same lush teal glasshouse, brass mechanics, glowing rose iris sun mint palette, dreamy moonlit atmosphere, and centered cabinet silhouette as the reference. Recompose it as a landscape hero image with a strong centered composition and a clean central band for the title treatment. Rich flowers and glass details around the cabinet, but no UI, no screenshots, no readable text, no logos, no watermarks.`
- Failed PlayDrop AI job `latchbloom-icon-1-0-2-a` (`1:1`, `2026-03-26T15:07:28Z`)
  - Prompt: `Premium full-bleed square game icon in the same teal brass floral glasshouse style as the reference. Center an ornate brass latch-flower emblem that fills the square, with edge-to-edge background detail and glow. No white matte, no empty border, no circular badge on a flat field, no text, no watermarks.`
- Failed PlayDrop AI job `latchbloom-hero-landscape-1-0-2-b` (`16:9`, `2026-03-26T15:21:39Z`)
  - Prompt: `Cinematic premium key art for a greenhouse routing arcade game. Ornate glasshouse interior at twilight with teal glass, brass framing, luminous blossom orbs, and subtle golden latch motifs. Strong centered composition with a clean middle band reserved for the game title overlay. Cohesive painterly finish, high contrast focal lighting, no text, no watermark.`
- Visual reference pool used for the failed jobs and the fallback family review:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-landscape-ai-a.jpg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-portrait-ai-a.jpg`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/icon-ai-a.jpg`
- Final shipped fallback outputs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-landscape-1.0.2-fallback.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-portrait-1.0.2-fallback-portraitbase.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/icon-1.0.2-fallback.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/backdrop-landscape-1.0.2-fallback.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/backdrop-portrait-1.0.2-fallback.png`

## Family Review

- The shipped landscape and portrait heroes share the same teal-glass greenhouse, brass routing cabinet, floral palette, and centered `Latchbloom` title treatment.
- The shipped icon is a true full-bleed square with background detail to the edges. It no longer reads like a badge floating on a white matte.
- The gameplay backdrop family now reuses that same greenhouse language, so the live game no longer materially undersells the listing art.
- The fallback compositor route beat the stale `1.0.1` assets because it enforced the centered-title, full-bleed, and same-family constraints immediately while the fresh PlayDrop AI jobs were failing upstream.

## Evidence

- Icon size confirmed: `1024x1024`
- Portrait hero size confirmed: `1080x1920`
- Landscape hero size confirmed: `1600x900`
- Portrait screenshots confirmed: `720x1280`
- Landscape screenshot confirmed: `1280x720`
- Gameplay video confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_1280x720-recording.mp4` (`1280x720`, `15.0s`, `20fps`)
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`
- Live listing proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-listing-1.0.2-desktop.png`

## Verdict

PASS

## Required Fixes If Failed

- None
