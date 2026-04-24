import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Protocolo de Sanitização: Limpa rastros de sessões conflitantes (Empresa A vs B / Logta vs Zaptro)
    const sanitize = async () => {
       console.log('🛡️ [SECURITY] Domain mismatch detected. Sanitizing session...');
       localStorage.clear();
       await supabase.auth.signOut();
    };
    sanitize();
  }, []);

  return (
    <div style={{
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f4f4f4',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px', 
        height: '80px', 
        borderRadius: '24px', 
        backgroundColor: '#fee2e2', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <ShieldAlert size={40} color="#ef4444" />
      </div>
      
      <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0' }}>Sessão Inválida</h1>
      <p style={{ color: '#64748b', fontSize: '18px', maxWidth: '450px', lineHeight: '1.6', marginBottom: '32px' }}>
        Identificamos um conflito entre seu login e este domínio. Por segurança, sua sessão foi encerrada para evitar cruzamento de dados entre empresas.
      </p>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '14px 28px', backgroundColor: '#0f172a', border: 'none',
            borderRadius: '16px', fontWeight: '600', cursor: 'pointer', color: '#fff'
          }}
        >
          Fazer Login Novamente
        </button>
      </div>

      <div style={{ marginTop: '64px', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>
        <Lock size={14} /> SEGURANÇA LÓGICA LOGTA ATIVA
      </div>
    </div>
  );
};

export default AccessDenied;
