/**
 * Regras de produto Zaptro (compra, conta, WhatsApp, permissões).
 * Mantidas em um só lugar para alinhar UI, backend e documentação.
 */
export const ZAPTRO_PRODUCT_RULES = {
  /** Quem compra / ativa a conta própria entra como administrador da transportadora no painel. */
  purchaserIsTenantAdmin: true,

  /** Uma conta (login) = um número WhatsApp conectado por vez; trocar número = desconectar e escanear outro QR. */
  oneWhatsAppNumberPerAccount: true,

  /** Após deslogar o WhatsApp, o mesmo login pode solicitar/escanear uma nova conexão (não cria segunda instância). */
  reconnectSameAccountAfterLogout: true,

  /**
   * Só o administrador da empresa (role ADMIN no tenant, ou MASTER da plataforma) altera vitrine,
   * vê assinatura/cobrança e abre Configurações (WhatsApp, equipe, automações).
   * Colaboradores: em geral só o próprio perfil pessoal; extras vêm de `permissions` no perfil (futuro).
   */
  onlyTenantAdminEditsCompanyAndBilling: true,
} as const;
