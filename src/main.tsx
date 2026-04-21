import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { TenantProvider } from './context/TenantContext'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { SystemConfigProvider } from './context/SystemConfigContext'

/** Produção: remove service workers antigos que possam servir HTML/JS em cache. */
if (import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) void r.unregister()
  })
}

if (import.meta.env.PROD) {
  ;(window as Window & { __LOGTA_RELEASE__?: string }).__LOGTA_RELEASE__ = __APP_RELEASE__
  console.info(
    '%c[Logta]%c Deploy ativo —',
    'background:#0f172a;color:#fff;font-weight:800;padding:2px 8px;border-radius:4px',
    'color:#64748b;font-weight:600',
    __APP_RELEASE__,
    '(se este ID não mudar após deploy, limpa cache do site ou usa janela anónima).',
  )
}

/** Confirma no DevTools → Consola que o bundle é este (rotas curtas). Se não aparecer, o `npm run dev` não é desta pasta ou está preso a cache. */
if (import.meta.env.DEV) {
  console.info(
    '%c[Logta dev]%c Zaptro: /inicio · /comercial (CRM) · /clientes · /equipe · /configuracao — rede: npm run dev:public (0.0.0.0:5174). Se vês /zaptro-* no URL, reinicia o Vite na pasta logta/.',
    'background:#D9FF00;color:#000;font-weight:800;padding:2px 8px;border-radius:4px',
    'color:#64748b;font-weight:600',
  );
}

const rootElement = document.getElementById('root');



if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <Toaster
            position="bottom-center"
            containerStyle={{
              zIndex: 99999,
              bottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
              pointerEvents: 'none',
            }}
            gutter={12}
            toastOptions={{
              duration: 4500,
              style: {
                borderRadius: '16px',
                background: 'transparent',
                boxShadow: 'none',
                padding: 0,
                maxWidth: 'min(440px, 96vw)',
                border: 'none',
              },
              success: {
                iconTheme: { primary: '#16a34a', secondary: '#f4f4f4' },
              },
              error: {
                iconTheme: { primary: '#dc2626', secondary: '#f4f4f4' },
              },
              loading: {
                iconTheme: { primary: '#ca8a04', secondary: '#f4f4f4' },
              },
            }}
          />
          <AuthProvider>
            <TenantProvider>
              <SystemConfigProvider>
                <App />
              </SystemConfigProvider>
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
}
