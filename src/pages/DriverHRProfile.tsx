import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Calendar, Clock, Download, Filter, Activity,
  ChevronRight, AlertCircle, TrendingUp, History,
  Info, DollarSign, Wallet, FileText, CheckCircle2,
  Phone, Mail, MessageSquare, Shield, Trash2, Edit3,
  Coffee, Star, Heart, Award, ArrowLeft, Search
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ExportButton from '../components/ExportButton';

const DriverHRProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'geral' | 'ponto' | 'pagamentos' | 'documentos'>('geral');
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>(null);

  useEffect(() => {
    // Mock data for initial profile load
    setDriver({
      id: id,
      name: 'Thiago Silva',
      status: 'ATIVO',
      type: 'Agregado',
      admission: '12/01/2024',
      phone: '(11) 98877-6655',
      email: 'thiago.silva@logta.com',
      health: 'Ótimo',
      attendance: 98,
      earnings: 4500.00
    });
    setLoading(false);
  }, [id]);

  const styles = {
    container: { padding: '32px', backgroundColor: '#f4f4f4', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    backBtn: { display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', fontWeight: '700' },
    
    mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '32px' },
    sidebar: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
    content: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
    
    profileCard: { backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #E2E8F0', textAlign: 'center' as const },
    avatarLarge: { width: '120px', height: '120px', borderRadius: '40px', backgroundColor: '#ebebeb', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', position: 'relative' as const },
    onlineDot: { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#10b981', border: '3px solid white', position: 'absolute' as const, bottom: '5px', right: '5px' },
    name: { fontSize: '24px', fontWeight: '900', color: '#0F172A', marginBottom: '4px' },
    role: { fontSize: '12px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '24px', display: 'block' },
    
    scoreGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' },
    scoreItem: { padding: '16px', borderRadius: '24px', backgroundColor: '#f4f4f4', border: '1px solid #e8e8e8' },
    scoreLabel: { fontSize: '11px', color: '#94A3B8', fontWeight: '800', marginBottom: '4px' },
    scoreValue: { fontSize: '18px', fontWeight: '900', color: '#1E293B' },
    
    contactInfo: { textAlign: 'left' as const, display: 'flex', flexDirection: 'column' as const, gap: '16px', paddingTop: '24px', borderTop: '1px solid #e8e8e8' },
    contactRow: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748B', fontWeight: '600' },
    iconBox: { padding: '8px', borderRadius: '10px', backgroundColor: '#ebebeb', color: 'var(--text-muted)' },
    
    tabNavPremium: { display: 'flex', gap: '8px', backgroundColor: 'white', padding: '8px', borderRadius: '24px', border: '1px solid #E2E8F0', marginBottom: '32px' },
    tabBtn: { padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '18px', fontSize: '13px', fontWeight: '800', color: '#94A3B8', transition: 'all 0.2s' },
    tabBtnActive: { backgroundColor: 'var(--primary)', color: 'white', boxShadow: '0 4px 12px rgba(217, 255, 0, 0.2)' },
    
    cardPremium: { backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #E2E8F0' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    sectionTitle: { fontSize: '18px', fontWeight: '800', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '12px' },
    
    attendanceTable: { width: '100%', borderCollapse: 'separate' as const, borderSpacing: '0 8px' },
    th: { textAlign: 'left' as const, padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' as const },
    tr: { backgroundColor: '#f4f4f4', transition: 'all 0.2s' },
    td: { padding: '16px', fontSize: '14px', fontWeight: '600', color: '#475569' },
    pontoBadge: { padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' },
    
    actionBtn: { width: '100%', padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: 'auto' }
  };

  const renderGeral = () => (
    <div style={styles.content}>
       <div style={styles.cardPremium}>
          <div style={styles.sectionHeader}>
             <h3 style={styles.sectionTitle}><Activity size={20} color="var(--primary)" /> Saúde e Comportamento</h3>
             <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Histórico Saúde</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
             <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                   <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#10b981', color: 'white' }}><Heart size={16} /></div>
                   <span style={{ fontSize: '12px', fontWeight: '800', color: '#166534' }}>Saúde Mental</span>
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#166534' }}>{driver?.health}</h4>
                <p style={{ fontSize: '11px', color: '#15803d', marginTop: '4px' }}>Ótima performance de descanso</p>
             </div>
             
             <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: 'rgba(217, 255, 0, 0.18)', border: '1px solid rgba(217, 255, 0, 0.28)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                   <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'var(--primary)', color: 'white' }}><Star size={16} /></div>
                   <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>Avaliação Media</span>
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary)' }}>4.9/5.0</h4>
                <p style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px' }}>Top 5% da frota</p>
             </div>

             <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                   <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#f97316', color: 'white' }}><Award size={16} /></div>
                   <span style={{ fontSize: '12px', fontWeight: '800', color: '#9a3412' }}>Tempo Casa</span>
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#9a3412' }}>284 Dias</h4>
                <p style={{ fontSize: '11px', color: '#c2410c', marginTop: '4px' }}>Desde Jan 2024</p>
             </div>
          </div>
       </div>

       <div style={styles.cardPremium}>
          <h3 style={styles.sectionTitle}><History size={20} color="var(--primary)" /> Últimas Batidas de Ponto</h3>
          <table style={styles.attendanceTable}>
             <thead>
                <tr>
                   <th style={styles.th}>Data/Dia</th>
                   <th style={styles.th}>Entrada</th>
                   <th style={styles.th}>Pausa</th>
                   <th style={styles.th}>Saída</th>
                   <th style={styles.th}>Status</th>
                </tr>
             </thead>
             <tbody>
                {[
                   { date: '11/04 Sáb', in: '08:00', lunch: '12:00', out: '--:--', status: 'PRESENTE', color: '#10b981' },
                   { date: '10/04 Sex', in: '08:15', lunch: '12:00', out: '18:30', status: 'ATRASO (15m)', color: '#f59e0b' },
                   { date: '09/04 Qui', in: '07:55', lunch: '12:05', out: '18:10', status: 'ON-TIME', color: '#10b981' }
                ].map((item, i) => (
                   <tr key={i} style={styles.tr}>
                      <td style={{...styles.td, borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px'}}>{item.date}</td>
                      <td style={styles.td}>{item.in}</td>
                      <td style={styles.td}>{item.lunch}</td>
                      <td style={styles.td}>{item.out}</td>
                      <td style={{...styles.td, borderTopRightRadius: '16px', borderBottomRightRadius: '16px'}}>
                         <span style={{...styles.pontoBadge, backgroundColor: `${item.color}20`, color: item.color}}>{item.status}</span>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}><ArrowLeft size={18} /> Voltar para RH</button>
        <ExportButton />
      </div>

      <div style={styles.mainGrid}>
         <div style={styles.sidebar}>
            <div style={styles.profileCard}>
               <div style={styles.avatarLarge}>
                  <User size={56} />
                  <div style={styles.onlineDot} />
               </div>
               <h2 style={styles.name}>{driver?.name}</h2>
               <span style={styles.role}>Motorista {driver?.type}</span>
               
               <div style={styles.scoreGrid}>
                  <div style={styles.scoreItem}>
                     <p style={styles.scoreLabel}>Assiduidade</p>
                     <p style={styles.scoreValue}>{driver?.attendance}%</p>
                  </div>
                  <div style={styles.scoreItem}>
                     <p style={styles.scoreLabel}>Ganhos Mês</p>
                     <p style={{...styles.scoreValue, color: '#10b981'}}>R$ {driver?.earnings?.toLocaleString()}</p>
                  </div>
               </div>

               <div style={styles.contactInfo}>
                  <div style={styles.contactRow}><div style={styles.iconBox}><Phone size={14} /></div> {driver?.phone}</div>
                  <div style={styles.contactRow}><div style={styles.iconBox}><Mail size={14} /></div> {driver?.email}</div>
                  <div style={styles.contactRow}><div style={styles.iconBox}><Clock size={14} /></div> Admissão: {driver?.admission}</div>
               </div>

               <button style={{...styles.actionBtn, marginTop: '32px'}}>
                  <MessageSquare size={18} /> Chamar no WhatsApp
               </button>
               <button style={{...styles.actionBtn, backgroundColor: '#ebebeb', color: '#475569', marginTop: '12px'}}>
                  <Edit3 size={18} /> Editar Cadastro
               </button>
            </div>

            <div style={styles.cardPremium}>
               <h4 style={{...styles.sectionTitle, fontSize: '16px', marginBottom: '20px'}}>Documentos Pendentes</h4>
               <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <AlertCircle size={16} color="#ef4444" />
                     <span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b' }}>CNH Vence em 15 dias</span>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <CheckCircle2 size={16} color="#10b981" />
                     <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>Exame Toxicológico OK</span>
                  </div>
               </div>
            </div>
         </div>

         <div style={styles.content}>
            <div style={styles.tabNavPremium}>
               {[
                  { id: 'geral', label: 'Visão 360° HR' },
                  { id: 'ponto', label: 'Cartão de Ponto' },
                  { id: 'pagamentos', label: 'Holerites / Ganhos' },
                  { id: 'documentos', label: 'Dossiê (PDF/PNG)' }
               ].map(tab => (
                  <button 
                     key={tab.id} 
                     style={{...styles.tabBtn, ...(activeTab === tab.id ? styles.tabBtnActive : {})}}
                     onClick={() => setActiveTab(tab.id as any)}
                  >
                     {tab.label}
                  </button>
               ))}
            </div>

            {activeTab === 'geral' && renderGeral()}
            {activeTab !== 'geral' && (
               <div style={styles.cardPremium}>
                  <div style={{ padding: '80px', textAlign: 'center' }}>
                     <Search size={48} color="#E2E8F0" style={{ marginBottom: '16px' }} />
                     <p style={{ color: '#94A3B8', fontWeight: '600' }}>Processando dados de {activeTab} para o ID {id}...</p>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default DriverHRProfile;
