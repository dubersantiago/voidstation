import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { StationScene } from './scenes/StationScene';
import { TitleScene } from './scenes/TitleScene';
import { layoutOverlay } from './ui/overlay';

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
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, PreloadScene, TitleScene, StationScene],
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
  // La capa HTML sigue al canvas: tras el reflow, misma posición y mismo factor de escala.
  requestAnimationFrame(() => layoutOverlay(game.canvas));
}

game.events.once(Phaser.Core.Events.READY, applyZoom);
window.addEventListener('resize', applyZoom);
game.scale.on(Phaser.Scale.Events.RESIZE, () => layoutOverlay(game.canvas));
