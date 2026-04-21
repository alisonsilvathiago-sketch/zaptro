import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Users, TrendingUp, Target, 
  Search, Plus, MapPin, Mail, Phone,
  ChevronRight, Calendar, DollarSign,
  Filter, MoreVertical, MessageSquare,
  Clock, CheckCircle, AlertCircle, 
  Layout, List, Kanban, ArrowUpRight,
  TrendingDown, UserPlus, FileText,
  Star, Zap, Shield
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { supabase } from '../../lib/supabase';
import LogtaModal from '../../components/Modal';
import { toastSuccess, toastError } from '../../lib/toast';

const MasterCRM: React.FC = () => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  
  // Mock data for Expansion CRM
  const [leads, setLeads] = useState([
    { id: '1', name: 'Transportadora TransBR', city: 'Curitiba, PR', potential: 'OURO', status: 'negociacao', contact: 'Mário Souza', email: 'mario@transbr.com.br', value: 12000, lastContact: '2 dias atrás' },
    { id: '2', name: 'Veloz Logística Ltda', city: 'Goiânia, GO', potential: 'PRATA', status: 'proposta', contact: 'Cláudio Ferreira', email: 'claudio@veloz.com.br', value: 8500, lastContact: 'Hoje' },
    { id: '3', name: 'Express Rodoviário', city: 'Salvador, BA', potential: 'BRONZE', status: 'leads', contact: 'Ana Lúcia', email: 'ana@express.com.br', value: 2400, lastContact: '1 semana atrás' },
    { id: '4', name: 'Logística Norte-Sul', city: 'Belém, PA', potential: 'OURO', status: 'fechamento', contact: 'Roberto Lima', email: 'roberto@nortesul.com.br', value: 15000, lastContact: 'Ontem' },
  ]);

  const funnelStages = [
    { id: 'leads', name: 'Novo Lead', color: '#94a3b8' },
    { id: 'contato', name: 'Primeiro Contato', color: '#3b82f6' },
    { id: 'negociacao', name: 'Negociação', color: '#8b5cf6' },
    { id: 'proposta', name: 'Proposta Enviada', color: '#f59e0b' },
    { id: 'fechamento', name: 'Fechamento', color: '#10b981' }
  ];

  const statsData = [
    { name: 'Leads', value: 45, color: '#94a3b8' },
    { name: 'Contato', value: 30, color: '#3b82f6' },
    { name: 'Negoc.', value: 20, color: '#8b5cf6' },
    { name: 'Proposta', value: 15, color: '#f59e0b' },
    { name: 'Fechado', value: 10, color: '#10b981' },
  ];

  const handleStatusChange = (leadId: string, newStatus: string) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    toastSuccess('Status do lead atualizado!');
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header Master CRM */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>CRM de Expansão Master</h1>
          <p style={styles.subtitle}>Crescimento estratégico e pipeline de novas transportadoras.</p>
        </div>
        <div style={styles.headerActions}>
           <div style={styles.viewToggle}>
              <button 
                style={{...styles.toggleBtn, ...(viewMode === 'kanban' ? styles.toggleActive : {})}}
                onClick={() => setViewMode('kanban')}
              >
                 <Kanban size={16} /> Kanban
              </button>
              <button 
                style={{...styles.toggleBtn, ...(viewMode === 'list' ? styles.toggleActive : {})}}
                onClick={() => setViewMode('list')}
              >
                 <List size={16} /> Lista
              </button>
           </div>
           <button style={styles.addBtn} onClick={() => setIsLeadModalOpen(true)}>
             <UserPlus size={18} /> Cadastrar Oportunidade
           </button>
        </div>
      </header>

      {/* DASHBOARD DE EXPANSÃO */}
      <div style={styles.statsGrid}>
         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#eff6ff', color: '#2563eb'}}><Target size={20} /></div>
               <span style={styles.statLabel}>Pipeline Total</span>
            </div>
            <div style={styles.statValue}>R$ 1.2M</div>
            <div style={styles.statFooter}>
               <span style={{color: '#10b981', fontWeight: '700', fontSize: '12px'}}><TrendingUp size={12} /> +22%</span>
               <span style={styles.statSub}>em novas propostas</span>
            </div>
         </div>

         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#ecfdf5', color: '#10b981'}}><CheckCircle size={20} /></div>
               <span style={styles.statLabel}>Taxa de Conversão</span>
            </div>
            <div style={styles.statValue}>18.4%</div>
            <div style={styles.statFooter}>
               <span style={styles.statSub}>Média do trimestre</span>
            </div>
         </div>

         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#fef2f2', color: '#ef4444'}}><Zap size={20} /></div>
               <span style={styles.statLabel}>Leads em Risco</span>
            </div>
            <div style={styles.statValue}>12</div>
            <div style={styles.statFooter}>
               <span style={styles.statSub}>Sem contato há 7+ dias</span>
            </div>
         </div>

         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#fff7ed', color: '#f59e0b'}}><Star size={20} /></div>
               <span style={styles.statLabel}>Ticket Médio SaaS</span>
            </div>
            <div style={styles.statValue}>R$ 1.450</div>
            <div style={styles.statFooter}>
               <span style={styles.statSub}>Mix de planos Ouro/Prata</span>
            </div>
         </div>
      </div>

      {/* FUNNEL CHART */}
      <div style={styles.chartRow}>
         <div style={styles.funnelCard}>
            <h3 style={styles.chartTitle}>Funil de Vendas Corporativo</h3>
            <div style={{height: '240px'}}>
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData} layout="vertical">
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} width={70} />
                     <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)'}} />
                     <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={30}>
                        {statsData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
         <div style={styles.miniStatsCard}>
            <div style={styles.mStatItem}>
               <div style={styles.mStatLabel}>Tempo Médio de Fechamento</div>
               <div style={styles.mStatValue}>14 Dias</div>
            </div>
            <div style={styles.mStatItem}>
               <div style={styles.mStatLabel}>Principal Origem</div>
               <div style={styles.mStatValue}>Indicação (Outbound)</div>
            </div>
            <div style={styles.mStatItem}>
               <div style={styles.mStatLabel}>Churn Rate Previsto</div>
               <div style={styles.mStatValue}>1.2%</div>
            </div>
         </div>
      </div>

      {/* KANBAN BOARD OR LIST */}
      {viewMode === 'kanban' ? (
        <div style={styles.kanbanBoard}>
           {funnelStages.map(stage => (
              <div key={stage.id} style={styles.kanbanColumn}>
                 <header style={styles.columnHeader}>
                    <div style={{...styles.columnDot, backgroundColor: stage.color}} />
                    <h4 style={styles.columnTitle}>{stage.name}</h4>
                    <span style={styles.columnCount}>{leads.filter(l => l.status === stage.id).length}</span>
                 </header>
                 <div style={styles.columnScroll}>
                    {leads.filter(l => l.status === stage.id).map(lead => (
                       <div key={lead.id} style={styles.leadCard} onClick={() => setSelectedLead(lead)}>
                          <div style={styles.cardTop}>
                             <span style={{...styles.potentialTag, 
                                backgroundColor: lead.potential === 'OURO' ? '#fef3c7' : '#eff6ff', 
                                color: lead.potential === 'OURO' ? '#92400e' : '#2563eb'
                             }}>{lead.potential}</span>
                             <span style={styles.cardValue}>R$ {lead.value.toLocaleString()}</span>
                          </div>
                          <h5 style={styles.leadName}>{lead.name}</h5>
                          <div style={styles.leadLoc}><MapPin size={10} /> {lead.city}</div>
                          <footer style={styles.cardFooter}>
                             <div style={styles.leadUser}><Users size={12} /> {lead.contact}</div>
                             <div style={styles.leadTime}><Clock size={12} /> {lead.lastContact}</div>
                          </footer>
                       </div>
                    ))}
                    <button style={styles.columnAddBtn}><Plus size={14} /> Adicionar nesta etapa</button>
                 </div>
              </div>
           ))}
        </div>
      ) : (
        <div style={styles.tableWrapper}>
           <table style={styles.table}>
              <thead>
                 <tr>
                    <th style={styles.th}>TRANSPORTADORA</th>
                    <th style={styles.th}>CONTATO</th>
                    <th style={styles.th}>VALOR POTENCIAL</th>
                    <th style={styles.th}>ETAPA</th>
                    <th style={styles.th}>ÚLTIMA INTERAÇÃO</th>
                    <th style={styles.th}>AÇÕES</th>
                 </tr>
              </thead>
              <tbody>
                 {leads.map(lead => (
                    <tr key={lead.id} style={styles.tr}>
                       <td style={styles.td}>
                          <div>
                             <div style={styles.lNameTable}>{lead.name}</div>
                             <div style={styles.lLocTable}>{lead.city}</div>
                          </div>
                       </td>
                       <td style={styles.td}>
                          <div style={styles.lContactTable}>
                             <span>{lead.contact}</span>
                             <span style={{fontSize: '11px', color: '#94a3b8'}}>{lead.email}</span>
                          </div>
                       </td>
                       <td style={styles.td}>
                          <div style={{fontWeight: '800', color: 'var(--primary)'}}>R$ {lead.value.toLocaleString()}</div>
                       </td>
                       <td style={styles.td}>
                          <span style={{
                             ...styles.statusBadge,
                             backgroundColor: funnelStages.find(s => s.id === lead.status)?.color + '15',
                             color: funnelStages.find(s => s.id === lead.status)?.color
                          }}>
                             {funnelStages.find(s => s.id === lead.status)?.name}
                          </span>
                       </td>
                       <td style={styles.td}>
                          <div style={styles.lTimeTable}>{lead.lastContact}</div>
                       </td>
                       <td style={styles.td}>
                          <button style={styles.iconBtn}><MessageSquare size={16} /></button>
                          <button style={styles.iconBtn}><TrendingUp size={16} /></button>
                          <button style={styles.iconBtn}><ChevronRight size={16} /></button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* LEAD DETAILS MODAL */}
      <LogtaModal 
        isOpen={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
        width="800px" 
        title={`Oportunidade: ${selectedLead?.name}`}
      >
         {selectedLead && (
            <div style={styles.modalContent}>
               <div style={styles.modalHeader}>
                  <div style={styles.modalBadgeRow}>
                     <span style={styles.potentialTag}>{selectedLead.potential}</span>
                     <span style={styles.statusBadge}>{funnelStages.find(s => s.id === selectedLead.status)?.name}</span>
                  </div>
                  <div style={styles.modalPrice}>R$ {selectedLead.value.toLocaleString()} / ano</div>
               </div>

               <div style={styles.modalTabs}>
                  <div style={{...styles.mTab, borderBottom: '2px solid var(--primary)', color: 'var(--primary)'}}>Visão Geral</div>
                  <div style={styles.mTab}>Histórico</div>
                  <div style={styles.mTab}>Arquivos</div>
                  <div style={styles.mTab}>Follow-ups</div>
               </div>

               <div style={styles.modalBody}>
                  <div style={styles.infoGrid}>
                     <div style={styles.iGroup}>
                        <label style={styles.iLabel}>Responsável Decisor</label>
                        <div style={styles.iValue}>{selectedLead.contact}</div>
                     </div>
                     <div style={styles.iGroup}>
                        <label style={styles.iLabel}>Email Corporativo</label>
                        <div style={styles.iValue}>{selectedLead.email}</div>
                     </div>
                     <div style={styles.iGroup}>
                        <label style={styles.iLabel}>Localização</label>
                        <div style={styles.iValue}>{selectedLead.city}</div>
                     </div>
                     <div style={styles.iGroup}>
                        <label style={styles.iLabel}>Origem do Lead</label>
                        <div style={styles.iValue}>Prospecção Ativa LinkedIn</div>
                     </div>
                  </div>

                  <div style={styles.interactionLog}>
                     <h4 style={styles.logTitle}>Ações & Follow-ups Recentes</h4>
                     <div style={styles.logItem}>
                        <div style={styles.logDot} />
                        <div>
                           <div style={styles.logText}><b>Alison Master</b> enviou proposta comercial em PDF.</div>
                           <div style={styles.logDate}>Ontem às 14:20</div>
                        </div>
                     </div>
                     <div style={styles.logItem}>
                        <div style={styles.logDot} />
                        <div>
                           <div style={styles.logText}><b>Sistema</b> registrou abertura do email de apresentação.</div>
                           <div style={styles.logDate}>Há 2 dias</div>
                        </div>
                     </div>
                  </div>
               </div>

               <footer style={styles.modalFooter}>
                  <button style={styles.secondaryBtn} onClick={() => setSelectedLead(null)}>Fechar</button>
                  <div style={{display: 'flex', gap: '12px'}}>
                     <button style={{...styles.primaryBtn, backgroundColor: '#ecfdf5', color: '#10b981', border: '1px solid #d1fae5'}}><DollarSign size={16} /> Registrar Venda</button>
                     <button style={styles.primaryBtn}>Avançar Estágio →</button>
                  </div>
               </footer>
            </div>
         )}
      </LogtaModal>

      {/* NEW LEAD MODAL */}
      <LogtaModal 
        isOpen={isLeadModalOpen} 
        onClose={() => setIsLeadModalOpen(false)} 
        width="600px" 
        title="Nova Transportadora no Pipeline"
      >
         <div style={styles.form}>
            <div style={styles.formRow}>
               <div style={styles.inputGroup}>
                  <label style={styles.label}>Nome da Empresa</label>
                  <input style={styles.input} placeholder="Ex: TransNorte S.A." />
               </div>
            </div>
            <div style={styles.formGrid2}>
               <div style={styles.inputGroup}>
                  <label style={styles.label}>Cidade/UF</label>
                  <input style={styles.input} placeholder="Ex: São Paulo, SP" />
               </div>
               <div style={styles.inputGroup}>
                  <label style={styles.label}>Potencial do Lead</label>
                  <select style={styles.input}>
                     <option value="BRONZE">Bronze (Iniciante)</option>
                     <option value="PRATA">Prata (Médio)</option>
                     <option value="OURO">Ouro (Enterprise)</option>
                  </select>
               </div>
            </div>
            <div style={styles.formGrid2}>
               <div style={styles.inputGroup}>
                  <label style={styles.label}>Contato Principal</label>
                  <input style={styles.input} placeholder="Nome do diretor/gerente" />
               </div>
               <div style={styles.inputGroup}>
                  <label style={styles.label}>Valor Estimado (Ano)</label>
                  <input style={styles.input} placeholder="R$ 0,00" />
               </div>
            </div>
            <button style={styles.submitBtn} onClick={() => { toastSuccess('Lead inserido no funil!'); setIsLeadModalOpen(false); }}>
               Inserir no Funil Logta de Crescimento 🔥
            </button>
         </div>
      </LogtaModal>
    </div>
  );
};

const styles = {
  container: { padding: '0', backgroundColor: 'transparent', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-1.5px' },
  subtitle: { color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500' },
  headerActions: { display: 'flex', gap: '16px', alignItems: 'center' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' },
  
  viewToggle: { display: 'flex', backgroundColor: 'white', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' },
  toggleBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', borderRadius: '8px', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' },
  toggleActive: { backgroundColor: 'var(--primary-light)', color: 'var(--primary)' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  statHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  statIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const },
  statValue: { fontSize: '32px', fontWeight: '900', color: 'var(--primary)', marginBottom: '8px' },
  statFooter: { display: 'flex', alignItems: 'center', gap: '6px' },
  statSub: { fontSize: '11px', color: '#94a3b8', fontWeight: '600' },

  chartRow: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '32px' },
  funnelCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  chartTitle: { fontSize: '16px', fontWeight: '800', color: 'var(--primary)', marginBottom: '20px' },
  miniStatsCard: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  mStatItem: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' },
  mStatLabel: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: '4px' },
  mStatValue: { fontSize: '20px', fontWeight: '900', color: 'var(--primary)' },

  kanbanBoard: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', minHeight: '600px', alignItems: 'flex-start' },
  kanbanColumn: { backgroundColor: '#f1f5f9', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '16px', minHeight: '500px' },
  columnHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  columnDot: { width: '8px', height: '8px', borderRadius: '50%' },
  columnTitle: { fontSize: '13px', fontWeight: '800', color: '#475569', flex: 1 },
  columnCount: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', backgroundColor: 'white', padding: '2px 8px', borderRadius: '10px' },
  columnScroll: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  
  leadCard: { backgroundColor: 'white', padding: '16px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'scale(1.02)', boxShadow: 'var(--shadow-md)' } },
  cardTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  potentialTag: { fontSize: '9px', fontWeight: '900', padding: '2px 8px', borderRadius: '6px' },
  cardValue: { fontSize: '11px', fontWeight: '800', color: 'var(--primary)' },
  leadName: { fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' },
  leadLoc: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8', fontWeight: '600' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f8fafc', marginTop: '12px', paddingTop: '12px' },
  leadUser: { fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' },
  leadTime: { fontSize: '9px', fontWeight: '600', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' },
  columnAddBtn: { border: '2px dashed #cbd5e1', background: 'none', borderRadius: '12px', padding: '12px', color: '#94a3b8', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },

  tableWrapper: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { backgroundColor: '#f8fafc', padding: '16px 24px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
  td: { padding: '16px 24px' },
  lNameTable: { fontSize: '15px', fontWeight: '800', color: 'var(--primary)' },
  lLocTable: { fontSize: '12px', color: '#94a3b8', fontWeight: '600' },
  lContactTable: { display: 'flex', flexDirection: 'column' as const },
  lTimeTable: { fontSize: '12px', fontWeight: '700', color: '#64748b' },
  statusBadge: { fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px' },
  iconBtn: { padding: '8px', border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' },

  // Modal Detail Styles
  modalContent: { padding: '0px' },
  modalHeader: { padding: '24px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalBadgeRow: { display: 'flex', gap: '8px' },
  modalPrice: { fontSize: '20px', fontWeight: '950', color: 'var(--primary)' },
  modalTabs: { display: 'flex', gap: '32px', padding: '0 32px', borderBottom: '1px solid var(--border)' },
  mTab: { padding: '16px 0', fontSize: '13px', fontWeight: '800', color: '#94a3b8', cursor: 'pointer' },
  modalBody: { padding: '32px' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' },
  iGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  iLabel: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const },
  iValue: { fontSize: '14px', fontWeight: '800', color: 'var(--primary)' },
  interactionLog: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  logTitle: { fontSize: '14px', fontWeight: '900', color: 'var(--primary)', marginBottom: '8px' },
  logItem: { display: 'flex', gap: '16px' },
  logDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '6px' },
  logText: { fontSize: '13px', color: '#475569' },
  logDate: { fontSize: '11px', color: '#94a3b8', fontWeight: '700' },
  modalFooter: { padding: '24px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' },
  secondaryBtn: { padding: '12px 24px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' },

  // Form Styles
  form: { padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  formRow: { width: '100%' },
  formGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const },
  input: { padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', fontWeight: '700', outline: 'none' },
  submitBtn: { padding: '18px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', marginTop: '12px', boxShadow: 'var(--shadow-lg)' }
};

export default MasterCRM;
