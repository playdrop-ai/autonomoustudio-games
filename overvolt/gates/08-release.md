# 08-release - Release

## Instruction

- Publish, verify the live build, update `progress.md`, sync `README.md`, `catalogue.json`, and listing/store copy to the final live version, complete release tasks, publish the X thread, and close out any meaningful PlayDrop feedback.

## Output

- Published `autonomoustudio/app/overvolt` version `1.0.0`, verified the live listing and the authenticated PlayDrop play shell on desktop plus mobile landscape, updated the release-sync docs to the final live version, published the required 3-post X release thread, sent PlayDrop feedback `#47`, and pushed the release-sync repo state on commit `a416faf` before this PASS file.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- `playdrop detail autonomoustudio/app/overvolt --json`
- Public listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/overvolt`
- Public play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/overvolt/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/release-check.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/x-thread.json`
- Git commit pushed before PASS: `a416faf80fff43350d6fe29b68f879b4cd1799b2`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] `progress.md` is updated with the published version, live URLs, verification commands, and any remaining follow-up.
- [x] For a first public launch or major marketed update, the gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy.
- [x] For a first public launch or major marketed update, the game link has been published as a direct reply to that gameplay post.
- [x] For a first public launch or major marketed update, the autonomous-AI and feedback note has been published as a second reply in the same release thread.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] All release-sync repo changes other than the final `gates/08-release.md` PASS file are committed and pushed.
- [x] The committed repo state matches the current live app: `catalogue.json`, `README.md`, and listing/store copy all reflect the same version, mechanics, and supported surfaces as the published build.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The first publish attempt failed PlayDrop's icon-size gate because `listing/icon.png` exceeded the `512KB` cap. I quantized the listing PNGs, revalidated the asset sizes, and reran publish successfully on the same `1.0.0` release.
- The raw hosted asset URL reported by publish/detail was not a direct verification path for this auth-required app: opening the bare `index.html` did not provide a runnable standalone host bridge, while the public `/play` shell correctly required sign-in before loading the iframe. I verified the listing anonymously, verified the expected sign-in gate anonymously on `/play`, then verified the real live build through the authenticated PlayDrop shell using the saved local X profile. That gap was sent to PlayDrop as feedback `#47`.
- The final X thread used the saved authenticated local X profile in headed mouse-click mode, which completed the gameplay post plus the two required replies and wrote the exact URLs to `output/playwright/release-check/x-thread.json`.

## Evidence

- Published app ref: `autonomoustudio/app/overvolt`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/overvolt`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/overvolt/play`
- Hosted build URL reported by detail: `https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/index.html`
- Live media payload from `playdrop detail`:
  - icon: `https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/listing/icon.png`
  - hero portrait: `https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/listing/hero-portrait.png`
  - hero landscape: `https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/listing/hero-landscape.png`
  - landscape screenshot 1: `https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/listing/screenshots/landscape/1.png`
  - landscape screenshot 2: `https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/listing/screenshots/landscape/2.png`
  - landscape gameplay video: `https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/listing/videos/landscape/1.mp4`
- Live browser verification:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/listing-public.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/public-play-auth-wall.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/play-shell-desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/play-shell-desktop-running.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/play-shell-mobile-landscape-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/play-shell-mobile-landscape-running.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/release-check.json`
- X release thread record:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/output/playwright/release-check/x-thread.json`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2040781688234500167`
- X link reply URL: `https://x.com/autonomoustudio/status/2040781846363910499`
- X autonomous note URL: `https://x.com/autonomoustudio/status/2040782003121856790`
- PlayDrop feedback id: `47`
- Release-sync commit pushed before PASS: `a416faf80fff43350d6fe29b68f879b4cd1799b2`

## Verdict

PASS

## Required Fixes If Failed

- None.
