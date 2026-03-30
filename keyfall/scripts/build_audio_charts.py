#!/usr/bin/env python3

from __future__ import annotations

import argparse
import contextlib
import io
import json
import math
import os
import statistics
import subprocess
import sys
import warnings
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple
import bisect

import librosa
import numpy as np
import pretty_midi
from scipy.signal import butter, sosfiltfilt


ROOT = Path(__file__).resolve().parent.parent
ASSET_DIR = ROOT / "assets" / "audio"
OUTPUT_PATH = ROOT / "src" / "game" / "generated" / "aiTrackData.ts"
ANALYSIS_PATH = ROOT / "src" / "game" / "generated" / "aiTrackAnalysis.json"
CACHE_DIR = ROOT / "tmp" / "chart-cache"
STEM_DIR = CACHE_DIR / "stems"
TRANSCRIPTION_DIR = CACHE_DIR / "basic-pitch"
MIDI_DIR = CACHE_DIR / "midi"
LEAD_DIR = CACHE_DIR / "lead"

SR = 22050
HOP_LENGTH = 256
BINS_PER_OCTAVE = 12
PHRASE_BEATS = 8
SECTION_BARS = 4
MOTIF_MIN_EVENTS = 3
TRANSCRIPTION_CACHE_VERSION = "v3"
LEAD_CACHE_VERSION = "v1"

DIFFICULTIES = ("easy", "medium", "hard")
ROLE_PRIORITY = {"melody": 4, "hook": 4, "sustain": 3, "accent": 2}
DIFFICULTY_ORDER = {"easy": 0, "medium": 1, "hard": 2}

TRACKS = (
    {
        "id": "piano",
        "label": "PIANO",
        "path": ASSET_DIR / "piano-etude.mp3",
        "mode": "piano",
        "pitch_preferred": (60.0, 96.0),
        "pitch_fallback": (52.0, 92.0),
        "master_spacing_ms": 108,
        "medium_spacing_ms": 196,
        "easy_spacing_ms": 258,
        "hold_threshold_beats": 1.05,
        "hold_min_ms": 360,
    },
    {
        "id": "rock",
        "label": "ROCK",
        "path": ASSET_DIR / "rock-drive.mp3",
        "mode": "rock",
        "pitch_preferred": (40.0, 76.0),
        "pitch_fallback": (36.0, 84.0),
        "master_spacing_ms": 132,
        "medium_spacing_ms": 244,
        "easy_spacing_ms": 312,
        "hold_threshold_beats": 1.15,
        "hold_min_ms": 380,
    },
)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def load_audio(track_path: Path) -> Dict[str, object]:
    y, sr = librosa.load(track_path, sr=SR, mono=True)
    duration_s = float(len(y) / sr)
    harmonic, percussive = librosa.effects.hpss(y, margin=(1.2, 3.8))
    rms = librosa.feature.rms(y=y, hop_length=HOP_LENGTH)[0]
    harmonic_chroma = librosa.feature.chroma_cqt(y=harmonic, sr=sr, hop_length=HOP_LENGTH)

    percussive_onset_env = librosa.onset.onset_strength(y=percussive, sr=sr, hop_length=HOP_LENGTH)
    tempo_raw, beat_frames = librosa.beat.beat_track(onset_envelope=percussive_onset_env, sr=sr, hop_length=HOP_LENGTH, trim=False)
    tempo = float(np.asarray(tempo_raw).reshape(-1)[0])
    beat_times_s = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP_LENGTH)
    beat_times_s = beat_times_s[beat_times_s > 0.2]
    if beat_times_s.size < 8:
        raise RuntimeError(f"Beat detection failed for {track_path}")

    return {
        "signal": y,
        "harmonic": harmonic,
        "percussive": percussive,
        "rms": rms,
        "harmonicChroma": harmonic_chroma,
        "percussiveOnsetEnv": percussive_onset_env,
        "tempo": tempo,
        "beatTimesS": beat_times_s,
        "durationS": duration_s,
        "durationMs": int(round(duration_s * 1000)),
    }


def highpass(signal: np.ndarray, cutoff_hz: float) -> np.ndarray:
    sos = butter(4, cutoff_hz, btype="highpass", fs=SR, output="sos")
    return sosfiltfilt(sos, signal)


def lowpass(signal: np.ndarray, cutoff_hz: float) -> np.ndarray:
    sos = butter(4, cutoff_hz, btype="lowpass", fs=SR, output="sos")
    return sosfiltfilt(sos, signal)


def bandpass(signal: np.ndarray, low_hz: float, high_hz: float) -> np.ndarray:
    sos = butter(4, [low_hz, high_hz], btype="bandpass", fs=SR, output="sos")
    return sosfiltfilt(sos, signal)


def normalize_array(values: np.ndarray) -> np.ndarray:
    values = np.asarray(values, dtype=np.float64)
    if values.size == 0:
        return values
    low = float(np.min(values))
    high = float(np.max(values))
    if high - low <= 1e-9:
        return np.zeros_like(values)
    return (values - low) / (high - low)


def frame_to_time_s(frame: int) -> float:
    return float(librosa.frames_to_time(frame, sr=SR, hop_length=HOP_LENGTH))


def time_to_frame(time_s: float) -> int:
    frame_value = librosa.time_to_frames(time_s, sr=SR, hop_length=HOP_LENGTH)
    return int(round(float(np.asarray(frame_value).reshape(-1)[0])))


def build_cqt(signal: np.ndarray, fmin_note: str, n_bins: int) -> Tuple[np.ndarray, np.ndarray]:
    fmin_hz = float(librosa.note_to_hz(fmin_note))
    cqt = np.abs(
        librosa.cqt(
            signal,
            sr=SR,
            hop_length=HOP_LENGTH,
            bins_per_octave=BINS_PER_OCTAVE,
            fmin=fmin_hz,
            n_bins=n_bins,
        )
    )
    midi_bins = np.arange(n_bins, dtype=np.float64) + float(librosa.hz_to_midi(fmin_hz))
    return cqt, midi_bins


def peak_pitch_from_cqt(
    cqt: np.ndarray,
    midi_bins: np.ndarray,
    frame: int,
    preferred_range: Tuple[float, float],
    fallback_range: Tuple[float, float],
) -> Tuple[Optional[float], float]:
    start = max(0, frame - 1)
    end = min(cqt.shape[1], frame + 2)
    profile = np.max(cqt[:, start:end], axis=1)

    def choose(midi_range: Tuple[float, float]) -> Tuple[Optional[float], float]:
        mask = (midi_bins >= midi_range[0]) & (midi_bins <= midi_range[1])
        if not np.any(mask):
            return None, 0.0
        sub = profile[mask]
        total = float(np.sum(sub))
        if total <= 1e-9:
            return None, 0.0
        peak_idx_local = int(np.argmax(sub))
        peak_energy = float(sub[peak_idx_local])
        global_idx = int(np.flatnonzero(mask)[peak_idx_local])
        second_peak = float(np.partition(sub, -2)[-2]) if sub.size >= 2 else peak_energy
        prominence = peak_energy / total
        dominance = peak_energy / max(second_peak, 1e-6)
        confidence = clamp((prominence * 2.3 + min(dominance, 4.0) / 4.0) / 2.0, 0.0, 1.0)
        return float(midi_bins[global_idx]), confidence

    pitch_midi, confidence = choose(preferred_range)
    if pitch_midi is not None and confidence >= 0.08:
        return pitch_midi, confidence
    fallback_pitch, fallback_confidence = choose(fallback_range)
    if fallback_pitch is None:
        return None, 0.0
    return fallback_pitch, fallback_confidence * 0.88


def estimate_sustain_ms(
    cqt: np.ndarray,
    midi_bins: np.ndarray,
    onset_frame: int,
    pitch_midi: Optional[float],
    next_event_frame: Optional[int],
    min_floor: float,
) -> int:
    if pitch_midi is None:
        return 0
    peak_bin = int(np.argmin(np.abs(midi_bins - pitch_midi)))
    start_frame = onset_frame
    anchor = float(np.max(cqt[max(0, peak_bin - 1) : min(cqt.shape[0], peak_bin + 2), start_frame : start_frame + 2]))
    if anchor <= 1e-9:
        return 0

    max_frame = cqt.shape[1] - 1
    if next_event_frame is not None:
        max_frame = min(max_frame, next_event_frame - 2)
    max_frame = min(max_frame, start_frame + int(round((2.6 * SR) / HOP_LENGTH)))
    floor = anchor * min_floor
    last_live_frame = start_frame
    decay_grace = 0

    for frame in range(start_frame + 1, max_frame + 1):
        band_energy = float(np.max(cqt[max(0, peak_bin - 1) : min(cqt.shape[0], peak_bin + 2), frame]))
        if band_energy >= floor:
            last_live_frame = frame
            decay_grace = 0
        else:
            decay_grace += 1
            if decay_grace >= 3:
                break

    sustain_ms = int(round((frame_to_time_s(last_live_frame) - frame_to_time_s(start_frame)) * 1000))
    return max(0, sustain_ms)


def detect_onsets(signal: np.ndarray, delta: float, wait: int) -> Tuple[np.ndarray, np.ndarray]:
    onset_env = librosa.onset.onset_strength(y=signal, sr=SR, hop_length=HOP_LENGTH)
    onset_frames = librosa.onset.onset_detect(
        onset_envelope=onset_env,
        sr=SR,
        hop_length=HOP_LENGTH,
        units="frames",
        backtrack=False,
        pre_max=2,
        post_max=2,
        pre_avg=2,
        post_avg=4,
        delta=delta,
        wait=wait,
    )
    return onset_env, onset_frames


def build_beat_anchors(beat_times_s: np.ndarray) -> List[Dict[str, int]]:
    anchors: List[Dict[str, int]] = []
    beat_times_ms = [int(round(time_s * 1000)) for time_s in beat_times_s]
    median_interval_ms = int(round(statistics.median(np.diff(beat_times_ms)))) if len(beat_times_ms) > 1 else 500
    for index, time_ms in enumerate(beat_times_ms):
        next_time_ms = beat_times_ms[index + 1] if index + 1 < len(beat_times_ms) else time_ms + median_interval_ms
        interval_ms = max(1, next_time_ms - time_ms)
        anchors.append(
            {
                "index": index,
                "timeMs": time_ms,
                "intervalMs": interval_ms,
                "barIndex": index // 4,
                "beatInBar": index % 4,
            }
        )
    return anchors


def nearest_frame_for_time(time_ms: int) -> int:
    return time_to_frame(time_ms / 1000.0)


def ensure_rock_other_stem(track_path: Path) -> Path:
    output_root = STEM_DIR / "demucs"
    output_path = output_root / "htdemucs" / track_path.stem / "other.wav"
    if output_path.exists() and output_path.stat().st_mtime >= track_path.stat().st_mtime:
        return output_path

    output_root.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable,
        "-m",
        "demucs.separate",
        "-n",
        "htdemucs",
        "--two-stems",
        "other",
        "-d",
        "cpu",
        "-o",
        str(output_root),
        str(track_path),
    ]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=False)
    if result.returncode != 0 or not output_path.exists():
        raise RuntimeError(f"Demucs separation failed for {track_path}:\n{result.stdout}")
    return output_path


def transcribe_with_basic_pitch(
    audio_path: Path,
    cache_key: str,
    *,
    onset_threshold: float,
    frame_threshold: float,
    minimum_note_length_ms: int,
    minimum_frequency: Optional[float] = None,
    maximum_frequency: Optional[float] = None,
) -> List[Dict[str, object]]:
    TRANSCRIPTION_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = TRANSCRIPTION_DIR / f"{cache_key}-{TRANSCRIPTION_CACHE_VERSION}.json"
    if cache_path.exists() and cache_path.stat().st_mtime >= audio_path.stat().st_mtime:
        return json.loads(cache_path.read_text(encoding="utf-8"))

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            from basic_pitch.inference import predict

            _, _, note_events = predict(
                str(audio_path),
                onset_threshold=onset_threshold,
                frame_threshold=frame_threshold,
                minimum_note_length=minimum_note_length_ms,
                minimum_frequency=minimum_frequency,
                maximum_frequency=maximum_frequency,
                melodia_trick=True,
            )

    notes = [
        {
            "onsetMs": int(round(float(start_s) * 1000)),
            "offsetMs": int(round(float(end_s) * 1000)),
            "durationMs": max(0, int(round((float(end_s) - float(start_s)) * 1000))),
            "pitchMidi": int(pitch_midi),
            "confidence": round(float(confidence), 4),
        }
        for start_s, end_s, pitch_midi, confidence, _ in note_events
    ]
    notes.sort(key=lambda item: (int(item["onsetMs"]), int(item["pitchMidi"]), -float(item["confidence"])))
    cache_path.write_text(json.dumps(notes, indent=2), encoding="utf-8")
    return notes


def write_midi_artifact(notes: Sequence[Dict[str, object]], midi_path: Path, *, tempo: float, program: int) -> str:
    midi_path.parent.mkdir(parents=True, exist_ok=True)
    midi = pretty_midi.PrettyMIDI(initial_tempo=max(float(tempo), 1.0))
    instrument = pretty_midi.Instrument(program=program)
    for note in notes:
        onset_s = max(0.0, int(note["onsetMs"]) / 1000.0)
        offset_s = max(onset_s + 0.06, int(note["offsetMs"]) / 1000.0)
        velocity = int(round(52 + clamp(float(note.get("confidence", 0.6)), 0.0, 1.0) * 52))
        instrument.notes.append(
            pretty_midi.Note(
                velocity=max(1, min(127, velocity)),
                pitch=max(0, min(127, int(round(float(note["pitchMidi"]))))),
                start=onset_s,
                end=offset_s,
            )
        )
    midi.instruments.append(instrument)
    midi.write(str(midi_path))
    return str(midi_path)


def merge_lead_notes(notes: Sequence[Dict[str, object]], *, gap_ms: int, pitch_tolerance: float) -> List[Dict[str, object]]:
    merged: List[Dict[str, object]] = []
    for note in sorted(notes, key=lambda item: (int(item["onsetMs"]), float(item["pitchMidi"]))):
        if not merged:
            merged.append(dict(note))
            continue
        previous = merged[-1]
        pitch_delta = abs(float(note["pitchMidi"]) - float(previous["pitchMidi"]))
        gap = int(note["onsetMs"]) - int(previous["offsetMs"])
        if pitch_delta <= pitch_tolerance and gap <= gap_ms:
            previous["offsetMs"] = max(int(previous["offsetMs"]), int(note["offsetMs"]))
            previous["durationMs"] = int(previous["offsetMs"]) - int(previous["onsetMs"])
            previous["confidence"] = round(max(float(previous["confidence"]), float(note["confidence"])), 4)
            previous["pitchMidi"] = round((float(previous["pitchMidi"]) + float(note["pitchMidi"])) / 2.0, 2)
            continue
        merged.append(dict(note))
    return merged


def extract_lead_notes_with_pyin(
    signal: np.ndarray,
    cache_key: str,
    *,
    fmin_note: str,
    fmax_note: str,
    min_probability: float,
    min_note_length_ms: int,
    max_pitch_step: float,
) -> List[Dict[str, object]]:
    LEAD_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = LEAD_DIR / f"{cache_key}-{LEAD_CACHE_VERSION}.json"
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        f0_hz, _, voiced_prob = librosa.pyin(
            signal,
            fmin=float(librosa.note_to_hz(fmin_note)),
            fmax=float(librosa.note_to_hz(fmax_note)),
            sr=SR,
            hop_length=HOP_LENGTH,
            frame_length=2048,
        )
    times_s = librosa.times_like(f0_hz, sr=SR, hop_length=HOP_LENGTH)

    notes: List[Dict[str, object]] = []
    start_idx: Optional[int] = None
    pitch_values: List[float] = []
    probabilities: List[float] = []
    previous_pitch: Optional[float] = None

    def flush(end_idx: int) -> None:
        nonlocal start_idx, pitch_values, probabilities, previous_pitch
        if start_idx is None or not pitch_values:
            start_idx = None
            pitch_values = []
            probabilities = []
            previous_pitch = None
            return
        onset_ms = int(round(float(times_s[start_idx]) * 1000))
        offset_ms = int(round(float(times_s[min(end_idx, len(times_s) - 1)]) * 1000))
        duration_ms = max(0, offset_ms - onset_ms)
        if duration_ms >= min_note_length_ms:
            notes.append(
                {
                    "onsetMs": onset_ms,
                    "offsetMs": offset_ms,
                    "durationMs": duration_ms,
                    "pitchMidi": round(float(np.median(pitch_values)), 2),
                    "confidence": round(float(np.mean(probabilities)), 4),
                }
            )
        start_idx = None
        pitch_values = []
        probabilities = []
        previous_pitch = None

    for index, (pitch_hz, probability) in enumerate(zip(f0_hz, voiced_prob)):
        voiced = not np.isnan(pitch_hz) and float(probability) >= min_probability
        midi_value = float(librosa.hz_to_midi(pitch_hz)) if voiced else None
        if midi_value is None:
            flush(index)
            continue
        if start_idx is None:
            start_idx = index
            pitch_values = [midi_value]
            probabilities = [float(probability)]
            previous_pitch = midi_value
            continue
        if previous_pitch is not None and abs(midi_value - previous_pitch) <= max_pitch_step:
            pitch_values.append(midi_value)
            probabilities.append(float(probability))
            previous_pitch = midi_value
            continue
        flush(index)
        start_idx = index
        pitch_values = [midi_value]
        probabilities = [float(probability)]
        previous_pitch = midi_value
    flush(len(times_s) - 1)

    notes = merge_lead_notes(notes, gap_ms=72, pitch_tolerance=0.85)
    cache_path.write_text(json.dumps(notes, indent=2), encoding="utf-8")
    return notes


def align_lead_notes_to_transcription(
    lead_notes: Sequence[Dict[str, object]],
    transcription_notes: Sequence[Dict[str, object]],
    *,
    pitch_tolerance: float,
    onset_tolerance_ms: int,
    overlap_padding_ms: int,
) -> List[Dict[str, object]]:
    aligned: List[Dict[str, object]] = []
    for lead_note in lead_notes:
        onset_ms = int(lead_note["onsetMs"])
        offset_ms = int(lead_note["offsetMs"])
        lead_pitch = float(lead_note["pitchMidi"])
        matches = [
            dict(note)
            for note in transcription_notes
            if abs(float(note["pitchMidi"]) - lead_pitch) <= pitch_tolerance
            and (
                abs(int(note["onsetMs"]) - onset_ms) <= onset_tolerance_ms
                or (
                    int(note["onsetMs"]) <= offset_ms + overlap_padding_ms
                    and int(note["offsetMs"]) >= onset_ms - overlap_padding_ms
                )
            )
        ]
        if matches:
            best = max(
                matches,
                key=lambda item: (
                    -abs(int(item["onsetMs"]) - onset_ms),
                    float(item["confidence"]),
                    int(item["durationMs"]),
                ),
            )
            onset_ms = int(round((onset_ms * 0.45) + (int(best["onsetMs"]) * 0.55)))
            offset_ms = max(offset_ms, int(best["offsetMs"]))
            lead_pitch = float(np.median([lead_pitch] + [float(match["pitchMidi"]) for match in matches]))
            confidence = max(float(lead_note["confidence"]), max(float(match["confidence"]) for match in matches))
        else:
            confidence = float(lead_note["confidence"])
        aligned.append(
            {
                "onsetMs": onset_ms,
                "offsetMs": offset_ms,
                "durationMs": max(0, offset_ms - onset_ms),
                "pitchMidi": round(lead_pitch, 2),
                "confidence": round(confidence, 4),
            }
        )

    return merge_lead_notes(aligned, gap_ms=64, pitch_tolerance=0.7)


def select_support_notes(
    lead_notes: Sequence[Dict[str, object]],
    transcription_notes: Sequence[Dict[str, object]],
    *,
    role: str,
    cluster_ms: int,
    onset_proximity_ms: int,
    min_gap_ms: int,
    min_confidence: float,
    pitch_padding: float,
) -> List[Dict[str, object]]:
    lead_notes = sorted([dict(note) for note in lead_notes], key=lambda item: int(item["onsetMs"]))
    if len(lead_notes) < 2:
        return []
    lead_onsets = [int(note["onsetMs"]) for note in lead_notes]
    support_by_gap: Dict[Tuple[int, int], List[Tuple[float, Dict[str, object]]]] = defaultdict(list)
    for cluster in cluster_transcribed_notes(transcription_notes, cluster_ms=cluster_ms):
        representative = max(cluster, key=lambda item: (float(item["confidence"]), int(item["durationMs"]), -abs(int(item["pitchMidi"]) - 60)))
        onset_ms = int(representative["onsetMs"])
        if min(abs(onset_ms - lead_onset) for lead_onset in lead_onsets) <= onset_proximity_ms:
            continue
        right_index = bisect.bisect_left(lead_onsets, onset_ms)
        if right_index <= 0 or right_index >= len(lead_notes):
            continue
        previous = lead_notes[right_index - 1]
        following = lead_notes[right_index]
        gap_ms = int(following["onsetMs"]) - int(previous["onsetMs"])
        if gap_ms < min_gap_ms:
            continue
        pitch_midi = float(representative["pitchMidi"])
        low_pitch = min(float(previous["pitchMidi"]), float(following["pitchMidi"])) - pitch_padding
        high_pitch = max(float(previous["pitchMidi"]), float(following["pitchMidi"])) + pitch_padding
        if not (low_pitch <= pitch_midi <= high_pitch):
            continue
        confidence = float(representative["confidence"])
        if confidence < min_confidence:
            continue
        lane_target = float(previous["pitchMidi"]) + (
            (float(following["pitchMidi"]) - float(previous["pitchMidi"])) * ((onset_ms - int(previous["onsetMs"])) / max(gap_ms, 1))
        )
        pitch_error = abs(pitch_midi - lane_target)
        score = (confidence * 0.72) + (clamp(int(representative["durationMs"]) / 520, 0.0, 1.0) * 0.18) + (max(0.0, 1.0 - (pitch_error / 6.0)) * 0.1)
        support_by_gap[(right_index - 1, right_index)].append(
            (
                score,
                {
                    "onsetMs": onset_ms,
                    "offsetMs": int(representative["offsetMs"]),
                    "durationMs": int(representative["durationMs"]),
                    "pitchMidi": round(pitch_midi, 2),
                    "confidence": round(confidence, 4),
                    "sourceRole": role,
                },
            )
        )

    support_notes: List[Dict[str, object]] = []
    for (left_index, right_index), candidates in support_by_gap.items():
        gap_ms = lead_onsets[right_index] - lead_onsets[left_index]
        max_per_gap = 1 if gap_ms < 640 else 2 if gap_ms < 1180 else 3
        chosen = sorted(candidates, key=lambda item: (-item[0], int(item[1]["onsetMs"])))[:max_per_gap]
        support_notes.extend([dict(note) for _, note in chosen])

    return sorted(support_notes, key=lambda item: int(item["onsetMs"]))


def dedupe_transcribed_notes(notes: Sequence[Dict[str, object]], duplicate_ms: int = 55) -> List[Dict[str, object]]:
    deduped: List[Dict[str, object]] = []
    last_by_pitch: Dict[int, Dict[str, object]] = {}
    for note in notes:
        pitch = int(note["pitchMidi"])
        previous = last_by_pitch.get(pitch)
        if previous is not None and int(note["onsetMs"]) - int(previous["onsetMs"]) <= duplicate_ms:
            if float(note["confidence"]) > float(previous["confidence"]) or int(note["durationMs"]) > int(previous["durationMs"]):
                if deduped and deduped[-1] is previous:
                    deduped[-1] = note
                last_by_pitch[pitch] = note
            continue
        deduped.append(note)
        last_by_pitch[pitch] = note
    return deduped


def cluster_transcribed_notes(notes: Sequence[Dict[str, object]], cluster_ms: int) -> List[List[Dict[str, object]]]:
    clusters: List[List[Dict[str, object]]] = []
    for note in sorted(notes, key=lambda item: (int(item["onsetMs"]), int(item["pitchMidi"]))):
        if not clusters:
            clusters.append([dict(note)])
            continue
        previous_cluster = clusters[-1]
        previous_time_ms = int(previous_cluster[-1]["onsetMs"])
        if int(note["onsetMs"]) - previous_time_ms <= cluster_ms:
            previous_cluster.append(dict(note))
        else:
            clusters.append([dict(note)])
    return clusters


def note_salience(note: Dict[str, object], duration_scale_ms: int) -> float:
    sustain_weight = clamp(int(note["durationMs"]) / max(duration_scale_ms, 1), 0.0, 1.0)
    return clamp(float(note["confidence"]) * 0.78 + sustain_weight * 0.22, 0.0, 1.0)


def build_piano_candidates_from_transcription(track: Dict[str, object], audio: Dict[str, object], beat_anchors: Sequence[Dict[str, int]]) -> Tuple[List[Dict[str, object]], Dict[str, object]]:
    notes = transcribe_with_basic_pitch(
        Path(track["path"]),
        cache_key="piano-mix",
        onset_threshold=0.45,
        frame_threshold=0.25,
        minimum_note_length_ms=80,
        minimum_frequency=float(librosa.note_to_hz("A2")),
        maximum_frequency=float(librosa.note_to_hz("C8")),
    )
    filtered = [
        note
        for note in dedupe_transcribed_notes(notes)
        if float(note["confidence"]) >= 0.34 and 52 <= int(note["pitchMidi"]) <= 96 and int(note["durationMs"]) >= 70
    ]
    raw_midi_path = write_midi_artifact(filtered, MIDI_DIR / f"{track['id']}-raw.mid", tempo=float(audio["tempo"]), program=0)

    lead_seed = extract_lead_notes_with_pyin(
        highpass(np.asarray(audio["harmonic"]), 280.0),
        cache_key="piano-lead",
        fmin_note="A3",
        fmax_note="C7",
        min_probability=0.03,
        min_note_length_ms=82,
        max_pitch_step=0.95,
    )
    lead_notes = align_lead_notes_to_transcription(
        lead_seed,
        filtered,
        pitch_tolerance=1.8,
        onset_tolerance_ms=150,
        overlap_padding_ms=120,
    )
    lead_notes = [
        note
        for note in lead_notes
        if 57 <= float(note["pitchMidi"]) <= 96 and int(note["durationMs"]) >= 82 and float(note["confidence"]) >= 0.03
    ]
    support_notes = select_support_notes(
        lead_notes,
        filtered,
        role="melody",
        cluster_ms=54,
        onset_proximity_ms=92,
        min_gap_ms=280,
        min_confidence=0.5,
        pitch_padding=5.5,
    )
    lead_midi_path = write_midi_artifact(lead_notes, MIDI_DIR / f"{track['id']}-lead.mid", tempo=float(audio["tempo"]), program=0)

    candidates: List[Dict[str, object]] = []
    source_notes = sorted(
        [dict(note, sourceRole="melody") for note in lead_notes] + [dict(note) for note in support_notes],
        key=lambda item: int(item["onsetMs"]),
    )
    for index, note in enumerate(source_notes):
        onset_ms = int(note["onsetMs"])
        candidates.append(
            {
                "eventId": f"piano-note-{index}",
                "sourceRole": str(note.get("sourceRole", "melody")),
                "sourceTimeMs": onset_ms,
                "rawOnsetMs": onset_ms,
                "pitchMidi": round(float(note["pitchMidi"]), 2),
                "confidence": round(float(note["confidence"]), 3),
                "salience": round(note_salience(note, 420), 3),
                "sustainMs": int(note["durationMs"]),
            }
        )
    analysis = {
        "transcriptionSource": "basic-pitch-mix-to-lead-midi",
        "rawMidiPath": raw_midi_path,
        "leadMidiPath": lead_midi_path,
        "transcribedNoteCount": len(notes),
        "filteredNoteCount": len(filtered),
        "leadSeedCount": len(lead_seed),
        "leadNoteCount": len(lead_notes),
        "supportNoteCount": len(support_notes),
    }
    return candidates, analysis


def build_rock_candidates_from_transcription(track: Dict[str, object], audio: Dict[str, object], beat_anchors: Sequence[Dict[str, int]]) -> Tuple[List[Dict[str, object]], Dict[str, object]]:
    stem_path = ensure_rock_other_stem(Path(track["path"]))
    notes = transcribe_with_basic_pitch(
        stem_path,
        cache_key="rock-other",
        onset_threshold=0.4,
        frame_threshold=0.25,
        minimum_note_length_ms=90,
        minimum_frequency=float(librosa.note_to_hz("F2")),
        maximum_frequency=float(librosa.note_to_hz("D6")),
    )
    filtered = [
        note
        for note in dedupe_transcribed_notes(notes)
        if float(note["confidence"]) >= 0.22 and 43 <= int(note["pitchMidi"]) <= 78 and int(note["durationMs"]) >= 80
    ]
    raw_midi_path = write_midi_artifact(filtered, MIDI_DIR / f"{track['id']}-raw.mid", tempo=float(audio["tempo"]), program=29)

    stem_signal, _ = librosa.load(stem_path, sr=SR, mono=True)
    stem_harmonic, _ = librosa.effects.hpss(stem_signal, margin=(1.1, 3.2))
    lead_seed = extract_lead_notes_with_pyin(
        bandpass(stem_harmonic, 110.0, 2200.0),
        cache_key="rock-lead",
        fmin_note="E2",
        fmax_note="D6",
        min_probability=0.03,
        min_note_length_ms=88,
        max_pitch_step=1.15,
    )
    lead_notes = align_lead_notes_to_transcription(
        lead_seed,
        filtered,
        pitch_tolerance=2.2,
        onset_tolerance_ms=165,
        overlap_padding_ms=140,
    )
    lead_notes = [
        note
        for note in lead_notes
        if 43 <= float(note["pitchMidi"]) <= 78 and int(note["durationMs"]) >= 84 and float(note["confidence"]) >= 0.03
    ]
    support_notes = select_support_notes(
        lead_notes,
        filtered,
        role="hook",
        cluster_ms=64,
        onset_proximity_ms=104,
        min_gap_ms=310,
        min_confidence=0.28,
        pitch_padding=6.0,
    )
    lead_midi_path = write_midi_artifact(lead_notes, MIDI_DIR / f"{track['id']}-lead.mid", tempo=float(audio["tempo"]), program=29)

    candidates: List[Dict[str, object]] = []
    hook_times_ms: List[int] = []
    source_notes = sorted(
        [dict(note, sourceRole="hook") for note in lead_notes] + [dict(note) for note in support_notes],
        key=lambda item: int(item["onsetMs"]),
    )
    for index, note in enumerate(source_notes):
        onset_ms = int(note["onsetMs"])
        hook_times_ms.append(onset_ms)
        candidates.append(
            {
                "eventId": f"rock-hook-{index}",
                "sourceRole": str(note.get("sourceRole", "hook")),
                "sourceTimeMs": onset_ms,
                "rawOnsetMs": onset_ms,
                "pitchMidi": round(float(note["pitchMidi"]), 2),
                "confidence": round(float(note["confidence"]), 3),
                "salience": round(note_salience(note, 360), 3),
                "sustainMs": int(note["durationMs"]),
            }
        )

    percussive_env_n = normalize_array(np.asarray(audio["percussiveOnsetEnv"]))
    beat_ms_guess = statistics.median([anchor["intervalMs"] for anchor in beat_anchors]) if beat_anchors else 500
    accent_index = 0
    for previous_ms, next_ms in zip(hook_times_ms, hook_times_ms[1:]):
        gap_ms = next_ms - previous_ms
        if gap_ms < max(int(beat_ms_guess * 2.1), 920):
            continue
        anchors_in_gap = [
            anchor
            for anchor in beat_anchors
            if previous_ms + 160 < int(anchor["timeMs"]) < next_ms - 160 and anchor["beatInBar"] in (1, 3)
        ]
        if not anchors_in_gap:
            anchors_in_gap = [
                anchor
                for anchor in beat_anchors
                if previous_ms + 160 < int(anchor["timeMs"]) < next_ms - 160 and anchor["beatInBar"] == 0
            ]
        for anchor in anchors_in_gap[: 2 if gap_ms > beat_ms_guess * 3 else 1]:
            anchor_frame = nearest_frame_for_time(int(anchor["timeMs"]))
            start = max(0, anchor_frame - 2)
            end = min(len(percussive_env_n), anchor_frame + 3)
            if start >= end:
                continue
            local_idx = int(np.argmax(percussive_env_n[start:end]))
            frame = start + local_idx
            salience = float(percussive_env_n[frame])
            if salience < 0.4:
                continue
            time_ms = int(round(frame_to_time_s(frame) * 1000))
            if any(abs(time_ms - hook_time) < 110 for hook_time in hook_times_ms):
                continue
            candidates.append(
                {
                    "eventId": f"rock-accent-gap-{accent_index}",
                    "sourceRole": "accent",
                    "sourceTimeMs": time_ms,
                    "rawOnsetMs": time_ms,
                    "pitchMidi": None,
                    "confidence": round(max(0.16, salience * 0.52), 3),
                    "salience": round(salience * 0.82, 3),
                    "sustainMs": 0,
                }
            )
            accent_index += 1

    analysis = {
        "transcriptionSource": "basic-pitch-demucs-other-to-lead-midi",
        "stemPath": str(stem_path),
        "rawMidiPath": raw_midi_path,
        "leadMidiPath": lead_midi_path,
        "transcribedNoteCount": len(notes),
        "filteredNoteCount": len(filtered),
        "leadSeedCount": len(lead_seed),
        "leadNoteCount": len(lead_notes),
        "supportNoteCount": len(support_notes),
    }
    return candidates, analysis


def enrich_candidates(candidates: List[Dict[str, object]], beat_anchors: Sequence[Dict[str, int]]) -> List[Dict[str, object]]:
    beat_times_ms = [anchor["timeMs"] for anchor in beat_anchors]
    for candidate in candidates:
        time_ms = int(candidate["sourceTimeMs"])
        beat_index = int(np.searchsorted(beat_times_ms, time_ms, side="right") - 1)
        beat_index = max(0, min(beat_index, len(beat_anchors) - 1))
        anchor = beat_anchors[beat_index]
        interval_ms = anchor["intervalMs"]
        subdivision = clamp((time_ms - anchor["timeMs"]) / max(interval_ms, 1), 0.0, 1.0)
        phrase_index = beat_index // PHRASE_BEATS
        phrase_start_beat = phrase_index * PHRASE_BEATS
        phrase_start_anchor = beat_anchors[min(phrase_start_beat, len(beat_anchors) - 1)]
        phrase_beats = (beat_index - phrase_start_beat) + subdivision
        phrase_slot = int(round(phrase_beats * 2))

        candidate["beatIndex"] = beat_index
        candidate["beatMs"] = interval_ms
        candidate["beatInBar"] = anchor["beatInBar"]
        candidate["barIndex"] = anchor["barIndex"]
        candidate["subdivision"] = round(float(subdivision), 3)
        candidate["phraseIndex"] = phrase_index
        candidate["phraseId"] = phrase_index
        candidate["phraseStartMs"] = phrase_start_anchor["timeMs"]
        candidate["phraseSlot"] = phrase_slot
        candidate["isStrongBeat"] = subdivision <= 0.18
        candidate["isSyncopated"] = 0.33 <= subdivision <= 0.67
    return candidates


def candidate_key(candidate: Dict[str, object]) -> Tuple[int, int, int]:
    role = str(candidate["sourceRole"])
    return (
        ROLE_PRIORITY.get(role, 0),
        int(round(float(candidate["salience"]) * 1000)),
        int(round(float(candidate["confidence"]) * 1000)),
    )


def merge_candidates(candidates: List[Dict[str, object]], dedupe_ms: int = 92) -> List[Dict[str, object]]:
    candidates = sorted(candidates, key=lambda item: (int(item["sourceTimeMs"]), -candidate_key(item)[0], -candidate_key(item)[1]))
    merged: List[Dict[str, object]] = []
    for candidate in candidates:
        if not merged:
            merged.append(candidate)
            continue
        previous = merged[-1]
        if int(candidate["sourceTimeMs"]) - int(previous["sourceTimeMs"]) <= dedupe_ms:
            if candidate_key(candidate) > candidate_key(previous):
                merged[-1] = candidate
            continue
        merged.append(candidate)
    return merged


def detect_piano_candidates(track: Dict[str, object], audio: Dict[str, object], beat_anchors: Sequence[Dict[str, int]]) -> List[Dict[str, object]]:
    harmonic = np.asarray(audio["harmonic"])
    focus = highpass(harmonic, 280.0)
    low_focus = lowpass(harmonic, 240.0)
    onset_env, onset_frames = detect_onsets(focus, delta=0.08, wait=1)
    onset_env_n = normalize_array(onset_env)
    low_env = librosa.onset.onset_strength(y=low_focus, sr=SR, hop_length=HOP_LENGTH)
    low_env_n = normalize_array(low_env)
    cqt, midi_bins = build_cqt(focus, "C3", 72)
    low_cqt, low_midi_bins = build_cqt(low_focus, "E2", 36)

    candidates: List[Dict[str, object]] = []
    for index, frame in enumerate(onset_frames):
        time_s = frame_to_time_s(int(frame))
        if time_s < 0.35 or time_s > float(audio["durationS"]) - 0.15:
            continue
        pitch_midi, confidence = peak_pitch_from_cqt(
            cqt,
            midi_bins,
            int(frame),
            preferred_range=track["pitch_preferred"],
            fallback_range=track["pitch_fallback"],
        )
        if pitch_midi is None:
            continue
        salience = float(onset_env_n[int(frame)]) * 0.72 + confidence * 0.28
        if salience < 0.12:
            continue
        next_frame = int(onset_frames[index + 1]) if index + 1 < len(onset_frames) else None
        sustain_ms = estimate_sustain_ms(cqt, midi_bins, int(frame), pitch_midi, next_frame, min_floor=0.42)
        candidates.append(
            {
                "eventId": f"piano-melody-{index}",
                "sourceRole": "melody",
                "sourceTimeMs": int(round(time_s * 1000)),
                "rawOnsetMs": int(round(time_s * 1000)),
                "pitchMidi": round(pitch_midi, 2),
                "confidence": round(float(confidence), 3),
                "salience": round(float(salience), 3),
                "sustainMs": sustain_ms,
            }
        )

    melody_times = [int(candidate["sourceTimeMs"]) for candidate in candidates]
    for anchor in beat_anchors:
        if anchor["beatInBar"] != 0:
            continue
        anchor_frame = nearest_frame_for_time(anchor["timeMs"])
        start = max(0, anchor_frame - 3)
        end = min(len(low_env_n), anchor_frame + 4)
        if start >= end:
            continue
        local_idx = int(np.argmax(low_env_n[start:end]))
        frame = start + local_idx
        time_ms = int(round(frame_to_time_s(frame) * 1000))
        if any(abs(time_ms - melody_time) < 140 for melody_time in melody_times):
            continue
        if float(low_env_n[frame]) < 0.58:
            continue
        pitch_midi, confidence = peak_pitch_from_cqt(low_cqt, low_midi_bins, frame, preferred_range=(40.0, 58.0), fallback_range=(36.0, 64.0))
        salience = float(low_env_n[frame]) * 0.75
        candidates.append(
            {
                "eventId": f"piano-accent-{anchor['index']}",
                "sourceRole": "accent",
                "sourceTimeMs": time_ms,
                "rawOnsetMs": time_ms,
                "pitchMidi": round(pitch_midi, 2) if pitch_midi is not None else None,
                "confidence": round(max(0.35, float(confidence) * 0.7), 3),
                "salience": round(float(salience), 3),
                "sustainMs": 0,
            }
        )
    return candidates


def detect_rock_candidates(track: Dict[str, object], audio: Dict[str, object], beat_anchors: Sequence[Dict[str, int]]) -> List[Dict[str, object]]:
    harmonic = np.asarray(audio["harmonic"])
    percussive = np.asarray(audio["percussive"])
    hook_focus = bandpass(harmonic, 120.0, 1800.0)
    hook_env, hook_frames = detect_onsets(hook_focus, delta=0.1, wait=1)
    hook_env_n = normalize_array(hook_env)
    hook_cqt, hook_midi_bins = build_cqt(hook_focus, "E2", 64)
    candidates: List[Dict[str, object]] = []

    for index, frame in enumerate(hook_frames):
        time_s = frame_to_time_s(int(frame))
        if time_s < 0.35 or time_s > float(audio["durationS"]) - 0.15:
            continue
        pitch_midi, confidence = peak_pitch_from_cqt(
            hook_cqt,
            hook_midi_bins,
            int(frame),
            preferred_range=track["pitch_preferred"],
            fallback_range=track["pitch_fallback"],
        )
        salience = float(hook_env_n[int(frame)]) * 0.78 + confidence * 0.22
        if pitch_midi is None or salience < 0.11:
            continue
        next_frame = int(hook_frames[index + 1]) if index + 1 < len(hook_frames) else None
        sustain_ms = estimate_sustain_ms(hook_cqt, hook_midi_bins, int(frame), pitch_midi, next_frame, min_floor=0.52)
        candidates.append(
            {
                "eventId": f"rock-hook-{index}",
                "sourceRole": "hook",
                "sourceTimeMs": int(round(time_s * 1000)),
                "rawOnsetMs": int(round(time_s * 1000)),
                "pitchMidi": round(pitch_midi, 2),
                "confidence": round(float(confidence), 3),
                "salience": round(float(salience), 3),
                "sustainMs": sustain_ms,
            }
        )

    percussive_env_n = normalize_array(np.asarray(audio["percussiveOnsetEnv"]))
    hook_times = [int(candidate["sourceTimeMs"]) for candidate in candidates]
    for anchor in beat_anchors:
        anchor_frame = nearest_frame_for_time(anchor["timeMs"])
        start = max(0, anchor_frame - 2)
        end = min(len(percussive_env_n), anchor_frame + 3)
        if start >= end:
            continue
        local_idx = int(np.argmax(percussive_env_n[start:end]))
        frame = start + local_idx
        salience = float(percussive_env_n[frame])
        if salience < 0.34:
            continue
        time_ms = int(round(frame_to_time_s(frame) * 1000))
        if any(abs(time_ms - hook_time) < 110 for hook_time in hook_times):
            continue
        candidates.append(
            {
                "eventId": f"rock-accent-{anchor['index']}",
                "sourceRole": "accent",
                "sourceTimeMs": time_ms,
                "rawOnsetMs": time_ms,
                "pitchMidi": None,
                "confidence": round(max(0.22, salience * 0.62), 3),
                "salience": round(salience * (1.0 if anchor["beatInBar"] in (1, 3) else 0.84), 3),
                "sustainMs": 0,
            }
        )

    offbeat_frames = librosa.onset.onset_detect(
        onset_envelope=np.asarray(audio["percussiveOnsetEnv"]),
        sr=SR,
        hop_length=HOP_LENGTH,
        units="frames",
        backtrack=False,
        pre_max=2,
        post_max=2,
        pre_avg=2,
        post_avg=3,
        delta=0.18,
        wait=1,
    )
    for index, frame in enumerate(offbeat_frames):
        time_ms = int(round(frame_to_time_s(int(frame)) * 1000))
        if any(abs(time_ms - hook_time) < 90 for hook_time in hook_times):
            continue
        beat_index = max(0, min(int(np.searchsorted([anchor["timeMs"] for anchor in beat_anchors], time_ms, side="right") - 1), len(beat_anchors) - 1))
        anchor = beat_anchors[beat_index]
        subdivision = clamp((time_ms - anchor["timeMs"]) / max(anchor["intervalMs"], 1), 0.0, 1.0)
        salience = float(percussive_env_n[int(frame)])
        if salience < 0.52 or not (0.3 <= subdivision <= 0.7):
            continue
        candidates.append(
            {
                "eventId": f"rock-sync-{index}",
                "sourceRole": "accent",
                "sourceTimeMs": time_ms,
                "rawOnsetMs": time_ms,
                "pitchMidi": None,
                "confidence": round(max(0.16, salience * 0.5), 3),
                "salience": round(salience * 0.8, 3),
                "sustainMs": 0,
            }
        )
    return candidates


def assign_motif_ids(events: List[Dict[str, object]]) -> List[Dict[str, object]]:
    motif_lookup: Dict[str, str] = {}
    motif_counter = 0
    by_phrase: Dict[int, List[Dict[str, object]]] = defaultdict(list)
    for event in events:
        by_phrase[int(event["phraseIndex"])].append(event)

    for phrase_index, phrase_events in by_phrase.items():
        phrase_events.sort(key=lambda item: int(item["sourceTimeMs"]))
        melodic_events = [event for event in phrase_events if str(event["sourceRole"]) in ("melody", "hook", "sustain")]
        if len(melodic_events) < MOTIF_MIN_EVENTS:
            for event in phrase_events:
                event["motifId"] = None
                event["motifHead"] = False
            continue
        previous_pitch: Optional[float] = None
        tokens: List[str] = []
        for event in melodic_events[:8]:
            if event["pitchMidi"] is None or previous_pitch is None:
                contour = "x"
            else:
                diff = float(event["pitchMidi"]) - previous_pitch
                contour = "u" if diff > 1.2 else "d" if diff < -1.2 else "s"
            previous_pitch = float(event["pitchMidi"]) if event["pitchMidi"] is not None else previous_pitch
            role_char = "h" if str(event["sourceRole"]) == "hook" else "m"
            tokens.append(f"{int(event['phraseSlot'])}:{role_char}:{contour}")
        signature = "|".join(tokens)
        if signature not in motif_lookup:
            motif_counter += 1
            motif_lookup[signature] = f"motif-{motif_counter}"
        motif_id = motif_lookup[signature]
        motif_head_time = min(int(event["sourceTimeMs"]) for event in phrase_events)
        for event in phrase_events:
            event["motifId"] = motif_id
            event["motifHead"] = int(event["sourceTimeMs"]) == motif_head_time
    return events


def detect_sections(beat_anchors: Sequence[Dict[str, int]], harmonic_chroma: np.ndarray, rms: np.ndarray) -> List[Dict[str, object]]:
    bar_count = (beat_anchors[-1]["barIndex"] + 1) if beat_anchors else 0
    if bar_count == 0:
        return []

    bar_features: List[np.ndarray] = []
    for bar_index in range(bar_count):
        bar_beats = [anchor for anchor in beat_anchors if anchor["barIndex"] == bar_index]
        if not bar_beats:
            bar_features.append(np.zeros(14, dtype=np.float64))
            continue
        start_ms = bar_beats[0]["timeMs"]
        end_ms = bar_beats[-1]["timeMs"] + bar_beats[-1]["intervalMs"]
        start_frame = max(0, nearest_frame_for_time(start_ms))
        end_frame = min(harmonic_chroma.shape[1], nearest_frame_for_time(end_ms))
        if start_frame >= end_frame:
            bar_features.append(np.zeros(14, dtype=np.float64))
            continue
        chroma_slice = np.mean(harmonic_chroma[:, start_frame:end_frame], axis=1)
        rms_slice = np.mean(rms[start_frame:end_frame]) if end_frame > start_frame else 0.0
        onset_density = (end_frame - start_frame) / max(1.0, nearest_frame_for_time(end_ms) - nearest_frame_for_time(start_ms))
        bar_features.append(np.concatenate([chroma_slice, np.array([rms_slice, onset_density], dtype=np.float64)]))

    sections: List[Dict[str, object]] = []
    current_start_bar = 0
    current_label_index = 1
    previous_block: Optional[np.ndarray] = None
    block_starts = list(range(0, bar_count, SECTION_BARS))
    for block_start in block_starts:
        block_end = min(bar_count, block_start + SECTION_BARS)
        block_feature = np.mean(bar_features[block_start:block_end], axis=0)
        should_split = previous_block is not None and cosine_distance(previous_block, block_feature) > 0.16
        if should_split:
            sections.append(
                build_section_record(
                    beat_anchors,
                    current_start_bar,
                    block_start,
                    current_label_index,
                )
            )
            current_start_bar = block_start
            current_label_index += 1
        previous_block = block_feature

    sections.append(build_section_record(beat_anchors, current_start_bar, bar_count, current_label_index))
    return sections


def cosine_distance(left: np.ndarray, right: np.ndarray) -> float:
    denom = float(np.linalg.norm(left) * np.linalg.norm(right))
    if denom <= 1e-9:
        return 0.0
    return 1.0 - float(np.dot(left, right) / denom)


def build_section_record(
    beat_anchors: Sequence[Dict[str, int]],
    start_bar: int,
    end_bar: int,
    label_index: int,
) -> Dict[str, object]:
    start_anchor = next(anchor for anchor in beat_anchors if anchor["barIndex"] >= start_bar)
    end_anchor = next((anchor for anchor in beat_anchors if anchor["barIndex"] >= end_bar), None)
    end_ms = int(end_anchor["timeMs"]) if end_anchor else int(beat_anchors[-1]["timeMs"] + beat_anchors[-1]["intervalMs"])
    return {
        "id": f"section-{label_index}",
        "label": f"S{label_index}",
        "startMs": int(start_anchor["timeMs"]),
        "endMs": end_ms,
        "startBar": start_bar,
        "endBar": end_bar,
    }


def infer_source_values(events: List[Dict[str, object]]) -> List[float]:
    source_values: List[float] = []
    pitches = [float(event["pitchMidi"]) for event in events if event["pitchMidi"] is not None]
    center_value = statistics.mean(pitches) if pitches else 60.0
    for index, event in enumerate(events):
        if event["pitchMidi"] is not None:
            source_values.append(float(event["pitchMidi"]))
            continue
        previous_pitch = next((float(events[left]["pitchMidi"]) for left in range(index - 1, -1, -1) if events[left]["pitchMidi"] is not None), None)
        next_pitch = next((float(events[right]["pitchMidi"]) for right in range(index + 1, len(events)) if events[right]["pitchMidi"] is not None), None)
        if previous_pitch is not None and next_pitch is not None:
            interpolated = (previous_pitch + next_pitch) / 2.0
        elif previous_pitch is not None:
            interpolated = previous_pitch
        elif next_pitch is not None:
            interpolated = next_pitch
        else:
            interpolated = center_value
        if str(event["sourceRole"]) == "accent":
            beat_in_bar = int(event["beatInBar"])
            if beat_in_bar in (1, 3):
                interpolated = (interpolated * 0.7) + 1.5 * 0.3
            else:
                interpolated = (interpolated * 0.8) + center_value * 0.2
        source_values.append(interpolated)
    return source_values


def build_phrase_targets(events: List[Dict[str, object]]) -> List[int]:
    source_values = infer_source_values(events)
    unique_values = sorted(set(round(value, 2) for value in source_values))
    value_min = min(source_values)
    value_max = max(source_values)
    targets: List[int] = []
    for value, event in zip(source_values, events):
        if value_max - value_min < 2.2 and len(unique_values) > 1:
            rank = unique_values.index(round(value, 2))
            target = int(round((rank / max(1, len(unique_values) - 1)) * 3))
        else:
            target = int(round(((value - value_min) / max(value_max - value_min, 1e-6)) * 3))
        if str(event["sourceRole"]) == "accent":
            target = int(round((target * 0.65) + (1.5 * 0.35)))
        targets.append(max(0, min(3, target)))
    return targets


def route_phrase(events: List[Dict[str, object]], previous_lane: int) -> List[int]:
    targets = build_phrase_targets(events)
    state_costs: Dict[Tuple[int, int], float] = {}
    backtrace: List[Dict[Tuple[int, int], Optional[Tuple[int, int]]]] = []
    first_event = events[0]
    first_backtrace: Dict[Tuple[int, int], Optional[Tuple[int, int]]] = {}
    for lane in range(4):
        jump = abs(lane - previous_lane)
        cost = note_lane_cost(first_event, targets[0], lane, previous_lane, 1) + jump_penalty(jump) * 0.6
        state = (lane, 1)
        state_costs[state] = cost
        first_backtrace[state] = None
    backtrace.append(first_backtrace)

    for event_index in range(1, len(events)):
        next_costs: Dict[Tuple[int, int], float] = {}
        next_backtrace: Dict[Tuple[int, int], Tuple[int, int]] = {}
        event = events[event_index]
        for (prev_lane, prev_streak), prev_cost in state_costs.items():
            for lane in range(4):
                streak = min(3, prev_streak + 1) if prev_lane == lane else 1
                state = (lane, streak)
                cost = prev_cost + note_lane_cost(event, targets[event_index], lane, prev_lane, prev_streak)
                if state not in next_costs or cost < next_costs[state]:
                    next_costs[state] = cost
                    next_backtrace[state] = (prev_lane, prev_streak)
        state_costs = next_costs
        backtrace.append(next_backtrace)

    end_state = min(state_costs.items(), key=lambda item: item[1])[0]
    lanes = [0] * len(events)
    current = end_state
    for event_index in range(len(events) - 1, -1, -1):
        lanes[event_index] = current[0]
        previous = backtrace[event_index].get(current)
        if previous is None:
            break
        current = previous
    return lanes


def note_lane_cost(event: Dict[str, object], target_lane: int, lane: int, previous_lane: int, previous_streak: int) -> float:
    jump = abs(lane - previous_lane)
    role = str(event["sourceRole"])
    confidence = float(event["confidence"])
    distance_weight = 2.8 if role in ("melody", "hook") and confidence >= 0.55 else 1.9
    cost = abs(lane - target_lane) * distance_weight
    cost += jump_penalty(jump)
    if lane == previous_lane:
        cost += 0.55 * previous_streak
        if previous_streak >= 2 and role in ("melody", "hook"):
            cost += 1.8
    if role == "accent":
        cost += abs(lane - 1.5) * 0.35
    return cost


def jump_penalty(jump: int) -> float:
    if jump <= 1:
        return 0.0
    if jump == 2:
        return 1.4
    return 6.8


def route_lanes(track_id: str, events: List[Dict[str, object]]) -> List[Dict[str, object]]:
    events = [dict(event) for event in events]
    motif_patterns: Dict[str, List[int]] = {}
    routed: List[Dict[str, object]] = []
    previous_lane = 1
    by_phrase: Dict[int, List[Dict[str, object]]] = defaultdict(list)
    for event in events:
        by_phrase[int(event["phraseIndex"])].append(event)

    for phrase_index in sorted(by_phrase.keys()):
        phrase_events = sorted(by_phrase[phrase_index], key=lambda item: int(item["sourceTimeMs"]))
        motif_id = phrase_events[0].get("motifId")
        if isinstance(motif_id, str) and motif_id in motif_patterns and len(motif_patterns[motif_id]) == len(phrase_events):
            lanes = motif_patterns[motif_id][:]
        else:
            lanes = route_phrase(phrase_events, previous_lane)
            if isinstance(motif_id, str):
                motif_patterns[motif_id] = lanes[:]

        for event, lane in zip(phrase_events, lanes):
            event["lane"] = lane
            routed.append(event)
            previous_lane = lane
    return routed


def select_master_events(track: Dict[str, object], candidates: List[Dict[str, object]]) -> List[Dict[str, object]]:
    by_phrase: Dict[int, List[Dict[str, object]]] = defaultdict(list)
    for candidate in candidates:
        by_phrase[int(candidate["phraseIndex"])].append(candidate)

    melody_like_salience = [float(candidate["salience"]) for candidate in candidates if str(candidate["sourceRole"]) in ("melody", "hook")]
    accent_salience = [float(candidate["salience"]) for candidate in candidates if str(candidate["sourceRole"]) == "accent"]
    melodic_threshold = np.quantile(melody_like_salience, 0.18 if track["mode"] == "piano" else 0.24) if melody_like_salience else 0.0
    accent_threshold = np.quantile(accent_salience, 0.58 if track["mode"] == "piano" else 0.44) if accent_salience else 1.0

    selected: List[Dict[str, object]] = []
    for phrase_index in sorted(by_phrase.keys()):
        phrase_candidates = sorted(by_phrase[phrase_index], key=lambda item: int(item["sourceTimeMs"]))
        phrase_required_ids = {str(phrase_candidates[0]["eventId"])}
        strongest_in_phrase = max(phrase_candidates, key=lambda item: float(item["salience"]))
        phrase_required_ids.add(str(strongest_in_phrase["eventId"]))

        chosen: List[Dict[str, object]] = []
        for candidate in phrase_candidates:
            role = str(candidate["sourceRole"])
            salience = float(candidate["salience"])
            keep = False
            if str(candidate["eventId"]) in phrase_required_ids:
                keep = True
            elif role in ("melody", "hook"):
                keep = salience >= melodic_threshold
            else:
                keep = salience >= accent_threshold and (bool(candidate["isStrongBeat"]) or bool(candidate["isSyncopated"]))
            if keep:
                chosen.append(candidate)

        selected.extend(enforce_spacing(chosen, int(track["master_spacing_ms"]), phrase_required_ids))

    selected = sorted(selected, key=lambda item: int(item["sourceTimeMs"]))
    return route_lanes(str(track["id"]), assign_motif_ids(selected))


def derive_difficulty_charts(track: Dict[str, object], master_events: List[Dict[str, object]], sections: List[Dict[str, object]], beat_anchors: List[Dict[str, int]], duration_ms: int, tempo: float) -> Dict[str, Dict[str, object]]:
    master_events = sorted(master_events, key=lambda item: int(item["sourceTimeMs"]))
    melodic_salience = [float(event["salience"]) for event in master_events if str(event["sourceRole"]) in ("melody", "hook", "sustain")]
    q_medium = float(np.quantile(melodic_salience, 0.36)) if melodic_salience else 0.0
    q_easy = float(np.quantile(melodic_salience, 0.38)) if melodic_salience else 0.0

    phrase_heads = {str(group[0]["eventId"]) for group in grouped_occurrences(master_events, "phraseId").values() if group}
    motif_heads = {str(group[0]["eventId"]) for group in grouped_occurrences(master_events, "motifId").values() if group and group[0].get("motifId") is not None}

    medium_required = set(phrase_heads | motif_heads)
    easy_required = set(phrase_heads | motif_heads)

    medium_candidates = [
        event
        for event in master_events
        if str(event["eventId"]) in medium_required
        or float(event["salience"]) >= q_medium
        or (str(event["sourceRole"]) == "accent" and bool(event["isSyncopated"]) and float(event["salience"]) >= q_medium * 0.9)
        or int(event["durationMs"]) >= int(float(event["beatMs"]) * 0.8)
    ]
    medium = enforce_spacing(medium_candidates, int(track["medium_spacing_ms"]), medium_required)

    easy_candidates = [
        event
        for event in medium
        if str(event["eventId"]) in easy_required
        or (str(event["sourceRole"]) in ("melody", "hook") and float(event["salience"]) >= q_easy)
        or (bool(event["isStrongBeat"]) and float(event["salience"]) >= q_easy * 0.9)
        or int(event["durationMs"]) >= int(float(event["beatMs"]) * 1.0)
        or (str(event["sourceRole"]) in ("melody", "hook") and bool(event["motifHead"]) and float(event["salience"]) >= q_medium)
    ]
    easy = enforce_spacing(easy_candidates, int(track["easy_spacing_ms"]), easy_required)

    charts = {
        "hard": build_chart_payload(master_events, sections, beat_anchors, duration_ms, tempo),
        "medium": build_chart_payload(medium, sections, beat_anchors, duration_ms, tempo),
        "easy": build_chart_payload(easy, sections, beat_anchors, duration_ms, tempo),
    }
    return charts


def grouped_occurrences(events: Sequence[Dict[str, object]], key: str) -> Dict[object, List[Dict[str, object]]]:
    grouped: Dict[object, List[Dict[str, object]]] = defaultdict(list)
    for event in events:
        grouped[event.get(key)].append(event)
    return grouped


def enforce_spacing(candidates: Sequence[Dict[str, object]], min_spacing_ms: int, required_ids: Sequence[str]) -> List[Dict[str, object]]:
    required = {str(event_id) for event_id in required_ids}
    selected: List[Dict[str, object]] = []
    for candidate in sorted(candidates, key=lambda item: int(item["sourceTimeMs"])):
        candidate_id = str(candidate["eventId"])
        required_candidate = candidate_id in required
        if not selected:
            selected.append(candidate)
            continue
        previous = selected[-1]
        gap_ms = int(candidate["sourceTimeMs"]) - int(previous["sourceTimeMs"])
        if gap_ms >= min_spacing_ms or required_candidate and str(previous["eventId"]) in required:
            selected.append(candidate)
            continue
        previous_required = str(previous["eventId"]) in required
        if required_candidate and not previous_required:
            selected[-1] = candidate
            continue
        if previous_required and not required_candidate:
            continue
        if float(candidate["salience"]) > float(previous["salience"]) + 0.06:
            selected[-1] = candidate
    return selected


def build_chart_payload(
    events: Sequence[Dict[str, object]],
    sections: Sequence[Dict[str, object]],
    beat_anchors: Sequence[Dict[str, int]],
    duration_ms: int,
    tempo: float,
) -> Dict[str, object]:
    notes = []
    hold_count = 0
    for event in events:
        duration = int(event["durationMs"])
        if duration > 0:
            hold_count += 1
        notes.append(
            {
                "timeMs": int(event["sourceTimeMs"]),
                "lane": int(event["lane"]),
                "durationMs": duration,
                "beatMs": int(event["beatMs"]),
                "sourceRole": str(event["chartRole"]),
                "confidence": round(float(event["confidence"]), 3),
                "phraseId": int(event["phraseId"]),
                "motifId": event["motifId"],
            }
        )

    return {
        "durationMs": duration_ms,
        "leadInMs": 180,
        "bpm": round(float(tempo), 3),
        "beatAnchors": [dict(anchor) for anchor in beat_anchors],
        "sections": [dict(section) for section in sections],
        "notes": notes,
        "summary": {
            "noteCount": len(notes),
            "holdCount": hold_count,
            "distinctLaneCount": len({note["lane"] for note in notes}),
            "firstNoteMs": notes[0]["timeMs"] if notes else 0,
        },
    }


def annotate_master_events(track: Dict[str, object], events: List[Dict[str, object]]) -> List[Dict[str, object]]:
    for event in events:
        event["eventIdHash"] = stable_event_hash(str(event["eventId"]))

    next_time_ms = {
        int(events[index]["eventIdHash"]): int(events[index + 1]["sourceTimeMs"]) if index + 1 < len(events) else None
        for index in range(len(events))
    }
    for event in events:
        sustain_ms = int(event["sustainMs"])
        next_event_ms = next_time_ms[int(event["eventIdHash"])]
        if next_event_ms is not None:
            sustain_ms = min(sustain_ms, max(0, next_event_ms - int(event["sourceTimeMs"]) - 72))
        sustain_ms = max(0, sustain_ms)
        minimum_hold_ms = max(
            int(track.get("hold_min_ms", 340)),
            int(float(event["beatMs"]) * float(track.get("hold_threshold_beats", 1.0))),
        )
        event["durationMs"] = sustain_ms if sustain_ms >= minimum_hold_ms else 0
        event["chartRole"] = "sustain" if event["durationMs"] > 0 else str(event["sourceRole"])
    return events


def stable_event_hash(value: str) -> int:
    result = 0
    for char in value:
        result = (result * 33 + ord(char)) % 1_000_000_007
    return result


def compute_quality_report(track_id: str, charts: Dict[str, Dict[str, object]], master_events: Sequence[Dict[str, object]]) -> Dict[str, object]:
    timing_errors = [abs(int(event["sourceTimeMs"]) - int(event["rawOnsetMs"])) for event in master_events]
    motif_lane_issues = 0
    motif_occurrences = 0
    motif_groups = grouped_occurrences(master_events, "motifId")
    for motif_id, events in motif_groups.items():
        if motif_id is None:
            continue
        by_phrase = grouped_occurrences(events, "phraseId")
        pattern: Optional[List[int]] = None
        for occurrence in by_phrase.values():
            occurrence = sorted(occurrence, key=lambda item: int(item["sourceTimeMs"]))
            lanes = [int(event["lane"]) for event in occurrence]
            if pattern is None:
                pattern = lanes
                motif_occurrences += 1
                continue
            motif_occurrences += 1
            if lanes != pattern:
                motif_lane_issues += 1

    hard_notes = charts["hard"]["notes"]
    medium_keys = {note_identity(note) for note in charts["medium"]["notes"]}
    easy_keys = {note_identity(note) for note in charts["easy"]["notes"]}
    hard_keys = {note_identity(note) for note in hard_notes}

    return {
        "timingErrorMs": {
            "median": round(statistics.median(timing_errors), 2) if timing_errors else 0.0,
            "p90": round(np.quantile(timing_errors, 0.9), 2) if timing_errors else 0.0,
            "max": round(max(timing_errors), 2) if timing_errors else 0.0,
        },
        "motifLaneMismatchRate": round(motif_lane_issues / max(1, motif_occurrences - 1), 3),
        "subsetIntegrity": {
            "mediumInHard": medium_keys.issubset(hard_keys),
            "easyInMedium": easy_keys.issubset(medium_keys),
        },
        "hardSummary": charts["hard"]["summary"],
        "songId": track_id,
    }


def note_identity(note: Dict[str, object]) -> Tuple[int, int, int]:
    return (int(note["timeMs"]), int(note["lane"]), int(note["durationMs"]))


def build_track(track: Dict[str, object]) -> Tuple[Dict[str, object], Dict[str, object]]:
    audio = load_audio(Path(track["path"]))
    beat_anchors = build_beat_anchors(np.asarray(audio["beatTimesS"]))
    sections = detect_sections(beat_anchors, np.asarray(audio["harmonicChroma"]), np.asarray(audio["rms"]))

    if track["mode"] == "piano":
        raw_candidates, transcription_analysis = build_piano_candidates_from_transcription(track, audio, beat_anchors)
    else:
        raw_candidates, transcription_analysis = build_rock_candidates_from_transcription(track, audio, beat_anchors)

    merged_candidates = enrich_candidates(merge_candidates(raw_candidates), beat_anchors)
    master_events = annotate_master_events(track, select_master_events(track, merged_candidates))
    charts = derive_difficulty_charts(track, master_events, sections, beat_anchors, int(audio["durationMs"]), float(audio["tempo"]))
    quality = compute_quality_report(str(track["id"]), charts, master_events)

    payload = {
        "label": track["label"],
        "audioSrc": f"../../assets/audio/{Path(track['path']).name}",
        "durationMs": int(audio["durationMs"]),
        "bpm": round(float(audio["tempo"]), 3),
        "master": build_chart_payload(master_events, sections, beat_anchors, int(audio["durationMs"]), float(audio["tempo"])),
        "charts": charts,
    }
    analysis = {
        "label": track["label"],
        "tempo": round(float(audio["tempo"]), 3),
        "durationMs": int(audio["durationMs"]),
        "beatAnchors": beat_anchors,
        "sections": sections,
        "transcription": transcription_analysis,
        "candidates": merged_candidates,
        "masterEvents": master_events,
        "quality": quality,
    }
    return payload, analysis


def build_all() -> Tuple[Dict[str, object], Dict[str, object], Dict[str, object]]:
    payload: Dict[str, object] = {}
    analysis: Dict[str, object] = {}
    summary: Dict[str, object] = {}
    for track in TRACKS:
        track_payload, track_analysis = build_track(track)
        payload[str(track["id"])] = track_payload
        analysis[str(track["id"])] = track_analysis
        summary[str(track["id"])] = {
            difficulty: track_payload["charts"][difficulty]["summary"] for difficulty in DIFFICULTIES
        }
        summary[str(track["id"])]["quality"] = track_analysis["quality"]
    return payload, analysis, summary


def render_ts_module(payload: Dict[str, object]) -> str:
    return "// Generated by scripts/build_audio_charts.py\n" "export const AI_TRACK_DATA = " + json.dumps(payload, indent=2) + " as const;\n"


def write_outputs(payload: Dict[str, object], analysis: Dict[str, object]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(render_ts_module(payload), encoding="utf-8")
    ANALYSIS_PATH.write_text(json.dumps(analysis, indent=2), encoding="utf-8")


def validate_quality(summary: Dict[str, object]) -> List[str]:
    issues: List[str] = []
    for track_id in ("piano", "rock"):
        quality = summary[track_id]["quality"]
        timing = quality["timingErrorMs"]
        if timing["median"] > 12:
            issues.append(f"{track_id}: median timing error {timing['median']}ms exceeds 12ms")
        if timing["p90"] > 25:
            issues.append(f"{track_id}: p90 timing error {timing['p90']}ms exceeds 25ms")
        if timing["max"] > 35:
            issues.append(f"{track_id}: max timing error {timing['max']}ms exceeds 35ms")
        if quality["motifLaneMismatchRate"] > 0.0:
            issues.append(f"{track_id}: motif lane mismatch rate {quality['motifLaneMismatchRate']} should be 0")
        subset = quality["subsetIntegrity"]
        if not subset["mediumInHard"] or not subset["easyInMedium"]:
            issues.append(f"{track_id}: difficulty subsets are not preserved")
    return issues


def check_outputs(payload: Dict[str, object], analysis: Dict[str, object], summary: Dict[str, object]) -> int:
    issues = validate_quality(summary)
    expected_ts = render_ts_module(payload)
    expected_analysis = json.dumps(analysis, indent=2)
    if not OUTPUT_PATH.exists() or OUTPUT_PATH.read_text(encoding="utf-8") != expected_ts:
        issues.append(f"{OUTPUT_PATH.name} is out of date. Run python3 scripts/build_audio_charts.py")
    if not ANALYSIS_PATH.exists() or ANALYSIS_PATH.read_text(encoding="utf-8") != expected_analysis:
        issues.append(f"{ANALYSIS_PATH.name} is out of date. Run python3 scripts/build_audio_charts.py")
    if issues:
        print(json.dumps({"ok": False, "issues": issues, "summary": summary}, indent=2))
        return 1
    print(json.dumps({"ok": True, "summary": summary}, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate generated outputs and chart quality without writing files")
    args = parser.parse_args()

    payload, analysis, summary = build_all()
    if args.check:
        return check_outputs(payload, analysis, summary)

    write_outputs(payload, analysis)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
