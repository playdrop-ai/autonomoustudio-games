# 07-listing-media - Listing And Media

## Instruction

- Create the icon, hero, screenshots, value proposition, store copy, and real gameplay video for the shipped build.

## Output

- Real gameplay screenshots, a reviewed gameplay MP4, a matched portrait/landscape hero family, a full-bleed icon, store copy, and documented PlayDrop-first exploration with a justified local fallback.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/07-listing-media.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/screenshot-desktop-live.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/screenshot-portrait-live.png`
- PlayDrop browse/search/detail refs:
  - `autonomoustudio/asset/latchbloom-hero-portrait-20260326-center-b`
  - `playdrop/asset/minimalist-bright-red-square`
  - `playdrop/asset/coaster-theme-modern-theme-geometric-1x1`
  - search results for `minimal neon geometry icon`, `geometric cyan pink dark poster`, and `neon tunnel minimal`
- PlayDrop AI create image attempt using a real gameplay screenshot reference

## Checklist Results

- [x] The release name is original and used consistently across code, listing, README, and social.
- [x] The main value proposition is compelling and player-facing.
- [x] The listing description explains how to play, including the core input, what clears, the fail pressure, and the exact match rule.
- [x] The icon is bespoke, simple, and readable at small size.
- [x] The icon is full-bleed square art, not a badge or medallion on a flat matte.
- [x] The hero art is bespoke, visually strong, and not a screenshot with filler text dumped on top.
- [x] A strong real-build screenshot was captured before hero generation and used as the reference input for the primary PlayDrop AI hero attempt.
- [x] Portrait and landscape heroes read as one matched family when reviewed side by side.
- [x] The game name appears in the central composition band of both hero images.
- [x] The primary hero was attempted through PlayDrop AI with the centered game name explicitly requested.
- [x] The sibling hero was produced from the same approved fallback visual system so the family stays matched when the PlayDrop path failed.
- [x] The final icon was derived from the approved fallback hero family because the PlayDrop AI path failed.
- [x] Listing art was explored through PlayDrop browse/search/detail and AI generation, with at least three candidates considered before final selection.
- [x] The gate notes record the exact PlayDrop AI prompt, CLI options, reference input, failure mode, and final selection rationale.
- [x] The final art used a documented non-PlayDrop fallback because the PlayDrop AI path failed.
- [x] Marketing art uses minimal text and only where it improves the asset.
- [x] Marketing art does not materially oversell the live game’s visual quality.
- [x] Screenshots are taken from the real build and show real gameplay moments.
- [x] A real gameplay video exists, is reviewed, and starts on actual gameplay.
- [x] The X-first video asset is a single landscape gameplay MP4.
- [x] Listing media matches the current shipped build and is good enough to post on X.

## PlayDrop-First Exploration

- `playdrop browse --kind asset --json`
- `playdrop search minimal neon geometry icon --kind asset --json`
- `playdrop search geometric cyan pink dark poster --kind asset --json`
- `playdrop search neon tunnel minimal --kind asset --json`
- `playdrop detail autonomoustudio/asset/latchbloom-hero-portrait-20260326-center-b --json`
- `playdrop detail playdrop/asset/coaster-theme-modern-theme-geometric-1x1 --json`
- `playdrop detail playdrop/asset/minimalist-bright-red-square --json`

### AI Hero Attempt

Command attempted:

```bash
playdrop ai create image "Marketing hero for the game Keyfall. Minimalist 3D runway of falling tiles, cinematic but faithful to the real game, centered game name 'Keyfall' in the middle composition band, dark navy background, cyan and rose note accents, premium poster art, no extra text." \
  --image1 output/playwright/desktop-live.png \
  --ratio 16:9 \
  --resolution 1536x864 \
  --asset-name keyfall-hero-test \
  --asset-display-name "Keyfall Hero Test" \
  --asset-description "Test hero generation for Keyfall" \
  --visibility private \
  --timeout 90 \
  --poll 2000 \
  --json
```

Result:

- Failed with `AI create failed: Internal error encountered.`

## Feedback Applied Before PASS

- The PlayDrop AI image path failed on the referenced hero attempt, so I preserved the PlayDrop-first workflow evidence, then switched to a local SVG compositor rather than stalling release art.
- The first generated hero pass lost the title during `sips` rasterization because the text used a filtered lockup. I replaced that with a plain two-layer text treatment so the game name renders reliably in both hero images.
- Final local fallback family:
  - landscape candidate chosen: `hero-landscape-b`
  - portrait candidate chosen: `hero-portrait-b`
  - icon chosen: `icon-b`
- Rejected candidates:
  - `hero-landscape-a`: too sparse and not strong enough for the primary hero
  - `hero-landscape-c`: composition felt more like a concept sheet than a store hero
  - `icon-a`: readable but too calm
  - `icon-c`: clear but less tied to the hero family

## Evidence

- Store copy:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/store-copy.md`
- Real screenshots:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/screenshot-desktop-live.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/screenshot-portrait-live.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/screenshot-portrait-gameover.png`
- Final art:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/hero-landscape-final.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/hero-portrait-final.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/icon-final.png`
- Gameplay video:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/keyfall-gameplay.mp4`
- Repo cleanup note:
  - Intermediate candidate exports and the one-off fallback art renderer were removed from the public repo after final selection so only the shipped assets remain tracked.

## Verdict

PASS

## Required Fixes If Failed

- None
