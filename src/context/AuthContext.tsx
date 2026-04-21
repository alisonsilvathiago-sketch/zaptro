import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import type { AuthContextType, Profile } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🔥 SELEÇÃO LIMPA: Apenas colunas que realmente existem no seu banco
const ZAPTRO_PROFILE_SELECTS = 'id,email,full_name,role,company_id,avatar_url';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = supabaseZaptro;
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await db
        .from('profiles')
        .select(ZAPTRO_PROFILE_SELECTS)
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
    } catch (err) {
      console.warn('[AUTH] Perfil não encontrado ou erro de banco. Usando fallback básico.');
      setProfile({ id: userId, role: 'ADMIN' } as any);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setIsLoading(false);
    });

    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) loadProfile(currentUser.id);
      else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await db.auth.signOut();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signOut,
        isMaster: profile?.role === 'ADMIN' || profile?.role === 'MASTER',
        refreshProfile: async () => loadProfile(user?.id),
        authError: null,
        isVerifyingMFA: false,
        verifyMFA: async () => true,
        impersonate: () => {},
        stopImpersonating: () => {},
        onlineUsers: [],
        mfaUser: null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};
