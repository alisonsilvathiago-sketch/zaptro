import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, Building2, Briefcase, DollarSign, CreditCard, Users, 
  Settings, LogOut, Shield, History as HistoryIcon, Activity,
  GraduationCap, Headphones, HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSystemConfig } from '../context/SystemConfigContext';
import { getContext } from '../utils/domains';


// 🎨 ESTILOS NO TOPO PARA PREVENIR FALHA DE CARREGAMENTO
const styles: Record<string, any> = {
  sidebar: {
    height: '100vh',
    backgroundColor: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '20px 0',
    position: 'fixed' as const,
    left: 0, top: 0, zIndex: 1000,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  logoContainer: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '0 20px 24px 20px', cursor: 'pointer',
    minHeight: '60px',
  },
  logoIcon: {
    minWidth: '32px', height: '32px',
    backgroundColor: '#0F172A',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoTextWrapper: { display: 'flex', flexDirection: 'column' as const },
  logoText: { fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', letterSpacing: '-0.5px' },
  logoBadge: { fontSize: '9px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '1px' },
  nav: { display: 'flex', flexDirection: 'column' as const, gap: '2px', flex: 1, padding: '0 10px', overflowY: 'auto' as const },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', transition: 'all 0.2s ease', cursor: 'pointer', position: 'relative' as const, minHeight: '44px' },
  navItemActive: { backgroundColor: 'var(--primary-light)' },
  activeIndicator: { position: 'absolute' as const, right: '0', width: '4px', height: '16px', backgroundColor: 'var(--primary)', borderRadius: '4px 0 0 4px' },
  icon: { display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px' },
  label: { fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' as const },
  footer: { marginTop: 'auto', padding: '16px 10px 0 10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  profileSection: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 8px', marginTop: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '12px' },
  avatar: { width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: 'white' },
  profileInfo: { display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  profileName: { fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap' as const },
  profileRole: { fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700' },
};

interface MasterSidebarProps {
  mode: 'expanded' | 'collapsed' | 'mobile';
  isOpen?: boolean;
  onClose?: () => void;
}

const MasterSidebar: React.FC<MasterSidebarProps> = ({ mode, isOpen, onClose }) => {
  const { signOut, profile } = useAuth();
  const { configs } = useSystemConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [internalHover, setInternalHover] = useState(false);

  const isExpanded = mode === 'expanded' || (mode === 'collapsed' && internalHover) || (mode === 'mobile' && isOpen);
  const isMobile = mode === 'mobile';

  const menuItems = [
    { Icon: BarChart3, label: 'Dashboard Global', path: '/master-admin' },
    { Icon: Building2, label: 'Empresas', path: '/master/empresas' },
    { Icon: Users, label: 'Gestão de Usuários', path: '/master/usuarios' },
    { Icon: Briefcase, label: 'CRM de Expansão', path: '/master/crm' },

    { Icon: DollarSign, label: 'Financeiro Master', path: '/master/financeiro' },
    { Icon: CreditCard, label: 'Planos & Assinaturas', path: '/master/planos' },
    { Icon: Users, label: 'Equipe Interna', path: '/master/equipe' },
    { Icon: Activity, label: 'Performance & Tarefas', path: '/master/performance' },
    { Icon: GraduationCap, label: 'Hub de Educação', path: '/master/configuracoes' },
    { Icon: Shield, label: 'Catálogo de APIs', path: '/master/apis' },
    { Icon: Headphones, label: 'Central de Atendimento', path: '/master/suporte' },
    { Icon: HelpCircle, label: 'Gestão de Ajuda', path: '/master/ajuda' },
    { Icon: Settings, label: 'Configurações', path: '/master/configuracoes' },
  ];

  return (
    <>
      {isMobile && isOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 998 }} />}
      <aside 
        style={{
          ...styles.sidebar,
          width: isExpanded ? 'var(--sidebar-width-expanded)' : (isMobile ? '0' : 'var(--sidebar-width-collapsed)'),
          transform: (isMobile && !isOpen) ? 'translateX(-100%)' : 'translateX(0)',
          visibility: (isMobile && !isOpen) ? 'hidden' : 'visible',
          opacity: (isMobile && !isOpen) ? 0 : 1,
        }}
        onMouseEnter={() => !isMobile && setInternalHover(true)}
        onMouseLeave={() => !isMobile && setInternalHover(false)}
      >
        <div style={{ ...styles.logoContainer }} onClick={() => navigate('/master-admin')}>
          <div style={{ ...styles.logoIcon }}><BarChart3 size={20} color="white" /></div>
          {isExpanded && (
            <div style={styles.logoTextWrapper}>
              <span style={styles.logoText}>{getContext() === 'WHATSAPP' ? 'ZAPTRO MASTER' : 'MASTER CORE'}</span>
              <span style={styles.logoBadge}>{getContext() === 'WHATSAPP' ? 'WHATSAPP AI ECOSYSTEM' : 'CONTROLE TOTAL'}</span>
            </div>
          )}

        </div>
        
        <nav style={styles.nav}>
          {menuItems.map((item, index) => {
            const isActive = location.pathname.startsWith(item.path);
            const color = isActive ? 'var(--primary)' : 'var(--text-secondary)';
            return (
              <div 
                key={index} 
                style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}), justifyContent: isExpanded ? 'flex-start' : 'center' }}
                onClick={() => { navigate(item.path); if (isMobile) onClose?.(); }}
              >
                <span style={{ ...styles.icon, color }}><item.Icon size={20} /></span>
                {isExpanded && <span style={{ ...styles.label, color, fontWeight: isActive ? '700' : '500' }}>{item.label}</span>}
              </div>
            );
          })}
        </nav>

        <div style={styles.footer}>
          <div style={{ ...styles.navItem, justifyContent: isExpanded ? 'flex-start' : 'center', color: '#EF4444' }} onClick={signOut}>
            <LogOut size={20} />
            {isExpanded && <span style={{ marginLeft: '12px' }}>Sair da Admin</span>}
          </div>
        </div>
      </aside>
    </>
  );
};

export default MasterSidebar;
