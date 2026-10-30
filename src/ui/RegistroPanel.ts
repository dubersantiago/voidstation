// Lectura de un registro (terminal o monolito, §1): título y Markdown, texto seleccionable.
import type { Registro } from '../content';
import { renderMarkdown } from './markdown';
import { el, uiRoot } from './overlay';

const SCROLL_STEP = 64;

export class RegistroPanel {
  private readonly root: HTMLDivElement;
  private readonly title: HTMLSpanElement;
  private readonly body: HTMLDivElement;
  private onClose: (() => void) | null = null;

  constructor() {
    // Mismo marco que el bestiario (§9.6).
    this.root = el('div', 'bestiary registro hidden', uiRoot());
    const head = el('div', 'bestiary-head', this.root);
    this.title = el('span', 'title', head);
    el('span', 'keys', head).textContent = 'RE/AV PÁG DESPLAZAR · E / ESC CERRAR';
    this.body = el('div', 'bestiary-ficha', this.root);
  }

  open(registro: Registro, onClose: () => void): void {
    this.onClose = onClose;
    this.title.textContent = registro.titulo.toUpperCase();
    this.body.replaceChildren();
    renderMarkdown(this.body, registro.cuerpo);
    this.body.scrollTop = 0;
    this.root.classList.remove('hidden');
    window.addEventListener('keydown', this.onKey);
  }

  close(): void {
    this.root.classList.add('hidden');
    window.removeEventListener('keydown', this.onKey);
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Escape' || e.code === 'KeyE') this.close();
    else if (e.code === 'PageDown' || e.code === 'ArrowDown') this.body.scrollTop += SCROLL_STEP;
    else if (e.code === 'PageUp' || e.code === 'ArrowUp') this.body.scrollTop -= SCROLL_STEP;
    else return;
    e.preventDefault();
  };
}
