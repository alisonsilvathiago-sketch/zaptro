import { 
  Truck, Package, Home, Thermometer, UserCheck, 
  MapPin, ShoppingCart, Tractor, Zap, Clock,
  Activity, FileText
} from 'lucide-react';

export interface SegmentConfig {
  primaryLabel: string;
  secondaryLabel: string;
  mainIcon: any;
  specialKpi: string;
  specialKpiIcon: any;
  terminology: {
    drivers: string;
    fleet: string;
    load: string;
    destinations: string;
  }
}

export const SEGMENT_CONFIGS: Record<string, SegmentConfig> = {
  'Transporte Rodoviário (Carga Geral)': {
    primaryLabel: 'Logística de Cargas',
    secondaryLabel: 'Distribuição Nacional',
    mainIcon: Truck,
    specialKpi: 'Tonelagem Total',
    specialKpiIcon: Package,
    terminology: { drivers: 'Motoristas', fleet: 'Frota', load: 'Carga', destinations: 'Entregas' }
  },
  'Transporte Frigorificado (Alimentos)': {
    primaryLabel: 'Cadeia de Frio',
    secondaryLabel: 'Transporte Termocontrolado',
    mainIcon: Thermometer,
    specialKpi: 'Temp. Média Frota',
    specialKpiIcon: Zap,
    terminology: { drivers: 'Motoristas', fleet: 'Caminhões Frio', load: 'Perecíveis', destinations: 'Pontos de Venda' }
  },
  'Logística e Armazenagem': {
    primaryLabel: 'Intralogística',
    secondaryLabel: 'Gestão de CD e Estoque',
    mainIcon: Package,
    specialKpi: 'Taxa de Ocupação',
    specialKpiIcon: Home,
    terminology: { drivers: 'Operadores', fleet: 'Empilhadeiras', load: 'SKUs', destinations: 'Doca de Saída' }
  },
  'Mudanças e Transportes Especiais': {
    primaryLabel: 'Serviços Residenciais',
    secondaryLabel: 'Mudanças e Guarda-móveis',
    mainIcon: Home,
    specialKpi: 'Equipes de Montagem',
    specialKpiIcon: UserCheck,
    terminology: { drivers: 'Líderes de Equipe', fleet: 'Baús', load: 'Inventário Cliente', destinations: 'Novo Endereço' }
  },
  'Distribuição Urbana (Last Mile)': {
    primaryLabel: 'Last Mile Delivery',
    secondaryLabel: 'Entregas Expressas',
    mainIcon: Zap,
    specialKpi: 'Tempo Médio Entrega',
    specialKpiIcon: Clock,
    terminology: { drivers: 'Entregadores', fleet: 'VUCs/Motos', load: 'Pacotes', destinations: 'Consumidores' }
  },
  'Transporte de Grãos / Agronegócio': {
    primaryLabel: 'Logística Agro',
    secondaryLabel: 'Escoamento de Safra',
    mainIcon: Tractor,
    specialKpi: 'Volume (Sacas/Kg)',
    specialKpiIcon: Activity,
    terminology: { drivers: 'Caminhoneiros', fleet: 'Bitrens/Graneleiros', load: 'Safra', destinations: 'Porto/Silagem' }
  },
  'E-commerce e Courier': {
    primaryLabel: 'E-commerce Log',
    secondaryLabel: 'Fulfillment & Shippings',
    mainIcon: ShoppingCart,
    specialKpi: 'Pacotes por Hora',
    specialKpiIcon: Zap,
    terminology: { drivers: 'Couriers', fleet: 'Vans de Entrega', load: 'Encomendas', destinations: 'Hubs Regionais' }
  },
  'Serviços e Equipes de Campo': {
    primaryLabel: 'Field Service',
    secondaryLabel: 'Gestão de Equipes Móveis',
    mainIcon: UserCheck,
    specialKpi: 'Ordens de Serviço',
    specialKpiIcon: FileText,
    terminology: { drivers: 'Técnicos', fleet: 'Veículos de Serviço', load: 'Materiais/OS', destinations: 'Clientes em Campo' }
  }
};

export const getSegmentConfig = (segmentName?: string): SegmentConfig => {
  return SEGMENT_CONFIGS[segmentName || ''] || SEGMENT_CONFIGS['Transporte Rodoviário (Carga Geral)'];
};
