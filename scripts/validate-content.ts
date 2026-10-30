// Valida content/ (§8.4). Uso: npm run validate-content
// Falla (exit 1) si hay errores. Los sprites que faltan solo avisan: el juego usa placeholder.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from '../src/content/schema.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BESTIARIO = join(ROOT, 'content/bestiario');
const SPRITES = join(ROOT, 'public/assets/sprites');
const MAPS = join(ROOT, 'public/assets/maps');

const archivos: Record<string, string> = {};
for (const f of readdirSync(BESTIARIO).filter((f) => f.endsWith('.md'))) {
  archivos[`content/bestiario/${f}`] = readFileSync(join(BESTIARIO, f), 'utf8');
}

const { sectores, criaturas, errores, avisos } = loadContent(readFileSync(join(ROOT, 'content/sectores.yaml'), 'utf8'), archivos);

for (const c of criaturas) {
  if (!existsSync(join(SPRITES, `${c.sprite}.png`))) {
    avisos.push({ archivo: `content/bestiario/${c.id}.md`, mensaje: `sprite "${c.sprite}" no existe en public/assets/sprites/: se usa placeholder` });
  }
}
for (const s of sectores) {
  if (s.mapa && !existsSync(join(MAPS, s.mapa))) {
    errores.push({ archivo: 'content/sectores.yaml', mensaje: `mapa "${s.mapa}" del sector "${s.id}" no existe en public/assets/maps/` });
  }
}

for (const a of avisos) console.warn(`AVISO  ${a.archivo}: ${a.mensaje}`);
for (const e of errores) console.error(`ERROR  ${e.archivo}: ${e.mensaje}`);

const total = Object.keys(archivos).length;
console.log(`\n${sectores.length} sectores, ${criaturas.length}/${total} criaturas válidas, ${errores.length} errores, ${avisos.length} avisos.`);
process.exit(errores.length ? 1 : 0);
