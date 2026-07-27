# 07-listing-media - Listing Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Added a bespoke icon and hero pair, four approved marketing screenshots per orientation, and one clean gameplay video per orientation.
- Kept PlayDrop listing media separate from App Store, AppLovin, and social-media exports.

## Inputs Reviewed

- `catalogue.json`
- `marketing/README.md`
- `marketing/playdrop/icon.png`
- `marketing/playdrop/hero/hero-portrait.png`
- `marketing/playdrop/hero/hero-landscape.png`
- `marketing/playdrop/screenshots/portrait/`
- `marketing/playdrop/screenshots/landscape/`
- `marketing/playdrop/capture/portrait.mp4`
- `marketing/playdrop/capture/landscape.mp4`

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

- Marketing exports were separated by destination so channel-specific files do not enter the hosted game package.
- Legacy listing experiments were removed after the approved final assets replaced them.

## Evidence

- Listing block in `catalogue.json`
- Icon: `1024x1024`
- PlayDrop heroes: portrait `576x1024`, landscape `1024x576`
- PlayDrop screenshots: four portrait `1080x1920` and four landscape `1920x1080`
- PlayDrop gameplay videos: portrait `720x1280` and landscape `1280x720`

## Verdict

PASS

## Required Fixes If Failed

- None
