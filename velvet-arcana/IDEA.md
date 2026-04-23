# Velvet Arcana

## Original Game Name

Velvet Arcana

## One-line Player-facing Value Proposition

Clear three short Golf-style readings where `Past` previews the next draw, `Present` plays it straight, and `Future` hides the buried cards until you uncover them.

## Best Platform

`mobile portrait`

## Additional Supported Platforms

- `desktop`

## Gameplay Family

Single-screen portrait solitaire card clearer.

## Proven Reference Loop And Why Players Will Understand It Immediately

The core loop is directly legible from `Golf Solitaire`: `7` columns of stacked cards, only the exposed top card in each column is playable, and a card can be cleared only if it is exactly one rank above or below the active pile. That rule is already proven, already familiar, and already reads in one sentence.

## Allowed Novelty Beyond The Reference Loop

The novelty stays outside the primary input grammar:

- three named spreads that change information difficulty, not the core rule
- `Past` shows the next stock card before the player draws
- `Future` hides buried cards until they are exposed
- four bespoke omen suits for visual identity only, not extra rules

The player still learns one main action language: play the exposed top card if it is `+1` or `-1`, or draw from stock when the line dies.

## Game Meta

Three spreads per run, cumulative score, and local best-score persistence.

## Input

- Mobile portrait: tap an exposed top card or tap the stock pile.
- Desktop: click an exposed top card or click the stock pile.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Solitaire card puzzler

## Reference Games

- `Golf Solitaire` for the exact stacked-column interaction model.
- `TriPeaks` for the quick higher-or-lower pacing and one-more-run appeal.
- The attached Golf reference screenshot for the intended board shape and low-UI presentation.

## Art Direction

For this redesign pass, the art goal is functional clarity first: one clean reading-table backdrop, crisp custom `moon`, `rose`, `sun`, and `blade` suit symbols, readable card fronts, a real card back, and restrained table dressing. Bespoke AI-generated table art, card illustrations, music, and SFX are explicitly deferred until the new rules and layout are validated.

## Why The Art Direction Is Achievable

The redesign does not need a new engine or a heavy asset pipeline. A clean DOM/CSS card table with custom suit marks and one reliable card-back treatment is enough to validate the gameplay and UX before any richer art pass.

## Target Player And Why They Already Like The Proven Loop

The target player is a casual solitaire or card-puzzle player who already likes quick higher-or-lower decisions, visible stack pressure, and short repeatable runs on phone.

## Why The Fiction, Story Wrapper, And Marketing Promise Intensify The Same Player's Desire

The reading-table wrapper gives the same solitaire tension a stronger identity without changing who the game is for. The player is still chasing clear decisions and clean runs; the fiction only sharpens the mood around those choices.

## What The Player Is Trying To Uncover, Protect, Collect, Or Avoid

The player is trying to clear three spreads in sequence, protect the stock from running dry too early, and avoid ending a spread with no legal top-card move left.

## Why The Player's Main Verb Feels Desirable Inside The Fantasy

Removing the exposed top card from a reading column feels like turning the next layer of the omen over. The action reads as uncovering and resolving the spread, not as abstract card deletion.

## Why A Player Would Want This Instead Of The Best-known Game In The Same Lane

The strongest reason is not “Golf Solitaire but prettier.” It is a short curated run where the same proven rule becomes progressively harsher across `Past`, `Present`, and `Future`, while the custom suits and reading-table framing give the board a distinct identity.

## The Brutally Honest One-line Description And Why It Does Not Collapse Into "Famous Game X With A Skin"

Brutally honest description: `a three-spread Golf Solitaire variant where the information gets stricter from Past to Future`.

That is still not just `Golf Solitaire with a skin` because the spread structure deliberately changes what the player knows from one board to the next while keeping the same underlying rule set.

## Why The Pitch Creates Immediate Desire Instead Of Merely Sounding Coherent

The pitch promises something players already want: a familiar solitaire rule set, a clear difficulty arc, and a short run they can finish or fail in a few minutes without learning extra subsystems.

## What Promise The Title, Icon, Hero, And First 15 Seconds Will Imply

They should imply a clean occult card table, readable custom suits, stacked columns, and one exposed active pile at the bottom. The first `15` seconds should honestly show the actual build: one quick opening play in `Past`, one stock draw, and one exposed card reveal.

## Why The Concept Supports A Real Player Session Instead Of A One-clear Toy

The three-spread run gives the session a real arc: onboarding in `Past`, reference tension in `Present`, and hardest information pressure in `Future`.

## What Keeps Players Engaged After The First Clear

Shuffled decks, cumulative score, the three-spread difficulty ramp, and local best-score chasing give the player enough variation to run it again after they understand the rule.

## Why The Game Is Distinct From The Studio's Existing Catalog

The studio catalog already covers route-switching, chain reactions, bubble clustering, rhythm, fishing, and tower defense. `Velvet Arcana` remains the studio's dedicated solitaire lane, now anchored more tightly to a proven Golf-style board instead of a custom open-information puzzle layer.

## Why This Concept Deserves To Exist

This redesign fixes the strongest weakness in the shipped v1: it restores real stack pressure and meaningful hidden information instead of trying to create interest with helper systems. That makes the concept stronger, clearer, and easier to judge honestly.
