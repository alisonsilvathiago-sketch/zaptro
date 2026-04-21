import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, MapPin, 
  Clock, Video, User, CheckCircle2, Calendar as CalIcon,
  Search, Filter, MoreHorizontal, Globe, Users, Lock, Save, AtSign, FilterX
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  type: string;
  is_public: boolean;
  is_shared: boolean;
  user_id: string;
  company_id: string;
  created_at: string;
  user_name?: string;
  user_color?: string;
}

interface Collaborator {
  id: string;
  full_name: string;
  role: string;
  color: string;
}

const AdmAgenda: React.FC = () => {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('all');

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'tarefa',
    is_public: false,
    is_shared: true,
    target_user_id: ''
  });

  const fetchCollaborators = useCallback(async () => {
    if (!profile?.company_id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('company_id', profile.company_id);

      if (error) throw error;

      // Atribuir cores fixas por colaborador para a agenda
      const colors = ['#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#6366F1', '#8B5CF6'];
      const mapped = (data || []).map((c, i) => ({
        ...c,
        color: colors[i % colors.length]
      }));
      setCollaborators(mapped);
    } catch (err) {
      console.error('Erro ao buscar colaboradores:', err);
    }
  }, [profile?.company_id]);

  const fetchEvents = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      // O Admin vê TODOS os eventos da empresa
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar eventos:', err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchCollaborators();
    fetchEvents();
  }, [fetchCollaborators, fetchEvents]);

  const handleSaveEvent = async () => {
    if (!profile?.company_id) return;
    
    // Suporte a menção com @ (Simulado para o sistema de notificação)
    const hasMention = newEvent.title.includes('@') || newEvent.description.includes('@');
    
    const toastId = toastLoading('Sincronizando agenda...');
    try {
      const start_date = `${newEvent.date}T${newEvent.time}:00`;
      const { error } = await supabase
        .from('calendar_events')
        .insert([{
          id: crypto.randomUUID(),
          title: newEvent.title,
          description: newEvent.description,
          start_date,
          type: newEvent.type,
          is_public: newEvent.is_public,
          is_shared: newEvent.is_shared,
          user_id: newEvent.target_user_id || profile.id,
          company_id: profile.company_id
        }]);

      if (error) throw error;
      
      if (hasMention) {
        // Lógica de notificação seria aqui
        console.log('Notificação disparada para menção @');
      }

      toastDismiss(toastId);
      toastSuccess('Tarefa agendada e vinculada!');
      setIsTaskModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      toastDismiss(toastId);
      toastError('Erro ao agendar: ' + err.message);
    }
  };

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDay = date.getDay();
    for (let i = 0; i < firstDay; i++) days.push(null);
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const monthDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });

  const filteredEvents = events.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCollab = selectedCollaborator === 'all' || e.user_id === selectedCollaborator;
    return matchSearch && matchCollab;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Agenda Corporativa</h1>
          <p style={styles.subtitle}>Visão mestre de tarefas e compromissos da equipe.</p>
        </div>
        
        <div style={styles.headerRight}>
           <div style={styles.collabFilter}>
              <Filter size={16} color="var(--text-muted)" />
              <select 
                style={styles.select}
                value={selectedCollaborator}
                onChange={(e) => setSelectedCollaborator(e.target.value)}
              >
                <option value="all">Todos os Colaboradores</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
           </div>
           <button style={styles.addBtn} onClick={() => setIsTaskModalOpen(true)}>
             <Plus size={18} /> Nova Tarefa
           </button>
        </div>
      </header>

      <div style={styles.calendarCard}>
        <div style={styles.calHeader}>
           <div style={styles.monthNav}>
              <button style={styles.navBtn} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                <ChevronLeft size={20} />
              </button>
              <h2 style={styles.monthTitle}>{monthName} {currentDate.getFullYear()}</h2>
              <button style={styles.navBtn} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                <ChevronRight size={20} />
              </button>
           </div>
           
           <div style={styles.searchBox}>
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Filtrar tarefas..." 
                style={styles.searchInp}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <div style={styles.grid}>
          {daysOfWeek.map(d => <div key={d} style={styles.weekday}>{d}</div>)}
          {monthDays.map((date, i) => {
            const isToday = date && date.toDateString() === new Date().toDateString();
            const dayEvents = date ? filteredEvents.filter(e => new Date(e.start_date).toDateString() === date.toDateString()) : [];
            
            return (
              <div key={i} style={{...styles.day, ...(isToday ? styles.today : {})}}>
                {date && <span style={styles.dayNum}>{date.getDate()}</span>}
                <div style={styles.eventList}>
                  {dayEvents.map(e => {
                    const collab = collaborators.find(c => c.id === e.user_id);
                    return (
                      <div 
                        key={e.id} 
                        style={{
                          ...styles.event, 
                          borderLeft: `3px solid ${collab?.color || 'var(--primary)'}`,
                          backgroundColor: collab?.color ? `${collab.color}15` : 'var(--primary-light)'
                        }}
                        title={`${e.title} - por ${collab?.full_name || 'Desconhecido'}`}
                      >
                        {e.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Agendar Nova Tarefa">
        <div style={styles.modalForm}>
           <div style={styles.formGroup}>
              <label style={styles.label}>Título / Tarefa (Use @ para mencionar)</label>
              <input 
                style={styles.input} 
                placeholder="Ex: Revisar rota do @Ricardo"
                value={newEvent.title}
                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
              />
           </div>
           
           <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Data</label>
                <input 
                  type="date" 
                  style={styles.input}
                  value={newEvent.date}
                  onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Responsável</label>
                <select 
                  style={styles.input}
                  value={newEvent.target_user_id}
                  onChange={e => setNewEvent({...newEvent, target_user_id: e.target.value})}
                >
                  <option value="">Apenas eu</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
           </div>

           <div style={styles.formGroup}>
              <label style={styles.label}>Descrição Detalhada</label>
              <textarea 
                style={{...styles.input, minHeight: '80px'}}
                placeholder="Detalhes adicionais da tarefa..."
                value={newEvent.description}
                onChange={e => setNewEvent({...newEvent, description: e.target.value})}
              />
           </div>

           <button style={styles.saveBtn} onClick={handleSaveEvent}>
              <Save size={18} /> Agendar Tarefa
           </button>
        </div>
      </Modal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '32px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-1px' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)' },
  headerRight: { display: 'flex', gap: '16px', alignItems: 'center' },
  collabFilter: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-card)', padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--border)' },
  select: { border: 'none', background: 'none', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', outline: 'none' },
  addBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: 'var(--shadow-md)' },
  
  calendarCard: { backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  calHeader: { padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '16px' },
  navBtn: { width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' },
  monthTitle: { fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'capitalize' },
  
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--bg-app)', padding: '8px 16px', borderRadius: '12px', width: '250px', border: '1px solid var(--border)' },
  searchInp: { border: 'none', background: 'none', outline: 'none', fontSize: '13px', color: 'var(--text-main)' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
  weekday: { padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)' },
  day: { minHeight: '140px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '10px', transition: 'background 0.2s' },
  dayNum: { fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' },
  today: { backgroundColor: 'var(--primary-light)' },
  eventList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  event: { padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' },

  modalForm: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  label: { fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' },
  input: { padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', backgroundColor: 'var(--bg-app)' },
  saveBtn: { padding: '14px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
};

export default AdmAgenda;
