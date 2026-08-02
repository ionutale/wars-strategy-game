export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function button(text: string, onClick: () => void, className = "hud-btn"): HTMLButtonElement {
  const b = el("button", className, text);
  b.addEventListener("pointerdown", (ev) => { ev.stopPropagation(); onClick(); });
  return b;
}

export function injectStyles(css: string): void {
  const style = el("style");
  style.textContent = css;
  document.head.appendChild(style);
}
