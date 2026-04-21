import React, { useLayoutEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import type { UserRole } from '../types/index';
import { getHomePathForRole } from '../utils/rbac';
import { getContext, isZaptroProductPath } from '../utils/domains';
import {
  profileHasAcademyAccess,
  profileHasLogtaErpAccess,
  profileHasZaptroProductAccess,
  resolveBestProductHomePath,
} from '../utils/authProductGate';
import { pathRequiresLogtaSaaSEntitlement } from '../utils/productRoutePolicy';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import Loading from './Loading';
import { isZaptroLocalhostDev } from '../utils/zaptroDevBypass';

/** Redirecionamento para URL externa fora do render (react-hooks/immutability). */
const ExternalSiteRedirect: React.FC<{ href: string }> = ({ href }) => {
  useLayoutEffect(() => {
    window.location.replace(href);
  }, [href]);
  return <Loading message="Redirecionando..." />;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  allowedPermission?: string;
  requireMasterAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  allowedPermission,
  requireMasterAdmin = false 
}) => {
  const { user, profile: authProfile, isLoading: authLoading, authError, isMaster, signOut } = useAuth();

  const { company, isLoading: tenantLoading } = useTenant();
  const location = useLocation();
  const context = getContext();

  /** Fora do app Zaptro/local: manda ao site institucional. No Zaptro sempre `/login` na mesma origem. */
  const redirectToMarketing = () => {
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return <Navigate to="/login" replace />;
    }
    return <ExternalSiteRedirect href="https://logta.com.br" />;
  };

  const redirectUnauthenticated = () => {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const onZaptroHost = host.includes('zaptro');
    if (isLocal || onZaptroHost || getContext() === 'WHATSAPP' || isZaptroProductPath(location.pathname)) {
      return (
        <Navigate
          to="/login"
          replace
          state={{ from: `${location.pathname}${location.search}` }}
        />
      );
    }
    return redirectToMarketing();
  };

  if (authLoading) {
    return <Loading message="Verificando seu acesso seguro..." />;
  }

  if (!user) {
    return redirectUnauthenticated();
  }

  // Se o usuário está logado mas o perfil ainda não carregou (e não estamos em loading)
  // isso pode ser uma falha de rede ou perfil inexistente. No localhost/dev, permitimos entrar.
  if (!authProfile) {
     const isZaptro = context === 'WHATSAPP' || isZaptroProductPath(location.pathname);
     
     // BYPASS PARA DESENVOLVIMENTO
     if (isZaptroLocalhostDev()) {
        return <>{children}</>;
     }

     const primaryColor = isZaptro ? '#000000' : 'var(--primary)';
     const btnTextColor = isZaptro ? '#D9FF00' : 'white';
     const brandName = isZaptro ? 'Zaptro AI' : 'Logta SaaS';
     const isMissingTable = (authError as any)?.code === '42P01';

     return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: isZaptro ? '#FFFFFF' : '#f4f4f4', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ color: isZaptro ? '#000000' : '#ef4444', marginBottom: '24px' }}>
            {isZaptro ? (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bounce">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#000000" />
              </svg>
            ) : (
              <svg style={{ width: '48px', height: '48px', margin: '0 auto' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          
          <h2 style={{ fontSize: '2.4rem', fontWeight: '950', color: '#000', marginBottom: '12px', letterSpacing: '-2px' }}>
            {isMissingTable ? 'Banco de Dados Incompleto' : (isZaptro ? 'Sincronizar Zaptro' : 'Erro de Autenticação')}
          </h2>
          
          <p style={{ color: '#64748b', maxWidth: '520px', marginBottom: '32px', fontWeight: '500', lineHeight: '1.6' }}>
            {isMissingTable 
              ? 'A tabela "profiles" não foi encontrada no seu projeto Supabase do Zaptro. Você precisa rodar o script SQL abaixo no SQL Editor do Supabase.'
              : (isZaptro 
                  ? 'Detectamos que seu perfil Zaptro ainda não foi provisionado. Clique abaixo para forçar a sincronização.'
                  : 'Não foi possível carregar as permissões do seu perfil. Verifique sua conexão ou tente logar novamente.')}
          </p>

          {isMissingTable && (
            <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#0F172A', borderRadius: '16px', padding: '20px', textAlign: 'left', marginBottom: '32px', position: 'relative' }}>
              <pre style={{ margin: 0, color: '#94A3B8', fontSize: '11px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {`CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE, full_name text, role text DEFAULT 'USER',
  company_id uuid, tem_zaptro boolean DEFAULT true,
  status_zaptro text DEFAULT 'autorizado'
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Self update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Self insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);`}
              </pre>
              <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '9px', backgroundColor: '#334155', color: '#FFF', padding: '4px 8px', borderRadius: '6px' }}>
                SQL SUGGESTION
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', width: '300px' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{ padding: '16px 32px', borderRadius: '16px', background: primaryColor, color: btnTextColor, border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '14px', boxShadow: isZaptro ? '0 10px 20px rgba(0,0,0,0.1)' : 'none' }}
            >
              {isMissingTable ? 'Já rodei o SQL, Recarregar' : 'Forçar Sincronização Agora'}
            </button>
            <button
              type="button"
              onClick={async () => {
                const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
                if (local) { await signOut(); return; }
                localStorage.clear();
                window.location.href = isZaptro ? 'https://zaptro.com.br' : 'https://logta.com.br';
              }}
              style={{ padding: '14px 32px', borderRadius: '16px', background: 'transparent', color: '#64748B', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancelar e Sair
            </button>
          </div>
          
          <div style={{ marginTop: '56px', fontSize: '10px', fontWeight: '800', color: '#CBD5E1', letterSpacing: '2px' }}>
            {brandName.toUpperCase()} INTERNAL AUTH PROTOCOL • V4.0
          </div>
        </div>
     );
  }




  // 0. Validação de Contexto de Domínio (Bloqueio Físico)
  // Se estiver no domínio MASTER e não for Master Admin, expulsa
  if (context === 'MASTER' && !isMaster) {
    return redirectToMarketing();
  }

  // Master Admin tem acesso irrestrito
  if (isMaster) return <>{children}</>;

  // ADMIN da empresa: atalho só no **ERP Logta** quando o perfil tem entitlement SaaS (não no Zaptro).
  const isZaptro = isZaptroProductPath(location.pathname) || getContext() === 'WHATSAPP';
  if (authProfile.role === 'ADMIN' && !isZaptro && profileHasLogtaErpAccess(authProfile)) {
    return <>{children}</>;
  }

  // 1. Verificar permissão granular (JSONB na tabela profiles)
  if (allowedPermission) {
    const userPerms = (authProfile.permissions as string[]) || [];
    if (!userPerms.includes(allowedPermission)) {
      return <Navigate to={resolveBestProductHomePath(authProfile)} replace />;
    }
  }

  // 2. Verificar bloqueio de conta e faturamento
  if (tenantLoading || authLoading) return <Loading message="Sincronizando ambiente seguro..." />;

  // Master Admin ignore paywall (deve poder gerenciar tudo)
  if (!isMaster) {
    const isSuspended =
      company?.status === 'SUSPENSO' ||
      company?.status === 'BLOQUEADO' ||
      authProfile.status_empresa === 'bloqueado';
    const isBillingBlocked = company?.billing_status === 'blocked' || company?.billing_status === 'overdue';
    
    // Teste de Carência (Trial)
    const now = new Date();
    const trialExpired = company?.trial_ends_at ? new Date(company.trial_ends_at) < now : false;
    const isTrialing = company?.billing_status === 'trial';
    
    const isOnPaymentPath =
      location.pathname === '/suspensao' ||
      location.pathname === '/assinatura' ||
      location.pathname === '/perfil' ||
      location.pathname.startsWith('/whatsapp') ||
      location.pathname === ZAPTRO_ROUTES.PROFILE ||
      location.pathname === ZAPTRO_ROUTES.LEGACY_PROFILE ||
      location.pathname === ZAPTRO_ROUTES.BILLING;

    // Se o trial expirou e ele ainda está como 'trial', ou se está bloqueado manualmente
    if ((isSuspended || isBillingBlocked || (trialExpired && isTrialing)) && !isOnPaymentPath) {
      return <Navigate to="/suspensao" replace />;
    }
  }

  // 3. Rota exclusiva Master Admin
  if (requireMasterAdmin && !isMaster) {
    return <Navigate to={resolveBestProductHomePath(authProfile)} replace />;
  }

    // 4. Validação de Isolamento Multi-Produto (SaaS / Zaptro WaaS / Academy) — mesmo login, produtos separados
    if (!isMaster) {
       const path = location.pathname;
       const basePath = path.split('?')[0];
       const canErp = profileHasLogtaErpAccess(authProfile);
       const canZaptro = profileHasZaptroProductAccess(authProfile);
       const canAcademy = profileHasAcademyAccess(authProfile);
  
       const isZaptroPath = isZaptroProductPath(path);
       const isErpPath = pathRequiresLogtaSaaSEntitlement(path);
       const isAcademyPath = path.startsWith('/treinamentos');
  
       // 🚨 BLOQUEIO LOGITA SaaS (ERP)
       if (isErpPath && !canErp) {
          console.warn('[AUTH] Bloqueio Logta SaaS: Plano não adquirido.');
          if (canZaptro) return <Navigate to={ZAPTRO_ROUTES.DASHBOARD} replace />;
          if (canAcademy) return <Navigate to="/treinamentos" replace />;
          return redirectUnauthenticated();
       }
  
       // 🚨 BLOQUEIO ZAPTRO (WhatsApp)
       const isOpenZaptroRegistration = basePath === ZAPTRO_ROUTES.REGISTER || basePath === ZAPTRO_ROUTES.LEGACY_REGISTER;
       if (isZaptroPath && !isOpenZaptroRegistration && !canZaptro) {
          console.warn('[AUTH] Bloqueio Zaptro: Plano não adquirido.');
          if (canErp) return <Navigate to="/dashboard" replace />;
          if (canAcademy) return <Navigate to="/treinamentos" replace />;
          return redirectUnauthenticated();
       }
  
       // 🚨 BLOQUEIO ACADEMY
       if (isAcademyPath && !canAcademy) {
          console.warn('[AUTH] Bloqueio Academy: Plano não adquirido.');
          if (canErp) return <Navigate to="/dashboard" replace />;
          if (canZaptro) return <Navigate to={ZAPTRO_ROUTES.DASHBOARD} replace />;
          return redirectUnauthenticated();
       }
    }


  // 5. Verificar permissão por role (RBAC)
  if (allowedRoles && authProfile.role && !allowedRoles.includes(authProfile.role)) {
    // Se logado mas sem permissão para ESTA página específica -> Manda para a home dele pra evitar loop
    return <Navigate to={getHomePathForRole(authProfile.role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
