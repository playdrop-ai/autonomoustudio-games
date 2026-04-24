# 08-release - Release

## Instruction

- Publish, verify the live build, update README, complete release tasks, complete social posting, and close out any PlayDrop feedback.

## Output

- Published `autonomoustudio/app/starfold` version `1.0.0`, verified the live listing and hosted build, updated the game README with release URLs, published both X posts, and sent PlayDrop feedback for the reproduced template-creation bug.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Live listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/starfold`
- Live hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/starfold/v1.0.0/index.html`
- Live app detail from `playdrop detail autonomoustudio/app/starfold --json`
- X gameplay post: `https://x.com/autonomoustudio/status/2036985009915969813`
- X link post: `https://x.com/autonomoustudio/status/2036985516931912007`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/README.md`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] The gameplay video post on X has been published.
- [x] The follow-up X post with the game link has been published.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] The game repo changes are committed and pushed.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The raw hosted build was verified directly on `assets.playdrop.ai` instead of relying only on the creator listing so the release gate reflects the real public entrypoint.
- X posting required a headed login pass because the initial headless login flow returned a broken CORS error on the X onboarding API. Once the headed flow loaded correctly, both release posts were completed in the same authenticated browser session.

## Evidence

- Published app ref: `autonomoustudio/app/starfold`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/starfold`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/starfold/v1.0.0/index.html`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2036985009915969813`
- X link post URL: `https://x.com/autonomoustudio/status/2036985516931912007`
- PlayDrop feedback id: `14`

## Verdict

PASS

## Required Fixes If Failed

- None
