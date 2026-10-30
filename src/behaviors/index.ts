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
  /** Puntos del mapa (capa `puntos`) para `patrulla` y `fase`. Vacío = se usan puntos del área. */
  readonly points: readonly { x: number; y: number }[];
  /** Individuos de la misma especie en el sector (para `enjambre`). Incluye a este agente. */
  readonly group: readonly Agent[];
  /** true mientras no está en el mundo (`fase`): no se dibuja ni se puede fotografiar. */
  hidden: boolean;
}

/** `dt` en segundos. */
export type Behavior = (a: Agent, dt: number) => void;

const WANDER_SPEED = 20; // px/s
const WANDER_PAUSE: [number, number] = [1, 3]; // s
const FLOAT_AMPLITUDE: [number, number] = [3, 6]; // px (x, y)
const FLOAT_PERIOD = 4; // s
const SWARM = { speed: 24, separation: 14, turn: [1, 2] as [number, number] }; // px/s, px, s
const PHASE = { visible: [4, 7] as [number, number], hidden: 1 }; // s

function clampToArea(a: Agent): void {
  a.x = Math.min(a.area.right, Math.max(a.area.left, a.x));
  a.y = Math.min(a.area.bottom, Math.max(a.area.top, a.y));
}

/** Avanza hacia (tx, ty) a `speed` px/s. Devuelve true al llegar. */
function moveTo(a: Agent, tx: number, ty: number, speed: number, dt: number): boolean {
  const dx = tx - a.x;
  const dy = ty - a.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step) {
    a.x = tx;
    a.y = ty;
    return true;
  }
  a.x += (dx / dist) * step;
  a.y += (dy / dist) * step;
  return false;
}

const randomInArea = (a: Agent) => ({ x: a.rng.realInRange(a.area.left, a.area.right), y: a.rng.realInRange(a.area.top, a.area.bottom) });

const inmovil: Behavior = () => {};

/** Camina a un punto aleatorio de su área, se detiene un rato y repite. */
const deambular: Behavior = (a, dt) => {
  const m = a.mem;
  if (m.wait > 0) {
    m.wait -= dt;
    return;
  }
  if (m.tx === undefined) ({ x: m.tx, y: m.ty } = randomInArea(a));
  if (moveTo(a, m.tx, m.ty, WANDER_SPEED, dt)) {
    delete m.tx;
    delete m.ty;
    m.wait = a.rng.realInRange(...WANDER_PAUSE);
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

/** Boids simplificado (§8.3): rumbo propio que cambia cada poco, separación y cohesión con el grupo. */
const enjambre: Behavior = (a, dt) => {
  const m = a.mem;
  m.turn = (m.turn ?? 0) - dt;
  if (m.turn <= 0) {
    const ang = a.rng.realInRange(0, Math.PI * 2);
    m.hx = Math.cos(ang);
    m.hy = Math.sin(ang);
    m.turn = a.rng.realInRange(...SWARM.turn);
  }

  let vx = m.hx;
  let vy = m.hy;
  let cx = 0;
  let cy = 0;
  for (const o of a.group) {
    cx += o.x;
    cy += o.y;
    if (o === a) continue;
    const dx = a.x - o.x;
    const dy = a.y - o.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < SWARM.separation) {
      vx += (dx / d) * 1.5;
      vy += (dy / d) * 1.5;
    }
  }
  if (a.group.length > 1) {
    const n = a.group.length;
    const dx = cx / n - a.x;
    const dy = cy / n - a.y;
    const d = Math.hypot(dx, dy) || 1;
    vx += (dx / d) * 0.4;
    vy += (dy / d) * 0.4;
  }

  const len = Math.hypot(vx, vy) || 1;
  a.x += (vx / len) * SWARM.speed * dt;
  a.y += (vy / len) * SWARM.speed * dt;
  // Al chocar con el borde del área, rumbo nuevo.
  const before = { x: a.x, y: a.y };
  clampToArea(a);
  if (before.x !== a.x || before.y !== a.y) m.turn = 0;
};

/** Recorre sus puntos en orden (o las esquinas de su área) con una pausa breve en cada uno. */
const patrulla: Behavior = (a, dt) => {
  const m = a.mem;
  if (m.wait > 0) {
    m.wait -= dt;
    return;
  }
  const pts = a.points.length
    ? a.points
    : [
        { x: a.area.left, y: a.area.top },
        { x: a.area.right, y: a.area.top },
        { x: a.area.right, y: a.area.bottom },
        { x: a.area.left, y: a.area.bottom },
      ];
  m.i = (m.i ?? 0) % pts.length;
  if (moveTo(a, pts[m.i].x, pts[m.i].y, WANDER_SPEED, dt)) {
    m.i++;
    m.wait = 1;
  }
};

/** Desaparece y reaparece en el siguiente punto (o en otro sitio de su área). */
const fase: Behavior = (a, dt) => {
  const m = a.mem;
  if (m.t === undefined) m.t = a.rng.realInRange(...PHASE.visible);
  m.t -= dt;
  if (m.t > 0) return;

  if (!a.hidden) {
    a.hidden = true;
    m.t = PHASE.hidden;
    return;
  }
  m.i = ((m.i ?? 0) + 1) % Math.max(1, a.points.length);
  // Los puntos del mapa mandan sobre el área: la polilla "atraviesa el espacio" (§6.2).
  const p = a.points.length ? a.points[m.i] : randomInArea(a);
  a.x = p.x;
  a.y = p.y;
  a.hidden = false;
  m.t = a.rng.realInRange(...PHASE.visible);
};

/** Variante en construcción (§8.3): idle lento. El "despertar" lo gestiona el ciclo fotogénico. */
const dormido: Behavior = inmovil;

const BEHAVIORS: Record<Comportamiento, Behavior> = { inmovil, deambular, enjambre, flotar, patrulla, fase, dormido };

export function getBehavior(nombre: Comportamiento): Behavior {
  return BEHAVIORS[nombre];
}

/** Huida (§4): se aleja del jugador a `speed` px/s sin salir de su área. */
export function flee(a: Agent, fromX: number, fromY: number, speed: number, dt: number): void {
  const dx = a.x - fromX;
  const dy = a.y - fromY;
  const d = Math.hypot(dx, dy) || 1;
  a.x += (dx / d) * speed * dt;
  a.y += (dy / d) * speed * dt;
  clampToArea(a);
}
