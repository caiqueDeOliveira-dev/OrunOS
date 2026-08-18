/** Comparação por valor pra dados JSON-serializáveis (o formato de tudo em @orun/settings). */
export function deepEqualJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
