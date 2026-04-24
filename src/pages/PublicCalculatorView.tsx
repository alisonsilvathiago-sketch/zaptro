import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calculator, History, CheckCircle2, Lock, 
  ArrowLeft, Copy, Share2, Info, Check, 
  Smartphone, Monitor, Globe, ShieldCheck, Mail, Phone,
  ChevronRight, Calendar, User
} from 'lucide-react';
import { toastSuccess } from '../lib/toast';

const PublicCalculatorView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock de dados compartilhados
  const [sharedData, setSharedData] = useState<any>({
    title: 'Relatório Financeiro de Entregas',
    company: 'Logística Logta Express',
    date: new Date().toLocaleDateString(),
    entries: [
      { title: 'Frete São Paulo -> Rio', expression: '125.50 + 45.00', result: 170.50, description: 'Carga fracionada + Pedágios' },
      { title: 'Seguro de Carga', expression: '170.50 * 0.05', result: 8.53, description: 'Taxa de seguro obrigatório' }
    ]
  });

  useEffect(() => {
    // Simular busca de dados
    setTimeout(() => {
        if (id?.includes('private')) {
            setAccessDenied(true);
        }
        setLoading(false);
    }, 1500);
  }, [id]);

  const styles = {
    container: { minHeight: '100vh', backgroundColor: '#F0F9FF', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '40px 20px' },
    card: { backgroundColor: 'white', maxWidth: '800px', width: '100%', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)', padding: '50px', border: '1px solid #E0F2FE' },
    header: { textAlign: 'center' as const, marginBottom: '50px' },
    badge: { display: 'inline-flex', padding: '6px 16px', backgroundColor: '#E0F2FE', color: '#0369A1', borderRadius: '30px', fontSize: '11px', fontWeight: '700', marginBottom: '16px', letterSpacing: '1.5px', textTransform: 'uppercase' as const },
    title: { fontSize: '32px', fontWeight: '700', color: '#0C4A6E', marginBottom: '12px' },
    companyLine: { fontSize: '14px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' },
    
    divider: { height: '1px', backgroundColor: '#ebebeb', margin: '40px 0' },
    
    entryList: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
    entry: { padding: '24px', borderRadius: '24px', backgroundColor: '#f4f4f4', border: '1px solid #e8e8e8' },
    entryH: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
    entryTitle: { fontSize: '16px', fontWeight: '600', color: '#1E293B' },
    entryExpr: { fontSize: '13px', color: '#94A3B8', fontFamily: 'monospace' },
    entryRes: { fontSize: '24px', fontWeight: '700', color: '#0369A1', marginTop: '12px' },
    entryObs: { marginTop: '12px', fontSize: '13px', color: '#64748B', fontStyle: 'italic', borderTop: '1px dashed #E2E8F0', paddingTop: '12px' },
    
    totalCard: { marginTop: '40px', padding: '32px', borderRadius: '24px', backgroundColor: '#0C4A6E', color: 'white', textAlign: 'right' as const },
    totalLabel: { fontSize: '12px', fontWeight: '600', opacity: 0.7, textTransform: 'uppercase' as const },
    totalValue: { fontSize: '36px', fontWeight: '700', marginTop: '4px' },
    
    footer: { marginTop: '40px', textAlign: 'center' as const, color: '#94A3B8' },
    footerLink: { color: '#0369A1', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' },
    
    denied: { textAlign: 'center' as const, padding: '100px 40px' },
    deniedTitle: { fontSize: '24px', fontWeight: '700', color: '#EF4444', marginBottom: '16px' }
  };

  if (loading) return (
    <div style={styles.container}>
       <div style={styles.card}>
          <div style={{textAlign: 'center', padding: '60px'}}>
             <Globe size={48} color="#E0F2FE" />
             <p style={{marginTop: '20px', color: '#94A3B8', fontWeight: '600'}}>Validando credenciais de acesso seguro do Logta...</p>
          </div>
       </div>
    </div>
  );

  if (accessDenied) return (
    <div style={styles.container}>
       <div style={{...styles.card, ...styles.denied}}>
          <Lock size={64} color="#EF4444" style={{marginBottom: '24px'}} />
          <h2 style={styles.deniedTitle}>Conteúdo Não Disponível</h2>
          <p style={{color: '#64748B', maxWidth: '400px', margin: '0 auto 32px auto'}}>Este link foi revogado pelo administrador ou expirou. Você não tem permissão para visualizar este conteúdo no momento.</p>
          <button onClick={() => navigate('/')} style={{padding: '12px 24px', borderRadius: '14px', border: 'none', backgroundColor: '#0C4A6E', color: 'white', fontWeight: '600', cursor: 'pointer'}}>Ir para Home</button>
       </div>
    </div>
  );

  const total = sharedData.entries.reduce((acc: number, entry: any) => acc + entry.result, 0);

  return (
    <div style={styles.container}>
       <div style={styles.card}>
          <div style={styles.header}>
             <div style={styles.badge}>Dossiê Financeiro Compartilhado</div>
             <h1 style={styles.title}>{sharedData.title}</h1>
             <div style={styles.companyLine}>
                <ShieldCheck size={16} color="#10B981" />
                Gerado por: <strong>{sharedData.company}</strong> em {sharedData.date}
             </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.entryList}>
             {sharedData.entries.map((entry: any, i: number) => (
                <div key={i} style={styles.entry}>
                   <div style={styles.entryH}>
                      <span style={styles.entryTitle}>{entry.title}</span>
                      <span style={styles.entryExpr}>{entry.expression}</span>
                   </div>
                   <div style={styles.entryRes}>R$ {entry.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                   {entry.description && <div style={styles.entryObs}>{entry.description}</div>}
                </div>
             ))}
          </div>

          <div style={styles.totalCard}>
             <span style={styles.totalLabel}>Valor Total Consolidado</span>
             <div style={styles.totalValue}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>

          <div style={{marginTop: '50px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
             <div style={{padding: '20px', borderRadius: '24px', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', gap: '16px'}}>
                <div style={{width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Mail size={18} color="#0369A1" /></div>
                <div style={{fontSize: '12px'}}><p style={{color: '#94A3B8', margin: 0}}>Atendimento</p><strong style={{color: '#0C4A6E'}}>contato@logta.com</strong></div>
             </div>
             <div style={{padding: '20px', borderRadius: '24px', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', gap: '16px'}}>
                <div style={{width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Phone size={18} color="#0369A1" /></div>
                <div style={{fontSize: '12px'}}><p style={{color: '#94A3B8', margin: 0}}>WhatsApp</p><strong style={{color: '#0C4A6E'}}>(11) 98765-4321</strong></div>
             </div>
          </div>
       </div>

       <div style={styles.footer}>
          <p style={{fontSize: '13px', marginBottom: '12px'}}>Sistema de Cálculos Seguros e Auditoria Logta Dashboard</p>
          <a href="https://logta.com.br" style={styles.footerLink}>Crie seu cadastro também <ChevronRight size={14} /></a>
       </div>
    </div>
  );
};

export default PublicCalculatorView;
