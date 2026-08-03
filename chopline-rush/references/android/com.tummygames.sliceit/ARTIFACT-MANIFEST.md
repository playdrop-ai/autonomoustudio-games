# Slice It All! deconstruction artifact manifest

Date verified: August 2, 2026

This manifest separates durable, human-readable research from large raw acquisitions and reproducible proof. The split is intentional: reports and selected screenshots belong in the reference set; the signed package, extracted binaries, third-party assets, complete review JSON, recordings, and diagnostic output remain ignored local research artifacts.

## 1. Curated reference set

Folder: [references/android/com.tummygames.sliceit](/Users/olivier/Documents/autonomoustudio-games/chopline-rush/references/android/com.tummygames.sliceit)

Contents:

- [README.md](/Users/olivier/Documents/autonomoustudio-games/chopline-rush/references/android/com.tummygames.sliceit/README.md): entry point, scope, capture method, and evidence policy.
- [SLICE-IT-ALL-SPECS.md](/Users/olivier/Documents/autonomoustudio-games/chopline-rush/references/android/com.tummygames.sliceit/SLICE-IT-ALL-SPECS.md): control, physics, gameplay grammar, level construction, presentation, monetization, and technical specification.
- [REVIEW-AND-4.7-REPORT.md](/Users/olivier/Documents/autonomoustudio-games/chopline-rush/references/android/com.tummygames.sliceit/REVIEW-AND-4.7-REPORT.md): official rating facts, 1,389-review thematic analysis, star-loss diagnosis, and 4.7+ product requirements.
- [PHYSICAL-DEVICE-VALIDATION.md](/Users/olivier/Documents/autonomoustudio-games/chopline-rush/references/android/com.tummygames.sliceit/PHYSICAL-DEVICE-VALIDATION.md): Pixel 8 returning-user flow, real-device control parity, tool-skin risk, ad timeline, and evidence limits.
- [screenshots](/Users/olivier/Documents/autonomoustudio-games/chopline-rush/references/android/com.tummygames.sliceit/screenshots): twelve curated emulator and physical-device screenshots.

Size at verification: approximately 5.3 MiB.

## 2. Raw package, static inspection, and review corpus

Folder: [tmp/references/com.tummygames.sliceit](/Users/olivier/Documents/autonomoustudio-games/chopline-rush/tmp/references/com.tummygames.sliceit)

Size at verification: approximately 1.2 GiB across 5,728 files.

Key contents:

- `Slice-It-All-2141.0.4.xapk`: inspected signed package.
- `base-apk/`, `assetpack-apk/`, and `unpacked/`: expanded package and Unity data used for static inspection.
- `addressable-internal-ids.txt`: Addressables paths used for prefab/chunk counts.
- `focused-gameplay-symbols.txt`, `focused-gameplay-text.txt`, `gameplay-symbols.txt`, and `il2cpp-metadata-strings.txt`: searchable IL2CPP/gameplay markers.
- `unity-artifact-inventory.txt`, `unity-assetpack-inventory.txt`, and `unity-base-inventory.txt`: package inventories.
- `play-app.json` and `play-listing.html`: captured official listing data.
- `reviews-newest.json`, `reviews-helpful.json`, `reviews-rating.json`, and `reviews-deduplicated.json`: the collected review corpus.
- `review-analysis.json` and `review-selected-themes.json`: derived theme counts and selected evidence.
- `fetch-play-data.mjs` and `analyze-reviews.mjs`: acquisition/analysis scripts.
- Supporting emulator screenshots and intermediate gameplay frames.

Package integrity:

- XAPK SHA-256: `63babde295660ac25650c6a1b72c6025010d8e66d73edcd3895661d48b9736d3`
- Split signing-certificate SHA-256: `e8c42638caa2b1aab08c55b6905df3188e0975931a9ed2c9ea0f54670a7dd23a`

## 3. Emulator proof

Folder: [output/android/com.tummygames.sliceit/proof](/Users/olivier/Documents/autonomoustudio-games/chopline-rush/output/android/com.tummygames.sliceit/proof)

This contains the recorded failed run, revive/interstitial flow, Level 1 success, controlled-cut Level 2 success, contact sheets, wall-cut sequence, gate, multiplier finish, target, win, and offline test frames.

Notable recordings:

- `level-1-fail-revive-ad.mp4`
- `level-1-success.mp4`
- `level-2-controlled-cut.mp4`

## 4. Physical Pixel 8 proof

Folder: [output/android/com.tummygames.sliceit/physical-pixel8](/Users/olivier/Documents/autonomoustudio-games/chopline-rush/output/android/com.tummygames.sliceit/physical-pixel8)

Contents include:

- launch, returning reward, event reward, pre-start, post-run, and ad screenshots;
- Unity/banner UI hierarchy dumps;
- `sliceit-physical-level2.mp4`, the 40.07-second 1080 × 2400 controlled success capture;
- `contact-sheet-1fps.png` and extracted frames at the modal, start, gate, target, win, and ad boundaries.

## 5. Storage and evidence policy

- `references/` is the durable analysis set intended for ongoing Chopline Rush design work.
- `tmp/` and `output/` are ignored local evidence, not game source and not material to publish or redistribute.
- No reference game's source code, textures, meshes, audio, or other proprietary gameplay assets were incorporated into Chopline Rush.
- Static names, counts, runtime observations, review aggregates, and selected screenshots are used only to document design behavior and product opportunities.
