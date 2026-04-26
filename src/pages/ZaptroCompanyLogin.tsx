import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { getZaptroPostLoginLandingUrl } from '../utils/domains';
import { profileHasZaptroProductAccess } from '../utils/authProductGate';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';

type CompanyRow = {
  id: string;
  name: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  menu_color?: string | null;
  bg_color?: string | null;
  settings?: Record<string, unknown> | null;
};

const DEFAULT_GRAD =
  'linear-gradient(135deg, #667eea 0%, #764ba2 45%, #6dd5ed 100%)';

function readLoginSettings(row: CompanyRow | null) {
  const s = row?.settings && typeof row.settings === 'object' ? row.settings : {};
  const layout = s.login_layout === 'mesh' ? 'mesh' : 'split';
  const gradient = typeof s.login_gradient === 'string' && s.login_gradient.trim() ? s.login_gradient : DEFAULT_GRAD;
  const btn =
    typeof s.login_button_color === 'string' && s.login_button_color.trim()
      ? s.login_button_color
      : row?.primary_color || '#D9FF00';
  return { layout, gradient, btn };
}

/**
 * Login **da transportadora** (marca própria), rota pública `/entrada/:slug`.
 * Autenticação é a mesma do Zaptro (Supabase Auth); só o visual muda.
 */
const ZaptroCompanyLogin: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [row, setRow] = useState<CompanyRow | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loadingCo, setLoadingCo] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCo(true);
      setLoadErr(null);
      const key = (slug || '').trim().toLowerCase();
      if (!key) {
        setLoadErr('Endereço inválido.');
        setLoadingCo(false);
        return;
      }
      try {
        const { data, error } = await supabaseZaptro
          .from('whatsapp_companies')
          .select('id,name,logo_url,favicon_url,primary_color,secondary_color,menu_color,bg_color,settings')
          .eq('subdomain', key)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (!data) {
          setLoadErr('Transportadora não encontrada para este endereço.');
          setRow(null);
        } else {
          setRow(data as CompanyRow);
        }
      } catch {
        if (!cancelled) setLoadErr('Não foi possível carregar a marca desta página.');
      } finally {
        if (!cancelled) setLoadingCo(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const { layout, gradient, btn } = readLoginSettings(row);
  const pri = row?.primary_color || '#D9FF00';
  const sec = row?.secondary_color || '#0f172a';
  const pageBg = row?.bg_color || '#f8fafc';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const em = email.trim().toLowerCase();
    if (!em || !password) {
      setErr('Preencha e-mail e senha.');
      return;
    }
    setBusy(true);
    try {
      const { data: signInData, error: signInError } = await supabaseZaptro.auth.signInWithPassword({
        email: em,
        password: password.trim(),
      });
      if (signInError) {
        setErr('Credenciais inválidas ou conta sem acesso.');
        return;
      }
      const uid = signInData.user?.id;
      if (!uid) {
        setErr('Sessão inválida.');
        await supabaseZaptro.auth.signOut();
        return;
      }
      const { data: profileRow } = await supabaseZaptro.from('profiles').select('*').eq('id', uid).single();
      if (!profileHasZaptroProductAccess(profileRow)) {
        await supabaseZaptro.auth.signOut();
        setErr('Esta conta não tem o módulo Zaptro ativo.');
        return;
      }
      window.location.assign(getZaptroPostLoginLandingUrl());
    } catch {
      setErr('Falha ao entrar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  if (loadingCo) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: pageBg,
          fontFamily: 'inherit',
        }}
      >
        <Loader2 className="animate-spin" size={32} color="#64748b" />
      </div>
    );
  }

  if (loadErr || !row) {
    return (
      <div style={{ minHeight: '100dvh', padding: 32, background: pageBg, fontFamily: 'inherit' }}>
        <p style={{ fontWeight: 600, color: '#0f172a' }}>{loadErr || 'Indisponível.'}</p>
        <a href={ZAPTRO_ROUTES.SALES} style={{ color: pri, fontWeight: 600 }}>
          Voltar
        </a>
      </div>
    );
  }

  const logoSrc = (row.logo_url || '').trim();
  const fav = (row.favicon_url || '').trim();

  const formBlock = (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {err && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(239,68,68,0.08)',
            color: '#b91c1c',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <AlertCircle size={18} /> {err}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff' }}>
        <Mail size={18} color="#0f172a" />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontWeight: 600 }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff' }}>
        <Lock size={18} color="#0f172a" />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontWeight: 600 }}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 14,
          border: 'none',
          background: btn,
          color: '#000',
          fontWeight: 700,
          fontSize: 15,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.75 : 1,
        }}
      >
        {busy ? <Loader2 className="animate-spin" size={20} style={{ margin: '0 auto' }} /> : 'Entrar'}
      </button>
      <p style={{ margin: 0, fontSize: 11, color: '#64748b', textAlign: 'center', fontWeight: 600 }}>
        Login da equipa <strong style={{ color: '#0f172a' }}>{row.name}</strong> ·{' '}
        <a href="/login" style={{ color: sec, fontWeight: 600 }}>
          Acesso Zaptro global
        </a>
      </p>
    </form>
  );

  if (layout === 'mesh') {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: gradient,
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            background: '#fff',
            borderRadius: 20,
            padding: '28px 24px 32px',
            boxShadow: '0 24px 80px rgba(15,23,42,0.18)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            {logoSrc ? (
              <img src={logoSrc} alt="" style={{ maxHeight: 52, maxWidth: '100%', objectFit: 'contain' }} />
            ) : fav ? (
              <img src={fav} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
            ) : (
              <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>{row.name}</span>
            )}
            <h1 style={{ margin: '14px 0 6px', fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Bem-vindo</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b', fontWeight: 600 }}>Entre com o e-mail da equipa.</p>
          </div>
          {formBlock}
        </div>
      </div>
    );
  }

  return (
    <div
      className="zc-split-root"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'row', fontFamily: 'inherit', overflow: 'hidden' }}
    >
      <div
        className="zc-split-left"
        style={{
          flex: '0 0 46%',
          minWidth: 0,
          background: `linear-gradient(165deg, ${sec} 0%, #0f172a 92%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          boxSizing: 'border-box',
        }}
      >
        {logoSrc ? (
          <img src={logoSrc} alt="" style={{ maxWidth: '85%', maxHeight: 72, objectFit: 'contain' }} />
        ) : fav ? (
          <img src={fav} alt="" style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>{row.name}</span>
        )}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>{formBlock}</div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .zc-split-root { flex-direction: column !important; }
          .zc-split-left { flex: 0 0 auto !important; width: 100% !important; min-height: 160px; }
        }
      `}</style>
    </div>
  );
};

export default ZaptroCompanyLogin;
