import * as Phaser from 'phaser';
import type { Agent } from '../behaviors';
import {
  CAMERA_AIM_DISTANCE,
  CAMERA_DEADZONE,
  CAMERA_MODE_SPEED_FACTOR,
  CAMERA_PAN_STEP,
  css,
  CREATURE_LIGHT_RADIUS,
  GAME_HEIGHT,
  GAME_WIDTH,
  INTERACT_RADIUS,
  PALETTE,
  PHOTO_COOLDOWN,
  PHOTO_FRAME,
  PLAYER_LIGHT_RADIUS,
  SIGNAL_NOTICE_RADIUS,
} from '../config';
import { CRIATURAS, REGISTROS, type Registro, SECTORES, type Sector } from '../content';
import { Creature } from '../entities/Creature';
import { Player } from '../entities/Player';
import { type LightSource, LightingLayer, type LightStamp } from '../systems/Lighting';
import { type Gate, readSectorObjects, type SectorObjects } from '../systems/MapObjects';
import { type PhotoScore, scoreCreature } from '../systems/Photo';
import { individualKey, Progress } from '../systems/Progress';
import { Album } from '../ui/Album';
import { Bestiary } from '../ui/Bestiary';
import { Hud } from '../ui/Hud';
import { modalGuardActive, pauseWhile } from '../ui/modal';
import { clearUi } from '../ui/overlay';
import { RegistroPanel } from '../ui/RegistroPanel';
import { FRAME_SCREEN, Visor } from '../ui/Visor';

// Fuente provisional: la fuente pixel con tildes/ñ y licencia verificada está pendiente (§9.6).
const FONT_FAMILY = 'monospace';

/** Baliza placeholder (§3): apagada en alerta, encendida en bioluminiscencia. */
const BEACON = { width: 12, height: 20, off: { fill: 'alert0', border: 'alert1' }, on: { fill: 'bio1', border: 'bio3' } } as const;

export interface StationData {
  sector?: string;
  /** Punto de aparición (`inicio`, `desde-<sector>`, `baliza`). */
  entrada?: string;
}

type Interactable = { kind: 'terminal'; registro: Registro } | { kind: 'baliza' };

/**
 * Un sector de la estación. El mapa se carga con el id del sector como clave (ver PreloadScene);
 * la convención de capas y objetos está en systems/MapObjects.ts. Las compuertas reinician esta
 * escena con otro sector.
 */
export class StationScene extends Phaser.Scene {
  private sector!: Sector;
  private objects!: SectorObjects;
  private player!: Player;
  private creatures: Creature[] = [];
  private bounds!: { width: number; height: number };
  private lighting!: LightingLayer;
  private beacon: { border: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle } | null = null;

  private progress!: Progress;
  private hud!: Hud;
  private visor!: Visor;
  private album!: Album;
  private bestiary!: Bestiary;
  private registroPanel!: RegistroPanel;
  private keys!: Record<'camera' | 'shoot' | 'flashlight' | 'album' | 'bestiary' | 'interact', Phaser.Input.Keyboard.Key>;

  // La escena se reutiliza al cruzar compuertas: todo el estado se reinicia en create().
  private cameraMode = false;
  private flashlightOn = false;
  private photoCooldown = 0;
  private leaving = false;
  /** Compuerta sellada ya anunciada (no repetir mientras el jugador siga delante). */
  private gateNotified: Gate | null = null;
  /** Señales ya anunciadas (§7); se olvidan al alejarse. */
  private signalsNotified = new Set<Creature>();

  constructor() {
    super('Station');
  }

  create(data: StationData): void {
    this.cameraMode = false;
    this.photoCooldown = 0;
    this.leaving = false;
    this.gateNotified = null;
    this.signalsNotified = new Set();
    this.flashlightOn = this.registry.get('linterna') === true;
    this.cameras.main.setBackgroundColor(PALETTE.void0);

    const sector = SECTORES.find((s) => s.id === data.sector);
    if (!sector?.mapa) throw new Error(`Sector "${data.sector}" inexistente o sin mapa`);
    this.sector = sector;

    const map = this.make.tilemap({ key: sector.id });
    const tileset = map.addTilesetImage('estacion-placeholder', 'estacion-placeholder');
    if (!tileset) throw new Error('Tileset "estacion-placeholder" no encontrado en el mapa');

    map.createLayer('suelo', tileset);
    const walls = map.createLayer('paredes', tileset);
    if (!walls) throw new Error('Capa "paredes" no encontrada en el mapa');
    walls.setCollisionByProperty({ colisiona: true });

    this.objects = readSectorObjects(map);
    const start = this.objects.spawns.get(data.entrada ?? 'inicio') ?? this.objects.spawns.get('inicio');
    this.player = new Player(this, start?.x ?? map.widthInPixels / 2, start?.y ?? map.heightInPixels / 2);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.add.collider(this.player.collider, walls);

    this.creatures = this.spawnCreatures();
    this.beacon = this.objects.baliza ? this.buildBeacon(this.objects.baliza) : null;
    this.lighting = new LightingLayer(this);

    this.bounds = { width: map.widthInPixels, height: map.heightInPixels };
    this.centerCameraOnPlayer();

    this.setupUi();
    this.hud.setSector(sector.nombre);
    this.hud.showMessage(sector.nombre.toUpperCase());
    this.updateBeacon();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.photoCooldown = Math.max(0, this.photoCooldown - dt);

    const album = Phaser.Input.Keyboard.JustDown(this.keys.album);
    const bestiary = Phaser.Input.Keyboard.JustDown(this.keys.bestiary);
    const interact = Phaser.Input.Keyboard.JustDown(this.keys.interact);
    if (!modalGuardActive()) {
      if (album) return this.openModal((done) => this.album.open(this.progress, done));
      if (bestiary) return this.openModal((done) => this.bestiary.open({ tipo: 'juego', progress: this.progress }, null, done));
      if (interact && this.interact()) return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.camera)) this.setCameraMode(!this.cameraMode);
    if (Phaser.Input.Keyboard.JustDown(this.keys.flashlight)) this.setFlashlight(!this.flashlightOn);
    if (Phaser.Input.Keyboard.JustDown(this.keys.shoot)) this.takePhoto();

    this.player.update();
    const threat = { x: this.player.centerX, y: this.player.centerY, noisy: this.player.noisy };
    for (const c of this.creatures) c.update(dt, threat);
    this.followPlayer();

    this.checkGates();
    this.checkSignals();
    this.hud.setPrompt(this.promptFor(this.nearestInteractable()));
    if (this.cameraMode) this.visor.setTarget(this.bestTarget());
    this.lighting.draw(this.cameras.main, this.lightStamps());
  }

  // --- UI ---

  private setupUi(): void {
    clearUi();
    this.progress = new Progress(CRIATURAS);
    this.hud = new Hud();
    this.visor = new Visor();
    this.album = new Album(CRIATURAS);
    this.bestiary = new Bestiary();
    this.registroPanel = new RegistroPanel();
    this.hud.setIndex(this.progress.restaurados, this.progress.total);
    this.hud.setFlashlight(this.flashlightOn);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard!.addKeys({
      camera: K.C,
      shoot: K.SPACE,
      flashlight: K.F,
      album: K.Q,
      bestiary: K.TAB,
      interact: K.E,
    }) as StationScene['keys'];

    // Clic derecho: modo cámara. Clic izquierdo: foto (solo en modo cámara).
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.setCameraMode(!this.cameraMode);
      else if (p.leftButtonDown()) this.takePhoto();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearUi);
  }

  /** Álbum, bestiario o registro: pausa el juego y oculta HUD y visor mientras el overlay está abierto. */
  private openModal(show: (done: () => void) => void): void {
    this.hud.setVisible(false);
    this.visor.setVisible(false);
    pauseWhile(this, show, () => {
      this.hud.setVisible(true);
      this.visor.setVisible(this.cameraMode);
    });
  }

  // --- Fotografía (§4) ---

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
    this.registry.set('linterna', on);
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

    const wasComplete = this.progress.completo;
    const scores = this.scoreAll().filter((s) => s.estrellas > 0);
    const { mejoradas, desbloqueos } = this.progress.record(scores);
    this.hud.showPhoto(scores, desbloqueos);
    this.hud.setIndex(this.progress.restaurados, this.progress.total);

    if (!wasComplete && this.progress.completo) {
      this.hud.showMessage('CENSO COMPLETO', 'LA BALIZA DEL MUELLE ESPERA SEÑAL');
      this.updateBeacon();
    }

    // Miniatura del álbum: el contenido del marco tal como se ve en el canvas (sin la capa HTML).
    if (mejoradas.length) {
      this.game.renderer.snapshotArea(FRAME_SCREEN.x, FRAME_SCREEN.y, PHOTO_FRAME.width, PHOTO_FRAME.height, (img) => {
        if (img instanceof HTMLImageElement) this.progress.setFoto(mejoradas, img.src);
      });
    }
  }

  // --- Criaturas y señales ---

  /**
   * Crea los individuos de cada criatura del sector a partir de content/ (§8). Si hay varias zonas
   * con el id de la criatura, cada individuo va a una (en orden); si no hay ninguna, a las genéricas.
   */
  private spawnCreatures(): Creature[] {
    const zonas = this.objects.zones;
    const genericas = zonas.filter((z) => z.name === '');
    const result: Creature[] = [];

    for (const datos of CRIATURAS) {
      if (datos.sector !== this.sector.id) continue;

      const propias = zonas.filter((z) => z.name === datos.id);
      if (!propias.length && !genericas.length) {
        console.warn(`[station] "${datos.id}": el mapa de "${this.sector.id}" no tiene zona propia ni genérica`);
        continue;
      }

      const group: Agent[] = [];
      const points = this.objects.points.get(datos.id) ?? [];
      const n = datos.individuos ?? 1;
      for (let i = 0; i < n; i++) {
        const key = individualKey(datos.id, i);
        const zona = propias.length ? propias[i % propias.length] : new Phaser.Math.RandomDataGenerator([key]).pick(genericas);
        result.push(new Creature(this, datos, zona.rect, key, group, points));
      }
    }
    return result;
  }

  /** Al acercarse a una señal no identificada, el Registro la anuncia una vez (§7). */
  private checkSignals(): void {
    for (const c of this.creatures) {
      if (!c.isSignal) continue;
      const d = Math.hypot(c.centerX - this.player.centerX, c.centerY - this.player.centerY);
      if (d < SIGNAL_NOTICE_RADIUS && !this.signalsNotified.has(c)) {
        this.signalsNotified.add(c);
        this.hud.showMessage('SEÑAL NO IDENTIFICADA', 'Firma desconocida. Sin datos.');
      } else if (d > SIGNAL_NOTICE_RADIUS * 1.5) {
        this.signalsNotified.delete(c);
      }
    }
  }

  // --- Compuertas (§3) ---

  /** Cruzar una compuerta exige ÍNDICE RESTAURADO ≥ `fotos_requeridas` del sector destino. */
  private checkGates(): void {
    if (this.leaving) return;
    const feet = this.player.feetRect;
    const gate = this.objects.gates.find((g) => Phaser.Geom.Intersects.RectangleToRectangle(g.rect, feet));
    if (!gate) {
      this.gateNotified = null;
      return;
    }

    const dest = SECTORES.find((s) => s.id === gate.destino);
    const need = dest?.fotos_requeridas ?? 0;
    if (dest?.mapa && this.progress.restaurados >= need) {
      this.leaving = true;
      this.scene.restart({ sector: dest.id, entrada: gate.entrada } satisfies StationData);
      return;
    }
    if (this.gateNotified === gate) return;
    this.gateNotified = gate;
    if (!dest?.mapa) this.hud.showMessage('COMPUERTA SIN SALIDA');
    else this.hud.showMessage(`COMPUERTA SELLADA · ${dest.nombre.toUpperCase()}`, `REQUIERE ÍNDICE ${need} · ACTUAL ${this.progress.restaurados}`);
  }

  // --- Interacción (E): monolitos/terminales y baliza ---

  private nearestInteractable(): Interactable | null {
    const px = this.player.centerX;
    const py = this.player.drawY;
    const near = (x: number, y: number) => Math.hypot(x - px, y - py) <= INTERACT_RADIUS;

    for (const t of this.objects.terminals) {
      const registro = REGISTROS.find((r) => r.id === t.registro);
      if (registro && near(t.x, t.y)) return { kind: 'terminal', registro };
    }
    const b = this.objects.baliza;
    if (b && near(b.x, b.y + BEACON.height / 2)) return { kind: 'baliza' };
    return null;
  }

  private promptFor(target: Interactable | null): string | null {
    if (!target) return null;
    if (target.kind === 'terminal') return `E LEER · ${target.registro.titulo.toUpperCase()}`;
    return this.progress.completo ? 'E REACTIVAR BALIZA' : `BALIZA INACTIVA · ÍNDICE ${this.progress.restaurados} / ${this.progress.total}`;
  }

  /** true si se usó algo (y la escena dejó de actualizarse este frame). */
  private interact(): boolean {
    const target = this.nearestInteractable();
    if (!target) return false;
    if (target.kind === 'terminal') {
      this.openModal((done) => this.registroPanel.open(target.registro, done));
      return true;
    }
    if (!this.progress.completo) {
      this.hud.showMessage('LA BALIZA NO RESPONDE', `CENSO INCOMPLETO · ${this.progress.restaurados} / ${this.progress.total}`);
      return false;
    }
    this.scene.start('End');
    return true;
  }

  private buildBeacon(at: { x: number; y: number }) {
    const x = Math.round(at.x - BEACON.width / 2);
    const y = Math.round(at.y);
    const border = this.add.rectangle(x, y, BEACON.width, BEACON.height, PALETTE[BEACON.off.border]).setOrigin(0).setDepth(y + BEACON.height);
    const fill = this.add.rectangle(x + 1, y + 1, BEACON.width - 2, BEACON.height - 2, PALETTE[BEACON.off.fill]).setOrigin(0).setDepth(y + BEACON.height);
    const label = this.add.text(0, 0, 'BALIZA', { fontFamily: FONT_FAMILY, fontSize: '8px', color: css('text') });
    label.setPosition(Math.round(at.x - label.width / 2), y - Math.ceil(label.height) - 1).setDepth(y + BEACON.height);
    return { border, fill };
  }

  private updateBeacon(): void {
    if (!this.beacon) return;
    const c = this.progress.completo ? BEACON.on : BEACON.off;
    this.beacon.border.setFillStyle(PALETTE[c.border]);
    this.beacon.fill.setFillStyle(PALETTE[c.fill]);
  }

  // --- Iluminación (§9.5) ---

  private lightStamps(): LightStamp[] {
    const px = this.player.centerX;
    const py = this.player.centerY;
    const stamps: LightStamp[] = [{ x: px, y: py, radio: PLAYER_LIGHT_RADIUS }];
    if (this.flashlightOn) stamps.push({ x: px, y: py, facing: this.player.facing });
    for (const l of this.objects.lights) stamps.push({ x: l.x, y: l.y, radio: l.radio });
    for (const c of this.creatures) {
      if (c.datos.luz_propia && c.visible) stamps.push({ x: c.centerX, y: c.centerY, radio: CREATURE_LIGHT_RADIUS });
    }
    const b = this.objects.baliza;
    if (b && this.progress.completo) stamps.push({ x: b.x, y: b.y + BEACON.height / 2, radio: CREATURE_LIGHT_RADIUS * 2 });
    return stamps;
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
