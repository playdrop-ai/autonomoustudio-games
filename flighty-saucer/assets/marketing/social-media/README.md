# Flighty Saucer social media package

Status: the shared 9:16 short is owner approved. Nothing in this directory
authorizes publication.

Destination: https://www.playdrop.ai/creators/autonomoustudio/apps/game/flighty-saucer

## Campaign promise

Every tap bumps a tiny UFO upward. Dodge the unexpected, cross five vivid worlds, and beat your best.

This promise follows the current game exactly:

- tap controls upward thrust;
- gravity pulls the UFO back down;
- monolith gates and crystal hazards create the challenge;
- five environments create visual progression;
- a saved high score and leaderboard create the goal.

## Package inventory

- `short/portrait-9x16.mp4`: owner-approved shared 1080x1920 short for YouTube
  Shorts, TikTok, Instagram Reels, and Instagram Stories.
- `short/pinterest-2x3.mp4`: 1000x1500 Pinterest video Pin.
- `trailer/landscape-16x9.mp4`: 1920x1080 YouTube trailer and X video.
- `pinterest/static/`: five 1000x1500 image Pins in campaign story order.
- `instagram/feed/video-3x4.mp4`: 1080x1440 feed video.
- `instagram/feed/carousel/`: five 1080x1440 carousel cards in campaign story order.
- `instagram/reels-cover-420x654.png`: ratio-specific Reels cover.
- `youtube/trailer-thumbnail-1280x720.png`: YouTube trailer thumbnail.
- `manifest.json`: exact channel copy, titles, descriptions, tags, pinned comments, alt text, destination, and UTM naming.
- `research.md`: competitor and current platform research completed before the copy was written.
- `project/imagegen-prompts.md`: exact ImageGen briefs used for ratio-native static adaptations.
- `project/render-package.mjs`: deterministic video assembly and source-master copy script.

## Creative integrity

The 9:16 short is a byte-for-byte copy of the approved Flighty Saucer
casual-to-advanced v3 master. It shows calm early gameplay, then jumps into the
same real run at score 30+, ends on a real score-32 crash, and fades to the
protected hero. The 16:9 trailer remains a byte-for-byte copy of the approved
v2 landscape master.

Pinterest and Instagram video adaptations use:

- native ImageGen hero art for the opening and closing identity segments;
- the real HUD-free portrait gameplay capture for the middle segment;
- a verified centered crop that keeps the UFO and synchronized cartoon tap hand visible;
- the original captured game audio at 1x speed.

The five 2:3 and five 3:4 static cards are ratio-native ImageGen recompositions based on both approved 9:16 and 16:9 masters. They are not code-built replacements and do not use bars, filler, or stretched artwork.

## Publishing handoff

Publishing remains a separate operator action:

1. Publish the YouTube trailer first.
2. Publish the registered YouTube Short and connect it to the trailer as the
   related video. YouTube Stories are not a destination because that product
   was retired.
3. Publish TikTok with the approved pinned comment.
4. Publish the Pinterest video Pin and five static Pins.
5. Publish the X video, add the tracked first reply, and pin the post.
6. Do not publish or probe Instagram while `@playdropai` remains disabled. The assets and copy are prepared for a restored or replacement account.
7. Record every public URL and provider identifier in `publication.json`.

## Validation

Run:

```bash
node /Users/olivier/Documents/playdrop/plugins/playdrop-creator/skills/make-social-media-package/scripts/validate-social-package.mjs \
  /Users/olivier/Documents/autonomoustudio-games/flighty-saucer/assets/marketing/social-media
```

Then review `review/final-package-composite.png` at full size and inspect both adapted videos from start to finish.
