/**
 * Checkout e cobrança ficam na **Logta Master** (gateway / play.logta).
 * O Zaptro só redirecciona para o URL em `VITE_LOGTA_MASTER_CHECKOUT_URL`.
 */
export function buildLogtaMasterCheckoutUrl(opts: {
  plan: string;
  cycle: 'yearly' | 'monthly';
  companyId?: string | null;
  email?: string | null;
}): string | null {
  const raw = import.meta.env.VITE_LOGTA_MASTER_CHECKOUT_URL as string | undefined;
  const base = raw?.trim();
  if (!base) return null;
  try {
    const u = new URL(base.startsWith('http') ? base : `https://${base}`);
    u.searchParams.set('product', 'zaptro');
    u.searchParams.set('plan', opts.plan);
    u.searchParams.set('billing_cycle', opts.cycle);
    if (opts.companyId) u.searchParams.set('company_id', opts.companyId);
    if (opts.email) u.searchParams.set('email', opts.email);
    return u.toString();
  } catch {
    return base;
  }
}
