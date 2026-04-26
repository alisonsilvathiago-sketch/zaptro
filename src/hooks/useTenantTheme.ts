import { useEffect } from "react";
import { supabase } from "../lib/supabase";

/**
 * Hook para injetar o tema (CSS Variables) da transportadora logada.
 * Garante o White Label real no dashboard do sistema filho.
 */
export const useTenantTheme = (companyId: string | undefined) => {
  useEffect(() => {
    if (!companyId) return;

    const loadTheme = async () => {
      try {
        const { data, error } = await supabase
          .from("tenant_settings")
          .select("*")
          .eq("company_id", companyId)
          .single();

        if (error && error.code !== 'PGRST') throw error;

        if (data) {
          document.documentElement.style.setProperty(
            "--primary",
            data.primary_color || "#3F0B78"
          );

          document.documentElement.style.setProperty(
            "--secondary",
            data.secondary_color || "#1E293B"
          );

          // Armazenar logo no localStorage ou similar para o Sidebar usar se necessário
          if (data.logo_url) {
            localStorage.setItem('tenant_logo', data.logo_url);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar tema personalizado:', err);
      }
    };

    loadTheme();
  }, [companyId]);
};
