import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Users, Map, Truck, Package, CreditCard, 
  Target, ShoppingCart, History as HistoryIcon, FileText, Activity, 
  TrendingUp, AlertTriangle, Search, Plus, DollarSign, LayoutDashboard, User
} from 'lucide-react';

const ModulePage: React.FC = () => {
  const location = useLocation();
  const [loading] = useState(false);

  // Mapeamento de títulos e ícones por módulo/subpágina
  const getPageConfig = () => {
    const path = location.pathname;
    
    // CRM
    if (path.includes('/crm/clientes')) return { title: 'Gestão de Clientes', Icon: Users, color: '#D9FF00' };
    if (path.includes('/crm/leads')) return { title: 'Pipeline de Leads', Icon: Target, color: '#D9FF00' };
    if (path.includes('/crm/pedidos')) return { title: 'Pedidos de Venda', Icon: ShoppingCart, color: '#D9FF00' };
    if (path.includes('/crm/historico')) return { title: 'Histórico Comercial', Icon: HistoryIcon, color: '#D9FF00' };
    if (path.includes('/crm/perfil')) return { title: 'Perfil do Cliente', Icon: User, color: '#D9FF00' };
    
    // LOGISTICA
    if (path.includes('/logistica/rotas')) return { title: 'Planejamento de Rotas', Icon: Map, color: '#D9FF00' };
    if (path.includes('/logistica/mapa')) return { title: 'Mapa em Tempo Real', Icon: Activity, color: '#D9FF00' };
    if (path.includes('/logistica/historico')) return { title: 'Histórico de Entregas', Icon: HistoryIcon, color: '#D9FF00' };
    
    // RH
    if (path.includes('/rh/funcionarios')) return { title: 'Quadro de Colaboradores', Icon: Users, color: '#ec4899' };
    if (path.includes('/rh/documentos')) return { title: 'Gestão de Documentos', Icon: FileText, color: '#ec4899' };
    if (path.includes('/rh/desempenho')) return { title: 'Avaliação de Desempenho', Icon: TrendingUp, color: '#ec4899' };
    if (path.includes('/rh/historico')) return { title: 'Histórico de RH', Icon: HistoryIcon, color: '#ec4899' };
    
    // FINANCAS
    if (path.includes('/financeiro/pagamentos')) return { title: 'Contas a Pagar', Icon: CreditCard, color: '#10b981' };
    if (path.includes('/financeiro/recebimentos')) return { title: 'Contas a Receber', Icon: DollarSign, color: '#10b981' };
    if (path.includes('/financeiro/relatorios')) return { title: 'Relatórios Financeiros', Icon: TrendingUp, color: '#10b981' };
    
    // ESTOQUE
    if (path.includes('/estoque/produtos')) return { title: 'Catálogo de Produtos', Icon: Package, color: '#f59e0b' };
    if (path.includes('/estoque/entradas')) return { title: 'Entrada de Mercadorias', Icon: Plus, color: '#f59e0b' };
    if (path.includes('/estoque/saidas')) return { title: 'Saída / Expedição', Icon: ShoppingCart, color: '#f59e0b' };

    // FROTA
    if (path.includes('/frota/veiculos')) return { title: 'Gestão de Veículos', Icon: Truck, color: '#D9FF00' };
    if (path.includes('/frota/historico')) return { title: 'Histórico da Frota', Icon: HistoryIcon, color: '#D9FF00' };

    return { title: 'Visão Geral', Icon: LayoutDashboard, color: 'var(--primary)' };
  };

  const config = getPageConfig();
  const Icon = config.Icon;

  if (loading) return <div>Carregando...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{...styles.iconBox, backgroundColor: config.color}}>
          <Icon />
        </div>
        <div>
          <h1 style={styles.title}>{config.title}</h1>
          <p style={styles.subtitle}>Gerenciamento completo e integrado ao sistema Logta.</p>
        </div>
        <div style={styles.actions}>
          <button style={styles.mainBtn}>
            <Plus size={18} /> Novo Registro
          </button>
        </div>
      </header>

      <div style={styles.filterBar}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input type="text" placeholder="Buscar registros..." style={styles.searchInput} />
        </div>
        <div style={styles.filterGroups}>
          <select style={styles.select}><option>Todos os Status</option></select>
          <select style={styles.select}><option>Últimos 30 dias</option></select>
        </div>
      </div>

      <div style={styles.contentGrid}>
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <span>Item / Identificação</span>
            <span>Responsável / Contato</span>
            <span>Status Atual</span>
            <span>Data</span>
            <span>Ações</span>
          </div>
          
          {[1,2,3,4,5].map(i => (
            <div key={i} style={styles.tableRow}>
              <div style={styles.idCell}>
                <div style={styles.avatarMini}>{config.title[0]}</div>
                <div>
                  <div style={styles.itemName}>Registro #{1000 + i}</div>
                  <div style={styles.itemSub}>ID: REG-{i}00X</div>
                </div>
              </div>
              <div style={styles.contactCell}>
                <div style={styles.contactName}>Empresa Exemplo {i}</div>
                <div style={styles.contactEmail}>contato@exemplo.com.br</div>
              </div>
              <div>
                <span style={styles.statusBadge}>Em processamento</span>
              </div>
              <div style={styles.dateCell}>09/04/2026</div>
              <div style={styles.actionsCell}>
                <button style={styles.actionBtn}>Detalhes</button>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.summaryBox}>
          <h3 style={styles.summaryTitle}>Resumo do Módulo</h3>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total Ativos</span>
            <span style={styles.statValue}>124</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Pendências</span>
            <span style={styles.statValue}>12</span>
          </div>
          
          <div style={styles.alertBox}>
            <AlertTriangle size={20} style={{color: '#f59e0b'}} />
            <p style={styles.alertText}>Existem registros aguardando aprovação.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '8px' },
  iconBox: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: 'none' },
  title: { fontSize: '28px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.5px' },
  subtitle: { color: 'var(--text-muted)', fontSize: '15px' },
  actions: { marginLeft: 'auto' },
  mainBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' },
  searchWrapper: { position: 'relative' as const, flex: 1, maxWidth: '400px' },
  searchIcon: { position: 'absolute' as const, left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  searchInput: { width: '100%', padding: '10px 16px 10px 40px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px' },
  filterGroups: { display: 'flex', gap: '12px' },
  select: { padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'white', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' },
  tableCard: { backgroundColor: 'white', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' },
  tableHeader: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px', padding: '16px 24px', borderBottom: '2px solid var(--border)', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const },
  tableRow: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px', padding: '16px 24px', alignItems: 'center', borderBottom: '1px solid var(--border)', backgroundColor: 'white' },
  idCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatarMini: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary)' },
  itemName: { fontWeight: '700', fontSize: '15px', color: '#1e293b' },
  itemSub: { fontSize: '12px', color: '#64748b' },
  contactCell: { display: 'flex', flexDirection: 'column' as const },
  contactName: { fontSize: '14px', fontWeight: '600' },
  contactEmail: { fontSize: '12px', color: '#64748b' },
  statusBadge: { padding: '4px 10px', borderRadius: '20px', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: '700' },
  dateCell: { fontSize: '13px', color: '#64748b' },
  actionsCell: {},
  actionBtn: { padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  summaryBox: { backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '24px', height: 'fit-content' },
  summaryTitle: { fontSize: '18px', fontWeight: '800', marginBottom: '20px' },
  statItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  statLabel: { color: '#64748b', fontSize: '14px' },
  statValue: { fontWeight: '700', fontSize: '16px' },
  alertBox: { marginTop: '24px', padding: '16px', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7', display: 'flex', gap: '12px' },
  alertText: { fontSize: '12px', color: '#92400e', lineHeight: '1.4' }
};

export default ModulePage;
