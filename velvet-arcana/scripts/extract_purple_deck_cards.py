#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana")
SOURCE_DIR = ROOT / "art/card-sheets/purple-deck-sources"
OUTPUT_DIR = ROOT / "art/cards/purple-deck-png"
CONTACT_SHEET_PATH = OUTPUT_DIR / "purple-deck-contact-sheet.png"

CARD_BOXES = [
    (101, 206, 312, 561),
    (341, 206, 552, 561),
    (582, 206, 793, 561),
    (823, 206, 1034, 561),
    (1064, 206, 1275, 561),
]

TOP_LEFT_BOX = (12, 11, 57, 56)
TOP_RIGHT_BOX = (155, 11, 200, 56)
BOTTOM_LEFT_BOX = (12, 300, 57, 345)
BOTTOM_RIGHT_BOX = (155, 300, 200, 345)

CARD_BG = "#262B27"
OUTPUT_SIZE = (422, 710)
OUTPUT_RADIUS = 40
OUTPUT_STROKE = 4
FACE_BLEED_TRIM = 5
BACK_BLEED_TRIM = 12
THUMB_SCALE = 0.32
GAP = 20
MARGIN = 28
HEADER_H = 44

FAMILIES = ["moon", "rose", "sun", "tree"]
FAMILY_SLOT_INDEX = {"moon": 1, "rose": 2, "sun": 3, "tree": 4}
RANK_FILES = [
    ("1", "rank-1.png"),
    ("2", "rank-2.jpg"),
    ("3", "rank-3.jpg"),
    ("4", "rank-4.jpg"),
    ("5", "rank-5.jpg"),
    ("6", "rank-6.jpg"),
    ("7", "rank-7.jpg"),
    ("8", "rank-8-draft.jpg"),
    ("9", "rank-9.jpg"),
    ("10", "rank-10.jpg"),
    ("jack", "rank-jack.jpg"),
    ("queen", "rank-queen.jpg"),
    ("king", "rank-king.jpg"),
]


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def crop_card(sheet: Image.Image, slot_index: int) -> Image.Image:
    return sheet.crop(CARD_BOXES[slot_index])


def patch_face_card(card: Image.Image, family_icon_patch: Image.Image) -> Image.Image:
    result = card.copy()
    top_left_patch = result.crop(TOP_LEFT_BOX)
    result.paste(family_icon_patch, TOP_RIGHT_BOX, family_icon_patch)
    result.paste(family_icon_patch.rotate(180, expand=False), BOTTOM_LEFT_BOX, family_icon_patch.rotate(180, expand=False))
    rotated_rank = top_left_patch.rotate(180, expand=False)
    result.paste(rotated_rank, BOTTOM_RIGHT_BOX, rotated_rank)
    return result


def finish_card(card: Image.Image, bleed_trim: int) -> Image.Image:
    scaled = card.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    finished = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    base_draw = ImageDraw.Draw(finished)
    base_draw.rounded_rectangle(
        [0, 0, OUTPUT_SIZE[0] - 1, OUTPUT_SIZE[1] - 1],
        radius=OUTPUT_RADIUS,
        fill=CARD_BG,
    )
    inner_mask = Image.new("L", OUTPUT_SIZE, 0)
    inner_draw = ImageDraw.Draw(inner_mask)
    inner_draw.rounded_rectangle(
        [bleed_trim, bleed_trim, OUTPUT_SIZE[0] - 1 - bleed_trim, OUTPUT_SIZE[1] - 1 - bleed_trim],
        radius=max(0, OUTPUT_RADIUS - bleed_trim),
        fill=255,
    )
    finished.paste(scaled, (0, 0), inner_mask)
    stroke_draw = ImageDraw.Draw(finished)
    stroke_draw.rounded_rectangle(
        [0, 0, OUTPUT_SIZE[0] - 1, OUTPUT_SIZE[1] - 1],
        radius=OUTPUT_RADIUS,
        outline=CARD_BG,
        width=2,
    )
    inset = OUTPUT_STROKE // 2
    stroke_draw.rounded_rectangle(
        [inset, inset, OUTPUT_SIZE[0] - 1 - inset, OUTPUT_SIZE[1] - 1 - inset],
        radius=OUTPUT_RADIUS,
        outline=CARD_BG,
        width=OUTPUT_STROKE,
    )
    return finished


def save_card(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def make_contact_sheet(cards: Dict[str, Path]) -> None:
    font = ImageFont.load_default()
    thumb_w = int(OUTPUT_SIZE[0] * THUMB_SCALE)
    thumb_h = int(OUTPUT_SIZE[1] * THUMB_SCALE)
    columns = ["back"] + [rank for rank, _ in RANK_FILES]
    width = MARGIN * 2 + 14 * thumb_w + 13 * GAP + 120
    height = MARGIN * 2 + HEADER_H + 5 * thumb_h + 4 * GAP
    canvas = Image.new("RGBA", (width, height), "#111111")
    draw = ImageDraw.Draw(canvas)

    start_x = MARGIN + 120
    for idx, label in enumerate(columns):
        x = start_x + idx * (thumb_w + GAP)
        draw.text((x + 8, MARGIN), label.upper(), fill="#d6d0c4", font=font)

    back_img = load_rgba(cards["back"]).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    back_y = MARGIN + HEADER_H
    back_x = start_x
    canvas.alpha_composite(back_img, (back_x, back_y))
    draw.text((MARGIN, back_y + thumb_h // 2 - 6), "BACK", fill="#d6d0c4", font=font)

    for row_idx, family in enumerate(FAMILIES):
        y = MARGIN + HEADER_H + (row_idx + 1) * (thumb_h + GAP)
        draw.text((MARGIN, y + thumb_h // 2 - 6), family.upper(), fill="#d6d0c4", font=font)
        for col_idx, (rank, _) in enumerate(RANK_FILES, start=1):
            x = start_x + col_idx * (thumb_w + GAP)
            key = f"{family}-{rank}"
            img = load_rgba(cards[key]).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            canvas.alpha_composite(img, (x, y))

    canvas.save(CONTACT_SHEET_PATH)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    template = load_rgba(SOURCE_DIR / "template.jpg")
    family_icon_patches = {
        family: crop_card(template, FAMILY_SLOT_INDEX[family]).crop(TOP_RIGHT_BOX)
        for family in FAMILIES
    }

    cards: Dict[str, Path] = {}

    # The back always comes from the original purple template sheet, never from any rank sheet.
    back_card = finish_card(crop_card(template, 0), bleed_trim=BACK_BLEED_TRIM)
    back_path = OUTPUT_DIR / "back.png"
    save_card(back_card, back_path)
    cards["back"] = back_path

    for rank, filename in RANK_FILES:
        sheet = load_rgba(SOURCE_DIR / filename)
        for family in FAMILIES:
            slot_index = FAMILY_SLOT_INDEX[family]
            card = crop_card(sheet, slot_index)
            patched = patch_face_card(card, family_icon_patches[family])
            finished = finish_card(patched, bleed_trim=FACE_BLEED_TRIM)
            out_path = OUTPUT_DIR / f"{family}-{rank}.png"
            save_card(finished, out_path)
            cards[f"{family}-{rank}"] = out_path

    make_contact_sheet(cards)

    print(f"wrote {len(cards)} cards to {OUTPUT_DIR}")
    print(f"contact sheet: {CONTACT_SHEET_PATH}")


if __name__ == "__main__":
    main()
