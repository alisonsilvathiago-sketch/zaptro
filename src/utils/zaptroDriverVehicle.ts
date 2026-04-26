/**
 * Tenta extrair placa (Mercosul ou legado) de texto livre tipo "Scania · ABC1D23".
 * Prioriza o segmento após «·» ou «|» (marca/modelo vs placa).
 */
export function extractPlateFromVehicleText(vehicle: string | null | undefined): string | null {
  const raw = (vehicle || '').trim();
  if (!raw) return null;
  const tail = (() => {
    const bySep = raw.split(/[·|]/);
    if (bySep.length > 1) return bySep[bySep.length - 1].trim();
    return raw;
  })();
  const compact = tail.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const mercosul = compact.match(/([A-Z]{3}\d[A-Z]\d{2})/);
  if (mercosul) return mercosul[1];
  const legacy = compact.match(/([A-Z]{3}\d{4})/);
  if (legacy) return legacy[1];
  return null;
}

/** Compara placa normalizada (só alfanumérico maiúsculas). */
export function platesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = (a || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const nb = (b || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return na.length > 0 && na === nb;
}

export function vehicleTextContainsPlate(vehicle: string | null | undefined, plate: string): boolean {
  const p = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (!p) return false;
  const v = (vehicle || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return v.includes(p);
}
