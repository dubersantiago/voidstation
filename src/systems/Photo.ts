// Puntuación de una foto (§4).
import type * as Phaser from 'phaser';
import { PHOTO_MIN_FRAMING } from '../config';
import type { Creature } from '../entities/Creature';
import { inFlashlight, type LightSource } from './Lighting';

export interface PhotoScore {
  creature: Creature;
  /** Fracción del hitbox dentro del marco (0–1). */
  encuadre: number;
  distancia: number;
  enRango: boolean;
  iluminada: boolean;
  momento: boolean;
  /** 0 = no cuenta; 1–3 ★. */
  estrellas: number;
}

/** Fracción del área de `inner` que cae dentro de `outer`. */
function overlapFraction(inner: Phaser.Geom.Rectangle, outer: Phaser.Geom.Rectangle): number {
  const w = Math.min(inner.right, outer.right) - Math.max(inner.left, outer.left);
  const h = Math.min(inner.bottom, outer.bottom) - Math.max(inner.top, outer.top);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / (inner.width * inner.height);
}

/**
 * Encuadre ≥ 60 % → 1 ★ (requisito).
 * Dentro del rango ideal e iluminada (linterna o luz propia) → +1 ★.
 * En su estado fotogénico → +1 ★.
 */
export function scoreCreature(creature: Creature, frame: Phaser.Geom.Rectangle, light: LightSource): PhotoScore {
  // Las señales no identificadas y lo que está fuera del mundo (fase) no se pueden fotografiar.
  const encuadre = creature.isSignal || !creature.visible ? 0 : overlapFraction(creature.rect, frame);
  const distancia = Math.hypot(creature.centerX - light.x, creature.centerY - light.y);
  const [min, max] = creature.datos.rango_ideal;
  const enRango = distancia >= min && distancia <= max;
  const iluminada = creature.datos.luz_propia || inFlashlight(light, creature.centerX, creature.centerY);
  const momento = creature.fotogenico;

  const estrellas = encuadre >= PHOTO_MIN_FRAMING ? 1 + Number(enRango && iluminada) + Number(momento) : 0;
  return { creature, encuadre, distancia, enRango, iluminada, momento, estrellas };
}
