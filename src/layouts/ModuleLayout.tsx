import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ModuleNavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string | number;
}

interface ModuleLayoutProps {
  title: string;
  badge?: string;
  items: ModuleNavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
}

const ModuleLayout: React.FC<ModuleLayoutProps> = ({ 
  title, 
  badge, 
  items, 
  activeTab, 
  onTabChange, 
  children 
}) => {
  return (
    <div style={styles.container}>
      {/* Header Premium com Navegação Alinhada à Direita */}
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          {badge && <div style={styles.headerBadge}>{badge}</div>}
          <h1 style={styles.title}>{title}</h1>
        </div>

        <nav style={styles.topNav}>
          {items.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
                onClick={() => onTabChange(item.id)}
                title={item.label}
              >
                <div style={{
                  ...styles.iconWrapper,
                  color: isActive ? 'var(--primary)' : '#64748b',
                }}>
                  <item.icon size={20} />
                </div>
                {isActive && (
                  <span style={styles.navLabel}>
                    {item.label}
                  </span>
                )}
                {item.badge && (
                  <span style={styles.itemBadge}>{item.badge}</span>
                )}
              </div>
            );
          })}
        </nav>
      </header>

      <main style={styles.content}>
        {children}
      </main>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    minHeight: '100%',
    padding: '32px',
    backgroundColor: 'var(--bg-app)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    backgroundColor: 'white',
    padding: '16px 32px',
    borderRadius: '24px',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
  },
  headerTitleArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  headerBadge: {
    fontSize: '10px',
    fontWeight: '900',
    color: 'var(--primary)',
    backgroundColor: 'var(--primary-light)',
    padding: '4px 12px',
    borderRadius: '20px',
    width: 'fit-content',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '900',
    color: 'var(--text-main)',
    letterSpacing: '-1px',
    margin: 0,
  },
  topNav: {
    display: 'flex',
    backgroundColor: '#f4f4f4',
    padding: '6px',
    borderRadius: '18px',
    border: '1px solid var(--border)',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    gap: '12px',
  },
  navItemActive: {
    backgroundColor: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid var(--border)',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: '13px',
    fontWeight: '800',
    color: 'var(--primary)',
    whiteSpace: 'nowrap' as const,
  },
  itemBadge: {
    fontSize: '10px',
    fontWeight: '800',
    backgroundColor: 'var(--primary)',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  content: {
    flex: 1,
    animation: 'fadeIn 0.5s ease',
  }
};

export default ModuleLayout;
