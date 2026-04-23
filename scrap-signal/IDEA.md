# Scrap Signal

## Original Game Name

Scrap Signal

## One-line Player-facing Value Proposition

Hold the beacon through a storm-lashed salvage shift by blasting scrap drones and hauling battery drops home before the blackout closes in.

## Best Platform

`desktop`

## Additional Supported Platforms

None in the initial release slot.

## Gameplay Family

Single-arena top-down beacon-defense shooter with a carry-and-bank repair loop.

## Proven Reference Loop And Why Players Will Understand It Immediately

The core loop is directly anchored to the proven twin-stick arena-survival and fixed-object-defense lane represented by `Robotron: 2084`, `Geometry Wars`, and `Crimsonland`. Those references are already documented in `/Users/oliviermichon/Documents/osgameclones/originals/r.yaml`, `/Users/oliviermichon/Documents/osgameclones/originals/g.yaml`, and `/Users/oliviermichon/Documents/osgameclones/originals/c.yaml`. Players understand this immediately: move, aim, shoot incoming threats, protect the central objective, and survive escalating waves.

## Allowed Novelty Beyond The Reference Loop

The novelty stays outside the primary action grammar:

- the player is not only killing enemies but also carrying one battery canister at a time back into the beacon to repair it
- the whole run is framed as a single rescue shift around one storm-lit signal tower instead of a generic free-roam score arena
- the strongest visual is the bright beacon halo cutting through a dark salvage field, not a field of abstract enemies

The player still learns one clear language: strafe, aim, fire, pick up the good object, and bring it back to the thing you are protecting.

## Game Meta

One structured rescue shift per run, local best score tracking, and replayable seeded wave variation with no extra progression systems in v1.

## Input

- Desktop: `WASD` to move, mouse to aim, hold left mouse to fire.

## Game Category And Subcategory

- Category: Action
- Subcategory: arena defense shooter

## Reference Games

- `Robotron: 2084`, `Geometry Wars`, and `Crimsonland` for the proven top-down survival-shooter language
- `Monster March` and `NEUROBOT` as current public PlayDrop comparisons that prove the lane exists on-platform but also show what `Scrap Signal` must avoid feeling like
- `Pocket Bastion` as a negative-space studio reference so this project does not collapse into another pad-upgrade defense game

## Art Direction

Storm-black water and steel, a cold white-blue beacon halo at center, rust-red drones and rammers, hot amber battery canisters, sharp tracer fire, and welding-spark hit feedback. The frame should read like a salvage beacon barely holding a harbor lane open at night, not like a toy neon grid or a placeholder debug arena.

## Why The Art Direction Is Achievable With Available Assets, AI Generation, Or Simple Custom Work

The live runtime only needs a clean top-down playfield, a few enemy silhouettes, a player skiff, battery canisters, bullets, splash or spark particles, and strong color separation. That is fully achievable in the simple PlayDrop TypeScript path with custom canvas drawing and light bespoke sprite work, without depending on a heavier engine or a risky remix starter.

## Target Player And Why That Player Already Likes The Proven Loop This Game Is Built On

The target player already likes tight desktop action games where movement, aim, and split-second prioritization matter more than stat spreadsheets. They already enjoy the top-down survival-shooter lane and the feeling of holding a center against mounting pressure.

## Why The Fiction, Story Wrapper, And Marketing Promise Intensify The Same Player's Desire Instead Of Targeting A Different Audience

The salvage-beacon wrapper sharpens the same action fantasy instead of chasing a different audience. The player still wants crisp aim, clean movement, and pressure management, but now every aggressive push outward has a clear reason: bring power back before the beacon dies and the channel goes dark.

## What The Player Is Trying To Uncover, Protect, Collect, Or Avoid, And Why The Fail State Makes Intuitive Sense Inside That Fantasy

The player is trying to protect the beacon, collect battery canisters from wrecked carriers, and avoid letting scrap drones ram the signal tower until it blacks out. That fail state is intuitive because if the beacon goes dark, the rescue shift is over and the harbor lane is lost.

## Why The Player's Main Verb Feels Satisfying, Aspirational, Mischievous, Or Otherwise Desirable Inside The Fantasy Instead Of Mean, Foolish, Or Self-defeating

Skimming out into danger, cutting down attackers, grabbing one glowing battery, and racing it back into the light reads as decisive, heroic salvage work. The verb feels protective and skillful, not mean or self-defeating.

## Why A Player Would Want This Instead Of The Best-known Game In The Same Lane

The strongest games in this lane often ask the player to wander and kill forever. `Scrap Signal` gives the same proven action loop a tighter first-minute purpose: you are not merely surviving, you are repeatedly deciding when to leave the safe ring, which carrier to kill, and when to bank the single battery you are carrying before the beacon cracks.

## The Brutally Honest One-line Description Of The Concept And Why It Does Not Collapse Into "Famous Game X With A Skin"

Brutally honest description: `A top-down arena shooter where you keep a beacon alive by killing incoming scrap drones and ferrying battery drops back into the light until rescue arrives.`

That does not collapse into `Geometry Wars with a skin` or `Monster March with a different color pass` because the battery-carry repair loop changes first-minute movement decisions, the central beacon objective owns the whole frame, and the strongest screenshot is about protecting and refueling a signal tower rather than wandering a kill arena.

## Why The One- Or Two-sentence Pitch Creates Immediate Desire Instead Of Merely Sounding Coherent

The pitch promises a visible fantasy and a clear job: hold the light in a storm. It sells the tension between aggressive shooting and desperate repair runs, which is more desirable than merely saying `there are waves and you shoot things`.

## What Promise The Title, Icon, Hero, And First 15 Seconds Will Imply, And Why The Shipped Gameplay Will Honestly Fulfill That Promise

They should imply a bright signal tower in a dark salvage field, a lone skiff fighting off red attackers, and one glowing battery run back to safety. The first `15` seconds should honestly show that exact loop: drones approaching from the dark, one carrier dropping an amber canister, and the player dragging it back into the beacon halo to keep the signal alive.

## Why The Concept Supports A Real Player Session Instead Of A One-clear Toy

One rescue shift should take several minutes to clear and should be tense enough that most fresh players will not win on the first try. Even after a clear, score improvement, cleaner beacon protection, and faster battery routing give the run a real replay loop.

## What Keeps Players Engaged After The First Clear: Authored Depth, Score Chase, Variation, Progression, Or Another Concrete Replayability Source

Replayability comes from seeded wave variation, higher clear scores, better beacon-preservation clears, and improved routing between carrier kills and repair deposits without needing a shop, unlock tree, or content-heavy campaign.

## Why The Game Is Distinct From The Studio's Existing Catalog

The current studio catalog already covers route deduction, route toggling, bubble clearing, lunch-order clustering, golf solitaire, rhythm lanes, fishing timing, downhill slalom, and a live defense-grid game. `Scrap Signal` opens a dedicated desktop action lane with a protect-and-return shooter loop instead of another puzzle board or another lane-defense wrapper.

## If A Starter, Demo, Template, Or Remix Path Is Involved, What The Player Will See In The Strongest Screenshot And First 15 Seconds That Makes The Game Clearly Not That Source

The only starter path is `playdrop/template/typescript_template`. The strongest screenshot and first `15` seconds are fully owned by the beacon halo, the rust-red drone silhouettes, the amber battery carry loop, and the storm-black salvage frame rather than any inherited template scene or starter-kit identity.
