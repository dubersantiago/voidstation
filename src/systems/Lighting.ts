// Iluminación lógica (§4, §9.5). La Fase 5 añadirá la capa de oscuridad visible; aquí solo se
// decide si algo está iluminado, para la ★ de "distancia + luz".
import { FLASHLIGHT } from '../config';

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
