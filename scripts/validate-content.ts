// Valida content/ y los mapas (§8.4). Uso: npm run validate-content
// Falla (exit 1) si hay errores. Los sprites que faltan solo avisan: el juego usa placeholder.
// Además comprueba que el censo se puede completar: simula la apertura de compuertas por fotos.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Criatura, loadContent, type Problema, type Sector } from '../src/content/schema.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = join(ROOT, 'public/assets/sprites');
const MAPS = join(ROOT, 'public/assets/maps');

function readDir(rel: string): Record<string, string> {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => [`${rel}/${f}`, readFileSync(join(dir, f), 'utf8')]),
  );
}

const archivos = readDir('content/bestiario');
const registrosRaw = readDir('content/registros');
const { sectores, criaturas, registros, errores, avisos } = loadContent(
  readFileSync(join(ROOT, 'content/sectores.yaml'), 'utf8'),
  archivos,
  registrosRaw,
);

for (const c of criaturas) {
  if (!existsSync(join(SPRITES, `${c.sprite}.png`))) {
    avisos.push({ archivo: `content/bestiario/${c.id}.md`, mensaje: `sprite "${c.sprite}" no existe en public/assets/sprites/: se usa placeholder` });
  }
}

// --- Mapas ---

interface TiledObject {
  name?: string;
  type?: string;
  properties?: { name: string; value: unknown }[];
}
interface TiledLayer {
  name: string;
  type: string;
  objects?: TiledObject[];
}
interface MapInfo {
  gates: { destino: string; entrada: string }[];
  spawns: Set<string>;
  zoneNames: string[];
  hasBaliza: boolean;
}

const prop = (o: TiledObject, name: string) => o.properties?.find((p) => p.name === name)?.value;
const mapas = new Map<string, MapInfo>();

for (const s of sectores) {
  if (!s.mapa) continue;
  const archivo = `public/assets/maps/${s.mapa}`;
  const path = join(MAPS, s.mapa);
  if (!existsSync(path)) {
    errores.push({ archivo: 'content/sectores.yaml', mensaje: `mapa "${s.mapa}" del sector "${s.id}" no existe en public/assets/maps/` });
    continue;
  }
  let layers: TiledLayer[];
  try {
    layers = (JSON.parse(readFileSync(path, 'utf8')) as { layers: TiledLayer[] }).layers;
  } catch (e) {
    errores.push({ archivo, mensaje: `JSON inválido: ${(e as Error).message}` });
    continue;
  }
  for (const req of ['suelo', 'paredes', 'objetos']) {
    if (!layers.some((l) => l.name === req)) errores.push({ archivo, mensaje: `falta la capa "${req}"` });
  }
  const objs = (name: string) => layers.find((l) => l.name === name)?.objects ?? [];
  const objetos = objs('objetos');
  mapas.set(s.id, {
    gates: objetos.filter((o) => o.type === 'compuerta').map((o) => ({ destino: String(prop(o, 'destino') ?? ''), entrada: String(prop(o, 'entrada') ?? '') })),
    spawns: new Set([...objetos.filter((o) => o.name && o.type !== 'compuerta').map((o) => o.name!), ...(objetos.some((o) => o.type === 'baliza') ? ['baliza'] : [])]),
    zoneNames: objs('zonas').map((o) => o.name ?? ''),
    hasBaliza: objetos.some((o) => o.type === 'baliza'),
  });
  for (const o of objetos.filter((o) => o.type === 'terminal')) {
    const r = String(prop(o, 'registro') ?? '');
    if (!registros.some((x) => x.id === r)) errores.push({ archivo, mensaje: `terminal "${o.name}" apunta al registro "${r}", que no existe` });
  }
}

for (const [id, info] of mapas) {
  const archivo = `public/assets/maps/${sectores.find((s) => s.id === id)!.mapa}`;
  for (const g of info.gates) {
    const dest = mapas.get(g.destino);
    if (!sectores.some((s) => s.id === g.destino)) errores.push({ archivo, mensaje: `compuerta hacia "${g.destino}": el sector no existe` });
    else if (!dest) errores.push({ archivo, mensaje: `compuerta hacia "${g.destino}": el sector no tiene mapa` });
    else if (!dest.spawns.has(g.entrada)) errores.push({ archivo, mensaje: `compuerta hacia "${g.destino}": su mapa no tiene la entrada "${g.entrada}"` });
  }
  const ids = new Set(criaturas.filter((c) => c.sector === id).map((c) => c.id));
  for (const z of info.zoneNames) {
    if (z && !ids.has(z)) avisos.push({ archivo, mensaje: `zona "${z}" no corresponde a ninguna criatura del sector` });
  }
  for (const c of criaturas.filter((c) => c.sector === id)) {
    if (!info.zoneNames.includes(c.id) && !info.zoneNames.includes('')) {
      errores.push({ archivo, mensaje: `"${c.id}" no tiene zona propia ni hay zona genérica: no aparecerá` });
    }
  }
}
if (mapas.size && ![...mapas.values()].some((m) => m.hasBaliza)) {
  errores.push({ archivo: 'public/assets/maps', mensaje: 'ningún mapa tiene la baliza: el juego no se puede terminar' });
}

// --- ¿Se puede completar el censo? (§14, Fase 5) ---

/** Simula la partida: abre todo sector alcanzable cuya compuerta ya permiten las fotos acumuladas. */
function simulate(secs: Sector[], crs: Criatura[]): { abiertos: string[]; fotos: number; total: number } {
  const individuos = (sectorId: string) =>
    crs.filter((c) => c.sector === sectorId && c.estado === 'confirmado').reduce((n, c) => n + (c.individuos ?? 1), 0);
  const total = crs.filter((c) => c.estado === 'confirmado').reduce((n, c) => n + (c.individuos ?? 1), 0);
  const abiertos = new Set<string>(secs[0] ? [secs[0].id] : []);
  let fotos = 0;
  for (let changed = true; changed; ) {
    changed = false;
    fotos = [...abiertos].reduce((n, id) => n + individuos(id), 0);
    for (const id of [...abiertos]) {
      for (const g of mapas.get(id)?.gates ?? []) {
        const dest = secs.find((s) => s.id === g.destino);
        if (dest && !abiertos.has(dest.id) && mapas.has(dest.id) && fotos >= (dest.fotos_requeridas ?? 0)) {
          abiertos.add(dest.id);
          changed = true;
        }
      }
    }
  }
  return { abiertos: [...abiertos], fotos, total };
}

const sim = simulate(sectores, criaturas);
const cerrados = sectores.filter((s) => !sim.abiertos.includes(s.id)).map((s) => s.id);
if (sim.fotos < sim.total) {
  errores.push({
    archivo: 'content/sectores.yaml',
    mensaje: `el censo no se puede completar: alcanzables ${sim.fotos} / ${sim.total}. Sectores inaccesibles: ${cerrados.join(', ') || '—'}`,
  });
}

const print = (tipo: string, list: Problema[], log: (s: string) => void) => list.forEach((p) => log(`${tipo}  ${p.archivo}: ${p.mensaje}`));
print('AVISO', avisos, console.warn);
print('ERROR', errores, console.error);

console.log(`\nCenso: ${sim.fotos} / ${sim.total} individuos alcanzables · sectores abiertos en orden: ${sim.abiertos.join(' → ')}`);
console.log(
  `${sectores.length} sectores, ${criaturas.length}/${Object.keys(archivos).length} criaturas válidas, ` +
    `${registros.length}/${Object.keys(registrosRaw).length} registros, ${errores.length} errores, ${avisos.length} avisos.`,
);
process.exit(errores.length ? 1 : 0);
