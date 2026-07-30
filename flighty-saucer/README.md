# Flighty Saucer

Flighty Saucer is a one-touch low-poly 3D arcade game for PlayDrop. Tap, click,
or press Space to keep a tiny saucer aloft while threading animated monolith
gates and avoiding crystal hazards.

The game is designed first for mobile portrait, including iPhone safe areas and
Mobile Safari lifecycle behavior, and also supports mobile landscape and desktop.
It opens directly on a moving, obstacle-free flight scene. The first player
input starts scoring, spawns the gate field, and reveals the score HUD.

## Commands

```bash
npm install
npm run validate
playdrop project check . --tape MOBILE_PORTRAIT
playdrop project dev .
```

The build produces the single-file `flighty-saucer.html` artifact declared in
`catalogue.json`.
