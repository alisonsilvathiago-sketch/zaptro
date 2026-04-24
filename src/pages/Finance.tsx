import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, Search, Download, Edit2, MoreVertical,
  Layers, Clock, BarChart3, Activity,
  Target, Calculator as CalcIcon, FileText,
  CreditCard, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ModuleLayout from '../layouts/ModuleLayout';
import LogtaModal from '../components/Modal';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import EmptyState from '../components/EmptyState';
import FinanceCalculator from '../components/FinanceCalculator';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  due_date: string;
  category?: string;
  created_at?: string;
}

const COLORS = ['#D9FF00', '#10b981', '#f59e0b', '#ef4444', '#000000'];

const Finance: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PAID' | 'OVERDUE'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    description: '', amount: '', type: 'INCOME' as 'INCOME' | 'EXPENSE',
    status: 'PENDING' as 'PENDING' | 'PAID' | 'OVERDUE',
    due_date: '', category: ''
  });

  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/areceber')) return 'areceber';
    if (path.includes('/apagar')) return 'apagar';
    if (path.includes('/faturamento')) return 'faturamento';
    if (path.includes('/relatorios')) return 'relatorios';
    if (path.includes('/inteligencia')) return 'inteligencia';
    return 'dashboard';
  }, [location.pathname]);

  const navItems = [
    { id: 'inteligencia', label: 'Centro de Inteligência', icon: Target },
    { id: 'dashboard', label: 'Resumo Financeiro', icon: BarChart3 },
    { id: 'areceber', label: 'Contas a Receber', icon: ArrowUpRight },
    { id: 'apagar', label: 'Contas a Pagar', icon: ArrowDownRight },
    { id: 'faturamento', label: 'Faturamento', icon: DollarSign },
    { id: 'relatorios', label: 'Relatórios & DRE', icon: Activity },
  ];

  const onTabChange = (id: string) => {
    if (id === 'inteligencia') navigate('/financeiro');
    else navigate(`/financeiro/${id}`);
  };

  const fetchTransactions = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [profile?.company_id]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [transactions, searchTerm, filterStatus]);

  const kpis = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((a, t) => a + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((a, t) => a + t.amount, 0);
    const pending = transactions.filter(t => t.status === 'PENDING').reduce((a, t) => a + t.amount, 0);
    const overdue = transactions.filter(t => t.status === 'OVERDUE').length;
    return { income, expense, pending, overdue, balance: income - expense };
  }, [transactions]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;
    const tid = toastLoading('Salvando lançamento...');
    try {
      const { error } = await supabase.from('transactions').insert([{
        company_id: profile.company_id,
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount) || 0,
        type: newTransaction.type,
        status: newTransaction.status,
        due_date: newTransaction.due_date || null,
        category: newTransaction.category,
      }]);
      if (error) throw error;
      toastDismiss(tid);
      toastSuccess('Lançamento criado com sucesso!');
      setIsAddModalOpen(false);
      setNewTransaction({ description: '', amount: '', type: 'INCOME', status: 'PENDING', due_date: '', category: '' });
      fetchTransactions();
    } catch (err: any) {
      toastDismiss(tid);
      toastError(`Erro: ${err.message}`);
    }
  };

  const chartData = [
    { name: 'Jan', receita: 12000, despesa: 8000 },
    { name: 'Fev', receita: 15000, despesa: 9500 },
    { name: 'Mar', receita: 13500, despesa: 7800 },
    { name: 'Abr', receita: 18000, despesa: 11000 },
    { name: 'Mai', receita: 16500, despesa: 10200 },
    { name: 'Jun', receita: 21000, despesa: 12500 },
  ];

  const renderKPIs = () => (
    <div style={styles.kpiGrid}>
      {[
        { label: 'Saldo Disponível', value: formatCurrency(kpis.balance), color: '#D9FF00', icon: CreditCard, bg: 'rgba(217, 255, 0, 0.18)', trend: '+8.2%', up: true },
        { label: 'Receitas (Pagas)', value: formatCurrency(kpis.income), color: '#10b981', icon: ArrowUpRight, bg: '#ecfdf5', trend: '+12.5%', up: true },
        { label: 'Despesas (Pagas)', value: formatCurrency(kpis.expense), color: '#ef4444', icon: ArrowDownRight, bg: '#fef2f2', trend: '-3.1%', up: false },
        { label: 'A Receber (Pendente)', value: formatCurrency(kpis.pending), color: '#f59e0b', icon: Clock, bg: '#fffbeb', trend: `${kpis.overdue} vencidos`, up: false },
      ].map((k, i) => (
        <div key={i} style={styles.kpiCard}>
          <div style={styles.kpiTop}>
            <div style={{ ...styles.kpiIcon, backgroundColor: k.bg, color: k.color }}>
              <k.icon size={20} />
            </div>
            <span style={{ ...styles.kpiTrend, color: k.up ? '#10b981' : '#ef4444' }}>{k.trend}</span>
          </div>
          <h3 style={styles.kpiValue}>{k.value}</h3>
          <p style={styles.kpiLabel}>{k.label}</p>
        </div>
      ))}
    </div>
  );

  const renderFilterBar = () => (
    <div style={styles.filterBar}>
      <div style={styles.searchWrapper}>
        <Search size={16} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Filtrar por descrição..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div style={styles.filterActions}>
        <select style={styles.selectFilter} value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
          <option value="ALL">Todos os Status</option>
          <option value="PAID">Pago</option>
          <option value="PENDING">Pendente</option>
          <option value="OVERDUE">Atrasado</option>
        </select>
        <button style={styles.btnSecondary} title="Baixar PDF" onClick={() => toastSuccess('Exportando PDF...')}>
          <Download size={16} />
        </button>
        <button style={styles.btnSecondary} title="Baixar Excel" onClick={() => toastSuccess('Exportando Excel...')}>
          <FileText size={16} />
        </button>
        <button style={styles.btnPrimary} onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} /> Novo Lançamento
        </button>
      </div>
    </div>
  );

  const renderTable = (typeFilter?: 'INCOME' | 'EXPENSE') => {
    const data = filteredTransactions.filter(t => !typeFilter || t.type === typeFilter);
    return (
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Descrição</th>
              <th style={styles.th}>Categoria</th>
              <th style={styles.th}>Vencimento</th>
              <th style={styles.th}>Valor</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map(t => (
              <tr key={t.id} style={styles.tr}>
                <td style={styles.td}>{t.description}</td>
                <td style={styles.td}>
                  <span style={styles.categoryBadge}>{t.category || '—'}</span>
                </td>
                <td style={styles.td}>
                  {t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td style={styles.td}>
                  <strong style={{ color: t.type === 'INCOME' ? '#10b981' : '#ef4444' }}>
                    {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                  </strong>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusTag,
                    backgroundColor: t.status === 'PAID' ? '#dcfce7' : t.status === 'OVERDUE' ? '#fee2e2' : '#fef9c3',
                    color: t.status === 'PAID' ? '#166534' : t.status === 'OVERDUE' ? '#991b1b' : '#854d0e'
                  }}>
                    {t.status === 'PAID' ? 'Pago' : t.status === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                  </span>
                </td>
                <td style={styles.td}>
                  <button style={styles.iconBtn}><Edit2 size={14} /></button>
                  <button style={styles.iconBtn}><MoreVertical size={14} /></button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>
                  <Layers size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} />
                  <p style={{ fontWeight: '600', margin: 0 }}>Nenhum lançamento encontrado.</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>Clique em "Novo Lançamento" para começar.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDashboard = () => (
    <div style={styles.tabContent}>
      {renderKPIs()}
      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h4 style={styles.chartTitle}>Fluxo de Caixa (6 meses)</h4>
            <button style={styles.refreshBtn} onClick={fetchTransactions}><RefreshCw size={14} /></button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={3} fill="url(#colorReceita)" name="Receita" />
              <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={3} fill="url(#colorDespesa)" name="Despesa" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Alertas Financeiros</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {[
              { label: 'Contas vencendo hoje', value: '3', color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Em atraso', value: String(kpis.overdue), color: '#ef4444', bg: '#fef2f2' },
              { label: 'Pagamentos (questa semana)', value: '7', color: '#10b981', bg: '#ecfdf5' },
              { label: 'Receitas previstas (30 dias)', value: formatCurrency(kpis.pending), color: '#D9FF00', bg: 'rgba(217, 255, 0, 0.18)' },
            ].map((alert, i) => (
              <div key={i} style={{ ...styles.alertItem, backgroundColor: alert.bg }}>
                <div style={{ ...styles.alertDot, backgroundColor: alert.color }} />
                <span style={styles.alertLabel}>{alert.label}</span>
                <span style={{ ...styles.alertValue, color: alert.color }}>{alert.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {renderFilterBar()}
      {renderTable()}
    </div>
  );

  const renderInteligencia = () => (
    <div style={styles.tabContent}>
      <div style={styles.intelBanner}>
        <img
          src="https://images.unsplash.com/photo-1551288049-bbbda536639a?auto=format&fit=crop&q=80&w=2000"
          style={styles.intelBannerImg}
          alt="Financial Intelligence"
        />
        <div style={styles.intelBannerOverlay}>
          <div style={styles.intelBadge}>CENTRO DE INTELIGÊNCIA FINANCEIRA</div>
          <h2 style={{ color: 'white', fontSize: '28px', fontWeight: '700', margin: '8px 0' }}>
            Análise Preditiva do Fluxo Financeiro
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            Insights estratégicos e previsões baseadas em inteligência artificial.
          </p>
        </div>
      </div>

      {renderKPIs()}

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Receita vs Despesa (Mensal)</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
              <Bar dataKey="receita" fill="#10b981" radius={[8, 8, 0, 0]} name="Receita" />
              <Bar dataKey="despesa" fill="#ef4444" radius={[8, 8, 0, 0]} name="Despesa" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Distribuição de Gastos</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Operacional', value: 35 },
                  { name: 'Pessoal', value: 28 },
                  { name: 'Manutenção', value: 18 },
                  { name: 'Outros', value: 19 },
                ]}
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
            {['Operacional', 'Pessoal', 'Manutenção', 'Outros'].map((label, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[i], display: 'inline-block' }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.intelInsights}>
        <h4 style={styles.chartTitle}>💡 Insights Automáticos (IA)</h4>
        {[
          { icon: '📈', text: 'Sua receita cresceu 12.5% comparado ao mesmo período do ano anterior.', type: 'positive' },
          { icon: '⚠️', text: `Você tem ${kpis.overdue} pagamentos em atraso. Regularize para evitar juros.`, type: 'warning' },
          { icon: '🎯', text: 'Meta de faturamento mensal atingida em 84%. Faltam R$ 3.200 para 100%.', type: 'info' },
        ].map((insight, i) => (
          <div key={i} style={{
            ...styles.insightItem,
            backgroundColor: insight.type === 'positive' ? '#ecfdf5' : insight.type === 'warning' ? '#fffbeb' : 'rgba(217, 255, 0, 0.12)',
            borderLeftColor: insight.type === 'positive' ? '#10b981' : insight.type === 'warning' ? '#f59e0b' : '#D9FF00',
          }}>
            <span style={{ fontSize: '20px' }}>{insight.icon}</span>
            <p style={styles.insightText}>{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const headerActions = (
    <button style={styles.calcBtn} onClick={() => setIsCalcOpen(true)}>
      <CalcIcon size={16} /> Calculadora
    </button>
  );

  return (
    <>
      <ModuleLayout
        title="Financeiro"
        badge="GESTÃO FINANCEIRA"
        items={navItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
        actions={headerActions}
      >
        <div style={styles.content}>
          {activeTab === 'dashboard' && renderDashboard()}

          {activeTab === 'areceber' && (
            <div style={styles.tabContent}>
              {renderKPIs()}
              {renderFilterBar()}
              {renderTable('INCOME')}
            </div>
          )}

          {activeTab === 'apagar' && (
            <div style={styles.tabContent}>
              {renderKPIs()}
              {renderFilterBar()}
              {renderTable('EXPENSE')}
            </div>
          )}

          {activeTab === 'faturamento' && (
            <div style={styles.tabContent}>
              {renderKPIs()}
              {renderFilterBar()}
              {renderTable()}
            </div>
          )}

          {activeTab === 'relatorios' && (
            <EmptyState
              title="Relatórios & DRE"
              description="Demonstrativo de Resultado do Exercício e relatórios gerenciais completos. Configure o módulo para visualizar análises detalhadas."
              actionLabel="Gerar Relatório"
              onAction={() => toastSuccess('Gerando relatório...')}
            />
          )}

          {activeTab === 'inteligencia' && renderInteligencia()}
        </div>
      </ModuleLayout>

      {/* Calculator Modal */}
      <LogtaModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} title="Calculadora Financeira Avançada" width="900px">
        <FinanceCalculator />
      </LogtaModal>

      {/* Add Transaction Modal */}
      <LogtaModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Novo Lançamento" width="600px">
        <form onSubmit={handleAddTransaction} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Descrição *</label>
            <input
              style={styles.formInput}
              required
              placeholder="Ex: Recebimento Frete ABC Ltda"
              value={newTransaction.description}
              onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Valor (R$) *</label>
              <input
                style={styles.formInput}
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={newTransaction.amount}
                onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo *</label>
              <select style={styles.formInput} value={newTransaction.type} onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value as any })}>
                <option value="INCOME">Receita (Entrada)</option>
                <option value="EXPENSE">Despesa (Saída)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Vencimento</label>
              <input style={styles.formInput} type="date" value={newTransaction.due_date} onChange={e => setNewTransaction({ ...newTransaction, due_date: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select style={styles.formInput} value={newTransaction.status} onChange={e => setNewTransaction({ ...newTransaction, status: e.target.value as any })}>
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
                <option value="OVERDUE">Atrasado</option>
              </select>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Categoria</label>
            <input
              style={styles.formInput}
              placeholder="Ex: Fretes, Combustível, Manutenção..."
              value={newTransaction.category}
              onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })}
            />
          </div>
          <button type="submit" style={styles.btnPrimary}>
            <Plus size={16} /> Salvar Lançamento
          </button>
        </form>
      </LogtaModal>
    </>
  );
};

const styles: Record<string, any> = {
  content: { display: 'flex', flexDirection: 'column', gap: '24px' },
  tabContent: { display: 'flex', flexDirection: 'column', gap: '24px' },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' },
  kpiCard: {
    backgroundColor: 'white', padding: '24px', borderRadius: '24px',
    border: '1px solid #e8e8e8', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
  },
  kpiTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  kpiIcon: { width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiTrend: { fontSize: '12px', fontWeight: '600' },
  kpiValue: { fontSize: '26px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 4px 0', letterSpacing: '-0.5px' },
  kpiLabel: { fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', margin: 0 },

  filterBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', padding: '16px 20px', borderRadius: '18px',
    border: '1px solid #e8e8e8', gap: '16px', flexWrap: 'wrap'
  },
  searchWrapper: {
    display: 'flex', alignItems: 'center', gap: '10px',
    flex: 1, minWidth: '220px', backgroundColor: '#f4f4f4',
    borderRadius: '12px', padding: '10px 16px', border: '1px solid #e8e8e8'
  },
  searchIcon: { color: '#94a3b8', flexShrink: 0 },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', backgroundColor: 'transparent', flex: 1, color: 'var(--text-main)' },
  filterActions: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  selectFilter: {
    padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0',
    fontSize: '13px', fontWeight: '700', color: '#475569', backgroundColor: 'white', cursor: 'pointer'
  },
  btnSecondary: {
    padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0',
    backgroundColor: 'white', cursor: 'pointer', color: '#64748b',
    display: 'flex', alignItems: 'center', gap: '6px'
  },
  btnPrimary: {
    padding: '10px 18px', borderRadius: '12px', backgroundColor: 'var(--primary)',
    color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
  },
  calcBtn: {
    padding: '10px 18px', borderRadius: '12px', backgroundColor: 'rgba(217, 255, 0, 0.18)',
    color: 'var(--primary)', border: '1px solid rgba(217, 255, 0, 0.2)', fontWeight: '600',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
  },

  chartsGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
  chartCard: { backgroundColor: 'white', padding: '28px', borderRadius: '24px', border: '1px solid #e8e8e8' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  chartTitle: { fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 20px 0' },
  refreshBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' },

  alertItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 16px', borderRadius: '14px'
  },
  alertDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  alertLabel: { flex: 1, fontSize: '13px', fontWeight: '700', color: '#475569' },
  alertValue: { fontSize: '14px', fontWeight: '700' },

  tableCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e8e8e8', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '16px 24px', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e8e8e8', backgroundColor: '#fcfdfe' },
  td: { padding: '16px 24px', fontSize: '14px', borderBottom: '1px solid #e8e8e8', color: '#475569' },
  tr: { transition: 'background-color 0.2s' },
  statusTag: { padding: '5px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' },
  categoryBadge: { padding: '4px 8px', backgroundColor: '#f4f4f4', borderRadius: '8px', fontSize: '11px', color: '#64748b', fontWeight: '700', border: '1px solid #e8e8e8' },
  iconBtn: { padding: '6px', color: '#94a3b8', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px' },

  intelBanner: { position: 'relative', borderRadius: '24px', overflow: 'hidden', height: '220px' },
  intelBannerImg: { width: '100%', height: '100%', objectFit: 'cover' },
  intelBannerOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to right, rgba(15,23,42,0.92), rgba(15,23,42,0.4))',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px'
  },
  intelBadge: {
    display: 'inline-block', padding: '4px 12px', backgroundColor: 'rgba(217, 255, 0, 0.3)',
    color: '#c4b5fd', borderRadius: '20px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px',
    border: '1px solid rgba(196,181,253,0.3)'
  },

  intelInsights: { backgroundColor: 'white', padding: '28px', borderRadius: '24px', border: '1px solid #e8e8e8' },
  insightItem: {
    display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px 20px',
    borderRadius: '14px', borderLeft: '4px solid transparent', marginBottom: '12px'
  },
  insightText: { margin: 0, fontSize: '14px', color: '#475569', fontWeight: '600', lineHeight: '1.5' },

  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' },
  formInput: { padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', color: 'var(--text-main)' },
};

export default Finance;
