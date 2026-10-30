// Contenido de content/, ya filtrado según el build (scripts/content-plugin.ts).
// Añadir un .md en content/bestiario/ basta para que la criatura exista.
import { archivos, incluyePrivado, sectoresRaw } from 'virtual:voidstation-content';
import { loadContent } from './schema';

const contenido = loadContent(sectoresRaw, archivos);

// El juego sigue aunque haya errores: las criaturas inválidas se omiten. `npm run validate-content` falla en esos casos.
for (const e of contenido.errores) console.error(`[content] ${e.archivo}: ${e.mensaje}`);

export const SECTORES = contenido.sectores;
export const CRIATURAS = contenido.criaturas;
/** true en dev y en `build:private`. */
export const INCLUYE_PRIVADO = incluyePrivado;

export type { Comportamiento, Criatura, Estado, Sector } from './schema';
