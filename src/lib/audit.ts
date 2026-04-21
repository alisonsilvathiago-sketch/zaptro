import { supabase } from './supabase';

export type AuditModule = 
  | 'CRM' 
  | 'FINANCE' 
  | 'LOGISTICS' 
  | 'HR' 
  | 'FLEET' 
  | 'STOCK' 
  | 'SYSTEM' 
  | 'SECURITY';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'EXPORT' 
  | 'ACCESS_DENIED';

interface LogOptions {
  module: AuditModule;
  action: AuditAction | string;
  entity?: string;
  entity_id?: string;
  before_data?: any;
  after_data?: any;
  severity?: 'INFO' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Log Manual de Auditoria (Nexio Audit Hub)
 * Use para eventos que não são alterações diretas em tabelas monitoradas por trigger.
 */
export const logEvent = async (options: LogOptions) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar company_id do profile se necessário
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const { error } = await supabase.from('audit_logs').insert({
      company_id: profile?.company_id,
      user_id: user.id,
      module: options.module,
      action: options.action,
      entity: options.entity || 'manual_event',
      entity_id: options.entity_id,
      before_data: options.before_data || {},
      after_data: options.after_data || {},
      severity: options.severity || 'INFO'
    });

    if (error) throw error;
  } catch (err: any) {
    console.error('Audit Log Error:', err.message);
  }
};
