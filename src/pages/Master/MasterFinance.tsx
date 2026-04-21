import React, { useState, useEffect } from 'react';
import {
   DollarSign, TrendingUp, TrendingDown, Clock,
   Search, Download, Filter, ArrowUpRight,
   CheckCircle, AlertTriangle, Building2, Calendar, Mail, Send,
   CreditCard, Activity, ArrowDownRight, Briefcase, 
   MoreVertical, RefreshCw, BarChart3, PieChart as PieIcon,
   UserCheck, Wallet, ShieldCheck, Target, Zap, 
   Users, Ban, CheckCircle2, MoreHorizontal, Settings,
   Eye, Edit3, Trash2, X, Plus
} from 'lucide-react';
import { 
   BarChart, Bar, XAxis, YAxis, CartesianGrid, 
   Tooltip, ResponsiveContainer, AreaChart, Area,
   PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import LogtaModal from '../../components/Modal';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  due_date: string;
  category: string;
  company_id: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const MasterFinance: React.FC = () => {
   const [loading, setLoading] = useState(true);
   const [subs, setSubs] = useState<any[]>([]);
   const [selectedCompany, setSelectedCompany] = useState<any>(null);
   const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
   const [tenantTransactions, setTenantTransactions] = useState<Transaction[]>([]);
   const [tenantStats, setTenantStats] = useState({ income: 0, expense: 0, balance: 0 });
   const [isSubModalOpen, setIsSubModalOpen] = useState(false);
   const [selectedSub, setSelectedSub] = useState<any>(null);
   
   const [stats, setStats] = useState({
      totalMRR: 0,
      consumablesRevenue: 0, 
      oneTimeRevenue: 0, 
      globalVolume: 1245000, 
      activeCompanies: 0,
      overdueCompanies: 0,
      trialCompanies: 0,
      systemCreditLiquidity: 0, 
      churn: 1.2
   });

   const mrrHistory = [
      { month: 'Jan', mrr: 12000 },
      { month: 'Fev', mrr: 15000 },
      { month: 'Mar', mrr: 18500 },
      { month: 'Abr', mrr: 22000 },
      { month: 'Mai', mrr: 28000 },
      { month: 'Jun', mrr: 35000 },
      { month: 'Jul', mrr: 42000 },
   ];

   const fetchData = async () => {
      setLoading(true);
      try {
         // 1. Buscar Subscriptions (SaaS Core)
         const { data: subsData } = await supabase
            .from('subscriptions')
            .select('*, companies (id, name, plan, status_empresa, trial_ends_at, billing_status)')
            .order('created_at', { ascending: false });

         setSubs(subsData || []);

         const mrr = subsData?.filter(s => s.status === 'ATIVO').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
         
         // 2. Buscar Transações de Consumíveis e Cursos
         const { data: salesData } = await supabase
            .from('company_entitlements')
            .select('*, product:master_products_catalog(*)');

         const creditRev = salesData?.filter(s => s.product?.type === 'WHATSAPP_CREDITS').reduce((acc, curr) => acc + Number(curr.product?.price), 0) || 0;
         const courseRev = salesData?.filter(s => s.product?.type === 'COURSE').reduce((acc, curr) => acc + Number(curr.product?.price), 0) || 0;

         // 3. Liquidez de Créditos
         const { data: wallets } = await supabase.from('company_wallet').select('credits_balance');
         const liquidity = wallets?.reduce((acc, curr) => acc + curr.credits_balance, 0) || 0;

         // 4. Contagem de Trials
         const { count: trialCount } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
            .eq('billing_status', 'trial');

         setStats(prev => ({
            ...prev,
            totalMRR: mrr,
            consumablesRevenue: creditRev,
            oneTimeRevenue: courseRev,
            activeCompanies: subsData?.filter(s => s.status === 'ATIVO').length || 0,
            overdueCompanies: subsData?.filter(s => s.status === 'VENCIDO').length || 0,
            trialCompanies: Number(trialCount) || 0,
            systemCreditLiquidity: liquidity
         }));

      } catch (err) {
         console.error('Master Finance Global Error:', err);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);

   const handleDrilldown = async (company: any) => {
      setSelectedCompany(company);
      setIsDrilldownOpen(true);
      try {
         const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('company_id', company.id)
            .order('due_date', { ascending: false });
         
         if (data) {
            setTenantTransactions(data);
            const inc = data.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
            const exp = data.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
            setTenantStats({ income: inc, expense: exp, balance: inc - exp });
         }
      } catch (err) {
         toastError('Erro ao carregar livro-caixa do cliente');
      }
   };

   const handleManualPayment = async (subId: string) => {
      if (!confirm('Deseja registrar baixa manual para esta fatura?')) return;
      try {
         const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'ATIVO', last_payment_at: new Date().toISOString() })
            .eq('id', subId);
         if (error) throw error;
         toastSuccess('Pagamento registrado com sucesso!');
         fetchData();
      } catch (err) {
         toastError('Falha ao registrar pagamento.');
      }
   };

   const handleEditSubscription = (sub: any) => {
      setSelectedSub(sub);
      setIsSubModalOpen(true);
   };

   const handleUpdateSubscription = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         const { error } = await supabase
            .from('subscriptions')
            .update({
               plan_name: selectedSub.plan_name,
               amount: selectedSub.amount,
               next_due_date: selectedSub.next_due_date,
               status: selectedSub.status
            })
            .eq('id', selectedSub.id);
         
         if (error) throw error;
         toastSuccess('Assinatura atualizada!');
         setIsSubModalOpen(false);
         fetchData();
      } catch (err) {
         toastError('Erro ao atualizar contrato SaaS.');
      }
   };

   const handleDeleteTransaction = async (id: string) => {
      if (!confirm('Excluir transação permanentemente?')) return;
      try {
         const { error } = await supabase.from('transactions').delete().eq('id', id);
         if (error) throw error;
         toastSuccess('Transação removida.');
         if (selectedCompany) handleDrilldown(selectedCompany);
      } catch (err) {
         toastError('Falha ao excluir.');
      }
   };

   const revenuePie = [
      { name: 'SaaS (Mensal)', value: 65, color: '#7c3aed' },
      { name: 'Créditos WA', value: 20, color: '#10b981' },
      { name: 'Cursos/Info', value: 15, color: '#f59e0b' },
   ];

   return (
      <div style={styles.container} className="animate-fade-in">
         <header style={styles.header}>
            <div>
               <div style={styles.badge}>DASHBOARD FINANCEIRO HÍBRIDO</div>
               <h1 style={styles.title}>Cérebro de Monetização</h1>
               <p style={styles.subtitle}>Gestão de recorrência, consumo estratégico e ativos digitais.</p>
            </div>
            <div style={styles.headerActions}>
               <button style={styles.refreshBtn} onClick={fetchData}><RefreshCw size={18} /></button>
               <button style={styles.secondaryBtn}><PieIcon size={18} /> Fluxo de Caixa</button>
               <button style={styles.primaryBtn}><Plus size={18} /> Faturamento Manual</button>
            </div>
         </header>

         {/* MÉTRICAS HÍBRIDAS */}
         <div style={styles.metricsGrid}>
            <div style={styles.metricCardBig}>
               <div style={styles.mCardInfo}>
                  <div style={{...styles.mIconBox, backgroundColor: '#f5f3ff', color: '#7c3aed'}}><DollarSign size={24} /></div>
                  <div>
                     <span style={styles.mLabel}>MRR ATUAL (Assinaturas)</span>
                     <h2 style={styles.mValue}>{formatCurrency(stats.totalMRR)}</h2>
                  </div>
               </div>
               <div style={styles.mDivider} />
               <div style={styles.mSubRow}>
                  <div>
                     <span style={styles.mSubLabel}>Receita de Créditos/Cursos</span>
                     <span style={styles.mSubValue}>{formatCurrency(stats.consumablesRevenue + stats.oneTimeRevenue)}</span>
                  </div>
                  <div style={{...styles.mTrend, color: '#10b981'}}>
                     <TrendingUp size={14} /> Mix de Receita Saudável
                  </div>
               </div>
            </div>

            <div style={styles.metricCard}>
               <div style={{...styles.mIconBox, backgroundColor: '#ecfdf5', color: '#10b981'}}><Wallet size={20} /></div>
               <div>
                  <span style={styles.mLabel}>Liquidez de Créditos</span>
                  <h3 style={styles.mValueSmall}>{stats.systemCreditLiquidity.toLocaleString()}</h3>
                  <span style={styles.mStatus}>Pendentes de uso</span>
               </div>
            </div>

            <div style={styles.metricCard}>
               <div style={{...styles.mIconBox, backgroundColor: '#fef2f2', color: '#ef4444'}}><Ban size={20} /></div>
               <div>
                  <span style={styles.mLabel}>Inadimplência</span>
                  <h3 style={{...styles.mValueSmall, color: '#ef4444'}}>{stats.overdueCompanies}</h3>
                  <span style={styles.mStatus}>Contas bloqueadas</span>
               </div>
            </div>

            <div style={styles.metricCard}>
               <div style={{...styles.mIconBox, backgroundColor: '#fff7ed', color: '#f59e0b'}}><Clock size={20} /></div>
               <div>
                  <span style={styles.mLabel}>Empresas em Trial</span>
                  <h3 style={styles.mValueSmall}>{stats.trialCompanies}</h3>
                  <span style={styles.mStatus}>Carência de 5 dias</span>
               </div>
            </div>
         </div>

         {/* GRÁFICOS E PERFORMANCE */}
         <div style={styles.chartsRow}>
            <div style={styles.chartCard}>
               <div style={styles.chartHeader}>
                  <h3 style={styles.chartTitle}>Crescimento de Receita Combinada</h3>
               </div>
               <div style={{height: '280px'}}>
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={mrrHistory}>
                        <defs>
                           <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-lg)'}} />
                        <Area type="monotone" dataKey="mrr" stroke="#7c3aed" strokeWidth={4} fillOpacity={1} fill="url(#colorMRR)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div style={styles.statsCard}>
               <h3 style={styles.chartTitle}>Mix de Faturamento</h3>
               <div style={{height: '180px', margin: '20px 0'}}>
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={revenuePie} innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={8}>
                           {revenuePie.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
               <div style={styles.pieLegendGrid}>
                  {revenuePie.map(e => (
                     <div key={e.name} style={styles.legItem}>
                        <div style={{...styles.legDot, backgroundColor: e.color}} />
                        <span style={styles.legName}>{e.name}</span>
                        <span style={styles.legValue}>{e.value}%</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* TABELA DE GESTÃO E DRILL-DOWN */}
         <div style={styles.tableSection}>
            <div style={styles.tableHeader}>
               <h3 style={styles.tableTitle}>Monitoramento de Clientes & Faturamento</h3>
               <div style={styles.tableActions}>
                  <div style={styles.searchBox}>
                     <Search size={16} color="#94a3b8" />
                     <input type="text" placeholder="Localizar empresa..." style={styles.searchInput} />
                  </div>
                  <button style={styles.filterBtn}><Download size={16} /> Relatório DRE</button>
               </div>
            </div>

            <div style={{overflowX: 'auto'}}>
               <table style={styles.table}>
                  <thead>
                     <tr style={styles.thead}>
                        <th style={styles.th}>TRANSPORTADORA</th>
                        <th style={styles.th}>PLANO ATUAL</th>
                        <th style={styles.th}>PRÓX. VENCIMENTO</th>
                        <th style={styles.th}>STATUS SaaS</th>
                        <th style={styles.th}>TICKET MENSAL</th>
                        <th style={{...styles.th, textAlign: 'right'}}>AÇÕES E DRILL-DOWN</th>
                     </tr>
                  </thead>
                  <tbody>
                     {loading ? (
                        <tr><td colSpan={6} style={{padding: '60px', textAlign: 'center', color: '#94a3b8'}}>Analisando faturamento global...</td></tr>
                     ) : (subs || []).map(sub => (
                        <tr key={sub.id} style={styles.tr}>
                           <td style={styles.td}>
                              <div style={styles.companyInfo}>
                                 <strong style={styles.cName}>{sub.companies?.name}</strong>
                                 <span style={styles.cId}>UUID: {sub.company_id?.substring(0,8)}</span>
                              </div>
                           </td>
                           <td style={styles.td}><span style={styles.planBadge}>{sub.plan_name}</span></td>
                           <td style={styles.td}>
                              <div style={styles.dateInfo}>
                                 <Calendar size={14} /> {sub.next_due_date ? new Date(sub.next_due_date).toLocaleDateString() : 'Carência'}
                              </div>
                           </td>
                           <td style={styles.td}>
                              <div style={{
                                 ...styles.statusTag,
                                 backgroundColor: sub.status === 'ATIVO' ? '#ecfdf5' : '#fef2f2',
                                 color: sub.status === 'ATIVO' ? '#10b981' : '#ef4444'
                              }}>
                                 {sub.status === 'ATIVO' ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                                 {sub.status === 'ATIVO' ? 'ATIVO' : sub.status === 'VENCIDO' ? 'VENCIDO' : sub.status}
                              </div>
                           </td>
                           <td style={styles.td}><strong style={styles.priceText}>{formatCurrency(sub.amount)}</strong></td>
                           <td style={{...styles.td, textAlign: 'right'}}>
                              <div style={styles.rowActions}>
                                 <button style={styles.drillBtn} onClick={() => handleDrilldown(sub.companies)} title="Ver Fluxo de Caixa do Cliente">
                                    <Eye size={16} /> Livro-caixa
                                 </button>
                                 <button style={styles.actionBtn} onClick={() => handleManualPayment(sub.id)} title="Baixa Manual de Pagamento"><CheckCircle size={16} /></button>
                                 <button style={styles.actionBtn} onClick={() => handleEditSubscription(sub)} title="Editar Plano e Faturamento"><Settings size={16} /></button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* ALERTAS DE INADIMPLÊNCIA CRÍTICA */}
         {stats.overdueCompanies > 0 && (
            <div style={styles.overdueAlertBox}>
               <div style={styles.ovIcon}><AlertTriangle size={24} /></div>
               <div style={styles.ovContent}>
                  <h4 style={styles.ovTitle}>Atenção: Inadimplência Crítica Detectada</h4>
                  <p style={styles.ovText}>Existem {stats.overdueCompanies} empresas com faturas vencidas há mais de 7 dias. O bloqueio manual ou automático é recomendado.</p>
               </div>
               <button style={styles.ovActionBtn}>REVISAR BLOQUEIOS</button>
            </div>
         )}

         {/* MODAL DE DRILL-DOWN (VISÃO DO FINANCEIRO DA EMPRESA) */}
         <LogtaModal 
            isOpen={isDrilldownOpen} 
            onClose={() => setIsDrilldownOpen(false)} 
            width="1000px" 
            title={`Gestão Financeira: ${selectedCompany?.name}`}
         >
            <div style={styles.modalContent}>
               <div style={styles.drillStats}>
                  <div style={styles.drillStatCard}>
                     <span>Total Receitas</span>
                     <h4 style={{color: '#10b981'}}>{formatCurrency(tenantStats.income)}</h4>
                  </div>
                  <div style={styles.drillStatCard}>
                     <span>Total Despesas</span>
                     <h4 style={{color: '#ef4444'}}>{formatCurrency(tenantStats.expense)}</h4>
                  </div>
                  <div style={styles.drillStatCard}>
                     <span>Saldo Operacional</span>
                     <h4 style={{color: tenantStats.balance >= 0 ? '#7c3aed' : '#ef4444'}}>{formatCurrency(tenantStats.balance)}</h4>
                  </div>
               </div>

               <div style={styles.modalTableContainer}>
                  <table style={styles.drillTable}>
                     <thead>
                        <tr>
                           <th>DESCRIÇÃO / CATEGORIA</th>
                           <th>DATA</th>
                           <th>TIPO</th>
                           <th>VALOR</th>
                           <th>STATUS</th>
                           <th style={{textAlign: 'right'}}>AÇÕES MESTRE</th>
                        </tr>
                     </thead>
                     <tbody>
                        {tenantTransactions.map(t => (
                           <tr key={t.id}>
                              <td>
                                 <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <strong>{t.description}</strong>
                                    <span style={{fontSize: '10px', color: '#94a3b8'}}>{t.category}</span>
                                 </div>
                              </td>
                              <td>{new Date(t.due_date).toLocaleDateString()}</td>
                              <td><span style={{color: t.type === 'INCOME' ? '#10b981' : '#ef4444', fontWeight: '800'}}>{t.type === 'INCOME' ? 'ENTRADA' : 'SAÍDA'}</span></td>
                              <td><strong style={{color: '#1e293b'}}>{formatCurrency(t.amount)}</strong></td>
                              <td>
                                 <span style={{
                                    padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800',
                                    backgroundColor: t.status === 'PAID' ? '#ecfdf5' : '#fef2f2',
                                    color: t.status === 'PAID' ? '#10b981' : '#ef4444'
                                 }}>{t.status}</span>
                              </td>
                              <td style={{textAlign: 'right'}}>
                                 <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                                    <button style={styles.miniBtn}><Edit3 size={14} /></button>
                                    <button style={{...styles.miniBtn, color: '#ef4444'}} onClick={() => handleDeleteTransaction(t.id)}><Trash2 size={14} /></button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </LogtaModal>

         {/* MODAL DE EDIÇÃO DE ASSINATURA */}
         <LogtaModal 
            isOpen={isSubModalOpen} 
            onClose={() => setIsSubModalOpen(false)} 
            width="500px" 
            title="Ajustar Plano e Faturamento"
         >
            <form onSubmit={handleUpdateSubscription} style={styles.form}>
               <div style={styles.fGroup}>
                  <label style={styles.fLabel}>Nome do Plano (Core + Extras)</label>
                  <input 
                     type="text" 
                     value={selectedSub?.plan_name || ''} 
                     onChange={e => setSelectedSub({...selectedSub, plan_name: e.target.value})}
                     style={styles.fInput}
                  />
               </div>
               <div style={styles.fRow}>
                  <div style={styles.fGroup}>
                     <label style={styles.fLabel}>Valor Mensal (BRL)</label>
                     <input 
                        type="number" 
                        value={selectedSub?.amount || 0} 
                        onChange={e => setSelectedSub({...selectedSub, amount: Number(e.target.value)})}
                        style={styles.fInput}
                     />
                  </div>
                  <div style={styles.fGroup}>
                     <label style={styles.fLabel}>Próximo Vencimento</label>
                     <input 
                        type="date" 
                        value={selectedSub?.next_due_date || ''} 
                        onChange={e => setSelectedSub({...selectedSub, next_due_date: e.target.value})}
                        style={styles.fInput}
                     />
                  </div>
               </div>
               <div style={styles.fGroup}>
                  <label style={styles.fLabel}>Status da Assinatura</label>
                  <select 
                     value={selectedSub?.status || 'PENDENTE'} 
                     onChange={e => setSelectedSub({...selectedSub, status: e.target.value})}
                     style={styles.fInput}
                  >
                     <option value="ATIVO">ATIVO (Acesso Liberado)</option>
                     <option value="PENDENTE">PENDENTE (Aguardando)</option>
                     <option value="VENCIDO">VENCIDO (Limite Bloqueio)</option>
                     <option value="CANCELADO">CANCELADO</option>
                  </select>
               </div>
               <button type="submit" style={styles.saveBtnModal}>Propagar Alteração Gerencial</button>
            </form>
         </LogtaModal>
      </div>
   );
};

const styles: Record<string, any> = {
   container: { padding: '24px', backgroundColor: 'transparent' },
   header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' },
   badge: { display: 'inline-block', padding: '4px 12px', backgroundColor: '#f5f3ff', color: '#7c3aed', borderRadius: '30px', fontSize: '10px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' },
   title: { fontSize: '32px', fontWeight: '950', color: '#111827', letterSpacing: '-1.5px', margin: 0 },
   subtitle: { color: '#6b7280', fontSize: '15px', fontWeight: '500' },
   headerActions: { display: 'flex', gap: '12px' },
   refreshBtn: { width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', color: '#6b7280' },
   primaryBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.2)' },
   secondaryBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', color: '#111827' },

   metricsGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '20px', marginBottom: '32px' },
   metricCardBig: { position: 'relative' as const, backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
   metricCard: { backgroundColor: 'white', padding: '24px', borderRadius: '28px', border: '1px solid #e5e7eb', display: 'flex', gap: '16px', alignItems: 'center' },
   mCardInfo: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' },
   mIconBox: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
   mLabel: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
   mValue: { fontSize: '32px', fontWeight: '950', color: '#7c3aed', margin: 0, letterSpacing: '-1px' },
   mDivider: { height: '1px', backgroundColor: '#f1f5f9', margin: '0 0 20px 0' },
   mSubRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
   mSubLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' },
   mSubValue: { fontSize: '16px', fontWeight: '900', color: '#1e293b' },
   mTrend: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '950' },
   mValueSmall: { fontSize: '24px', fontWeight: '950', color: '#111827', margin: '4px 0 0 0' },
   mStatus: { fontSize: '11px', fontWeight: '700', color: '#94a3b8' },

   chartsRow: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '32px' },
   chartCard: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e5e7eb' },
   chartHeader: { marginBottom: '32px' },
   chartTitle: { fontSize: '18px', fontWeight: '900', color: '#111827', margin: 0 },
   statsCard: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' as const },
   pieLegendGrid: { borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
   legItem: { display: 'flex', alignItems: 'center', gap: '12px' },
   legDot: { width: '8px', height: '8px', borderRadius: '50%' },
   legName: { flex: 1, fontSize: '12px', fontWeight: '700', color: '#64748b' },
   legValue: { fontSize: '13px', fontWeight: '900', color: '#111827' },

   tableSection: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
   tableHeader: { padding: '28px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
   tableTitle: { fontSize: '18px', fontWeight: '900', color: '#111827', margin: 0 },
   tableActions: { display: 'flex', gap: '12px' },
   searchBox: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f9fafb', padding: '12px 20px', borderRadius: '14px', border: '1px solid #e5e7eb' },
   searchInput: { border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '14px', fontWeight: '600', width: '200px' },
   filterBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' },

   table: { width: '100%', borderCollapse: 'collapse' as const },
   thead: { backgroundColor: '#f9fafb', textAlign: 'left' as const },
   th: { padding: '16px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
   tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
   td: { padding: '20px 32px' },
   companyInfo: { display: 'flex', flexDirection: 'column' as const },
   cName: { fontSize: '15px', fontWeight: '900', color: '#7c3aed' },
   cId: { fontSize: '10px', color: '#94a3b8', fontWeight: '700' },
   planBadge: { padding: '4px 10px', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px', fontSize: '11px', fontWeight: '900' },
   dateInfo: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', fontWeight: '700' },
   statusTag: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', width: 'fit-content' },
   priceText: { fontSize: '16px', fontWeight: '900', color: '#111827' },
   rowActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
   drillBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#f5f3ff', color: '#7c3aed', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' },
   actionBtn: { padding: '8px', border: 'none', backgroundColor: '#f9fafb', borderRadius: '10px', cursor: 'pointer', color: '#64748b' },

   overdueAlertBox: { marginTop: '32px', backgroundColor: '#fef2f2', padding: '24px', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '20px' },
   ovIcon: { width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'white', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)' },
   ovContent: { flex: 1 },
   ovTitle: { fontSize: '16px', fontWeight: '900', color: '#ef4444', margin: '0 0 4px 0' },
   ovText: { color: '#ef4444', fontSize: '14px', opacity: 0.8, margin: 0 },
   ovActionBtn: { padding: '14px 28px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' },

   modalContent: { padding: '10px' },
   drillStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' },
   drillStatCard: { padding: '20px', backgroundColor: '#f9fafb', borderRadius: '20px', border: '1px solid #e5e7eb' },
   modalTableContainer: { maxHeight: '400px', overflowY: 'auto' as const, border: '1px solid #f1f5f9', borderRadius: '16px' },
   drillTable: { width: '100%', borderCollapse: 'collapse' as const },
   miniBtn: { padding: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94a3b8' },
   
   form: { display: 'flex', flexDirection: 'column' as const, gap: '20px', padding: '10px' },
   fGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
   fLabel: { fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' as const },
   fInput: { padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', outline: 'none', backgroundColor: '#f9fafb' },
   fRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
   saveBtnModal: { padding: '16px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }
};

export default MasterFinance;
