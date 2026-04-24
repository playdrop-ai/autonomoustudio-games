# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Added bespoke icon and hero art, real gameplay screenshots, a real portrait gameplay MP4, and wired the listing block into `catalogue.json`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- PlayDrop docs for icon, hero, screenshots, and video recording
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/listing/marketing.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/listing/starfold_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/listing/starfold_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/listing/starfold_720x1280-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/listing/starfold_720x1280-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/catalogue.json`

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
- [x] The icon is bespoke, simple, and readable at small size.
- [x] The hero art is bespoke, visually strong, and not a screenshot with filler text dumped on top.
- [x] Marketing art uses minimal text and only when it genuinely improves the asset.
- [x] Screenshots are taken from the real build and show real gameplay moments.
- [x] A real gameplay video exists, is reviewed, and starts on actual gameplay.
- [x] Listing media matches the current shipped build and is good enough to post on X.

## Feedback Applied Before PASS

- The first local capture path only produced raw gameplay screenshots. I added a separate bespoke `marketing.html` composition so the icon and heroes are purpose-built marketing assets instead of cropped runtime frames.
- Playwright video capture produced WebM by default. I converted the portrait capture to MP4 with FFmpeg so the listing media conforms to the PlayDrop video requirement.

## Evidence

- Listing block in `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/catalogue.json`
- Media sizes confirmed: icon `1024x1024`, portrait hero `720x1280`, landscape hero `1280x720`, portrait screenshots `720x1280`, landscape screenshot `1280x720`
- Gameplay video confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/listing/starfold_720x1280-recording.mp4` (`720x1280`, `14.52s`)

## Verdict

PASS

## Required Fixes If Failed

- None
