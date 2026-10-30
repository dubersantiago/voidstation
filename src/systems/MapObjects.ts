// Objetos de un mapa de sector (Tiled). Convención de capas:
// - `objetos`: punto `inicio`; puntos type `entrada` (name `desde-<sector>`); rectángulos type
//   `compuerta` (props `destino`, `entrada`); puntos type `terminal` (prop `registro`);
//   punto type `baliza`; puntos type `luz` (prop `radio`, px).
// - `zonas`: rectángulos de aparición; name = id de criatura (puede repetirse: un individuo por
//   zona) o vacío para zona genérica.
// - `puntos`: puntos con name = id de criatura, para `fase` y `patrulla` (en orden de creación).
import * as Phaser from 'phaser';

export interface Gate {
  rect: Phaser.Geom.Rectangle;
  destino: string;
  entrada: string;
}

export interface Terminal {
  x: number;
  y: number;
  registro: string;
}

export interface MapLight {
  x: number;
  y: number;
  radio: number;
}

export interface MapZone {
  name: string;
  rect: Phaser.Geom.Rectangle;
}

export interface SectorObjects {
  spawns: Map<string, { x: number; y: number }>;
  gates: Gate[];
  terminals: Terminal[];
  baliza: { x: number; y: number } | null;
  lights: MapLight[];
  zones: MapZone[];
  points: Map<string, { x: number; y: number }[]>;
}

type TiledObject = Phaser.Types.Tilemaps.TiledObject;

/** Phaser deja las propiedades de Tiled como array `{ name, value }` (o como objeto en formatos antiguos). */
function prop(o: TiledObject, name: string): unknown {
  const p: unknown = o.properties;
  if (Array.isArray(p)) return (p as { name: string; value: unknown }[]).find((x) => x.name === name)?.value;
  if (p && typeof p === 'object') return (p as Record<string, unknown>)[name];
  return undefined;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function readSectorObjects(map: Phaser.Tilemaps.Tilemap): SectorObjects {
  const out: SectorObjects = { spawns: new Map(), gates: [], terminals: [], baliza: null, lights: [], zones: [], points: new Map() };

  for (const o of map.getObjectLayer('objetos')?.objects ?? []) {
    const x = o.x ?? 0;
    const y = o.y ?? 0;
    switch (o.type) {
      case 'compuerta':
        out.gates.push({
          rect: new Phaser.Geom.Rectangle(x, y, o.width ?? 0, o.height ?? 0),
          destino: str(prop(o, 'destino')),
          entrada: str(prop(o, 'entrada')),
        });
        break;
      case 'terminal':
        out.terminals.push({ x, y, registro: str(prop(o, 'registro')) });
        break;
      case 'baliza':
        out.baliza = { x, y };
        // También es punto de aparición: al seguir explorando tras el final se vuelve aquí.
        out.spawns.set('baliza', { x, y: y + 24 });
        break;
      case 'luz':
        out.lights.push({ x, y, radio: Number(prop(o, 'radio')) || 32 });
        break;
      default:
        if (o.name) out.spawns.set(o.name, { x, y });
    }
  }

  for (const o of map.getObjectLayer('zonas')?.objects ?? []) {
    out.zones.push({ name: o.name ?? '', rect: new Phaser.Geom.Rectangle(o.x ?? 0, o.y ?? 0, o.width ?? 0, o.height ?? 0) });
  }

  const puntos = [...(map.getObjectLayer('puntos')?.objects ?? [])].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  for (const o of puntos) {
    if (!o.name) continue;
    const list = out.points.get(o.name) ?? [];
    list.push({ x: o.x ?? 0, y: o.y ?? 0 });
    out.points.set(o.name, list);
  }
  return out;
}
