// Visor de cámara (§9.6): esquinas de encuadre, retícula, barra de distancia e indicador de luz.
import { GAME_HEIGHT, GAME_WIDTH, PHOTO_FRAME, PHOTO_MIN_FRAMING } from '../config';
import type { PhotoScore } from '../systems/Photo';
import { el, uiRoot } from './overlay';

/** Marco en el centro de la pantalla (resolución interna): su posición mientras la cámara puede seguir el apunte. */
export const FRAME_CENTER = {
  x: (GAME_WIDTH - PHOTO_FRAME.width) / 2,
  y: (GAME_HEIGHT - PHOTO_FRAME.height) / 2,
} as const;

const BAR_WIDTH = 64;
/** Alto de la línea de distancia/luz y separación con el marco (px). */
const INFO = { height: 10, gap: 4 } as const;
const SHOT_MS = 150;

export class Visor {
  private readonly root: HTMLDivElement;
  private readonly frame: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly ideal: HTMLDivElement;
  private readonly mark: HTMLDivElement;
  private readonly light: HTMLDivElement;
  private readonly framing: HTMLDivElement;
  private shotTimer = 0;

  constructor() {
    this.root = el('div', 'visor hidden', uiRoot());

    this.frame = el('div', 'visor-frame', this.root);
    Object.assign(this.frame.style, { width: `${PHOTO_FRAME.width}px`, height: `${PHOTO_FRAME.height}px` });
    for (const c of ['tl', 'tr', 'bl', 'br']) el('div', `visor-corner ${c}`, this.frame);
    el('div', 'visor-reticle-h', this.frame);
    el('div', 'visor-reticle-v', this.frame);

    this.info = el('div', 'visor-info', this.root);
    // ENC se enciende cuando el encuadre ya vale (1 ★): ayuda a apuntar a oscuras.
    el('span', '', this.info).textContent = 'ENC';
    this.framing = el('div', 'visor-light', this.info);
    el('span', '', this.info).textContent = 'DIST';
    const bar = el('div', 'visor-bar', this.info);
    this.ideal = el('div', 'visor-bar-ideal', bar);
    this.mark = el('div', 'visor-bar-mark', bar);
    el('span', '', this.info).textContent = 'LUZ';
    this.light = el('div', 'visor-light', this.info);
    this.setFrame(FRAME_CENTER.x, FRAME_CENTER.y);
  }

  /**
   * Coloca el marco (esquina superior izquierda, px de pantalla). La línea de distancia/luz va
   * debajo; si no cabe, encima.
   */
  setFrame(x: number, y: number): void {
    this.frame.style.left = `${x}px`;
    this.frame.style.top = `${y}px`;
    const below = y + PHOTO_FRAME.height + INFO.gap;
    const infoY = below + INFO.height <= GAME_HEIGHT ? below : y - INFO.gap - INFO.height;
    this.info.style.left = `${x}px`;
    this.info.style.top = `${infoY}px`;
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
  }

  /**
   * Indicadores para la criatura más encuadrada. La barra va de 0 al doble del máximo del rango
   * ideal; la franja verde es el rango ideal y la marca, la distancia actual.
   */
  setTarget(score: PhotoScore | null): void {
    this.info.classList.toggle('hidden', !score);
    if (!score) return;

    const [min, max] = score.creature.datos.rango_ideal;
    const scale = BAR_WIDTH / (max * 2);
    const px = (v: number) => Math.round(Math.min(BAR_WIDTH - 1, v * scale));
    this.ideal.style.left = `${px(min)}px`;
    this.ideal.style.width = `${Math.max(1, px(max) - px(min))}px`;
    this.mark.style.left = `${px(score.distancia)}px`;
    this.light.classList.toggle('on', score.iluminada);
    this.framing.classList.toggle('on', score.encuadre >= PHOTO_MIN_FRAMING);
  }

  /** Las esquinas cambian de color un instante al disparar (sin destello de pantalla completa). */
  flashShot(): void {
    this.root.classList.add('shot');
    window.clearTimeout(this.shotTimer);
    this.shotTimer = window.setTimeout(() => this.root.classList.remove('shot'), SHOT_MS);
  }
}
