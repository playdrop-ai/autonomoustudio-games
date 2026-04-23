# Whiteout Watch - SPECS v1

## Original Game Name

Whiteout Watch

## One-line Player-facing Value Proposition

Keep an isolated storm station alive through escalating whiteouts by restoring heat, power, and comms before the whole board goes dark.

## Clear Differentiator From The Reference Games

The game keeps the proven crisis-triage loop, but each system attacks a different part of the player's decision quality:

- low `Heat` increases global drain
- low `Power` slows battery recharge
- low `Comms` scrambles the next storm forecast

That means the first minute is not just `tap the lowest bar`. The player is deciding whether to preserve raw survival, action economy, or future information.

## Best Platform And Why It Is Best

`mobile portrait`

Portrait lets the three system columns stack into one quick glance, keeps the battery strip in easy thumb reach, and makes the storm dashboard feel like a handheld instrument rather than a shrunken desktop panel.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: the same three-panel dashboard can sit centered in a full-viewport layout, and click input maps cleanly to the same single-action grammar without extra HUD complexity.

## Gameplay Family

Single-screen endless crisis-triage survival game.

## Game Meta

One endless mode, local best-time tracking, escalating storm severity, and no unlock tree, currency, or meta progression in v1.

## Input Per Supported Platform

- Mobile portrait:
  - Primary action: tap a system panel to spend `1` charged battery pulse and restore that system.
  - Secondary actions: none in the core loop.
  - High-stakes taps: the restore targets are always explicit, large, and visible.
- Desktop:
  - Primary action: click a system panel to spend `1` charged battery pulse and restore that system.
  - Secondary actions: none in the core loop.

## Game Category And Subcategory

- Category: Strategy
- Subcategory: Crisis management / survival

## Reference Games We Are Intentionally Close To

- `FTL` for proven multi-system survival triage pressure
- `Watair` as a PlayDrop-native survival-management reference point
- short-form mobile pressure games where a single screen and clear prioritization create the run

## Core Loop

1. Start a shift with all three systems stable and `3` charged battery pulses.
2. Watch storm pressure tick down the station:
   - `Heat` drifts down at a steady baseline rate
   - `Power` drifts down more slowly but controls recharge speed
   - `Comms` drifts down in bursts and controls forecast clarity
3. Read the next storm forecast while comms are healthy.
4. Spend a charged battery pulse on the system that matters most right now.
5. Survive the incoming storm hit and the passive drift that follows.
6. Keep triaging as storm pressure escalates until one system collapses and the shift ends.

## Final Rules For The Planned v1

- Systems:
  - `Heat`
  - `Power`
  - `Comms`
- Each system has a meter from `0` to `100`.
- If any system reaches `0`, the run ends immediately.
- The player starts with `3` charged battery pulses.
- Battery pulses recharge over time up to a maximum of `3`.
- Recharge speed scales with current `Power`:
  - healthy power: normal recharge
  - low power: visibly slower recharge
  - critical power: very slow recharge
- Tapping a system panel spends `1` charged battery pulse and restores `24` points to that system instantly.
- Passive drift:
  - `Heat` loses `3` points per second
  - `Power` loses `1.6` points per second
  - `Comms` loses `1.2` points per second
- System penalties:
  - below `35 Heat`: all system drift increases by `20%`
  - below `25 Heat`: all system drift increases by `40%`
  - below `35 Power`: pulse recharge slows by `25%`
  - below `25 Power`: pulse recharge slows by `50%`
  - below `35 Comms`: the next storm forecast loses exact damage values and shows only target systems plus countdown
  - below `25 Comms`: the next storm forecast becomes noisy and only shows a partial target hint plus countdown
- Storm events land every `5-7` seconds and hit one or two systems.
- v1 storm event pool:
  - `Ice Squeeze`: `Heat -18`
  - `Rotor Stall`: `Power -16`
  - `Signal Burial`: `Comms -20`
  - `Crosswind Leak`: `Heat -10`, `Power -10`
  - `Static Wall`: `Power -8`, `Comms -14`
  - `Frozen Mast`: `Heat -8`, `Comms -12`
- Storm severity escalates every `20` seconds by tightening event cadence and raising event damage slightly.
- Score is survival time in seconds.
- Best score is stored locally.

## Hazard, Reward, And Fail-state Signifiers

- Reward:
  - bright ice-blue pulse traveling into the restored system
  - healthy system panels shifting toward calm cyan or white
  - full battery pips with a crisp glow
- Hazard:
  - red alert bands on critical meters
  - frosted occlusion deepening as systems weaken
  - upcoming storm card with clear damage arrows while comms survive
- Fail state:
  - full whiteout takeover, alert banner, and dead panel lock when a system hits zero

The player should instantly read blue-white recovery as safety, red bands as danger, and the storm card as an incoming threat rather than a reward.

## Main Screens And What Each One Shows

- Start overlay:
  - title
  - one-line hook
  - single `Start Shift` CTA
  - one short controls line
- Gameplay:
  - three stacked or columned system panels
  - battery pulse strip
  - survival timer
  - next storm forecast strip
  - visible storm intensity state
- Run-end overlay:
  - final survival time
  - best time
  - one-line collapse cause
  - retry CTA

## Core Interaction Quality Bar

- The three system panels must read as the whole game, not as widgets on a webpage.
- Critical, warning, and healthy states must be distinguishable instantly at phone scale.
- Spending a pulse must feel decisive, immediate, and satisfying.
- Battery recharge must feel visible enough that the player can plan around it.
- Forecast readability must clearly degrade when comms are in danger rather than disappearing ambiguously.
- Weather effects should intensify tension without obscuring the system state.
- The layout must stay full-viewport and edge-to-edge on the target portrait surface.

## HUD And Screen Plan

- Active-play HUD is minimal:
  - timer
  - battery pulse strip
  - next storm strip
- No tutorial modal, sidebars, currency counters, or decorative stat blocks during active play.
- The start and run-end overlays should still leave enough of the station dashboard visible that the game remains identifiable.

## Art Direction And Asset Plan

- Framing:
  - full-screen dashboard with subtle window framing only at the edges
- Palette:
  - deep navy, slate, and charcoal for panel structure
  - cold cyan and icy white for stable energy
  - warning amber for forecast and pulse spend
  - hard red for critical states
- Materials:
  - matte instrument panels
  - frosted glass accents
  - restrained bloom only on energy and alert edges
- Effects:
  - snow streaks
  - panel frost buildup
  - short pulse-transfer lines
- Asset scope:
  - custom panel shapes
  - simple icons for heat, power, comms
  - no character art, scene animation, or complex sprite pipeline

## Tech Approach And Code Structure

- Stay on the simple PlayDrop TypeScript app path.
- Use DOM/CSS for layout and HUD because this is a UI-first game.
- Use lightweight canvas or CSS effects only for weather streaks, pulse flashes, and background movement.
- Planned module split:
  - `src/main.ts`: boot, host integration, app state, loop, resize
  - `src/game/constants.ts`: tuning values and thresholds
  - `src/game/events.ts`: storm event generation and escalation
  - `src/game/state.ts`: runtime state, ticking, restore actions, lose checks
  - `src/ui/render.ts`: DOM updates, classes, bars, overlays, forecast strip
  - `src/ui/effects.ts`: weather, pulse, and alert effects

## Testing Plan

- Deterministic logic tests for:
  - pulse spending and cap behavior
  - recharge speed at each power threshold
  - heat penalty scaling
  - comms forecast visibility thresholds
  - storm event application
  - lose condition on system collapse
- `npm run validate`
- `playdrop project validate .`
- Browser QA on mobile portrait and desktop
- Hosted verification on the same surfaces after publish

## Target Session Length, Target Skilled Clear Or Run Length, And Replayability Plan

- Endless score game targets:
  - casual median: `75-110s`
  - expert median: `320s+`
  - expert p25: `250s+`
- Replayability comes from escalating storm patterns, better threshold management, and score chasing rather than extra content volume.
- There is no one-clear win state, so the game should hold up as repeated short-run mastery play instead of collapsing into a one-clear novelty.

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

The strongest raw screenshot is a frosted portrait dashboard with `Heat` pulsing red, `Power` in the middle yellow band, `Comms` barely holding, two battery cells charged, and a forecast strip warning the next incoming double-hit while snow lashes the glass. The first `15` seconds should show one visible forecast, one decisive restore pulse, one fresh storm impact, and the player immediately understanding that saving one system can make the next choice worse without losing the ability to read what is about to happen.

## The Failure Condition That Sends The Project Back To `01-idea`

Return to `01-idea` if the live build feels like generic bar babysitting, if the system dependencies are too weak to change first-minute decisions, or if the raw screenshot still reads like a prototype dashboard that needs listing art to become desirable.

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon:
  - a frosted warning panel with one bright pulse cell and one red system alert
- Hero:
  - full portrait dashboard under storm pressure with the title centered
- Screenshots:
  - one balanced but tense state with a visible forecast
  - one near-collapse state with a clear red-vs-blue survival read
- Gameplay video:
  - open straight on active gameplay
  - show a forecast hit, a restore pulse, a threshold penalty, and a close collapse save

## Complexity Likely To Be Challenged In The Simplify Step

- Multiple modes, difficulty presets, or unlock systems would add noise without strengthening the main promise.
- Any side tools beyond the main restore taps risk overcomplicating the one-thumb loop.
- Extra story scenes, crew simulation, or room-level maps would bloat the asset and engineering scope.

## Starter, Demo, Template, Or Remix Source-signature Removal Plan

The only starter path is `playdrop/template/typescript_template`. Before implementation, every visible template trace must disappear:

- opening beat: replace starter copy with the real `Whiteout Watch` shift dashboard
- framing: full-viewport storm station layout instead of a generic app page
- objective presentation: live `Heat`, `Power`, and `Comms` states, not scaffold text
- HUD: battery strip, timer, and forecast only
- visual identity: bespoke frosted panels, storm effects, alert colors, and restore-pulse treatment
