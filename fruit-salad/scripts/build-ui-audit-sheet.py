#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ORDER = [
    ("start", "Start"),
    ("play", "Play"),
    ("drop", "Drop Toast"),
    ("gameover", "Game Over"),
]

VIEWPORTS = [
    ("desktop", "Desktop"),
    ("portrait", "Portrait"),
]


def main() -> None:
    if len(sys.argv) != 3:
      raise SystemExit("usage: build-ui-audit-sheet.py <input-dir> <output-file>")

    input_dir = Path(sys.argv[1])
    output_file = Path(sys.argv[2])
    output_file.parent.mkdir(parents=True, exist_ok=True)

    font = ImageFont.load_default()
    label_h = 28
    gutter = 16
    tile_w = 340
    tile_h = 340
    header_h = 34

    canvas_w = gutter + len(VIEWPORTS) * (tile_w + gutter)
    canvas_h = header_h + gutter + len(ORDER) * (tile_h + label_h + gutter)
    sheet = Image.new("RGB", (canvas_w, canvas_h), (18, 20, 18))
    draw = ImageDraw.Draw(sheet)

    for col, (_, viewport_label) in enumerate(VIEWPORTS):
        x = gutter + col * (tile_w + gutter)
        draw.text((x, 8), viewport_label, fill=(245, 239, 223), font=font)

    for row, (state_key, state_label) in enumerate(ORDER):
        y = header_h + gutter + row * (tile_h + label_h + gutter)
        draw.text((gutter, y - 18), state_label, fill=(228, 220, 194), font=font)
        for col, (viewport_key, _) in enumerate(VIEWPORTS):
            image_path = input_dir / f"{state_key}-{viewport_key}.png"
            image = Image.open(image_path).convert("RGB")
            thumb = contain(image, tile_w, tile_h)
            x = gutter + col * (tile_w + gutter)
            tile_x = x + (tile_w - thumb.width) // 2
            tile_y = y + (tile_h - thumb.height) // 2
            draw.rounded_rectangle((x, y, x + tile_w, y + tile_h), radius=18, outline=(62, 66, 57), width=2, fill=(11, 12, 11))
            sheet.paste(thumb, (tile_x, tile_y))
            draw.text((x, y + tile_h + 6), image_path.name, fill=(152, 156, 145), font=font)

    sheet.save(output_file, quality=92)


def contain(image: Image.Image, box_w: int, box_h: int) -> Image.Image:
    copy = image.copy()
    copy.thumbnail((box_w, box_h))
    return copy


if __name__ == "__main__":
    main()
