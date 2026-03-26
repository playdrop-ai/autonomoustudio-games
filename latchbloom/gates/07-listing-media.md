# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Refreshed the `1.0.3` listing family with real prod AI-generated matched heroes, a real prod AI-generated full-bleed square icon, dedicated gameplay backdrop plates generated from that same family, updated real-build screenshots, and a refreshed landscape gameplay MP4 from the corrected build.

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
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-landscape-20260326-retry-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-portrait-20260326-retry-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/icon-20260326-retry-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/backdrop-landscape-20260326-b.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/backdrop-portrait-20260326-c.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/hero-portrait-ai-a.jpg`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/ai-art/icon-ai-a.jpg`
- `playdrop ai jobs browse --type image --limit 20 --json`

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

- The original `1.0.0` listing art skipped the PlayDrop exploration and AI generation path entirely, and the shipped `1.0.2` patch still relied on documented fallback composites because the prod AI image path was unstable. The corrective `1.0.3` pass only closed once fresh prod generation succeeded and the fallback assets were fully replaced.
- I generated the landscape hero first, approved it as the family anchor, then used that image plus the portrait gameplay surface as the reference chain for the portrait hero. The icon was then regenerated from the same family so the title treatment, greenhouse lighting, brass cabinet language, and floral palette all stay coherent.
- The gameplay backdrop plates were generated as separate “environment only” assets from that same family, then the live board overlays were aligned on top. The original media also showed the old fallback art path, so I replaced every screenshot and the gameplay video with captures from the corrected `1.0.3` build featuring the approved AI backdrop family.
- The final listing copy now explains the exact match rule, the bouquet clear behavior, the global 3-strike fail condition, and the meaning of the next preview ring.

## Prompt Log And Reference Chain

- Approved family anchor
  - Selected landscape hero ref: `asset:autonomoustudio/latchbloom-hero-landscape-20260326-retry-a@r1`
  - Prompt: `Premium key art for Latchbloom, an ornate greenhouse routing arcade game. Use the attached gameplay reference for the brass routing cabinet silhouette, teal glasshouse framing, blossom palette, and dreamy moonlit atmosphere. Compose a polished 16:9 landscape hero with a strong centered composition and a centered lower title treatment reading "Latchbloom". No UI, no screenshot framing, no watermark.`
- Portrait sibling generation
  - Selected portrait hero ref: `asset:autonomoustudio/latchbloom-hero-portrait-20260326-retry-a@r1`
  - Alternate portrait candidate reviewed: `asset:autonomoustudio/latchbloom-hero-portrait-20260326-retry-b@r1`
  - Prompt: `Reframe the approved Latchbloom landscape hero into a 9:16 portrait hero while preserving the same greenhouse, brass cabinet, floral palette, lighting, and centered title treatment. Keep the product looking like the same art family, only re-composed for portrait. No UI, no watermark.`
- Icon generation
  - Selected icon ref: `asset:autonomoustudio/latchbloom-icon-20260326-retry-a@r1`
  - Alternate icon candidate reviewed: `asset:autonomoustudio/latchbloom-icon-20260326-retry-b@r1`
  - Prompt: `Create a premium full-bleed square icon for Latchbloom using the approved hero as style reference. Center a readable ornate brass latch-flower emblem that fills the square, with rich teal glasshouse background detail to the edges. No white matte, no empty border, no floating circular badge, no text, no watermark.`
- Gameplay backdrop generation
  - Selected landscape backdrop ref: `asset:autonomoustudio/latchbloom-backdrop-landscape-20260326-b@r1`
  - Selected portrait backdrop ref: `asset:autonomoustudio/latchbloom-backdrop-portrait-20260326-c@r1`
  - Rejected portrait backdrop candidate: `asset:autonomoustudio/latchbloom-backdrop-portrait-20260326-a@r1` because it introduced too much fake gameplay structure inside the play area
  - Landscape prompt: `Using the approved Latchbloom hero as style reference, create a 16:9 gameplay backdrop that contains only the greenhouse frame, glass, cabinet border, and interior lighting needed for the live board overlay. No title, no UI, no pipes, no latches, no blossoms, no vases, no gameplay tokens, no watermark.`
  - Portrait prompt: `Using the approved Latchbloom hero as style reference, create a 9:16 gameplay backdrop that contains only the greenhouse frame, glass, cabinet border, and interior lighting needed for the live board overlay. Keep the center play window clean and uninterrupted. No title, no UI, no pipes, no latches, no blossoms, no vases, no gameplay tokens, no watermark.`

## Family Review

- The shipped landscape and portrait heroes now clearly belong to the same family: same greenhouse shell, same brass routing cabinet, same blossom palette, and a centered `Latchbloom` title treatment in both aspect ratios.
- The shipped icon is a true full-bleed square with background detail to the edges. It no longer reads like a badge floating inside a white matte or empty border field.
- The gameplay backdrop family now reuses that same greenhouse language with environment-only art, so the live game no longer materially undersells the listing art.
- Compared against the earlier fallback assets, the final `1.0.3` family wins on consistency, title placement, and credibility. It now looks like one intentional product rather than a mixed chain of recovered assets.

## Evidence

- Icon size confirmed: `1024x1024`
- Portrait hero size confirmed: `1080x1920`
- Landscape hero size confirmed: `1600x900`
- Portrait screenshots confirmed: `720x1280`
- Landscape screenshot confirmed: `1280x720`
- Gameplay video confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_1280x720-recording.mp4` (`1280x720`, `15.0s`, `20fps`)
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`
- Local landscape screenshot proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_1280x720-screenshot-1.png`
- Local portrait screenshot proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_720x1280-screenshot-1.png`

## Verdict

PASS

## Required Fixes If Failed

- None
