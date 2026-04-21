import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type TableName = 'shipments' | 'routes' | 'transactions' | 'profiles' | 'audit_logs';

/**
 * Hook para ouvir mudanças em tempo real no Supabase.
 * Usa useRef para o callback evitando loops de re-subscriptions.
 */
export const useRealtime = (
  table: TableName, 
  companyId: string | undefined, 
  callback: (payload: any) => void
) => {
  const callbackRef = useRef(callback);
  
  // Mantém a referência do callback atualizada sem triggering re-subscriptions
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!companyId) return;

    // Gerar um sufixo único para evitar conflito entre múltiplos hooks na mesma página
    const instanceId = Math.random().toString(36).substring(7);
    const channelName = `realtime_${table}_${companyId}_${instanceId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          callbackRef.current(payload);
        }
      );

    // Chamar subscribe APÓS configurar todos os .on()
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, companyId]);
};
