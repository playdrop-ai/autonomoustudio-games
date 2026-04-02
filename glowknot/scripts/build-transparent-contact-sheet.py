#!/usr/bin/env python3

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--cell-size", type=int, default=512)
    parser.add_argument("--padding", type=int, default=32)
    args = parser.parse_args()

    images = [Image.open(path).convert("RGBA") for path in args.inputs]
    rows = math.ceil(len(images) / args.columns)
    width = args.padding + args.columns * (args.cell_size + args.padding)
    height = args.padding + rows * (args.cell_size + args.padding)
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    for index, image in enumerate(images):
        row = index // args.columns
        column = index % args.columns
        x = args.padding + column * (args.cell_size + args.padding)
        y = args.padding + row * (args.cell_size + args.padding)
        if image.size != (args.cell_size, args.cell_size):
            image = image.resize((args.cell_size, args.cell_size), Image.Resampling.LANCZOS)
        sheet.alpha_composite(image, (x, y))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)


if __name__ == "__main__":
    main()
