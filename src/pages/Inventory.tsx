import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Package, Search, Plus, Download, Box, Activity, History as HistoryIcon,
  User, TrendingUp, AlertCircle, MapPin, Save, Edit2, 
  Trash2, QrCode as QrCodeIcon, ArrowUpRight, ArrowDownRight,
  FileText, Calendar, Filter as FilterIcon, Search as SearchIcon, Eye, Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import LogtaModal from '../components/Modal';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import ModuleLayout from '../layouts/ModuleLayout';

// --- Types ---
interface StockItem {
  id: string;
  sku: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  location: string;
}

const Inventory: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'inteligencia' | 'estoque' | 'movimentacoes' | 'relatorios' | 'dashboard'>('inteligencia');
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [newItem, setNewItem] = useState({
    sku: '',
    name: '',
    category: 'Geral',
    quantity: '',
    unit: 'UN',
    location: 'Almoxarifado A'
  });

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('inventory_items').select('*').eq('company_id', profile.company_id);
      setItems(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.company_id]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    setLoadingAction(true);
    const toastId = toastLoading('Cadastrando item...');

    try {
      const { error } = await supabase
        .from('inventory_items')
        .insert([{
          company_id: profile.company_id,
          ...newItem,
          quantity: parseInt(newItem.quantity) || 0
        }]);

      if (error) throw error;

      toastDismiss(toastId);
      toastSuccess('Item adicionado ao estoque!');
      setIsCreateModalOpen(false);
      setNewItem({
        sku: '', name: '', category: 'Geral', quantity: '', unit: 'UN', location: 'Almoxarifado A'
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
    { id: 'inteligencia', label: 'Centro de Inteligência Estoque', icon: Target },
    { id: 'estoque', label: 'Produtos em Estoque', icon: Box },
    { id: 'movimentacoes', label: 'Log de Operações', icon: HistoryIcon },
    { id: 'relatorios', label: 'Status & Posição', icon: Activity },
  ];

  return (
    <ModuleLayout
      title="Almoxarifado"
      badge="ESTOQUE PERMANENTE"
      items={navItems}
      activeTab={activeTab}
      onTabChange={(id) => handleTabChange(id as any)}
    >
      <main>
        {activeTab === 'dashboard' && (
           <div style={styles.tabContent}>
              <div style={styles.kpiGrid}>
                 <div style={styles.kpiCard}>
                   <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Total Itens</p><h2>{items.length}</h2></div>
                   <Box size={24} color="var(--primary)" />
                 </div>
                 <div style={styles.kpiCard}>
                   <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Estoque Baixo</p><h2 style={{color:'#ef4444'}}>04</h2></div>
                   <AlertCircle size={24} color="#ef4444" />
                 </div>
              </div>
              <div style={styles.chartCard}><div style={styles.cardHeader}><h3>Movimentação Semanal</h3></div><div style={{padding:'24px', height:'300px', backgroundColor:'#f4f4f4', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8'}}>Gráfico de Movimentação</div></div>
           </div>
        )}

        {activeTab === 'estoque' && (
           <div style={styles.tabContent}>
              <div style={styles.actionBar}><button style={styles.btnPrimary} onClick={() => setIsCreateModalOpen(true)}><Plus size={18} /> Novo Item</button></div>
              <div style={styles.tableCard}>
                 <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Produto</th><th style={styles.th}>SKU</th><th style={styles.th}>Qtd</th><th style={styles.th}>Local</th><th style={styles.th}>Ações</th></tr></thead>
                    <tbody>
                       {items.map(item => (
                         <tr key={item.id}>
                            <td style={styles.td}><strong>{item.name}</strong></td>
                            <td style={styles.td}>{item.sku}</td>
                            <td style={styles.td}>{item.quantity} {item.unit}</td>
                            <td style={styles.td}>{item.location}</td>
                            <td style={styles.td}><button style={styles.iconBtnTable} onClick={() => { setSelectedItem(item); setIsDetailModalOpen(true); }}><Eye size={16} /></button></td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </main>

      <LogtaModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Novo Item no Estoque" width="600px">
        <form onSubmit={handleCreateItem} style={{padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div style={styles.inputGroup}>
            <label style={styles.labelSimple}>Nome do Produto</label>
            <input 
              style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0'}} 
              placeholder="Ex: Pneu Aro 22.5" 
              required
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
            />
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
            <div style={styles.inputGroup}>
              <label style={styles.labelSimple}>SKU / Código</label>
              <input 
                style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0'}} 
                placeholder="PNEU-225-MT" 
                value={newItem.sku}
                onChange={e => setNewItem({...newItem, sku: e.target.value})}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.labelSimple}>Categoria</label>
              <select 
                style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white'}} 
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
              >
                <option>Geral</option>
                <option>Peças</option>
                <option>EPI</option>
                <option>Ferramentas</option>
                <option>Insumos</option>
              </select>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px'}}>
            <div style={styles.inputGroup}>
              <label style={styles.labelSimple}>Quantidade</label>
              <input 
                type="number"
                style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0'}} 
                placeholder="0" 
                required
                value={newItem.quantity}
                onChange={e => setNewItem({...newItem, quantity: e.target.value})}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.labelSimple}>Unidade</label>
              <input 
                style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0'}} 
                placeholder="UN, KG, LT" 
                value={newItem.unit}
                onChange={e => setNewItem({...newItem, unit: e.target.value.toUpperCase()})}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.labelSimple}>Localização</label>
              <input 
                style={{...styles.td, width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0'}} 
                placeholder="Ex: Prateleira B1" 
                value={newItem.location}
                onChange={e => setNewItem({...newItem, location: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" style={{...styles.btnPrimary, height: '56px', marginTop: '10px', justifyContent: 'center'}} disabled={loadingAction}>
            {loadingAction ? 'Salvando...' : 'Cadastrar Produto'}
          </button>
        </form>
      </LogtaModal>

      <LogtaModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Ficha do Produto" width="800px">
         {selectedItem && (
            <div style={{padding: '24px'}}>
               <div style={{display:'flex', gap:'20px', alignItems:'center', marginBottom:'32px'}}>
                  <div style={{width:'64px', height:'64px', backgroundColor:'var(--primary-light)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center'}}><Package size={32} color="var(--primary)" /></div>
                  <div><h2 style={{margin:0}}>{selectedItem.name}</h2><p style={{margin:0, color:'#64748b'}}>SKU: {selectedItem.sku}</p></div>
               </div>
               <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                  <div><label style={styles.labelSimple}>Quantidade Atual</label><strong>{selectedItem.quantity} {selectedItem.unit}</strong></div>
                  <div><label style={styles.labelSimple}>Localização</label><strong>{selectedItem.location}</strong></div>
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
  chartCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  cardHeader: { padding: '20px 24px', borderBottom: '1px solid #e8e8e8' },
  actionBar: { display: 'flex', justifyContent: 'flex-end' },
  btnPrimary: { padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  tableCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e8e8e8' },
  td: { padding: '16px 24px', fontSize: '14px', borderBottom: '1px solid #e8e8e8', color: '#475569' },
  iconBtnTable: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#f4f4f4', cursor: 'pointer', color: '#64748B' },
  labelSimple: { fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }
};

export default Inventory;
