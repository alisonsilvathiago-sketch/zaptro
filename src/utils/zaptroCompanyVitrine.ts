import type { Company } from '../types';

export type VitrineFormLike = {
  name: string;
  phone: string;
  address: string;
  website: string;
  segment: string;
  description: string;
  hours: string;
  logo: string | null;
};

/** Lista campos da vitrine ainda vazios ou curtos demais (para aviso + WhatsApp). */
export function vitrineMissingFields(
  v: VitrineFormLike,
  savedLogoFromDb?: string | null | undefined
): string[] {
  const missing: string[] = [];
  // Apenas Nome e Telefone são estritamente obrigatórios para o funcionamento técnico básico
  if (!v.name?.trim() || v.name.trim().length < 2) missing.push('Nome fantasia');
  if (!v.phone?.trim() || v.phone.replace(/\D/g, '').length < 8) missing.push('Telefone de atendimento');
  
  // Os demais campos agora são opcionais e não bloqueiam a ativação
  return missing;
}

export function isVitrineComplete(
  v: VitrineFormLike,
  savedLogoFromDb?: string | null | undefined
): boolean {
  return vitrineMissingFields(v, savedLogoFromDb).length === 0;
}

/** Avalia a empresa carregada no tenant (após salvar a vitrine). */
export function companyRecordMissingFields(c: Company | null): string[] {
  if (!c) return ['Empresa não carregada'];
  return vitrineMissingFields(
    {
      name: c.name || '',
      phone: c.phone || '',
      address: c.address || '',
      website: c.website || '',
      segment: c.category || '',
      description: c.description || '',
      hours: c.opening_hours || '',
      logo: c.logo_url || null,
    },
    c.logo_url
  );
}
