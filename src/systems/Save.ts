// Persistencia en localStorage (§4). Si falla (modo privado, cuota, JSON corrupto) el juego sigue sin guardar.
import { SAVE_KEY } from '../config';

export interface SaveData {
  /** Mejor resultado por criatura (id). `foto` = PNG en data URL (miniatura del álbum). */
  criaturas: Record<string, { estrellas: number; foto: string | null }>;
  /** Individuos fotografiados (`<id>#<n>`) con al menos 1 ★. */
  individuos: string[];
}

const empty = (): SaveData => ({ criaturas: {}, individuos: [] });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw) as Partial<SaveData>;
    return {
      criaturas: typeof data.criaturas === 'object' && data.criaturas ? data.criaturas : {},
      individuos: Array.isArray(data.individuos) ? data.individuos.filter((k) => typeof k === 'string') : [],
    };
  } catch (e) {
    console.warn('[save] no se pudo leer la partida:', e);
    return empty();
  }
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('[save] no se pudo guardar la partida:', e);
    return false;
  }
}
