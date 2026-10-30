// Genera los PNG placeholder (§9.7) sin dependencias: tileset de la estación y jugador.
// Uso: npm run gen:placeholders
// Solo usa colores de la paleta (§9.2). El arte final los reemplaza con las mismas claves y tamaños.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { PALETTE, TILE_SIZE, type PaletteKey } from '../src/config.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Lienzo RGBA mínimo. */
class Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  // Sin parameter properties: Node ejecuta este .ts con type stripping y no las admite.
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  px(x: number, y: number, color: PaletteKey): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const c = PALETTE[color];
    const i = (y * this.width + x) * 4;
    this.data[i] = (c >> 16) & 0xff;
    this.data[i + 1] = (c >> 8) & 0xff;
    this.data[i + 2] = c & 0xff;
    this.data[i + 3] = 0xff;
  }

  rect(x: number, y: number, w: number, h: number, color: PaletteKey): void {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) this.px(i, j, color);
    }
  }

  toPng(): Buffer {
    const raw = Buffer.alloc((this.width * 4 + 1) * this.height);
    for (let y = 0; y < this.height; y++) {
      const row = y * (this.width * 4 + 1);
      raw[row] = 0; // filtro None
      raw.set(this.data.subarray(y * this.width * 4, (y + 1) * this.width * 4), row + 1);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8; // bits por canal
    ihdr[9] = 6; // RGBA

    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

function chunk(type: string, body: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** Dibuja un tile en coordenadas locales 0..15. */
type TilePainter = (px: (x: number, y: number, c: PaletteKey) => void, rect: (x: number, y: number, w: number, h: number, c: PaletteKey) => void) => void;

// El orden define el id del tile en Tiled (0-based). No reordenar sin regenerar los mapas.
const TILES: { name: string; paint: TilePainter }[] = [
  {
    name: 'suelo',
    paint: (px, rect) => {
      rect(0, 0, 16, 16, 'void2');
      rect(0, 15, 16, 1, 'void1');
      rect(15, 0, 1, 16, 'void1');
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) px(x, y, 'metal0');
    },
  },
  {
    name: 'rejilla',
    paint: (_px, rect) => {
      rect(0, 0, 16, 16, 'void1');
      for (const y of [1, 4, 7, 10, 13]) rect(1, y, 14, 1, 'void3');
    },
  },
  {
    name: 'pista',
    paint: (px, rect) => {
      rect(0, 0, 16, 16, 'void1');
      for (const y of [1, 4, 10, 13]) rect(1, y, 14, 1, 'void3');
      for (const [x, y] of [[7, 6], [8, 6], [6, 7], [9, 7], [6, 8], [9, 8], [7, 9], [8, 9]]) px(x, y, 'amber1');
      rect(7, 7, 2, 2, 'amber2');
      px(7, 7, 'amber3');
    },
  },
  {
    name: 'franja',
    paint: (px) => {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) px(x, y, (x + y) % 8 < 4 ? 'rust2' : 'void1');
      }
    },
  },
  {
    name: 'pared',
    paint: (_px, rect) => {
      rect(0, 0, 16, 16, 'metal0');
      rect(0, 0, 16, 1, 'metal1');
      rect(0, 15, 16, 1, 'void3');
      rect(15, 0, 1, 16, 'void3');
    },
  },
  {
    name: 'pared_frente',
    paint: (_px, rect) => {
      rect(0, 0, 16, 16, 'metal1');
      rect(0, 0, 16, 1, 'metal2');
      rect(0, 14, 16, 2, 'metal0');
      rect(7, 1, 1, 13, 'metal0');
      rect(11, 6, 1, 5, 'rust1');
    },
  },
  {
    name: 'ventanal',
    paint: (px, rect) => {
      rect(0, 0, 16, 16, 'void0');
      rect(0, 0, 16, 1, 'metal1');
      rect(0, 15, 16, 1, 'metal0');
      px(4, 5, 'metal3');
      px(11, 9, 'bio3');
      px(7, 12, 'void4');
      px(13, 3, 'metal2');
    },
  },
  {
    name: 'compuerta',
    paint: (px, rect) => {
      rect(0, 0, 16, 16, 'metal1');
      for (let x = 0; x < 16; x++) {
        const c: PaletteKey = x % 4 < 2 ? 'rust2' : 'void1';
        rect(x, 0, 1, 2, c);
        rect(x, 14, 1, 2, c);
      }
      rect(7, 2, 2, 12, 'void0');
      px(12, 4, 'alert1');
    },
  },
  {
    name: 'caja',
    paint: (px, rect) => {
      rect(0, 0, 16, 16, 'rust1');
      rect(1, 1, 14, 1, 'rust2');
      for (let i = 0; i < 16; i++) {
        px(i, 0, 'rust0');
        px(i, 15, 'rust0');
        px(0, i, 'rust0');
        px(15, i, 'rust0');
      }
      for (let i = 2; i < 14; i++) {
        px(i, i, 'rust0');
        px(15 - i, i, 'rust0');
      }
    },
  },
];

const TILESET_COLUMNS = 3;

function buildTileset(): Canvas {
  const rows = Math.ceil(TILES.length / TILESET_COLUMNS);
  const canvas = new Canvas(TILESET_COLUMNS * TILE_SIZE, rows * TILE_SIZE);

  TILES.forEach((tile, id) => {
    const ox = (id % TILESET_COLUMNS) * TILE_SIZE;
    const oy = Math.floor(id / TILESET_COLUMNS) * TILE_SIZE;
    tile.paint(
      (x, y, c) => canvas.px(ox + x, oy + y, c),
      (x, y, w, h, c) => canvas.rect(ox + x, oy + y, w, h, c),
    );
  });

  return canvas;
}

/** Jugador 16×24 (§9.3): fotógrafo de campo con casco y cámara. */
function buildPlayer(): Canvas {
  const c = new Canvas(16, 24);
  c.rect(5, 1, 6, 1, 'metal3'); // casco
  c.rect(4, 2, 8, 6, 'metal3');
  c.rect(5, 4, 6, 2, 'void1'); // visor
  c.px(6, 4, 'metal2');
  c.rect(4, 8, 8, 1, 'metal1'); // cuello
  c.rect(3, 9, 10, 8, 'metal2'); // traje
  c.rect(3, 16, 10, 1, 'metal1');
  c.rect(9, 11, 4, 3, 'rust3'); // cámara
  c.px(11, 12, 'void0');
  c.rect(4, 17, 3, 5, 'metal1'); // piernas
  c.rect(9, 17, 3, 5, 'metal1');
  c.rect(4, 22, 3, 2, 'void4'); // botas
  c.rect(9, 22, 3, 2, 'void4');
  return c;
}

function write(relPath: string, canvas: Canvas): void {
  const out = resolve(ROOT, relPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, canvas.toPng());
  console.log(`${relPath} (${canvas.width}×${canvas.height})`);
}

write('public/assets/tilesets/estacion-placeholder.png', buildTileset());
write('public/assets/sprites/jugador-placeholder.png', buildPlayer());
console.log(`tiles: ${TILES.map((t, i) => `${i}=${t.name}`).join(' ')}`);
