import { setWordStrategy } from '../core/targets';
import { getSettings, onSettingsChanged, type PlatformId, type Settings } from '../shared/settings';
import { copyEquation } from './copy';
import { equationFromPoint, type DetectedEquation } from './detect-equations';
import { PillController } from './ui-controller';

export interface EquaPasteHandle {
  destroy(): void;
}

function debounce(fn: () => void, ms: number): () => void {
  let t = 0;
  return () => {
    window.clearTimeout(t);
    t = window.setTimeout(fn, ms);
  };
}

function currentPlatform(): PlatformId {
  const host = location.hostname;
  if (host.includes('claude')) return 'claude';
  if (host.includes('gemini')) return 'gemini';
  if (host.includes('perplexity')) return 'perplexity';
  if (host.includes('deepseek')) return 'deepseek';
  if (host.includes('google')) return 'google'; // gemini.google.com already returned above
  return 'chatgpt';
}

/** Wire up the in-page experience inside the shadow-root container. */
export async function initEquaPaste(container: HTMLElement): Promise<EquaPasteHandle> {
  let settings: Settings = await getSettings();
  setWordStrategy(settings.wordStrategy);
  const platform = currentPlatform();

  const active = (): boolean => settings.enabled && settings.platforms[platform];

  const controller = new PillController(container, {
    onCopy: (eq, target) => copyEquation(eq, target),
    getDefaultTarget: () => settings.defaultTarget,
    getPillSide: () => settings.pillSide,
    onOpenSettings: () => void chrome.runtime.sendMessage({ type: 'equapaste:open-options' }),
  });

  // Build marker so you can confirm in DevTools which build is actually running
  // (reload the extension AND the tab if this version looks stale).
  console.info(`[EquaPaste] ready on ${platform} — v${chrome.runtime.getManifest().version}`);

  let lastEq: DetectedEquation | null = null;

  const onPointerOver = (e: PointerEvent): void => {
    if (!active() || controller.isOwnEvent(e)) return;
    const eq = equationFromPoint(e.target);
    if (eq) {
      lastEq = eq;
      controller.showFor(eq);
    } else {
      controller.scheduleHide();
    }
  };

  const onClick = (e: MouseEvent): void => {
    if (!active() || !settings.clickEquationToCopy || e.button !== 0) return;
    if (controller.isOwnEvent(e)) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return; // don't hijack text selection
    const eq = equationFromPoint(e.target);
    if (!eq) return;
    e.preventDefault();
    e.stopPropagation();
    lastEq = eq;
    controller.copyDefault(eq);
  };

  const onReposition = (): void => controller.reposition();

  const onMessage = (msg: unknown): void => {
    const m = msg as { type?: string; command?: string };
    if (m?.type !== 'equapaste:command' || !lastEq || !active()) return;
    if (m.command === 'copy-latex') controller.copyTarget(lastEq, 'latex');
    else controller.copyTarget(lastEq, settings.defaultTarget);
  };

  const unsub = onSettingsChanged((s) => {
    settings = s;
    setWordStrategy(s.wordStrategy);
    if (!active()) controller.hide();
  });

  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('scroll', onReposition, true);
  window.addEventListener('resize', onReposition);
  chrome.runtime.onMessage.addListener(onMessage);

  // Streaming responses + SPA navigation relayout equations; reposition (and
  // self-hide if the tracked equation detached). Debounced + idempotent.
  const observer = new MutationObserver(debounce(onReposition, 150));
  observer.observe(document.body, { childList: true, subtree: true });

  return {
    destroy() {
      unsub();
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
      chrome.runtime.onMessage.removeListener(onMessage);
      observer.disconnect();
      controller.destroy();
    },
  };
}
