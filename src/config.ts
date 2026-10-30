// Constantes del motor (§9). Ningún dato del homelab va aquí: eso vive en content/.

/** Resolución interna (§9.1). */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Tamaño de tile (§9.1). */
export const TILE_SIZE = 16;

/** Paleta única del juego (§9.2). No usar colores fuera de esta tabla. */
export const PALETTE = {
  void0: 0x07070d,
  void1: 0x0d0f1a,
  void2: 0x151a2b,
  void3: 0x1f2740,
  void4: 0x2c3a56,

  metal0: 0x3b4a63,
  metal1: 0x56677f,
  metal2: 0x7d8ca3,
  metal3: 0xa9b5c6,

  rust0: 0x3a1f1d,
  rust1: 0x6b2f24,
  rust2: 0xa14a2b,
  rust3: 0xd0773a,

  bio0: 0x0f3d3a,
  bio1: 0x1f7a6c,
  bio2: 0x3fd1b0,
  bio3: 0xa6ffe4,

  amber0: 0x4a2a12,
  amber1: 0x8a5a1c,
  amber2: 0xe0a43a,
  amber3: 0xffe08a,

  alert0: 0x7a1022,
  alert1: 0xd9304a,

  text: 0xe8e4d8,
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Convierte un color de la paleta a cadena CSS (#rrggbb), para Text y overlays HTML. */
export function css(key: PaletteKey): string {
  return `#${PALETTE[key].toString(16).padStart(6, '0')}`;
}
