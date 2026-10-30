import * as Phaser from 'phaser';
import {
  CAMERA_AIM_DISTANCE,
  CAMERA_DEADZONE,
  CAMERA_MODE_SPEED_FACTOR,
  CAMERA_PAN_STEP,
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  PHOTO_COOLDOWN,
  PHOTO_FRAME,
} from '../config';
import { CRIATURAS, SECTORES } from '../content';
import { Creature } from '../entities/Creature';
import { Player } from '../entities/Player';
import type { LightSource } from '../systems/Lighting';
import { type PhotoScore, scoreCreature } from '../systems/Photo';
import { individualKey, Progress } from '../systems/Progress';
import { Album } from '../ui/Album';
import { Bestiary } from '../ui/Bestiary';
import { Hud } from '../ui/Hud';
import { modalGuardActive, pauseWhile } from '../ui/modal';
import { clearUi } from '../ui/overlay';
import { FRAME_SCREEN, Visor } from '../ui/Visor';

/**
 * Un sector de la estación. El mapa se carga con el id del sector como clave (ver PreloadScene).
 * Capas esperadas en el .tmj: `suelo`, `paredes` (tiles con propiedad `colisiona`), `objetos`
 * con un punto `inicio` y `zonas` (rectángulos de aparición de criaturas; `name` = id de criatura
 * para una zona propia, vacío para zona genérica).
 */
export class StationScene extends Phaser.Scene {
  private player!: Player;
  private creatures: Creature[] = [];
  private bounds!: { width: number; height: number };

  private progress!: Progress;
  private hud!: Hud;
  private visor!: Visor;
  private album!: Album;
  private bestiary!: Bestiary;
  private keys!: Record<'camera' | 'shoot' | 'flashlight' | 'album' | 'bestiary', Phaser.Input.Keyboard.Key>;

  private cameraMode = false;
  private flashlightOn = false;
  private photoCooldown = 0;

  constructor() {
    super('Station');
  }

  create(data: { sector?: string }): void {
    this.cameras.main.setBackgroundColor(PALETTE.void0);

    const sector = SECTORES.find((s) => s.id === data.sector);
    if (!sector?.mapa) throw new Error(`Sector "${data.sector}" inexistente o sin mapa`);

    const map = this.make.tilemap({ key: sector.id });
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

    this.creatures = this.spawnCreatures(sector.id, map);

    this.bounds = { width: map.widthInPixels, height: map.heightInPixels };
    this.centerCameraOnPlayer();

    this.setupPhotography();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.photoCooldown = Math.max(0, this.photoCooldown - dt);

    const album = Phaser.Input.Keyboard.JustDown(this.keys.album);
    const bestiary = Phaser.Input.Keyboard.JustDown(this.keys.bestiary);
    if ((album || bestiary) && !modalGuardActive()) {
      if (album) this.openModal((done) => this.album.open(this.progress, done));
      else this.openModal((done) => this.bestiary.open({ tipo: 'juego', progress: this.progress }, null, done));
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.camera)) this.setCameraMode(!this.cameraMode);
    if (Phaser.Input.Keyboard.JustDown(this.keys.flashlight)) this.setFlashlight(!this.flashlightOn);
    if (Phaser.Input.Keyboard.JustDown(this.keys.shoot)) this.takePhoto();

    this.player.update();
    for (const c of this.creatures) c.update(dt);
    this.followPlayer();

    if (this.cameraMode) this.visor.setTarget(this.bestTarget());
  }

  // --- Fotografía (§4) ---

  private setupPhotography(): void {
    clearUi();
    this.progress = new Progress(CRIATURAS);
    this.hud = new Hud();
    this.visor = new Visor();
    this.album = new Album(CRIATURAS);
    this.bestiary = new Bestiary();
    this.hud.setIndex(this.progress.restaurados, this.progress.total);
    this.hud.setFlashlight(this.flashlightOn);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard!.addKeys({
      camera: K.C,
      shoot: K.SPACE,
      flashlight: K.F,
      album: K.Q,
      bestiary: K.TAB,
    }) as StationScene['keys'];

    // Clic derecho: modo cámara. Clic izquierdo: foto (solo en modo cámara).
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.setCameraMode(!this.cameraMode);
      else if (p.leftButtonDown()) this.takePhoto();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearUi);
  }

  private setCameraMode(on: boolean): void {
    this.cameraMode = on;
    this.player.speedFactor = on ? CAMERA_MODE_SPEED_FACTOR : 1;
    // La dirección queda fija para que el encuadre no gire al acercarse o alejarse.
    this.player.facingLocked = on;
    this.visor.setVisible(on);
    this.visor.setTarget(on ? this.bestTarget() : null);
  }

  private setFlashlight(on: boolean): void {
    this.flashlightOn = on;
    this.hud.setFlashlight(on);
  }

  private light(): LightSource {
    return { x: this.player.centerX, y: this.player.centerY, facing: this.player.facing, on: this.flashlightOn };
  }

  /** Marco central del visor en coordenadas del mundo. */
  private frameWorld(): Phaser.Geom.Rectangle {
    const cam = this.cameras.main;
    return new Phaser.Geom.Rectangle(cam.scrollX + FRAME_SCREEN.x, cam.scrollY + FRAME_SCREEN.y, PHOTO_FRAME.width, PHOTO_FRAME.height);
  }

  private scoreAll(): PhotoScore[] {
    const frame = this.frameWorld();
    const light = this.light();
    return this.creatures.map((c) => scoreCreature(c, frame, light));
  }

  /** Criatura más encuadrada, para los indicadores del visor. */
  private bestTarget(): PhotoScore | null {
    let best: PhotoScore | null = null;
    for (const s of this.scoreAll()) if (s.encuadre > 0 && (!best || s.encuadre > best.encuadre)) best = s;
    return best;
  }

  private takePhoto(): void {
    if (!this.cameraMode || this.photoCooldown > 0) return;
    this.photoCooldown = PHOTO_COOLDOWN;
    this.visor.flashShot();

    const scores = this.scoreAll().filter((s) => s.estrellas > 0);
    const { mejoradas, desbloqueos } = this.progress.record(scores);
    this.hud.showPhoto(scores, desbloqueos);
    this.hud.setIndex(this.progress.restaurados, this.progress.total);

    // Miniatura del álbum: el contenido del marco tal como se ve en el canvas (sin la capa HTML).
    if (mejoradas.length) {
      this.game.renderer.snapshotArea(FRAME_SCREEN.x, FRAME_SCREEN.y, PHOTO_FRAME.width, PHOTO_FRAME.height, (img) => {
        if (img instanceof HTMLImageElement) this.progress.setFoto(mejoradas, img.src);
      });
    }
  }

  /** Álbum o bestiario: pausa el juego y oculta HUD y visor mientras el overlay está abierto. */
  private openModal(show: (done: () => void) => void): void {
    this.hud.setVisible(false);
    this.visor.setVisible(false);
    pauseWhile(this, show, () => {
      this.hud.setVisible(true);
      this.visor.setVisible(this.cameraMode);
    });
  }

  // --- Criaturas ---

  /**
   * Crea los individuos de cada criatura del sector a partir de content/ (§8). Las `planeado`
   * no aparecen: son señales no identificadas (Fase 5).
   */
  private spawnCreatures(sectorId: string, map: Phaser.Tilemaps.Tilemap): Creature[] {
    const zonas = (map.getObjectLayer('zonas')?.objects ?? []).map((o) => ({
      name: o.name ?? '',
      rect: new Phaser.Geom.Rectangle(o.x ?? 0, o.y ?? 0, o.width ?? 0, o.height ?? 0),
    }));
    const genericas = zonas.filter((z) => z.name === '');
    const result: Creature[] = [];

    for (const datos of CRIATURAS) {
      if (datos.sector !== sectorId || datos.estado === 'planeado') continue;

      const propia = zonas.find((z) => z.name === datos.id);
      const candidatas = propia ? [propia] : genericas;
      if (!candidatas.length) {
        console.warn(`[station] "${datos.id}": el mapa de "${sectorId}" no tiene zona propia ni genérica`);
        continue;
      }

      const n = datos.individuos ?? 1;
      for (let i = 0; i < n; i++) {
        const key = individualKey(datos.id, i);
        const zona = new Phaser.Math.RandomDataGenerator([key]).pick(candidatas);
        result.push(new Creature(this, datos, zona.rect, key));
      }
    }
    return result;
  }

  // --- Cámara ---

  private centerCameraOnPlayer(): void {
    this.setScroll(this.player.centerX - GAME_WIDTH / 2, this.player.centerY - GAME_HEIGHT / 2);
  }

  /**
   * Fuera del modo cámara: zona muerta. En modo cámara: la vista se adelanta hacia donde mira el
   * jugador para que el marco central quede delante de él. El paso por frame está limitado y es
   * entero: transiciones suaves sin subpíxel (§9.1).
   */
  private followPlayer(): void {
    const cam = this.cameras.main;
    const x = this.player.centerX;
    const y = this.player.centerY;
    let tx: number;
    let ty: number;

    if (this.cameraMode) {
      const f = this.player.facing;
      tx = x + f.x * CAMERA_AIM_DISTANCE - GAME_WIDTH / 2;
      ty = y + f.y * CAMERA_AIM_DISTANCE - GAME_HEIGHT / 2;
    } else {
      const left = cam.scrollX + (GAME_WIDTH - CAMERA_DEADZONE.width) / 2;
      const top = cam.scrollY + (GAME_HEIGHT - CAMERA_DEADZONE.height) / 2;
      tx = cam.scrollX;
      ty = cam.scrollY;
      if (x < left) tx -= left - x;
      else if (x > left + CAMERA_DEADZONE.width) tx += x - (left + CAMERA_DEADZONE.width);
      if (y < top) ty -= top - y;
      else if (y > top + CAMERA_DEADZONE.height) ty += y - (top + CAMERA_DEADZONE.height);
    }

    const step = (from: number, to: number) => from + Phaser.Math.Clamp(Math.round(to) - from, -CAMERA_PAN_STEP, CAMERA_PAN_STEP);
    this.setScroll(step(cam.scrollX, tx), step(cam.scrollY, ty));
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
