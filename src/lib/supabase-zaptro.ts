import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

const zUrl = import.meta.env.VITE_SUPABASE_ZAPTRO_URL || import.meta.env.VITE_SUPABASE_URL;
const zKey = import.meta.env.VITE_SUPABASE_ZAPTRO_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const mainUrl = import.meta.env.VITE_SUPABASE_URL;

/**
 * Um único projeto Supabase (mesmo URL + anon key) = uma sessão partilhada.
 * Evita: logado no ERP (cookie `logta-auth-token`) mas “deslogado” no Zaptro (localStorage `zaptro-auth-token`).
 * Se no futuro `VITE_SUPABASE_ZAPTRO_URL` apontar para outro projeto, aí sim usamos cliente e storage separados.
 */
const useDedicatedZaptroProject =
  !!import.meta.env.VITE_SUPABASE_ZAPTRO_URL &&
  import.meta.env.VITE_SUPABASE_ZAPTRO_URL !== mainUrl;

/**
 * Cliente Supabase dedicado para o ecossistema Zaptro.
 * Se VITE_SUPABASE_ZAPTRO_URL estiver presente e for diferente da URL principal,
 * cria um cliente isolado com sua própria chave de sessão.
 */
const dedicatedZaptroClient: SupabaseClient | null = useDedicatedZaptroProject
  ? createClient(zUrl || '', zKey || '', {
      auth: {
        persistSession: true,
        storageKey: 'zaptro-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        flowType: 'pkce',
        autoRefreshToken: true,
        lock: (name: any, timeout: any, fn: any) => {
           if (typeof timeout === 'function') return timeout();
           if (typeof fn === 'function') return fn();
           return Promise.resolve();
        }
      },
    })
  : null;




// Exporta o cliente dedicado ou o cliente principal como fallback (modo híbrido)
export const supabaseZaptro: SupabaseClient = dedicatedZaptroClient ?? supabase;

