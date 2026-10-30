import * as Phaser from 'phaser';
import { css, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';

// Fuente provisional: la fuente pixel con tildes/ñ y licencia verificada está pendiente (§9.6).
const FONT_FAMILY = 'monospace';

/** Pantalla de título (Fase 0). Solo usa colores de la paleta y posiciones enteras. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.void0);

    this.drawStars();
    this.drawFrame();

    const title = this.add.text(0, 0, 'VOIDSTATION', {
      fontFamily: FONT_FAMILY,
      fontSize: '32px',
      color: css('amber2'),
    });
    this.placeCentered(title, 96);

    const subtitle = this.add.text(0, 0, 'ESTACIÓN A LA DERIVA', {
      fontFamily: FONT_FAMILY,
      fontSize: '10px',
      color: css('text'),
    });
    this.placeCentered(subtitle, 140);

    const prompt = this.add.text(0, 0, 'PULSA ENTER', {
      fontFamily: FONT_FAMILY,
      fontSize: '10px',
      color: css('metal2'),
    });
    this.placeCentered(prompt, 208);
    // Parpadeo lento (1 s) para no molestar; la opción de reducir parpadeos llega en §13.
    this.time.addEvent({ delay: 500, loop: true, callback: () => prompt.setVisible(!prompt.visible) });

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      this.scene.start('Station', { mapa: 'muelle' });
    };
    this.input.keyboard?.once('keydown-ENTER', start);
    this.input.keyboard?.once('keydown-SPACE', start);
    this.input.once('pointerdown', start);
  }

  /** Centra en horizontal redondeando a píxel entero (evita medio píxel con origin 0.5). */
  private placeCentered(text: Phaser.GameObjects.Text, y: number): void {
    text.setPosition(Math.floor((GAME_WIDTH - text.width) / 2), y);
  }

  /** Estrellas de 1 px con semilla fija: sirven además para comprobar la nitidez del escalado. */
  private drawStars(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['voidstation']);
    const colors = [PALETTE.void4, PALETTE.metal1, PALETTE.metal3, PALETTE.bio3];
    const g = this.add.graphics();

    for (let i = 0; i < 90; i++) {
      g.fillStyle(rng.pick(colors), 1);
      g.fillRect(rng.between(2, GAME_WIDTH - 3), rng.between(2, GAME_HEIGHT - 3), 1, 1);
    }
  }

  /** Marco de 1 px estilo terminal (§9.6), con rectángulos rellenos para no depender del trazo. */
  private drawFrame(): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.metal0, 1);
    g.fillRect(0, 0, GAME_WIDTH, 1);
    g.fillRect(0, GAME_HEIGHT - 1, GAME_WIDTH, 1);
    g.fillRect(0, 0, 1, GAME_HEIGHT);
    g.fillRect(GAME_WIDTH - 1, 0, 1, GAME_HEIGHT);
  }
}
