# Block Burst AppLovin portrait handoff

Status: prepared for owner and marketing-director review. Not uploaded,
registered, funded, or launched.

## Review deliverables

- Video: `portrait/video.mp4`
- Separate end card: `portrait/end-card.png`
- Poster: `portrait/poster.png`
- Paid copy and tracked destination: `../channel-copy.md`

## Technical specification

- Video: H.264 High, 1080x1920, 30 fps, yuv420p, SAR 1:1.
- Audio: synchronized shipped-game SFX, AAC LC, 48 kHz, stereo, peak -1.0 dBFS.
- Duration: exactly 12.000 seconds and 360 frames.
- Separate end card: PNG, 1080x1920.
- The end card is a byte-identical copy of the protected portrait hero.

AppLovin specifications were rechecked on August 2, 2026 against the official
creative-specifications page: portrait 9:16; MP4 or MOV; maximum 60 seconds;
maximum 1 GB; and portrait image end cards in GIF, JPEG, or PNG.
The official page is:
https://support.applovin.com/en/growth/promoting-your-apps/welcome-to-applovin/creative-specs-and-guidelines

## Creative structure

1. A legal yellow three-block drag opens immediately and clears the bomb row
   inside the first two seconds.
2. A teal three-block placement repairs the same board after that clear.
3. A green corner piece adds a compact top-left planning move.
4. The tray refreshes normally after the third placement, then a purple 2x2
   piece fills the top-right corner. The board is never reset or replaced.
5. The final legal 3x3 placement commits at approximately 9.8 seconds, completes
   three rows and three columns, detonates two shipped bombs, and leaves just
   over two seconds for the full payoff and end hold.
6. Sound-off captions: `DRAG. DROP. BURST.`, `PLAN EVERY PIECE`,
   `CHAIN BIG COMBOS`, and `BEAT YOUR BEST`.
7. AppLovin presents the separate protected hero end card and native CTA.

## Continuous-take policy

The complete 12-second video comes from seconds 0.00-12.00 of one native
portrait gameplay capture at 1x speed. There are no gameplay cuts, board swaps,
hero inserts, time warps, repeated moves, or session resets.

The deterministic listing state is allowed by the marketing-video workflow for
a reproducible real payoff. It remains playable and representative: all five
pieces are shipped shapes, every placement passes the normal placement check,
the normal clear resolver counts the six completed lines, and the normal
special resolver detonates the two bombs. No rule, reward, difficulty, score
formula, or resulting gameplay is changed.

## Native capture method

- Source: `../video-campaign/source-captures/applovin-continuous-native-v8/desktop-listing.mp4`
- Source format: 540x960, 60 fps, H.264/AAC, 12.867 seconds.
- Recorder: PlayDrop CLI 0.14.5 native macOS ScreenCaptureKit pipeline, matching
  the proven Flighty Saucer workflow.
- The in-app WebAudio recorder emits 100 ms chunks, performs the same explicit
  500 ms + 100 ms flush/drain used by Flighty Saucer, and keeps an inaudible
  capture clock so quiet holds retain their full real duration.
- Capture report: `../video-campaign/source-captures/applovin-continuous-native-v8/capture-report.json`
- Report result: all three captured surfaces passed at 60 fps with synchronized
  audio and zero warnings.

The app experience appears on frame one. The video contains no fake CTA,
install badge, rating, reward, device frame, browser chrome, or network UI.

## Review evidence

- `../video-campaign/review/applovin-portrait-contact.png`
- `../video-campaign/review/applovin-interaction-contact.png`
- `portrait/poster.png` at 10.10 seconds, inside the six-line/two-bomb payoff
- `../video-campaign/source-captures/applovin-continuous-native-v8/capture-report.json`

Checksums and final file sizes are recorded in `../asset-manifest.json`.
