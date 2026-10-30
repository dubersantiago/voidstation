// Constantes del motor (§9). Ningún dato del homelab va aquí: eso vive en content/.

/** Resolución interna (§9.1). */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Tamaño de tile (§9.1). */
export const TILE_SIZE = 16;

/** Velocidad del jugador en px/s a resolución interna. */
export const PLAYER_SPEED = 80;

/**
 * Zona muerta de la cámara (px, centrada en pantalla). Dentro de ella el jugador se mueve sin
 * desplazar la cámara; al salir, la cámara lo empuja en píxeles enteros, sin lerp, para que el
 * jugador nunca oscile 1 px respecto al fondo (§9.1).
 */
export const CAMERA_DEADZONE = { width: 48, height: 32 } as const;

/** Desplazamiento máximo de la cámara por frame (px enteros), para transiciones suaves sin subpíxel. */
export const CAMERA_PAN_STEP = 4;

// --- Fotografía (§4) ---

/** Marco central del visor. También es el tamaño de la miniatura del álbum (máx. 160×90). */
export const PHOTO_FRAME = { width: 160, height: 90 } as const;

/** Fracción mínima del hitbox dentro del marco para que la foto cuente (1 ★). */
export const PHOTO_MIN_FRAMING = 0.6;

/** Segundos mínimos entre fotos. */
export const PHOTO_COOLDOWN = 0.5;

/** En modo cámara el jugador camina a esta fracción de su velocidad. */
export const CAMERA_MODE_SPEED_FACTOR = 0.5;

/**
 * Al apuntar, el centro del marco queda a esta distancia (px, por eje) del centro del jugador.
 * Con 96 el marco cubre de 16 a 176 px por delante en horizontal y de 51 a 141 en vertical:
 * los `rango_ideal` del contenido deberían caer ahí.
 */
export const CAMERA_AIM_DISTANCE = 96;

/** Linterna: alcance (px) y semiapertura del cono (grados). */
export const FLASHLIGHT = { range: 160, halfAngle: 35 } as const;

/** Ciclo del estado fotogénico (§8.3), en segundos: [mín, máx]. */
export const PHOTOGENIC = { interval: [8, 16], duration: [2, 4] } as const;

/** Huida (§4): segundos que dura y velocidad (px/s). */
export const FLEE = { duration: 1.5, speed: 60 } as const;

/** Shift (§12): velocidad al caminar sigiloso. Sigiloso no asusta a las criaturas. */
export const SNEAK_SPEED_FACTOR = 0.5;

/** Distancia (px) para interactuar con terminales y la baliza (E). */
export const INTERACT_RADIUS = 28;

/** Distancia (px) a la que una señal no identificada se anuncia (§7). */
export const SIGNAL_NOTICE_RADIUS = 48;

/** Radio (px) de la luz tenue alrededor del jugador, siempre encendida (§9.5). */
export const PLAYER_LIGHT_RADIUS = 24;

/** Radio (px) de la luz de criaturas con `luz_propia` y de la baliza activa. */
export const CREATURE_LIGHT_RADIUS = 32;

/** Clave de guardado en localStorage. Cambiar la versión invalida partidas incompatibles. */
export const SAVE_KEY = 'voidstation:save:v1';

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
