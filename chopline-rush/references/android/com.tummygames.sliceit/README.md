# Slice It All! Android reference

This folder is a behavior-first reference for the Android game [Slice It All!](https://play.google.com/store/apps/details?id=com.tummygames.sliceit) (`com.tummygames.sliceit`). It was captured on August 2, 2026 to inform Chopline Rush. It is research material, not a source or asset donor.

## What was inspected

- Official Google Play listing and the current Play review corpus.
- Android package `2141.0.4` (`versionCode 21375`, min SDK 26, target SDK 36), arm64-v8a.
- A live install on a clean, isolated Android 15 AVD at 1080 × 2400 portrait resolution.
- The already-installed production build on a physical Google Pixel 8 running Android 16 at 1080 × 2400, with player state preserved.
- First launch, online and offline startup, level start, input timing, failure, revive, interstitial, successful completion, scoring, two finish types, settings, events, and post-level flow.
- Unity package structure, Addressables catalogue, IL2CPP metadata markers, runtime libraries, and gameplay class names.

The official listing scraper reported `2141.0.3` while the signed package available through the package distributor was `2141.0.4`; this may be staged rollout or storefront propagation. Claims about runtime behavior in the reports refer to the installed `2141.0.4` package.

## Canonical visual reference

The required source-of-truth gameplay frame is [screenshot-01.png](screenshots/screenshot-01.png). It is a real emulator frame during a successful wall cut, not store art or a menu.

Additional frames:

- [screenshot-02-start.png](screenshots/screenshot-02-start.png): level-start composition and HUD.
- [screenshot-03-perfect-gate.png](screenshots/screenshot-03-perfect-gate.png): gate choice and `PERFECT` feedback.
- [screenshot-04-multiplier.png](screenshots/screenshot-04-multiplier.png): multiplier-tower finish.
- [screenshot-05-apple-head.png](screenshots/screenshot-05-apple-head.png): Apple Head finish vignette.
- [screenshot-06-settings.png](screenshots/screenshot-06-settings.png): sound, vibration, restore purchase, and privacy controls.
- [screenshot-07-offline-block.png](screenshots/screenshot-07-offline-block.png): current-build network gate on the first offline gameplay tap.
- [screenshot-08-physical-return-reward.png](screenshots/screenshot-08-physical-return-reward.png): returning-player offline-reward prompt on the Pixel 8.
- [screenshot-09-physical-tool-start.png](screenshots/screenshot-09-physical-tool-start.png): physical Level 2 pre-start with a wide perforated tool skin.
- [screenshot-10-physical-gameplay.png](screenshots/screenshot-10-physical-gameplay.png): real-device target slice during the controlled run.
- [screenshot-11-physical-win.png](screenshots/screenshot-11-physical-win.png): real-device multiplier win.
- [screenshot-12-physical-interstitial.png](screenshots/screenshot-12-physical-interstitial.png): playable interstitial immediately following that win.

## Reports

- [FRESH-INSTALL-TUTORIAL-AUDIT.md](FRESH-INSTALL-TUTORIAL-AUDIT.md): clean Level 1 onboarding evidence and the correction to the prior single-tap interpretation.
- [tutorial-parity-correction.png](tutorial-parity-correction.png): side-by-side proof of ready, missed-air-tap failure, and timed-air-tap wall cut states.
- [SLICE-IT-ALL-SPECS.md](SLICE-IT-ALL-SPECS.md): behavior and implementation deconstruction.
- [REVIEW-AND-4.7-REPORT.md](REVIEW-AND-4.7-REPORT.md): rating diagnosis and requirements for a 4.7+ version.
- [PHYSICAL-DEVICE-VALIDATION.md](PHYSICAL-DEVICE-VALIDATION.md): returning-player flow, real-device control parity, skin-readability risk, and measured ad interruption timeline.
- [ARTIFACT-MANIFEST.md](ARTIFACT-MANIFEST.md): complete index of the curated reports, raw package/static inspection, review corpus, emulator proof, and physical-device proof.

## Capture method and proof

The app is a Unity IL2CPP canvas. Android accessibility exposes the Unity surface but not individual canvas controls, so interactions were issued as proportional coordinates within the known 1080 × 2400 game surface after screenshot inspection. This limitation is material: button hit testing could be observed, but not introspected as native Android nodes.

Raw acquisition, the package, extracted package contents, scripts, listing HTML, and review JSON live under the ignored `tmp/references/com.tummygames.sliceit/` directory. Emulator proof is under the ignored `output/android/com.tummygames.sliceit/` directory, including:

- full-resolution launch and UI screenshots;
- UI Automator dumps where Android exposed nodes;
- filtered app logs;
- a failed run through revive and interstitial;
- a successful Level 1 run;
- a controlled-cut Level 2 run;
- half-second contact sheets;
- online and offline behavior captures.

Physical Pixel 8 proof is under `output/android/com.tummygames.sliceit/physical-pixel8/`. It includes the 40.07-second 1080 × 2400 recording, 1 fps contact sheet, extracted gameplay/win/ad frames, launch and reward screens, and the Unity/banner UI hierarchy. The preserved player profile was not reinstalled or data-cleared.

The inspected XAPK SHA-256 is `63babde295660ac25650c6a1b72c6025010d8e66d73edcd3895661d48b9736d3`. All splits shared signing-certificate SHA-256 `e8c42638caa2b1aab08c55b6905df3188e0975931a9ed2c9ea0f54670a7dd23a`.

## Evidence policy

The reports distinguish three evidence levels:

- **Observed:** reproduced in the live emulator or directly counted from the listing/review data.
- **Static confirmation:** present in signed package metadata, Addressables, symbols, or libraries.
- **Inference:** a behavior implied by multiple observations and static markers, but not recovered source code.

No source code, textures, meshes, audio, or proprietary gameplay assets were copied into Chopline Rush.

For tutorial claims, the fresh-install audit is authoritative. The successful Level 1 recording and
the preserved Pixel profile are valid gameplay evidence, but neither identifies the clean onboarding
input sequence by itself.
