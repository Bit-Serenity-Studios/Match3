#!/usr/bin/env python3
"""
Regenerate the Kenney (CC0) game audio from the KennyNLAssets mirror.

Kenney ships OGG Vorbis only, which iOS (expo-audio / AVFoundation) and
iPhone Safari cannot decode. This transcodes the chosen files to mp3
(universally supported) using a pure-Python pipeline — no ffmpeg needed:
    soundfile (libsndfile) reads OGG -> PCM  ->  lameenc (LAME) writes mp3

Usage:
    pip install soundfile lameenc numpy
    KENNEY_ROOT=/path/to/KennyNLAssets python3 scripts/transcode-kenney-audio.py

Outputs SFX to assets/sounds/*.mp3 and ambient loops to assets/music/kenney_*.mp3.
All source files are CC0 — see ASSETS_LICENSES.md.
"""
import os
import soundfile as sf
import lameenc

KENNEY = os.environ.get("KENNEY_ROOT", "/home/user/kennynlassets") + "/Audio"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SFX = {
    "click":  "UI Audio/Audio/click1.ogg",
    "swap":   "Interface Sounds/Audio/select_001.ogg",
    "match":  "Interface Sounds/Audio/glass_001.ogg",
    "chain":  "Music Jingles/Audio (Pizzicato)/jingles-pizzicato_00.ogg",
    "reject": "Interface Sounds/Audio/back_001.ogg",
    "win":    "Music Jingles/Audio (Steeldrum)/jingles-steel_00.ogg",
    "lose":   "Impact Sounds/Audio/impactSoft_medium_000.ogg",
    "splash": "Interface Sounds/Audio/confirmation_001.ogg",
    "toast":  "Interface Sounds/Audio/pluck_001.ogg",
}

MUSIC = {
    "kenney_flowing_rocks":    "Music Loops/Loops/Flowing Rocks.ogg",
    "kenney_night_beach":      "Music Loops/Loops/Night at the Beach.ogg",
    "kenney_infinite_descent": "Music Loops/Loops/Infinite Descent.ogg",
}


def transcode(src: str, dst: str, bitrate: int) -> None:
    data, sr = sf.read(src, dtype="int16", always_2d=True)
    ch = data.shape[1]
    enc = lameenc.Encoder()
    enc.set_bit_rate(bitrate)
    enc.set_in_sample_rate(sr)
    enc.set_channels(ch)
    enc.set_quality(2)
    mp3 = enc.encode(data.tobytes()) + enc.flush()
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(mp3)
    print(f"  {os.path.basename(dst):28s} {sr}Hz {ch}ch  {max(1, len(mp3)//1024)}KB")


def main() -> None:
    print("SFX -> assets/sounds/*.mp3")
    for name, rel in SFX.items():
        transcode(f"{KENNEY}/{rel}", f"{HERE}/assets/sounds/{name}.mp3", 128)
    print("Music -> assets/music/kenney_*.mp3")
    for name, rel in MUSIC.items():
        transcode(f"{KENNEY}/{rel}", f"{HERE}/assets/music/{name}.mp3", 160)
    print("done.")


if __name__ == "__main__":
    main()
