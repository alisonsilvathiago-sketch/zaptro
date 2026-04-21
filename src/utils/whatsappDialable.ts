/**
 * Normaliza o destino para Evolution `sendText` (E.164 só dígitos, sem @s.whatsapp.net).
 * Rejeita strings que parecem ID interno (muitas letras) em vez de telefone.
 */
export function toEvolutionDialable(raw: string): string | null {
  const t = raw.trim();
  if (!t || t === '—' || t === '-') return null;

  const noJid = t.replace(/@s\.whatsapp\.net$/i, '').replace(/@c\.us$/i, '').replace(/@g\.us$/i, '');
  const letters = noJid.replace(/[\d+\s().-]/g, '');
  if (letters.length > 2) return null;

  let digits = noJid.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;

  // BR comum: DDD + número sem DDI
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }

  return digits;
}
