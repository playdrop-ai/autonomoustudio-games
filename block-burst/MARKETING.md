# Block Burst Marketing

Block Burst uses final PlayDrop AI listing art generated from real gameplay references:

- landscape hero featuring a normal row/column burst
- portrait hero featuring a normal row/column burst
- square icon generated separately from the hero around a normal block burst
- real gameplay screenshots from the built game
- real PlayDrop marketing capture videos from the preview hook

Preview capture uses the `sfx-only` policy so listing videos include the game's procedural placement and line-clear burst sounds without adding unlicensed music.

Accepted listing media:

- `assets/marketing/playdrop/hero-landscape.png`
- `assets/marketing/playdrop/hero-portrait.png`
- `assets/marketing/playdrop/icon.png`
- `assets/marketing/screenshots/landscape-1.png`
- `assets/marketing/screenshots/portrait-1.png`
- `assets/marketing/videos/landscape.mp4`
- `assets/marketing/videos/portrait.mp4`

The final listing MP4s were rendered from official `playdrop project marketing capture` source captures in `assets/marketing/captures/`.
The `1.0.4` media pass removes all special blocks from preview/video and focuses the launch package on the actual core loop: place normal pieces, complete rows or columns, and watch blocks burst. The preview stages three normal-block moments: a multi-line 2x2 clear, a horizontal row clear, and a vertical column clear. Listing capture records real SFX at accepted loudness, and final media must pass visual review before republish.

Visual review evidence:

- `tmp/final-r104-contact.png` shows the final portrait and landscape listing videos with no browser chrome, no HUD, no stretched frames, no special-block icons, and multiple visible normal line/block burst moments.
- `tmp/block-burst-proof-composite-r104.png` compares the selected portrait video frame, landscape video frame, both hero artworks, and app icon as the current launch set.
- Official capture audio is `sfx-only`, full-length, and accepted by PlayDrop marketing capture at about `-16.7 LUFS` with peaks below clipping.
