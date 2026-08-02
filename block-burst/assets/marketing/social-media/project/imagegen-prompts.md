# Block Burst ImageGen production record

Production mode: built-in OpenAI ImageGen through the Codex `imagegen` skill.
The task used reference-led generation and precise image edits; it did not use
third-party image generation or code-built replacement artwork.

## Reference set

- protected icon: `assets/marketing/playdrop/icon.png`
- protected portrait hero: `assets/marketing/playdrop/hero-portrait.png`
- protected landscape hero: `assets/marketing/playdrop/hero-landscape.png`
- real clean gameplay frames: `tmp/marketing-audit/source-frames/`
- approved listing masters: `assets/marketing/playdrop/screenshots/`

Original selected generations are saved under:

- `assets/marketing/project/imagegen-originals/portrait/`
- `assets/marketing/project/imagegen-originals/landscape/`
- `assets/marketing/social-media/project/imagegen-originals/feed-3x4/`
- `assets/marketing/video-campaign/project/caption-plates/chroma/`

## Locked global prompt direction

Create complete premium Block Burst marketing images with the protected
white-and-gold arcade identity, glossy jewel blocks, a straight navy board,
deep plum crystal scenery, and warm-gold burst light. Use no phone or browser
frame, app-store badge, currency, unsupported mode, watermark, or extra copy.
Every board must be visibly countable at exactly 8 columns by 8 rows. Every
tray/action composition must represent exactly three current pieces in total.

## Listing prompt set

Each line below was generated separately in native 9:16 and 16:9 composition:

1. `DRAG. DROP. BURST.` — one red active piece arcs toward a highlighted legal
   gap; two pieces remain in the tray; the first gold fragments show the payoff.
2. `PLAN EVERY PIECE` — a constrained but playable 8x8 board, three different
   pieces, and restrained planning arcs toward possible spaces.
3. `CHAIN BIG COMBOS` — a crossed row-and-column gold clear clipped strictly to
   the 8x8 board, three tray pieces, and no invented power-up.
4. `BEAT YOUR BEST` — a triumphant high-score board with exact score `18,950`,
   exact label `BEST`, and exactly three available pieces.

Headline instructions were locked to exactly two to four words, with exact
spelling and punctuation, huge white dimensional arcade lettering, restrained
gold bevel, and no body copy.

## Native 3:4 social prompt set

1. Identity card — exact title `BLOCK BURST`, one 8x8 cross-clear hero board,
   and exactly three pieces.
2. `DRAG. DROP. BURST.` — exact action and piece-count truth from listing card 1.
3. `PLAN EVERY PIECE` — exact planning truth from listing card 2.
4. `CHAIN BIG COMBOS` — exact crossed-clear truth from listing card 3.
5. `BEAT YOUR BEST` — exact `18,950` and `BEST` score truth from listing card 4.

Every 3:4 prompt reserved at least 70 pixels of calm decorative background at
both side edges. The 2:3 Pins crop only 60 pixels from each side before uniform
scaling, keeping all copy, boards, pieces, scores, and effects.

## Caption-plate prompt set

Four wide 16:9 plates were generated on isolated flat chroma green with only
the exact campaign line in white dimensional arcade letters, restrained gold
bevel, and a thin plum extrusion:

- `DRAG. DROP. BURST.`
- `PLAN EVERY PIECE`
- `CHAIN BIG COMBOS`
- `BEAT YOUR BEST`

The bundled chroma-removal helper converted each selected plate to RGBA with a
soft matte and despill. Transparent plates live in
`assets/marketing/video-campaign/project/caption-plates/transparent/`.

## Rejection and correction record

- rejected one landscape drag draft with four implied pieces;
- rejected and corrected landscape planning and combo drafts with nine columns;
- rejected two combo edits whose clearing beam protruded one cell beyond the
  board; the selected edit ends at the rightmost in-board cell;
- rejected one 3:4 drag draft with seven rows and regenerated it as exact 8x8.

Rejected drafts are retained only under `tmp/marketing-audit/` as review
evidence and are excluded from all manifests and listing paths.
