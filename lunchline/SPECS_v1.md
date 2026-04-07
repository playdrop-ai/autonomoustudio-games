# Lunchline - SPECS v1

## Original Game Name

Lunchline

## One-line Player-facing Value Proposition

Tap big ingredient clusters to pack the right lunchbox orders before the lunch rush loses patience.

## Clear Differentiator From The Reference Games

The player is still using a proven tap-cluster grammar, but every move is judged against one visible lunchbox order. That changes first-minute board reading from "clear the biggest blob" to "collect what this order needs before complaints stack up."

## Best Platform And Why It Is Best

`mobile portrait`

Portrait keeps the board tall, the order card close to the thumb zone, and the one-handed puzzle rhythm intact. The lunch-rush fantasy reads best as a vertical ticket-and-tray stack instead of a wide landscape dashboard.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: mouse clicks map directly to the same cluster-tap input, and the portrait board can sit centered on a desktop canvas without changing the rules.

## Gameplay Family

Endless cluster-tap order puzzler.

## Game Meta

Single endless shift with best-score persistence and order-streak chasing.

## Input Per Supported Platform

- Mobile portrait:
  - Primary action: tap a connected group of `2+` matching ingredients to collect it.
  - Secondary action: none. No long-press, drag mode, or alternate tool exists in v1.
- Desktop:
  - Primary action: click a connected group of `2+` matching ingredients to collect it.
  - Secondary action: none.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Cluster clear

## Reference Games We Are Intentionally Close To

- `SameGame` for the core cluster-tap loop.
- `Clickomania!` for the same familiar board-read and settle rhythm.
- `playdrop/app/flapmoji` for portrait-first public-facing clarity and mobile pacing.
- `playdrop/app/pool-game` for complete PlayDrop release media expectations.
- `playdrop/asset-pack/food-kit-repack` for achievable food-theme direction only, not as a required runtime dependency.

## Core Loop

1. Read the current lunchbox order and see which two ingredients it needs.
2. Scan the board for the best connected cluster that helps the order.
3. Tap a matching cluster of `2+` ingredients to collect it.
4. Watch the board collapse and refill from the top.
5. Finish the order before the patience meter empties, or lose one complaint and move to the next customer.
6. Keep serving orders until the shift reaches `3` complaints and the game ends.

## Rules

- The board is a portrait grid filled with `4` ingredient families.
- A valid move is any orthogonally connected cluster of `2+` matching ingredients.
- Collecting a cluster removes those cells, collapses the column downward, and refills empty cells from the top.
- Only ingredients named on the active lunchbox order fill the order counts.
- Clearing off-order ingredients is still allowed for board control and a small score reward.
- Each order asks for exactly `2` ingredient families.
- The patience meter drains continuously while the order is active.
- Completing an order:
  - scores a lunchbox bonus
  - increases the order streak
  - refreshes the patience meter
  - rolls the next order
- Letting an order time out:
  - adds `1` complaint
  - resets the streak
  - rolls a fresh order
- The run ends at `3` complaints.
- Large helpful clears can grant a small patience bump, but the big refill comes from serving the order.

## Hazard, Reward, And Fail-state Signifiers

- Reward:
  - bright ingredient tokens
  - filled lunchbox compartments
  - warm completion flash on the order card
- Hazard:
  - red patience ring or bar around the active order
  - visible complaint marks in the HUD
- Fail pressure:
  - a louder, redder lunch-rush UI treatment when patience is nearly empty
  - final game-over overlay when the shift reaches `3` complaints

The player should instantly understand that ingredient tokens are useful, the active order card is the goal, and the red patience/complaint language is danger.

## Main Screens And What Each One Shows

- Start overlay:
  - title
  - one-sentence hook
  - `Play` CTA
- Gameplay:
  - edge-to-edge portrait board
  - score
  - complaint count
  - one active lunchbox order with ingredient counts and patience state
- Run-end overlay:
  - score
  - best score
  - orders served
  - restart CTA

## Core Interaction Quality Bar

- Cluster taps must feel immediate and obvious at phone scale.
- Selected groups need clear hover or pulse feedback before collection.
- Ingredient tokens must remain distinct at a glance by silhouette, accent pattern, and color, not color alone.
- Pop feedback should feel satisfying without hiding the next board state.
- The order card must stay readable in one quick glance during active play.
- Complaint and patience language must become urgent without overwhelming the board.

## HUD And Screen Plan

- Keep the gameplay HUD minimal: score, complaints, active order only.
- No permanent tutorial text on the live board.
- No large chrome frame or webpage card around the playfield.
- Start and run-end overlays should leave enough of the board visible that the game still feels like the same product, not a disconnected menu.

## Art Direction And Asset Plan

- Warm wood or lacquer lunch-counter framing
- crisp ingredient chips with simple bespoke illustrations
- lunchbox order cards with compartment dividers
- soft steam, receipt-paper details, and tiny spark pops on successful fills
- palette anchored in salmon coral, avocado green, egg yellow, and rice white

The app should feel appetizing, tidy, and tactile instead of abstract.

## Tech Approach And Code Structure

- Stay on the simple PlayDrop TypeScript app path.
- Use a full-viewport canvas for the board, token art, and pop animation.
- Use lightweight DOM overlays for the order card, score, complaints, start screen, and game-over.
- Planned module split:
  - `src/main.ts`: boot, PlayDrop host bridge, shell state, resize, and input wiring
  - `src/game/sim.ts`: board generation, cluster resolution, order state, patience, scoring, and deterministic update
  - `src/game/render.ts`: board drawing, ingredient tokens, order-fill feedback, and HUD-driven canvas effects
  - `src/game/data.ts`: ingredient definitions, palettes, and balance constants
  - `src/game/audio.ts`: small kitchen clicks, pop cues, and shift-pressure music layer
- Add deterministic hooks for scripted balance sweeps and capture.

## Testing Plan

- Deterministic logic tests for cluster detection, collapse/refill, order completion, timeout-to-complaint, and game-over.
- `npm run validate`
- `playdrop project validate .`
- Local browser checks on mobile portrait and desktop.
- Hosted verification on the same surfaces after publish.

## Target Session Length, Skilled Run Length, And Replayability Plan

- Fresh-player casual median target: `60-120s`
- Expert median target: `300s+`
- Expert p25 target: `240s+`
- Replayability comes from changing order mixes, better board management, and longer lunchbox streaks.

## Scripted Balance Sweeps For This Endless Score Game

- Idle policy:
  - never taps
  - target failure under `30s`
- Casual policy:
  - prefers clusters that help the current order
  - otherwise takes medium-size board-control clears
  - target median `60-120s`
- Expert policy:
  - maximizes order completion speed and cluster efficiency
  - target median `300s+`
  - target p25 `240s+`

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

The strongest raw beat is a nearly full lunchbox order card at the top while a large matching ingredient cluster bursts on the board and the final compartment fills with a satisfying flash. If that does not look worth clicking in an unedited capture, the project should fail before listing work.

## The Failure Condition That Sends The Project Back To `01-idea`

Return to `01-idea` if the real build still feels like a generic cluster clearer where the visible order does not materially change which groups the player wants, or if the food-prep fantasy only lives in labels while the raw board still reads as anonymous blobs.

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon:
  - a packed lunchbox bursting with two or three hero ingredients
- Hero:
  - an order card over a bright ingredient board mid-fill with the `Lunchline` title centered
- Screenshots:
  - one clean mid-order fill moment
  - one clutch near-timeout save
- Gameplay video:
  - start immediately on a satisfying board clear
  - show at least one completed order and one near-miss complaint moment

## Complexity Likely To Be Challenged In The Simplify Step

- `5` ingredient families may be more recognition load than the first v1 needs.
- Multiple simultaneous orders would overcrowd the HUD.
- A visible customer queue could become chrome instead of useful pressure.
- Separate combo meters and detailed stats would likely bloat the top HUD.

## Starter, Demo, Template, Or Remix Source-signature Removal Plan

The only starter path is `playdrop/template/typescript_template`. Before implementation, every visible trace of the template must disappear:

- opening beat: replace the template message with a real lunch-rush start screen
- framing: full-viewport portrait puzzle board, not a blank starter page
- visual identity: bespoke ingredient tokens, lunchbox order card, and complaint language
- HUD: score, complaints, and one active order only
- objective presentation: pack lunchbox orders, not generic starter copy
