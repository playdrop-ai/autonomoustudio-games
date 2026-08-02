# Block Burst marketing

Status: complete review package prepared on August 2, 2026. No upload,
publication, registration, or paid spend is authorized by this file.

## Campaign

The launch story is:

1. `DRAG. DROP. BURST.`
2. `PLAN EVERY PIECE`
3. `CHAIN BIG COMBOS`
4. `BEAT YOUR BEST`

The complete strategy, truth brief, copy, research, technical inventory, and
director handoff live under `assets/marketing/`.

## Protected identity

These files and fields remain unchanged:

- `assets/marketing/playdrop/icon.png`
- `assets/marketing/playdrop/hero-portrait.png`
- `assets/marketing/playdrop/hero-landscape.png`
- title: `Block Burst`
- subtitle: `Build lines. Burst blocks. Chase combos.`

## PlayDrop listing

- four portrait screenshots: `assets/marketing/playdrop/screenshots/portrait/`
- four landscape screenshots: `assets/marketing/playdrop/screenshots/landscape/`
- real portrait listing video: `assets/marketing/playdrop/capture/portrait-listing.mp4`
- real landscape listing video: `assets/marketing/playdrop/capture/landscape-listing.mp4`

The listing videos are caption-free shipped gameplay with SFX. Captioned edits
are reserved for paid and social channels. Portrait is a refreshed `1.0.7`
continuous five-move, 12-second session that shows the new color-matched
physics debris; landscape is one continuous seven-move, 17-second session.
Both are 60 fps and play at 1x without gameplay cuts, resets, or repeated
footage.

## AppLovin

- 12-second continuous 1080x1920 paid video: `assets/marketing/applovin-interstitial/portrait/video.mp4`
- separate protected 1080x1920 end card: `assets/marketing/applovin-interstitial/portrait/end-card.png`
- handoff: `assets/marketing/applovin-interstitial/HANDOFF.md`

## Social

The package under `assets/marketing/social-media/` contains native 9:16, 16:9,
3:4, and 2:3 videos; five-card Instagram and Pinterest still sets; Reel cover;
YouTube thumbnail; complete channel copy; alt text; search tags; and UTMs.

TikTok, Instagram Reels and Stories, and YouTube Shorts share the captioned
12-second native portrait session. YouTube and X share the captioned 17-second
native landscape session, whose seventh move clears six lines and detonates two
bombs. The PlayDrop landscape listing removes only the captions; the portrait
listing is a newer native take from the debris-enabled `1.0.7` build.

## Source and validation policy

Store and social stills were produced with built-in ImageGen from protected
identity and real-gameplay references. Selected original generations and the
prompt record are retained in the game workspace.

All video gameplay was captured from the shipped preview hook at native
ratio-specific canvases with `sfx-only` audio. The revised portrait and
landscape masters use the PlayDrop CLI 0.14.5 native ScreenCaptureKit pipeline
at 60 fps, matching the proven Flighty Saucer process. No browser chrome, bars,
filler, nonuniform scaling, or blind gameplay crop is used.

Run `npm run validate` and the social package validator before any release. The
local PlayDrop CLI 0.14.5 is available from the PlayDrop workspace and confirms
the `playdrop (prod, ADMIN)` actor with the `autonomoustudio` workspace owner.
Production upload requires explicit owner approval.
