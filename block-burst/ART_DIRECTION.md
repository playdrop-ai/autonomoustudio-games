# Block Burst Art Direction

Status: selected portrait-first build target

## Player promise

Build lines. Burst blocks. Chase combos.

Block Burst should feel like a crisp jewel-grid arcade puzzle: calm while the
player plans, then bright and physical when a completed row or column bursts.
The core clear is the identity. Special blocks must not dominate the first-view
gameplay presentation.

## Primary surface

`MOBILE_PORTRAIT` is the primary surface.

- Keep the score centered in the top safe area, with the best score directly below.
- Keep the hammer as one compact circular control at the top right.
- Center the exact 8 by 8 board in the upper-middle of the screen.
- Keep three draggable pieces evenly spaced in a generous lower thumb zone.
- Preserve the board and tray hierarchy on narrower portrait devices.
- Use this same foreground composition on desktop and landscape; only the full-bleed background plate and seam paths adapt to the wider aspect ratio.
- Use full-bleed gameplay with no device frame, decorative card, or title treatment.

## Visual language

- Background: dark cinder-charcoal field with a muted plum center and faint
  diagonal seams. Sparse dim squares and coral/cyan seam lights are rendered by
  Phaser so the background remains gently active.
- Board: deep navy outer frame with quieter navy recessed cells.
- Blocks: crisp 2.5D jewel-like faces with shallow bevels and controlled highlights.
- Clear effect: warm white-gold light running through the completed row or column,
  with a small number of square fragments around the clear.
- UI: white score, pale-gold best score, and dark navy utility controls.
- Typography: rounded system sans, bold numeric hierarchy, zero letter spacing.

## Runtime palette

- Background light: `#3A223A`
- Background middle: `#241B2A`
- Background dark: `#111119`
- Board frame: `#0A1538`
- Board cells: `#172657`
- Green: `#35C36F`
- Yellow: `#F0C842`
- Orange: `#FF8A38`
- Red: `#E84B5F`
- Purple: `#965EE8`
- Blue: `#2D69D8`
- Teal: `#22BEC6`
- Burst gold: `#FFD24D`
- Highlight gold: `#FFE08A`

## Motion and effects

- Fade the background squares slowly between very low opacity values without
  changing their size or position.
- Let soft coral and cyan light packets travel along a few diagonal seams over
  long, staggered cycles. Keep all background motion below the board.
- Make a completed line readable before fragments appear.
- Flash the cleared cells white-gold, then release compact square fragments.
- Keep particles close to the cleared row or column so the remaining board stays readable.
- Reserve larger celebrations for multi-line clears and strong combo milestones.
- Do not use bombs, rockets, lasers, or unrelated power-up imagery to represent the core loop.

## Build boundary

This direction is achievable with the current Phaser 2D renderer. It does not
require a new engine or third-party gameplay assets. The accepted mockup is a
visual target, not a claim that every lighting detail is already implemented.

## Artifacts

- Selected gameplay mockup: `assets/art-direction/mockup-background-cinder-plum.png`
- Mobile portrait background: `assets/generated/background-mobile-portrait.png`
- Desktop and landscape background: `assets/generated/background-desktop.png`
- Transparent hammer: `assets/generated/hammer.png`
- Portrait identity reference: `assets/marketing/playdrop/hero-portrait.png`
- Icon material reference: `assets/marketing/playdrop/icon.png`
- Real portrait layout reference: `assets/marketing/captures/mobile-portrait-reference.png`

The mockup and extracted runtime assets were generated with built-in ImageGen
from project-owned references and the selected Cinder Plum mockup. No third-party
reference image was supplied.

The portrait background is `1080x2340`, the desktop background is `1920x1080`,
and the hammer is a `512x512` RGBA PNG with a transparent background. The
backgrounds intentionally contain no baked gameplay or UI.

## Generation prompt

Create one polished, honest full-screen mobile portrait gameplay screen for the
current Phaser 2D game. Preserve an exact 8 by 8 navy board, a centered score and
best score in the top safe area, a compact top-right hammer control with a count
of 2, and exactly three draggable pieces in the lower tray. Show one completed
horizontal row and one completed vertical column bursting at their intersection
with restrained square fragments and warm white-gold light. Use normal colored
blocks only. Match the selected Cinder Plum background and jewel-block materials.
No title, marketing copy, tutorial text, special blocks, device frame, or
watermark.

## Runtime asset prompts

- Portrait background: isolate the selected dark cinder-charcoal and muted-plum
  material as an empty `9:19.5` canvas with only faint, uniformly dark diagonal
  seams; remove every square and every colored seam hotspot; no board, blocks,
  HUD, text, particles, controls, or characters.
- Desktop background: create a true `16:9` companion using the same material and
  faint neutral seams, with the middle kept calm enough for gameplay; remove all
  squares and colored seam hotspots; no baked UI or gameplay.
- Hammer: isolate one compact stylized 3D silver hammer with a warm orange-gold
  handle, angled from lower left to upper right, on a flat chroma background;
  remove the chroma to transparency and include no button circle, count, text,
  badge, or shadow.
