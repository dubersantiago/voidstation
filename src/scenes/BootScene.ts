import * as Phaser from 'phaser';

/** Primera escena: pasa a Preload, que carga los assets antes del título. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}
