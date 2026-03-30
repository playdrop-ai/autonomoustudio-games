# Wordbraid

## Original Game Name

Wordbraid

## One-line Player-facing Value Proposition

Pluck letters from five glowing ribbons, braid them into sharp 3-to-5-letter words, and keep the press from jamming with ink.

## Best Platform

`mobile portrait`

## Additional Supported Platforms

- `desktop`

## Gameplay Family

Single-screen word-planning arcade.

## Game Meta

Endless score chase with visible queue planning, combo pressure, and rising ink jams.

## Input

- Mobile portrait: tap a ribbon to pull its front letter into the tray, tap `WEAVE` to submit a valid word, tap the tray tail to remove the last letter, and tap `CLEAR` to empty the tray.
- Desktop: click ribbons and buttons directly, with `Enter` to submit and `Backspace` to remove the last letter.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Word arcade

## Reference Games

- `SpellTower` for one-more-word tension only, not for tower-clearing rules, board search, or power-up structure.
- `Letterpress` for tactile tile feel only, not for territory control or versus play.
- `playdrop/app/infinite-trivia` for a realistic portrait-first PlayDrop quality bar and low-chrome game shell.
- `playdrop/app/starter-kit-match-3` for a realistic TypeScript canvas packaging path on PlayDrop.
- `kenneynl/asset-pack/letter-tiles` for proof that tactile letter-tile visuals are realistic if bespoke tile art needs backup reference.

## Art Direction

Portrait nocturne letterpress atelier: deep ink-blue background, warm ivory letter tiles, woven gold guide threads behind each ribbon, subtle copper scoring accents, soft paper grain, and restrained glow only on the active tray, combo pulse, and approaching ink jams.

## Why The Art Direction Is Achievable

The shipped look can be built entirely with bespoke 2D vector shapes, gradients, paper texture overlays, and a small amount of particle polish. No character art, no 3D scene, and no large external asset pipeline are required. The reference tile pack proves the letter-tile language is easy to support if a texture backup is needed, and the same ink, paper, and tile system can generate strong listing art without inventing a second visual language.

## Why This Concept Supports A Real Player Session

The run is endless, but the play is not passive spelling. The player is continuously reading five visible queues, deciding whether to cash out a safe 3-letter word or hold for a stronger 4- or 5-letter scrub, and managing which ribbons are close to jamming. That creates a real 2-to-6-minute mastery target instead of a one-clear novelty.

## What Keeps Players Engaged After The First Good Run

- visible ribbon queues reward planning instead of pure reaction
- 4- and 5-letter words scrub ink, so better vocabulary materially extends the run
- combo and rare-letter bonuses create a score-chase beyond simple survival
- every used ribbon advances independently, so the board state changes in interesting ways after each word
- seeded endless runs support repeat attempts and measurable improvement

## Why The Game Is Distinct From The Studio's Existing Catalog

`Starfold` is a line-shift chain puzzle, `Latchbloom` is a real-time route switcher, `Keyfall` is a rhythm runway, `Drifthook` is a fishing timing game, and `Pocket Bastion` is lane defense. `Wordbraid` is none of those. Its tension comes from vocabulary and queue planning, and its interaction is deliberate word construction from constrained ribbons instead of board movement, routing, timing windows, or tower upgrades.

## Why This Concept Deserves To Exist

The idea is not "our version of a word game." The player-facing hook is weaving words from five constrained letter ribbons while visible ink pressure climbs toward the tray. That ribbon consumption model changes how the player reads the board, how they plan future turns, and how they earn safety, which gives the game a concrete identity beyond a presentation swap.
