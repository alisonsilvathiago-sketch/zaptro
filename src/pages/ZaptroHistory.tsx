import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, User, MessageCircle, Clock, Search, Calendar, Filter, Download, MessageSquare, Info, Truck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import LogtaModal from '../components/Modal';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { useAuth } from '../context/AuthContext';
import {
  readZaptroActivityLog,
  zaptroActivityLogStorageKey,
  ZAPTRO_ACTIVITY_LOG_EVENT,
  type ZaptroActivityEntry,
  type ZaptroActivityLogType,
} from '../constants/zaptroActivityLogStore';

function formatActivityTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

function typeIcon(type: ZaptroActivityLogType) {
  switch (type) {
    case 'atendimento':
      return <MessageCircle size={14} />;
    case 'login':
      return <User size={14} />;
    case 'rota':
      return <Truck size={14} />;
    case 'motorista':
      return <History size={14} />;
    case 'config':
      return <Filter size={14} />;
    default:
      return <History size={14} />;
  }
}

const ZaptroHistory: React.FC = () => {
  const { profile } = useAuth();
  const tenantId = profile?.company_id?.trim() || 'local-demo';
  const [searchParams, setSearchParams] = useSearchParams();
  const fromAssistant = searchParams.get('from') === 'assistant';

  const dismissAssistantHint = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('from');
        return next;
      },
      { replace: true },
    );
  };

  const [, bump] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ZaptroActivityEntry | null>(null);

  const reload = useCallback(() => {
    bump((n) => n + 1);
  }, []);

  const rawLog = useMemo(() => readZaptroActivityLog(tenantId), [tenantId, bump]);

  useEffect(() => {
    const onEvt = () => reload();
    window.addEventListener(ZAPTRO_ACTIVITY_LOG_EVENT, onEvt);
    return () => window.removeEventListener(ZAPTRO_ACTIVITY_LOG_EVENT, onEvt);
  }, [reload]);

  useEffect(() => {
    const k = zaptroActivityLogStorageKey(tenantId);
    const onStorage = (e: StorageEvent) => {
      if (e.key === k) reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [tenantId, reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rawLog;
    return rawLog.filter((item) => {
      const hay = [item.actorName, item.action, item.clientLabel, item.details, item.type].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rawLog, search]);

  const exportLogs = () => {
    const data = readZaptroActivityLog(tenantId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zaptro-auditoria-${tenantId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ZaptroLayout>
      <div style={styles.container}>
        {fromAssistant && (
          <div
            style={{
              marginBottom: 20,
              padding: '14px 18px',
              borderRadius: 16,
              border: '1px solid #D9FF00',
              backgroundColor: 'rgba(217, 255, 0, 0.12)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.45, flex: '1 1 240px' }}>
              <strong>Auditoria em tempo real</strong> — cada sessão, rota e acção principal no CRM (e na operação) é
              registada por <strong>colaborador</strong> neste browser. Os dados persistem por empresa (
              <code style={{ fontSize: 12 }}>{tenantId}</code>
              ) até existir API central.
            </p>
            <button
              type="button"
              onClick={dismissAssistantHint}
              style={{
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#D9FF00',
                fontWeight: 700,
                fontSize: 12,
                padding: '10px 16px',
                borderRadius: 12,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Fechar aviso
            </button>
          </div>
        )}
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Histórico de Atividade</h1>
            <p style={styles.subtitle}>Auditoria das acções dos colaboradores (e sessões) neste ambiente — actualização imediata na mesma conta.</p>
          </div>
          <button type="button" style={styles.exportBtn} onClick={exportLogs}>
            <Download size={18} /> Exportar JSON
          </button>
        </header>

        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <Search size={18} color="#94A3B8" />
            <input
              placeholder="Filtrar por colaborador, acção, cliente ou tipo…"
              style={styles.input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" style={styles.filterBtn} disabled title="Em breve: filtro por data">
            <Calendar size={18} /> Hoje
          </button>
          <button type="button" style={styles.filterBtn} disabled title="Em breve: filtro por tipo">
            <Filter size={18} /> Todos os tipos
          </button>
        </div>

        <div style={styles.tableCard}>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748B', fontWeight: 600, fontSize: 15 }}>
              {rawLog.length === 0
                ? 'Ainda não há registos. Quando alguém da equipa iniciar sessão, mexer no CRM ou nas rotas, as entradas aparecem aqui em tempo real.'
                : 'Nenhum resultado para o filtro actual.'}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.trHead}>
                  <th style={styles.th}>TIPO</th>
                  <th style={styles.th}>COLABORADOR</th>
                  <th style={styles.th}>AÇÃO / DESTINO</th>
                  <th style={styles.th}>DATA E HORA</th>
                  <th style={styles.th}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    style={styles.tr}
                    onClick={() => setSelectedItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedItem(item);
                      }
                    }}
                    tabIndex={0}
                    role="row"
                  >
                    <td style={styles.td}>
                      <div
                        style={{
                          ...styles.typeBadge,
                          backgroundColor: '#ebebeb',
                          color: '#000000',
                          borderLeft: '2px solid #D9FF00',
                        }}
                      >
                        {typeIcon(item.type)}
                        {item.type.toUpperCase()}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.agentInfo}>
                        <div style={styles.avatar}>{item.actorName.trim().charAt(0).toUpperCase() || '?'}</div>
                        <span>{item.actorName}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionText}>
                        {item.action} <strong>({item.clientLabel})</strong>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.timeInfo}>
                        <Clock size={14} /> {formatActivityTime(item.at)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.occBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <LogtaModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.type === 'atendimento' ? 'Detalhe do registo' : 'Log de actividade'}
        width="550px"
      >
        {selectedItem && (
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={styles.modalAvatar}>{selectedItem.actorName.trim().charAt(0).toUpperCase() || '?'}</div>
              <div>
                <h3 style={styles.modalName}>{selectedItem.actorName}</h3>
                <span style={styles.modalRole}>{selectedItem.type.toUpperCase()}</span>
              </div>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <MessageSquare size={16} color="#94A3B8" />
                <div>
                  <span style={styles.modalLabel}>DESTINO / CONTEXTO</span>
                  <strong style={styles.modalVal}>{selectedItem.clientLabel}</strong>
                </div>
              </div>
              <div style={styles.modalRow}>
                <Clock size={16} color="#94A3B8" />
                <div>
                  <span style={styles.modalLabel}>DATA E HORA (ISO)</span>
                  <strong style={styles.modalVal}>{formatActivityTime(selectedItem.at)}</strong>
                </div>
              </div>

              <div style={styles.detailsBox}>
                <div style={styles.detailsHeader}>
                  <Info size={14} /> DETALHE
                </div>
                <p style={styles.detailsText}>
                  <strong>{selectedItem.action}</strong>
                  {selectedItem.details ? (
                    <>
                      <br />
                      <br />
                      {selectedItem.details}
                    </>
                  ) : (
                    ' Sem texto adicional — vê a linha na tabela para o resumo.'
                  )}
                </p>
                <p style={{ ...styles.detailsText, marginTop: 16, fontSize: 12, opacity: 0.85 }}>
                  ID: <code>{selectedItem.id}</code>
                </p>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.closeBtnModal} type="button" onClick={() => setSelectedItem(null)}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </LogtaModal>
    </ZaptroLayout>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 0, boxSizing: 'border-box', width: '100%', maxWidth: 1360, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#000000', letterSpacing: '-1px', margin: 0 },
  subtitle: { color: '#64748B', fontSize: '15px', marginTop: '4px', fontWeight: '500' },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: 'white',
    border: '1px solid #EBEBEC',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  filterBar: { display: 'flex', gap: '16px', marginBottom: '32px' },
  searchBox: {
    flex: 1,
    backgroundColor: 'white',
    border: '1px solid #EBEBEC',
    borderRadius: '14px',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  input: { flex: 1, border: 'none', background: 'transparent', outline: 'none', height: '48px', fontSize: '14px', fontWeight: '500' },
  filterBtn: {
    padding: '0 20px',
    height: '48px',
    backgroundColor: 'white',
    border: '1px solid #EBEBEC',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '700',
    color: '#64748B',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'inherit',
  },

  tableCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #EBEBEC', overflow: 'hidden', boxShadow: ZAPTRO_SHADOW.xs },
  table: { width: '100%', borderCollapse: 'collapse' },
  trHead: { backgroundColor: '#FBFBFC', borderBottom: '1px solid #EBEBEC' },
  th: { padding: '20px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '1px' },
  tr: { borderBottom: '1px solid #e8e8e8', transition: '0.2s', cursor: 'pointer' },
  td: { padding: '20px 24px', fontSize: '14px', color: '#1E293B', fontWeight: '500' },

  typeBadge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  agentInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: '#ebebeb',
    color: '#64748B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
  },
  actionText: { display: 'block' },
  timeInfo: { display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontWeight: '600' },
  occBtn: {
    padding: '8px 16px',
    backgroundColor: '#000',
    color: '#D9FF00',
    border: 'none',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: '0.2s',
    fontFamily: 'inherit',
  },

  modalContent: { padding: '10px 0' },
  modalHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', padding: '0 10px' },
  modalAvatar: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    backgroundColor: '#D9FF00',
    color: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '700',
  },
  modalName: { margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#0F172A', letterSpacing: '-0.5px' },
  modalRole: { fontSize: '12px', color: '#94A3B8', fontWeight: '700' },
  modalBody: { display: 'flex', flexDirection: 'column', gap: '24px', padding: '0 10px' },
  modalRow: { display: 'flex', gap: '16px', alignItems: 'center' },
  modalLabel: { fontSize: '10px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' },
  modalVal: { fontSize: '14px', fontWeight: '700', color: '#0F172A' },
  detailsBox: { backgroundColor: '#FBFBFC', padding: '24px', borderRadius: '20px', border: '1px solid #EBEBEC', marginTop: '8px' },
  detailsHeader: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: '#0F172A', marginBottom: '16px', textTransform: 'uppercase' },
  detailsText: { fontSize: '14px', color: '#475569', fontWeight: '600', lineHeight: '1.6', margin: 0 },
  modalFooter: { marginTop: '32px', borderTop: '1px solid #e8e8e8', paddingTop: '24px', display: 'flex', justifyContent: 'center' },
  closeBtnModal: {
    padding: '14px 32px',
    backgroundColor: '#0F172A',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};

export default ZaptroHistory;
