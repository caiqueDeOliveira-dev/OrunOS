/**
 * @orun/settings — utilitários de dot-path
 * Ex: getByPath(obj, "desktop.windowBounds.width")
 */

export function getByPath<T = unknown>(obj: unknown, path: string): T | undefined {
  const parts = path.split('.');
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur as T;
}

export function setByPath(obj: Record<string, any>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof cur[part] !== 'object' || cur[part] === null) {
      cur[part] = {};
    }
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}
