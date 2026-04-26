/**
 * Estado da carga por conversa WhatsApp (demo: localStorage até existir coluna na base).
 */

export type ConversationCargoPhase = 'coletado' | 'transito' | 'entregue';

const KEY = 'zaptro_whatsapp_conversation_cargo_v1';

export type ConversationCargoRow = {
  phase: ConversationCargoPhase;
  /** Última vez que o operador clicou em «Atualizar status». */
  syncedAt?: string;
};

function readMap(): Record<string, ConversationCargoRow> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    return p && typeof p === 'object' ? (p as Record<string, ConversationCargoRow>) : {};
  } catch {
    return {};
  }
}

function writeMap(m: Record<string, ConversationCargoRow>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function readAllConversationCargo(): Record<string, ConversationCargoRow> {
  return { ...readMap() };
}

export function persistConversationCargoPhase(conversationId: string, phase: ConversationCargoPhase): void {
  const m = readMap();
  const prev = m[conversationId];
  m[conversationId] = { ...prev, phase };
  writeMap(m);
}

/** Grava o momento da confirmação «Atualizar status» (fase actual). */
export function markConversationCargoSynced(conversationId: string): ConversationCargoRow {
  const m = readMap();
  const phase = m[conversationId]?.phase ?? 'transito';
  const row: ConversationCargoRow = { phase, syncedAt: new Date().toISOString() };
  m[conversationId] = row;
  writeMap(m);
  return row;
}
