import * as Phaser from 'phaser';

/** Carga de assets. Las claves coinciden con las del arte final (§9.7): reemplazar el PNG no toca código. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.load.image('estacion-placeholder', 'assets/tilesets/estacion-placeholder.png');
    this.load.image('jugador', 'assets/sprites/jugador-placeholder.png');
    this.load.tilemapTiledJSON('muelle', 'assets/maps/muelle.tmj');
  }

  create(): void {
    this.scene.start('Title');
  }
}
