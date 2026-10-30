import * as Phaser from 'phaser';
import { type Agent, type Behavior, getBehavior } from '../behaviors';
import { css, PALETTE, PHOTOGENIC, type PaletteKey } from '../config';
import type { Criatura, Estado } from '../content';

// Fuente provisional: la fuente pixel con tildes/ñ y licencia verificada está pendiente (§9.6).
const FONT_FAMILY = 'monospace';

/**
 * Colores del placeholder por estado (§9.2: las criaturas usan bioluminiscencia y ámbar).
 * `glow` = borde durante el estado fotogénico: fijo, sin parpadeo.
 */
const PLACEHOLDER_COLORS: Record<Exclude<Estado, 'planeado'>, { fill: PaletteKey; border: PaletteKey; glow: PaletteKey }> = {
  confirmado: { fill: 'bio0', border: 'bio2', glow: 'bio3' },
  en_construccion: { fill: 'amber0', border: 'amber1', glow: 'amber3' },
};

/**
 * Un individuo de una criatura. Usa el sprite `datos.sprite` si existe la textura; si no, un
 * placeholder del tamaño del hitbox con el nombre (§9.7). Se dibuja siempre en píxel entero.
 */
export class Creature {
  readonly datos: Criatura;
  /** Identifica al individuo (`<id>#<n>`) en el progreso guardado: cada individuo cuenta (§3). */
  readonly key: string;
  /** true mientras está en su estado fotogénico (§4, §8.3). */
  fotogenico = false;

  private readonly view: Phaser.GameObjects.Container;
  private readonly agent: Agent;
  private readonly behavior: Behavior;
  private border?: Phaser.GameObjects.Rectangle;
  private photogenicTimer: number;

  /** `zona` = rectángulo del mapa donde vive; `key` también fija su posición inicial entre recargas. */
  constructor(scene: Phaser.Scene, datos: Criatura, zona: Phaser.Geom.Rectangle, key: string) {
    this.datos = datos;
    this.key = key;
    const [w, h] = datos.hitbox;

    // Área válida para el centro: la zona reducida en medio hitbox (o su centro si no cabe).
    const area = new Phaser.Geom.Rectangle(
      zona.x + Math.min(w, zona.width) / 2,
      zona.y + Math.min(h, zona.height) / 2,
      Math.max(0, zona.width - w),
      Math.max(0, zona.height - h),
    );
    const rng = new Phaser.Math.RandomDataGenerator([key]);
    this.agent = { x: rng.realInRange(area.left, area.right), y: rng.realInRange(area.top, area.bottom), area, rng, mem: {} };
    this.behavior = getBehavior(datos.comportamiento);
    this.photogenicTimer = rng.realInRange(...PHOTOGENIC.interval);

    this.view = scene.add.container(0, 0, this.buildView(scene));
    this.sync();
  }

  /** Hitbox en el mundo, tal como se dibuja (píxel entero). */
  get rect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.view.x, this.view.y, this.datos.hitbox[0], this.datos.hitbox[1]);
  }

  get centerX(): number {
    return this.view.x + this.datos.hitbox[0] / 2;
  }

  get centerY(): number {
    return this.view.y + this.datos.hitbox[1] / 2;
  }

  /** Base del hitbox en pantalla, para ordenar por profundidad. */
  get bottom(): number {
    return this.view.y + this.datos.hitbox[1];
  }

  update(dt: number): void {
    this.behavior(this.agent, dt);
    this.updatePhotogenic(dt);
    this.sync();
  }

  /** Alterna entre el comportamiento base y el estado fotogénico con tiempos aleatorios (§8.3). */
  private updatePhotogenic(dt: number): void {
    this.photogenicTimer -= dt;
    if (this.photogenicTimer > 0) return;

    this.fotogenico = !this.fotogenico;
    const [min, max] = this.fotogenico ? PHOTOGENIC.duration : PHOTOGENIC.interval;
    this.photogenicTimer = this.agent.rng.realInRange(min, max);
    const colors = this.colors();
    this.border?.setFillStyle(PALETTE[this.fotogenico ? colors.glow : colors.border]);
  }

  private sync(): void {
    const [w, h] = this.datos.hitbox;
    // La esquina superior izquierda en píxel entero: así todo el contenedor cae en la rejilla.
    this.view.setPosition(Math.round(this.agent.x - w / 2), Math.round(this.agent.y - h / 2));
    this.view.setDepth(this.bottom);
  }

  private colors() {
    return PLACEHOLDER_COLORS[this.datos.estado === 'planeado' ? 'en_construccion' : this.datos.estado];
  }

  private buildView(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
    const [w, h] = this.datos.hitbox;
    if (scene.textures.exists(this.datos.sprite)) {
      // Origen abajo-centro: la base del sprite coincide con la del hitbox.
      return [scene.add.image(Math.round(w / 2), h, this.datos.sprite).setOrigin(0.5, 1)];
    }

    const colors = this.colors();
    // Borde de 1 px con dos rectángulos rellenos: el trazo de Shape va centrado en el borde y cae en medio píxel.
    this.border = scene.add.rectangle(0, 0, w, h, PALETTE[colors.border]).setOrigin(0);
    const fill = scene.add.rectangle(1, 1, w - 2, h - 2, PALETTE[colors.fill]).setOrigin(0);
    const label = scene.add.text(0, 0, this.datos.nombre, { fontFamily: FONT_FAMILY, fontSize: '8px', color: css('text') });
    label.setPosition(Math.floor((w - label.width) / 2), -Math.ceil(label.height) - 1);
    return [this.border, fill, label];
  }
}
