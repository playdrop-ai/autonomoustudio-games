# Flighty Saucer AppLovin portrait handoff

## Review deliverables

- Video: `portrait/video.mp4`
- End card: `portrait/end-card.png`
- Poster: `portrait/poster.png`

## Technical validation

- Video: H.264 High, 1080x1920, 30 fps, yuv420p, SAR 1:1.
- Audio: AAC LC, 48 kHz, stereo.
- Duration: 8.995 seconds.
- Video size: 6,863,348 bytes.
- Video SHA-256:
  `0d8a02e4fa6a18df49c00500f56069b353f9374ae82abf0e856ed6423d9d16a7`.
- End card: PNG, 1080x1920, 558,971 bytes.
- End-card SHA-256:
  `bc374d43075f406a5cd52ddeb42942bd65d07b6b4509915fa50c8fe414cc0edb`.
- The end-card checksum matches the protected portrait hero exactly.
- Official AppLovin specifications rechecked on July 31, 2026: portrait 9:16
  MP4 or MOV, no longer than 60 seconds, no larger than 1 GB; portrait end-card
  PNG is accepted at this size.

## Creative structure

1. Protected hero identity for 0.6 seconds, fading into gameplay over the final
   0.15 seconds.
2. Casual Dawn Meadow gameplay from source 0.0 to 3.4 seconds at 1x.
3. Advanced desert gameplay from the same run, source 20.65 to 24.9 seconds at
   1x.
4. Real crash from source 24.9 to 25.35 seconds at 0.4587x with synchronized
   audio.
5. AppLovin presents the separate protected hero end card and native CTA.

The app experience appears within the first second. The first five seconds
contain the identity transition, multiple real taps, and the casual-to-advanced
environment shift. Every thrust uses the runtime cartoon hand synchronized to
the real player input. The story remains understandable while muted.

## Protected art and ImageGen

No new ImageGen prompt was run. The previously approved ImageGen portrait hero
is protected identity art and is copied byte-for-byte as the end card. This
follows the marketing-production rule against regenerating, retouching,
decorating, or retyping approved identity art.

## Review evidence

- `review/first-frame.png`
- `review/first-action.png`
- `review/advanced-action.png`
- `review/crash.png`
- `review/final-frame.png`
- `review/complete-contact-sheet.png`
- `review/interaction-contact-sheet.png`

The package has not been uploaded, registered, funded, or launched.
