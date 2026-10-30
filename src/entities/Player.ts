import * as Phaser from 'phaser';
import { PLAYER_SPEED } from '../config';

/** Hitbox de los pies: en vista 3/4 solo los pies chocan, la cabeza puede solapar muros. */
const FEET = { width: 10, height: 6 } as const;

/** Alto del sprite (§9.3). */
export const PLAYER_HEIGHT = 24;

/**
 * Jugador placeholder (16×24, §9.3).
 *
 * La física se mueve en coordenadas fraccionarias sobre una Zone invisible; el sprite visible
 * se coloca cada frame en la posición redondeada. Así la velocidad lenta no se pierde por el
 * redondeo y lo que se dibuja siempre cae en píxel entero (§9.1).
 */
export class Player {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly feet: Phaser.GameObjects.Zone;
  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

  /** (x, y) = punto en el suelo bajo los pies. */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.feet = scene.add.zone(x, y - FEET.height / 2, FEET.width, FEET.height);
    scene.physics.add.existing(this.feet);
    this.body = this.feet.body as Phaser.Physics.Arcade.Body;

    this.sprite = scene.add.image(0, 0, 'jugador').setOrigin(0.5, 1);

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
    }) as Player['keys'];

    this.syncSprite();
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

  /** Con la dirección bloqueada el jugador se mueve sin girar (modo cámara: mantiene el encuadre). */
  facingLocked = false;

  update(): void {
    const k = this.keys;
    const dx = Number(k.right.isDown || k.d.isDown) - Number(k.left.isDown || k.a.isDown);
    const dy = Number(k.down.isDown || k.s.isDown) - Number(k.up.isDown || k.w.isDown);

    // Normalizado: en diagonal no se va más rápido.
    const len = Math.hypot(dx, dy) || 1;
    const speed = PLAYER_SPEED * this.speedFactor;
    this.body.setVelocity((dx / len) * speed, (dy / len) * speed);

    if ((dx !== 0 || dy !== 0) && !this.facingLocked) {
      this.facing.x = dx;
      this.facing.y = dy;
      if (dx !== 0) this.sprite.setFlipX(dx < 0);
    }

    this.syncSprite();
  }

  private syncSprite(): void {
    // Origen (0.5, 1) sobre 16 px de ancho: la esquina superior izquierda también queda entera.
    this.sprite.setPosition(Math.round(this.body.x + this.body.halfWidth), Math.round(this.body.bottom));
    // Profundidad = base del sprite: se dibuja delante de lo que está más arriba en pantalla.
    this.sprite.setDepth(this.sprite.y);
  }
}
