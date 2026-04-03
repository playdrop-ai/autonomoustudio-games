# Velvet Arcana - SPECS v1

## Original Game Name

Velvet Arcana

## One-line Player-facing Value Proposition

Chain higher-or-lower omen cards through three candlelit spreads, bank one reserve charm, and chase a flawless reading before the candle burns out.

## Clear Differentiator

The player is not just clearing one disposable solitaire deal. Each run is a three-spread reading with one explicit backup tool, one visible omen-suit bonus per spread, and a cumulative score arc that rewards cleaner card-choice decisions than generic one-board solitaire.

## Best Platform And Why It Is Best

`mobile portrait`

Portrait makes the table feel like a held reading board instead of a shrunk desktop layout. It keeps the cards large, the reserve charm within thumb reach, and the HUD narrow enough to preserve the playfield.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: click input maps directly to the same card-tap flow, and the portrait-first board can scale upward cleanly inside a centered full-viewport layout.

## Gameplay Family

Portrait card-clearing solitaire run-builder.

## Game Meta

Three spreads per run, cumulative score, per-spread clear bonus, flawless-run bonus, and local best-score persistence.

## Input Per Supported Platform

- Mobile portrait: tap a playable card, the stock pile, or the reserve charm.
- Desktop: click a playable card, the stock pile, or the reserve charm.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Solitaire card puzzler

## Reference Games We Are Intentionally Close To

- `Golf Solitaire` for the higher-or-lower active-card rule.
- `TriPeaks` for fast chain-building feel and visible-tableau rhythm.
- `playdrop/app/infinite-trivia` for portrait-first PlayDrop packaging expectations only.

## Core Loop

1. Read the active card rank and the current spread's omen suit.
2. Tap visible tableau cards that are exactly `+1` or `-1` from the active card rank.
3. Build a longer chain for higher score and to try to finish on the omen suit.
4. Use the reserve charm when charged to save or recover a run.
5. Read the face-up next draw and tap the stock when no better card line is available.
6. Clear the spread, move to the next spread, and carry the total score forward.

## Final Rules For The Planned v1

- Run structure: `3` spreads named `Past`, `Present`, and `Future`
- Tableau per spread: `21` face-up cards arranged in `3` rows of `7`
- Active card: `1` face-up card in the center well
- Stock per spread: `14` cards after the opening active card
- Stock preview: the next stock draw stays face up in the bottom rail
- Rank rule: a tableau card is playable only if it is exactly `1` rank above or below the active card
- Wrap rule: `A` and `K` wrap
- Reserve charm: starts each spread charged, can hold one active card, and supports one stash or swap until refilled
- Omen suit: each spread highlights one of the `4` suits
- Omen refill rule: ending a chain of `3+` cards on the omen suit awards an omen bonus and refills the reserve charm
- Spread clear: clearing all `21` tableau cards advances to the next spread
- End of spread with cards left: the run continues only if stock and reserve still allow legal continuation; otherwise the run ends
- Score:
  - `100` per cleared card
  - `+40` per extra card in the same chain after the first
  - `+300` omen-finish bonus
  - `+1000` spread-clear bonus
  - `+2000` flawless three-spread bonus

## Hazard, Reward, And Fail-state Signifiers

- Reward state: playable cards glow softly, chain count increments near the center well, and omen-suit cards receive a gold edge when they would finish a scoring chain
- Danger state: a nearly empty face-up stock preview and an uncharged reserve charm are the live pressure states; both must read immediately at the bottom rail
- Fail state: the run ends only when no legal move remains and the backup tools are exhausted
- The player should never mistake the reward signal for the fail state because reward lives on bright gold chain feedback, while danger is shown through dimming candle time and an empty reserve socket

## Main Screens

- Start overlay: title, one-sentence hook, `Play` button, and a tiny two-line control explanation
- Gameplay view: full-viewport card table with score, spread index, omen suit chip, reserve charm, active card well, and a face-up next draw
- Run-end overlay: final score, best score, spreads cleared, and `Play Again`

## Core Interaction Quality Bar

- Card taps must feel instant and confident, with card removal beginning in under `60ms`
- The active card, stock, reserve, and omen suit must be readable without scanning the whole screen
- The face-up next draw must make loss proximity and next-step planning glanceable
- Card spacing must avoid accidental taps while still showing enough of each card face to read rank and suit at phone size
- Chains should feel like forward motion, not like cards merely disappearing
- Omen-suit finishes need a short, bright payoff that is readable but does not freeze play
- The reserve action must look deliberate and reversible, not like a hidden trick

## Strongest First-minute Feeling

The player should feel like they are riding a lucky reading: seeing a card they need, extending the chain one more beat, then cashing that tension out with a bright omen finish.

## HUD And Screen Plan

- Persistent HUD stays to one compact top cluster and one compact bottom cluster
- Top cluster: score, spread label, omen suit
- Bottom cluster: reserve charm, active card well, face-up next draw plus remaining stock count
- No large instructional panel during active play
- No card-table framing inside a webpage card; the table fills the viewport

## Art Direction And Asset Plan

- Deep wine-red velvet backdrop with warm brass trim
- Ivory cards with oversized numerals and four original omen suits: `moon`, `rose`, `sun`, `blade`
- One card back, one reserve-charm emblem, one omen-suit chip style, and one candle or ember feedback layer
- Motion polish through card lift, slide-to-well motion, chain glows, and restrained ember bursts
- Listing art built from real gameplay screenshots of the live table state

## Tech Approach And Code Structure

- TypeScript single-page app built from the PlayDrop TypeScript template
- `src/main.ts` boots the app and wires the UI shell
- `src/game/state.ts` owns deck generation, move legality, scoring, reserve state, and spread progression
- `src/game/view.ts` renders the table, cards, overlays, and responsive layout in DOM plus CSS
- `src/game/storage.ts` persists best score locally
- `tests/logic.test.ts` covers move legality, rank wrap, reserve behavior, omen refill, spread-clear flow, and scoring

## Testing Plan

- Deterministic logic tests for move legality, reserve use, omen refills, spread progression, and end-of-run conditions
- `npm test`
- `npm run validate`
- `playdrop project validate .`
- Browser checks on mobile portrait and desktop before publish
- Hosted verification on the same surfaces after publish

## Target Session Length, Target Skilled Clear Or Run Length, And Replayability Plan

- Fresh-player target run: `4-6` minutes
- Skilled successful clear of all `3` spreads: `3-4` minutes
- Replayability comes from shuffled spreads, perfect-spread chase, flawless-run chase, and best-score persistence

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

The strongest raw moment is a mid-run portrait screenshot where the active card well is glowing, three playable cards are visible, the reserve charm is charged, and the player has a live chance to finish a chain on the omen suit. The first `15` seconds should show a fast first chain, one reserve save, and an omen-finish bonus, not a slow tutorial.

## The Failure Condition That Sends The Project Back To 01-idea

If the raw build still reads as `generic tarot solitaire` and the reserve plus three-spread arc do not create visible desire in the first `15` seconds, the concept goes back to `01-idea` instead of being rescued by prettier art or bigger listing treatment.

## Concrete Media Plan

- Icon: one luminous central card and reserve charm on velvet
- Hero: a real spread in motion with the title centered over the live table language
- Screenshots: one strong active-chain portrait state and one late-run pressure state
- Gameplay video: start inside an active chain immediately, show one reserve save, one omen finish, one spread clear, and the final score overlay

## Complexity Likely To Be Challenged In Simplify

- Whether `3` spreads per run are necessary or whether `2` would still produce a real session
- Whether omen-suit bonus plus reserve refill is the right amount of secondary rule
- Whether all four custom suits need decorative face treatment or just large rank plus symbol readability
