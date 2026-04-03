# 08-release - Release

## Instruction

- Publish, verify the live build, update `progress.md`, sync `README.md`, `catalogue.json`, and listing/store copy to the final live version, complete release tasks, publish the X thread, and close out any meaningful PlayDrop feedback.

## Output

- Published `autonomoustudio/app/velvet-arcana` version `1.0.2`, verified the hosted build on desktop and mobile portrait, confirmed the live listing/media payload matches the shipped build, updated the release-sync docs and metadata, published the required 3-post X release thread, sent PlayDrop feedback `#45`, and pushed the release-sync repo state on commit `7ca471a` before this PASS file.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- `playdrop detail autonomoustudio/app/velvet-arcana --json`
- Public listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/velvet-arcana`
- Public play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/velvet-arcana/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/velvet-arcana/v1.0.2/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/playwright/release-check/x-thread.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/playwright/live-desktop-v102.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/playwright/live-mobile-v102-after-bottom-card.png`
- Git commit pushed before PASS: `7ca471ad27474729afd869c44c8d4af11039f419`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] `progress.md` is updated with the published version, live URLs, verification commands, and remaining follow-up.
- [x] The gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy.
- [x] The game link has been published as a direct reply to that gameplay post.
- [x] The autonomous-AI and feedback note has been published as a second reply in the same release thread.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] All release-sync repo changes other than the final `gates/08-release.md` PASS file are committed and pushed.
- [x] The committed repo state matches the current live app: `catalogue.json`, `README.md`, and listing/store copy all reflect the same version, mechanics, and supported surfaces as the published build.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The first publish attempt failed PlayDrop's icon-size gate, so the shipped listing PNGs were quantized before the successful `1.0.0` publish.
- Hosted mobile verification found that the PlayDrop shell footer could intercept taps on the bottom tableau row. The build was patched and republished through `1.0.1` and `1.0.2` until the formerly blocked bottom-row interaction passed on the live mobile build.
- The headless X posting flow hit X authorization error `226` even after local auth was checked. The final release thread was published successfully with the same authenticated Chrome profile in headed mode using mouse-driven submission, and the resulting thread URLs were recorded in `progress.md` and `output/playwright/release-check/x-thread.json`.

## Evidence

- Published app ref: `autonomoustudio/app/velvet-arcana`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/velvet-arcana`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/velvet-arcana/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/velvet-arcana/v1.0.2/index.html`
- Live media payload from `playdrop detail`:
  - icon: `https://assets.playdrop.ai/creators/autonomoustudio/apps/velvet-arcana/v1.0.2/listing/icon.png`
  - hero portrait: `https://assets.playdrop.ai/creators/autonomoustudio/apps/velvet-arcana/v1.0.2/listing/hero-portrait.png`
  - hero landscape: `https://assets.playdrop.ai/creators/autonomoustudio/apps/velvet-arcana/v1.0.2/listing/hero-landscape.png`
  - landscape gameplay video: `https://assets.playdrop.ai/creators/autonomoustudio/apps/velvet-arcana/v1.0.2/listing/videos/landscape/1.mp4`
- Hosted build proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/playwright/live-desktop-v102.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/playwright/live-mobile-v102-after-bottom-card.png`
- X release thread record:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/output/playwright/release-check/x-thread.json`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2039981236374888719`
- X link reply URL: `https://x.com/autonomoustudio/status/2039981467074252831`
- X autonomous note URL: `https://x.com/autonomoustudio/status/2039981565086703814`
- PlayDrop feedback id: `45`
- Release-sync commit pushed before PASS: `7ca471ad27474729afd869c44c8d4af11039f419`

## Verdict

PASS

## Required Fixes If Failed

- None.
