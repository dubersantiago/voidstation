import * as Phaser from 'phaser';
import { type Agent, type Behavior, flee, getBehavior } from '../behaviors';
import { css, FLEE, PALETTE, PHOTOGENIC, type PaletteKey } from '../config';
import type { Criatura, Estado } from '../content';
import { spriteAnimKey, type SpriteInfo, spriteInfo } from '../systems/Sprites';

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

/** Señal no identificada (§7): silueta con líneas de interferencia que cambian de sitio. */
const SIGNAL = { fill: 'void2', border: 'void4', noise: 'metal0', lines: 3, interval: 0.15 } as const;

/** Lo que una criatura necesita saber del jugador para huir (§4). */
export interface Threat {
  x: number;
  y: number;
  /** Corre cerca: no está en modo cámara ni caminando sigiloso. */
  noisy: boolean;
}

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
  /** Arte final (si existe): se anima `idle` / `fotogenico`. */
  private art?: { sprite: Phaser.GameObjects.Sprite; info: SpriteInfo };
  private lastX = 0;
  private noise: Phaser.GameObjects.Rectangle[] = [];
  private photogenicTimer: number;
  private noiseTimer = 0;
  private fleeTimer = 0;

  /**
   * `zona` = rectángulo del mapa donde vive; `key` también fija su posición inicial entre recargas.
   * `group` = lista compartida por los individuos de la misma especie (se añade a ella).
   */
  constructor(
    scene: Phaser.Scene,
    datos: Criatura,
    zona: Phaser.Geom.Rectangle,
    key: string,
    group: Agent[],
    points: readonly { x: number; y: number }[],
  ) {
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
    this.agent = {
      x: rng.realInRange(area.left, area.right),
      y: rng.realInRange(area.top, area.bottom),
      area,
      rng,
      mem: {},
      points,
      group,
      hidden: false,
    };
    group.push(this.agent);
    this.behavior = getBehavior(datos.comportamiento);
    this.photogenicTimer = this.nextPhotogenicInterval();

    this.view = scene.add.container(0, 0, this.buildView(scene));
    this.lastX = this.agent.x;
    this.playArt();
    this.sync();
  }

  /** Señal no identificada: no es fotografiable ni cuenta para el objetivo (§7). */
  get isSignal(): boolean {
    return this.datos.estado === 'planeado';
  }

  /** false mientras está fuera del mundo (comportamiento `fase`). */
  get visible(): boolean {
    return !this.agent.hidden;
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

  update(dt: number, threat: Threat): void {
    this.updateFlee(dt, threat);
    if (this.fleeTimer <= 0) this.behavior(this.agent, dt);
    if (this.isSignal) this.updateNoise(dt);
    else this.updatePhotogenic(dt);
    this.sync();
  }

  /** Si el jugador corre dentro de `radio_huida`, se aleja durante un rato (§4). */
  private updateFlee(dt: number, threat: Threat): void {
    const radio = this.datos.radio_huida;
    if (radio > 0 && threat.noisy && !this.agent.hidden && Math.hypot(this.agent.x - threat.x, this.agent.y - threat.y) < radio) {
      this.fleeTimer = FLEE.duration;
    }
    if (this.fleeTimer > 0) {
      this.fleeTimer -= dt;
      flee(this.agent, threat.x, threat.y, FLEE.speed, dt);
    }
  }

  /** Alterna entre el comportamiento base y el estado fotogénico con tiempos aleatorios (§8.3). */
  private updatePhotogenic(dt: number): void {
    this.photogenicTimer -= dt;
    if (this.photogenicTimer > 0) return;

    this.fotogenico = !this.fotogenico;
    if (this.fotogenico) {
      const [min, max] = PHOTOGENIC.duration;
      this.photogenicTimer = this.agent.rng.realInRange(min, max);
    } else {
      this.photogenicTimer = this.nextPhotogenicInterval();
    }
    const colors = this.colors();
    this.border?.setFillStyle(PALETTE[this.fotogenico ? colors.glow : colors.border]);
    this.playArt();
  }

  /** Animación del arte final según el estado; si no tiene `fotogenico`, sigue en `idle`. */
  private playArt(): void {
    if (!this.art) return;
    const { sprite, info } = this.art;
    const name = this.fotogenico && info.anims.fotogenico ? 'fotogenico' : 'idle';
    if (!info.anims[name]) return;
    // Cada individuo empieza en un fotograma distinto: los enjambres no se mueven al unísono.
    const startFrame = name === 'idle' ? this.agent.rng.between(0, info.anims.idle.frames.length - 1) : 0;
    sprite.play({ key: spriteAnimKey(this.datos.sprite, name), startFrame });
  }

  /** `dormido` (en construcción) "despierta" con la mitad de frecuencia. */
  private nextPhotogenicInterval(): number {
    const [min, max] = PHOTOGENIC.interval;
    const factor = this.datos.comportamiento === 'dormido' ? 2 : 1;
    return this.agent.rng.realInRange(min, max) * factor;
  }

  private updateNoise(dt: number): void {
    this.noiseTimer -= dt;
    if (this.noiseTimer > 0) return;
    this.noiseTimer = SIGNAL.interval;
    const h = this.datos.hitbox[1];
    for (const line of this.noise) line.setY(this.agent.rng.between(1, Math.max(1, h - 2)));
  }

  private sync(): void {
    const [w, h] = this.datos.hitbox;
    // La esquina superior izquierda en píxel entero: así todo el contenedor cae en la rejilla.
    this.view.setPosition(Math.round(this.agent.x - w / 2), Math.round(this.agent.y - h / 2));
    this.view.setDepth(this.bottom);
    this.view.setVisible(!this.agent.hidden);

    // Si el dibujo mira a la derecha, se voltea al desplazarse a la izquierda (con margen contra temblores).
    const dx = this.agent.x - this.lastX;
    if (this.art?.info.mira === 'derecha' && Math.abs(dx) > 0.05) this.art.sprite.setFlipX(dx < 0);
    this.lastX = this.agent.x;
  }

  private colors() {
    return PLACEHOLDER_COLORS[this.datos.estado === 'planeado' ? 'en_construccion' : this.datos.estado];
  }

  private buildView(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
    const [w, h] = this.datos.hitbox;
    const info = spriteInfo(scene, this.datos.sprite);
    if (info) {
      // Origen abajo-centro: la base del sprite coincide con la del hitbox (ancho par: queda entero).
      const sprite = scene.add.sprite(Math.round(w / 2), h, this.datos.sprite).setOrigin(0.5, 1);
      this.art = { sprite, info };
      return [sprite];
    }

    const label = (text: string, color: PaletteKey) => {
      const t = scene.add.text(0, 0, text, { fontFamily: FONT_FAMILY, fontSize: '8px', color: css(color) });
      t.setPosition(Math.floor((w - t.width) / 2), -Math.ceil(t.height) - 1);
      return t;
    };

    // Borde de 1 px con dos rectángulos rellenos: el trazo de Shape va centrado en el borde y cae en medio píxel.
    if (this.isSignal) {
      const border = scene.add.rectangle(0, 0, w, h, PALETTE[SIGNAL.border]).setOrigin(0);
      const fill = scene.add.rectangle(1, 1, w - 2, h - 2, PALETTE[SIGNAL.fill]).setOrigin(0);
      this.noise = Array.from({ length: SIGNAL.lines }, () => scene.add.rectangle(1, 1, w - 2, 1, PALETTE[SIGNAL.noise]).setOrigin(0));
      return [border, fill, ...this.noise, label('SEÑAL NO IDENTIFICADA', 'metal2')];
    }

    const colors = this.colors();
    this.border = scene.add.rectangle(0, 0, w, h, PALETTE[colors.border]).setOrigin(0);
    const fill = scene.add.rectangle(1, 1, w - 2, h - 2, PALETTE[colors.fill]).setOrigin(0);
    return [this.border, fill, label(this.datos.nombre, 'text')];
  }
}
