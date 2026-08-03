# Slice It All! — behavioral and technical specification

Date: August 2, 2026
Package: `com.tummygames.sliceit`
Runtime tested: Android `2141.0.4` (`versionCode 21375`)
Reference resolution: 1080 × 2400 portrait
Validation environments: clean Android 15 emulator and preserved-state Google Pixel 8 on Android 16

## 1. Product thesis

Slice It All! turns one repeated action—tapping to re-launch a flipping knife—into three simultaneous pleasures:

1. **Rhythm:** the player chooses when to add the next impulse.
2. **Destruction:** blade-first contact separates stacked objects and pays per segment.
3. **Trajectory gambling:** low arcs cut more but risk failure; high-frequency taps preserve altitude and can bypass hazards.

The product is learnable from one instruction, `TAP TO FLIP`, yet produces visible differences from timing. That is the core worth copying at the design level. The surrounding ad, event, and reward machinery is not the core.

> **Fresh-install correction (August 3, 2026):** the single written instruction is not a
> single-input tutorial. On a wiped Level 1 install, one launch tap with no airborne follow-up
> reaches the opening wall and fails into `REVIVE` in about 1.5–2 seconds. The wall, trajectory, and
> failure loop teach that the player must tap again while airborne. See
> [FRESH-INSTALL-TUTORIAL-AUDIT.md](FRESH-INSTALL-TUTORIAL-AUDIT.md).

## 2. Runtime state flow

| State | Observed behavior | Exit |
|---|---|---|
| Cold launch | Branded loading screen while Unity, services, remote config, and ad systems initialize. | Main level scene plus a large branded modal. |
| First modal | Gameplay scene is visible but darkened behind a `CLOSE` button. | Tap `CLOSE`. |
| Pre-start | Knife is embedded in a pedestal. Level number, currency, mission/event buttons, settings, no-ads, and bottom navigation are visible. | Any unconsumed gameplay tap starts the run. |
| Active run | Knife moves right while flipping; camera follows. Each tap changes the next arc. | Finish trigger, ground/bad collision, or off-course failure. |
| Failure grace | A circular heart/revive prompt occupies the center for several seconds. | Rewarded revive, timeout, or restart. |
| Failed | Knife remains where it fell; `TAP TO RESTART` appears. | Tap, frequently followed by an interstitial. |
| Finish vignette | Either a target vignette such as Apple Head or a multiplier tower resolves the run. | Win overlay. |
| Win | Trophy, earned currency, mission/event progress, and `TAP TO CONTINUE`. | One or more taps/animations, sometimes an event overlay, then next level. |

The transition flow is not cleanly one-tap-per-screen. In capture, event progress cards and ad surfaces could delay or intercept the expected continue action.

The physical returning-user path added three consecutive gates before the next active run: an offline-reward offer, a completed-event reward with an optional video multiplier, and then a dark branded `CLOSE` modal after the level itself was visible. This is not proof that every session gets all three; it is proof that the current state machine permits a returning session to reach `TAP TO FLIP` without guaranteeing that the next tap begins play.

## 3. Control model

### 3.1 Input surface

- Primary input is a pointer-down anywhere in the unconsumed gameplay region.
- The first tap releases the knife from its pedestal.
- Later taps add a new upward/forward impulse and continue or renew rotation.
- No drag, swipe, hold duration, aim line, or horizontal steering is required.
- UI buttons consume taps when their hit targets win; otherwise a tap can start the run.

Static confirmation includes `TapJumpInput`, `KnifeMover`, `KnifeCollisionChecker`, `BladeCutTriggerReporter`, and `PhysicsEffectSettings` classes.

### 3.2 Timing envelope observed on the emulator

These are behavioral calibration points, not recovered physics constants:

| Tap pattern | Result |
|---|---|
| One launch tap, then no input | Knife completes one arc, contacts the opening structure, loses support, and fails in roughly two seconds. |
| About 0.55 s between taps | Knife gains and preserves high altitude. It can clear the opening wall and skip much of the reward field. |
| About 0.8–0.9 s between taps | Knife travels in lower, readable arcs, bites through the opening wall, passes the gate course, and finishes successfully. |

The approximately 0.85-second pattern also completed Level 2 on the physical Pixel 8, reproducing the opening wall, `PERFECT` gate, toy-block target, multiplier landing, and win. This corroborates the emulator's behavioral timing envelope without claiming recovered physics constants.

This creates a genuine risk/reward spectrum:

- **Spam/early taps:** safe height, low contact density, less satisfying destruction.
- **Late taps:** deeper cuts and more currency, but greater chance of handle/ground contact.
- **Rhythmic taps:** controlled low flight with repeated blade-first contacts.

### 3.3 Rotation and readability

- The knife rotates around a point close to its body center, not its blade tip.
- The red handle and bright white blade create an immediately readable orientation silhouette.
- Alternate skins can depart sharply from that silhouette. The physical returning profile used a wide perforated spatula-style head on a long narrow shaft, changing the apparent pivot, reach, and contact face even though the game presented it as the same one-tap verb.
- A thin, pale trajectory ribbon shows the recent path. It helps the player learn the arc after the fact without adding an aiming UI.
- The camera holds a consistent side-on three-quarter view; the player reads blade-down versus handle-down primarily from silhouette.

### 3.4 Contact rules

Observed outcomes:

- Blade-first contact with a target can cut, stick briefly, or redirect the knife.
- Each cuttable slab can award `+1`, producing a vertical stream of score popups during a deep wall cut.
- Handle/body contact and ground contact are failure-prone.
- The knife can remain visually embedded in a failed position.
- The end target accepts a successful blade landing or crossing condition and transitions to the finish flow.

High-confidence inference: opening walls are assemblies of discrete slab pieces rather than arbitrary runtime mesh booleans. The visible cut pays once per slab, and the package contains `SlabHandler`, `SlabManager`, `BladeCutTriggerReporter`, and joint/rigidbody utilities. The V-shaped destruction comes from detaching multiple authored pieces along the two knife passes.

## 4. Core gameplay grammar

### 4.1 Opening beat

Levels 1 and 2 both opened with the same composition:

- knife embedded in a white pedestal on the left;
- very tall wall of thin red-brown slabs on a gray base to the right;
- ample green negative space between them;
- `TAP TO FLIP` below.

This is an effective integrated tutorial because it shows the tool and the first victim before input,
then makes the first victim a timing test. The first tap launches the knife but does not automatically
clear the wall. Without another tap the player fails quickly; with an early follow-up the knife can
overshoot the wall; with a rhythmic follow-up it cuts through. The written prompt names the verb,
while geometry and failure teach repetition and cadence. Repeating the exact entrance in consecutive
levels also begins the sameness problem immediately.

### 4.2 Traversal beats observed

- **Slab wall:** many independent slice rewards, debris, and a hidden rainbow core.
- **Small target stack:** vertically stacked orange spheres on a platform.
- **Instruction targets:** contextual `CUT THE APPLE` / `CUT THE BOTTLE` prompts.
- **Gate ladder:** vertically arranged green bonuses (`+2`, `+4`, `+6`) and a red penalty (`-3`) with narrow rails; accurate passage produces `PERFECT`.
- **Open air recovery:** gaps where cadence alone keeps the knife alive.
- **Checkered boundary:** strong visual signal that the authored traversal is ending.

Static inventory additionally confirms conveyors, bonus target spawners, key pickups, diamonds, alternate paths, knife-size gates, knife-circle gates, coin gates, boosters, piggybank chunks, and bonus finishes.

### 4.3 Finish families

Two very different finishes were reproduced:

1. **Apple Head vignette:** a camera films a large stylized human head with an apple on top. The knife lands at the apple and the character reacts before the win screen.
2. **Multiplier tower:** a tall stack of colored blocks labeled with non-monotonic multipliers such as `6x`, `x3`, `x20`, `50x`, and `x4`. Knife contact selects a band and resolves the run.

The Addressables catalogue contains finish prefabs for Beach, Bonus, City, Forest, Gold, Piggybank, the Apple Head chunk, and safe-point variants.

### 4.4 Level construction

Static evidence strongly indicates chunk-based procedural or semi-procedural assembly:

- `LevelGeneration`, `MapSpawnHandler`, `EditorTargetsSpawner`, `BonusTargetSpawner`, and `TargetPercentageCalculator` exist in IL2CPP metadata.
- The Addressables catalogue contains 240 prefab IDs.
- It includes 55 `New Obstacles` prefabs, 77 `George` level chunks, and 73 `Ziggy` level chunks.
- It includes nine finish-prefab entries by filename pattern.

These counts are content chunks, not proof of 205 unique complete levels. A generator can combine them many ways, but perceived variety depends on sequencing, silhouette, tempo, materials, and goal changes—not raw prefab count.

### 4.5 Difficulty model

The challenge is mostly self-authored by the player's desired reward density:

- Clearing a level can be easy if the player taps early and stays high.
- Slicing more objects requires lower, later arcs.
- Gates add explicit good/bad bands.
- Bonus targets and finish multipliers turn final alignment into a last timing test.

The weakness is that success does not consistently require engaging with the level. A high route can bypass the visually prominent wall and targets, so the most reliable strategy is sometimes the least satisfying one.

## 5. Scoring, rewards, and secondary systems

### 5.1 Run scoring

- Top-right currency persists between levels.
- Each slab cut visibly adds `+1` and increments the currency count.
- A Level 2 run with a 13-segment cut showed `$13` on the win screen.
- A Level 1 high-route completion showed `$0`, confirming that reaching the finish and cutting targets are separable.
- Gate bonuses and penalties modify the run through green/red choices.
- The multiplier finish chooses a terminal multiplier band, though its non-monotonic ordering makes optimization harder to read.

### 5.2 Missions and events observed

- Rotating mission card with goals such as collecting/cutting a target count.
- `DO NOT TOUCH THE GROUND` challenge messaging.
- Metadata strings for `Flip Blade {0} Times` and singular slice-target missions.
- A two-hour `SLICE TOGETHER` event with a global `200,000` progress target, leaderboard, coin reward, and skin reward.
- A `SUNNY RUSH` daily event card appeared on the pre-start screen.
- Daily rewards, chest room, wheel, keys, skins, and randomized unlock systems are present statically.

These systems add reasons to replay, but they occupy substantial visual and transition bandwidth before the core has earned it.

## 6. Feedback specification

### 6.1 Visual feedback

- Pale trajectory trail on each arc.
- Small cuboid debris from wall destruction.
- Per-slab `+1` text emitted close to the cut.
- Rainbow interior revealed behind the brown wall.
- Large translucent `PERFECT` callout at gates.
- Bright green/red gate panels with explicit signed numbers.
- Confetti, trophy, dimmed background, and oversized `YOU WIN` banner.
- Heart countdown ring and darkened scene on failure.

### 6.2 Haptics

The package contains More Mountains Nice Vibrations 1.7, `CallHaptic`, and gate-specific `HapticsFeedbackSO`. The settings screen exposes a vibration toggle. Vibration was off in the captured settings state, so strength and pattern quality were not subjectively evaluated.

### 6.3 Audio

The package contains separate knife sound, background music, mixer, sound-event, and gate-sound systems. The settings screen exposes a sound toggle. Android screen recording did not include an audio stream, so the exact clips, mix, and latency were not rated. Review language consistently describes the cut sounds as a core satisfying element, but also reports intrusive ad audio.

## 7. Camera and presentation

- Portrait-only playfield.
- Side-on three-quarter 3D camera with shallow scene depth.
- Horizontal camera tracking follows the knife; the world advances left-to-right.
- The knife normally stays between the left and middle thirds while upcoming objects occupy the right side.
- Large vertical structures intentionally enter from below/above to use the full portrait height.
- The package includes Cinemachine and a custom `CameraRCController`; the smooth follow is therefore likely a damped virtual-camera setup.

The camera is functional for rhythm but has two design liabilities:

- high-frequency tapping pushes the knife near the top, where the ad unit and currency HUD compete with it;
- tall objects and giant finish characters can fill the frame and make scale feel inconsistent.

## 8. Visual direction

### 8.1 Strengths

- Extremely legible red-handle/white-blade hero prop.
- Bright cyan-to-green background gradient and low-detail pine silhouettes keep targets readable.
- Flat/toon shading, thick UI outlines, and high saturation survive small phone screens.
- Destructible targets use simple colors and repeating slabs, making motion and separation easy to read.
- The opening wall, rainbow reveal, green gates, checkered finish, and trophy are strong color-coded beats.

The package includes Toony Colors Pro and Unity built-in shaders, matching the observed toon presentation.

### 8.2 Weaknesses

- UI style is assembled from many competing systems: blue pills, gray missions, purple events, orange event cards, green settings, red win banners, and ad surfaces.
- Live ads obscure the upper-left playfield and reserve a large bottom strip; one banner was visible before the first tap and throughout both recorded successes.
- The Apple Head human model is a different quality and proportion language from the clean knife/slab world.
- Multiplier values are laid out non-monotonically, weakening visual causality.
- Consecutive levels reuse the same opening wall and environment, making visual memory of one level hard to distinguish from another.
- Some overlay states stack text and buttons in the same space, reducing finish-flow clarity.
- Cosmetic tools are not constrained to a common apparent silhouette, which can make identical timing look as though it should produce different contact behavior.

## 9. Monetization and online behavior

Observed in the current build:

- Persistent banner in online sessions, including pre-start, active play, fail, and win screens.
- Full-screen interstitial after a failed short run.
- Full-screen interstitial after successful completion.
- On the physical Pixel 8, the controlled run contained about ten seconds of active play; the full-screen AppLovin activity appeared roughly 1.3 seconds after the recorded win frame and remained through the final 22 seconds of the 40-second capture.
- A preserved returning-user session also placed an offline-reward offer and event-success reward decision before the next run.
- Rewarded revive prompt before restart.
- Prominent no-ads button on the main screen.
- Package support for audio ads and a purchase string specifically mentioning removal of audio ads.

Current offline behavior was explicitly tested:

1. With Wi-Fi and mobile data disabled, the current package cold-started to the Level 2 pre-start screen.
2. The first attempt to play produced a blocking modal: `It seems that you're not connected to the internet. Check your connection to continue playing.`
3. Therefore the core run is not offline-first in `2141.0.4`, even though the scene can load from local assets.

## 10. Technical inventory

| Dimension | Confirmed fact |
|---|---|
| Engine | Unity, IL2CPP (`global-metadata.dat`, `libil2cpp`, Unity runtime logs). |
| Content delivery | Base APK + arm64 config split + `UnityDataAssetPack` split. |
| Download size inspected | 305 MiB XAPK: 152 MiB base, 117 MiB asset pack, 32 MiB ABI split. |
| Content system | Unity Addressables with local catalog and three bundles, including `levelchunks`. |
| Android support | min SDK 26, target SDK 36, arm64-v8a package inspected. |
| Input | Unity input surface; LeanTouch libraries are present, though core play only needs tap. |
| Motion/animation | PhysX/rigidbodies, DOTween, Lean Transition, Cinemachine. |
| Haptics | More Mountains Nice Vibrations. |
| Rendering | Built-in Unity shaders and Toony Colors Pro. |
| Services | Firebase Analytics/Messaging/Crashlytics, Adjust, GameAnalytics, Google Play Games, Voodoo Tune/Sauce. |
| Ads observed | Pangle emulator banner/interstitial surfaces; InMobi banner WebView on the physical device; AppLovin MAX initialization and a physical `AppLovinFullscreenActivity` immediately after a win. |
| IAP | Unity Purchasing, Voodoo IAP, restore purchase, no-ads handler. |

The app requests internet/network state, Wi-Fi state, ad ID, install referrer, vibration, notifications, wake lock, billing, foreground service/data sync, and ad-services attribution/topics permissions or capabilities.

## 11. What the game is actually best at

The durable design value is not the quantity of prefabs or the meta layer. It is this short loop:

> Read knife orientation → delay or advance the next tap → see the arc → earn blade-first destruction → recover into another arc.

Every high-quality successor should protect that loop from latency, clutter, unpredictable collision, mandatory connectivity, and interruptions. The player should feel that the result came from their timing, not from a hidden rule, an arbitrary multiplier, or an ad transition.

## 12. Evidence boundaries

- Exact force, gravity, torque, damping, collider dimensions, and haptic envelopes were not recovered and should be tuned from feel tests rather than treated as known constants.
- Only early live levels were played; the wider content grammar is supported by the signed package catalogue, not a claim that every chunk was personally played.
- Audio quality was not captured.
- Ad creatives shown in the emulator were test inventory. Placement and interruption timing are product behavior; creative content is not evaluated.
- Physical-device control and transition evidence comes from one preserved Pixel 8 profile. It corroborates the loop and exposes a valid returning-user path, but it is not a clean-install or device-matrix result.
