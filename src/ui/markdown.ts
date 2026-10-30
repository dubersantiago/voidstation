// Markdown de content/ a HTML (§11), con botón COPIAR en cada bloque de código.
import { marked } from 'marked';
import { isEmptySection } from '../content/sections';
import { el } from './overlay';

const COPIED_MS = 1200;

export function renderMarkdown(parent: HTMLElement, md: string): void {
  if (isEmptySection(md)) {
    el('p', 'empty', parent).textContent = 'Sin datos todavía.';
    return;
  }
  // El contenido es propio (content/ del repo) y ya viene filtrado por el build: no es entrada de usuarios.
  const box = el('div', 'md', parent);
  box.innerHTML = marked.parse(md, { async: false, gfm: true });
  for (const pre of box.querySelectorAll('pre')) addCopyButton(pre);
}

function addCopyButton(pre: HTMLPreElement): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy';
  btn.textContent = 'COPIAR';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? pre.textContent ?? '');
      btn.textContent = 'COPIADO';
    } catch {
      btn.textContent = 'SELECCIONA Y COPIA';
    }
    window.setTimeout(() => (btn.textContent = 'COPIAR'), COPIED_MS);
  });
  pre.prepend(btn);
}
