import { Truck, Plus, Search, Filter, Trash2, Loader2, Fuel, Settings } from 'lucide-react'; // Removed unused AlertCircle
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import type { Vehicle } from '../types';

const Vehicles: React.FC = () => {
  const { company } = useTenant();
  const { profile } = useAuth();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Omit<Vehicle, 'id' | 'company_id' | 'created_at'>>({
    plate: '',
    model: '',
    type: 'CAMINHAO',
    status: 'DISPONIVEL',
    capacity: ''
  });

  const fetchVehicles = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .insert([{
          ...formData,
          company_id: profile.company_id
        }]);

      if (error) throw error;
      
      setIsModalOpen(false);
      setFormData({ plate: '', model: '', type: 'CAMINHAO', status: 'DISPONIVEL', capacity: '' });
      fetchVehicles();
    } catch (err) {
      alert('Erro ao salvar veículo: ' + (err as any).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover este veículo da frota?')) return;
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchVehicles();
    } catch (err) {
      alert('Erro ao deletar veículo');
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestão de Frota</h1>
          <p style={styles.subtitle}>Gerencie os veículos e caminhões da {company?.name}</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Novo Veículo
        </button>
      </header>

      <div style={styles.card}>
        <div style={styles.filterRow}>
          <div style={styles.searchBox}>
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Filtrar por placa ou modelo..." style={styles.input} />
          </div>
          <button style={styles.filterBtn}><Filter size={18} /> Todos os Tipos</button>
        </div>

        {loading ? (
          <div style={styles.loaderBox}>
            <Loader2 className="animate-spin" size={32} color="var(--accent)" />
            <p>Carregando frota...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div style={styles.emptyBox}>
            <Truck size={48} color="var(--text-muted)" />
            <h3>Frota Vazia</h3>
            <p>Clique em "+ Novo Veículo" para começar o cadastro.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {vehicles.map(vehicle => (
              <div key={vehicle.id} style={styles.vehicleCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.iconBox}>
                    <Truck size={24} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.modelName}>{vehicle.model}</h3>
                    <span style={styles.plateTag}>{vehicle.plate}</span>
                  </div>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(vehicle.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={styles.details}>
                  <div style={styles.detailItem}>
                    <Fuel size={14} /> <span>Tipo: <strong>{vehicle.type}</strong></span>
                  </div>
                  <div style={styles.detailItem}>
                    <Settings size={14} /> <span>Capacidade: <strong>{vehicle.capacity || 'N/A'}</strong></span>
                  </div>
                </div>

                <div style={styles.statusBox}>
                  <div style={{
                    ...styles.statusDot,
                    backgroundColor: vehicle.status === 'DISPONIVEL' ? 'var(--success)' : 'var(--warning)'
                  }} />
                  <span style={styles.statusText}>{vehicle.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Veículo">
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Placa</label>
              <input 
                style={styles.formInput} 
                placeholder="ABC-1234" 
                value={formData.plate}
                onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})}
                required 
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Modelo / Marca</label>
              <input 
                style={styles.formInput} 
                placeholder="Ex: Volvo FH 540" 
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
                required 
              />
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Tipo de Veículo</label>
              <select 
                style={styles.formInput} 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="CAMINHAO">Caminhão</option>
                <option value="VAN">Van / Utilitário</option>
                <option value="CARRETA">Carreta</option>
                <option value="MOTO">Moto de Entrega</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Capacidade (ex: 20 Ton)</label>
              <input 
                style={styles.formInput} 
                placeholder="20.000 kg" 
                value={formData.capacity}
                onChange={e => setFormData({...formData, capacity: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" style={styles.saveBtn} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={20} /> : 'Cadastrar na Frota'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  header: { 
    display: 'flex', 
    flexDirection: 'column' as const,
    gap: '24px',
    marginBottom: 'var(--spacing-xl)',
    '@media (min-width: 768px)': {
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      alignItems: 'center',
    }
  },
  title: { fontSize: '28px', fontWeight: '600', color: 'var(--primary)' },
  subtitle: { color: 'var(--text-muted)', fontSize: '14px' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', justifyContent: 'center' },
  
  card: { backgroundColor: 'transparent' },
  filterRow: { 
    display: 'flex', 
    flexDirection: 'column' as const,
    gap: '16px', 
    marginBottom: '24px',
    '@media (min-width: 768px)': {
      flexDirection: 'row' as const,
    }
  },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--bg-card)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  input: { border: 'none', backgroundColor: 'transparent', width: '100%', outline: 'none', fontSize: '14px', color: 'var(--text-main)' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', justifyContent: 'center' },
  
  loaderBox: { padding: '80px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '16px', color: 'var(--text-muted)' },
  emptyBox: { padding: '60px 24px', textAlign: 'center' as const, backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border)', color: 'var(--text-muted)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  vehicleCard: { backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s' },
  iconBox: { width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardHeader: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' },
  modelName: { fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' },
  plateTag: { fontSize: '11px', fontWeight: '600', backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '6px' },
  deleteBtn: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' },
  details: { display: 'flex', flexDirection: 'column' as const, gap: '10px', marginBottom: '20px' },
  detailItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' },
  statusBox: { display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  statusText: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' as const, color: 'var(--text-secondary)' },
  
  form: { display: 'flex', flexDirection: 'column' as const, gap: '16px', padding: '12px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  label: { fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' },
  formInput: { padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', color: 'var(--text-main)' },
  saveBtn: { marginTop: '10px', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '600', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};


export default Vehicles;
