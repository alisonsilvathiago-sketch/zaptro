/** Ordem canónica por omissão (alinhada ao layout original). */
export const DASH_DEFAULT_WIDGET_ORDER: string[] = [
  'hero',
  'assistant',
  'kpis',
  'chart',
  'feed',
  'automation',
  'promo',
  'resources',
];

export function normalizeDashWidgetOrder<T extends string>(order: unknown, ids: readonly T[]): T[] {
  if (!Array.isArray(order)) return [...ids];
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of order) {
    if (typeof x === 'string' && (ids as readonly string[]).includes(x) && !seen.has(x as T)) {
      seen.add(x as T);
      out.push(x as T);
    }
  }
  for (const id of ids) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

export type DashLayoutSegment =
  | { key: string; kind: 'single'; id: string }
  | { key: string; kind: 'pair'; a: 'chart'; b: 'feed' };

/**
 * Agrupa chart+feed na mesma linha quando aparecem consecutivos na lista visível
 * (qualquer ordem: gráfico à esquerda, fila à direita).
 */
export function flattenDashLayoutSegments(segments: DashLayoutSegment[]): string[] {
  const out: string[] = [];
  for (const s of segments) {
    if (s.kind === 'pair') {
      out.push('chart', 'feed');
    } else {
      out.push(s.id);
    }
  }
  return out;
}

/** Reordena o array de segmentos (arrastar e largar). */
export function moveSegmentByIndex<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const n = [...arr];
  const [item] = n.splice(from, 1);
  n.splice(to, 0, item);
  return n;
}

export function buildDashLayoutSegments(visibleOrdered: string[]): DashLayoutSegment[] {
  const out: DashLayoutSegment[] = [];
  let i = 0;
  while (i < visibleOrdered.length) {
    const a = visibleOrdered[i];
    const b = visibleOrdered[i + 1];
    if (
      (a === 'chart' && b === 'feed') ||
      (a === 'feed' && b === 'chart')
    ) {
      out.push({ key: 'chart-feed', kind: 'pair', a: 'chart', b: 'feed' });
      i += 2;
    } else {
      out.push({ key: a, kind: 'single', id: a });
      i += 1;
    }
  }
  return out;
}

/** Move um id para o índice de outro (reordenação por arrastar). */
export function reorderDashWidgets<T extends string>(order: T[], dragId: T, targetId: T): T[] {
  if (dragId === targetId) return order;
  const next = [...order];
  const from = next.indexOf(dragId);
  const to = next.indexOf(targetId);
  if (from < 0 || to < 0) return order;
  next.splice(from, 1);
  next.splice(to, 0, dragId);
  return next;
}
