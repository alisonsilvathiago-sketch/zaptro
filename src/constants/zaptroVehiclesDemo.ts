
export interface ZaptroVehicleDemo {
  id: string;
  plate: string;
  type: string;
  model: string;
  brand: string;
  year: string;
  status: 'disponivel' | 'em_rota' | 'manutencao' | 'inativo';
  driver?: string | null;
  lastMaintenance?: string;
  nextMaintenance?: string;
  fuelType?: string;
  loadCapacity?: string;
}

export const ZAPTRO_DEMO_VEHICLES: ZaptroVehicleDemo[] = [
  { 
    id: 'v1', 
    plate: 'ABC-1234', 
    type: 'Caminhão', 
    model: 'Volvo FH 540', 
    brand: 'Volvo', 
    year: '2022', 
    status: 'disponivel', 
    driver: 'João Silva',
    lastMaintenance: '2023-11-15',
    nextMaintenance: '2024-05-15',
    fuelType: 'Diesel S10',
    loadCapacity: '74 Ton'
  },
  { 
    id: 'v2', 
    plate: 'XYZ-9876', 
    type: 'Van', 
    model: 'Sprinter 415', 
    brand: 'Mercedes-Benz', 
    year: '2023', 
    status: 'em_rota', 
    driver: 'Alison Silva',
    lastMaintenance: '2024-01-10',
    nextMaintenance: '2024-07-10',
    fuelType: 'Diesel S10',
    loadCapacity: '1.5 Ton'
  },
  { 
    id: 'v3', 
    plate: 'DEF-5678', 
    type: 'Furgão', 
    model: 'Fiorino Endurance', 
    brand: 'Fiat', 
    year: '2021', 
    status: 'manutencao', 
    driver: null,
    lastMaintenance: '2024-04-20',
    nextMaintenance: '2024-05-01',
    fuelType: 'Flex',
    loadCapacity: '650 Kg'
  },
  { 
    id: 'v4', 
    plate: 'GHI-9012', 
    type: 'Caminhão', 
    model: 'Scania R450', 
    brand: 'Scania', 
    year: '2020', 
    status: 'inativo', 
    driver: null,
    lastMaintenance: '2023-08-05',
    nextMaintenance: 'Vencida',
    fuelType: 'Diesel',
    loadCapacity: '40 Ton'
  }
];

export function isZaptroDemoVehicleId(id: string): boolean {
  return ZAPTRO_DEMO_VEHICLES.some(v => v.id === id);
}
