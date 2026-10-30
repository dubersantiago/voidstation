import * as Phaser from 'phaser';
import { SECTORES } from '../content';

/** Carga de assets. Las claves coinciden con las del arte final (§9.7): reemplazar el PNG no toca código. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.load.image('estacion-placeholder', 'assets/tilesets/estacion-placeholder.png');
    this.load.image('jugador', 'assets/sprites/jugador-placeholder.png');
    // Un mapa por sector, con el id del sector como clave (§8.2).
    for (const s of SECTORES) {
      if (s.mapa) this.load.tilemapTiledJSON(s.id, `assets/maps/${s.mapa}`);
    }
  }

  create(): void {
    this.scene.start('Title');
  }
}
