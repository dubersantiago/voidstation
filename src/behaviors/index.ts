// Catálogo de comportamientos (§8.3): funciones reutilizables, no una clase por criatura.
import type * as Phaser from 'phaser';
import type { Comportamiento } from '../content';

/** Estado mínimo que mueve un comportamiento. (x, y) = centro del hitbox, en coordenadas fraccionarias. */
export interface Agent {
  x: number;
  y: number;
  /** Rectángulo donde puede estar el centro (zona del mapa menos medio hitbox). */
  readonly area: Phaser.Geom.Rectangle;
  readonly rng: Phaser.Math.RandomDataGenerator;
  /** Memoria propia del comportamiento. */
  readonly mem: Record<string, number>;
}

/** `dt` en segundos. */
export type Behavior = (a: Agent, dt: number) => void;

const WANDER_SPEED = 20; // px/s
const WANDER_PAUSE: [number, number] = [1, 3]; // s
const FLOAT_AMPLITUDE: [number, number] = [3, 6]; // px (x, y)
const FLOAT_PERIOD = 4; // s

const inmovil: Behavior = () => {};

/** Camina a un punto aleatorio de su área, se detiene un rato y repite. */
const deambular: Behavior = (a, dt) => {
  const m = a.mem;
  if (m.wait > 0) {
    m.wait -= dt;
    return;
  }
  if (m.tx === undefined) {
    m.tx = a.rng.realInRange(a.area.left, a.area.right);
    m.ty = a.rng.realInRange(a.area.top, a.area.bottom);
  }
  const dx = m.tx - a.x;
  const dy = m.ty - a.y;
  const dist = Math.hypot(dx, dy);
  const step = WANDER_SPEED * dt;
  if (dist <= step) {
    a.x = m.tx;
    a.y = m.ty;
    delete m.tx;
    delete m.ty;
    m.wait = a.rng.realInRange(...WANDER_PAUSE);
  } else {
    a.x += (dx / dist) * step;
    a.y += (dy / dist) * step;
  }
};

/** Oscila lento alrededor del punto donde apareció. */
const flotar: Behavior = (a, dt) => {
  const m = a.mem;
  if (m.ax === undefined) {
    m.ax = a.x;
    m.ay = a.y;
    m.t = a.rng.realInRange(0, FLOAT_PERIOD); // desfase para que no floten al unísono
  }
  m.t += dt;
  const w = (m.t / FLOAT_PERIOD) * Math.PI * 2;
  a.x = m.ax + Math.sin(w * 0.5) * FLOAT_AMPLITUDE[0];
  a.y = m.ay + Math.sin(w) * FLOAT_AMPLITUDE[1];
};

/** Implementados en la Fase 2. El resto llega en la Fase 5. */
const BEHAVIORS: Partial<Record<Comportamiento, Behavior>> = { inmovil, deambular, flotar };

const avisados = new Set<Comportamiento>();

/** Devuelve el comportamiento; si aún no existe, usa `inmovil` y avisa una vez. */
export function getBehavior(nombre: Comportamiento): Behavior {
  const b = BEHAVIORS[nombre];
  if (b) return b;
  if (!avisados.has(nombre)) {
    avisados.add(nombre);
    console.warn(`[behaviors] "${nombre}" aún no implementado: se usa "inmovil"`);
  }
  return inmovil;
}
