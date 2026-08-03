# Slice It All! — physical-device validation

Date: August 2, 2026
Package: `com.tummygames.sliceit`
Installed build: `2141.0.4` (`versionCode 21375`, min SDK 26, target SDK 36)
Device: Google Pixel 8, Android 16 / API 36, 1080 × 2400, density 420

## Purpose and scope

The emulator pass established the mechanics, package structure, early level behavior, offline gate, and ad placements. This pass used an existing real-player install to answer the questions an isolated emulator could not answer as confidently:

- Does the observed timing model work with a real phone's touch and render path?
- What does a returning player encounter before the next run?
- Do alternate tool skins preserve control readability?
- How quickly does a real successful run hand control to advertising?
- Are the emulator's core-loop observations visibly reproducible on current hardware?

The installed profile was deliberately preserved. The package was not reinstalled, downgraded, updated, or data-cleared. That makes this a returning-player validation rather than a clean-install onboarding test.

## Method

- Verified the installed split package and version before interaction.
- Launched through Android's package manager on the connected Pixel 8.
- Captured full-resolution screenshots and a 40.07-second H.264 screen recording at 1080 × 2400.
- Used screenshot-informed coordinates because Unity exposes one canvas surface instead of accessible gameplay controls.
- Issued a regular tap cadence of approximately 0.85 seconds during the controlled run.
- Inspected the Android activity stack after the run to identify the full-screen ad surface.
- Returned the phone to its Home screen at the end without clearing game state.

The recording contains no audio stream. The screen recorder reported an average encoded frame rate of 58.77 fps, but that is capture metadata—not a substitute for instrumented Unity frame-time measurement.

## Observed returning-player flow

| Sequence | Physical-device observation | Product implication |
|---:|---|---|
| 1 | Launch reached `Welcome Back!`, `16 days!`, and an `Offline rewards` offer for 32,000 coins. The prominent claim path used a video symbol; `NO, THANKS` was secondary. A banner occupied the bottom. | The first post-launch decision is monetization/reward management, not play. |
| 2 | Dismissing that surfaced a `SLICE TOGETHER! SUCCESS!` reward screen with `$3000`, a skin reward, `GET X2` with video icon, and plain `CLAIM`. The banner remained. | A returning player can face consecutive reward decisions before seeing a playable level. |
| 3 | Plain claim reached Level 2 with 4,014 coins, mission progress, a timed event, bottom navigation, a bottom banner, and a perforated spatula-style tool skin. | Meta and advertising use a large share of the pre-run visual budget. |
| 4 | The first scripted attempt surfaced a dark branded `SLICE IT ALL!` modal with a large `CLOSE` button over the level. | The path from pre-start to actual input was not reliably one tap. |
| 5 | After closing it, the same approximately 0.85-second cadence used on the emulator completed the level. | The basic cadence and trajectory model transfer to a real device. |
| 6 | A full-screen playable ad began almost immediately after the win and occupied the remainder of the 40-second recording. | The interruption is longer than the active run and owns the emotional moment after success. |

This is one preserved account state, so the exact reward/event sequence should not be treated as universal first-launch behavior. It is direct evidence of a valid returning-user path in the current production build.

## Reproduced gameplay sequence

The physical run visibly reproduced the core grammar:

1. tool embedded on the left pedestal;
2. `TAP TO FLIP` start state;
3. repeated forward/upward impulses with continuous rotation;
4. a deep opening-wall cut with separated authored slabs and stacked `+1` rewards;
5. a green timing gate with `PERFECT` and additive value;
6. slicing through a toy-block structure;
7. a checkered finish and multiplier tower;
8. `YOU WIN`, confetti, and currency resolution.

The run began at roughly 6.5 seconds in the recording and reached the win state at roughly 16.5 seconds. The playable core lasted about ten seconds. The full-screen ad was visible by roughly 17.8 seconds and remained through the 40.07-second endpoint.

## Control and physics findings

### Confirmed parity

- Approximately 0.85 seconds between taps again produced a low, interaction-rich route rather than the high skip route.
- The tool preserved momentum between impulses and rotated continuously around its body region.
- Blade/tool-head orientation at contact visibly determined wall penetration and debris direction.
- A timing gate recognized the route as `PERFECT`, confirming that the gate evaluates a readable spatial/timing condition rather than only level progression.
- The tool recovered from destructive contacts and continued into the next arc, preserving the cut-to-recovery rhythm.

### New physical-device risk: skin readability

The current returning profile used a perforated spatula-style skin rather than the canonical knife. Its head is much wider and taller, its shaft is longer and thinner, and its visual center is different. It therefore changes all three cues the player uses to time a tap:

- the apparent center of rotation;
- the readable blade-first/contact-facing orientation;
- the amount of screen space occupied near a target.

The run was still completable, but a player cannot know from visuals alone whether the collider, center of mass, cut trigger, and inertia are identical to the knife. This lines up with review complaints about inconsistent knives and physics.

For a 4.7+ successor, cosmetic tools need one of two explicit policies:

1. **Gameplay invariant:** shared center of mass, angular response, contact trigger, and normalized silhouette envelope, with visual variants authored around those constraints.
2. **Gameplay variant:** clearly labeled handling stats and separate balance/QA coverage for every tool.

Silently mixing cosmetic-looking tools with different apparent geometry is the worst option because it weakens `my timing caused that`.

## Visual and interface findings

- The physical banner occupied 168 px of the 2,400 px display, or 7% of total screen height.
- Active play also carried an ad tile in the upper-left, while currency, mission state, and event state occupied the top and right.
- The tool remains readable because the world is intentionally sparse and bright, but readability is being purchased with empty level space and then spent on ads and meta UI.
- The wide spatula head competes more strongly with debris, gates, and target silhouettes than the white knife blade.
- The `PERFECT`, green cut volume, score popups, separated slabs, and rainbow interior remain strong, compact feedback on a real OLED phone.
- The bottom banner persists into the moment-to-moment loop, so the camera effectively has less usable vertical space than the nominal portrait resolution implies.

## Advertising interruption evidence

The activity visible after the win was `com.applovin.adview.AppLovinFullscreenActivity`, while the Unity activity remained underneath. The ad was a playable word-puzzle creative and did not yield to the first Android Back action after recording. The phone was returned to Home instead of interacting with the creative.

The important product finding is placement and duration, not the particular creative:

- active play lasted about ten seconds;
- win feedback lasted roughly one second before the ad surface appeared;
- the ad remained for at least the next 22 seconds of the recording;
- a bottom banner and upper-left ad tile had already been present during the run.

This is a direct, current-build explanation for the review corpus's dominant complaint. The game delivers a satisfying ten-second success, then makes the player spend longer escaping an unrelated experience than executing the level.

## Performance boundary

No obvious sustained stutter is visible in the 1080 × 2400 recording. The captured stream averaged 58.77 fps across the branded modal, Unity run, win, and playable ad.

Android `gfxinfo` after the run reported the foreground AppLovin activity—not the Unity `SurfaceView`—at 0.17% janky frames, with 8 ms median and 13 ms 95th-percentile UI frame times. Those figures characterize the ad activity and must not be presented as Slice It All!'s gameplay frame-time result. A production clone still needs dedicated engine instrumentation for frame pacing, input-to-photon latency, thermal behavior, and low-tier devices.

## Additional 4.7+ opportunities revealed by the phone

1. **Return directly to play.** Consolidate offline reward, event completion, and unlock results into one passive inbox or one dismissible summary after the player has reached the level.
2. **Guarantee one-tap start.** From a visible `TAP TO FLIP` state, the next unconsumed tap must start the run; no delayed modal may claim it.
3. **Protect the success afterglow.** Keep the win, score causality, and next-level transition under game control. An interstitial must never begin within the immediate win beat.
4. **Budget interruptions against playtime.** A useful guardrail is at least 90 seconds of uninterrupted play between interstitial opportunities, never after failure, and never more often than one per three completed levels.
5. **Remove active-play ad surfaces.** The camera, HUD, trajectory, and targets should be composed for the full portrait surface, with no banner or ad tile competing for it.
6. **Normalize cosmetic silhouettes.** Test every tool against the same orientation-readability, collider, center-of-mass, and reach fixtures.
7. **Make rewards non-blocking.** Offline and event rewards should accrue without forcing multiple accept/decline screens before the next run.
8. **Measure the actual loop.** Capture P95 pointer-down-to-visible-response, simulation step variance, missed input, and Unity frame time on physical low-, mid-, and high-tier devices.

## Curated evidence

- [screenshot-08-physical-return-reward.png](screenshots/screenshot-08-physical-return-reward.png): first returning-user reward surface and banner.
- [screenshot-09-physical-tool-start.png](screenshots/screenshot-09-physical-tool-start.png): Level 2 pre-start with the perforated tool skin, mission/event UI, and banner.
- [screenshot-10-physical-gameplay.png](screenshots/screenshot-10-physical-gameplay.png): real-device slice through the toy-block target.
- [screenshot-11-physical-win.png](screenshots/screenshot-11-physical-win.png): multiplier finish and win beat.
- [screenshot-12-physical-interstitial.png](screenshots/screenshot-12-physical-interstitial.png): full-screen playable ad immediately following the win.

Raw physical-device screenshots, UI hierarchy, contact sheet, extracted frames, and the 40.07-second recording are under:

`output/android/com.tummygames.sliceit/physical-pixel8/`

## Evidence limits

- This is one Pixel 8 and one preserved returning-user state, not a device matrix or clean-install cohort.
- Touches were issued through Android device control at regular intervals; the successful path is valid, but it is not a human motor-control study.
- Screen recording adds overhead and does not provide input-to-photon timing.
- Audio was not recorded.
- Haptics were not subjectively assessed; the preserved profile's vibration setting was not changed.
- The creative content of third-party ads is outside the game specification. Their timing, surface ownership, and interruption cost are in scope.
