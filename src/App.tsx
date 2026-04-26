import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import SEOManager from './components/SEOManager';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import { ZAPTRO_ROUTES } from './constants/zaptroRoutes';
import ZaptroPagePermissionRoute from './components/Zaptro/ZaptroPagePermissionRoute';
import { zaptroSettingsEntryPermissionIds } from './utils/zaptroPagePermissionMap';

const WhatsAppSales = lazy(() => import('./pages/WhatsAppSales'));
const Login = lazy(() => import('./pages/Login'));
const ZaptroHomeInicio = lazy(() => import('./pages/ZaptroHomeInicio'));
const ZaptroDashboardResults = lazy(() => import('./pages/ZaptroDashboardResults'));
const ZaptroRegister = lazy(() => import('./pages/ZaptroRegister'));
const WhatsAppPremium = lazy(() => import('./pages/WhatsAppPremium'));
const ZaptroSettings = lazy(() => import('./pages/ZaptroSettings'));
const ZaptroCrm = lazy(() => import('./pages/ZaptroCrm'));
const ZaptroTeam = lazy(() => import('./pages/ZaptroTeam'));
const ZaptroProfile = lazy(() => import('./pages/ZaptroProfile'));
const ZaptroHistory = lazy(() => import('./pages/ZaptroHistory'));
const ZaptroClients = lazy(() => import('./pages/ZaptroClients'));
const ZaptroQuotesList = lazy(() => import('./pages/ZaptroQuotesList'));
const ZaptroPublicQuote = lazy(() => import('./pages/ZaptroPublicQuote'));
const ZaptroRoutes = lazy(() => import('./pages/ZaptroRoutes'));
const ZaptroDrivers = lazy(() => import('./pages/ZaptroDrivers'));
const ZaptroBilling = lazy(() => import('./pages/ZaptroBilling'));
const ZaptroLogistics = lazy(() => import('./pages/ZaptroLogistics'));
const ZaptroOccurrence = lazy(() => import('./pages/ZaptroOccurrence'));
const ZaptroClientDetail = lazy(() => import('./pages/ZaptroClientDetail'));
const ZaptroDriverRoute = lazy(() => import('./pages/ZaptroDriverRoute'));
const ZaptroPublicTrack = lazy(() => import('./pages/ZaptroPublicTrack'));
const ZaptroDriverProfile = lazy(() => import('./pages/ZaptroDriverProfile'));
const ZaptroCompanyLogin = lazy(() => import('./pages/ZaptroCompanyLogin'));
const ZaptroLeadProfile = lazy(() => import('./pages/ZaptroLeadProfile'));
const ZaptroVehicleProfile = lazy(() => import('./pages/ZaptroVehicleProfile'));
const ZaptroTeamMemberProfile = lazy(() => import('./pages/ZaptroTeamMemberProfile'));

const App: React.FC = () => {
  const { isLoading, isLoggingOut, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  
  // Redirecionamento de domínio: zaptro.com.br -> app.zaptro.com.br/inicio
  React.useEffect(() => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (hostname === 'zaptro.com.br' || hostname === 'www.zaptro.com.br') {
      window.location.replace('https://app.zaptro.com.br/inicio');
      return;
    }

    if (hostname === 'app.zaptro.com.br' && (pathname === '/' || pathname === '')) {
      navigate('/inicio', { replace: true });
    }
  }, [navigate]);

  if (isLoggingOut) return <Loading context="logout" />;
  if (isLoggingIn) return <Loading context="login" />;
  if (isLoading) return <Loading />;

  return (
    <>
      <SEOManager />
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Landing & Auth (Públicas) */}
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          {/* Orçamento — página pública (token na URL); sem login */}
          <Route path="/orcamento/:token" element={<ZaptroPublicQuote />} />
          {/* Execução de rota: motorista e cliente — públicos (token na URL); sem login */}
          <Route path="/rota/:token" element={<ZaptroDriverRoute />} />
          <Route path="/acompanhar/:token" element={<ZaptroPublicTrack />} />
          <Route path={`${ZAPTRO_ROUTES.COMPANY_LOGIN}/:slug`} element={<ZaptroCompanyLogin />} />
          <Route path={ZAPTRO_ROUTES.COMPANY_LOGIN} element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path={ZAPTRO_ROUTES.REGISTER} element={<ZaptroRegister />} />
          <Route path={ZAPTRO_ROUTES.ONBOARDING_CADASTRO} element={<ZaptroRegister />} />

          {/* Zaptro Product ONLY (Protegidas) */}
          <Route
            path={ZAPTRO_ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="inicio">
                  <ZaptroHomeInicio />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.RESULTADOS}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="inicio">
                  <ZaptroDashboardResults />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          {/* Inbox com thread (telefone em dígitos ou UUID) — CRM «Abrir conversa» usa `/whatsapp/:waThread` */}
          <Route
            path={`${ZAPTRO_ROUTES.CHAT}/:waThread`}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="whatsapp">
                  <WhatsAppPremium />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.CHAT}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="whatsapp">
                  <WhatsAppPremium />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.COMMERCIAL_CRM}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="crm">
                  <ZaptroCrm />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.COMMERCIAL_QUOTES}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="orcamentos">
                  <ZaptroQuotesList />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.ROUTES}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute anyOf={['rotas', 'crm', 'motoristas']}>
                  <ZaptroRoutes />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/mapa" element={<Navigate to={ZAPTRO_ROUTES.ROUTES} replace />} />

          <Route
            path={ZAPTRO_ROUTES.DRIVERS}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="motoristas">
                  <ZaptroDrivers />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={`${ZAPTRO_ROUTES.DRIVER_PROFILE}/:id`}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="motoristas">
                  <ZaptroDriverProfile />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={`${ZAPTRO_ROUTES.VEHICLE_PROFILE}/:id`}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="motoristas">
                  <ZaptroVehicleProfile />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={`${ZAPTRO_ROUTES.TEAM_MEMBER_PROFILE}/:id`}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="equipe">
                  <ZaptroTeamMemberProfile />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.BILLING}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="faturamento">
                  <ZaptroBilling />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.LOGISTICS}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="operacoes">
                  <ZaptroLogistics />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ocorrencia/:id"
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="historico">
                  <ZaptroOccurrence />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/perfil/:id"
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="clientes">
                  <ZaptroClientDetail />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.TEAM}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="equipe">
                  <ZaptroTeam />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.HISTORY}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="historico">
                  <ZaptroHistory />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/leads/perfil/:id"
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="clientes">
                  <ZaptroLeadProfile />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/leads"
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="clientes">
                  <ZaptroClients />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.CLIENTS}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute pageId="clientes">
                  <ZaptroClients />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path={ZAPTRO_ROUTES.SETTINGS_ALIAS}
            element={
              <ProtectedRoute>
                <ZaptroPagePermissionRoute anyOf={zaptroSettingsEntryPermissionIds()}>
                  <ZaptroSettings />
                </ZaptroPagePermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route path={ZAPTRO_ROUTES.PROFILE} element={<ProtectedRoute><ZaptroProfile /></ProtectedRoute>} />

          {/* Redirecionamentos de conveniência */}
          <Route path="/perfil" element={<Navigate to={ZAPTRO_ROUTES.PROFILE} replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
