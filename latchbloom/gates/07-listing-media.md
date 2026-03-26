# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Replaced the old hand-authored `1.0.0` art with PlayDrop AI-generated icon and hero art, refreshed the listing copy for the strike-based ruleset, and captured new real-build screenshots plus a landscape gameplay MP4 for `1.0.1`.

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
- PlayDrop catalog exploration:
  - `playdrop search floral --kind asset --limit 5 --json`
  - `playdrop detail playdrop/asset/textured-fantasy-nature-flower --json`
- PlayDrop AI image generations:
  - `asset:playdrop/latchbloom-icon-ai-a@r1`
  - `asset:playdrop/latchbloom-hero-portrait-ai-a@r1`
  - `asset:playdrop/latchbloom-hero-landscape-ai-a@r1`

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

- The original `1.0.0` listing art skipped the PlayDrop exploration and AI generation path entirely. I corrected that by reviewing public floral asset references, generating a dedicated icon plus portrait and landscape heroes with PlayDrop AI, and selecting those outputs as the release art.
- The original media also showed the old thorn-era build. I replaced every screenshot and the gameplay video with deterministic captures from the `1.0.1` strike HUD and lane-aware next preview.
- The final listing copy now explains the exact match rule, the bouquet clear behavior, the global 3-strike fail condition, and the meaning of the next preview.

## Evidence

- Icon size confirmed: `1024x1024`
- Portrait hero size confirmed: `1080x1920`
- Landscape hero size confirmed: `1600x900`
- Portrait screenshots confirmed: `720x1280`
- Landscape screenshot confirmed: `1280x720`
- Gameplay video confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_1280x720-recording.mp4` (`1280x720`, `15.0s`, `20fps`)
- Validation passed after wiring final media: `npm run validate`, `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
