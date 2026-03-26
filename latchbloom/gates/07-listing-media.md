# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Added bespoke icon and hero art, high-signal real gameplay screenshots, a landscape gameplay MP4 for listing and X, and wired the final listing block into `catalogue.json`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/LISTING_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/marketing.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/icon.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/hero-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/hero-landscape.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_720x1280-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_720x1280-screenshot-2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_1280x720-screenshot-1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_1280x720-recording.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/catalogue.json`

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
- [x] The listing description explains how to play, including the core input, what clears, the main fail pressure or objective, and the exact match rule if players could misread it.
- [x] The icon is bespoke, simple, and readable at small size.
- [x] The hero art is bespoke, visually strong, and not a screenshot with filler text dumped on top.
- [x] Marketing art uses minimal text and only when it genuinely improves the asset.
- [x] Screenshots are taken from the real build and show real gameplay moments.
- [x] A real gameplay video exists, is reviewed, and starts on actual gameplay.
- [x] The X-first video asset is a single landscape gameplay MP4 that is strong enough to post publicly.
- [x] Listing media matches the current shipped build and is good enough to post on X.

## Feedback Applied Before PASS

- The first portrait screenshot set and the original landscape recording included weak `score 0` moments. I replaced them with deterministic real-build captures from a seeded autoplay run so the public media shows actual high-score routing play.
- The first Playwright CLI video capture path defaulted to a low-resolution landscape recording. I switched to browser-context video recording and re-encoded the result to a `1280x720` MP4 so the listing and X-first asset are release quality.

## Evidence

- Listing block added to `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/catalogue.json`
- Media sizes confirmed: icon `1024x1024`, portrait hero `1080x1920`, landscape hero `1600x900`, portrait screenshots `720x1280`, landscape screenshot `1280x720`
- Gameplay video confirmed: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/latchbloom_1280x720-recording.mp4` (`1280x720`, `19.08s`)
- Validation passed after wiring the listing block: `npm run validate`, `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
