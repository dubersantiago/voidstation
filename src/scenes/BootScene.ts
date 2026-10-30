import * as Phaser from 'phaser';

/** Primera escena. En fases siguientes pasará por Preload antes del título. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Title');
  }
}
