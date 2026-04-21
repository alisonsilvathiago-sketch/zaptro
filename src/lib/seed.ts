import { supabase } from './supabase';

export const seedDatabase = async (companyId: string) => {
  if (!companyId) return;

  try {
    // 1. Seed Motoristas (Profiles)
    const motoristas = [
      { 
        company_id: companyId, 
        full_name: 'João da Silva', 
        role: 'MOTORISTA', 
        metadata: { phone: '(11) 98888-7777', driver_type: 'Próprio', cnh: 'ABC12345', status: 'Ativo' } 
      },
      { 
        company_id: companyId, 
        full_name: 'Marcos Oliveira', 
        role: 'MOTORISTA', 
        metadata: { phone: '(11) 97777-6666', driver_type: 'Agregado', cnh: 'XYZ98765', status: 'Ativo' } 
      },
      { 
        company_id: companyId, 
        full_name: 'Ricardo Santos', 
        role: 'MOTORISTA', 
        metadata: { phone: '(11) 96666-5555', driver_type: 'Próprio', cnh: 'KLM55443', status: 'Em Rota' } 
      }
    ];

    for (const m of motoristas) {
       const email = `${m.full_name.toLowerCase().replace(/ /g, '.')}@seed.com`;
       await supabase.from('profiles').insert({ ...m, email });
    }

    // 2. Seed Veículos
    const veiculos = [
      { company_id: companyId, model: 'Mercedes-Benz Accelo', brand: 'Mercedes', plate: 'ABC-1234', type: 'Caminhão Médio', status: 'OPERACIONAL', year: 2022 },
      { company_id: companyId, model: 'Volvo FH 540', brand: 'Volvo', plate: 'XYZ-9876', type: 'Carreta', status: 'OPERACIONAL', year: 2023 },
      { company_id: companyId, model: 'Fiat Ducato', brand: 'Fiat', plate: 'LOG-5500', type: 'Van', status: 'MANUTENCAO', year: 2021 }
    ];
    await supabase.from('vehicles').insert(veiculos);

    // 3. Seed Clientes (CRM)
    const clientes = [
      { company_id: companyId, name: 'Indústrias Matarazzo', email: 'contato@matarazzo.com', phone: '(11) 4004-0000', address: 'São Paulo, SP' },
      { company_id: companyId, name: 'Mercado Livre Brasil', email: 'logistica@mercadolivre.com', phone: '(11) 3003-1000', address: 'Osasco, SP' },
      { company_id: companyId, name: 'Ambev Logística', email: 'frota@ambev.com.br', phone: '(11) 5555-4444', address: 'Jaguariúna, SP' }
    ];
    await supabase.from('clients').insert(clientes);

    // 4. Seed Estoque (Inventory)
    const produtos = [
      { company_id: companyId, name: 'Pneu Aro 22.5', category: 'Peças', quantity: 12, weight: 45, barcode: '789123456', is_sensitive: false, location_row: 'A', location_shelf: '01' },
      { company_id: companyId, name: 'Óleo Sintético 5W40', category: 'Insumos', quantity: 45, weight: 1, barcode: '789654321', is_sensitive: true, location_row: 'B', location_shelf: '05' },
      { company_id: companyId, name: 'Pallet Madeira Padrão', category: 'Logística', quantity: 200, weight: 25, barcode: '789000111', is_sensitive: false, location_row: 'D', location_shelf: 'EXT' }
    ];
    await supabase.from('inventory').insert(produtos);

    // 5. Seed Financeiro (Transactions)
    const transacoes = [
      { company_id: companyId, description: 'Frete Cliente Matarazzo', amount: 4500.00, type: 'INCOME', category: 'LOGISTICA', status: 'PAID', date: new Date().toISOString() },
      { company_id: companyId, description: 'Combustível Posto Ipiranga', amount: 1200.00, type: 'EXPENSE', category: 'OPERACIONAL', status: 'PAID', date: new Date().toISOString() },
      { company_id: companyId, description: 'Serviço DHL Express', amount: 8900.00, type: 'INCOME', category: 'LOGISTICA', status: 'PENDING', date: new Date().toISOString() },
      { company_id: companyId, description: 'Manutenção Preventiva Volvo', amount: 3500.00, type: 'EXPENSE', category: 'MANUTENÇÃO', status: 'PENDING', date: new Date().toISOString() }
    ];
    await supabase.from('transactions').insert(transacoes);

    // 6. Seed Treinamentos (Courses)
    const cursos = [
      { company_id: companyId, name: 'Direção Defensiva 2024', description: 'Curso obrigatório para todos os motoristas de frota própria.', segment: 'Motorista' },
      { company_id: companyId, name: 'Sistemas Logta Core', description: 'Como utilizar o sistema de gestão de fretes de forma eficiente.', segment: 'Logística' },
      { company_id: companyId, name: 'Segurança no Almoxarifado', description: 'Normas NR-12 e melhores práticas de estoque.', segment: 'Segurança' }
    ];
    await supabase.from('courses').insert(cursos);

    return true;
  } catch (err) {
    console.error('Seed error:', err);
    return false;
  }
};
