// Iluminación (§4, §9.5).
// - Lógica: `inFlashlight` decide si algo está iluminado para la ★ de "distancia + luz".
// - Visual: `LightingLayer` es una capa de oscuridad a pantalla completa con huecos de luz de
//   borde en dithering (Bayer 4×4), sin gradientes: todo píxel es oscuridad opaca o no hay nada.
import type * as Phaser from 'phaser';
import { FLASHLIGHT, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';

export interface LightSource {
  x: number;
  y: number;
  /** Dirección a la que apunta (no tiene que estar normalizada). */
  facing: { x: number; y: number };
  on: boolean;
}

/** true si el punto (x, y) cae dentro del cono de la linterna. */
export function inFlashlight(light: LightSource, x: number, y: number): boolean {
  if (!light.on) return false;
  const dx = x - light.x;
  const dy = y - light.y;
  const dist = Math.hypot(dx, dy);
  if (dist > FLASHLIGHT.range) return false;
  if (dist < 1) return true;

  const flen = Math.hypot(light.facing.x, light.facing.y) || 1;
  const cos = (dx * light.facing.x + dy * light.facing.y) / (dist * flen);
  return cos >= Math.cos((FLASHLIGHT.halfAngle * Math.PI) / 180);
}

/** Un hueco de luz en coordenadas del mundo: radial (`radio`) o el cono de la linterna. */
export type LightStamp = { x: number; y: number; radio: number } | { x: number; y: number; facing: { x: number; y: number } };

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
/** Fracción interior sin dithering (luz plena). */
const SOLID = 0.6;
/** Profundidad por encima del mundo (las criaturas usan su `y` como profundidad). */
const DARKNESS_DEPTH = 100_000;

/** Octante (0–7, sentido horario desde la derecha) de una dirección. */
function octant(f: { x: number; y: number }): number {
  return (Math.round(Math.atan2(f.y, f.x) / (Math.PI / 4)) + 8) % 8;
}

/** Píxel iluminado si `t` (0 = centro de la luz, 1 = borde) queda bajo el umbral de Bayer. */
function lit(t: number, x: number, y: number): boolean {
  return t < (BAYER[y & 3][x & 3] + 0.5) / 16;
}

export class LightingLayer {
  private readonly scene: Phaser.Scene;
  private readonly rt: Phaser.GameObjects.RenderTexture;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.rt = scene.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0).setScrollFactor(0).setDepth(DARKNESS_DEPTH);
  }

  /** Redibuja la oscuridad y recorta las luces. Llamar una vez por frame, tras mover la cámara. */
  draw(cam: Phaser.Cameras.Scene2D.Camera, stamps: LightStamp[]): void {
    this.rt.clear();
    this.rt.fill(PALETTE.void0, 1);
    for (const s of stamps) {
      const key = 'radio' in s ? this.radialTexture(Math.round(s.radio)) : this.coneTexture(octant(s.facing));
      // `erase` centra la textura (tamaño par): la esquina cae en píxel entero.
      this.rt.erase(key, Math.round(s.x - cam.scrollX), Math.round(s.y - cam.scrollY));
    }
    this.rt.render();
  }

  private radialTexture(r: number): string {
    const key = `luz-r${r}`;
    if (this.scene.textures.exists(key)) return key;
    this.paint(key, r * 2, (x, y) => {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
      if (d > r) return false;
      return lit(d < r * SOLID ? 0 : (d - r * SOLID) / (r * (1 - SOLID)), x, y);
    });
    return key;
  }

  private coneTexture(dir: number): string {
    const key = `luz-cono-${dir}`;
    if (this.scene.textures.exists(key)) return key;
    const R = FLASHLIGHT.range;
    const half = (FLASHLIGHT.halfAngle * Math.PI) / 180;
    const center = (dir * Math.PI) / 4;
    this.paint(key, R * 2, (x, y) => {
      const dx = x + 0.5 - R;
      const dy = y + 0.5 - R;
      const d = Math.hypot(dx, dy);
      if (d > R) return false;
      if (d < 6) return true;
      let da = Math.abs(Math.atan2(dy, dx) - center);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da > half) return false;
      const tDist = d < R * SOLID ? 0 : (d - R * SOLID) / (R * (1 - SOLID));
      const tAng = da < half * SOLID ? 0 : (da - half * SOLID) / (half * (1 - SOLID));
      return lit(Math.max(tDist, tAng), x, y);
    });
    return key;
  }

  /** Textura cuadrada `size`: opaca donde `on` es true (eso es lo que se borra de la oscuridad). */
  private paint(key: string, size: number, on: (x: number, y: number) => boolean): void {
    const tex = this.scene.textures.createCanvas(key, size, size);
    if (!tex) return;
    const img = tex.context.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (on(x, y)) img.data[(y * size + x) * 4 + 3] = 255;
      }
    }
    tex.context.putImageData(img, 0, 0);
    tex.refresh();
  }
}
