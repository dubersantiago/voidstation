#!/usr/bin/env python3
"""Convierte las hojas fuente de art/fuentes/ (fondo magenta) en spritesheets del juego (§9.7).

Uso: npm run import-sprites            (o: python3 scripts/import-sprites.py [--preview DIR])

Para cada hoja: extrae los fotogramas, quita el fondo magenta, reduce al tamaño de §9.3 por moda
de bloque y cuantiza a la paleta de §9.2 (leída de src/config.ts). Escribe
public/assets/sprites/<clave>.png (tira horizontal de fotogramas) y public/assets/sprites/sprites.json
(tamaño de fotograma, animaciones y hacia dónde mira cada sprite).

Requiere Pillow (python3 -c "import PIL").
"""

import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "fuentes"
OUT = ROOT / "public" / "assets" / "sprites"

# --- Paleta (§9.2), única fuente: src/config.ts ---

config = (ROOT / "src" / "config.ts").read_text(encoding="utf8")
block = re.search(r"export const PALETTE = \{(.*?)\} as const", config, re.S)
if not block:
    sys.exit("No se encontró PALETTE en src/config.ts")
PALETTE = [(name, int(hexv, 16)) for name, hexv in re.findall(r"(\w+):\s*0x([0-9a-fA-F]{6})", block.group(1))]
NAMES = [n for n, _ in PALETTE]
N = len(PALETTE)

# Índices extra (transparentes): el magenta del fondo y sus mezclas por compresión JPEG.
MAGENTAS = [0xFF00FF, 0xE000E0, 0xC000C0, 0xA000A0, 0x800080, 0xFF40FF, 0xE060E0]
TRANSPARENT = set(range(N, N + len(MAGENTAS)))

_pal_img = Image.new("P", (1, 1))
_flat = []
for c in [c for _, c in PALETTE] + MAGENTAS:
    _flat += [(c >> 16) & 255, (c >> 8) & 255, c & 255]
_pal_img.putpalette(_flat + [0, 0, 0] * (256 - len(_flat) // 3))

# Colores de entorno: el suelo dibujado en algunas hojas se elimina por debajo de `floor_y`.
ENVIRONMENT = {i for i, n in enumerate(NAMES) if n.startswith(("void", "metal"))}
# Brillo un paso más (estado fotogénico por paleta: "la crisálida se ilumina").
GLOW = {NAMES.index(a): NAMES.index(b) for a, b in [("bio0", "bio1"), ("bio1", "bio2"), ("bio2", "bio3")]}

# --- Definición de cada hoja ---
# size: tamaño de fotograma (§9.3). anchor: base ("bottom") o cabeza ("top") alineada entre fotogramas.
# grid: columnas por fila; rows: límites verticales de cada fila (px) o None para repartir igual.
# use_rows: filas a extraer. mask: rectángulos (x, y, w, h) por celda que se borran (etiquetas, números).
# register: "union" = mismo recorte para todas las celdas (sin saltos); "frame" = recorte por fotograma.
# segment: en vez de rejilla, separa figuras por columnas vacías dentro de (y0, y1).
# glow: fotogramas a duplicar con la bioluminiscencia un paso más brillante (se añaden al final).
# anims: nombre → (fotogramas, fps, repeat). mira: "derecha" si el dibujo mira a la derecha (se voltea).
SHEETS = {
    "jugador": dict(
        src="jugador.jpeg", size=(16, 24), grid=[7, 7, 7], inset=5, register="union", mira="derecha",
        anims={"abajo": (list(range(0, 7)), 8, -1), "arriba": (list(range(7, 14)), 8, -1), "lado": (list(range(14, 21)), 8, -1)},
    ),
    "jenkins-vigia": dict(
        src="jenkins-vigia.jpeg", size=(64, 96), grid=[4, 4], inset=4, register="union",
        anims={"idle": ([0], 1, -1), "fotogenico": ([1, 2, 3, 4, 5, 6], 6, 0)},
    ),
    "terraform-arquitecta": dict(
        src="terraform-arquitecta.jpeg", size=(64, 64), grid=[4, 4], inset=4, register="union",
        anims={"idle": ([0, 1], 2, -1), "fotogenico": ([2, 3, 4, 5, 6, 7], 6, -1)},
    ),
    "argocd-medusa": dict(
        src="argocd-medusa.jpeg", size=(48, 64), grid=[5, 6], use_rows=[1], inset=5, mask=[(0, 0, 40, 42)],
        register="frame", anchor="top",
        anims={"idle": ([0], 1, -1), "fotogenico": ([1, 2, 3, 4, 5], 6, -1)},
    ),
    "talos-obrera": dict(
        src="talos-obrera.jpeg", size=(24, 24), grid=[8], inset=4, floor_y=250, register="union", mira="derecha",
        anims={"idle": ([0, 1, 2, 3], 6, -1), "fotogenico": ([4, 5, 6, 7], 4, 0)},
    ),
    "talos-reina": dict(
        src="talos-reina.jpeg", size=(48, 48), segment=(30, 560),
        anims={"idle": ([0], 1, -1), "fotogenico": ([1, 2, 3, 4, 5, 6, 7], 6, 0)},
    ),
    "titan-proxmox": dict(
        src="titan-proxmox.jpeg", size=(160, 128), grid=[4], rows=[(0, 336)], inset=5, mask=[(0, 0, 70, 30)],
        register="union", glow=[0, 1, 2, 3],
        anims={"idle": ([0, 1, 2, 3, 2, 1], 3, -1), "fotogenico": ([4, 5, 6, 7, 6, 5], 3, -1)},
    ),
    "helm-cangrejo": dict(
        src="helm-cangrejo.jpeg", size=(32, 24), grid=[10, 10], inset=4, register="union", mira="derecha",
        # Se omite la celda 5: el cangrejo se sale de ella. Tras filtrar, los índices se renumeran (0–8).
        frames_used=[0, 1, 2, 3, 4, 6, 7, 8, 9],
        anims={"idle": ([0, 1, 2, 3, 4], 6, -1), "fotogenico": ([5, 6, 7, 8], 4, 0)},
    ),
}


def quantize(img: Image.Image) -> Image.Image:
    """Cada píxel al color más cercano de la paleta (o a un magenta = transparente). Sin dithering."""
    return img.convert("RGB").quantize(palette=_pal_img, dither=Image.Dither.NONE)


def opaque(px, x, y) -> bool:
    return px[x, y] not in TRANSPARENT


def bbox(img: Image.Image, min_count=3):
    """Caja de los píxeles opacos, ignorando filas/columnas con menos de `min_count` (ruido JPEG)."""
    w, h = img.size
    px = img.load()
    cols = [sum(opaque(px, x, y) for y in range(h)) for x in range(w)]
    rows = [sum(opaque(px, x, y) for x in range(w)) for y in range(h)]
    xs = [x for x, c in enumerate(cols) if c >= min_count]
    ys = [y for y, c in enumerate(rows) if c >= min_count]
    if not xs or not ys:
        return None
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def clear(img: Image.Image, rect):
    px = img.load()
    x0, y0, w, h = rect
    for y in range(max(0, y0), min(img.height, y0 + h)):
        for x in range(max(0, x0), min(img.width, x0 + w)):
            px[x, y] = N  # magenta = transparente


def cells(q: Image.Image, spec):
    """Recorta las celdas de la rejilla (en coordenadas de la hoja)."""
    W, H = q.size
    grid = spec["grid"]
    rows = spec.get("rows") or [(round(i * H / len(grid)), round((i + 1) * H / len(grid))) for i in range(len(grid))]
    inset = spec.get("inset", 0)
    out = []
    for r, ncols in enumerate(grid):
        if "use_rows" in spec and r not in spec["use_rows"]:
            continue
        y0, y1 = rows[r]
        for c in range(ncols):
            x0, x1 = round(c * W / ncols), round((c + 1) * W / ncols)
            cell = q.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))
            for m in spec.get("mask", []):
                clear(cell, m)
            if "floor_y" in spec:
                px = cell.load()
                for y in range(max(0, spec["floor_y"] - y0 - inset), cell.height):
                    for x in range(cell.width):
                        if px[x, y] in ENVIRONMENT:
                            px[x, y] = N
            out.append(cell)
    return out


def segments(q: Image.Image, y_range):
    """Figuras separadas por columnas vacías (sin rejilla dibujada)."""
    y0, y1 = y_range
    band = q.crop((0, y0, q.width, y1))
    px = band.load()
    cols = [sum(opaque(px, x, y) for y in range(band.height)) for x in range(band.width)]
    spans, start, gap = [], None, 0
    for x, c in enumerate(cols + [0] * 8):
        if c > 2:
            start = x if start is None else start
            gap = 0
        elif start is not None:
            gap += 1
            if gap > 6:
                spans.append((start, x - gap + 1))
                start, gap = None, 0
    return [band.crop((a, 0, b, band.height)) for a, b in spans if b - a > 20]


def reduce(img: Image.Image, tw: int, th: int) -> Image.Image:
    """Reducción por moda de bloque: transparente si el bloque es mayoritariamente fondo."""
    sw, sh = img.size
    src = img.load()
    out = Image.new("P", (tw, th), N)
    out.putpalette(_pal_img.getpalette())
    dst = out.load()
    for y in range(th):
        for x in range(tw):
            xa, xb = int(x * sw / tw), max(int(x * sw / tw) + 1, int((x + 1) * sw / tw))
            ya, yb = int(y * sh / th), max(int(y * sh / th) + 1, int((y + 1) * sh / th))
            counts, total, empty = {}, 0, 0
            for j in range(ya, yb):
                for i in range(xa, xb):
                    total += 1
                    v = src[i, j]
                    if v in TRANSPARENT:
                        empty += 1
                    else:
                        counts[v] = counts.get(v, 0) + 1
            if counts and empty <= total / 2:
                dst[x, y] = max(counts, key=counts.get)
    return out


def to_rgba(p: Image.Image) -> Image.Image:
    rgba = Image.new("RGBA", p.size, (0, 0, 0, 0))
    src, dst = p.load(), rgba.load()
    for y in range(p.height):
        for x in range(p.width):
            v = src[x, y]
            if v < N:
                c = PALETTE[v][1]
                dst[x, y] = ((c >> 16) & 255, (c >> 8) & 255, c & 255, 255)
    return rgba


def build(key: str, spec: dict):
    q = quantize(Image.open(SRC / spec["src"]))
    frames = segments(q, spec["segment"]) if "segment" in spec else cells(q, spec)
    used = spec.get("frames_used", list(range(len(frames))))
    frames = [frames[i] for i in used]

    boxes = [bbox(f) for f in frames]
    if any(b is None for b in boxes):
        sys.exit(f"{key}: hay fotogramas vacíos")
    if spec.get("register") == "union":
        u = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
        boxes = [u] * len(frames)
    crops = [f.crop(b) for f, b in zip(frames, boxes)]

    tw, th = spec["size"]
    scale = min(tw / max(c.width for c in crops), th / max(c.height for c in crops))
    reduced = []
    for c in crops:
        w, h = max(1, round(c.width * scale)), max(1, round(c.height * scale))
        r = reduce(c, w, h)
        canvas = Image.new("P", (tw, th), N)
        canvas.putpalette(_pal_img.getpalette())
        y = 0 if spec.get("anchor") == "top" else th - h
        canvas.paste(r, ((tw - w) // 2, y))
        reduced.append(canvas)

    for i in spec.get("glow", []):
        g = reduced[i].copy()
        px = g.load()
        for y in range(th):
            for x in range(tw):
                px[x, y] = GLOW.get(px[x, y], px[x, y])
        reduced.append(g)

    sheet = Image.new("RGBA", (tw * len(reduced), th), (0, 0, 0, 0))
    for i, f in enumerate(reduced):
        sheet.paste(to_rgba(f), (i * tw, 0))
    sheet.save(OUT / f"{key}.png")

    for name, (fr, _, _) in spec["anims"].items():
        bad = [i for i in fr if i >= len(reduced)]
        if bad:
            sys.exit(f"{key}: la animación '{name}' usa fotogramas inexistentes {bad} (hay {len(reduced)})")
    print(f"{key}.png  {len(reduced)} fotogramas de {tw}×{th}")
    return sheet, {
        "file": f"{key}.png",
        "frameWidth": tw,
        "frameHeight": th,
        "frames": len(reduced),
        "mira": spec.get("mira"),
        "anims": {n: {"frames": fr, "fps": fps, "repeat": rep} for n, (fr, fps, rep) in spec["anims"].items()},
    }


def main():
    preview = Path(sys.argv[sys.argv.index("--preview") + 1]) if "--preview" in sys.argv else None
    manifest = {}
    for key, spec in SHEETS.items():
        sheet, manifest[key] = build(key, spec)
        if preview:
            preview.mkdir(parents=True, exist_ok=True)
            big = Image.new("RGBA", sheet.size, (31, 39, 64, 255))
            big.alpha_composite(sheet)
            big.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(preview / f"{key}.png")
    (OUT / "sprites.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print("sprites.json")


if __name__ == "__main__":
    main()
