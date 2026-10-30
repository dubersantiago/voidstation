// HUD: contador del objetivo (§3), sector, linterna, indicación de interacción y avisos.
import type { PhotoScore } from '../systems/Photo';
import type { Unlock } from '../systems/Progress';
import { el, uiRoot } from './overlay';

const TOAST_MS = 3500;

export function stars(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

export class Hud {
  private readonly root: HTMLDivElement;
  private readonly index: HTMLDivElement;
  private readonly light: HTMLDivElement;
  private readonly sector: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private toastTimer = 0;

  constructor() {
    this.root = el('div', 'hud', uiRoot());
    this.index = el('div', 'hud-index', this.root);
    this.light = el('div', 'hud-light', this.root);
    this.sector = el('div', 'hud-sector', this.root);
    this.prompt = el('div', 'hud-prompt hidden', this.root);
    el('div', 'hud-help', this.root).textContent =
      'C CÁMARA · ESPACIO FOTO · F LINTERNA · SHIFT SIGILO · E USAR · Q ÁLBUM · TAB BESTIARIO';
    this.toast = el('div', 'toast hidden', this.root);
  }

  setIndex(restaurados: number, total: number): void {
    this.index.textContent = `ÍNDICE RESTAURADO ${restaurados} / ${total}`;
  }

  setFlashlight(on: boolean): void {
    this.light.textContent = on ? 'LINTERNA ON' : 'LINTERNA OFF';
    this.light.classList.toggle('on', on);
  }

  setSector(nombre: string): void {
    this.sector.textContent = nombre.toUpperCase();
  }

  /** Indicación de interacción (p. ej. "E LEER"); null la oculta. */
  setPrompt(text: string | null): void {
    this.prompt.textContent = text ?? '';
    this.prompt.classList.toggle('hidden', !text);
  }

  /** Aviso de texto (una línea por elemento). */
  showMessage(...lines: string[]): void {
    this.toast.replaceChildren();
    for (const l of lines) el('div', '', this.toast).textContent = l;
    this.showToast();
  }

  /** Resultado de una foto: ★ por criatura y qué criterio de §4 se cumplió. */
  showPhoto(scores: PhotoScore[], desbloqueos: Unlock[]): void {
    this.toast.replaceChildren();
    const counted = scores.filter((s) => s.estrellas > 0);

    if (!counted.length) {
      this.toast.textContent = 'SIN SUJETO EN EL ENCUADRE';
    } else {
      for (const s of counted) {
        const line = el('div', '', this.toast);
        line.append(`${s.creature.datos.nombre}  `);
        el('span', 'stars', line).textContent = stars(s.estrellas);
        line.append('  ');
        criterio(line, 'ENCUADRE', true);
        criterio(line, 'DIST+LUZ', s.enRango && s.iluminada);
        criterio(line, 'MOMENTO', s.momento);
      }
      for (const d of desbloqueos) {
        el('div', 'new', this.toast).textContent = `FICHA DESBLOQUEADA: ${d.criatura.nombre} ${stars(d.estrellas)}`;
      }
    }

    this.showToast();
  }

  private showToast(): void {
    this.toast.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.add('hidden'), TOAST_MS);
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
  }
}

function criterio(parent: HTMLElement, label: string, ok: boolean): void {
  el('span', ok ? 'ok' : 'no', parent).textContent = `${label}${ok ? '✓' : '✗'} `;
}
