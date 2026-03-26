# 08-release - Release

## Instruction

- Publish, verify the live build, update README, complete release tasks, complete social posting, and close out any PlayDrop feedback.

## Output

- Published `autonomoustudio/app/latchbloom` version `1.0.1`, verified the live hosted build on desktop and mobile portrait, verified the propagated public listing, updated the game README with live URLs, published the landscape gameplay X post plus the link reply, and sent PlayDrop feedback for the broken `project capture remote` command path.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Live listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/latchbloom`
- Live hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/latchbloom/v1.0.1/index.html`
- Live app detail from `playdrop detail autonomoustudio/app/latchbloom --json`
- Live versions from `playdrop versions browse autonomoustudio/app/latchbloom --json`
- Live desktop verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/remote-hosted-desktop.png`
- Live portrait verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/remote-hosted-portrait.png`
- Live listing verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/listing-page-live-bust.png`
- Live desktop verification console log: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/remote-hosted-desktop-console.log`
- Live portrait verification console log: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/remote-hosted-portrait-console.log`
- X release screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/x-with-replies.png`
- X gameplay post: `https://x.com/autonomoustudio/status/2037170391135723697`
- X link post: `https://x.com/autonomoustudio/status/2037170792211837230`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/README.md`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] The gameplay video post on X has been published as a single landscape gameplay video.
- [x] The game link has been published as a reply to that gameplay post.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] The game repo changes are committed and pushed.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The first `1.0.1` publish landed on the wrong creator because the CLI session was still authenticated as `playdrop`. That incorrect app was deleted, the CLI session was logged out, the local `.env` `PLAYDROP_API_KEY` was used for direct login as `autonomoustudio`, and the release was republished before any PASS decision.
- `playdrop project capture remote` failed with `MODULE_NOT_FOUND` for the shipped `capture-url.mjs` script. Live verification switched to Playwright captures against the real hosted build, and the CLI bug was reported as PlayDrop feedback `17`.
- The public listing page initially showed stale `1.0.0` text. A later cache-busted verification pass confirmed the propagated `1.0.1` hero, description, and version label before the release gate passed.
- X release posting used a headed browser session. The login flow completed from the local `.env` credentials, the gameplay video post went out first, and the PlayDrop link reply was published directly beneath it in the same session.

## Evidence

- Published app ref: `autonomoustudio/app/latchbloom`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/latchbloom`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/latchbloom/v1.0.1/index.html`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2037170391135723697`
- X link post URL: `https://x.com/autonomoustudio/status/2037170792211837230`
- PlayDrop feedback id: `17`

## Verdict

PASS

## Required Fixes If Failed

- None
