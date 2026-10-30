// Progreso del censo (§3) y niveles de ficha desbloqueados (§4).
import type { Criatura } from '../content';
import { loadSave, type SaveData, writeSave } from './Save';
import type { PhotoScore } from './Photo';

export interface Unlock {
  criatura: Criatura;
  estrellas: number;
  /** Nivel de ficha anterior (0 = sin foto). */
  antes: number;
}

export class Progress {
  private readonly data: SaveData;
  /** Individuos que cuentan para el objetivo: los de criaturas `confirmado` (§2.3). Se calcula desde content/. */
  private readonly objetivo: Set<string>;

  constructor(criaturas: Criatura[]) {
    this.data = loadSave();
    this.objetivo = new Set(
      criaturas
        .filter((c) => c.estado === 'confirmado')
        .flatMap((c) => Array.from({ length: c.individuos ?? 1 }, (_, i) => individualKey(c.id, i))),
    );
  }

  /** Total del objetivo: `ÍNDICE RESTAURADO restaurados / total`. */
  get total(): number {
    return this.objetivo.size;
  }

  get restaurados(): number {
    return this.data.individuos.filter((k) => this.objetivo.has(k)).length;
  }

  /** Censo completo: todos los individuos confirmados fotografiados (§3). */
  get completo(): boolean {
    return this.total > 0 && this.restaurados >= this.total;
  }

  /** Nivel de ficha desbloqueado (0–3). */
  nivel(id: string): number {
    return this.data.criaturas[id]?.estrellas ?? 0;
  }

  foto(id: string): string | null {
    return this.data.criaturas[id]?.foto ?? null;
  }

  /**
   * Registra una foto. Devuelve las criaturas cuya mejor foto cambia (para guardar la miniatura con
   * `setFoto`) y los niveles nuevos desbloqueados.
   */
  record(scores: PhotoScore[]): { mejoradas: string[]; desbloqueos: Unlock[] } {
    const mejoradas: string[] = [];
    const desbloqueos: Unlock[] = [];

    // Mejores primero: si salen dos individuos de la misma criatura, manda el de más ★.
    for (const s of [...scores].sort((a, b) => b.estrellas - a.estrellas)) {
      if (s.estrellas === 0) continue;
      const c = s.creature.datos;
      const antes = this.nivel(c.id);

      if (!this.data.individuos.includes(s.creature.key)) this.data.individuos.push(s.creature.key);
      // Empate: la foto nueva reemplaza a la anterior (el álbum muestra la más reciente de las mejores).
      if (s.estrellas >= antes && !mejoradas.includes(c.id)) {
        this.data.criaturas[c.id] = { estrellas: s.estrellas, foto: this.foto(c.id) };
        mejoradas.push(c.id);
      }
      if (s.estrellas > antes) desbloqueos.push({ criatura: c, estrellas: s.estrellas, antes });
    }

    writeSave(this.data);
    return { mejoradas, desbloqueos };
  }

  setFoto(ids: string[], dataUrl: string): void {
    for (const id of ids) {
      const entry = this.data.criaturas[id];
      if (entry) entry.foto = dataUrl;
    }
    writeSave(this.data);
  }
}

export function individualKey(id: string, index: number): string {
  return `${id}#${index}`;
}
