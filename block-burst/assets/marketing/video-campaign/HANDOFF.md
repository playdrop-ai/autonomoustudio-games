# Block Burst landscape trailer handoff

Status: revised for owner review. Do not upload or publish.

## Final

- File: `../social-media/trailer/landscape-16x9.mp4`
- Destinations: YouTube trailer and X launch video
- Export: 1920x1080, H.264 High, 60 fps, yuv420p, SAR 1:1, AAC LC 48 kHz
  stereo, exactly 17 seconds
- Audio: synchronized shipped-game SFX at 1x, -0.9 dBFS peak
- Source: `source-captures/landscape-continuous-native-v1/desktop-listing.mp4`
- Geometry: native 16:9 source, uniform scale only, no crop, bars, filler, or
  nonuniform stretch

## Continuous gameplay story

| Phase | Visible proof |
| --- | --- |
| Opening | Legal horizontal placement completes a line and triggers the opening bomb inside the first three seconds. |
| Board building | A repair piece and compact corner placements preserve the same board while the normal tray refreshes. |
| Mid-session payoff | A legal single-cell placement completes and clears a row; the next horizontal piece repairs the support needed for the finale. |
| Finale | A final red 3x3 piece completes three rows and three columns, detonating two existing bombs. The move commits at approximately 14.5 seconds. |

All seven placements occur at 1x in one uninterrupted native capture. There is
no gameplay cut, board reset, repeated footage, hero insert, or time warp. The
caption-free PlayDrop landscape listing uses the same first 17 seconds.

## Captions

The edit uses the approved transparent raster plates without retyping:

- `DRAG. DROP. BURST.` at 0.10 seconds
- `PLAN EVERY PIECE` at 3.10 seconds
- `CHAIN BIG COMBOS` at 6.65 seconds
- `BEAT YOUR BEST` at 13.20 seconds

All plates sit in the lower-right quiet area, clear of the board and important
HUD. Review evidence is in `review/landscape-native-v1-seconds.png`,
`review/landscape-native-v1-finale.png`, and
`review/landscape-trailer-contact.png`.

## Native capture evidence

- Pipeline: PlayDrop CLI 0.14.5 native macOS ScreenCaptureKit.
- Source: 1280x720, 60 fps, H.264/AAC, 19.033 seconds.
- Capture report: `source-captures/landscape-continuous-native-v1/capture-report.json`.
- Result: DESKTOP, MOBILE_LANDSCAPE, and MOBILE_PORTRAIT all passed at
  60 fps with synchronized audio and zero warnings.
- Final cadence: 1,020 frames with zero consecutive duplicates.
