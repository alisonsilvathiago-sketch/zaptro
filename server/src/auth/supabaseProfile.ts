import { createClient, type AuthError, type User } from '@supabase/supabase-js';

export type ZaptroProfileRow = {
  company_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string | null;
};

export async function fetchProfileForUser(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken: string,
): Promise<ZaptroProfileRow | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await sb.from('profiles').select('company_id, email, full_name, role').single();
  if (error || !data) return null;
  return data as ZaptroProfileRow;
}

export type JwtUserResult = { data: { user: User | null }; error: AuthError | null };

export async function verifySupabaseJwt(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken: string,
): Promise<JwtUserResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      data: { user: null },
      error: { name: 'AuthError', message: 'supabase_env_missing', status: 500 } as AuthError,
    };
  }
  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return sb.auth.getUser(accessToken);
}
