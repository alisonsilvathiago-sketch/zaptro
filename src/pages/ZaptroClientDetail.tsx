import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Calendar,
  ShieldCheck,
  FileText,
  Loader2,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { getZaptroDemoClientById } from './ZaptroClients';

type ActivityKind = 'whatsapp' | 'crm' | 'system';

type ActivityItem = {
  id: string;
  kind: ActivityKind;
  at: string;
  title: string;
  body?: string;
  channel: string;
};

function phoneDigits(p: string) {
  return p.replace(/\D/g, '');
}

function phonesMatch(a: string, b: string) {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const tail = (s: string) => (s.length >= 11 ? s.slice(-11) : s);
  return tail(da) === tail(db);
}

/** Eventos do CRM local (Kanban /comercial) cujo lead tem o mesmo telefone que este contacto. */
function collectCrmActivitiesForPhone(clientPhone: string): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('zaptro_crm_timeline_v1_')) continue;
    const crmId = key.slice('zaptro_crm_timeline_v1_'.length);
    const leadsKey = `zaptro_crm_kanban_v3_${crmId}`;
    try {
      const leadsRaw = localStorage.getItem(leadsKey);
      if (!leadsRaw) continue;
      const leads = JSON.parse(leadsRaw) as Array<{ id: string; phone: string; clientName?: string }>;
      const leadIds = new Set(leads.filter((l) => l.phone && phonesMatch(l.phone, clientPhone)).map((l) => l.id));
      if (leadIds.size === 0) continue;
      const evMap = JSON.parse(localStorage.getItem(key) || '{}') as Record<
        string,
        Array<{ id: string; at: string; title: string; body?: string; actor?: string; kind?: string }>
      >;
      for (const lid of leadIds) {
        for (const row of evMap[lid] || []) {
          const bodyParts = [row.body, row.actor ? `Responsável: ${row.actor}` : ''].filter(Boolean);
          out.push({
            id: `crm-${crmId}-${lid}-${row.id}`,
            kind: 'crm',
            at: row.at,
            title: row.title,
            body: bodyParts.length ? bodyParts.join('\n') : undefined,
            channel: 'CRM · Comercial',
          });
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

function whatsappRowsToActivities(messages: any[], clientName: string): ActivityItem[] {
  return messages.map((m) => ({
    id: `wa-${m.id}`,
    kind: 'whatsapp' as const,
    at: m.created_at,
    title:
      m.role === 'user' || m.from_me === false || m.direction === 'inbound'
        ? `WhatsApp · ${clientName || 'Cliente'}`
        : 'WhatsApp · Equipa',
    body: String(m.content || m.body || '').trim() || '(anexo ou sem texto)',
    channel: 'WhatsApp',
  }));
}

function demoMessagesForClient(demoId: string, senderName: string): any[] {
  const t0 = Date.now() - 86400_000;
  const lines: { user: string; agent: string }[] = [
    { user: 'Olá, preciso de uma cotação de frete.', agent: 'Olá! Pode enviar origem, destino e tipo de carga?' },
    { user: 'Segue no e-mail o volume da semana.', agent: 'Recebido. Vou encaminhar ao comercial e volto com proposta.' },
  ];
  if (demoId.endsWith('1')) {
    return lines.flatMap((pair, i) => [
      {
        id: `${demoId}-u-${i}`,
        role: 'user',
        content: pair.user,
        created_at: new Date(t0 + i * 120_000).toISOString(),
      },
      {
        id: `${demoId}-a-${i}`,
        role: 'assistant',
        content: pair.agent,
        created_at: new Date(t0 + i * 120_000 + 60_000).toISOString(),
      },
    ]);
  }
  return [
    {
      id: `${demoId}-m1`,
      role: 'user',
      content: `Mensagem de exemplo de ${senderName} (modo demonstração).`,
      created_at: new Date(t0).toISOString(),
    },
    {
      id: `${demoId}-m2`,
      role: 'assistant',
      content: 'Resposta de exemplo da equipa Zaptro.',
      created_at: new Date(t0 + 90_000).toISOString(),
    },
  ];
}

const ZaptroClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClient = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const decodedId = decodeURIComponent(id);

    const demo = getZaptroDemoClientById(decodedId);
    if (demo) {
      setClient({
        ...demo,
        created_at: demo.created_at || demo.updated_at,
      });
      setMessages(demoMessagesForClient(decodedId, demo.sender_name || 'Cliente'));
      setLoading(false);
      return;
    }

    try {
      const { data: conv, error: convError } = await supabaseZaptro
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', decodedId)
        .single();

      if (convError) throw convError;
      setClient(conv);

      const { data: msgs, error: msgsError } = await supabaseZaptro
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', decodedId)
        .order('created_at', { ascending: true });

      if (msgsError) throw msgsError;
      setMessages(msgs || []);
    } catch {
      notifyZaptro('error', 'Erro', 'Cliente não encontrado.');
      navigate(ZAPTRO_ROUTES.CLIENTS);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  const activities = useMemo(() => {
    if (!client) return [];
    const phone = client.sender_number || '';
    const base: ActivityItem[] = [
      {
        id: `sys-${client.id}`,
        kind: 'system',
        at: client.created_at || client.updated_at,
        title: 'Contacto na base de clientes',
        body:
          'Este perfil não é só o chat: junta mensagens WhatsApp com o que a equipa regista no CRM (propostas, orçamentos, etapas do lead no mesmo número).',
        channel: 'Sistema',
      },
    ];
    const crm = phone ? collectCrmActivitiesForPhone(phone) : [];
    const wa = whatsappRowsToActivities(messages, client.sender_name);
    return [...base, ...crm, ...wa].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [client, messages]);

  const exportPDF = () => {
    window.print();
    notifyZaptro('success', 'Documento PDF', 'Preparando impressão/exportação do histórico.');
  };

  if (loading) {
    return (
      <ZaptroLayout>
        <div style={styles.loadingArea}>
          <Loader2 className="animate-spin" size={40} />
        </div>
      </ZaptroLayout>
    );
  }

  if (!client) {
    return (
      <ZaptroLayout>
        <div style={{ ...styles.loadingArea, flexDirection: 'column', gap: 16 }}>
          <p style={{ fontWeight: 800, color: '#64748B' }}>Cliente não encontrado.</p>
          <button type="button" style={styles.backBtn} onClick={() => navigate(ZAPTRO_ROUTES.CLIENTS)}>
            <ArrowLeft size={20} /> Voltar a Clientes
          </button>
        </div>
      </ZaptroLayout>
    );
  }

  return (
    <ZaptroLayout>
      <div style={styles.container} id="printable-area">
        <header style={styles.header}>
          <div>
            <div style={styles.kickerRow}>
              <button
                type="button"
                aria-label="Voltar a Clientes"
                title="Voltar a Clientes"
                style={styles.kickerBackBtn}
                onClick={() => navigate(ZAPTRO_ROUTES.CLIENTS)}
              >
                <ArrowLeft size={14} color="#64748B" strokeWidth={2.4} />
              </button>
              <p style={styles.kicker}>CLIENTES · PERFIL</p>
            </div>
            <h1 style={styles.pageTitle}>Perfil do cliente</h1>
            <p style={styles.pageSub}>
              Histórico completo — não é a página do WhatsApp; aqui vês conversas e o que o comercial registou no CRM para este contacto.
            </p>
          </div>
          <div style={styles.headerActions}>
            <button type="button" style={styles.backBtn} onClick={() => navigate(ZAPTRO_ROUTES.CLIENTS)}>
              <ArrowLeft size={20} /> Voltar a Clientes
            </button>
            <button type="button" style={styles.exportPdfBtn} onClick={exportPDF}>
              <FileText size={16} /> Exportar PDF
            </button>
          </div>
        </header>

        <div className="zaptro-client-profile-grid" style={styles.mainGrid}>
          <aside style={styles.sidebar}>
            <div style={styles.profileCard}>
              <div style={styles.avatarLarge}>{client.sender_name?.[0] || 'C'}</div>
              <h2 style={styles.clientName}>{client.sender_name || 'Contatado'}</h2>
              <span style={styles.clientStatus}>
                <span style={{ ...styles.statusDot, backgroundColor: client.status === 'open' ? '#10B981' : '#64748B' }} />
                {client.status === 'open' ? 'Em acompanhamento' : 'Arquivado'}
              </span>

              <div style={styles.infoList}>
                <div style={styles.infoItem}>
                  <Phone size={16} color="#94A3B8" />
                  <div style={styles.infoText}>
                    <span style={styles.infoLabel}>TELEFONE / WHATSAPP</span>
                    <span style={styles.infoValue}>{client.sender_number}</span>
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <Calendar size={16} color="#94A3B8" />
                  <div style={styles.infoText}>
                    <span style={styles.infoLabel}>ID NA BASE</span>
                    <span style={styles.infoValue} title={client.id}>
                      {String(client.id).length > 28 ? `${String(client.id).slice(0, 26)}…` : client.id}
                    </span>
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <Calendar size={16} color="#94A3B8" />
                  <div style={styles.infoText}>
                    <span style={styles.infoLabel}>PRIMEIRO REGISTO</span>
                    <span style={styles.infoValue}>{new Date(client.created_at || client.updated_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div style={styles.divider} />

              <div style={styles.crmStats}>
                <div style={styles.crmStatItem}>
                  <span style={styles.crmStatVal}>{activities.length}</span>
                  <span style={styles.crmStatLab}>Eventos no perfil</span>
                </div>
                <div style={styles.crmStatItem}>
                  <span style={styles.crmStatVal}>{messages.length}</span>
                  <span style={styles.crmStatLab}>Mensagens WA</span>
                </div>
              </div>
            </div>

            <div style={styles.secureBadge}>
              <ShieldCheck size={16} color="#10B981" />
              <span>Dados auditáveis · Zaptro</span>
            </div>
          </aside>

          <section style={styles.feedSection}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={22} color="#000" />
                <div>
                  <h3 style={styles.sectionTitle}>Toda a actividade</h3>
                  <p style={styles.sectionHint}>Conversas WhatsApp + linha do tempo do CRM (mesmo telefone). Orçamentos aprovados e cargas entram aqui quando estiverem ligados ao backend.</p>
                </div>
              </div>
              <span style={styles.msgCount}>{activities.length} eventos</span>
            </div>

            <div style={styles.feedList}>
              {activities.map((ev) => (
                <article key={ev.id} style={styles.feedRow}>
                  <div
                    style={{
                      ...styles.feedRail,
                      backgroundColor: ev.kind === 'whatsapp' ? '#EEFCEF' : ev.kind === 'crm' ? '#F5F3FF' : '#F1F5F9',
                    }}
                  >
                    {ev.kind === 'whatsapp' ? (
                      <MessageSquare size={18} color="#15803D" />
                    ) : ev.kind === 'crm' ? (
                      <ClipboardList size={18} color="#6D28D9" />
                    ) : (
                      <Sparkles size={18} color="#475569" />
                    )}
                  </div>
                  <div style={styles.feedBody}>
                    <div style={styles.feedMeta}>
                      <span style={styles.feedChannel}>{ev.channel}</span>
                      <span style={styles.feedTime}>
                        {new Date(ev.at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <h4 style={styles.feedTitle}>{ev.title}</h4>
                    {ev.body ? <p style={styles.feedText}>{ev.body}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .zaptro-client-profile-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; }
          button { display: none !important; }
        }
      `}</style>
    </ZaptroLayout>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 32 },
  header: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 },
  kickerRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  kickerBackBtn: {
    border: 'none',
    backgroundColor: '#ebebeb',
    borderRadius: 10,
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kicker: {
    margin: 0,
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: '0.14em',
    color: '#64748B',
  },
  pageTitle: { margin: '6px 0 0', fontSize: 32, fontWeight: 950, letterSpacing: '-1px', color: '#000' },
  pageSub: { margin: '10px 0 0', maxWidth: 640, fontSize: 15, fontWeight: 600, color: '#64748B', lineHeight: 1.5 },
  headerActions: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  backBtn: {
    background: '#ebebeb',
    border: 'none',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 950,
    cursor: 'pointer',
    padding: '12px 18px',
    borderRadius: 12,
  },
  exportPdfBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 22px',
    backgroundColor: '#000',
    color: '#D9FF00',
    border: 'none',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 950,
    cursor: 'pointer',
    boxShadow: ZAPTRO_SHADOW.md,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 340px) 1fr',
    gap: 32,
    alignItems: 'start',
  },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 16 },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    border: '1px solid #e8e8e8',
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#000',
    color: '#D9FF00',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 38,
    fontWeight: 950,
    marginBottom: 20,
    boxShadow: ZAPTRO_SHADOW.lg,
  },
  clientName: { fontSize: 22, fontWeight: 950, color: '#000', margin: '0 0 8px 0', letterSpacing: '-0.5px', textAlign: 'center' },
  clientStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    fontWeight: 900,
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  infoList: { width: '100%', display: 'flex', flexDirection: 'column', gap: 20 },
  infoItem: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  infoText: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  infoLabel: { fontSize: 9, fontWeight: 950, color: '#94A3B8', letterSpacing: '0.08em' },
  infoValue: { fontSize: 14, fontWeight: 700, color: '#334155', wordBreak: 'break-word' },
  divider: { width: '100%', height: 1, backgroundColor: '#ebebeb', margin: '24px 0' },
  crmStats: { width: '100%', display: 'flex', justifyContent: 'space-around' },
  crmStatItem: { textAlign: 'center' },
  crmStatVal: { display: 'block', fontSize: 20, fontWeight: 950, color: '#000' },
  crmStatLab: { fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' },
  secureBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 18px',
    backgroundColor: '#EEFCEF',
    borderRadius: 16,
    color: '#10B981',
    fontSize: 11,
    fontWeight: 950,
  },
  feedSection: { display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 },
  sectionHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: 950, color: '#000', margin: 0 },
  sectionHint: { margin: '6px 0 0', fontSize: 13, fontWeight: 600, color: '#64748B', maxWidth: 720, lineHeight: 1.45 },
  msgCount: { fontSize: 12, fontWeight: 800, color: '#94A3B8' },
  feedList: { display: 'flex', flexDirection: 'column', gap: 14 },
  feedRow: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr',
    gap: 16,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 20,
    border: '1px solid #e8e8e8',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  feedRail: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  feedBody: { minWidth: 0 },
  feedMeta: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  feedChannel: { fontSize: 10, fontWeight: 950, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' },
  feedTime: { fontSize: 11, fontWeight: 700, color: '#94A3B8' },
  feedTitle: { margin: 0, fontSize: 16, fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em' },
  feedText: { margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, color: '#475569', fontWeight: 600, whiteSpace: 'pre-wrap' },
  loadingArea: { height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};

export default ZaptroClientDetail;
