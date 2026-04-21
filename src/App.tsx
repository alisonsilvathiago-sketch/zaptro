import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import SEOManager from './components/SEOManager';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';

// ZAPTRO PAGES
import WhatsAppSales from './pages/WhatsAppSales';
import Login from './pages/Login';
import ZaptroDashboard from './pages/ZaptroDashboard';
import ZaptroRegister from './pages/ZaptroRegister';
import WhatsAppPremium from './pages/WhatsAppPremium';
import ZaptroSettings from './pages/ZaptroSettings';
import ZaptroCrm from './pages/ZaptroCrm';
import ZaptroTeam from './pages/ZaptroTeam';
import ZaptroProfile from './pages/ZaptroProfile';
import ZaptroHistory from './pages/ZaptroHistory';
import ZaptroClients from './pages/ZaptroClients';
import ZaptroQuotesList from './pages/ZaptroQuotesList';
import ZaptroPublicQuote from './pages/ZaptroPublicQuote';
import ZaptroRoutes from './pages/ZaptroRoutes';
import ZaptroDrivers from './pages/ZaptroDrivers';
import ZaptroBilling from './pages/ZaptroBilling';
import ZaptroLogistics from './pages/ZaptroLogistics';
import ZaptroOccurrence from './pages/ZaptroOccurrence';
import ZaptroClientDetail from './pages/ZaptroClientDetail';
import ZaptroDriverRoute from './pages/ZaptroDriverRoute';
import ZaptroPublicTrack from './pages/ZaptroPublicTrack';
import ZaptroOpenStreetMap from './pages/ZaptroOpenStreetMap';
import { ZAPTRO_ROUTES } from './constants/zaptroRoutes';

const App: React.FC = () => {
  const { isLoading } = useAuth();
  
  if (isLoading) return <Loading />;

  return (
    <>
      <SEOManager />
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
    </>
  );
};

export default App;
