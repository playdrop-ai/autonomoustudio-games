# Chopline Rush - ART

The visual identity in one page. SPECS.md owns how the game moves; this file owns how it looks.
Change values here first, then mirror them in `src/main.ts` (materials, themes, zone accents) and
`template.html` (UI colors).

## Identity

**A cheerful picnic world that giggles while you chop it.** Everything is bright, rounded, and
slightly alive: fruits sometimes have faces, targets are stacked like party snacks, and cutting
them is playful rather than violent. The knife is the only serious object in the world; the
contrast between the earnest chef knife and the smiling produce IS the joke.

Rules:
- About one in three fruits (watermelon, apple, orange) gets a face: two dot eyes and a small
  mouth, always facing the camera side. The face target ("emoji") always has one.
- Interiors are the reward: every cut must reveal a saturated interior cap brighter than the
  object's shell. The rainbow brick interiors are the signature payoff.
- Nothing bleeds, cracks, or shatters. Halves separate cleanly and topple like toys.

## Palette

World colors come from the equipped theme (`THEMES` in main.ts); the defaults below are the
Forest theme. UI colors live in template.html.

| Token | Value | Used for |
|---|---|---|
| sky top | `0x78dce7` | gradient sky dome, upper stop |
| horizon | `0x82d9c5` | gradient sky lower stop, fog color |
| ground | `0x8ed05a` | field plane |
| platform top | `0xf5f3eb` | course block tops |
| platform side | `0xbcc2c4` | course block sides |
| brick shells | `0xbd5837` / `0xc96642` | wall courses, alternating |
| interior rainbow | `0xff3f76 0xff9f1c 0xffe51f 0x35d45a 0x20c5df 0x3987f6 0xd64df1` | cut brick caps by course |
| hazard | `0xd946ef` / `0xc026d3` | spike slabs, deliberately the only magenta-violet in the world |
| UI ink | `#173d78` family | HUD text, buttons |

Zone accents (gates, callouts):

| Zone | Name | Accent |
|---|---|---|
| 1 | Picnic Meadow | `0xffd166` |
| 2 | Orchard Steps | `0x74c69d` |
| 3 | Brick Alley | `0xe07a5f` |
| 4 | Windy Shelves | `0x4cc9f0` |
| 5 | Chef's Gauntlet | `0xb5179e` |

## Shading and atmosphere

- Soft two-light setup: warm key light, cool rim, hemisphere ambient. No harsh shadows; mobile
  shadow maps stay at 512.
- Distance fog from 46 to 155 in the horizon color; the course should melt into the sky, never
  hard-clip.
- The sky is a vertical gradient (sky top through 62 percent, then blending to horizon), built as
  a canvas texture per theme.
- Only the knife gets an environment map (scoped, intensity 0.85) so its blade sweeps highlights
  while rotating. World materials stay matte so the knife reads as the hero.
- Cut interior caps use polygon offset so they never fight the shell face.

## Zone staging

- Each zone boundary gets a gate: two cream pylons with the next zone's accent flag and band,
  standing outside the course line. Gates are decor only and never collide.
- Crossing a boundary fires the zone callout (accent-colored title, zone name), a success flash,
  a medium camera trauma kick, and the victory sound.
- Zone accents may tint future props but never the platforms themselves; the course must stay
  readable white.

## UI

- Rounded pills on soft translucent purple; one accent gold for coins.
- Feedback text (praise, +1, zone callouts) is always white with soft dark shadows, accent color
  reserved for the zone title itself.
- Toasts are small bottom-center pills, never blocking the knife.
