# Knife-Flip Game Comparative Study

## Comparison set

1. **Astrocade Slice Rush**: downloaded browser reference and extracted source/config.
2. **VOODOO Slice It All!**: Google Play Android build `2141.0.3`, captured and inspected on a Pixel 8.
3. **Chopline Rush**: current local PlayDrop build `1.0.6`.

The study is player-facing. Scores describe the current experience, not source-code
ambition or commercial performance.

## Evidence and method

- Replayed Astrocade and Chopline Rush at 720 x 1280 with the same deterministic
  inputs and random seed.
- Compared ready, first tap, second airborne tap, later flight, cut, fragment fall,
  and landing states.
- Re-ran the comparison after validating the current Chopline source.
- Played the installed VOODOO build on the connected phone and captured Level 1
  success plus a slower Level 2 failure attempt.
- Read the downloaded Astrocade source, current Chopline source, Android Java shell,
  Unity IL2CPP metadata, Addressables, and serialized VOODOO gameplay assets.

Current verification status:

- `npm run validate:local`: passed.
- `node scripts/compare-reference-endless.mjs`: passed with no reference/current
  browser errors.
- The deterministic Astrocade/Chopline motion states matched for position, velocity,
  rotation, score, timer, slice events, fragment counts, and fragment velocities.
- Controlled visual captures averaged roughly 0.92 SSIM across the full frame. This
  confirms strong scene-level similarity, but it hides severe differences in the
  focal knife because most pixels belong to the shared environment.
- `npm run proof:mechanics`: currently fails before gameplay because its stale
  `#menu-screen.visible` selector times out. This is a test-harness defect and a
  confidence gap, not proof of a runtime gameplay failure.

Visual panels, ordered Astrocade / VOODOO / Chopline:

- `tmp/comparative-study/start-control-read.png`
- `tmp/comparative-study/cut-payoff.png`

## Executive verdict

| Area | Astrocade | VOODOO | Chopline |
| --- | ---: | ---: | ---: |
| Controls and core gameplay | 8.4 | **8.8** | 7.0 |
| Visuals | 6.8 | **8.7** | 5.8 |
| Animation and juice | 7.4 | **9.1** | 6.4 |
| Product polish | 7.0 | **7.7** | 5.8 |
| Overall current experience | 7.5 | **8.6** | 6.3 |

The scores need one important qualification: Chopline's underlying flight and
slice-piece simulation is much better than its 6.3 suggests. It loses points
because the knife model, pivot, pose, material, and collision read make correct
physics look incorrect. For a one-object control game, that is a core gameplay
failure, not merely cosmetic debt.

## 1. Controls and core gameplay

### Shared control grammar

All three games use one-touch forward knife flipping:

- Tap creates or refreshes an upward/forward launch.
- The knife rotates while airborne.
- Further taps can be accepted before landing.
- Blade contact cuts or sticks; bad contact bounces, rotates, or fails.
- The player advances through a linear 3D course toward a finish or survival goal.

The important differences are how much precision the systems expose, how clearly
the player can read the knife, and how satisfying the contact response is.

### Control scorecard

| Dimension | Astrocade | VOODOO | Chopline |
| --- | ---: | ---: | ---: |
| Tap responsiveness | 9.0 | 9.0 | 9.0 mechanically |
| Airborne multiple taps | 9.0 | 9.0 | 9.0 mechanically |
| Landing-system depth | **9.0** | 8.0 | **9.0 mechanically** |
| Landing readability | 7.0 | **8.5** | 4.5 |
| Cut qualification | 8.5 | **9.0** | 8.5 mechanically |
| Cut satisfaction | 7.5 | **9.5** | 6.0 |
| Level rhythm | 8.0 | **8.5** | 8.0 structurally |
| Perceived fairness | 8.0 | 7.5 | 6.0 |
| Retry continuity | 8.5 | 3.5 | **9.0** |

### Astrocade Slice Rush

**Pros**

- The deepest explicit landing grammar of the three. It distinguishes top,
  bottom, front, back, side, and roof contacts.
- A blade landing sticks. A wrong-angle or handle platform contact enters a
  rotating-to-stick state, giving the blade time to catch instead of producing a
  binary fail.
- Face-dependent relaunches are meaningful: top launches normally, bottom launches
  downward with a reduced coefficient, and side stabs launch away from the face.
- Airborne taps are real multiple jumps. Each accepted tap after the 0.4 second
  cooldown refreshes launch velocity and advances the rotation target.
- Blade and handle use separate oriented collision volumes, midpoint checks, and
  fixed 1/120 second substeps. This makes fast cuts and edge contacts relatively
  robust.
- Slice mode locks forward motion through a stack, widens sibling collision briefly,
  and allows a satisfying chain through aligned targets.
- Handle contact looks ahead for an imminent blade hit; otherwise it reverses
  forward velocity and bounces.
- Thirty authored levels include platforms, roofs, moving hazards, stacks, and
  finish conditions. Endless mode draws 318 authored platform/object templates
  from those levels rather than scattering unrelated primitives.
- No advertising interrupts the control loop.

**Cons**

- The control object is often too small and low contrast to read its edge precisely.
- Large foreground targets and decorative objects frequently occlude the knife and
  next platform, especially in endless mode.
- Landing snaps immediately into the stored pose. The logic is sophisticated, but
  the impact itself has little visible weight.
- The collision system is still authored OBB/AABB logic rather than geometry-driven
  contact. It can be consistent without always looking physically natural.
- The 10-second endless score timer creates urgency, but it discourages cautious
  platforming and can turn a readable precision loop into forced forward spam.
- Prebuilt target halves limit cut-plane variety.

### VOODOO Slice It All!

**Pros**

- Best immediate control read. The red-handled silver knife is large, correctly
  oriented, and visible against every background used in the captured levels.
- Repeated airborne taps are central to the game. A rapid chain completed Level 1
  without requiring intermediate landings.
- Metadata exposes `InitialKick`, `TapRotate`, `ControlledRotation`, a speed-based
  rotation variant, per-tap angle additions, jump force, rotation limits, and
  direction controls. The motion is intentionally tuned rather than a canned tween.
- Collision handling separates cuts, ground hits, safe-point stabs, knockback, and
  death. Physics settings separately control mass, explosion radius, force reduction,
  upward force, and target layers.
- The course framing makes the next wall or target obvious. The player spends less
  attention decoding the environment and more attention timing the knife.
- Safe points, finish zones, percentage/slice progression, combos, multipliers, and
  reward sequences make each run feel consequential.
- The package contains 150 authored level chunks, 55 obstacle prefabs, multiple
  worlds, special modes, and target-specific behavior.

**Cons**

- Exact thresholds remain opaque because the build is IL2CPP. A slow single-tap
  Level 2 attempt visibly reached the wall blade-first but did not cut and failed,
  showing that the game applies an additional angle, speed, state, or collision-region
  qualification that the player cannot directly see.
- Early play strongly rewards repeated tapping. It is immediately fun, but offers
  less visible platform-face mastery than Astrocade's top/bottom/side system.
- The reward and monetization layer repeatedly interrupts the core loop. The tested
  first session included a startup interstitial, persistent banner, timed overlay,
  inter-level playable ad, free-knife screen, and event popup.
- Revive and retry timing is controlled partly by ad availability and countdowns,
  making failure recovery substantially worse than the other two games.
- Strong automation and authored target behaviors can occasionally make contact
  feel predetermined rather than emergent.

### Chopline Rush

**Pros**

- The strongest fact in Chopline's favor is measurable parity with Astrocade's
  mechanics. The current deterministic comparison reproduced matching motion and
  slice outputs at every tested checkpoint.
- It uses the same 10 upward force, 8 forward force, -20 gravity, 7 rotation speed,
  0.4 second cooldown, 1/120 second substeps, blade/handle reaches, and face-dependent
  landing rules.
- It implements multiple airborne taps, source-platform guards, side and bottom
  launches, rotating-to-stick recovery, handle bounce, slice mode, stack collision
  widening, moving platforms, roofs, and tumble failure.
- The 30 imported levels and 318-template endless pool preserve the reference's
  authored layouts and object vocabulary.
- Target halves use the same deterministic launch velocities and slide/fall/ground
  phases as the Astrocade reference.
- Retry is immediate and ad-free. PlayDrop progression, achievements, leaderboards,
  cosmetics, revive, and reward paths exist without advertising takeover.

**Cons**

- The visual knife does not reliably communicate the collision knife. The fixed
  blade/handle OBBs assume a specific pivot and blade direction, while each imported
  GLB is normalized through a longest-axis heuristic.
- `rotateLongestKnifeAxisToY` only finds the long axis. It cannot determine which end
  is the blade. The next step anchors the model's maximum Y bound as the blade tip,
  so an asset with the opposite orientation can be inverted while still passing all
  geometry and physics tests.
- The starter is a broad chopping cleaver. Its silhouette, center of mass, and
  apparent pivot are very different from the narrow reference knife, making the
  same angular motion look heavier and less controlled.
- The ready pose looks as though the cleaver is lying or hovering over the platform,
  not stabbed into it. The first action therefore begins from an already-unconvincing
  state.
- The model is larger and darker than the reference. During flight it occludes more
  of the trajectory and makes rotation harder to judge.
- When visual blade contact and invisible OBB contact disagree, the player interprets
  an internally correct outcome as unfair.
- The stale mechanics-proof test means the most important player paths are not
  currently protected by the normal release-quality evidence expected for this game.

### Core gameplay ranking

- **Best immediate feel:** VOODOO.
- **Best control depth:** Astrocade.
- **Best underlying clone accuracy:** Chopline, but only internally.
- **Best uninterrupted retry loop:** Chopline.
- **Best overall current core loop:** VOODOO, narrowly ahead of Astrocade.

## 2. Visuals

### Visual scorecard

| Dimension | Astrocade | VOODOO | Chopline |
| --- | ---: | ---: | ---: |
| Knife silhouette and orientation | 6.0 | **9.5** | 4.0 |
| Art-direction cohesion | 8.0 | **8.5** | 5.0 |
| Target readability | 6.5 | **9.0** | 6.0 |
| Mobile camera/framing | 6.5 | **9.0** | 6.0 |
| Environment identity | **8.0** | 7.5 | 7.5 |
| Lighting/material response | 7.0 | **8.5** | 5.5 |
| HUD clarity without interruptions | 7.5 | 8.0 | **8.0** |
| HUD clarity in the real tested session | 7.5 | 4.0 | **8.0** |

### Astrocade Slice Rush

**Pros**

- Strong candy-world identity: pink ground and sky, mint platforms, lollipop trees,
  low-poly mountains, clustered clouds, and purple hazards.
- The scene is recognizable immediately and visually distinct from generic white-
  platform hypercasual games.
- Rounded HUD typography, brown score pill, purple pause, and yellow shop controls
  form a coherent visual system.
- Sliceable families have recognizable shapes and strong color coding.
- Oblique perspective exposes the lateral motion of split halves and makes the
  world feel more three-dimensional than a strict side view.

**Cons**

- Visual hierarchy is weak. Background trees, clouds, mountains, targets, giant
  stacks, HUD, and knife frequently compete at the same saturation and scale.
- Objects near the camera can block the knife, score popup, landing platform, and
  even the cut itself.
- The default knife is pale and visually thin. It disappears against white
  platforms and bright backgrounds.
- Endless mode can look like an editor dump because authored chunks are generated
  without enough camera-aware culling or near-field composition rules.
- The palette is memorable but tiring over long sessions because nearly every band
  is highly saturated.

### VOODOO Slice It All!

**Pros**

- Best visual hierarchy. The knife, target, landing surface, and next decision are
  readable in less than a second.
- The red handle and silver blade create a reliable focal contrast against cyan,
  lime, white, gray, and brown environments.
- The side-on camera produces a clean silhouette and makes blade orientation easier
  to judge than the oblique Astrocade camera.
- Surfaces use simple but effective material variation, edge highlights, directional
  shadows, and texture detail. They remain stylized without looking unlit.
- UI uses large, legible blue/white shapes and clear iconography suited to a phone.
- Authored worlds vary the background and prop language while preserving control
  readability.

**Cons**

- Advertising damages the composition. Banner, overlay, countdown, and playable-ad
  UI can cover the exact screen region needed to preview motion.
- Meta and event panels are visually loud and can make the product feel like several
  interfaces layered over a simple game.
- The environment is clear but less distinctive than Astrocade's candy world.
- Some target stacks become debris-heavy enough to reduce the readability advantage
  during the most intense cuts.

### Chopline Rush

**Pros**

- Broad environment parity is high. Controlled frames measured about 0.92 SSIM,
  and the platforms, decorations, targets, camera, HUD placement, and seeded endless
  composition are visibly close to Astrocade.
- The candy-world identity, object families, hazards, and 30-level progression are
  present.
- Imported GLB knives provide a path to richer cosmetics than the reference's
  code-generated default knife.
- The ad-free HUD remains stable and readable.

**Cons**

- The focal object is the least coherent element in the entire scene. A dark,
  realistic-ish cleaver sits inside a bright toy-like world built around clean
  generated shapes.
- The starter material deliberately forces roughness to at least 0.72 and caps
  metalness at 0.05. That suppresses metallic blade response and directly contributes
  to the flat, untextured appearance.
- The current start panel makes the defect obvious: Astrocade shows a small planted
  knife, VOODOO shows a prominent planted knife, and Chopline shows a dark cleaver
  lying at an ambiguous angle.
- Lighting is flatter and slightly murkier than the reference in the controlled
  frames. Mountains, clouds, and targets lose some color separation.
- Chopline inherits Astrocade's occlusion and density problems, then adds a larger
  knife and darker focal material.
- A full-frame similarity metric overstates quality because the shared pink
  environment dominates the pixels while the player watches the mismatched knife.

### Visual ranking

- **Best gameplay readability:** VOODOO.
- **Best environmental identity:** Astrocade.
- **Closest environment clone:** Chopline.
- **Best current knife presentation:** VOODOO by a wide margin.
- **Worst focal-object cohesion:** Chopline.

## 3. Animation, juice, and polish

### Animation and juice scorecard

| Dimension | Astrocade | VOODOO | Chopline |
| --- | ---: | ---: | ---: |
| Flip motion | 8.0 | **9.0** | 7.0 perceived |
| Trail/readability | 7.5 | **8.5** | 7.5 |
| Cut-fragment physics | 8.0 | **9.5** | 8.0 mechanically |
| Cut contact emphasis | 6.5 | **9.5** | 5.5 |
| Landing impact | 6.5 | **8.5** | 4.5 |
| Score/reward feedback | 7.5 | **9.0** | 7.0 |
| Camera feedback | 5.5 | **8.0** | 6.0 |
| Audio variation | 7.0 | **8.5** | 7.0 |
| Haptics | 0.0 | **9.0** | 0.0 |
| UI animation | 7.5 | **8.0** | 7.5 |

### Astrocade Slice Rush

**Pros**

- Smooth continuous rotation and a fading ribbon trail make the flight arc readable.
- Successful cuts spawn ten material-colored particles and two object-specific halves.
- Halves first slide laterally, then fall, tumble, contact the ground, and settle.
  This makes a cut persist in the world instead of disappearing instantly.
- Score popups animate from small to oversized and drift upward.
- Bounce, stick, flip, soft slice, wood slice, failure, victory, and music sounds are
  distinct.
- Failure includes a gravity-driven tumble and post-landing wobble before the result.
- UI hints pulse, buttons compress, and screens transition consistently.

**Cons**

- Ordinary slice contact has no hit stop, meaningful camera impulse, haptic response,
  or blade deformation. The fragments provide most of the satisfaction after the
  contact, not at the contact.
- Landing is functionally correct but visually abrupt. The knife snaps into a pose
  and plays a sound without a convincing embed, rebound, or camera response.
- Generic cubic particles can feel detached from round fruit, bread, books, or wood.
- Because cuts are frequently occluded, good animation work is not always visible.

### VOODOO Slice It All!

**Pros**

- Strongest contact-to-reward chain: readable blade impact, separated target geometry,
  visible interior faces, rigidbody movement, debris, score ticks, coin changes,
  praise text, sound, and haptic feedback.
- The package contains a real mesh-cut path with left/right mesh generation, new
  vertices/triangles, normals, UVs, tangents, and cut-face capping. It also contains
  prefab-rich breakables for target-specific responses.
- `KnifeTarget` assets carry cap material, score, target type, bonus, and event data.
- Physics effects separately tune mass, explosion multiplier, radius, upward force,
  and target layers.
- `HapticsFeedbackSO`, `SoundFeedbackSO`, and `VfxFeedbackSO` show that feedback
  channels are authored independently instead of being incidental side effects.
- Trail, rotation, fragment motion, and camera movement preserve the knife as the
  center of the effect.
- Finish and reward sequences extend the juice beyond the cut into progression.

**Cons**

- The effect stack can become noisy when many targets break at once.
- Some wall targets break as authored chunks rather than producing a clean arbitrary
  plane, so the exact visual response varies by target.
- Reward animation is often followed immediately by monetization UI, erasing the
  pacing benefit.
- The sheer number of feedback systems increases the risk of inconsistent behavior
  between old and new target families.

### Chopline Rush

**Pros**

- Flight trail, particles, target-specific halves, score popup, audio, tumble, wobble,
  UI pulse, and result transitions are implemented.
- In deterministic tests, fragment spawn count, phase, lateral spread, and velocity
  match Astrocade exactly.
- Chopline adds success/danger screen flashes and camera shake on goal reached and
  failure.
- The audio set covers music, soft slice, wood slice, flip, stick, bounce, game over,
  victory, hazard, coin, and buttons.

**Cons**

- Correct animation is attached to an incorrectly presented knife. The result reads
  as a cleaver rotating around an arbitrary pivot rather than a blade flipping from
  its embedded tip.
- `landingPunch` exists in state but is only reset to zero; ordinary landings never
  raise it. The named polish feature is effectively unimplemented.
- A `slice` flash style and `flashFeedback("slice")` type exist, but ordinary cuts do
  not call it.
- Camera shake is limited to reaching the score goal and failure. Ordinary cuts and
  blade sticks get no camera impulse.
- There is no haptic integration.
- The starter's deliberately dull material removes the specular sweep that would
  make rotation and blade orientation easier to read.
- Cuts use authored replacement halves and generic particles, matching Astrocade but
  falling well short of VOODOO's dynamic cap geometry and contact-specific physics.
- There is no short hit stop, time dilation, blade flex, embed recoil, or layered
  contact feedback.
- Because the knife can visually lie on the platform after a stick, even correct
  landing sound and state transitions feel unsatisfying.

### Polish ranking

- **Best cut juice:** VOODOO.
- **Best failure/retry pacing without monetization:** Chopline.
- **Best coherent browser implementation:** Astrocade.
- **Most technically accurate but perceptually undermined:** Chopline.
- **Most commercially mature and most interrupted:** VOODOO.

## What each game should contribute to the target design

### Keep from Astrocade

- Multiple airborne taps with a short cooldown.
- Separate blade and handle collision logic.
- Top, bottom, side, and roof sticking.
- Rotating-to-stick recovery instead of unfair binary failure.
- Slice mode through aligned stacks.
- Authored level chunks and moving hazards.
- Ad-free, immediate retry.

### Learn from VOODOO

- Large, unmistakably oriented knife silhouette.
- Per-model materials that clearly separate blade and handle.
- Camera framing that reserves clean space around the knife and next target.
- Dynamic or convincingly pre-authored cut geometry with visible interior caps.
- Material-specific debris and rigidbody tuning.
- Hit stop, camera impulse, haptics, layered sound, score cascade, and praise feedback.
- Strong finish and reward choreography without copying the ad burden.

### Remove from Chopline

- Longest-axis-only knife orientation.
- Automatic assumption that maximum local Y is the blade tip.
- Starter material settings that suppress metalness and blade highlights.
- A starter cleaver whose silhouette and pivot do not match the control geometry.
- Dense near-camera decoration that hides the cut.
- Unused polish state and CSS that gives false confidence in landing/cut juice.

## Recommended target

The best product is not a literal copy of either reference:

- **Control system:** Astrocade.
- **Knife readability and contact payoff:** VOODOO.
- **Level content foundation:** current imported Astrocade levels, edited with
  camera-aware density rules.
- **Business experience:** Chopline's ad-free PlayDrop loop.

## Priority plan for Chopline

### P0: Make the control object truthful

1. Replace axis heuristics with explicit per-model metadata: orientation quaternion,
   blade-tip point, hilt point, pivot, visual scale, and embed direction.
2. Use the specifically approved knife as the starter and verify the actual GLB,
   material textures, blade direction, and tip location.
3. Derive or validate collision OBBs from that metadata so visual and logical contact
   cannot disagree.
4. Make the ready pose visibly blade-embedded on top, bottom, and side surfaces.
5. Restore a metallic blade response while preserving texture detail.

### P0: Make cutting the main event

1. Add true mesh splitting with generated interior cap material, or use high-quality
   target-specific halves whose cut plane exactly matches the blade.
2. Add 40-70 ms hit stop, a small camera impulse, haptic pulse, per-material sound,
   and material-specific debris at the contact frame.
3. Keep the existing deterministic fragment fall behavior after the contact.
4. Cull or reposition foreground objects so the cut remains visible.

### P1: Make landing satisfying

1. Implement the existing landing-punch concept instead of resetting an unused value.
2. Add a short embed movement, rebound/wobble, contact spark or chip, camera impulse,
   and distinct blade-stick versus handle-contact feedback.
3. Preserve Astrocade's rotating-to-stick forgiveness and face-dependent relaunches.

### P1: Protect the core loop with real evidence

1. Repair the stale `proof:mechanics` selector.
2. Require current mobile-portrait evidence for first tap, second airborne tap,
   successful cut, blade landing, handle bounce, hazard failure, and restart.
3. Include a debug overlay or automated assertion that compares rendered blade tip
   and hilt positions with their collision OBBs.
4. Keep the deterministic Astrocade comparison as a regression test, but do not use
   full-frame similarity as a substitute for focal-object inspection.

## Final assessment

Chopline is not far behind because its whole simulation is wrong. It is behind
because the most important object in the game does not truthfully visualize that
simulation, and because ordinary cuts and landings receive much less contact feedback
than VOODOO. Fixing the knife transform/material contract and then concentrating juice
at cut and landing contact will produce a much larger gain than adding more levels,
currencies, menus, or cosmetics.

