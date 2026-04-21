import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Download, Filter, 
  MoreVertical, Mail, Phone, MapPin, TrendingUp,
  CheckCircle2, XCircle, Clock, FileText, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import LogtaModal from '../components/Modal';
import { toastSuccess, toastError } from '../lib/toast';

const Clients: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchClients = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('name');
    
    if (error) toastError('Erro ao carregar clientes');
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [profile?.company_id]);

  return (
    <div style={styles.container}>
       <header style={styles.header}>
          <div>
             <h1 style={styles.title}>Gestão de Clientes</h1>
             <p style={{color: 'var(--text-muted)'}}>Base oficial de faturamento e parcerias ativas.</p>
          </div>
          <div style={{display: 'flex', gap: '12px'}}>
             <button style={styles.btnSecondary} onClick={() => window.print()}><Download size={18} /> Exportar PDF</button>
             <button style={styles.btnPrimary} onClick={() => setIsAddModalOpen(true)}><Plus size={18} /> Novo Cliente</button>
          </div>
       </header>

       <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
             <TrendingUp size={24} color="var(--primary)" />
             <div><p style={styles.kpiLabel}>Total Base</p><h3>{clients.length} Clientes</h3></div>
          </div>
          <div style={styles.kpiCard}>
             <CheckCircle2 size={24} color="var(--success)" />
             <div><p style={styles.kpiLabel}>Ativos</p><h3>{clients.filter(c => c.status === 'ACTIVE').length}</h3></div>
          </div>
          <div style={styles.kpiCard}>
             <Clock size={24} color="var(--warning)" />
             <div><p style={styles.kpiLabel}>Aguardando Faturamento</p><h3>12 ped.</h3></div>
          </div>
       </div>

       <div style={styles.filterArea}>
          <div style={styles.searchBox}>
             <Search size={18} color="var(--text-muted)" />
             <input placeholder="Buscar por nome, CNPJ ou segmento..." style={styles.searchInput} />
          </div>
          <div style={styles.filterBtn}><Filter size={18} /> Filtros Avançados</div>
       </div>

       <div style={styles.tableCard}>
          <table style={styles.table}>
             <thead>
                <tr>
                   <th style={styles.th}>Nome do Cliente</th>
                   <th style={styles.th}>Segmento / Origem</th>
                   <th style={styles.th}>Transporte / Setup</th>
                   <th style={styles.th}>Status</th>
                   <th style={styles.th}>Ações</th>
                </tr>
             </thead>
             <tbody>
                {clients.map(client => (
                  <tr key={client.id} style={{...styles.tr, cursor: 'pointer'}} onClick={() => navigate(`/crm/clientes/perfil/${client.id}`)}>
                     <td style={styles.td}>
                        <div style={styles.clientInfo}>
                           <div style={styles.avatar}>{client.name ? client.name[0] : 'C'}</div>
                           <div>
                              <p style={{fontWeight: '700'}}>{client.name}</p>
                              <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>{client.cnpj_cpf}</span>
                           </div>
                        </div>
                     </td>
                     <td style={styles.td}>{client.segment} <br/> <span style={{fontSize: '11px', opacity: 0.7}}>{client.partnership_time}</span></td>
                     <td style={styles.td}>{client.transport_type || 'Geral'}</td>
                     <td style={styles.td}>
                        <span style={{
                           padding: '4px 12px', 
                           borderRadius: '20px', 
                           fontSize: '10px', 
                           fontWeight: '900',
                           backgroundColor: client.status === 'ACTIVE' ? 'var(--success-light)' : 'var(--danger-light)',
                           color: client.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)'
                        }}>{client.status}</span>
                     </td>
                     <td style={styles.td}>
                        <button style={styles.iconBtn}><MoreVertical size={16} /></button>
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>

       <LogtaModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} width="700px" title="Novo Cliente Logta">
          <form style={styles.form} onSubmit={async (e) => {
             e.preventDefault();
             const formData = new FormData(e.target as HTMLFormElement);
             const { error } = await supabase.from('clients').insert([{
                company_id: profile?.company_id,
                name: formData.get('name'),
                cnpj_cpf: formData.get('cnpj_cpf'),
                segment: formData.get('segment'),
                status: 'ACTIVE'
             }]);
             if (!error) { toastSuccess('Cliente cadastrado!'); setIsAddModalOpen(false); fetchClients(); }
          }}>
             <div style={styles.inputGroup}><label>Razão Social / Nome</label><input name="name" required style={styles.input} /></div>
             <div style={styles.formRow}>
                <div style={styles.inputGroup}><label>CNPJ / CPF</label><input name="cnpj_cpf" style={styles.input} /></div>
                <div style={styles.inputGroup}><label>Segmento</label><input name="segment" style={styles.input} placeholder="Ex: Metalurgia, Alimentício..." /></div>
             </div>
             <div style={styles.inputGroup}><label>Tipo de Transporte Principal</label><select name="transport_type" style={styles.input}><option>Carga Fracionada</option><option>Lotação (FTL)</option><option>Logística Reversa</option></select></div>
             <button type="submit" style={styles.btnPrimaryFull}>Confirmar Cadastro de Cliente</button>
          </form>
       </LogtaModal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '900', letterSpacing: '-1px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' },
  kpiCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '20px' },
  kpiLabel: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' },
  filterArea: { display: 'flex', gap: '16px', marginBottom: '24px' },
  searchBox: { flex: 1, backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' },
  searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '14px' },
  filterBtn: { backgroundColor: 'white', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  tableCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '20px 24px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' },
  td: { padding: '20px 24px', fontSize: '14px', borderBottom: '1px solid var(--border)' },
  clientInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatar: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', cursor: 'pointer' },
  btnSecondary: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '16px', fontWeight: '800', cursor: 'pointer' },
  iconBtn: { border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  input: { padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none' },
  btnPrimaryFull: { padding: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', cursor: 'pointer', marginTop: '16px' }
};

export default Clients;
