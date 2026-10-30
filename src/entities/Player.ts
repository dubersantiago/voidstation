import * as Phaser from 'phaser';
import { PLAYER_SPEED, SNEAK_SPEED_FACTOR } from '../config';
import { spriteAnimKey, spriteInfo } from '../systems/Sprites';

/** Clave del arte final del jugador; si no está cargado se usa `jugador-placeholder`. */
const SPRITE = 'jugador';

/** Hitbox de los pies: en vista 3/4 solo los pies chocan, la cabeza puede solapar muros. */
const FEET = { width: 10, height: 6 } as const;

/** Alto del sprite (§9.3). */
export const PLAYER_HEIGHT = 24;

/**
 * Jugador (16×24, §9.3). Con el arte final anima `abajo`, `arriba` y `lado` (volteado a la
 * izquierda) según la dirección a la que mira; quieto, muestra el primer fotograma.
 *
 * La física se mueve en coordenadas fraccionarias sobre una Zone invisible; el sprite visible
 * se coloca cada frame en la posición redondeada. Así la velocidad lenta no se pierde por el
 * redondeo y lo que se dibuja siempre cae en píxel entero (§9.1).
 */
export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly animated: boolean;
  private readonly feet: Phaser.GameObjects.Zone;
  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'sneak', Phaser.Input.Keyboard.Key>;

  /** (x, y) = punto en el suelo bajo los pies. */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.feet = scene.add.zone(x, y - FEET.height / 2, FEET.width, FEET.height);
    scene.physics.add.existing(this.feet);
    this.body = this.feet.body as Phaser.Physics.Arcade.Body;

    this.animated = spriteInfo(scene, SPRITE) !== null;
    this.sprite = scene.add.sprite(0, 0, this.animated ? SPRITE : 'jugador-placeholder').setOrigin(0.5, 1);

    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP,
      down: K.DOWN,
      left: K.LEFT,
      right: K.RIGHT,
      w: K.W,
      a: K.A,
      s: K.S,
      d: K.D,
      sneak: K.SHIFT,
    }) as Player['keys'];

    this.syncSprite();
  }

  /** Hitbox de los pies en el mundo (para compuertas). */
  get feetRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.body.x, this.body.y, this.body.width, this.body.height);
  }

  /** Objeto con cuerpo de física, para colliders. */
  get collider(): Phaser.GameObjects.Zone {
    return this.feet;
  }

  /** Posición dibujada (píxel entero): centro horizontal y base del sprite. */
  get drawX(): number {
    return this.sprite.x;
  }

  get drawY(): number {
    return this.sprite.y;
  }

  /** Centro del cuerpo dibujado (píxel entero): origen de distancias, linterna y encuadre. */
  get centerX(): number {
    return this.sprite.x;
  }

  get centerY(): number {
    return this.sprite.y - PLAYER_HEIGHT / 2;
  }

  /** Dirección a la que mira: componentes -1, 0 o 1, nunca (0, 0). Empieza mirando abajo. */
  readonly facing = { x: 0, y: 1 };

  /** Multiplicador de velocidad (modo cámara, §4). */
  speedFactor = 1;

  /** true si corre: se mueve sin Shift y fuera del modo cámara. */
  noisy = false;

  /** Con la dirección bloqueada el jugador se mueve sin girar (modo cámara: mantiene el encuadre). */
  facingLocked = false;

  update(): void {
    const k = this.keys;
    const dx = Number(k.right.isDown || k.d.isDown) - Number(k.left.isDown || k.a.isDown);
    const dy = Number(k.down.isDown || k.s.isDown) - Number(k.up.isDown || k.w.isDown);

    // Normalizado: en diagonal no se va más rápido.
    const len = Math.hypot(dx, dy) || 1;
    const sneaking = this.keys.sneak.isDown;
    const speed = PLAYER_SPEED * Math.min(this.speedFactor, sneaking ? SNEAK_SPEED_FACTOR : 1);
    const moving = dx !== 0 || dy !== 0;
    // Hace ruido si se mueve a velocidad normal (ni sigiloso ni en modo cámara): asusta a las criaturas (§4).
    this.noisy = moving && !sneaking && this.speedFactor >= 1;
    this.body.setVelocity((dx / len) * speed, (dy / len) * speed);

    if (moving && !this.facingLocked) {
      this.facing.x = dx;
      this.facing.y = dy;
      if (dx !== 0) this.sprite.setFlipX(dx < 0);
    }

    this.animate(moving);
    this.syncSprite();
  }

  /** Animación según la dirección a la que mira (la diagonal usa la vista lateral). */
  private animate(moving: boolean): void {
    if (!this.animated) return;
    const dir = this.facing.x !== 0 ? 'lado' : this.facing.y < 0 ? 'arriba' : 'abajo';
    const key = spriteAnimKey(SPRITE, dir);
    if (moving) {
      if (this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying) this.sprite.play(key);
    } else {
      // Quieto: primer fotograma de esa dirección.
      this.sprite.anims.stop();
      const first = this.sprite.scene.anims.get(key)?.frames[0]?.frame;
      if (first) this.sprite.setFrame(first.name);
    }
  }

  private syncSprite(): void {
    // Origen (0.5, 1) sobre 16 px de ancho: la esquina superior izquierda también queda entera.
    this.sprite.setPosition(Math.round(this.body.x + this.body.halfWidth), Math.round(this.body.bottom));
    // Profundidad = base del sprite: se dibuja delante de lo que está más arriba en pantalla.
    this.sprite.setDepth(this.sprite.y);
  }
}
