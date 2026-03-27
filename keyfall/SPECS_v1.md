# Keyfall - SPECS v1

## Original Game Name

Keyfall

## One-line Player-facing Value Proposition

Tap, hold, and chord glowing keys down a minimalist 3D runway before misses break the set.

## Clear Differentiator

The game is an endless portrait-first rhythm runway, not a flat tile tapper. It scores timing accuracy, introduces holds and two-lane chords, rotates through multiple generated songs during one run, and changes speed and lighting by phrase so the run feels like a live set rather than a single looping pattern.

## Best Platform And Why It Is Best

`mobile portrait`

Portrait keeps the four-lane runway tall, readable, and thumb-friendly. It lets the player read incoming notes and the strike line in one glance while keeping the scene edge to edge with almost no side chrome.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: a four-key layout maps cleanly to the four lanes, and the same camera framing still reads without adding extra UI.

## Gameplay Family

Endless lane-based rhythm runner.

## Game Meta

One endless score run with best-score persistence, longest-combo persistence, and a rotating soundtrack pool.

## Input Per Supported Platform

- Mobile portrait: tap one of four bottom-lane hit areas, keep finger down for holds, and press two lanes together for chords.
- Desktop: `D`, `F`, `J`, `K` for lanes, `Space` to start or retry, optional click fallback for lane taps.

## Game Category And Subcategory

- Category: Arcade
- Subcategory: Rhythm runner

## Reference Games We Are Intentionally Close To

- `Piano Tiles` for lane urgency only.
- `Beatstar` for accuracy scoring, holds, and chord notation only.
- `Thumper` for tunnel-forward audiovisual pressure only.
- `starter-kit-3d-platformer` for practical Three.js + PlayDrop build structure only.

## Core Loop

1. Read the next beat cluster on a four-lane runway.
2. Hit tap notes at the strike line with `perfect`, `good`, or `miss` timing.
3. Hold long notes through their tail and press both lanes together for chord notes.
4. Build combo and phrase score while protecting a four-pip life meter.
5. Survive phrase transitions as the speed, lighting, and track selection shift.
6. Chase a higher score and longer combo after the run breaks.

## Rules

- Lanes: `4`
- Note types: `tap`, `hold`, `chord`
- Hit line: fixed near the bottom safe area
- Timing windows:
  - `perfect`: within `70ms`
  - `good`: within `130ms`
  - `miss`: later or earlier than `130ms`
- Score:
  - `perfect`: `100`
  - `good`: `70`
  - hold tick per sustained beat: `20`
- Combo multiplier: rises by `+1` every `20` consecutive notes, capped at `x5`
- Life meter: `4` pips
- Damage:
  - missed tap: `-1` pip
  - missed chord lane: `-1` pip
  - early hold release: `-1` pip
- Phrase length: `16` beats
- Phrase ramp: every `2` phrases, scroll speed rises and note density gains more off-beats, holds, or chords
- Music pool: `5` short instrumental tracks generated in PlayDrop AI, each with locked BPM metadata
- Music rotation: track changes on phrase boundaries so the soundtrack evolves during one run
- Loss rule: run ends at `0` life

## Main Screens And What Each One Shows

- Start overlay:
  - title
  - one-word `Play` CTA
  - tiny chip for current music pool count
- Gameplay:
  - score
  - combo
  - four life pips
  - compact next-4-beat preview strip
  - full-viewport runway with no boxed card framing
- Game-over overlay:
  - final score
  - best
  - combo peak
  - one-word `Retry` CTA

## Core Interaction Quality Bar

- The leading edge of every note must align cleanly to the strike line with no visual wobble.
- Lane hit areas must feel generous enough for thumbs without making desktop input ambiguous.
- Hold trails must stay visually anchored to their head note and tail endpoint.
- Chord notes must read instantly as simultaneous presses, not as two unrelated blocks.
- Miss, hit, and phrase-transition feedback must land within one frame of the input result.
- The runway must stay readable at phone size without relying on labels or tutorial copy.

## Strongest First-minute Feeling

The player should feel like they have locked into a clean electronic set and are just barely staying ahead of a runway that keeps asking for more precision.

## HUD And Screen Plan

- Gameplay HUD stays at the edges only.
- No full-width title bar, footer, or persistent instruction panel.
- The center lane space stays clear during play.
- Life pressure is visible as four compact pips near the score cluster.
- Upcoming pressure is visible as a tiny next-4-beat strip instead of text instructions.

## Art Direction And Asset Plan

- Camera: fixed forward perspective, slightly elevated, centered on a narrowing four-lane runway
- Palette: matte charcoal, ivory lane slabs, cyan guide lights, amber hit flashes, magenta accent glow
- Materials: mostly flat and satin, with restrained glass only on notes and phrase gates
- Environment: minimal tunnel ribs, horizon glow, and phrase markers rather than detailed scenery
- Notes: beveled prisms for taps, stretched rails for holds, linked dual prisms for chords
- Audio:
  - `5` PlayDrop-generated instrumental tracks
  - up to `5` lightweight SFX for hit, perfect, miss, phrase-up, and fail
- Listing art: AI-generated hero/icon based on a real gameplay screenshot and the same runway language

## Tech Approach And Code Structure

- TypeScript browser app built from the PlayDrop TypeScript template
- Simulation state lives outside Three.js scene objects
- Proposed modules:
  - `src/main.ts` boots PlayDrop host, loading, renderer, HUD, and loop
  - `src/game/state.ts` owns serializable game state and progression
  - `src/game/chart.ts` generates phrase patterns from BPM, difficulty tier, and seeded song metadata
  - `src/game/input.ts` maps touch, pointer, and keyboard input to lane actions
  - `src/game/audio.ts` preloads music and Web Audio SFX, unlocks on first gesture, and handles phrase crossfades
  - `src/render/scene.ts` owns renderer, camera, lights, and resize
  - `src/render/runway.ts` draws lanes, notes, strike line, and phrase gates
  - `src/ui/hud.ts` owns the minimal DOM HUD and overlays
  - `tests/logic.test.ts` covers timing windows, combo, life loss, and phrase ramps
  - `scripts/simulate-balance.ts` runs idle, casual, and expert policy sweeps
  - `scripts/render-mockups.mjs` and `scripts/capture-gameplay.ts` generate mockup and capture support

## Testing Plan

- Deterministic logic tests for timing windows, note resolution, combo, life loss, and phrase ramps
- `npm run validate`
- `playdrop project validate .`
- scripted balance sweeps for `idle`, `casual`, and `expert`
- real browser checks for portrait mobile and desktop keyboard play
- hosted verification on the same surfaces after publish

## Target Player Session Length, Target Skilled Run Length, And Replayability Plan

- Endless score game targets:
  - idle median: under `20s`
  - casual median: `60-120s`
  - expert median: `300s+`
  - expert p25: `240s+`
- Skilled run target: `300-480s`
- Replayability sources:
  - rotating track pool
  - speed and density escalation by phrase
  - combo chase
  - accuracy chase
  - best-score persistence

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon: one glowing key prism diving toward a bright strike line
- Hero: the full four-lane runway with two chords arriving together inside a cyan-magenta tunnel
- Screenshot 1: clean combo streak with a visible chord
- Screenshot 2: tense late-run state with low life and dense preview
- Gameplay video: start directly on active gameplay, show perfect hits, a hold, a chord, a phrase-speed jump, and a clean fail state

## Complexity Likely To Be Challenged In The Simplify Step

- Whether `5` music tracks are too many for v1
- Whether phrase-to-phrase crossfades are worth their complexity
- Whether the preview strip should show `4` beats or fewer
- Whether combo, life, and song label can all coexist without clutter
