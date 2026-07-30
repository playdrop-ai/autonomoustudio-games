# Flighty Saucer video campaign v2 handoff

## Deliverables

### Portrait social short

- Final: `final/flighty-saucer-social-short-portrait-9x16-en-US.mp4`
- Poster: `final/flighty-saucer-social-short-portrait-9x16-en-US-poster.png`
- Source: `source-captures/portrait-final/listing.mp4`, 540x960, 60 fps, real PlayDrop preview capture.
- Source range: 0.0 to 9.5 seconds at 1x speed.
- Final: 1080x1920, 11.8 seconds, H.264 High, yuv420p, 60 fps, SAR 1:1.
- Audio: AAC, 48 kHz, stereo, -16.0 LUFS integrated, -4.8 dBTP.
- SHA-256: `d78436ca384654936b1f4ca3a28d10a1dbb5bafc3efc38e3e2b217b2938718ad`.

### Landscape trailer cut

- Final: `final/flighty-saucer-trailer-landscape-16x9-en-US.mp4`
- Poster: `final/flighty-saucer-trailer-landscape-16x9-en-US-poster.png`
- Source: `source-captures/landscape-final/listing.mp4`, 1280x720, 60 fps, real PlayDrop preview capture.
- Source range: 0.0 to 9.5 seconds at 1x speed.
- Final: 1920x1080, 11.8 seconds, H.264 High, yuv420p, 60 fps, SAR 1:1.
- Audio: AAC, 48 kHz, stereo, -16.0 LUFS integrated, -3.7 dBTP.
- SHA-256: `f34f13e7f9e054cc6e4e4a66afaf8bb248a704b2219fc6861b0d5cfd9f52e9fb`.

## Creative and truth contract

- Opening: protected ratio-native hero unchanged for 0.8 seconds.
- Gameplay: HUD-free real gameplay for 9.5 seconds.
- Closing: the same protected hero unchanged for 1.5 seconds.
- No captions, CTA, generated gameplay, crop, padding, bars, or nonuniform scaling.
- The approved generated hand is rendered by the live preview. Every cue activation is called by the same real thrust function that moves the saucer, so every upward bump has a matching visible tap.
- Gameplay audio was captured from the same run and stays at 1x speed.
- Both poster files are byte-identical copies of their protected hero masters.

## Review evidence

- Multi-format review: `review/final/campaign-review-composite.png`.
- Complete one-frame-per-second contact sheets: `review/final/*-contact-sheet-complete.png`.
- Full-gameplay ten-frame-per-second cue sheets: `review/final/*-contact-sheet-tap-cue.png`.
- First and final frames: `review/final/*-first-frame.png` and `review/final/*-final-frame.png`.
- Source capture reports: `source-captures/portrait-final/capture-report.json` and `source-captures/landscape-final/capture-report.json`, both with zero warnings.

## Validation

- `npm run validate`: passed.
- PlayDrop CLI 0.13.16 project validation: passed.
- PlayDrop marketing doctor: passed.
- Store capture report regenerated for DESKTOP, MOBILE_LANDSCAPE, and MOBILE_PORTRAIT with zero warnings.
- Final media verified with `ffprobe` and loudness analysis.
- No upload or publication was performed.
