// Spritesheets del arte final (§9.7): public/assets/sprites/sprites.json, generado por
// scripts/import-sprites.py. Si un sprite no está en el manifiesto, el juego usa su placeholder.
import type * as Phaser from 'phaser';

export interface SpriteAnim {
  frames: number[];
  fps: number;
  /** -1 = bucle; 0 = una vez (se queda en el último fotograma). */
  repeat: number;
}

export interface SpriteInfo {
  file: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  /** "derecha" si el dibujo mira a la derecha: se voltea al moverse a la izquierda. */
  mira: 'derecha' | null;
  anims: Record<string, SpriteAnim>;
}

export type SpriteManifest = Record<string, SpriteInfo>;

const MANIFEST_KEY = 'sprites';
const BASE = 'assets/sprites/';

/** Encola el manifiesto y, cuando llega, cada spritesheet que declara. Llamar en `preload()`. */
export function loadSprites(scene: Phaser.Scene): void {
  scene.load.json(MANIFEST_KEY, `${BASE}sprites.json`);
  scene.load.on(`filecomplete-json-${MANIFEST_KEY}`, (_key: string, _type: string, data: SpriteManifest) => {
    for (const [key, info] of Object.entries(data)) {
      scene.load.spritesheet(key, BASE + info.file, { frameWidth: info.frameWidth, frameHeight: info.frameHeight });
    }
  });
}

/** Crea las animaciones globales `<sprite>:<anim>`. Llamar en `create()` tras la carga. */
export function createSpriteAnims(scene: Phaser.Scene): void {
  for (const [key, info] of Object.entries(spriteManifest(scene))) {
    if (!scene.textures.exists(key)) continue;
    for (const [name, a] of Object.entries(info.anims)) {
      const animKey = spriteAnimKey(key, name);
      if (scene.anims.exists(animKey)) continue;
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(key, { frames: a.frames }),
        frameRate: a.fps,
        repeat: a.repeat,
      });
    }
  }
}

export function spriteManifest(scene: Phaser.Scene): SpriteManifest {
  return (scene.cache.json.get(MANIFEST_KEY) as SpriteManifest | undefined) ?? {};
}

/** Info del sprite si está cargado; null = usar placeholder. */
export function spriteInfo(scene: Phaser.Scene, key: string): SpriteInfo | null {
  return scene.textures.exists(key) ? (spriteManifest(scene)[key] ?? null) : null;
}

export function spriteAnimKey(sprite: string, anim: string): string {
  return `${sprite}:${anim}`;
}
