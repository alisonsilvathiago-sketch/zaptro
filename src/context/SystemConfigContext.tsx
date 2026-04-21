import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { isZaptroProductPath } from '../utils/domains';

/** Evita bater em `system_configs` do projeto Logta enquanto o Zaptro usa outro Supabase (`VITE_SUPABASE_ZAPTRO_*`). */
function shouldSkipSystemConfigsFetch(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, port, pathname } = window.location;
  return (
    port === '5174' ||
    hostname.includes('zaptro') ||
    isZaptroProductPath(pathname)
  );
}

const ZAPTRO_DOCUMENT_TITLE = 'Zaptro | Automação Logística';

interface SystemConfigs {
  platformName: string;
  primaryColor: string;
  supportEmail: string;
  logoUrl: string;
  allowRegistration: boolean;
}

interface SystemConfigContextType {
  configs: SystemConfigs;
  isLoading: boolean;
  refreshConfigs: () => Promise<void>;
}

const defaultConfigs: SystemConfigs = {
  platformName: 'Logta SaaS',
  primaryColor: '#7c3aed',
  supportEmail: 'suporte@logta.app',
  logoUrl: '',
  allowRegistration: true
};

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

export const SystemConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [configs, setConfigs] = useState<SystemConfigs>(defaultConfigs);
  const [isLoading, setIsLoading] = useState(true);

  const applyBranding = (color: string) => {
    if (!color) return;
    try {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const root = document.documentElement;
      root.style.setProperty('--primary', color);
      root.style.setProperty('--primary-light', `rgba(${r}, ${g}, ${b}, 0.1)`);
      root.style.setProperty('--primary-glow', `rgba(${r}, ${g}, ${b}, 0.2)`);
    } catch (e) { console.warn('Erro ao aplicar branding color'); }
  };

  const refreshConfigs = async () => {
    if (shouldSkipSystemConfigsFetch()) {
      setConfigs(defaultConfigs);
      document.title = ZAPTRO_DOCUMENT_TITLE;
      setIsLoading(false);
      return;
    }

    // 🛡️ SEGURANÇA: Se o banco demorar mais de 6 segundos, usamos o padrão para não travar o site
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 6000));
    
    try {
      const fetchPromise = supabase.from('system_configs').select('*');
      const { data, error } = await Promise.race([fetchPromise, timeout]) as any;

      if (error) throw error;
      if (data) {
        const newConfigs: SystemConfigs = { ...defaultConfigs };
        data.forEach((item: any) => {
          if (item.key === 'PLATFORM_NAME') newConfigs.platformName = item.value;
          if (item.key === 'PRIMARY_COLOR') { newConfigs.primaryColor = item.value; applyBranding(item.value); }
        });
        setConfigs(newConfigs);
        const isZaptroUi =
          window.location.port === '5174' ||
          window.location.hostname.includes('zaptro') ||
          isZaptroProductPath(window.location.pathname);
        document.title = isZaptroUi ? ZAPTRO_DOCUMENT_TITLE : newConfigs.platformName;
      }
    } catch (err) {
      console.warn('Usando configurações padrão (Timeout ou Erro de Banco):', err);
      const isZaptroUi =
        window.location.port === '5174' ||
        window.location.hostname.includes('zaptro') ||
        isZaptroProductPath(window.location.pathname);
      document.title = isZaptroUi ? ZAPTRO_DOCUMENT_TITLE : 'Logta SaaS | Ativado';
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshConfigs();
  }, []);

  return (
    <SystemConfigContext.Provider value={{ configs, isLoading, refreshConfigs }}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (context === undefined) throw new Error('useSystemConfig deve ser usado dentro de um SystemConfigProvider');
  return context;
};
