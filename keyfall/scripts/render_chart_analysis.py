#!/usr/bin/env python3

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Sequence

import librosa
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
DATA_TS_PATH = ROOT / "src" / "game" / "generated" / "aiTrackData.ts"
ANALYSIS_PATH = ROOT / "src" / "game" / "generated" / "aiTrackAnalysis.json"
OUTPUT_DIR = ROOT / "output" / "chart-analysis"
ASSET_DIR = ROOT / "assets" / "audio"

SR = 22050
WINDOW_MS = 16000
IMAGE_SIZE = (1600, 960)
PANEL_HEIGHT = 220
LANE_HEIGHT = 42

TRACK_FILES = {
    "piano": ASSET_DIR / "piano-etude.mp3",
    "rock": ASSET_DIR / "rock-drive.mp3",
}


def load_data_ts() -> Dict[str, object]:
    raw = DATA_TS_PATH.read_text(encoding="utf-8")
    prefix = "export const AI_TRACK_DATA = "
    start = raw.index(prefix) + len(prefix)
    end = raw.rindex(" as const;")
    return json.loads(raw[start:end])


def load_analysis() -> Dict[str, object]:
    return json.loads(ANALYSIS_PATH.read_text(encoding="utf-8"))


def compute_window(track_id: str, data: Dict[str, object], analysis: Dict[str, object]) -> tuple[int, int]:
    notes = data[track_id]["charts"]["hard"]["notes"]
    first_note_ms = int(notes[0]["timeMs"]) if notes else 0
    sections = analysis[track_id].get("sections", [])
    if sections:
        section = sections[0]
        start_ms = max(0, int(section["startMs"]))
        end_ms = max(start_ms + WINDOW_MS, min(int(section["endMs"]), start_ms + WINDOW_MS))
    else:
        start_ms = max(0, first_note_ms - 500)
        end_ms = start_ms + WINDOW_MS
    return start_ms, end_ms


def waveform_points(track_path: Path, start_ms: int, end_ms: int, width: int) -> List[tuple[int, float]]:
    y, _ = librosa.load(track_path, sr=SR, mono=True, offset=start_ms / 1000.0, duration=(end_ms - start_ms) / 1000.0)
    if y.size == 0:
        return [(0, 0.0), (width, 0.0)]
    chunk_size = max(1, int(np.ceil(y.size / width)))
    envelope = np.array([np.max(np.abs(y[index : index + chunk_size])) for index in range(0, y.size, chunk_size)])
    if envelope.size < width:
        envelope = np.pad(envelope, (0, width - envelope.size), mode="edge")
    else:
        envelope = envelope[:width]
    envelope = envelope / max(float(np.max(envelope)), 1e-6)
    return [(index, float(value)) for index, value in enumerate(envelope.tolist())]


def ms_to_x(time_ms: int, start_ms: int, end_ms: int, left: int, width: int) -> int:
    span = max(1, end_ms - start_ms)
    normalized = (time_ms - start_ms) / span
    return left + int(round(normalized * width))


def lane_to_y(panel_top: int, lane: int) -> int:
    return panel_top + 40 + lane * LANE_HEIGHT


def draw_waveform(draw: ImageDraw.ImageDraw, points: Sequence[tuple[int, float]], left: int, top: int, width: int, height: int) -> None:
    center_y = top + height // 2
    polyline = []
    for offset_x, value in points:
        amplitude = int(round(value * (height * 0.42)))
        polyline.append((left + offset_x, center_y - amplitude))
    draw.line(polyline, fill="#8fc7b5", width=2)
    mirrored = [(x, center_y + (center_y - y)) for x, y in reversed(polyline)]
    fill_polygon = polyline + mirrored
    draw.polygon(fill_polygon, fill="#18392f")
    draw.line((left, center_y, left + width, center_y), fill="#33584d", width=1)


def draw_track_overview(track_id: str, data: Dict[str, object], analysis: Dict[str, object]) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    start_ms, end_ms = compute_window(track_id, data, analysis)
    image = Image.new("RGB", IMAGE_SIZE, "#071a15")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    title = f"{data[track_id]['label']} chart overview"
    subtitle = f"{start_ms}ms to {end_ms}ms"
    draw.text((40, 24), title, fill="#f4f6f3", font=font)
    draw.text((40, 48), subtitle, fill="#8ab4a4", font=font)

    content_left = 60
    content_width = IMAGE_SIZE[0] - 120
    waveform_top = 88
    waveform_height = 150
    draw.rounded_rectangle((content_left, waveform_top, content_left + content_width, waveform_top + waveform_height), radius=18, fill="#0d2a22", outline="#224237", width=2)
    waveform = waveform_points(TRACK_FILES[track_id], start_ms, end_ms, content_width - 40)
    draw_waveform(draw, waveform, content_left + 20, waveform_top + 10, content_width - 40, waveform_height - 20)

    beat_anchors = [anchor for anchor in data[track_id]["charts"]["hard"]["beatAnchors"] if start_ms <= int(anchor["timeMs"]) <= end_ms]
    for anchor in beat_anchors:
        x = ms_to_x(int(anchor["timeMs"]), start_ms, end_ms, content_left, content_width)
        color = "#f0ddb5" if int(anchor["beatInBar"]) == 0 else "#33584d"
        draw.line((x, waveform_top, x, waveform_top + waveform_height), fill=color, width=1)

    for panel_index, difficulty in enumerate(("easy", "medium", "hard")):
        panel_top = 280 + panel_index * PANEL_HEIGHT
        draw.rounded_rectangle((content_left, panel_top, content_left + content_width, panel_top + PANEL_HEIGHT - 18), radius=18, fill="#0d2a22", outline="#224237", width=2)
        draw.text((content_left + 18, panel_top + 14), difficulty.upper(), fill="#f4f6f3", font=font)

        for lane in range(4):
            lane_top = lane_to_y(panel_top, lane)
            lane_bottom = lane_top + LANE_HEIGHT - 8
            fill = "#102f26" if lane % 2 == 0 else "#12352b"
            draw.rounded_rectangle((content_left + 16, lane_top, content_left + content_width - 16, lane_bottom), radius=10, fill=fill)
            draw.text((content_left + 22, lane_top + 12), str(lane + 1), fill="#517466", font=font)

        notes = [
            note
            for note in data[track_id]["charts"][difficulty]["notes"]
            if start_ms <= int(note["timeMs"]) <= end_ms or start_ms <= int(note["timeMs"]) + int(note["durationMs"]) <= end_ms
        ]
        for note in notes:
            x0 = ms_to_x(int(note["timeMs"]), start_ms, end_ms, content_left + 16, content_width - 32)
            x1 = ms_to_x(int(note["timeMs"]) + max(90, int(note["durationMs"])), start_ms, end_ms, content_left + 16, content_width - 32)
            lane_top = lane_to_y(panel_top, int(note["lane"])) + 6
            lane_bottom = lane_top + 22
            color = "#0b0f12" if note["sourceRole"] != "accent" else "#3f4650"
            draw.rounded_rectangle((x0, lane_top, max(x0 + 10, x1), lane_bottom), radius=6, fill=color)

    output_path = OUTPUT_DIR / f"{track_id}-overview.png"
    image.save(output_path)
    return output_path


def main() -> int:
    data = load_data_ts()
    analysis = load_analysis()
    outputs = {}
    for track_id in ("piano", "rock"):
        outputs[track_id] = str(draw_track_overview(track_id, data, analysis))
    print(json.dumps(outputs, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
