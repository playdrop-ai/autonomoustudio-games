# Whiteout Watch

## Original Game Name

Whiteout Watch

## One-line Player-facing Value Proposition

Keep an isolated storm station alive through escalating whiteouts by restoring heat, power, and comms before the whole board goes dark.

## Best Platform

`mobile portrait`

## Additional Supported Platforms

- `desktop`

## Gameplay Family

Single-screen real-time crisis triage / meter-balancing game.

## Proven Reference Loop And Why Players Will Understand It Immediately

The core loop is the proven real-time triage pattern used by emergency-management and operations games: watch multiple critical systems drift toward failure, spend a limited action resource on the most urgent one, accept that saving one subsystem may endanger another, and stay alive as pressure escalates. Players understand this immediately because the language is plain red-vs-safe survival management, not an invented grammar.

## Allowed Novelty Beyond The Reference Loop

The novelty stays outside the core language of triage:

- the setting is a whiteout-beaten remote weather station instead of a generic sci-fi console
- each system affects a different part of the player's control surface:
  - low `Heat` increases global drain
  - low `Power` slows battery recharge
  - low `Comms` scrambles the next storm forecast
- the whole game is framed as one thumb-friendly portrait shift instead of a larger sim

The player still learns one core behavior: spend limited stabilizing pulses on the right failing system before the station collapses.

## Game Meta

One endless shift per run, local best-time score chase, and escalating storm pressure with no extra progression systems in v1.

## Input

- Mobile portrait: tap one of the three system panels to spend one charged battery pulse and restore that system.
- Desktop: click one of the three system panels to spend one charged battery pulse and restore that system.

## Game Category And Subcategory

- Category: Strategy
- Subcategory: Crisis management / survival

## Reference Games

- `FTL` for proven multi-system emergency triage pressure
- `Watair` as public PlayDrop proof that minimal survival-management framing is viable on the platform
- the current studio catalog in `/Users/oliviermichon/Documents/autonomoustudio-games` for negative space: `Whiteout Watch` must not collapse into another route puzzler, timing sorter, or tower-defense lane

## Art Direction

Cold, instrument-grade portrait dashboard: deep navy and slate panels, frosted glass edges, red alert bands, ice-blue battery glow, wind streaks outside the station windows, and restrained weather-map linework behind the system panels.

## Why The Art Direction Is Achievable With Available Assets, AI Generation, Or Simple Custom Work

The shipped runtime can be built from shaped panels, gradients, simple iconography, light particle weather, and strong typography inside the PlayDrop TypeScript template. It does not require a character pipeline, heavy animation set, or complex asset pack dependency.

## Target Player And Why That Player Already Likes The Proven Loop This Game Is Built On

The target player already likes short, high-clarity pressure games where prioritization matters more than dexterity. They enjoy reading a failing situation fast and making the right save under pressure.

## Why The Fiction, Story Wrapper, And Marketing Promise Intensify The Same Player's Desire Instead Of Targeting A Different Audience

The whiteout-station wrapper intensifies the same appeal instead of chasing a different audience. The player is still triaging systems, but now every choice reads as keeping a remote outpost alive through a visible storm instead of babysitting abstract bars.

## What The Player Is Trying To Uncover, Protect, Collect, Or Avoid, And Why The Fail State Makes Intuitive Sense Inside That Fantasy

The player is trying to protect three critical station systems:

- `Heat`, so the crew and machinery do not freeze
- `Power`, so the station can keep generating stabilizing battery pulses
- `Comms`, so incoming storm pressure can still be read clearly before it lands

The fail state is intuitive: if any system fully collapses, the outpost is lost in the whiteout and the shift ends.

## Why The Player's Main Verb Feels Satisfying, Aspirational, Mischievous, Or Otherwise Desirable Inside The Fantasy Instead Of Mean, Foolish, Or Self-defeating

Tapping a system to restore it feels like decisive crisis response. The player is saving a station under pressure, not harming something they are meant to care about.

## Why A Player Would Want This Instead Of The Best-known Game In The Same Lane

The strongest games in this lane often sprawl into larger management sims. `Whiteout Watch` compresses the same satisfying emergency-priority decisions into a portrait-first, one-screen, one-thumb run that feels immediate on phone without becoming a passive idle dashboard.

## The Brutally Honest One-line Description Of The Concept And Why It Does Not Collapse Into "Famous Game X With A Skin"

Brutally honest description: `A one-thumb crisis triage game where you keep heat, power, and comms from collapsing during escalating whiteouts.`

That does not collapse into `famous game X with a skin` because the pitch is not hiding behind a borrowed title or a pure theme swap. The player-facing promise is the compact portrait emergency board, the three linked failure channels, and the forecast-vs-battery tradeoff, not a renamed wrapper on a single famous template.

## Why The One- Or Two-sentence Pitch Creates Immediate Desire Instead Of Merely Sounding Coherent

The pitch sells a clear fantasy and visible pressure immediately: keep a storm station alive while the weather gets worse and your information starts disappearing. That is more desirable than a generic `manage some bars` description because the danger, urgency, and control fantasy are legible in one glance.

## What Promise The Title, Icon, Hero, And First 15 Seconds Will Imply, And Why The Shipped Gameplay Will Honestly Fulfill That Promise

They should imply a frosted emergency dashboard, a station barely holding together, and fast decisive saves under storm pressure. The real first `15` seconds will honestly show exactly that: one system dipping into red, one charged pulse spent to recover it, a forecast card warning the next storm hit, and visible whiteout pressure building across the screen.

## Why The Concept Supports A Real Player Session Instead Of A One-clear Toy

This is an endless score game, not a one-clear toy. Escalating storm patterns, interdependent system failures, and best-time chasing support repeat runs and rising mastery.

## What Keeps Players Engaged After The First Clear: Authored Depth, Score Chase, Variation, Progression, Or Another Concrete Replayability Source

Replayability comes from score chase, stronger storm escalation, learning the system dependencies, and pushing deeper runs once players understand when to preserve forecast visibility versus recharge speed versus raw survival.

## Why The Game Is Distinct From The Studio's Existing Catalog

The live studio catalog already covers route deduction, route toggling, cluster matching, fishing timing, tower defense, skiing, rhythm, and card sequencing. `Whiteout Watch` opens a dedicated crisis-triage lane with interdependent survival systems instead of another puzzle board or wrapper-only arcade variant.

## If A Starter, Demo, Template, Or Remix Path Is Involved, What The Player Will See In The Strongest Screenshot And First 15 Seconds That Makes The Game Clearly Not That Source

No starter, demo, or remix path is involved beyond the PlayDrop TypeScript template scaffold. The strongest screenshot and first `15` seconds will be fully owned by the frozen portrait dashboard, the three named systems, the battery pulses, the storm forecast strip, and the whiteout pressure effects rather than any inherited template output.
