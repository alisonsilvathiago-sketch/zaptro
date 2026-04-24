/** Motoristas fictícios quando `whatsapp_drivers` está vazio (pré-visualização). */

export function isZaptroDemoDriverId(id: string): boolean {
  return String(id).startsWith('zaptro-demo-driver-');
}

export const ZAPTRO_DEMO_DRIVERS: Array<{ id: string; name: string; phone: string; vehicle: string; status: string; photo_url?: string }> = [
  {
    id: 'zaptro-demo-driver-1',
    name: 'João Ferreira',
    phone: '5511987654321',
    vehicle: 'Mercedes Actros · ABC1D23',
    status: 'ativo',
    photo_url: 'https://i.pravatar.cc/150?u=joao',
  },
  {
    id: 'zaptro-demo-driver-2',
    name: 'Maria Santos',
    phone: '5511976543210',
    vehicle: 'Scania R450 · XYZ9W87',
    status: 'ativo',
    photo_url: 'https://i.pravatar.cc/150?u=maria',
  },
  {
    id: 'zaptro-demo-driver-3',
    name: 'Pedro Costa',
    phone: '5511965432109',
    vehicle: 'Volvo FH · QWE4R56',
    status: 'inativo',
    photo_url: 'https://i.pravatar.cc/150?u=pedro',
  },
  {
    id: 'zaptro-demo-driver-4',
    name: 'Ana Oliveira',
    phone: '5511954321098',
    vehicle: 'Iveco Hi-Way · KJH7L89',
    status: 'ativo',
    photo_url: 'https://i.pravatar.cc/150?u=ana',
  },
];
