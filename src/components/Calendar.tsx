import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, MapPin, 
  Clock, Video, User, CheckCircle2, Calendar as CalIcon,
  Search, Filter, MoreHorizontal, Globe, Users, Lock, Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
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
}

const LogtaCalendar: React.FC = () => {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'shared' | 'public'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'reuniao',
    is_public: false,
    is_shared: false
  });

  const fetchEvents = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', profile.company_id);

      if (filter === 'shared') query = query.eq('is_shared', true);
      if (filter === 'public') query = query.eq('is_public', true);

      const { data, error } = await query.order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar eventos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [profile, filter]);

  const handleSaveEvent = async () => {
    if (!profile?.company_id || !profile?.id) {
       toastError('Sessão expirada. Ação bloqueada.');
       return;
    }

    const toastId = toastLoading('Agendando compromisso...');
    try {
      const start_date = `${newEvent.date}T${newEvent.time}:00`;
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{
          id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Math.random().toString(36).substring(2),
          title: newEvent.title,
          description: newEvent.description,
          start_date,
          type: newEvent.type,
          is_public: newEvent.is_public,
          is_shared: newEvent.is_shared,
          user_id: profile.id,
          company_id: profile.company_id
        }])
        .select();

      if (error) throw error;
      
      toastDismiss(toastId);
      toastSuccess('Evento agendado com sucesso!');
      setIsTaskModalOpen(false);
      setNewEvent({ title: '', description: '', date: new Date().toISOString().split('T')[0], time: '09:00', type: 'reuniao', is_public: false, is_shared: false });
      fetchEvents();
    } catch (err: any) {
      toastDismiss(toastId);
      console.error('ERRO CALENDARIO:', err);
      toastError('Erro ao salvar evento: ' + err.message);
    }
  };

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  
  // Função para gerar os dias do mês
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    // Espaços vazios no início
    const firstDay = date.getDay();
    for (let i = 0; i < firstDay; i++) days.push(null);
    // Dias do mês
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const monthDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container} className="animate-fade-in">
       <header style={styles.header}>
          <div style={styles.headerLeft}>
             <h1 style={styles.title}>Calendário de Operações</h1>
             <div style={styles.filterGroup}>
                <button 
                  style={{...styles.filterBtn, ...(filter === 'all' ? styles.filterActive : {})}}
                  onClick={() => setFilter('all')}
                >Todos</button>
                <button 
                  style={{...styles.filterBtn, ...(filter === 'shared' ? styles.filterActive : {})}}
                  onClick={() => setFilter('shared')}
                >Compartilhados</button>
                <button 
                  style={{...styles.filterBtn, ...(filter === 'public' ? styles.filterActive : {})}}
                  onClick={() => setFilter('public')}
                >Públicos</button>
             </div>
          </div>
          <div style={styles.headerRight}>
             <div style={styles.searchWrap}>
                <Search size={16} color="#94a3b8" />
                <input 
                  style={styles.searchInp} 
                  placeholder="Buscar evento..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
       </header>

       <div style={styles.whiteCard}>
          <div style={styles.calNav}>
             <div style={styles.navLeft}>
                <div style={styles.dateBox}>
                   <span style={styles.dateDay}>{currentDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                   <span style={styles.dateNum}>{currentDate.getDate()}</span>
                </div>
                <div>
                   <h2 style={{...styles.monthTitle, textTransform: 'capitalize'}}>{monthName} {year}</h2>
                   <p style={styles.dateRange}>Visualização Mensal</p>
                </div>
             </div>
             <div style={styles.navRight}>
                <div style={styles.arrows}>
                   <button style={styles.arrowBtn} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
                   <button style={styles.todayBtn} onClick={() => setCurrentDate(new Date())}>Hoje</button>
                   <button style={styles.arrowBtn} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
                </div>
                <button style={styles.addBtn} onClick={() => setIsTaskModalOpen(true)}>
                   <Plus size={18} /> Novo Evento
                </button>
             </div>
          </div>

          <div style={styles.grid}>
             {daysOfWeek.map(d => <div key={d} style={styles.weekdayLabel}>{d}</div>)}
             {monthDays.map((date, i) => {
                const isToday = date && date.toDateString() === new Date().toDateString();
                const dayEvents = date ? filteredEvents.filter(e => new Date(e.start_date).toDateString() === date.toDateString()) : [];
                
                return (
                   <div key={i} style={{...styles.dayCell, ...(isToday ? styles.todayCell : {})}}>
                      {date && <span style={{...styles.dayNumber, ...(isToday ? styles.todayNum : {})}}>{date.getDate()}</span>}
                      <div style={styles.eventStack}>
                         {dayEvents.map((t, idx) => (
                            <div key={idx} style={{
                              ...styles.eventChip, 
                              backgroundColor: t.is_public ? '#ecfdf5' : (t.is_shared ? '#f5f3ff' : '#eff6ff'),
                              color: t.is_public ? '#059669' : (t.is_shared ? '#8b5cf6' : '#3b82f6')
                            }}>
                               {t.title}
                            </div>
                         ))}
                      </div>
                   </div>
                );
             })}
          </div>
       </div>

       <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Adicionar Evento / Tarefa">
          <div style={styles.form}>
             <div style={styles.inpGroup}>
                <label>Nome do Evento</label>
                <input 
                  style={styles.inp} 
                  placeholder="Ex: Reunião de Logística..." 
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                />
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.inpGroup}>
                   <label>Data</label>
                   <input 
                    style={styles.inp} 
                    type="date" 
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                   />
                </div>
                <div style={styles.inpGroup}>
                   <label>Horário</label>
                   <input 
                    style={styles.inp} 
                    type="time" 
                    value={newEvent.time}
                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                   />
                </div>
             </div>
             
             <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newEvent.is_shared} onChange={e => setNewEvent({...newEvent, is_shared: e.target.checked})} />
                  <Users size={16} /> Compartilhado
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newEvent.is_public} onChange={e => setNewEvent({...newEvent, is_public: e.target.checked})} />
                  <Globe size={16} /> Público
                </label>
             </div>

             <button style={styles.saveBtn} onClick={handleSaveEvent} disabled={loading || !newEvent.title}>
                <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Evento'}
             </button>
          </div>
       </Modal>
    </div>
  );
};

const styles = {
  container: { padding: '20px', backgroundColor: '#fcfcfc', minHeight: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '40px' },
  title: { fontSize: '24px', fontWeight: '800', color: '#111827' },
  filterGroup: { display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' },
  filterBtn: { padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'none', fontSize: '13px', fontWeight: '600', color: '#64748b', cursor: 'pointer' },
  filterActive: { backgroundColor: 'white', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  headerRight: {},
  searchWrap: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '12px', backgroundColor: 'white' },
  searchInp: { border: 'none', outline: 'none', fontSize: '14px' },
  
  whiteCard: { backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  calNav: { padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  dateBox: { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'center' as const, minWidth: '50px' },
  dateDay: { fontSize: '10px', fontWeight: '800', color: '#94a3b8', display: 'block' },
  dateNum: { fontSize: '18px', fontWeight: '900', color: '#111827' },
  monthTitle: { fontSize: '18px', fontWeight: '800', color: '#111827' },
  dateRange: { fontSize: '13px', color: '#64748b' },
  
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  arrows: { display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' },
  arrowBtn: { padding: '8px', border: 'none', background: 'none', cursor: 'pointer' },
  todayBtn: { padding: '8px 16px', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', background: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  addBtn: { backgroundColor: '#111827', color: 'white', padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', fontWeight: '700', cursor: 'pointer' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#f8fafc' },
  weekdayLabel: { padding: '12px', textAlign: 'center' as const, fontSize: '12px', fontWeight: '700', color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  dayCell: { minHeight: '120px', backgroundColor: 'white', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '8px' },
  dayNumber: { fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', display: 'block' },
  todayCell: { backgroundColor: '#fcfcfc' },
  todayNum: { backgroundColor: '#111827', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  eventStack: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  eventChip: { padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  
  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  inpGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  inp: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' },
  saveBtn: { padding: '14px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
};

export default LogtaCalendar;
