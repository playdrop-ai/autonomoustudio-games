# Velvet Arcana - SPECS v2 Redesign

## Original Game Name

Velvet Arcana

## One-line Player-facing Value Proposition

Clear three short Golf-style readings where each spread changes how much future information you get before the stock runs out.

## Clear Differentiator

The differentiator is not extra mechanics anymore. It is the same proven higher-or-lower solitaire rule presented across three spreads with a clear information curve:

- `Past`: easier than Golf because the next stock card is shown
- `Present`: matches the reference structure
- `Future`: buried cards stay face-down until exposed

## Best Platform And Why It Is Best

`mobile portrait`

Portrait keeps the columns large, keeps the stock and waste piles in thumb reach, and makes the full-frame table feel like a held card layout instead of a desktop board shrunk into a card-shaped shell.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: click input maps directly to the same top-card interaction, and the portrait board can scale upward inside a full-viewport table without introducing extra HUD clutter.

## Gameplay Family

Portrait Golf-style solitaire card clearer.

## Game Meta

Three spreads per run, cumulative score, local best score, and no extra metagame systems in this pass.

## Input Per Supported Platform

- Mobile portrait: tap an exposed top card or tap the stock pile.
- Desktop: click an exposed top card or click the stock pile.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Solitaire card puzzler

## Reference Games We Are Intentionally Close To

- `Golf Solitaire` for the exact `7` stacked columns and top-card-only interaction model.
- `TriPeaks` for the quick one-more-run higher-or-lower cadence.
- The supplied Golf reference screenshot for layout, scale, and low-UI table composition.

## Core Loop

1. Read the active card at the bottom of the board.
2. Scan the `7` exposed top cards.
3. Play one exposed top card that is exactly `+1` or `-1` from the active card.
4. Reveal the next buried card in that column when the top card is removed.
5. Draw from the stock when no useful exposed top card remains.
6. Clear the spread, then repeat on the next spread with stricter information.

## Final Rules For The Planned v2

- Run structure: `3` spreads named `Past`, `Present`, and `Future`
- Deck model: standard `52` cards with ranks `A` through `K` and the studio's `moon`, `rose`, `sun`, and `blade` suit identities
- Tableau per spread: `7` columns of `5` stacked cards each
- Active pile: `1` face-up starting card
- Stock per spread: `16` cards after the opening active card
- Play rule: only the exposed top card in a column can be played
- Rank rule: a playable top card must be exactly `1` rank above or below the active card
- Wrap rule: `A` and `K` wrap
- `Past`: all `5` cards in every column are visible, and the next stock card is shown
- `Present`: all `5` cards in every column are visible, and the next stock card is hidden
- `Future`: each column shows only the exposed top card; buried cards remain face-down until uncovered
- Reveal rule: when the exposed top card is removed, the next buried card in that column flips face-up
- Spread clear: clearing all `35` tableau cards advances to the next spread
- Run fail state: the run ends when there is no legal exposed top-card move and the stock is empty
- Score:
  - `+100` per cleared tableau card
  - `+1000` per cleared spread
  - `+2000` for clearing all three spreads

## Hazard, Reward, And Fail-state Signifiers

- Reward state: the reward is the reveal itself and the column collapsing cleanly, not a separate bonus UI system
- Danger state: stock depletion and dead exposed tops are the only real pressure states
- Fail state: no legal exposed top-card move remains and the stock is empty
- `Past` should feel gentler because the player can read one step ahead
- `Future` should feel harsher because every buried card must be earned before it is known

## Main Screens

- Start overlay: title, one short instruction block, and `Play`
- Gameplay view: full-frame table, score, spread label, columns, stock, active pile, and the `Past`-only preview card
- Spread transition overlay: short phase title between boards
- Run-end overlay: final score, best score, spreads cleared, and `Play Again`

## Core Interaction Quality Bar

- Only the exposed top card in each column may react to input
- Card aspect ratio must stay stable on mobile and desktop
- The board must fit cleanly in mobile portrait without the playfield living inside a smaller framed container
- Buried-card reveal in `Future` must read as a real card flip, not a card swap glitch
- The `Past` tutorial may indicate one valid opening click, but the game must not keep showing all valid moves after that
- The player should feel that choosing a card commits them, not that the board is solving itself

## Strongest First-minute Feeling

The first minute should feel like a clean familiar solitaire lane: one obvious opening play in `Past`, a few deliberate reveals, and then a clear sense that `Present` and `Future` will demand tighter reading.

## HUD And Screen Plan

- Active-play HUD is reduced to exactly two live readouts: score and spread label
- No omen chip
- No reserve charm
- No chain counter
- No stock-count text
- No always-on move highlights
- `Past` may show one temporary tutorial pointer for the first move only

## Art Direction And Asset Plan

- Current pass: clean temporary table art, readable custom suits, consistent front/back card system, and restrained motion only
- Deferred pass after validation: AI-generated background, bespoke card faces and backs, plus AI-generated music and SFX

## Tech Approach And Code Structure

- TypeScript single-page app built from the PlayDrop TypeScript template
- [src/main.ts](/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/src/main.ts) owns UI rendering, spread transitions, tutorial cue, overlays, and debug hooks
- [src/game/state.ts](/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/src/game/state.ts) owns deck generation, stacked-column deal logic, move legality, reveal rules, spread options, and scoring
- [template.html](/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/template.html) owns the responsive full-frame table, scalable cards, and flip animation styling
- [tests/logic.test.ts](/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tests/logic.test.ts) covers stacked-column rules, reveal flow, spread modes, and fail conditions

## Testing Plan

- Deterministic logic tests for exact `35 + 16 + 1` dealing, top-card-only playability, buried-card reveal, spread-specific visibility, spread clear, and hard-stuck flow
- `npm test`
- `npm run validate`
- `playdrop project validate .`
- Browser QA on mobile portrait and desktop after the UI refactor
- Balance sweeps using at least `3` autoplay policies after the rules are stable

## Target Session Length, Target Skilled Clear Or Run Length, And Replayability Plan

- Fresh-player target run: `3-5` minutes
- Skilled full clear of all `3` spreads: `2-4` minutes
- Replayability comes from shuffled decks, scoring, and the spread information curve rather than helper systems or unlocks

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

The strongest raw screenshot is a clean portrait board with seven stacked columns, a readable active pile, and no extra HUD noise. The first `15` seconds should show one guided opening click in `Past`, one clean reveal, and a stock draw without any marketing-only embellishment.

## The Failure Condition That Sends The Project Back To 01-idea

If the redesigned build still feels soft or over-guided even after returning to top-card-only columns and hiding the stock preview outside `Past`, the concept should be reconsidered instead of rescued with cosmetic art.

## Concrete Media Plan

- Defer all new listing/icon/hero/audio generation until the gameplay and UX pass is accepted
- Use temporary clean screenshots only for QA during this redesign phase

## Complexity Likely To Be Challenged In Simplify

- Whether the `Past` first-move tutorial should be a pointer, pulse, or static nudge
- Whether the current background and temporary card art are clean enough to validate gameplay before the dedicated art pass
