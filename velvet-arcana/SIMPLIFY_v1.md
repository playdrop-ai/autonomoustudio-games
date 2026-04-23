# Velvet Arcana - SIMPLIFY v2

## The Core Promise In One Sentence

Play a compact three-spread Golf-style reading where the rules stay the same and only the information gets stricter from `Past` to `Future`.

## The Differentiator That Survived Simplification

Only one differentiator survives beyond the proven Golf loop: the three-spread information ramp.

- `Past` previews the next stock card
- `Present` matches the reference
- `Future` hides buried cards until exposed

Everything else was cut.

## The Best Platform

`mobile portrait`

## Additional Supported Platforms That Still Survive

- `desktop`

## The Final Gameplay Family

Portrait Golf-style solitaire.

## The Final Game Meta

Three spreads per run, cumulative score, local best score.

## The Final Input Model Per Supported Platform

- Mobile portrait: tap an exposed top card or tap the stock.
- Desktop: click an exposed top card or click the stock.

## The Final HUD And Key Screens

- Start overlay with title, one short rule explanation, and `Play`
- Gameplay view with score, spread label, columns, stock, active pile, and the `Past`-only preview card
- Transition overlay with the next spread name
- Run-end overlay with final score, best score, spreads cleared, and retry

## The Final Art And Asset Scope

- One clean full-frame table background
- `52` functional card faces using large ranks and custom `moon`, `rose`, `sun`, and `blade` suit symbols
- One real card back
- One consistent card flip/reveal animation
- No bespoke AI art, music, or SFX in this implementation pass

## Final Rules

- `3` spreads per run
- `7` columns per spread
- `5` stacked cards per column
- `1` opening active card
- `16` stock cards
- Only the exposed top card in a column can be played
- Play a card only if it is exactly `+1` or `-1` from the active rank
- `A` and `K` wrap
- `Past` shows all buried faces and the next stock card
- `Present` shows all buried faces and hides the next stock card
- `Future` hides buried cards until they are exposed
- Revealing a buried card flips it face-up immediately after the exposed top card is removed
- Clear all `35` tableau cards to finish the spread
- The run ends when no legal exposed top-card move remains and the stock is empty
- Score only:
  - `+100` per cleared card
  - `+1000` per cleared spread
  - `+2000` for clearing all three spreads

## Not In v2

- No reserve slot
- No omen suit gameplay
- No chain bonuses
- No always-on move highlighting
- No stock-count text during active play
- No undo stack
- No hint button after the one opening `Past` tutorial cue
- No alternate decks, themes, daily challenges, or unlock map
- No account progression, achievements, or leaderboards
- No dedicated art/audio generation until this gameplay pass is accepted
