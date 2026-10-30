// Bestiario (§4, §13): índice de la documentación como overlay HTML. Texto seleccionable y comandos copiables.
// - Modo juego (Tab): cada ficha muestra solo los niveles desbloqueados con fotos.
// - Modo directo (título o /#/bestiario/<id>): todo desbloqueado, sin jugar.
import { type Criatura, CRIATURAS, SECTORES } from '../content';
import { isEmptySection, splitSections } from '../content/sections';
import type { Progress } from '../systems/Progress';
import { stars } from './Hud';
import { renderMarkdown } from './markdown';
import { el, uiRoot } from './overlay';

export type BestiaryMode = { tipo: 'directo' } | { tipo: 'juego'; progress: Progress };

const ROUTE = /^#\/bestiario(?:\/([\w-]+))?\/?$/;
const SCROLL_STEP = 64;

/** Lee `#/bestiario` o `#/bestiario/<id>`. null si el hash no es una ruta del bestiario. */
export function parseBestiaryRoute(hash: string): { id: string | null } | null {
  const m = ROUTE.exec(hash);
  return m ? { id: m[1] ?? null } : null;
}

const ESTADO_LABEL: Record<Criatura['estado'], string> = {
  confirmado: 'CONFIRMADO',
  en_construccion: 'EN CONSTRUCCIÓN',
  planeado: 'PLANEADO',
};

export class Bestiary {
  private readonly root: HTMLDivElement;
  private readonly modeTag: HTMLSpanElement;
  private readonly list: HTMLDivElement;
  private readonly ficha: HTMLDivElement;
  private mode: BestiaryMode = { tipo: 'directo' };
  private orden: Criatura[] = [];
  private selected: string | null = null;
  private onClose: (() => void) | null = null;

  constructor() {
    this.root = el('div', 'bestiary hidden', uiRoot());
    const head = el('div', 'bestiary-head', this.root);
    el('span', 'title', head).textContent = 'BESTIARIO';
    this.modeTag = el('span', 'mode', head);
    el('span', 'keys', head).textContent = '↑↓ CRIATURA · RE/AV PÁG DESPLAZAR · ESC CERRAR';
    const body = el('div', 'bestiary-body', this.root);
    this.list = el('div', 'bestiary-list', body);
    this.ficha = el('div', 'bestiary-ficha', body);
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(mode: BestiaryMode, id: string | null, onClose: () => void): void {
    this.mode = mode;
    this.onClose = onClose;
    // En el juego no aparecen los componentes planeados (son señales no identificadas, Fase 5).
    const visibles = CRIATURAS.filter((c) => mode.tipo === 'directo' || c.estado !== 'planeado');
    const sectorIdx = (c: Criatura) => SECTORES.findIndex((s) => s.id === c.sector);
    this.orden = [...visibles].sort((a, b) => sectorIdx(a) - sectorIdx(b));

    this.modeTag.textContent = mode.tipo === 'directo' ? 'DOCUMENTACIÓN COMPLETA' : 'CENSO';
    this.root.classList.remove('hidden');
    window.addEventListener('keydown', this.onKey);
    this.select(this.orden.some((c) => c.id === id) ? id : (this.orden[0]?.id ?? null));
  }

  close(): void {
    this.root.classList.add('hidden');
    window.removeEventListener('keydown', this.onKey);
    if (this.mode.tipo === 'directo' && parseBestiaryRoute(location.hash)) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  private nivel(id: string): number {
    return this.mode.tipo === 'directo' ? 3 : this.mode.progress.nivel(id);
  }

  private select(id: string | null): void {
    this.selected = id;
    if (id && this.mode.tipo === 'directo') history.replaceState(null, '', `#/bestiario/${id}`);
    this.renderList();
    this.renderFicha();
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    const idx = this.orden.findIndex((c) => c.id === this.selected);
    switch (e.code) {
      case 'Escape':
      case 'Tab':
      case 'KeyB':
        this.close();
        break;
      case 'ArrowDown':
        this.select(this.orden[Math.min(this.orden.length - 1, idx + 1)]?.id ?? null);
        break;
      case 'ArrowUp':
        this.select(this.orden[Math.max(0, idx - 1)]?.id ?? null);
        break;
      case 'PageDown':
        this.ficha.scrollTop += SCROLL_STEP;
        break;
      case 'PageUp':
        this.ficha.scrollTop -= SCROLL_STEP;
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  private renderList(): void {
    this.list.replaceChildren();
    let sector = '';
    for (const c of this.orden) {
      if (c.sector !== sector) {
        sector = c.sector;
        el('div', 'group', this.list).textContent = SECTORES.find((s) => s.id === sector)?.nombre ?? sector;
      }
      const nivel = this.nivel(c.id);
      const item = el('button', `item${c.id === this.selected ? ' selected' : ''}`, this.list);
      item.type = 'button';
      item.textContent = nivel > 0 ? c.nombre : '???';
      if (this.mode.tipo === 'juego' && nivel > 0) el('span', 'stars', item).textContent = ` ${stars(nivel)}`;
      item.addEventListener('click', () => this.select(c.id));
      if (c.id === this.selected) item.scrollIntoView({ block: 'nearest' });
    }
  }

  private renderFicha(): void {
    this.ficha.replaceChildren();
    this.ficha.scrollTop = 0;
    const c = this.orden.find((x) => x.id === this.selected);
    if (!c) {
      el('p', 'empty', this.ficha).textContent = 'SIN ENTRADAS.';
      return;
    }

    const nivel = this.nivel(c.id);
    if (nivel === 0) {
      el('h2', '', this.ficha).textContent = '???';
      el('p', 'empty', this.ficha).textContent = 'ENTRADA PERDIDA. FOTOGRAFÍA ESTA CRIATURA PARA RESTAURARLA.';
      return;
    }

    const head = el('div', 'ficha-head', this.ficha);
    el('h2', '', head).textContent = c.nombre;
    if (this.mode.tipo === 'juego') el('span', 'stars', head).textContent = stars(nivel);
    el('div', 'especie', this.ficha).textContent = c.especie;

    const datos = el('dl', 'datos', this.ficha);
    const fila = (k: string, v: string, cls = '') => {
      el('dt', '', datos).textContent = k;
      el('dd', cls, datos).textContent = v;
    };
    fila('COMPONENTE', c.componente);
    fila('SECTOR', SECTORES.find((s) => s.id === c.sector)?.nombre ?? c.sector);
    fila('ESTADO', ESTADO_LABEL[c.estado], `estado-${c.estado}`);
    fila('INDIVIDUOS', c.individuos === null ? '???' : String(c.individuos));

    const secciones = splitSections(c.cuerpo);
    for (let n = 1; n <= 3; n++) {
      const sec = el('section', 'nivel', this.ficha);
      el('h3', '', sec).textContent = '★'.repeat(n);
      if (nivel < n) {
        el('p', 'locked', sec).textContent = `BLOQUEADO · REQUIERE UNA FOTO DE ${'★'.repeat(n)}`;
        continue;
      }
      renderMarkdown(sec, secciones.niveles[n - 1]);
      if (n === 2) this.renderRelaciones(sec, c);
    }

    if (!isEmptySection(secciones.registro)) {
      const reg = el('section', 'registro', this.ficha);
      el('h3', '', reg).textContent = 'REGISTRO';
      renderMarkdown(reg, secciones.registro);
    }
  }

  /** Relaciones (§4 ★★): enlaces a otras fichas. En el juego, las no fotografiadas salen como ???. */
  private renderRelaciones(parent: HTMLElement, c: Criatura): void {
    const rels = c.relaciones.map((id) => CRIATURAS.find((x) => x.id === id)).filter((x): x is Criatura => !!x);
    if (!rels.length) return;
    const p = el('p', 'relaciones', parent);
    p.append('RELACIONES: ');
    rels.forEach((r, i) => {
      if (i) p.append(' · ');
      const navegable = this.orden.includes(r) && this.nivel(r.id) > 0;
      if (!navegable) {
        p.append('???');
        return;
      }
      const a = el('button', 'link', p);
      a.type = 'button';
      a.textContent = r.nombre;
      a.addEventListener('click', () => this.select(r.id));
    });
  }
}
