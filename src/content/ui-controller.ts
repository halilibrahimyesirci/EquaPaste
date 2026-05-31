import { PILL_MENU_ORDER, getTarget } from '../core/targets';
import type { TargetId } from '../core/types';
import type { PillSide } from '../shared/settings';
import type { DetectedEquation } from './detect-equations';
import { themeForElement } from './theme';
import type { CopyResult } from './copy';

export interface ControllerCallbacks {
  onCopy(eq: DetectedEquation, targetId: TargetId): Promise<CopyResult>;
  getDefaultTarget(): TargetId;
  getPillSide(): PillSide;
  onOpenSettings(): void;
}

const KBD: Partial<Record<TargetId, string>> = { word: '⌥⇧E', latex: '⌥⇧L' };
const PILL_HEIGHT = 28;
const GAP = 6;
const HIDE_DELAY = 160;
const CONFIRM_MS = 1500;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** Owns the single floating highlight + pill + menu that follow the hovered equation. */
export class PillController {
  private readonly root: HTMLElement;
  private readonly highlight: HTMLElement;
  private readonly pill: HTMLElement;
  private readonly mainBtn: HTMLButtonElement;
  private readonly icon: HTMLElement;
  private readonly label: HTMLElement;
  private readonly caret: HTMLButtonElement;
  private readonly menu: HTMLElement;
  private readonly live: HTMLElement;

  private current: DetectedEquation | null = null;
  private hideTimer = 0;
  private confirmTimer = 0;
  private rafQueued = false;
  private menuOpen = false;

  constructor(
    container: HTMLElement,
    private readonly cb: ControllerCallbacks,
  ) {
    this.root = container;
    this.root.classList.add('ep-root');

    this.highlight = el('div', 'ep-highlight');

    this.pill = el('div', 'ep-pill', { role: 'group', 'aria-label': 'EquaPaste' });
    this.mainBtn = el('button', 'ep-pill__main', { type: 'button' });
    this.icon = el('span', 'ep-pill__icon');
    this.icon.textContent = 'Σ';
    this.label = el('span', 'ep-pill__label');
    this.mainBtn.append(this.icon, this.label);
    this.caret = el('button', 'ep-pill__caret', {
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-label': 'More copy options',
    });
    this.caret.textContent = '▾';
    this.pill.append(this.mainBtn, this.caret);

    this.menu = el('div', 'ep-menu', { role: 'menu' });
    this.menu.hidden = true;

    this.live = el('div', '', { role: 'status', 'aria-live': 'polite' });
    Object.assign(this.live.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      whiteSpace: 'nowrap',
    });

    this.root.append(this.highlight, this.pill, this.menu, this.live);
    this.wire();
  }

  // ---- public API used by content/index ----
  showFor(eq: DetectedEquation): void {
    window.clearTimeout(this.hideTimer);
    const changed = this.current?.anchor !== eq.anchor;
    this.current = eq;
    if (changed) {
      this.closeMenu();
      this.resetPill();
      this.root.dataset.epTheme = themeForElement(eq.anchor);
      this.renderDefaultLabel();
    }
    this.reposition();
    this.highlight.classList.add('is-visible');
    this.pill.classList.add('is-visible');
  }

  scheduleHide(): void {
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      if (!this.menuOpen) this.hide();
    }, HIDE_DELAY);
  }

  hide(): void {
    this.highlight.classList.remove('is-visible');
    this.pill.classList.remove('is-visible');
    this.closeMenu();
    this.current = null;
  }

  /** Trigger the default-target copy for an equation (whole-block click / shortcut). */
  copyDefault(eq: DetectedEquation): void {
    this.showFor(eq);
    void this.runCopy(this.cb.getDefaultTarget());
  }

  copyTarget(eq: DetectedEquation, target: TargetId): void {
    this.showFor(eq);
    void this.runCopy(target);
  }

  /** True if the event originated inside our shadow UI (uses composedPath so
   *  shadow-retargeted targets are recognised). */
  isOwnEvent(e: Event): boolean {
    return e.composedPath().includes(this.root);
  }

  reposition(): void {
    if (this.rafQueued) return;
    this.rafQueued = true;
    requestAnimationFrame(() => {
      this.rafQueued = false;
      if (!this.current) return;
      const r = this.current.anchor.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        this.hide();
        return;
      }
      const pad = 3;
      Object.assign(this.highlight.style, {
        top: `${r.top - pad}px`,
        left: `${r.left - pad}px`,
        width: `${r.width + pad * 2}px`,
        height: `${r.height + pad * 2}px`,
      });

      const pw = this.pill.offsetWidth || 120;
      let top = r.top - PILL_HEIGHT - GAP;
      if (top < 4) top = r.top + GAP;
      let left = this.cb.getPillSide() === 'top-left' ? r.left : r.right - pw;
      left = Math.max(4, Math.min(left, window.innerWidth - pw - 4));
      this.pill.style.top = `${top}px`;
      this.pill.style.left = `${left}px`;

      if (this.menuOpen) this.positionMenu(top, left, pw);
    });
  }

  destroy(): void {
    window.clearTimeout(this.hideTimer);
    window.clearTimeout(this.confirmTimer);
  }

  // ---- internals ----
  private wire(): void {
    this.mainBtn.addEventListener('click', () => void this.runCopy(this.cb.getDefaultTarget()));
    this.caret.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.menuOpen) this.closeMenu();
      else this.openMenu();
    });
    // keep visible while the pointer is over our UI
    for (const node of [this.pill, this.menu]) {
      node.addEventListener('pointerenter', () => window.clearTimeout(this.hideTimer));
      node.addEventListener('pointerleave', () => this.scheduleHide());
    }
    this.menu.addEventListener('keydown', (e) => this.onMenuKeydown(e));
  }

  private renderDefaultLabel(): void {
    const t = getTarget(this.cb.getDefaultTarget());
    this.label.textContent = `Copy to ${t.menuLabel}`;
    this.mainBtn.setAttribute('aria-label', `Copy equation to ${t.label}`);
  }

  private resetPill(): void {
    window.clearTimeout(this.confirmTimer);
    this.pill.classList.remove('is-success', 'is-error');
    this.icon.textContent = 'Σ';
  }

  private async runCopy(target: TargetId): Promise<void> {
    const eq = this.current;
    if (!eq) return;
    this.closeMenu();
    const result = await this.cb.onCopy(eq, target);
    this.confirm(result);
  }

  private confirm(result: CopyResult): void {
    window.clearTimeout(this.confirmTimer);
    const name = result.target.menuLabel;
    if (result.ok) {
      this.pill.classList.remove('is-error');
      this.pill.classList.add('is-success');
      this.icon.textContent = '✓';
      if (result.fellBackToLatex) {
        this.label.textContent = `Copied LaTeX`;
        this.announce(`Couldn't convert — copied the raw LaTeX instead.`);
      } else {
        this.label.textContent = `Copied to ${name}`;
        this.announce(`Copied to ${result.target.label}.`);
      }
    } else {
      this.pill.classList.add('is-error');
      this.icon.textContent = '!';
      this.label.textContent = `Copy failed`;
      this.announce(result.error ?? 'Copy failed.');
    }
    this.confirmTimer = window.setTimeout(() => {
      this.resetPill();
      this.renderDefaultLabel();
    }, CONFIRM_MS);
  }

  private announce(msg: string): void {
    this.live.textContent = '';
    window.setTimeout(() => (this.live.textContent = msg), 60);
  }

  private buildMenu(): void {
    this.menu.replaceChildren();
    const def = this.cb.getDefaultTarget();
    // Curated distinct formats, plus the user's default if it isn't one of them.
    const ids = PILL_MENU_ORDER.includes(def) ? PILL_MENU_ORDER : [def, ...PILL_MENU_ORDER];
    for (const id of ids) {
      const t = getTarget(id);
      const item = el('button', 'ep-menu__item', { type: 'button', role: 'menuitem' });
      if (t.note) item.title = t.note;
      const left = el('span');
      left.textContent = `${id === def ? '✓ ' : ''}Copy to ${t.menuLabel}`;
      if (id === def) left.classList.add('ep-check');
      const right = el('span', 'ep-menu__kbd');
      // Surface low/medium-confidence caveats inline (e.g. Google Docs → image).
      right.textContent = KBD[id] ?? (t.confidence !== 'high' ? '•' : '');
      if (t.confidence !== 'high') right.title = t.note ?? '';
      item.append(left, right);
      item.addEventListener('click', () => void this.runCopy(id));
      this.menu.append(item);
    }
    this.menu.append(el('div', 'ep-menu__sep'));
    const settings = el('button', 'ep-menu__item', { type: 'button', role: 'menuitem' });
    settings.textContent = '⚙ EquaPaste settings';
    settings.addEventListener('click', () => {
      this.closeMenu();
      this.cb.onOpenSettings();
    });
    this.menu.append(settings);
  }

  private openMenu(): void {
    this.buildMenu();
    this.menu.hidden = false;
    this.menuOpen = true;
    this.caret.setAttribute('aria-expanded', 'true');
    // position relative to current pill box
    const top = parseFloat(this.pill.style.top) || 0;
    const left = parseFloat(this.pill.style.left) || 0;
    this.positionMenu(top, left, this.pill.offsetWidth);
    requestAnimationFrame(() => this.menu.classList.add('is-open'));
    this.menu.querySelector<HTMLButtonElement>('.ep-menu__item')?.focus();
  }

  private closeMenu(): void {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.menu.classList.remove('is-open');
    this.menu.hidden = true;
    this.caret.setAttribute('aria-expanded', 'false');
  }

  private positionMenu(pillTop: number, pillLeft: number, pillWidth: number): void {
    const mw = this.menu.offsetWidth || 208;
    let top = pillTop + PILL_HEIGHT + 6;
    let left = pillLeft + pillWidth - mw; // right-align to the pill
    left = Math.max(4, Math.min(left, window.innerWidth - mw - 4));
    if (top + this.menu.offsetHeight > window.innerHeight - 4) {
      top = Math.max(4, pillTop - this.menu.offsetHeight - 6);
    }
    this.menu.style.top = `${top}px`;
    this.menu.style.left = `${left}px`;
  }

  private onMenuKeydown(e: KeyboardEvent): void {
    const items = [...this.menu.querySelectorAll<HTMLButtonElement>('.ep-menu__item')];
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeMenu();
      this.caret.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[Math.max(idx - 1, 0)]?.focus();
    }
  }
}
