// Visor de cámara (§9.6): esquinas de encuadre, retícula, barra de distancia e indicador de luz.
import { GAME_HEIGHT, GAME_WIDTH, PHOTO_FRAME } from '../config';
import type { PhotoScore } from '../systems/Photo';
import { el, uiRoot } from './overlay';

/** Marco central en coordenadas de pantalla (resolución interna). */
export const FRAME_SCREEN = {
  x: (GAME_WIDTH - PHOTO_FRAME.width) / 2,
  y: (GAME_HEIGHT - PHOTO_FRAME.height) / 2,
  width: PHOTO_FRAME.width,
  height: PHOTO_FRAME.height,
} as const;

const BAR_WIDTH = 64;
const SHOT_MS = 150;

export class Visor {
  private readonly root: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly ideal: HTMLDivElement;
  private readonly mark: HTMLDivElement;
  private readonly light: HTMLDivElement;
  private shotTimer = 0;

  constructor() {
    this.root = el('div', 'visor hidden', uiRoot());

    const frame = el('div', 'visor-frame', this.root);
    Object.assign(frame.style, {
      left: `${FRAME_SCREEN.x}px`,
      top: `${FRAME_SCREEN.y}px`,
      width: `${FRAME_SCREEN.width}px`,
      height: `${FRAME_SCREEN.height}px`,
    });
    for (const c of ['tl', 'tr', 'bl', 'br']) el('div', `visor-corner ${c}`, frame);
    el('div', 'visor-reticle-h', frame);
    el('div', 'visor-reticle-v', frame);

    this.info = el('div', 'visor-info', this.root);
    Object.assign(this.info.style, { left: `${FRAME_SCREEN.x}px`, top: `${FRAME_SCREEN.y + FRAME_SCREEN.height + 4}px` });
    el('span', '', this.info).textContent = 'DIST';
    const bar = el('div', 'visor-bar', this.info);
    this.ideal = el('div', 'visor-bar-ideal', bar);
    this.mark = el('div', 'visor-bar-mark', bar);
    el('span', '', this.info).textContent = 'LUZ';
    this.light = el('div', 'visor-light', this.info);
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
  }

  /** Las esquinas cambian de color un instante al disparar (sin destello de pantalla completa). */
  flashShot(): void {
    this.root.classList.add('shot');
    window.clearTimeout(this.shotTimer);
    this.shotTimer = window.setTimeout(() => this.root.classList.remove('shot'), SHOT_MS);
  }
}
