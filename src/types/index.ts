export type UserRole = 'MASTER_SUPER_ADMIN' | 'MASTER_ADMIN' | 'MASTER_OPERATOR' | 'MASTER_SUPPORT' | 'ADMIN' | 'GERENTE' | 'LOGISTICA' | 'MOTORISTA' | 'RH' | 'FINANCEIRO' | 'COMERCIAL' | 'ATENDIMENTO';

export type SubscriptionStatus = 'ATIVO' | 'SUSPENSO' | 'BLOQUEADO';
export type PlanType = 'BRONZE' | 'PRATA' | 'OURO' | 'MASTER' | 'PROFISSIONAL';

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  /** Dados públicos da transportadora (espelho WhatsApp / vitrine), quando existirem no banco Zaptro. */
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  opening_hours?: string;
  category?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  menu_color?: string;
  bg_color?: string;
  button_radius?: string;
  menu_name?: string;
  subdomain?: string;
  status: SubscriptionStatus;
  plan: PlanType;
  trial_ends_at?: string;
  billing_status?: 'trial' | 'active' | 'overdue' | 'blocked' | 'legacy';
  settings?: any;
}

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  role: UserRole;
  /** Permissões extras concedidas pelo ADMIN (ex.: `['zaptro:team:invite']`). */
  permissions?: string[];
  email?: string;
  status_empresa?: 'ativo' | 'bloqueado';
  status_zaptro?: 'autorizado' | 'pendente' | 'bloqueado';
  tem_zaptro?: boolean;
  /** Produto Logta SaaS (ERP) — quando `true`, o utilizador tem contrato / módulo ERP explícito. */
  tem_logta?: boolean;
  avatar_url?: string;
  two_factor_enabled?: boolean;
  last_login_ip?: string;
  security_settings?: {
    require_mfa?: boolean;
    session_timeout_min?: number;
  };
  metadata?: {
    modules?: {
      logta?: boolean;
      whatsapp?: boolean;
      academy?: boolean;
      [key: string]: boolean | undefined;
    };
    [key: string]: any;
  };
}

export interface TenantContextType {
  company: Company | null;
  profile: Profile | null;
  isLoading: boolean;
  setCompany: (company: Company) => void;
  fetchCompanyData: (forceById?: string) => Promise<void>;
}

export interface AuthContextType {
  user: any;
  profile: Profile | null;
  onlineUsers: string[];
  isLoading: boolean;
  authError: { message: string; code?: string } | null;
  isVerifyingMFA: boolean;

  isMaster: boolean;
  mfaUser: any | null;
  signOut: () => Promise<void>;
  /** Recarrega `profiles` do banco (mesmo cliente Supabase da sessão atual). */
  refreshProfile: () => Promise<void>;
  verifyMFA: (code: string) => Promise<boolean>;
  impersonate: (companyId: string, role?: UserRole) => void;
  stopImpersonating: () => void;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  plate: string;
  model: string;
  type: 'CAMINHAO' | 'VAN' | 'CARRETA' | 'MOTO';
  status: 'DISPONIVEL' | 'EM_ROTA' | 'MANUTENCAO';
  capacity?: string;
  created_at?: string;
}

export interface Shipment {
  id: string;
  company_id: string;
  client_id: string;
  status: 'PENDENTE' | 'EM_ROTA' | 'ENTREGUE' | 'CANCELADO';
  description?: string;
  weight?: string;
  lat: number;
  lng: number;
  created_at?: string;
  client?: Client; // Join opcional
}

export interface Route {
  id: string;
  company_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADA';
  map_data: {
    stops: Shipment[];
    polyline?: string;
  };
  created_at?: string;
}

export interface Transaction {
  id: string;
  company_id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  due_date: string;
  created_at?: string;
}

// --- WhatsApp Module Types ---

export interface WhatsAppInstance {
  id: string;
  company_id: string;
  instance_id: string;
  token?: string;
  phone?: string;
  status: 'connected' | 'disconnected';
  provider: 'z-api' | 'evolution';
  created_at: string;
}

export interface WhatsAppSector {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
}

export interface WhatsAppConversation {
  id: string;
  company_id: string;
  customer_phone: string;
  customer_name?: string;
  sector_id?: string;
  assigned_user_id?: string;
  status: 'open' | 'closed' | 'waiting';
  last_message?: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  sender_type: 'cliente' | 'atendente' | 'sistema';
  user_id?: string;
  message?: string;
  media_url?: string;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface WhatsAppSubscription {
  id: string;
  company_id: string;
  plan_id: string;
  messages_used: number;
  messages_limit: number;
  status: 'active' | 'expired' | 'canceled';
  expires_at: string;
}

// --- Hybrid Billing Types ---

export type MasterProductType = 'SaaS_PLAN' | 'WHATSAPP_ACTIVATION' | 'WHATSAPP_CREDITS' | 'COURSE';

export interface MasterCatalogProduct {
  id: string;
  name: string;
  description?: string;
  type: MasterProductType;
  price: number;
  billing_cycle: 'MONTHLY' | 'YEARLY' | 'ONETIME';
  credits_amount: number;
  features: any;
  is_active: boolean;
}

export interface CompanyWallet {
  id: string;
  company_id: string;
  credits_balance: number;
  last_recharge_at?: string;
}

export const TYPES_VERSION = '1.5';
