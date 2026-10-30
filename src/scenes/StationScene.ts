import * as Phaser from 'phaser';
import { CAMERA_DEADZONE, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import { Player } from '../entities/Player';

/** Altura del sprite del jugador (§9.3), para centrar la cámara en su cuerpo y no en sus pies. */
const PLAYER_HEIGHT = 24;

/**
 * Un sector de la estación (Fase 1: solo el Muelle de prueba).
 * Capas esperadas en el .tmj: `suelo`, `paredes` (tiles con propiedad `colisiona`) y `objetos`
 * con un punto `inicio`.
 */
export class StationScene extends Phaser.Scene {
  private player!: Player;
  private bounds!: { width: number; height: number };

  constructor() {
    super('Station');
  }

  create(data: { mapa?: string }): void {
    this.cameras.main.setBackgroundColor(PALETTE.void0);

    const map = this.make.tilemap({ key: data.mapa ?? 'muelle' });
    const tileset = map.addTilesetImage('estacion-placeholder', 'estacion-placeholder');
    if (!tileset) throw new Error('Tileset "estacion-placeholder" no encontrado en el mapa');

    map.createLayer('suelo', tileset);
    const walls = map.createLayer('paredes', tileset);
    if (!walls) throw new Error('Capa "paredes" no encontrada en el mapa');
    walls.setCollisionByProperty({ colisiona: true });

    const start = map.findObject('objetos', (o) => o.name === 'inicio');
    this.player = new Player(this, start?.x ?? map.widthInPixels / 2, start?.y ?? map.heightInPixels / 2);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.add.collider(this.player.collider, walls);

    this.bounds = { width: map.widthInPixels, height: map.heightInPixels };
    this.centerCameraOnPlayer();
  }

  update(): void {
    this.player.update();
    this.followPlayer();
  }

  private focus(): { x: number; y: number } {
    return { x: this.player.drawX, y: this.player.drawY - PLAYER_HEIGHT / 2 };
  }

  private centerCameraOnPlayer(): void {
    const { x, y } = this.focus();
    this.setScroll(x - GAME_WIDTH / 2, y - GAME_HEIGHT / 2);
  }

  /**
   * Cámara con zona muerta en píxeles enteros. Todo lo que se dibuja (tiles, jugador y scroll)
   * es entero, así que no hay subpíxel posible ni oscilación del jugador respecto al fondo.
   */
  private followPlayer(): void {
    const cam = this.cameras.main;
    const { x, y } = this.focus();
    const left = cam.scrollX + (GAME_WIDTH - CAMERA_DEADZONE.width) / 2;
    const top = cam.scrollY + (GAME_HEIGHT - CAMERA_DEADZONE.height) / 2;

    let sx = cam.scrollX;
    let sy = cam.scrollY;
    if (x < left) sx -= left - x;
    else if (x > left + CAMERA_DEADZONE.width) sx += x - (left + CAMERA_DEADZONE.width);
    if (y < top) sy -= top - y;
    else if (y > top + CAMERA_DEADZONE.height) sy += y - (top + CAMERA_DEADZONE.height);

    this.setScroll(sx, sy);
  }

  private setScroll(x: number, y: number): void {
    const maxX = Math.max(0, this.bounds.width - GAME_WIDTH);
    const maxY = Math.max(0, this.bounds.height - GAME_HEIGHT);
    this.cameras.main.setScroll(
      Math.round(Phaser.Math.Clamp(x, 0, maxX)),
      Math.round(Phaser.Math.Clamp(y, 0, maxY)),
    );
  }
}
