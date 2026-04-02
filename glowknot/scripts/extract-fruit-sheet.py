#!/usr/bin/env python3

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFile


ImageFile.LOAD_TRUNCATED_IMAGES = True


def is_foreground(pixel: tuple[int, int, int, int], threshold: int) -> bool:
    r, g, b, a = pixel
    if a == 0:
        return False
    return max(r, g, b) > threshold


def connected_components(image: Image.Image, threshold: int, min_pixels: int) -> list[tuple[int, int, int, int]]:
    width, height = image.size
    px = image.load()
    visited = [[False] * width for _ in range(height)]
    boxes: list[tuple[int, int, int, int]] = []

    for y in range(height):
        for x in range(width):
            if visited[y][x]:
                continue
            visited[y][x] = True
            if not is_foreground(px[x, y], threshold):
                continue

            queue = deque([(x, y)])
            count = 0
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                cx, cy = queue.popleft()
                count += 1
                min_x = min(min_x, cx)
                min_y = min(min_y, cy)
                max_x = max(max_x, cx)
                max_y = max(max_y, cy)

                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    if visited[ny][nx]:
                        continue
                    visited[ny][nx] = True
                    if is_foreground(px[nx, ny], threshold):
                        queue.append((nx, ny))

            if count >= min_pixels:
                boxes.append((min_x, min_y, max_x + 1, max_y + 1))

    return boxes


def remove_black_background(image: Image.Image, threshold: int) -> Image.Image:
    image = image.convert("RGBA")
    out = Image.new("RGBA", image.size)
    src = image.load()
    dst = out.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = src[x, y]
            if a == 0 or max(r, g, b) <= threshold:
                dst[x, y] = (0, 0, 0, 0)
            else:
                dst[x, y] = (r, g, b, 255)
    return out


def keep_largest_component(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    width, height = image.size
    src = image.load()
    visited = [[False] * width for _ in range(height)]
    best_component: set[tuple[int, int]] = set()

    for y in range(height):
        for x in range(width):
            if visited[y][x]:
                continue
            visited[y][x] = True
            if src[x, y][3] == 0:
                continue

            queue = deque([(x, y)])
            component: set[tuple[int, int]] = set()
            while queue:
                cx, cy = queue.popleft()
                component.add((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    if visited[ny][nx]:
                        continue
                    visited[ny][nx] = True
                    if src[nx, ny][3] != 0:
                        queue.append((nx, ny))

            if len(component) > len(best_component):
                best_component = component

    out = Image.new("RGBA", image.size)
    dst = out.load()
    for x, y in best_component:
        dst[x, y] = src[x, y]
    return out


def make_square(image: Image.Image, size: int, padding: int) -> Image.Image:
    image = image.convert("RGBA")
    box = image.getbbox()
    if box is None:
      raise ValueError("image is empty after background removal")
    image = image.crop(box)
    inner = size - padding * 2
    scale = min(inner / image.width, inner / image.height)
    new_size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    image = image.resize(new_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - image.width) // 2
    y = (size - image.height) // 2
    canvas.alpha_composite(image, (x, y))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--threshold", type=int, default=20)
    parser.add_argument("--min-pixels", type=int, default=400)
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--padding", type=int, default=36)
    parser.add_argument("--sort", choices=("x", "yx"), default="yx")
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    source = Image.open(args.input).convert("RGBA")
    boxes = connected_components(source, args.threshold, args.min_pixels)
    if not boxes:
        raise SystemExit("no fruit components found")
    if args.sort == "x":
        boxes.sort(key=lambda box: box[0])
    else:
        boxes.sort(key=lambda box: (box[1], box[0]))

    manifest_lines = []
    for index, box in enumerate(boxes, start=1):
        crop = source.crop(box)
        transparent = remove_black_background(crop, args.threshold)
        transparent = keep_largest_component(transparent)
        square = make_square(transparent, args.size, args.padding)
        out_path = args.output_dir / f"fruit-{index:02d}.png"
        square.save(out_path)
        manifest_lines.append(f"{out_path.name}: box={box}")

    (args.output_dir / "manifest.txt").write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
