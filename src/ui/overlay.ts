// Capa HTML sobre el canvas (§11): HUD, visor, avisos y álbum.
// Se maqueta en píxeles de resolución interna (480×270) y se escala con el mismo zoom entero que el canvas.
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, css, type PaletteKey } from '../config';
import './ui.css';

let root: HTMLDivElement | null = null;

/** Raíz de la capa de UI (se crea la primera vez). */
export function uiRoot(): HTMLDivElement {
  if (root) return root;
  root = document.createElement('div');
  root.id = 'ui';
  root.style.width = `${GAME_WIDTH}px`;
  root.style.height = `${GAME_HEIGHT}px`;
  // Los colores de la paleta como variables CSS: la hoja de estilos no repite valores.
  for (const key of Object.keys(PALETTE) as PaletteKey[]) root.style.setProperty(`--${key}`, css(key));
  document.body.appendChild(root);
  return root;
}

/** Vacía la capa (al salir de una escena que la usa). */
export function clearUi(): void {
  root?.replaceChildren();
}

/** Coloca la capa exactamente sobre el canvas, con su mismo factor de escala. */
export function layoutOverlay(canvas: HTMLCanvasElement): void {
  const r = canvas.getBoundingClientRect();
  const el = uiRoot();
  el.style.left = `${r.left}px`;
  el.style.top = `${r.top}px`;
  el.style.transform = `scale(${r.width / GAME_WIDTH})`;
}

/** Crea un elemento con clase y lo añade a `parent`. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent: HTMLElement): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  parent.appendChild(node);
  return node;
}
