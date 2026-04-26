import { useEffect, useState } from 'react';

/**
 * Valor atrasado (debounce) para filtros e buscas — evita recomputar listas a cada tecla.
 * Não altera UI: o input continua a usar o valor imediato; o filtro usa o debounced.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
