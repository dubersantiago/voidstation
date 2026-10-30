import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: PALETTE.void0,
  pixelArt: true,
  roundPixels: true,
  scale: {
    // NONE + zoom entero manual: FIT escalaría con factores fraccionarios (§9.1).
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene],
});

/** Mayor factor entero que cabe en la ventana; el sobrante queda como letterbox. */
function integerZoom(): number {
  return Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)));
}

function applyZoom(): void {
  const zoom = integerZoom();
  if (game.scale.zoom !== zoom) {
    game.scale.setZoom(zoom);
  }
}

game.events.once(Phaser.Core.Events.READY, applyZoom);
window.addEventListener('resize', applyZoom);
