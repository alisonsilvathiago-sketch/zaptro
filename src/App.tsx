import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import SEOManager from './components/SEOManager';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import { ZAPTRO_ROUTES } from './constants/zaptroRoutes';

const WhatsAppSales = lazy(() => import('./pages/WhatsAppSales'));
const Login = lazy(() => import('./pages/Login'));
const ZaptroDashboard = lazy(() => import('./pages/ZaptroDashboard'));
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
const ZaptroOpenStreetMap = lazy(() => import('./pages/ZaptroOpenStreetMap'));

const App: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) return <Loading />;

  return (
    <>
      <SEOManager />
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Landing & Auth (Públicas) */}
          <Route path="/" element={<WhatsAppSales />} />
          {/* Orçamento — página pública (token na URL); sem login */}
          <Route path="/orcamento/:token" element={<ZaptroPublicQuote />} />
          {/* Execução de rota: motorista e cliente — públicos (token na URL); sem login */}
          <Route path="/rota/:token" element={<ZaptroDriverRoute />} />
          <Route path="/acompanhar/:token" element={<ZaptroPublicTrack />} />
          <Route path={ZAPTRO_ROUTES.COMPANY_LOGIN} element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path={ZAPTRO_ROUTES.REGISTER} element={<ZaptroRegister />} />

          {/* Zaptro Product ONLY (Protegidas) */}
          <Route path={ZAPTRO_ROUTES.DASHBOARD} element={<ProtectedRoute><ZaptroDashboard /></ProtectedRoute>} />
          {/* Inbox com thread (telefone em dígitos ou UUID) — CRM «Abrir conversa» usa `/whatsapp/:waThread` */}
          <Route path={`${ZAPTRO_ROUTES.CHAT}/:waThread`} element={<ProtectedRoute><WhatsAppPremium /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.CHAT} element={<ProtectedRoute><WhatsAppPremium /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.COMMERCIAL_CRM} element={<ProtectedRoute><ZaptroCrm /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.COMMERCIAL_QUOTES} element={<ProtectedRoute><ZaptroQuotesList /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.ROUTES} element={<ProtectedRoute><ZaptroRoutes /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.DRIVERS} element={<ProtectedRoute><ZaptroDrivers /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.BILLING} element={<ProtectedRoute><ZaptroBilling /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.LOGISTICS} element={<ProtectedRoute><ZaptroLogistics /></ProtectedRoute>} />
          <Route path="/ocorrencia/:id" element={<ProtectedRoute><ZaptroOccurrence /></ProtectedRoute>} />
          <Route path="/clientes/perfil/:id" element={<ProtectedRoute><ZaptroClientDetail /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.TEAM} element={<ProtectedRoute><ZaptroTeam /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.HISTORY} element={<ProtectedRoute><ZaptroHistory /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.OPENSTREETMAP} element={<ProtectedRoute><ZaptroOpenStreetMap /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.CLIENTS} element={<ProtectedRoute><ZaptroClients /></ProtectedRoute>} />
          <Route path={ZAPTRO_ROUTES.SETTINGS_ALIAS} element={<ProtectedRoute><ZaptroSettings /></ProtectedRoute>} />
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
