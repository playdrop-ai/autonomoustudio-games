# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero family, screenshots, gameplay video, and store copy for the shipped `Shardspan` build, then only pass if the final media is strong enough for both the live listing and the X release thread.

## Output

- Replaced the starter-kit listing media with bespoke `Shardspan` art, real gameplay screenshots, a real landscape gameplay MP4, and player-facing description copy that explains the rule set in plain language.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/provenance.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/shardspan_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/shardspan_1280x720-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/shardspan_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/icon.png`
- `playdrop browse --kind app --app-type game --limit 8`
- `playdrop browse --kind asset-pack --limit 8`

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
- [x] The listing description explains how to play, including the core input, what clears, the main fail pressure or objective, and the exact match rule if players could misread it.
- [x] The icon is bespoke, simple, and readable at small size.
- [x] The icon is full-bleed square art, not a badge or medallion sitting on a flat matte, empty border, or placeholder background.
- [x] The hero art is bespoke, visually strong, and not a screenshot with filler text dumped on top.
- [x] Portrait and landscape heroes read as one matched family when reviewed side by side.
- [x] The game name appears in the central composition band of both hero images.
- [x] Listing art was explored through PlayDrop browse/search/detail and AI image generation, with at least 3 candidates considered before final selection.
- [x] The gate notes record the exact AI prompts, reference inputs, generated asset refs, and why the final family won.
- [x] The final art is hand-authored, and the gate notes explain why it beat the generated/catalog options.
- [x] Marketing art uses minimal text and only when it genuinely improves the asset.
- [x] Marketing art does not materially oversell the live game’s visual quality.
- [x] Screenshots are taken from the real build and show real gameplay moments.
- [x] A real gameplay video exists, is reviewed, and starts on actual gameplay.
- [x] The X-first video asset is a single landscape gameplay MP4 that is strong enough to post publicly.
- [x] Listing media matches the current shipped build and is good enough to post on X.

## Feedback Applied Before PASS

- The first listing pass still leaned on starter-kit carryover media and empty capture frames. I replaced the inherited provenance, built a deterministic capture pipeline for real gameplay shots, and switched the published screenshot picks to the bridge approach and relay-hit beats where the runner, relay, and phase rule all read at a glance.
- I also rejected the AI-art route as final media. The Canva batch is recorded in `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/provenance.json`, but the direct thumbnail exports were not trustworthy in this environment, so I kept AI output at concept level and used a hand-authored family rendered from real capture frames instead.

## Evidence

- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/provenance.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/shardspan_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/shardspan_1280x720-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/shardspan_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/listing/icon.png`
- `npm run capture:listing`
- `npm run render:listing`

## Verdict

PASS

## Required Fixes If Failed

- None
