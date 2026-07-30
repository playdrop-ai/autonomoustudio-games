Original prompt: Implement a clean PlayDrop preview mode, recapture Flighty Saucer, and rebuild hero-led portrait and landscape marketing videos.

## Current task

- Hide persistent HUD in the normal preview phase without changing gameplay.
- Show the approved cartoon hand for every autoplay thrust, synchronized one-to-one with the real thrust calls.
- Validate the game, recapture native portrait and landscape footage, and rebuild the marketing videos with ratio-native hero opening and closing beats.

## Notes

- The canonical hero masters are `assets/marketing/playdrop/hero-portrait-9x16-v3.png` and `assets/marketing/playdrop/hero-landscape-16x9-v3.png`.
- Reuse the approved transparent hand asset from the existing social-video project.
- The capture report must be regenerated after the runtime changes.

## Implementation

- Added `assets/ui/preview-tap-hand.png` from the approved ImageGen hand.
- Embedded the approved hand into the single-file build so preview capture does not depend on an external asset request.
- Added a HUD-free preview presentation that keeps the game canvas unobstructed.
- Tied every hand press and radial-ring cue directly to the real preview thrust call that bumps the UFO upward.
- Added `render_game_to_text` and deterministic `advanceTime(ms)` hooks for the required browser test loop.

## Validation

- `npm run validate` passes after the preview implementation.
- PlayDrop CLI 0.13.16 validation passes with zero failed apps.
- Marketing capture doctor passes.
- The standard web-game Playwright client was run against the local app URL. Its top-level harness cannot provide the required PlayDrop iframe bridge, so the hosted PlayDrop checks and native recorder remain the authoritative browser validation path.
- `MOBILE_PORTRAIT`, `MOBILE_LANDSCAPE`, and `DESKTOP` hosted control tapes all pass.
- The first canonical preview capture proved the HUD-free composition, but recorder warmup consumed the original limited tap-hand cues. Those lead-ins became incorrect once the cue was changed from a three-hint sequence into a continuous input visualization, because they left early recorded bumps uncued. Removed all guide arming delays so every preview thrust from scene start has a matching tap.
- Exact-ratio campaign capture found that the new Web Audio export could return an empty short contract sample under a cold, loaded Chrome session. Reduced the MediaRecorder timeslice and added two explicit flushes with a 600 ms drain window before stopping so the contract and final capture receive real encoded audio.
- The successful audio capture adds its own short contract preroll before the real recording. Audio capture rearms the hand cue stream immediately, without suppressing any thrusts.
- User correction: the hand is not an onboarding hint. A tap causes every upward UFO bump, so the marketing preview must make the input legible for the entire run. Removed the three-cue cap and expanded cue review evidence across all 9.5 seconds of gameplay.
- Final exact-ratio sources: portrait 540x960 and landscape 1280x720, both 60 fps with synchronized 48 kHz stereo audio and zero recorder warnings.
- Final continuous-cue sources are `assets/marketing/video-social-v2/source-captures/portrait-final/listing.mp4` and `assets/marketing/video-social-v2/source-captures/landscape-final/listing.mp4`.
- Final edits use the protected ratio-native hero unchanged for 0.8 seconds, 9.5 seconds of real 1x gameplay, and the same hero unchanged for 1.5 seconds.
- Final outputs: 1080x1920 and 1920x1080, both 11.8 seconds, H.264/yuv420p/60 fps/SAR 1:1 with AAC stereo at exactly -16.0 LUFS.
- Full 10 fps cue sheets and complete 1 fps contact sheets confirm the cartoon hand and radial ring recur across the full gameplay segment in both orientations.
- Final PlayDrop validation and marketing doctor pass. No upload or publication was performed.
