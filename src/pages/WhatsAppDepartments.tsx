import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, CheckCircle, 
  Settings, MessageSquare, Save, X 
} from 'lucide-react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { getContext } from '../utils/domains';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';

interface WhatsAppDepartmentsProps {
  hideLayout?: boolean;
}

const WhatsAppDepartments: React.FC<WhatsAppDepartmentsProps> = ({ hideLayout = false }) => {
  const context = getContext();
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingDept, setSavingDept] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDepartments = async () => {
    if (!profile?.company_id) {
      setDepartments([]);
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    const { data, error } = await supabaseZaptro
      .from('whatsapp_departments')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true });
    if (error) {
      notifyZaptro(
        'error',
        'Não foi possível carregar os setores',
        error.message || 'Faça login em /login e abra esta página de novo.'
      );
      setDepartments([]);
    } else {
      setDepartments(data || []);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    void fetchDepartments();
  }, [profile?.company_id]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      notifyZaptro('warning', 'Campo obrigatório', 'Digite o nome do setor (ex.: Comercial, Suporte) antes de salvar.');
      return;
    }
    if (!profile?.company_id) {
      notifyZaptro(
        'warning',
        'Sessão incompleta',
        'Faça login com sua conta Zaptro. Sem empresa vinculada não é possível criar setores.'
      );
      return;
    }
    setSavingDept(true);
    try {
      const { error } = await supabaseZaptro.from('whatsapp_departments').insert({
        name: newName.trim(),
        company_id: profile.company_id,
        menu_key: (departments.length + 1).toString(),
      });
      if (error) throw error;

      notifyZaptro('success', 'Setor criado', `“${newName.trim()}” já aparece no menu do robô.`);

      setNewName('');
      setIsAdding(false);
      await fetchDepartments();
    } catch (err: any) {
      notifyZaptro(
        'error',
        'Não foi possível salvar',
        err.message || 'Tente novamente. Se o erro continuar, confira permissões no Supabase.'
      );
    } finally {
      setSavingDept(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este setor? O Chatbot não oferecerá mais essa opção.')) return;
    setDeletingId(id);
    try {
      const { error } = await supabaseZaptro.from('whatsapp_departments').delete().eq('id', id);
      if (error) throw error;
      notifyZaptro('success', 'Setor removido', 'A opção saiu do menu automático.');
      await fetchDepartments();
    } catch (err: any) {
      notifyZaptro('error', 'Erro ao excluir', err.message || 'Não foi possível remover este setor.');
    } finally {
      setDeletingId(null);
    }
  };

  const content = (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Departamentos & Chatbot</h1>
          <p style={styles.subtitle}>Configure os setores disponíveis no menu automático do seu WhatsApp.</p>
        </div>
        <button type="button" style={styles.addBtn} onClick={() => setIsAdding(true)} disabled={loadingList}>
          <Plus size={20} /> CRIAR NOVO SETOR
        </button>
      </header>

      <div style={styles.grid}>
        {/* Card de Edição/Criação */}
        {isAdding && (
          <div style={styles.cardEdit}>
            <div style={styles.cardHeader}>
               <div style={styles.iconCircle}><Settings size={20} color="#D9FF00" /></div>
               <h3 style={styles.cardTitle}>Configurar Novo Setor</h3>
            </div>
            <div style={styles.form}>
               <label style={styles.label}>NOME DO DEPARTAMENTO</label>
               <input 
                 style={styles.input} 
                 placeholder="Ex: Comercial, Suporte, Logística..." 
                 value={newName}
                 onChange={e => setNewName(e.target.value)}
                 autoFocus
               />
               <p style={styles.hint}>Este nome aparecerá como opção no menu do WhatsApp para o seu cliente.</p>
               <div style={styles.formActions}>
                  <button type="button" style={styles.cancelBtn} disabled={savingDept} onClick={() => setIsAdding(false)}>
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.saveBtn, opacity: savingDept ? 0.85 : 1 }}
                    disabled={savingDept}
                    onClick={() => void handleAdd()}
                  >
                    {savingDept ? 'SALVANDO...' : 'SALVAR SETOR'}
                  </button>
               </div>
            </div>
          </div>
        )}

        {loadingList ? (
          <div style={styles.empty}>
            <p style={{ margin: 0, fontWeight: 600, color: '#000' }}>Carregando setores...</p>
          </div>
        ) : (
          <>
            {departments.map((dept, idx) => (
              <div key={dept.id} style={styles.card}>
                <div style={styles.badge}>OPÇÃO {dept.menu_key || idx + 1}</div>
                <div style={styles.cardContent}>
                  <div style={styles.iconBox}>
                    <MessageSquare size={24} color="#000" />
                  </div>
                  <div>
                    <h3 style={styles.cardTitle}>{dept.name}</h3>
                    <p style={styles.cardSubtitle}>ATENDIMENTO ATIVO</p>
                  </div>
                </div>
                <div style={styles.cardFooter}>
                  <button
                    type="button"
                    style={{ ...styles.iconBtn, opacity: deletingId === dept.id ? 0.6 : 1 }}
                    disabled={deletingId !== null}
                    onClick={() => void handleDelete(dept.id)}
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button type="button" style={styles.iconBtn} title="Em breve" onClick={() => notifyZaptro('info', 'Edição de setor', 'Em breve você poderá renomear aqui. Por enquanto, exclua e crie de novo com o nome certo.')}>
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            {departments.length === 0 && !isAdding && (
              <div style={styles.empty}>
                <h4 style={{ margin: 0, color: '#000' }}>Menu do Chatbot vazio</h4>
                <p>Toque em “Criar novo setor” acima e preencha o nome para o cliente ver no WhatsApp.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (context === 'WHATSAPP' && !hideLayout) {
    return <ZaptroLayout>{content}</ZaptroLayout>;
  }

  return content;
};

const styles: Record<string, any> = {
  container: { backgroundColor: '#FFFFFF' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' },
  title: { fontSize: '32px', fontWeight: '700', color: '#000', margin: 0, letterSpacing: '-1.5px' },
  subtitle: { color: '#94A3B8', fontSize: '15px', marginTop: '6px', fontWeight: '500' },
  addBtn: { backgroundColor: '#000', color: '#FFF', border: 'none', padding: '16px 28px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', cursor: 'pointer' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  card: { backgroundColor: 'white', borderRadius: '32px', border: '1.5px solid #e8e8e8', padding: '30px', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' },
  cardEdit: { backgroundColor: '#FFFFFF', borderRadius: '32px', border: '2.5px solid #000', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)' },
  badge: { position: 'absolute', top: '30px', right: '30px', backgroundColor: '#EEFCEF', color: '#10B981', padding: '6px 14px', borderRadius: '14px', fontSize: '11px', fontWeight: '700' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '25px' },
  iconCircle: { width: '42px', height: '42px', backgroundColor: '#000', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#FBFBFC', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: '20px', fontWeight: '700', margin: 0, color: '#000' },
  cardSubtitle: { fontSize: '11px', color: '#10B981', fontWeight: '700', margin: '4px 0 0 0' },
  cardFooter: { display: 'flex', gap: '12px', borderTop: '1px solid #EBEBEC', paddingTop: '20px' },
  iconBtn: { background: 'none', border: '1px solid #EBEBEC', color: '#000000', cursor: 'pointer', padding: '10px', borderRadius: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  label: { fontSize: '11px', fontWeight: '700', color: '#000000' },
  input: { padding: '16px 20px', borderRadius: '18px', border: '1px solid #EBEBEC', fontSize: '15px', fontWeight: '600', outline: 'none', backgroundColor: '#FBFBFC' },
  hint: { fontSize: '12px', color: '#94A3B8', margin: 0, fontWeight: '500', lineHeight: '1.4' },
  formActions: { display: 'flex', gap: '15px', marginTop: '10px' },
  saveBtn: { flex: 1, backgroundColor: '#000', color: '#D9FF00', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '700', cursor: 'pointer' },
  cancelBtn: { padding: '18px 24px', backgroundColor: '#ebebeb', border: 'none', borderRadius: '18px', fontWeight: '700', color: '#64748B', cursor: 'pointer' },
  empty: { gridColumn: '1 / -1', padding: '80px', textAlign: 'center', backgroundColor: '#FBFBFC', borderRadius: '40px', color: '#94A3B8', fontWeight: '600' }
};

export default WhatsAppDepartments;
