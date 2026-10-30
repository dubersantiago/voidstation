// Overlays modales (álbum, bestiario): la escena se pausa y el teclado lo gestiona el DOM.
import type * as Phaser from 'phaser';

/**
 * Tras cerrar un modal se ignoran sus teclas de apertura un instante: el mismo pulso que lo cerró
 * llega a Phaser al reanudar la escena y no debe reabrirlo. performance.now(): el reloj de la
 * escena está congelado durante la pausa.
 */
const REOPEN_GUARD_MS = 200;
let guardUntil = 0;

export function modalGuardActive(): boolean {
  return performance.now() < guardUntil;
}

/** Pausa `scene`, muestra el modal con `show` y reanuda cuando el modal llama a `done`. */
export function pauseWhile(scene: Phaser.Scene, show: (done: () => void) => void, onResume?: () => void): void {
  scene.scene.pause();
  show(() => {
    scene.input.keyboard?.resetKeys();
    guardUntil = performance.now() + REOPEN_GUARD_MS;
    scene.scene.resume();
    onResume?.();
  });
}
