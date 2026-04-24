import React, { useState } from 'react';
import { 
  Search, Plus, MoreHorizontal, MessageSquare, 
  DollarSign, User, Calendar, ArrowRight,
  TrendingUp, CheckCircle2, XCircle, Clock,
  Filter, LayoutGrid, List as ListIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';

// Lead Statuses
const STAGES = [
  { id: 'novo', label: 'Novo', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  { id: 'atendimento', label: 'Em Atendimento', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  { id: 'orcamento', label: 'Orçamento Enviado', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
  { id: 'negociacao', label: 'Negociação', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  { id: 'fechado', label: 'Fechado', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  { id: 'perdido', label: 'Perdido', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
];

export const ZaptroLeadsTab: React.FC = () => {
  const navigate = useNavigate();
  const { palette } = useZaptroTheme();
  const d = palette.mode === 'dark';
  const border = palette.sidebarBorder;
  const surface = d ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const surface2 = d ? 'rgba(255,255,255,0.06)' : '#F8FAFC';

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock Leads
  const [leads, setLeads] = useState([
    { id: 'l1', name: 'Transportes Transville', phone: '(11) 98877-6655', stage: 'negociacao', value: 'R$ 12.500,00', date: '2024-04-23', tags: ['Urgente', 'Alto Valor'], owner: 'Alison Silva' },
    { id: 'l2', name: 'Logística Express', phone: '(21) 97766-5544', stage: 'novo', value: '—', date: '2024-04-24', tags: ['Novo'], owner: 'João Santos' },
    { id: 'l3', name: 'Distribuidora Alvorada', phone: '(47) 99911-2233', stage: 'orcamento', value: 'R$ 4.200,00', date: '2024-04-22', tags: ['Recorrente'], owner: 'Alison Silva' },
    { id: 'l4', name: 'Mercado Central Ltda', phone: '(31) 98888-0000', stage: 'atendimento', value: '—', date: '2024-04-24', tags: ['Frio'], owner: 'Ana Souza' },
  ]);

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm)
  );

  const getStageLeads = (stageId: string) => filteredLeads.filter(l => l.stage === stageId);

  const renderKanban = () => (
    <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 20, minHeight: '600px' }}>
      {STAGES.map(stage => {
        const stageLeads = getStageLeads(stage.id);
        return (
          <div key={stage.id} style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: stage.color }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: palette.text, letterSpacing: '-0.01em' }}>{stage.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: palette.textMuted, backgroundColor: surface2, padding: '2px 8px', borderRadius: 20 }}>{stageLeads.length}</span>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: palette.textMuted, cursor: 'pointer' }}>
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stageLeads.map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => navigate(`/clientes/leads/perfil/${lead.id}`)}
                  style={{ 
                    backgroundColor: surface, 
                    border: `1px solid ${border}`, 
                    borderRadius: 16, 
                    padding: 16, 
                    cursor: 'pointer',
                    boxShadow: d ? 'none' : ZAPTRO_SHADOW.sm,
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.text, letterSpacing: '-0.01em' }}>{lead.name}</h4>
                    <button style={{ background: 'transparent', border: 'none', color: palette.textMuted, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); notifyZaptro('info', 'Ações', 'Menu de ações rápidas'); }}>
                      <MoreHorizontal size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {lead.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: surface2, color: palette.textMuted }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: palette.textMuted, fontWeight: 600 }}>
                      <DollarSign size={14} />
                      <span style={{ color: lead.value !== '—' ? stage.color : palette.textMuted }}>{lead.value}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: palette.textMuted, fontWeight: 600 }}>
                      <Clock size={14} />
                      <span>{new Date(lead.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: palette.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#000' }}>
                        {lead.owner[0]}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: palette.textMuted }}>{lead.owner.split(' ')[0]}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button title="WhatsApp" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); notifyZaptro('success', 'WhatsApp', 'Abrindo conversa...'); }}>
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {stageLeads.length === 0 && (
                <div style={{ padding: 24, border: `2px dashed ${border}`, borderRadius: 16, textAlign: 'center', color: palette.textMuted, fontSize: 12, fontWeight: 600 }}>
                  Sem leads
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dashboard Mini */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
        <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} color="#3b82f6" />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: palette.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total Leads</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: palette.text }}>{leads.length}</span>
          </div>
        </div>
        <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} color="#eab308" />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: palette.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Em Negociação</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: palette.text }}>{leads.filter(l => l.stage === 'negociacao').length}</span>
          </div>
        </div>
        <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} color="#22c55e" />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: palette.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Convertidos</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: palette.text }}>85%</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: '300px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, backgroundColor: surface2, padding: '12px 18px', borderRadius: 16, border: `1px solid ${border}` }}>
            <Search size={18} color={palette.textMuted} />
            <input 
              placeholder="Buscar leads por nome ou telefone..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, width: '100%', backgroundColor: 'transparent', color: palette.text }} 
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', backgroundColor: surface2, border: `1px solid ${border}`, borderRadius: 16, color: palette.text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Filter size={16} /> Filtros
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', backgroundColor: surface2, padding: 4, borderRadius: 12, border: `1px solid ${border}` }}>
            <button 
              onClick={() => setViewMode('kanban')}
              style={{ padding: '8px 12px', border: 'none', borderRadius: 8, backgroundColor: viewMode === 'kanban' ? surface : 'transparent', color: viewMode === 'kanban' ? palette.text : palette.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{ padding: '8px 12px', border: 'none', borderRadius: 8, backgroundColor: viewMode === 'list' ? surface : 'transparent', color: viewMode === 'list' ? palette.text : palette.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ListIcon size={16} />
            </button>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', backgroundColor: '#000', color: palette.lime, border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Plus size={18} strokeWidth={2.5} /> Novo Lead
          </button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'kanban' ? renderKanban() : (
        <div style={{ padding: 40, textAlign: 'center', backgroundColor: surface, borderRadius: 24, border: `1px solid ${border}` }}>
          <ListIcon size={48} color={palette.textMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>Visualização em Lista</h3>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: palette.textMuted }}>O modo lista está sendo otimizado para grandes volumes de dados.</p>
        </div>
      )}
    </div>
  );
};
