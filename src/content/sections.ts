// Divide el cuerpo de una ficha por sus encabezados (§8.1): `## ★`, `## ★★`, `## ★★★`, `## Registro`.

export interface Secciones {
  /** Markdown de los niveles ★, ★★ y ★★★ (índices 0, 1, 2). */
  niveles: [string, string, string];
  registro: string;
}

const HEADING = /^##\s+(★{1,3}|Registro)\s*$/;

export function splitSections(cuerpo: string): Secciones {
  const out: Secciones = { niveles: ['', '', ''], registro: '' };
  let current: { set: (s: string) => void; lines: string[] } | null = null;
  const flush = () => current?.set(current.lines.join('\n').trim());

  for (const line of cuerpo.split(/\r?\n/)) {
    const m = HEADING.exec(line);
    if (!m) {
      current?.lines.push(line);
      continue;
    }
    flush();
    const key = m[1];
    current = {
      lines: [],
      set: key === 'Registro' ? (s) => (out.registro = s) : (s) => (out.niveles[key.length - 1] = s),
    };
  }
  flush();
  return out;
}

/** true si la sección no tiene contenido visible (solo espacios o comentarios HTML). */
export function isEmptySection(md: string): boolean {
  return md.replace(/<!--[\s\S]*?-->/g, '').trim() === '';
}
