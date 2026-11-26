#!/usr/bin/env python3
"""Convertit les illustrations Codex (PNG) en WebP optimisés pour le jeu.

Usage : python3 tools/assets.py <dossier_png> [public/assets/img]
Décors et écrans : 1080 px de large max. Boss : 640 px. Vaisseaux, ennemis, icônes : 320 px.
Portraits : 384 px. La transparence est conservée et les marges vides sont rognées.
"""
import sys
from pathlib import Path
from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "art/out")
DST = Path(sys.argv[2] if len(sys.argv) > 2 else "public/assets/img")
DST.mkdir(parents=True, exist_ok=True)

FULL = ("fond_", "key_art", "fin")


def limits(name: str):
    if name.startswith(FULL):
        return (1080, 1620), 80
    if name.startswith("boss_"):
        return (640, 640), 86
    if name.startswith(("portrait_", "deco_")):
        return (384, 384), 85
    return (320, 320), 88


total = 0
for png in sorted(SRC.glob("*.png")):
    im = Image.open(png)
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    if im.mode == "RGBA" and not png.stem.startswith(FULL):
        bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if bbox:
            pad = 6
            im = im.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad)))
    box, q = limits(png.stem)
    im.thumbnail(box, Image.LANCZOS)
    out = DST / f"{png.stem}.webp"
    tmp = out.with_suffix(".tmp")
    im.save(tmp, "WEBP", quality=q, method=6)
    tmp.replace(out)  # écriture atomique
    total += out.stat().st_size
    print(f"{png.stem:22s} {im.size[0]}x{im.size[1]}  {out.stat().st_size // 1024} Ko")
print(f"Total : {total / 1024 / 1024:.1f} Mo")
