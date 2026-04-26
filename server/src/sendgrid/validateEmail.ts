const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const s = value.trim().toLowerCase();
  if (s.length > 254) return false;
  return EMAIL_RE.test(s);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
