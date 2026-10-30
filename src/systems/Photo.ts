// Puntuación de una foto (§4).
import type * as Phaser from 'phaser';
import { PHOTO_MIN_FRAMING } from '../config';
import type { Creature } from '../entities/Creature';
import { inFlashlight, type LightSource } from './Lighting';

export interface PhotoScore {
  creature: Creature;
  /** Fracción encuadrada (0–1), ver `framingFraction`. */
  encuadre: number;
  distancia: number;
  enRango: boolean;
  iluminada: boolean;
  momento: boolean;
  /** 0 = no cuenta; 1–3 ★. */
  estrellas: number;
}

/**
 * Fracción encuadrada: área de `hitbox` dentro de `frame`, dividida por la parte del hitbox que
 * podría caber en el marco. Así una criatura más grande que el marco (el Gusano, un Titán) cuenta
 * entera cuando la llena, en vez de exigir centrarla al píxel.
 */
function framingFraction(hitbox: Phaser.Geom.Rectangle, frame: Phaser.Geom.Rectangle): number {
  const w = Math.min(hitbox.right, frame.right) - Math.max(hitbox.left, frame.left);
  const h = Math.min(hitbox.bottom, frame.bottom) - Math.max(hitbox.top, frame.top);
  if (w <= 0 || h <= 0) return 0;
  const fits = Math.min(hitbox.width, frame.width) * Math.min(hitbox.height, frame.height);
  return Math.min(1, (w * h) / fits);
}

/**
 * Encuadre ≥ 60 % → 1 ★ (requisito).
 * Dentro del rango ideal e iluminada (linterna o luz propia) → +1 ★.
 * En su estado fotogénico → +1 ★.
 */
export function scoreCreature(creature: Creature, frame: Phaser.Geom.Rectangle, light: LightSource): PhotoScore {
  // Las señales no identificadas y lo que está fuera del mundo (fase) no se pueden fotografiar.
  const encuadre = creature.isSignal || !creature.visible ? 0 : framingFraction(creature.rect, frame);
  const distancia = Math.hypot(creature.centerX - light.x, creature.centerY - light.y);
  const [min, max] = creature.datos.rango_ideal;
  const enRango = distancia >= min && distancia <= max;
  const iluminada = creature.datos.luz_propia || inFlashlight(light, creature.centerX, creature.centerY);
  const momento = creature.fotogenico;

  const estrellas = encuadre >= PHOTO_MIN_FRAMING ? 1 + Number(enRango && iluminada) + Number(momento) : 0;
  return { creature, encuadre, distancia, enRango, iluminada, momento, estrellas };
}
