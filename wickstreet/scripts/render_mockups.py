from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "mockups"

SURFACES = {
    "mobile-landscape": (932, 430),
    "desktop": (1440, 900),
}

HOUSE_SIGILS = [
    ("SUN", "#f0a53d"),
    ("DROP", "#3fd0d8"),
    ("LEAF", "#72d97c"),
    ("STAR", "#f073c2"),
]

HOUSE_LAYOUT = [
    (0.16, 0.20, 0),
    (0.84, 0.20, 1),
    (0.16, 0.78, 2),
    (0.84, 0.78, 3),
]


def font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Avenir Next.ttc",
        "/System/Library/Fonts/Supplemental/Helvetica Neue.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    index = 0 if weight == "regular" else 1
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=index)
        except OSError:
            continue
    return ImageFont.load_default()


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def gradient(size: tuple[int, int], top: str, bottom: str) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size)
    pixels = image.load()
    tr, tg, tb, _ = rgba(top)
    br, bg, bb, _ = rgba(bottom)
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(lerp(tr, br, t))
        g = int(lerp(tg, bg, t))
        b = int(lerp(tb, bb, t))
        for x in range(width):
            pixels[x, y] = (r, g, b, 255)
    return image


def draw_round(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], fill: str, radius: int, outline: str | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_text(draw: ImageDraw.ImageDraw, pos: tuple[float, float], text: str, *, size: int, fill: str, anchor: str = "la", weight: str = "regular") -> None:
    draw.text(pos, text, font=font(size, weight=weight), fill=fill, anchor=anchor)


def add_rain(base: Image.Image, amount: int) -> None:
    width, height = base.size
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for index in range(amount):
        x = int((index * 97) % width)
        y = int((index * 53) % height)
        length = 14 + (index % 7) * 2
        draw.line((x, y, x - 5, y + length), fill=rgba("#dce8ff", 60), width=1)
    blurred = layer.filter(ImageFilter.GaussianBlur(0.4))
    base.alpha_composite(blurred)


def draw_sigils(draw: ImageDraw.ImageDraw, center: tuple[float, float], sigil: str, color: str, scale: float) -> None:
    cx, cy = center
    if sigil == "SUN":
        draw.ellipse((cx - scale * 0.45, cy - scale * 0.45, cx + scale * 0.45, cy + scale * 0.45), fill=color)
    elif sigil == "DROP":
        draw.polygon(
            [
                (cx, cy - scale * 0.65),
                (cx + scale * 0.38, cy - scale * 0.05),
                (cx + scale * 0.2, cy + scale * 0.5),
                (cx - scale * 0.2, cy + scale * 0.5),
                (cx - scale * 0.38, cy - scale * 0.05),
            ],
            fill=color,
        )
    elif sigil == "LEAF":
        draw.ellipse((cx - scale * 0.55, cy - scale * 0.35, cx + scale * 0.55, cy + scale * 0.35), fill=color)
        draw.line((cx - scale * 0.35, cy + scale * 0.2, cx + scale * 0.3, cy - scale * 0.2), fill=rgba("#0f2b21"), width=max(1, int(scale * 0.08)))
    elif sigil == "STAR":
        points = []
        for index in range(10):
            angle = -1.5708 + index * 0.6283
            radius = scale * (0.5 if index % 2 == 0 else 0.22)
            points.append((cx + radius * __import__("math").cos(angle), cy + radius * __import__("math").sin(angle)))
        draw.polygon(points, fill=color)


def draw_city(surface: str, state: str) -> Image.Image:
    width, height = SURFACES[surface]
    canvas = gradient((width, height), "#13223b", "#08101f")
    draw = ImageDraw.Draw(canvas)

    field = (0.0, 0.0, float(width), float(height))
    fx0, fy0, fx1, fy1 = field

    road_color = "#2c3642"
    lane_color = "#4d6074"

    roads = [
        (fx0 + (fx1 - fx0) * 0.17, fy0 + 24, fx0 + (fx1 - fx0) * 0.29, fy1 - 24),
        (fx0 + (fx1 - fx0) * 0.44, fy0 + 24, fx0 + (fx1 - fx0) * 0.56, fy1 - 24),
        (fx0 + (fx1 - fx0) * 0.71, fy0 + 24, fx0 + (fx1 - fx0) * 0.83, fy1 - 24),
        (fx0 + 24, fy0 + (fy1 - fy0) * 0.24, fx1 - 24, fy0 + (fy1 - fy0) * 0.38),
        (fx0 + 24, fy0 + (fy1 - fy0) * 0.60, fx1 - 24, fy0 + (fy1 - fy0) * 0.74),
    ]
    for road in roads:
        draw_round(draw, road, road_color, radius=int(height * 0.015))
        if road[2] - road[0] > road[3] - road[1]:
            y = (road[1] + road[3]) / 2
            dash = 18 if surface == "desktop" else 12
            for x in range(int(road[0] + dash), int(road[2] - dash), dash * 2):
                draw.line((x, y, x + dash, y), fill=lane_color, width=2)
        else:
            x = (road[0] + road[2]) / 2
            dash = 18 if surface == "desktop" else 12
            for y in range(int(road[1] + dash), int(road[3] - dash), dash * 2):
                draw.line((x, y, x, y + dash), fill=lane_color, width=2)

    block_boxes = [
        (fx0 + 36, fy0 + 36, fx0 + (fx1 - fx0) * 0.16, fy0 + (fy1 - fy0) * 0.22),
        (fx0 + (fx1 - fx0) * 0.30, fy0 + 36, fx0 + (fx1 - fx0) * 0.43, fy0 + (fy1 - fy0) * 0.22),
        (fx0 + (fx1 - fx0) * 0.57, fy0 + 36, fx0 + (fx1 - fx0) * 0.70, fy0 + (fy1 - fy0) * 0.22),
        (fx0 + (fx1 - fx0) * 0.84, fy0 + 36, fx1 - 36, fy0 + (fy1 - fy0) * 0.22),
        (fx0 + 36, fy0 + (fy1 - fy0) * 0.40, fx0 + (fx1 - fx0) * 0.16, fy0 + (fy1 - fy0) * 0.58),
        (fx0 + (fx1 - fx0) * 0.84, fy0 + (fy1 - fy0) * 0.40, fx1 - 36, fy0 + (fy1 - fy0) * 0.58),
        (fx0 + 36, fy0 + (fy1 - fy0) * 0.76, fx0 + (fx1 - fx0) * 0.16, fy1 - 36),
        (fx0 + (fx1 - fx0) * 0.30, fy0 + (fy1 - fy0) * 0.76, fx0 + (fx1 - fx0) * 0.43, fy1 - 36),
        (fx0 + (fx1 - fx0) * 0.57, fy0 + (fy1 - fy0) * 0.76, fx0 + (fx1 - fx0) * 0.70, fy1 - 36),
        (fx0 + (fx1 - fx0) * 0.84, fy0 + (fy1 - fy0) * 0.76, fx1 - 36, fy1 - 36),
    ]
    block_palette = ["#26364d", "#294463", "#314b6b", "#2a3b57"]
    for index, box in enumerate(block_boxes):
        draw_round(draw, box, block_palette[index % len(block_palette)], radius=int(height * 0.02))

    active_house = 1 if state != "gameover" else 3
    next_house = 2
    for hx, hy, sigil_index in HOUSE_LAYOUT:
        color = HOUSE_SIGILS[sigil_index][1]
        sigil = HOUSE_SIGILS[sigil_index][0]
        cx = fx0 + (fx1 - fx0) * hx
        cy = fy0 + (fy1 - fy0) * hy
        home_box = (cx - 56, cy - 42, cx + 56, cy + 42)
        glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        if sigil_index == active_house:
            glow_draw = ImageDraw.Draw(glow)
            glow_draw.rounded_rectangle(home_box, radius=18, fill=rgba(color, 90))
            glow = glow.filter(ImageFilter.GaussianBlur(18))
            canvas.alpha_composite(glow)
        draw_round(draw, home_box, "#1d2d45", radius=18, outline=color if sigil_index == active_house else "#3f5877", width=3)
        window_fill = "#ffecb4" if sigil_index == active_house else "#718299"
        for wx in range(2):
            for wy in range(2):
                ox = cx - 24 + wx * 24
                oy = cy - 14 + wy * 20
                draw_round(draw, (ox, oy, ox + 14, oy + 12), window_fill, radius=5)
        draw_sigils(draw, (cx, cy + 54), sigil, color, 20)

    depot_center = (fx0 + (fx1 - fx0) * 0.50, fy0 + (fy1 - fy0) * 0.48)
    depot_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    depot_draw = ImageDraw.Draw(depot_layer)
    depot_draw.ellipse((depot_center[0] - 46, depot_center[1] - 46, depot_center[0] + 46, depot_center[1] + 46), fill=rgba("#ffd979", 90))
    depot_layer = depot_layer.filter(ImageFilter.GaussianBlur(16))
    canvas.alpha_composite(depot_layer)
    draw_round(draw, (depot_center[0] - 40, depot_center[1] - 30, depot_center[0] + 40, depot_center[1] + 30), "#27476a", radius=18, outline="#ffd979", width=3)
    draw_text(draw, depot_center, "DEPOT", size=18 if surface == "desktop" else 14, fill="#fff1b8", anchor="mm", weight="bold")

    barriers = [
        (fx0 + (fx1 - fx0) * 0.72, fy0 + (fy1 - fy0) * 0.43, 48, 20),
        (fx0 + (fx1 - fx0) * 0.47, fy0 + (fy1 - fy0) * 0.70, 58, 20),
        (fx0 + (fx1 - fx0) * 0.20, fy0 + (fy1 - fy0) * 0.31, 44, 20),
    ]
    if state == "start":
        barriers = barriers[:2]
    for bx, by, bw, bh in barriers:
        draw_round(draw, (bx - bw / 2, by - bh / 2, bx + bw / 2, by + bh / 2), "#d86d46", radius=8, outline="#ffe7bf", width=2)
        draw.line((bx - bw / 3, by - 6, bx + bw / 3, by + 6), fill="#ffe7bf", width=2)
        draw.line((bx - bw / 3, by + 6, bx + bw / 3, by - 6), fill="#ffe7bf", width=2)

    route_points = [
        depot_center,
        (fx0 + (fx1 - fx0) * 0.56, fy0 + (fy1 - fy0) * 0.68),
        (fx0 + (fx1 - fx0) * 0.76, fy0 + (fy1 - fy0) * 0.68),
        (fx0 + (fx1 - fx0) * 0.84, fy0 + (fy1 - fy0) * 0.22),
    ]
    if state == "gameover":
        route_points = [
            depot_center,
            (fx0 + (fx1 - fx0) * 0.28, fy0 + (fy1 - fy0) * 0.67),
            (fx0 + (fx1 - fx0) * 0.16, fy0 + (fy1 - fy0) * 0.78),
        ]
    route_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    route_draw = ImageDraw.Draw(route_layer)
    route_draw.line(route_points, fill=rgba("#6af2ff", 120), width=12, joint="curve")
    route_layer = route_layer.filter(ImageFilter.GaussianBlur(8))
    canvas.alpha_composite(route_layer)
    draw.line(route_points, fill="#d8feff", width=4 if surface == "mobile-landscape" else 5, joint="curve")

    courier_pos = (fx0 + (fx1 - fx0) * 0.61, fy0 + (fy1 - fy0) * 0.66) if state != "gameover" else (fx0 + (fx1 - fx0) * 0.29, fy0 + (fy1 - fy0) * 0.67)
    courier_glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(courier_glow)
    glow_draw.ellipse((courier_pos[0] - 24, courier_pos[1] - 24, courier_pos[0] + 24, courier_pos[1] + 24), fill=rgba("#ffe98a", 140))
    courier_glow = courier_glow.filter(ImageFilter.GaussianBlur(12))
    canvas.alpha_composite(courier_glow)
    draw.ellipse((courier_pos[0] - 18, courier_pos[1] - 18, courier_pos[0] + 18, courier_pos[1] + 18), fill="#f1cb56", outline="#fff0c7", width=3)
    draw_round(draw, (courier_pos[0] - 10, courier_pos[1] - 6, courier_pos[0] + 16, courier_pos[1] + 12), "#f7f1d7", radius=8)
    draw_round(draw, (courier_pos[0] + 6, courier_pos[1] - 12, courier_pos[0] + 22, courier_pos[1] + 4), HOUSE_SIGILS[active_house][1], radius=6)

    draw_round(draw, (fx0 + 22, fy0 + 18, fx0 + 184, fy0 + 60), "#0a1424", radius=18, outline="#243751", width=2)
    draw_text(draw, (fx0 + 40, fy0 + 39), "SCORE", size=14 if surface == "mobile-landscape" else 16, fill="#87a2c5")
    draw_text(draw, (fx0 + 170, fy0 + 39), "4,820", size=22 if surface == "mobile-landscape" else 28, fill="#f4f7fb", anchor="ra", weight="bold")

    strikes_x = fx1 - 156
    draw_round(draw, (strikes_x, fy0 + 18, fx1 - 22, fy0 + 60), "#0a1424", radius=18, outline="#243751", width=2)
    draw_text(draw, (strikes_x + 18, fy0 + 39), "BLACKOUT", size=14 if surface == "mobile-landscape" else 16, fill="#87a2c5")
    for index in range(3):
        fill = "#ff8c62" if index < (1 if state == "start" else 2 if state == "gameplay" else 3) else "#3c4c63"
        draw.ellipse((fx1 - 78 + index * 18, fy0 + 29, fx1 - 64 + index * 18, fy0 + 43), fill=fill)

    card_height = 66 if surface == "mobile-landscape" else 92
    card_y0 = fy1 - card_height - 18
    card_gap = 16
    card_w = 166 if surface == "mobile-landscape" else 224
    card_x0 = fx0 + 24
    for index, label in enumerate(["ACTIVE", "NEXT"]):
        box = (card_x0 + index * (card_w + card_gap), card_y0, card_x0 + index * (card_w + card_gap) + card_w, card_y0 + card_height)
        draw_round(draw, box, "#0b1526", radius=22, outline="#243751", width=2)
        draw_text(draw, (box[0] + 18, box[1] + 18), label, size=14 if surface == "mobile-landscape" else 18, fill="#7e99bb")
        sigil_index = active_house if index == 0 else next_house
        draw_sigils(draw, (box[0] + 44, box[1] + card_height / 2 + 4), HOUSE_SIGILS[sigil_index][0], HOUSE_SIGILS[sigil_index][1], 24 if surface == "mobile-landscape" else 30)
        draw_text(draw, (box[0] + 74, box[1] + card_height / 2 + 2), HOUSE_SIGILS[sigil_index][0], size=20 if surface == "mobile-landscape" else 24, fill="#eef4ff", anchor="lm", weight="bold")
        if index == 0:
            ring_box = (box[2] - 54, box[1] + 14, box[2] - 18, box[1] + 50)
            draw.arc(ring_box, start=-90, end=180 if state == "gameplay" else 230, fill=HOUSE_SIGILS[sigil_index][1], width=5)

    if state == "start":
        overlay = (fx0 + 24, fy0 + 24, fx0 + (fx1 - fx0) * 0.46, fy0 + 160)
        draw_round(draw, overlay, "#08101dd6", radius=28, outline="#304667", width=2)
        draw_text(draw, (overlay[0] + 26, overlay[1] + 30), "WICKSTREET", size=28 if surface == "mobile-landscape" else 42, fill="#f6f3dd", weight="bold")
        draw_text(draw, (overlay[0] + 26, overlay[1] + 72), "Match the glow core to the lit home\nbefore the blackout timer burns out.", size=15 if surface == "mobile-landscape" else 20, fill="#cfdbef")
        button = (overlay[0] + 26, overlay[3] - 52, overlay[0] + 154, overlay[3] - 16)
        draw_round(draw, button, "#f0a53d", radius=18)
        draw_text(draw, ((button[0] + button[2]) / 2, (button[1] + button[3]) / 2 + 1), "PLAY", size=16 if surface == "mobile-landscape" else 20, fill="#162238", anchor="mm", weight="bold")
    elif state == "gameover":
        overlay = (fx0 + (fx1 - fx0) * 0.30, fy0 + (fy1 - fy0) * 0.24, fx0 + (fx1 - fx0) * 0.70, fy0 + (fy1 - fy0) * 0.60)
        draw_round(draw, overlay, "#08101de8", radius=30, outline="#304667", width=2)
        draw_text(draw, ((overlay[0] + overlay[2]) / 2, overlay[1] + 40), "BLOCK LOST", size=26 if surface == "mobile-landscape" else 38, fill="#fff2df", anchor="ma", weight="bold")
        draw_text(draw, (overlay[0] + 44, overlay[1] + 94), "SCORE", size=14 if surface == "mobile-landscape" else 18, fill="#7e99bb")
        draw_text(draw, (overlay[2] - 44, overlay[1] + 94), "6,240", size=28 if surface == "mobile-landscape" else 38, fill="#f5f8fc", anchor="ra", weight="bold")
        draw_text(draw, (overlay[0] + 44, overlay[1] + 136), "BEST", size=14 if surface == "mobile-landscape" else 18, fill="#7e99bb")
        draw_text(draw, (overlay[2] - 44, overlay[1] + 136), "7,020", size=24 if surface == "mobile-landscape" else 32, fill="#dde6f6", anchor="ra", weight="bold")
        button = (overlay[0] + 44, overlay[3] - 62, overlay[2] - 44, overlay[3] - 18)
        draw_round(draw, button, "#f0a53d", radius=20)
        draw_text(draw, ((button[0] + button[2]) / 2, (button[1] + button[3]) / 2 + 1), "RETRY", size=18 if surface == "mobile-landscape" else 24, fill="#162238", anchor="mm", weight="bold")

    add_rain(canvas, 90 if surface == "desktop" else 48)
    return canvas


def render() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for surface in SURFACES:
        for state in ("start", "gameplay", "gameover"):
            image = draw_city(surface, state)
            image.save(OUT_DIR / f"{surface}-{state}.png")


if __name__ == "__main__":
    render()
