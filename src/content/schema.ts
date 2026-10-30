// Esquema y validación de content/ (§8). Lo usan el juego y scripts/validate-content.ts.
// Sin dependencias locales con import: Node lo ejecuta directo con type stripping.

import { parse as parseYaml } from 'yaml';

/** Valor que el contenido usa para "dato desconocido" (§2.2). */
export const UNKNOWN = '???';

/** Valor de `host` cuando no aplica (p. ej. el propio nodo físico). */
export const NOT_APPLICABLE = '-';

export const ESTADOS = ['confirmado', 'en_construccion', 'planeado'] as const;
export type Estado = (typeof ESTADOS)[number];

export const COMPORTAMIENTOS = ['inmovil', 'deambular', 'enjambre', 'flotar', 'patrulla', 'fase', 'dormido'] as const;
export type Comportamiento = (typeof COMPORTAMIENTOS)[number];

export interface Sector {
  id: string;
  nombre: string;
  /** Archivo .tmj en public/assets/maps/, o null si el sector aún no tiene mapa. */
  mapa: string | null;
  /** Número de fotos para abrir el sector, o null si es `???`. */
  fotos_requeridas: number | null;
}

export interface Criatura {
  id: string;
  nombre: string;
  especie: string;
  componente: string;
  sector: string;
  estado: Estado;
  /** null si es `???`: se dibuja 1 individuo. */
  individuos: number | null;
  sprite: string;
  hitbox: [number, number];
  comportamiento: Comportamiento;
  estado_fotogenico: string;
  rango_ideal: [number, number];
  radio_huida: number;
  host: string;
  relaciones: string[];
  publico: boolean;
  /** Opcional (por defecto false): la criatura emite luz y cuenta como iluminada sin linterna (§4). */
  luz_propia: boolean;
  /** Cuerpo Markdown sin procesar (secciones ★ / ★★ / ★★★ / Registro). */
  cuerpo: string;
}

/** Texto legible en una terminal o monolito (§1: decisiones, notas, comandos). */
export interface Registro {
  id: string;
  titulo: string;
  sector: string;
  publico: boolean;
  /** Cuerpo Markdown. */
  cuerpo: string;
}

export interface Problema {
  archivo: string;
  mensaje: string;
}

export interface Resultado<T> {
  datos: T[];
  errores: Problema[];
  avisos: Problema[];
}

/** Separa el frontmatter YAML (entre líneas `---`) del cuerpo Markdown. */
export function splitFrontmatter(raw: string): { meta: unknown; cuerpo: string } | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return null;
  return { meta: parseYaml(m[1]), cuerpo: m[2] };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0);

export function parseSectores(raw: string, archivo = 'content/sectores.yaml'): Resultado<Sector> {
  const res: Resultado<Sector> = { datos: [], errores: [], avisos: [] };
  let list: unknown;
  try {
    list = parseYaml(raw);
  } catch (e) {
    res.errores.push({ archivo, mensaje: `YAML inválido: ${(e as Error).message}` });
    return res;
  }
  if (!Array.isArray(list)) {
    res.errores.push({ archivo, mensaje: 'debe ser una lista de sectores' });
    return res;
  }

  const ids = new Set<string>();
  list.forEach((s, i) => {
    const where = `${archivo} [${i}]`;
    if (!isObj(s) || !isStr(s.id) || !isStr(s.nombre)) {
      res.errores.push({ archivo: where, mensaje: 'faltan `id` o `nombre`' });
      return;
    }
    if (ids.has(s.id)) res.errores.push({ archivo: where, mensaje: `id duplicado "${s.id}"` });
    ids.add(s.id);

    const mapa = isStr(s.mapa) && s.mapa !== UNKNOWN ? s.mapa : null;
    if (!mapa) res.avisos.push({ archivo: where, mensaje: `sector "${s.id}" sin mapa` });

    let fotos: number | null = null;
    if (typeof s.fotos_requeridas === 'number' && Number.isInteger(s.fotos_requeridas) && s.fotos_requeridas >= 0) {
      fotos = s.fotos_requeridas;
    } else if (s.fotos_requeridas === UNKNOWN) {
      res.avisos.push({ archivo: where, mensaje: `sector "${s.id}": fotos_requeridas = ${UNKNOWN}` });
    } else {
      res.errores.push({ archivo: where, mensaje: '`fotos_requeridas` debe ser entero ≥ 0 o ???' });
    }

    res.datos.push({ id: s.id, nombre: s.nombre, mapa, fotos_requeridas: fotos });
  });
  return res;
}

const CAMPOS_OBLIGATORIOS = [
  'id', 'nombre', 'especie', 'componente', 'sector', 'estado', 'individuos', 'sprite', 'hitbox',
  'comportamiento', 'estado_fotogenico', 'rango_ideal', 'radio_huida', 'host', 'relaciones', 'publico',
] as const;

/** Valida una criatura aislada. Las referencias cruzadas se revisan en `checkReferences`. */
export function parseCriatura(raw: string, archivo: string): { criatura: Criatura | null; errores: string[]; avisos: string[] } {
  const errores: string[] = [];
  const avisos: string[] = [];
  const fail = () => ({ criatura: null, errores, avisos });

  let split: ReturnType<typeof splitFrontmatter>;
  try {
    split = splitFrontmatter(raw);
  } catch (e) {
    errores.push(`frontmatter YAML inválido: ${(e as Error).message}`);
    return fail();
  }
  if (!split || !isObj(split.meta)) {
    errores.push('falta el frontmatter (bloque entre `---`)');
    return fail();
  }
  const m = split.meta;

  for (const campo of CAMPOS_OBLIGATORIOS) {
    if (!(campo in m) || m[campo] === null || m[campo] === '') errores.push(`falta el campo obligatorio \`${campo}\``);
  }
  if (errores.length) return fail();

  for (const campo of ['id', 'nombre', 'especie', 'componente', 'sector', 'sprite', 'estado_fotogenico', 'host'] as const) {
    if (!isStr(m[campo])) errores.push(`\`${campo}\` debe ser texto`);
  }
  const id = String(m.id);
  const esperado = archivo.replace(/^.*[\\/]/, '').replace(/\.md$/, '');
  if (id !== esperado) errores.push(`\`id\` ("${id}") no coincide con el nombre del archivo ("${esperado}")`);

  if (!ESTADOS.includes(m.estado as Estado)) errores.push(`\`estado\` debe ser uno de: ${ESTADOS.join(', ')}`);
  if (!COMPORTAMIENTOS.includes(m.comportamiento as Comportamiento)) {
    errores.push(`\`comportamiento\` debe ser uno de: ${COMPORTAMIENTOS.join(', ')}`);
  }

  let individuos: number | null = null;
  if (typeof m.individuos === 'number' && Number.isInteger(m.individuos) && m.individuos >= 1) individuos = m.individuos;
  else if (m.individuos === UNKNOWN) avisos.push(`individuos = ${UNKNOWN}: se dibuja 1`);
  else errores.push('`individuos` debe ser entero ≥ 1 o ???');

  if (!isPair(m.hitbox) || m.hitbox[0] < 1 || m.hitbox[1] < 1) errores.push('`hitbox` debe ser [ancho, alto] en px');
  if (!isPair(m.rango_ideal) || m.rango_ideal[0] > m.rango_ideal[1]) errores.push('`rango_ideal` debe ser [mín, máx] en px');
  if (typeof m.radio_huida !== 'number' || m.radio_huida < 0) errores.push('`radio_huida` debe ser un número ≥ 0');
  if (!Array.isArray(m.relaciones) || !m.relaciones.every(isStr)) errores.push('`relaciones` debe ser una lista de ids');
  if (typeof m.publico !== 'boolean') errores.push('`publico` debe ser true o false');
  if ('luz_propia' in m && typeof m.luz_propia !== 'boolean') errores.push('`luz_propia` debe ser true o false');

  if (errores.length) return fail();

  return {
    criatura: {
      id,
      nombre: m.nombre as string,
      especie: m.especie as string,
      componente: m.componente as string,
      sector: m.sector as string,
      estado: m.estado as Estado,
      individuos,
      sprite: m.sprite as string,
      hitbox: m.hitbox as [number, number],
      comportamiento: m.comportamiento as Comportamiento,
      estado_fotogenico: m.estado_fotogenico as string,
      rango_ideal: m.rango_ideal as [number, number],
      radio_huida: m.radio_huida as number,
      host: m.host as string,
      relaciones: m.relaciones as string[],
      publico: m.publico as boolean,
      luz_propia: m.luz_propia === true,
      cuerpo: split.cuerpo,
    },
    errores,
    avisos,
  };
}

export function parseRegistro(raw: string, archivo: string): { registro: Registro | null; errores: string[] } {
  const errores: string[] = [];
  let split: ReturnType<typeof splitFrontmatter>;
  try {
    split = splitFrontmatter(raw);
  } catch (e) {
    return { registro: null, errores: [`frontmatter YAML inválido: ${(e as Error).message}`] };
  }
  if (!split || !isObj(split.meta)) return { registro: null, errores: ['falta el frontmatter (bloque entre `---`)'] };
  const m = split.meta;

  for (const campo of ['id', 'titulo', 'sector'] as const) {
    if (!isStr(m[campo])) errores.push(`falta el campo obligatorio \`${campo}\` (texto)`);
  }
  if (typeof m.publico !== 'boolean') errores.push('`publico` debe ser true o false');
  const esperado = archivo.replace(/^.*[\\/]/, '').replace(/\.md$/, '');
  if (isStr(m.id) && m.id !== esperado) errores.push(`\`id\` ("${m.id}") no coincide con el nombre del archivo ("${esperado}")`);
  if (errores.length) return { registro: null, errores };

  return {
    registro: { id: m.id as string, titulo: m.titulo as string, sector: m.sector as string, publico: m.publico as boolean, cuerpo: split.cuerpo },
    errores,
  };
}

/**
 * Valida todo el contenido. `archivos` y `registrosRaw` mapean ruta → texto del .md.
 * Las criaturas y registros con errores no se incluyen.
 */
export function loadContent(
  sectoresRaw: string,
  archivos: Record<string, string>,
  registrosRaw: Record<string, string> = {},
): { sectores: Sector[]; criaturas: Criatura[]; registros: Registro[]; errores: Problema[]; avisos: Problema[] } {
  const sec = parseSectores(sectoresRaw);
  const errores = [...sec.errores];
  const avisos = [...sec.avisos];
  const sectorIds = new Set(sec.datos.map((s) => s.id));

  const registros: Registro[] = [];
  for (const [archivo, raw] of Object.entries(registrosRaw).sort(([a], [b]) => a.localeCompare(b))) {
    const r = parseRegistro(raw, archivo);
    errores.push(...r.errores.map((mensaje) => ({ archivo, mensaje })));
    if (!r.registro) continue;
    if (!sectorIds.has(r.registro.sector)) {
      errores.push({ archivo, mensaje: `sector "${r.registro.sector}" no existe en sectores.yaml` });
      continue;
    }
    registros.push(r.registro);
  }

  const candidatas: { archivo: string; c: Criatura }[] = [];
  for (const [archivo, raw] of Object.entries(archivos).sort(([a], [b]) => a.localeCompare(b))) {
    const r = parseCriatura(raw, archivo);
    errores.push(...r.errores.map((mensaje) => ({ archivo, mensaje })));
    avisos.push(...r.avisos.map((mensaje) => ({ archivo, mensaje })));
    if (r.criatura) candidatas.push({ archivo, c: r.criatura });
  }

  const ids = new Map<string, number>();
  for (const { c } of candidatas) ids.set(c.id, (ids.get(c.id) ?? 0) + 1);

  const criaturas: Criatura[] = [];
  for (const { archivo, c } of candidatas) {
    const propios: string[] = [];
    if (ids.get(c.id)! > 1) propios.push(`id duplicado "${c.id}"`);
    if (!sectorIds.has(c.sector)) propios.push(`sector "${c.sector}" no existe en sectores.yaml`);
    for (const rel of c.relaciones) {
      if (!ids.has(rel)) propios.push(`relación "${rel}" apunta a un id inexistente`);
    }
    if (c.host !== UNKNOWN && c.host !== NOT_APPLICABLE && !ids.has(c.host)) {
      propios.push(`host "${c.host}" apunta a un id inexistente (usa ??? si no se conoce, - si no aplica)`);
    }

    errores.push(...propios.map((mensaje) => ({ archivo, mensaje })));
    if (!propios.length) criaturas.push(c);
  }

  return { sectores: sec.datos, criaturas, registros, errores, avisos };
}
