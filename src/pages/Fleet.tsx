import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Truck, Search, Filter, Plus, Shield, 
  Settings, Calendar, MapPin, Download,
  CheckCircle2, AlertCircle, TrendingUp, Activity,
  User, History as HistoryIcon, MoreVertical,
  Wrench, FileText, Fuel, Save, Layout, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import LogtaModal from '../components/Modal';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import ModuleLayout from '../layouts/ModuleLayout';

// --- Types ---
interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: string;
  status: 'OPERACIONAL' | 'MANUTENCAO' | 'QUEBRADO';
  location: string;
}

const Fleet: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'veiculos' | 'motoristas' | 'manutencao' | 'documentacao'>('veiculos');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    model: '',
    type: 'Caminhão',
    status: 'OPERACIONAL' as Vehicle['status'],
    location: 'Base Principal'
  });

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('vehicles').select('*').eq('company_id', profile.company_id);
      setVehicles(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.company_id]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    setLoadingAction(true);
    const toastId = toastLoading('Cadastrando veículo...');

    try {
      const { error } = await supabase
        .from('vehicles')
        .insert([{
          company_id: profile.company_id,
          ...newVehicle
        }]);

      if (error) throw error;

      toastDismiss(toastId);
      toastSuccess('Veículo adicionado com sucesso!');
      setIsCreateModalOpen(false);
      setNewVehicle({
        plate: '', model: '', type: 'Caminhão', status: 'OPERACIONAL', location: 'Base Principal'
      });
      fetchData();
    } catch (err: any) {
      toastDismiss(toastId);
      toastError(`Erro: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const navItems = [
    { id: 'veiculos', label: 'Gestão da Frota', icon: Truck },
    { id: 'motoristas', label: 'Condutores', icon: User },
    { id: 'manutencao', label: 'Oficina / Manutenção', icon: Wrench },
    { id: 'documentacao', label: 'Anexos & Repositório', icon: FileText },
  ];

  const headerActions = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button style={styles.actionBtn} onClick={() => toastSuccess('Exportando Frota...')}>
        <Download size={16} />
        <span>Exportar</span>
      </button>
      <button style={styles.actionBtn} onClick={() => setIsCreateModalOpen(true)}>
        <Plus size={16} />
        <span>Novo Veículo</span>
      </button>
    </div>
  );

  return (
    <ModuleLayout
      title="Frota"
      badge="OPERACIONAL & VEÍCULOS"
      items={navItems}
      activeTab={activeTab}
      onTabChange={(id) => handleTabChange(id as any)}
      actions={headerActions}
    >
      <main>
        {activeTab === 'veiculos' && (
           <div style={styles.tabContent}>
              <div style={styles.kpiGrid}>
                 <div style={styles.kpiCard}>
                   <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Total Frota</p><h2>{vehicles.length}</h2></div>
                   <Truck size={24} color="var(--primary)" />
                 </div>
                 <div style={styles.kpiCard}>
                   <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Em Oficina</p><h2 style={{color:'#ef4444'}}>02</h2></div>
                   <Wrench size={24} color="#ef4444" />
                 </div>
              </div>
              <div style={styles.actionBar}><button style={styles.btnPrimary} onClick={() => setIsCreateModalOpen(true)}><Plus size={18} /> Novo Veículo</button></div>
              <div style={styles.tableCard}>
                 <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Modelo / Placa</th><th style={styles.th}>Tipo</th><th style={styles.th}>KM</th><th style={styles.th}>Status</th><th style={styles.th}>Ações</th></tr></thead>
                    <tbody>
                       {vehicles.map(v => (
                         <tr key={v.id}>
                            <td style={styles.td}><strong>{v.model}</strong><br/><span style={{fontSize:'12px', color:'#64748b'}}>{v.plate}</span></td>
                            <td style={styles.td}>{v.type}</td>
                            <td style={styles.td}>124.500 km</td>
                            <td style={styles.td}><span style={{...styles.statusBadge, ...(v.status === 'OPERACIONAL' ? {backgroundColor:'#ecfdf5', color:'#10b981'} : {backgroundColor:'#fef2f2', color:'#ef4444'})}}>{v.status}</span></td>
                            <td style={styles.td}><button style={styles.iconBtnTable} onClick={() => { setSelectedVehicle(v); setIsDetailModalOpen(true); }}><Eye size={16} /></button></td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'motoristas' && (
           <div style={{padding:'40px', textAlign:'center'}}>
              <User size={64} color="#e2e8f0" style={{marginBottom:'24px'}} />
              <h2>Gestão de Condutores Integrada ao RH</h2>
           </div>
        )}
      </main>

      <LogtaModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Cadastrar Novo Veículo" width="600px">
        <form onSubmit={handleCreateVehicle} style={{padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
            <div style={styles.inputGroup}>
              <label style={styles.labelSimple}>Placa</label>
              <input 
                style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0'}} 
                placeholder="ABC-1234" 
                required
                value={newVehicle.plate}
                onChange={e => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.labelSimple}>Modelo / Marca</label>
              <input 
                style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0'}} 
                placeholder="Ex: Volvo FH 540" 
                required
                value={newVehicle.model}
                onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
            <div style={styles.inputGroup}>
              <label style={styles.labelSimple}>Tipo</label>
              <select 
                style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white'}} 
                value={newVehicle.type}
                onChange={e => setNewVehicle({...newVehicle, type: e.target.value})}
              >
                <option>Caminhão</option>
                <option>Van / Utilitário</option>
                <option>Carreta</option>
                <option>Carro Leve</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.labelSimple}>Status Inicial</label>
              <select 
                style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white'}} 
                value={newVehicle.status}
                onChange={e => setNewVehicle({...newVehicle, status: e.target.value as any})}
              >
                <option value="OPERACIONAL">Operacional</option>
                <option value="MANUTENCAO">Em Manutenção</option>
                <option value="QUEBRADO">Avariado / Quebrado</option>
              </select>
            </div>
          </div>

          <button type="submit" style={{...styles.btnPrimary, height: '56px', marginTop: '10px', justifyContent: 'center'}} disabled={loadingAction}>
            {loadingAction ? 'Salvando...' : 'Confirmar Cadastro'}
          </button>
        </form>
      </LogtaModal>

      <LogtaModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Ficha Técnica do Veículo" width="800px">
         {selectedVehicle && (
            <div style={{padding: '24px'}}>
               <div style={{display:'flex', gap:'20px', alignItems:'center', marginBottom:'32px'}}>
                  <div style={{width:'64px', height:'64px', backgroundColor:'var(--primary-light)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}><Truck size={32} color="var(--primary)" /></div>
                  <div><h2 style={{margin:0}}>{selectedVehicle.model}</h2><p style={{margin:0, color:'#64748b'}}>Placa: {selectedVehicle.plate}</p></div>
               </div>
               <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                  <div><label style={styles.labelSimple}>Localização Atual</label><strong>{selectedVehicle.location || 'Base Principal'}</strong></div>
                  <div><label style={styles.labelSimple}>Status Operacional</label><strong>{selectedVehicle.status}</strong></div>
               </div>
               <div style={{marginTop:'32px'}}>
                  <button style={styles.btnPrimary} onClick={() => toastSuccess('Checklist aberto!')}>Realizar Checklist</button>
               </div>
            </div>
         )}
      </LogtaModal>
    </ModuleLayout>
  );
};

const styles: Record<string, any> = {
  tabContent: { display: 'flex', flexDirection: 'column', gap: '24px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' },
  kpiCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  kpiInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  kpiLabel: { fontSize: '12px', fontWeight: '700', color: '#94a3b8', margin: 0 },
  tableCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e8e8e8' },
  td: { padding: '16px 24px', fontSize: '14px', borderBottom: '1px solid #e8e8e8', color: '#475569' },
  btnPrimary: { padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  actionBar: { display: 'flex', justifyContent: 'flex-end' },
  iconBtnTable: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#f4f4f4', cursor: 'pointer', color: '#64748B' },
  statusBadge: { padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '800' },
  labelSimple: { fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }
};

export default Fleet;
