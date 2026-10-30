// Álbum (§4): mejor foto de cada criatura. Las criaturas sin foto aparecen como "???".
import type { Criatura } from '../content';
import type { Progress } from '../systems/Progress';
import { stars } from './Hud';
import { el, uiRoot } from './overlay';

const SCROLL_STEP = 48;

export class Album {
  private readonly root: HTMLDivElement;
  private readonly head: HTMLDivElement;
  private readonly grid: HTMLDivElement;
  private onClose: (() => void) | null = null;

  constructor(private readonly criaturas: Criatura[]) {
    this.root = el('div', 'album hidden', uiRoot());
    this.head = el('div', 'album-head', this.root);
    this.grid = el('div', 'album-grid', this.root);
    el('div', 'album-foot', this.root).textContent = '↑↓ DESPLAZAR · Q / ESC CERRAR';
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  /** Abre el álbum. Mientras está abierto, las teclas las gestiona el DOM (la escena está en pausa). */
  open(progress: Progress, onClose: () => void): void {
    this.render(progress);
    this.onClose = onClose;
    this.root.classList.remove('hidden');
    this.grid.scrollTop = 0;
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
    if (e.code === 'KeyQ' || e.code === 'Escape') this.close();
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.grid.scrollTop += SCROLL_STEP;
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') this.grid.scrollTop -= SCROLL_STEP;
    else return;
    e.preventDefault();
  };

  private render(progress: Progress): void {
    const visibles = this.criaturas.filter((c) => c.estado !== 'planeado');
    const conFoto = visibles.filter((c) => progress.nivel(c.id) > 0).length;
    this.head.textContent = `ÁLBUM  ${conFoto} / ${visibles.length}`;

    this.grid.replaceChildren();
    for (const c of visibles) {
      const card = el('div', 'album-card', this.grid);
      const nivel = progress.nivel(c.id);
      const foto = progress.foto(c.id);

      if (foto) {
        const img = el('img', '', card);
        img.src = foto;
        img.alt = c.nombre;
      } else {
        el('div', 'album-empty', card).textContent = nivel ? 'SIN MINIATURA' : '???';
      }

      const name = el('div', 'name', card);
      if (nivel) {
        name.append(`${c.nombre} `);
        el('span', 'stars', name).textContent = stars(nivel);
        if (c.estado === 'en_construccion') el('span', 'tag', name).textContent = ' EN CONSTRUCCIÓN';
      } else {
        name.textContent = '???';
      }
    }
  }
}
