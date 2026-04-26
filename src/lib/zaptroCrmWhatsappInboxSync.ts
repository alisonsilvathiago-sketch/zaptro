/** Linha mínima de `whatsapp_conversations` para sincronizar com o Kanban CRM. */
export type ZaptroWaConversationRow = {
  id: string;
  sender_number: string;
  sender_name: string | null;
  last_message: string | null;
  status: string | null;
  last_customer_message_at: string | null;
};

export function zaptroNormWaPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length >= 10 && d.length <= 11 && !d.startsWith('55')) return `55${d}`;
  return d;
}

export type CrmLeadLike = {
  id: string;
  clientName: string;
  phone: string;
  origin: string;
  destination: string;
  cargoType: string;
  estimatedValue: number;
  assigneeId: string | null;
  assigneeName: string;
  createdAt: string;
  tag: 'urgente' | 'vip' | 'retorno' | null;
  progress: number;
  stage: 'novos' | 'atendimento' | 'negociacao' | 'fechado' | 'perdido';
  clientLogoUrl?: string | null;
  assigneeAvatarUrl?: string | null;
  approvedQuoteId?: string | null;
};

/**
 * Incorpora conversas WhatsApp no Kanban: cria `wa-<uuid>` por conversa nova;
 * faz match por telefone para actualizar nome / encerramento (status closed → perdido).
 */
export function mergeWhatsappConversationsIntoLeads(
  leads: CrmLeadLike[],
  conversations: ZaptroWaConversationRow[],
): { next: CrmLeadLike[]; touched: boolean } {
  if (!conversations.length) return { next: leads, touched: false };

  let touched = false;
  const byId = new Map(leads.map((l) => [l.id, { ...l }]));
  const byPhone = new Map<string, string>();
  for (const l of leads) {
    const k = zaptroNormWaPhone(l.phone);
    if (k) byPhone.set(k, l.id);
  }

  const upsert = (lead: CrmLeadLike) => {
    const prev = byId.get(lead.id);
    if (!prev) {
      byId.set(lead.id, lead);
      byPhone.set(zaptroNormWaPhone(lead.phone), lead.id);
      touched = true;
      return;
    }
    const same =
      prev.clientName === lead.clientName &&
      prev.cargoType === lead.cargoType &&
      prev.stage === lead.stage &&
      prev.phone === lead.phone;
    if (!same) {
      byId.set(lead.id, lead);
      touched = true;
    }
  };

  for (const c of conversations) {
    const phone = zaptroNormWaPhone(c.sender_number || '');
    if (!phone) continue;

    const waLeadId = `wa-${c.id}`;
    const name = (c.sender_name || '').trim() || 'Contacto WhatsApp';
    const snippet = (c.last_message || '').trim().slice(0, 120) || 'Conversa WhatsApp';
    const closed = (c.status || '').toLowerCase() === 'closed';
    const createdAt = c.last_customer_message_at || new Date().toISOString();

    const existingId = byPhone.get(phone);
    if (existingId) {
      const cur = byId.get(existingId);
      if (!cur) continue;
      const nextStage = closed && cur.stage !== 'fechado' ? 'perdido' : cur.stage;
      const nextName = name !== 'Contacto WhatsApp' ? name : cur.clientName;
      const nextCargo = cur.id.startsWith('wa-') || cur.origin === 'WhatsApp' ? snippet : cur.cargoType;
      if (nextStage !== cur.stage || nextName !== cur.clientName || nextCargo !== cur.cargoType) {
        byId.set(existingId, { ...cur, clientName: nextName, cargoType: nextCargo, stage: nextStage });
        touched = true;
      }
      continue;
    }

    if (byId.has(waLeadId)) {
      const cur = byId.get(waLeadId)!;
      const nextStage = closed && cur.stage !== 'fechado' ? 'perdido' : cur.stage;
      if (cur.clientName !== name || cur.cargoType !== snippet || cur.stage !== nextStage) {
        byId.set(waLeadId, { ...cur, clientName: name, cargoType: snippet, stage: nextStage });
        touched = true;
      }
      continue;
    }

    upsert({
      id: waLeadId,
      clientName: name,
      phone,
      origin: 'WhatsApp',
      destination: '—',
      cargoType: snippet,
      estimatedValue: 0,
      assigneeId: null,
      assigneeName: 'Aguardando Atendente',
      createdAt,
      tag: null,
      progress: 1,
      stage: closed ? 'perdido' : 'novos',
    });
  }

  return { next: Array.from(byId.values()), touched };
}
