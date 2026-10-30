import * as Phaser from 'phaser';
import { css, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import { CRIATURAS, SECTORES } from '../content';
import { Progress } from '../systems/Progress';
import { clearUi } from '../ui/overlay';
import type { StationData } from './StationScene';

// Fuente provisional: la fuente pixel con tildes/ñ y licencia verificada está pendiente (§9.6).
const FONT_FAMILY = 'monospace';

/** Pantalla final (§3): censo completo, baliza reactivada. */
export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create(): void {
    clearUi();
    this.cameras.main.setBackgroundColor(PALETTE.void0);
    const progress = new Progress(CRIATURAS);
    const especies = CRIATURAS.filter((c) => c.estado !== 'planeado');
    const completas = especies.filter((c) => progress.nivel(c.id) === 3).length;

    const line = (text: string, y: number, size: number, color: Parameters<typeof css>[0]) => {
      const t = this.add.text(0, 0, text, { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color: css(color) });
      t.setPosition(Math.floor((GAME_WIDTH - t.width) / 2), y);
    };

    line('BALIZA REACTIVADA', 64, 20, 'bio3');
    line('El Registro recupera su índice.', 100, 10, 'text');
    line(`ÍNDICE RESTAURADO ${progress.restaurados} / ${progress.total}`, 132, 10, 'amber2');
    line(`FICHAS COMPLETAS (★★★) ${completas} / ${especies.length}`, 148, 10, 'amber2');
    line('ENTER: SEGUIR EXPLORANDO · ESC: TÍTULO', GAME_HEIGHT - 40, 8, 'metal2');

    const muelle = SECTORES[0]?.id;
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Station', { sector: muelle, entrada: 'baliza' } satisfies StationData));
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Title'));
  }
}
