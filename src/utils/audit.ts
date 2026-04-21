import { supabase } from '../lib/supabase';

export type AuditModule = 'RH' | 'FINANCEIRO' | 'CRM' | 'ESTOQUE' | 'LOGISTICA' | 'AUTH' | 'SYSTEM' | 'MARKETPLACE';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'PAYMENT' | 'PERMISSION_CHANGE';

interface LogOptions {
  company_id: string;
  user_id: string;
  module: AuditModule;
  action: AuditAction;
  details: string;
  target_id?: string;
  metadata?: any;
}

/**
 * Registra uma ação no histórico global (Audit Logs)
 * Visível para Admin (da empresa) e Master (global)
 */
export const createAuditLog = async (options: LogOptions) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        company_id: options.company_id,
        user_id: options.user_id,
        module: options.module,
        action: options.action,
        details: options.details,
        target_id: options.target_id,
        metadata: {
          ...options.metadata,
          ip: 'client-side', // Idealmente capturado via backend, mas mantemos o placeholder
          timestamp: new Date().toISOString()
        }
      }]);

    if (error) {
      console.error('Erro ao gerar log de auditoria:', error);
    }
  } catch (err) {
    console.error('Falha crítica na auditoria:', err);
  }
};
