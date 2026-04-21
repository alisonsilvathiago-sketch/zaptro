import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface AppMetadata {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export const useApps = () => {
  const { profile } = useAuth();
  const [installedApps, setInstalledApps] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      if (!profile?.company_id) return;
      
      const { data, error } = await supabase
        .from('company_apps')
        .select('is_active, marketplace_apps(slug)')
        .eq('company_id', profile.company_id)
        .eq('is_active', true);

      if (data) {
        const appsMap: Record<string, boolean> = {};
        data.forEach((item: any) => {
          if (item.marketplace_apps?.slug) {
            appsMap[item.marketplace_apps.slug] = true;
          }
        });
        setInstalledApps(appsMap);
      }
      setLoading(false);
    };

    fetchApps();
  }, [profile?.company_id]);

  /**
   * Verifica se um app específico está ativo 
   * (Master Admin tem acesso a todos por padrão para gestão)
   */
  const isInstalled = (slug: string) => {
    if (profile?.role === 'MASTER_ADMIN') return true;
    return !!installedApps[slug];
  };

  return { isInstalled, installedApps, loading };
};
