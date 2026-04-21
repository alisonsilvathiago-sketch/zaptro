import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Book, GraduationCap, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AcademyLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      {/* Academy Header */}
      <header style={styles.header}>
        <div style={styles.navLeft} onClick={() => navigate('/')}>
          <div style={styles.logoIcon}><GraduationCap size={24} color="white" /></div>
          <div style={styles.logoText}>
             <span style={styles.logoMain}>LOGTA</span>
             <span style={styles.logoSub}>ACADEMY</span>
          </div>
        </div>

        <nav style={styles.navCenter}>
           <button style={styles.navLinkActive}><Book size={18} /> Meus Cursos</button>
           <button style={styles.navLink}><Bell size={18} /> Notificações</button>
        </nav>

        <div style={styles.navRight}>
           <div style={styles.userProfile}>
              <div style={styles.userInfo}>
                 <p style={styles.userName}>{profile?.full_name?.split(' ')[0] || 'Aluno'}</p>
                 <span style={styles.userBadge}>Bronze Member</span>
              </div>
              <div style={styles.avatar}>{profile?.full_name?.[0] || 'A'}</div>
           </div>
           <button style={styles.logoutBtn} onClick={signOut} title="Sair da Academy">
              <LogOut size={18} />
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.main}>
         <div style={styles.contentWrapper}>
            {children}
         </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
         <p>© 2026 Logta Academy • Tecnologia para o Transporte</p>
         <div style={styles.footerLinks}>
            <span>Termos de Uso</span>
            <span>Suporte</span>
         </div>
      </footer>
    </div>
  );
};

const styles = {
  container: { 
    display: 'flex', 
    flexDirection: 'column' as const, 
    minHeight: '100vh', 
    backgroundColor: '#f8fafc' 
  },
  header: {
    height: '80px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' },
  logoIcon: { 
    width: '40px', height: '40px', 
    backgroundColor: '#1e293b', 
    borderRadius: '12px', 
    display: 'flex', alignItems: 'center', justifyContent: 'center' 
  },
  logoText: { display: 'flex', flexDirection: 'column' as const },
  logoMain: { fontSize: '18px', fontWeight: '950', color: '#1e293b', letterSpacing: '-0.5px' },
  logoSub: { fontSize: '10px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '1.5px' },
  
  navCenter: { display: 'flex', gap: '8px' },
  navLink: { 
    display: 'flex', alignItems: 'center', gap: '8px', 
    padding: '10px 20px', borderRadius: '14px', border: 'none', 
    backgroundColor: 'transparent', color: '#64748b', 
    fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' 
  },
  navLinkActive: { 
    display: 'flex', alignItems: 'center', gap: '8px', 
    padding: '10px 20px', borderRadius: '14px', border: 'none', 
    backgroundColor: '#f1f5f9', color: '#1e293b', 
    fontWeight: '700', cursor: 'pointer' 
  },

  navRight: { display: 'flex', alignItems: 'center', gap: '20px' },
  userProfile: { display: 'flex', alignItems: 'center', gap: '12px' },
  userInfo: { textAlign: 'right' as const },
  userName: { fontSize: '14px', fontWeight: '800', color: '#1e293b', margin: 0 },
  userBadge: { fontSize: '10px', fontWeight: '700', color: '#94a3b8' },
  avatar: { 
    width: '38px', height: '38px', borderRadius: '12px', 
    backgroundColor: '#f1f5f9', border: '2px solid white', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '800', color: '#1e293b'
  },
  logoutBtn: { 
    padding: '10px', borderRadius: '12px', border: '1px solid #f1f5f9', 
    backgroundColor: 'white', color: '#ef4444', cursor: 'pointer',
    transition: 'all 0.2s'
  },

  main: { flex: 1, padding: '40px 0' },
  contentWrapper: { maxWidth: '1200px', margin: '0 auto', padding: '0 40px' },

  footer: { 
    padding: '40px', backgroundColor: '#ffffff', 
    borderTop: '1px solid #e2e8f0', display: 'flex', 
    justifyContent: 'space-between', alignItems: 'center',
    color: '#94a3b8', fontSize: '12px', fontWeight: '600'
  },
  footerLinks: { display: 'flex', gap: '24px' }
};

export default AcademyLayout;
