import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Info, AlertTriangle, Ship, DollarSign, MapPin } from 'lucide-react';
import { useRealtime } from '../hooks/useRealtime';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: 'SYSTEM' | 'MANUAL' | 'FINANCIAL' | 'CRM' | 'LOGISTICS' | 'API';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  metadata?: any;
}

const NotificationCenter: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!profile?.company_id) return;
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setNotifications(data);
    };

    fetchNotifications();
  }, [profile?.company_id]);

  // Monitorar NOVAS NOTIFICAÇÕES (Centralizadas no Banco)
  useRealtime('notifications' as any, profile?.company_id, (payload) => {
    if (payload.eventType === 'INSERT') {
      setNotifications(prev => [payload.new, ...prev].slice(0, 20));
      // Tocar som se for alta prioridade (opcional)
      if (['HIGH', 'CRITICAL'].includes(payload.new.priority)) {
        console.log('Alerta Crítico Recebido:', payload.new.title);
      }
    }
  });

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.is_read).length);
  }, [notifications]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f59e0b';
      case 'MEDIUM': return '#3b82f6';
      default: return '#10b981';
    }
  };

  return (
    <div style={styles.container}>
      <button style={styles.bellBtn} onClick={() => setIsOpen(!isOpen)}>
        <Bell size={22} color={isOpen ? 'var(--primary)' : 'var(--text-secondary)'} />
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div style={styles.popover}>
          <div style={styles.popHeader}>
            <div style={styles.popTitleRow}>
               <h3 style={styles.popTitle}>Logta Brain Alerts</h3>
               <span style={styles.unreadTag}>{unreadCount} novas</span>
            </div>
            <button style={styles.closeBtn} onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>
          
          <div style={styles.notifList}>
            {notifications.length === 0 ? (
              <div style={styles.emptyWrap}>
                 <Bell size={40} color="var(--border)" />
                 <p style={styles.emptyText}>Sua central está limpa.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  style={{ ...styles.notifItem, opacity: n.is_read ? 0.6 : 1, borderLeft: `4px solid ${getPriorityColor(n.priority)}` }} 
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.metadata?.path) {
                      window.location.href = n.metadata.path;
                    }
                  }}
                >
                   <div style={styles.notifContent}>
                      <div style={styles.notifHeader}>
                         <span style={{...styles.notifType, color: getPriorityColor(n.priority)}}>{n.type}</span>
                         <span style={styles.notifTime}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p style={styles.notifTitle}>{n.title}</p>
                      <p style={styles.notifMsg}>{n.message}</p>
                   </div>
                </div>
              ))
            )}
          </div>
          <div style={styles.popFooter}>
             <button style={styles.clearBtn}>Ver histórico completo</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { position: 'relative' as const },
  bellBtn: { background: 'transparent', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', position: 'relative' as const, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute' as const, top: '4px', right: '4px', backgroundColor: '#ef4444', color: 'white', fontSize: '10px', fontWeight: '800', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' },
  popover: { position: 'absolute' as const, top: '48px', right: '-10px', width: '340px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-premium)', overflow: 'hidden', zIndex: 1000 },
  popHeader: { padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  popTitleRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  popTitle: { fontSize: '15px', fontWeight: '950', color: 'var(--primary)', margin: 0, letterSpacing: '-0.5px' },
  unreadTag: { fontSize: '10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: '800' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
  notifList: { maxHeight: '420px', overflowY: 'auto' as const, padding: '12px' },
  emptyWrap: { textAlign: 'center' as const, padding: '60px 40px' },
  emptyText: { marginTop: '16px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' },
  notifItem: { display: 'flex', gap: '16px', padding: '16px', borderRadius: '14px', cursor: 'pointer', marginBottom: '8px', backgroundColor: '#fcfcfd', transition: 'all 0.2s' },
  notifContent: { flex: 1 },
  notifHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  notifType: { fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px' },
  notifTitle: { fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' },
  notifMsg: { fontSize: '12px', color: '#64748b', lineHeight: '1.5' },
  notifTime: { fontSize: '10px', color: '#94a3b8', fontWeight: '600' },
  popFooter: { padding: '12px', borderTop: '1px solid var(--border)', backgroundColor: '#f8fafc', textAlign: 'center' as const },
  clearBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }
};

export default NotificationCenter;
