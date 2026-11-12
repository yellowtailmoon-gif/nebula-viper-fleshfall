#!/usr/bin/env python3
"""Build PNG app icons from the embedded SHIRAYUKI artwork. No paid APIs."""
import base64
import io
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'icon.svg').read_text(encoding='utf-8')
match = re.search(r'data:image/webp;base64,([A-Za-z0-9+/=]+)', source)
if match is None:
    raise RuntimeError('SHIRAYUKI image is missing from icon.svg')
original = Image.open(io.BytesIO(base64.b64decode(match.group(1)))).convert('RGB')

def make(name, size, maskable=False):
    if maskable:
        pad = round(size * .115)
        output = Image.new('RGB', (size, size), '#061329')
        thumb = original.resize((size - 2 * pad, size - 2 * pad), Image.Resampling.LANCZOS)
        output.paste(thumb, (pad, pad))
    else:
        output = original.resize((size, size), Image.Resampling.LANCZOS)
    output.save(ROOT / name, format='PNG', optimize=True)
    print(f'{name}: {size}x{size} PNG')

make('favicon-32.png', 32)
make('apple-touch-icon.png', 180)
make('icon-192.png', 192)
make('icon-512.png', 512)
make('icon-maskable-512.png', 512, maskable=True)
