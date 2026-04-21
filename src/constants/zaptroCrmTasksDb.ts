import { supabaseZaptro } from '../lib/supabase-zaptro';

export type ZaptroCrmTaskStatus = 'open' | 'done' | 'cancelled';

export type ZaptroCrmTaskRow = {
  id: string;
  company_id: string;
  lead_id: string;
  title: string;
  due_at: string | null;
  status: ZaptroCrmTaskStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function isMissingTasksTable(err: { message?: string; code?: string } | null): boolean {
  const m = (err?.message || '').toLowerCase();
  return m.includes('zaptro_crm_tasks') || m.includes('does not exist') || m.includes('schema cache');
}

export async function fetchCrmTasksForLead(companyId: string, leadId: string): Promise<ZaptroCrmTaskRow[]> {
  const { data, error } = await supabaseZaptro
    .from('zaptro_crm_tasks')
    .select('*')
    .eq('company_id', companyId)
    .eq('lead_id', leadId)
    .order('due_at', { ascending: true, nullsFirst: false });

  if (error) {
    if (isMissingTasksTable(error)) return [];
    throw error;
  }
  return (data as ZaptroCrmTaskRow[]) || [];
}

export async function insertCrmTask(params: {
  companyId: string;
  leadId: string;
  title: string;
  dueAtIso: string | null;
  notes: string | null;
  createdBy: string | undefined;
}): Promise<ZaptroCrmTaskRow> {
  const row = {
    company_id: params.companyId,
    lead_id: params.leadId,
    title: params.title.trim(),
    due_at: params.dueAtIso,
    notes: params.notes?.trim() || null,
    status: 'open' as const,
    created_by: params.createdBy ?? null,
  };
  const { data, error } = await supabaseZaptro.from('zaptro_crm_tasks').insert([row]).select('*').single();
  if (error) {
    if (isMissingTasksTable(error)) {
      throw new Error('MISSING_TABLE');
    }
    throw error;
  }
  return data as ZaptroCrmTaskRow;
}

export async function updateCrmTaskStatus(taskId: string, companyId: string, status: ZaptroCrmTaskStatus): Promise<void> {
  const { error } = await supabaseZaptro
    .from('zaptro_crm_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('company_id', companyId);
  if (error) {
    if (isMissingTasksTable(error)) throw new Error('MISSING_TABLE');
    throw error;
  }
}
