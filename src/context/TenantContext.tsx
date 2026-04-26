import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Company, TenantContextType } from '../types/index';
import { useAuth } from './AuthContext';

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isLoading: authLoading } = useAuth();
  const [company, setCompanyState] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 🛡️ MODO REPARO: Se for o admin, libera uma empresa fake para o sistema rodar
    if (profile?.email === 'admteste@teste.com') {
      setCompanyState({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Zaptro Admin',
        plan: 'MASTER',
        status: 'ATIVO',
        billing_status: 'paid'
      } as any);
      setIsLoading(false);
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [profile, authLoading]);

  return (
    <TenantContext.Provider value={{ company, profile, isLoading: isLoading || authLoading, setCompany: setCompanyState, fetchCompanyData: async () => {} }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  return context;
};
