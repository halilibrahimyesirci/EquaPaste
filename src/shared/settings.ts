import type { TargetId } from '../core/types';
import type { WordStrategy } from '../core/clipboard-payload';

export type PlatformId = 'chatgpt' | 'claude' | 'gemini';
export type ThemeMode = 'auto' | 'light' | 'dark';
export type PillSide = 'top-right' | 'top-left';

export interface Settings {
  /** Master on/off. */
  enabled: boolean;
  /** One-click default target for the pill body and whole-block click. */
  defaultTarget: TargetId;
  /** Chrome of our own pages; the in-page pill always auto-detects per surface. */
  theme: ThemeMode;
  /** Click anywhere on a display equation to copy (the screenshot UX). */
  clickEquationToCopy: boolean;
  /** Where the pill anchors on the equation. */
  pillSide: PillSide;
  /** Per-platform enable. */
  platforms: Record<PlatformId, boolean>;
  /** Word clipboard strategy (tunable from the options page). */
  wordStrategy: WordStrategy;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  // Word: pastes a native, editable equation (bare MathML -> Word's mml2omml).
  defaultTarget: 'word',
  theme: 'auto',
  clickEquationToCopy: true,
  pillSide: 'top-right',
  platforms: { chatgpt: true, claude: true, gemini: true },
  // Bare MathML — Word converts it to a native equation. (Power users can switch.)
  wordStrategy: 'mathml',
};

const KEY = 'settings';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(KEY);
  return mergeSettings(stored[KEY]);
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.sync.set({ [KEY]: next });
  return next;
}

/** Subscribe to settings changes. Returns an unsubscribe function. */
export function onSettingsChanged(cb: (s: Settings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
    if (area === 'sync' && changes[KEY]) cb(mergeSettings(changes[KEY].newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

function mergeSettings(value: unknown): Settings {
  const v = (value ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...v,
    platforms: { ...DEFAULT_SETTINGS.platforms, ...(v.platforms ?? {}) },
  };
}
