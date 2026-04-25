import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // <-- Importe o cliente Supabase do Zaptro

// Tela elegante de bloqueio
function BlockScreen({ title, message }: { title: string, message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '440px', border: '1px solid #E2E8F0' }}>
        <div style={{ width: 64, height: 64, borderRadius: '16px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '32px' }}>
          🔒
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1A2340', marginBottom: '12px' }}>{title}</h2>
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '32px' }}>{message}</p>
        <a href="https://hub.logta.com.br" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px', background: '#1A2340', color: '#fff', textDecoration: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', transition: 'background 0.2s' }}>
          Acessar o Hub Central
        </a>
      </div>
    </div>
  );
}

// O Guarda-costas
export default function HubGuard({ children, companyId }: { children: React.ReactNode, companyId: string }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'blocked' | 'maintenance'>('loading');
  const [reason, setReason] = useState('');

  useEffect(() => {
    async function validateWithHub() {
      if (!companyId) return;

      try {
        // 1. Pegar a API KEY do Hub salva na empresa atual no Zaptro
        // (Você precisa garantir que a tabela companies no Zaptro tenha a coluna 'hub_api_key')
        const { data: company } = await supabase
          .from('companies')
          .select('hub_api_key')
          .eq('id', companyId)
          .single();

        const token = company?.hub_api_key;
        
        if (!token) {
          setStatus('blocked');
          setReason('Sua empresa não possui uma chave de integração ativa com o Hub.');
          return;
        }

        // 2. Chamar o Cérebro (Hub)
        const res = await fetch('https://rrjnkmgkhbtapumgmhhr.supabase.co/functions/v1/validate-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, product: 'zaptro' }) // <-- Aqui ele se identifica como zaptro
        });
        
        const data = await res.json();

        // 3. Verifica as respostas do Hub
        if (data.maintenance) {
          setStatus('maintenance');
          return;
        }

        if (data.valid) {
          setStatus('allowed'); // 🟢 Liberado!
        } else {
          setStatus('blocked'); // 🔴 Bloqueado! Traduz o motivo para o usuário
          if (data.reason === 'company_blocked') setReason('O acesso da sua empresa foi suspenso. Verifique pendências no Hub.');
          else if (data.reason === 'no_active_products') setReason('Nenhuma assinatura ativa encontrada para esta empresa.');
          else if (data.reason === 'product_not_enabled') setReason('A assinatura atual não inclui acesso ao Zaptro.');
          else setReason('Chave de integração inválida ou expirada.');
        }

      } catch (err) {
        setStatus('blocked');
        setReason('Não foi possível validar o acesso com os servidores centrais.');
      }
    }

    validateWithHub();
  }, [companyId]);

  if (status === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'maintenance') return <BlockScreen title="Manutenção Programada" message="O sistema está em manutenção para melhorias na infraestrutura. Voltamos em breve!" />;
  
  if (status === 'blocked') return <BlockScreen title="Acesso Bloqueado" message={reason} />;

  // Se chegou aqui, está valid = true! Retorna o Zaptro normalmente.
  return <>{children}</>;
}
