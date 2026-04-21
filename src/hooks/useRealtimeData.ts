import { useEffect } from "react";
import { supabase } from "../lib/supabase";

/**
 * Hook universal para sincronização em tempo real (Supabase Realtime).
 * Garante que a UI esteja sempre viva sem necessidade de refresh manual.
 */
export const useRealtimeData = (table: string, onUpdate: () => void) => {
  useEffect(() => {
    // Configurar o canal para escutar TODAS as mudanças (*), inserts, updates e deletes
    const channel = supabase
      .channel(`realtime_${table}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
        },
        (payload) => {
          console.log(`[Realtime] Mudança detectada na tabela ${table}:`, payload);
          // Executar o callback de atualização (geralmente um re-fetch de dados)
          onUpdate();
        }
      )
      .subscribe();

    // Limpar o canal ao desmontar o componente
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdate]);
};
