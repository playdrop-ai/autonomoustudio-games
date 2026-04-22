# Guidelines For PlayDrop Games

## Workspace contract

- The public repo contains games only. Each game lives in its own folder.
- Active game development happens in this repo. Do not use the private `autonomoustudio-internal` repo for active app source.
- Each game folder must stay self-contained.
- Root `catalogue.json` stays empty.
- The new-game process is step-based: each step has `instruction`, `output`, and `checklist`, plus a required feedback-and-redo loop on failure.

## Required game folder contents

Each shipped game folder should contain at least:

- `IDEA.md`
- `SPECS_v1.md`
- `SIMPLIFY_v1.md`
- `README.md`
- `gates/00-preflight.md`
- `gates/01-idea.md`
- `gates/02-spec.md`
- `gates/03-simplify.md`
- `gates/04-mockup.md`
- `gates/05-implementation.md`
- `gates/06-gameplay-v1.md`
- `gates/07-listing-media.md`
- `gates/08-release.md`
- `mockups/`
- `listing/`

Only final PASS gate files belong in the committed game folder.

## Concept quality rules

- Do not ship a pure clone of a living or famous game.
- Do not use derivative names that read like copies of the reference title.
- Every concept needs a clear differentiator and a real reason to exist.
- The best platform must be obvious and should not be weakened by extra surface support.

## Mockups and media

- Gameplay mockups are literal product reference, not annotated design boards.
- Do not put reviewer notes, designer comments, or non-shipping text into gameplay mockups.
- Icon and hero must be bespoke marketing assets.
- Screenshots must come from the real build.
- A real gameplay video is mandatory before release.

## Implementation and release rules

- Implement the simplified concept, not the larger wish list.
- Alignment, readability, and motion quality are release blockers.
- Do not publish until every gate has a final PASS file.
- If a gate fails, write concrete feedback from the failed checklist items and redo that step from the beginning before retrying.
- Do not claim social posting is blocked until the local workspace auth sources have been checked.

## PlayDrop-specific guidance

### `playdrop project create app`

- Prefer `playdrop project create app` when it works because apps need to be registered with the PlayDrop server.
- Prefer the TypeScript template unless the game is a very small HTML-heavy UI game.
- Prefer remixing a demo project over starting from a template if the demo is already close.

### TypeScript app folders

- Use a `src` folder for code.
- Keep the app's own `catalogue.json`.
- Keep the build output referenced by that `catalogue.json`.
- Typical files are `build.mjs`, `package.json`, `tsconfig.json`, `template.html`, and optional `tests`.

### Coding rules

- Keep things as simple as possible.
- Do not invent SDK methods or types.
- Check the SDK types, PlayDrop documentation, and demos before improvising.
- Run type checks, project validation, and real browser verification before calling a build ready.
