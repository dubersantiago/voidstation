// Plugin de Vite: expone content/ como módulo virtual y aplica el filtro público/privado (§13).
// En el build público los bloques <!-- privado --> y las criaturas con `publico: false` se eliminan
// aquí, en Node: nunca llegan al bundle de dist/.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { stringify } from 'yaml';
import { splitFrontmatter, UNKNOWN } from '../src/content/schema.ts';

const VIRTUAL_ID = 'virtual:voidstation-content';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const PRIVATE_BLOCK = /<!--\s*privado\s*-->[\s\S]*?<!--\s*\/privado\s*-->/g;

export interface ContentBundle {
  sectoresRaw: string;
  /** Ruta (`/content/bestiario/<id>.md`) → texto ya filtrado. */
  archivos: Record<string, string>;
  /** Ruta (`/content/registros/<id>.md`) → texto ya filtrado. */
  registros: Record<string, string>;
}

/** Registros (terminales, monolitos): sin bloques privados y sin los `publico: false`. */
function buildRegistros(contentDir: string, incluirPrivado: boolean): Record<string, string> {
  const dir = join(contentDir, 'registros');
  if (!existsSync(dir)) return {};
  const out: Record<string, string> = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const raw = readFileSync(join(dir, f), 'utf8');
    if (!incluirPrivado) {
      let meta: unknown;
      try {
        meta = splitFrontmatter(raw)?.meta;
      } catch {
        meta = null;
      }
      if (typeof meta === 'object' && meta !== null && (meta as Record<string, unknown>).publico === false) continue;
    }
    out[`/content/registros/${f}`] = incluirPrivado ? raw : raw.replace(PRIVATE_BLOCK, '');
  }
  return out;
}

/** Lee content/ y, si `incluirPrivado` es false, elimina todo lo privado. */
export function buildContent(contentDir: string, incluirPrivado: boolean): ContentBundle {
  const sectoresRaw = readFileSync(join(contentDir, 'sectores.yaml'), 'utf8');
  const dir = join(contentDir, 'bestiario');
  const raws = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ id: basename(f, '.md'), raw: readFileSync(join(dir, f), 'utf8') }));

  const registros = buildRegistros(contentDir, incluirPrivado);
  if (incluirPrivado) {
    return { sectoresRaw, registros, archivos: Object.fromEntries(raws.map((r) => [`/content/bestiario/${r.id}.md`, r.raw])) };
  }

  const parsed = raws.map((r) => {
    try {
      return { ...r, split: splitFrontmatter(r.raw) };
    } catch {
      return { ...r, split: null }; // YAML inválido: validate-content lo reporta; aquí solo se filtra el texto
    }
  });
  const isMeta = (m: unknown): m is Record<string, unknown> => typeof m === 'object' && m !== null && !Array.isArray(m);
  const ocultas = new Set(parsed.filter((p) => isMeta(p.split?.meta) && p.split.meta.publico === false).map((p) => p.id));

  const archivos: Record<string, string> = {};
  for (const p of parsed) {
    if (ocultas.has(p.id)) continue;
    if (!p.split || !isMeta(p.split.meta)) {
      archivos[`/content/bestiario/${p.id}.md`] = p.raw.replace(PRIVATE_BLOCK, '');
      continue;
    }

    // Las referencias a criaturas ocultas también se quitan: ni su id llega al bundle.
    const meta = { ...p.split.meta };
    if (Array.isArray(meta.relaciones)) meta.relaciones = meta.relaciones.filter((r) => !ocultas.has(String(r)));
    if (typeof meta.host === 'string' && ocultas.has(meta.host)) meta.host = UNKNOWN;

    archivos[`/content/bestiario/${p.id}.md`] = `---\n${stringify(meta)}---\n${p.split.cuerpo.replace(PRIVATE_BLOCK, '')}`;
  }
  return { sectoresRaw, archivos, registros };
}

/**
 * `vite build` → público. `vite build --mode private` → todo. `vite` (dev, uso local) → todo.
 * En dev, cualquier cambio en content/ recarga la página.
 */
export function contentPlugin(): Plugin {
  let contentDir = '';
  let incluirPrivado = false;

  return {
    name: 'voidstation-content',
    configResolved(config) {
      contentDir = resolve(config.root, 'content');
      incluirPrivado = config.command === 'serve' || config.mode === 'private';
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const { sectoresRaw, archivos, registros } = buildContent(contentDir, incluirPrivado);
      return [
        `export const sectoresRaw = ${JSON.stringify(sectoresRaw)};`,
        `export const archivos = ${JSON.stringify(archivos)};`,
        `export const registros = ${JSON.stringify(registros)};`,
        `export const incluyePrivado = ${incluirPrivado};`,
      ].join('\n');
    },
    configureServer(server) {
      server.watcher.add(contentDir);
      const reload = (file: string) => {
        if (!file.startsWith(contentDir)) return;
        const graph = server.environments.client.moduleGraph;
        const mod = graph.getModuleById(RESOLVED_ID);
        if (mod) graph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('change', reload);
      server.watcher.on('unlink', reload);
    },
  };
}
