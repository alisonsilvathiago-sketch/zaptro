/**
 * PostgREST devolve erros do tipo "Could not find the table 'public.whatsapp_companies' in the schema cache"
 * quando a tabela ainda não foi criada no projeto Supabase (Zaptro).
 */

const WHATSAPP_COMPANIES_FIX =
  'No Supabase → SQL Editor, executa no repo: supabase/migrations/20260415100000_create_whatsapp_companies_zaptro.sql (ou scripts/schema-zaptro-minimal.sql — secção whatsapp_companies). Cria public.whatsapp_companies e RLS. Depois recarrega a página.';

function extractMessage(err: unknown): string {
  if (err == null) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || '';
  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>;
    const parts = [o.message, o.details, o.hint, o.error_description].filter(
      (x) => x != null && String(x).trim() !== '',
    );
    if (parts.length) return parts.map(String).join(' ');
  }
  return String(err);
}

export function isMissingWhatsappCompaniesError(err: unknown): boolean {
  const m = extractMessage(err).toLowerCase();
  if (!m.includes('whatsapp_companies')) return false;
  return (
    m.includes('schema cache') ||
    m.includes('pgrst205') ||
    m.includes('does not exist') ||
    m.includes('could not find the table') ||
    m.includes('undefined table')
  );
}

/** Texto cru do erro (toast / diagnóstico). */
export function getZaptroDbErrorRawText(err: unknown): string {
  return extractMessage(err);
}

/** Mensagem para toast: curta no título, detalhe no corpo (notifyZaptro junta com " — "). */
export function formatZaptroDbErrorForToast(err: unknown, fallback: string): string {
  if (isMissingWhatsappCompaniesError(err)) return WHATSAPP_COMPANIES_FIX;
  const m = extractMessage(err);
  return m.trim() || fallback;
}
