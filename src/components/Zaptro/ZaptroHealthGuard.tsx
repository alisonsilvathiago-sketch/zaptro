import React, { useState } from 'react';
import { AlertTriangle, Database, Copy, Check, RefreshCw, ServerCrash } from 'lucide-react';

interface ZaptroHealthGuardProps {
  error: string | null;
  children: React.ReactNode;
}

const CONSOLIDATED_SQL = `-- SEED / REPARO ZAPTRO (CONSOLIDADO)
-- Execute este script no SQL Editor do Supabase para corrigir problemas de mensagens.

-- 1. ESTRUTURA BASE ZAPTRO
CREATE TABLE IF NOT EXISTS public.whatsapp_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  primary_color text DEFAULT '#D9FF00',
  secondary_color text DEFAULT '#0F172A',
  status text DEFAULT 'pending_setup',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_companies_authenticated_rw" ON public.whatsapp_companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.whatsapp_companies TO authenticated, service_role;

-- 2. SUPORTE A MENSAGENS E WEBHOOKS
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
GRANT ALL ON public.webhook_logs TO service_role;

-- 3. ALINHAMENTO DE COLUNAS (Conversas e Mensagens)
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS sender_number TEXT;
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS customer_avatar TEXT;

ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS content TEXT;

-- 4. AUTOMAÇÃO WHATSAPP (fluxo menu — precisa da coluna options JSONB)
CREATE TABLE IF NOT EXISTS public.whatsapp_automation_flows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.whatsapp_companies(id) ON DELETE CASCADE,
    name text NOT NULL DEFAULT 'Padrao',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, name)
);
ALTER TABLE public.whatsapp_automation_flows ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT '';
ALTER TABLE public.whatsapp_automation_flows ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.whatsapp_automation_flows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_automation_flows_authenticated_rw" ON public.whatsapp_automation_flows;
CREATE POLICY "whatsapp_automation_flows_authenticated_rw" ON public.whatsapp_automation_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_automation_flows TO authenticated;

CREATE TABLE IF NOT EXISTS public.whatsapp_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.whatsapp_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    menu_key TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PERMISSÕES PARA EDGE FUNCTIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 6. PERFIL ZAPTRO
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_zaptro TEXT DEFAULT 'pendente';

NOTIFY pgrst, 'reload schema';`;

const ZaptroHealthGuard: React.FC<ZaptroHealthGuardProps> = ({ error, children }) => {
  const [copied, setCopied] = useState(false);

  if (!error) return <>{children}</>;

  const handleCopy = () => {
    navigator.clipboard.writeText(CONSOLIDATED_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.iconHeader}>
          <div style={styles.warningCircle}>
            <ServerCrash size={32} color="#EF4444" />
          </div>
        </div>

        <h2 style={styles.title}>BANCO DE DADOS INCOMPLETO</h2>
        <p style={styles.subtitle}>
          O sistema detectou que a estrutura necessária para o módulo Zaptro ainda não foi provisionada no Supabase.
        </p>

        <div style={styles.errorBox}>
          <div style={styles.errorLabel}>Erro Técnico:</div>
          <code style={styles.errorCode}>{error}</code>
        </div>

        <div style={styles.fixSection}>
          <h3 style={styles.fixTitle}>Como Arrumar Agora:</h3>
          <p style={styles.fixDescription}>
            Rode o script abaixo no <strong>SQL Editor</strong> do seu projeto Supabase atual. Isso criará a tabela <code>whatsapp_companies</code> e configurará o acesso.
          </p>

          <div style={styles.sqlContainer}>
            <pre style={styles.sqlCode}>{CONSOLIDATED_SQL}</pre>
            <button 
              onClick={handleCopy}
              style={{
                ...styles.copyBtn,
                backgroundColor: copied ? '#10B981' : '#000',
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'COPIADO!' : 'COPIAR SQL DE REPARO'}
            </button>
          </div>
        </div>

        <button 
          style={styles.reloadBtn}
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={18} /> Já executei o script. Recarregar App.
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'Inter, sans-serif',
  },
  modal: {
    backgroundColor: '#FFF',
    width: '100%',
    maxWidth: '600px',
    borderRadius: '24px',
    padding: '40px',
    textAlign: 'center',
    overflowY: 'auto',
    maxHeight: '90vh',
  },
  iconHeader: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  warningCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#FEF2F2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0F172A',
    margin: '0 0 10px 0',
    letterSpacing: '-1px',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748B',
    fontWeight: 600,
    lineHeight: 1.6,
    margin: '0 0 32px 0',
  },
  errorBox: {
    backgroundColor: '#f4f4f4',
    border: '1px solid #E2E8F0',
    borderRadius: '16px',
    padding: '16px',
    textAlign: 'left',
    marginBottom: '32px',
  },
  errorLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#94A3B8',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  errorCode: {
    fontSize: '13px',
    color: '#EF4444',
    wordBreak: 'break-all',
    fontWeight: 700,
  },
  fixSection: {
    textAlign: 'left',
    borderTop: '1px solid #e8e8e8',
    paddingTop: '32px',
  },
  fixTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0F172A',
    margin: '0 0 8px 0',
  },
  fixDescription: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.5,
    margin: '0 0 16px 0',
    fontWeight: 500,
  },
  sqlContainer: {
    position: 'relative',
    backgroundColor: '#0F172A',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
  },
  sqlCode: {
    maxHeight: '150px',
    overflowY: 'auto',
    margin: 0,
    fontSize: '12px',
    color: '#94A3B8',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
  },
  copyBtn: {
    marginTop: '16px',
    width: '100%',
    padding: '12px',
    color: '#FFF',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: '0.2s',
  },
  reloadBtn: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#D9FF00',
    color: '#000',
    borderRadius: '16px',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
};

export default ZaptroHealthGuard;
