import type { SupabaseClient } from '@supabase/supabase-js';
import {
  postZaptroTransactionalEmail,
  type ZaptroMailBranding,
  type ZaptroTransactionalKind,
} from './zaptroMailApi';

type Body = {
  kind: ZaptroTransactionalKind;
  to: string;
  companyId?: string;
  variables?: Record<string, string | number | null>;
  branding?: ZaptroMailBranding;
};

/** Enfileira e-mail no servidor (não bloqueia UI; falhas ignoradas). */
export function fireTransactionalEmailNonBlocking(client: SupabaseClient, body: Body): void {
  void (async () => {
    try {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await postZaptroTransactionalEmail(token, body);
    } catch {
      /* ignore */
    }
  })();
}
