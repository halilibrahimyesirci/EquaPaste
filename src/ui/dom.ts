// Tiny hyperscript helper for building page UI without a framework.
type Props = {
  class?: string;
  text?: string;
  html?: string;
  on?: Record<string, EventListener>;
  [attr: string]: unknown;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props,
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props) {
    const { class: cls, text, html, on, ...attrs } = props;
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    if (html != null) node.innerHTML = html;
    for (const [k, v] of Object.entries(attrs)) {
      if (v != null && v !== false) node.setAttribute(k, String(v));
    }
    if (on) for (const [evt, fn] of Object.entries(on)) node.addEventListener(evt, fn);
  }
  for (const c of children) node.append(c);
  return node;
}

/** Apply the user's theme preference to a page (auto follows the OS). */
export function applyTheme(mode: 'auto' | 'light' | 'dark'): void {
  if (mode === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
}
