import React from 'react';
import { ShieldAlert, Phone, Mail, RefreshCw, Lock } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

/**
 * Página de Bloqueio Sustentada. 
 * Garante que se a MÃE marcar o FILHO como inativo ou pendente, 
 * o acesso é imediatamente interrompido com uma interface premium.
 */
const SuspendedAccount: React.FC = () => {
  const { company } = useTenant();

  return (
    <div style={styles.container}>
      <div style={styles.card} className="animate-fade-in">
        <div style={styles.iconContainer}>
            <div style={styles.glow} />
            <ShieldAlert size={80} color="#ef4444" style={{ position: 'relative' }} />
        </div>
        
        <h1 style={styles.title}>Acesso Suspenso</h1>
        <div style={styles.badge}>Status: Bloqueio Financeiro / Administrativo</div>
        
        <p style={styles.message}>
          Identificamos uma restrição na sua conta <strong>{company?.name}</strong>. 
          Seu período de acesso expirou ou há uma fatura pendente de processamento.
        </p>
        
        <div style={styles.infoBox}>
          <div style={styles.infoLabel}>
            <Lock size={16} /> Como regularizar?
          </div>
          <p style={styles.infoText}>
            Para reativar sua transportadora instantaneamente, clique no botão abaixo para gerar o PIX de renovação.
          </p>
          
          <div style={styles.contactSection}>
             <p style={{ fontWeight: '800', marginBottom: '12px', fontSize: '12px' }}>Canais de Atendimento:</p>
             <div style={styles.contactItem}><Phone size={14} /> (11) 9999-LOGTA</div>
             <div style={styles.contactItem}><Mail size={14} /> financeiro@logta.app</div>
          </div>
        </div>

        <div style={styles.actions}>
           <button 
             style={styles.payButton}
             onClick={() => window.location.href = '/assinatura'}
           >
             <Zap size={18} /> Normalizar Assinatura Agora
           </button>
           
           <button 
             style={styles.button}
             onClick={() => window.location.reload()}
           >
             <RefreshCw size={18} /> Já paguei, validar status
           </button>
        </div>
        
        <p style={styles.footer}>LOGTA PLATFORM &copy; 2026 - Proteção Multi-tenant Ativa</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh', width: '100vw', 
    background: 'radial-gradient(circle at center, #3F0B78 0%, #1a0633 100%)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  card: {
    backgroundColor: 'white', padding: '60px 48px', borderRadius: '40px',
    boxShadow: '0 40px 100px -20px rgba(0,0,0,0.6)', maxWidth: '540px',
    textAlign: 'center' as const, border: '1px solid rgba(255,255,255,0.1)',
    position: 'relative' as const
  },
  iconContainer: {
    marginBottom: '32px', display: 'flex', justifyContent: 'center', position: 'relative' as const
  },
  glow: {
    position: 'absolute' as const, width: '100px', height: '100px',
    backgroundColor: 'var(--accent)', filter: 'blur(50px)', opacity: 0.4
  },
  title: {
    fontSize: '36px', fontWeight: '900', color: 'var(--primary)',
    marginBottom: '8px', letterSpacing: '-1.5px'
  },
  badge: {
    display: 'inline-block', backgroundColor: '#fef2f2', color: '#ef4444',
    padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '800',
    marginBottom: '24px', border: '1px solid #fee2e2'
  },
  message: {
    fontSize: '17px', color: 'var(--text-muted)', lineHeight: '1.6',
    marginBottom: '40px'
  },
  infoBox: {
    backgroundColor: '#f4f4f4', padding: '32px', borderRadius: '32px',
    border: '1px solid var(--border)', marginBottom: '40px', textAlign: 'left' as const
  },
  infoLabel: {
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
    fontWeight: '800', color: 'var(--primary)', marginBottom: '12px'
  },
  infoText: {
    fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.5'
  },
  contactSection: {
    borderTop: '1px solid #e2e8f0', paddingTop: '24px', fontSize: '14px'
  },
  contactItem: {
    display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)',
    fontWeight: '700', marginBottom: '8px'
  },
  button: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    padding: '18px', backgroundColor: 'white', color: 'var(--primary)',
    border: '1px solid var(--border)', borderRadius: '18px', fontWeight: '800', fontSize: '15px',
    cursor: 'pointer', width: '100%', transition: 'all 0.3s'
  },
  payButton: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    padding: '18px', backgroundColor: 'var(--primary)', color: 'white',
    border: 'none', borderRadius: '18px', fontWeight: '800', fontSize: '16px',
    cursor: 'pointer', width: '100%', transition: 'all 0.3s',
    boxShadow: '0 10px 20px -5px rgba(63, 11, 120, 0.4)', marginBottom: '12px'
  },
  actions: {
    display: 'flex', flexDirection: 'column' as const, width: '100%'
  },
  footer: {
    marginTop: '32px', fontSize: '11px', color: '#cbd5e1', fontWeight: '600',
    textTransform: 'uppercase' as const, letterSpacing: '1px'
  }
};

export default SuspendedAccount;
