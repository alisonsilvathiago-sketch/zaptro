import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

const LogtaModal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, width = '500px' }) => {
  // Feedback tátil: Fechar no Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose} className="animate-fade-in">
      <div style={{...styles.modal, maxWidth: width}} onClick={e => e.stopPropagation()} className="animate-scale-in">
        <header style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div style={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '24px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: '90vh',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#000000',
    letterSpacing: '-0.5px',
  },
  closeBtn: {
    padding: '8px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  content: {
    padding: '20px',
    overflowY: 'auto' as const,
    flex: 1,
  },
};

export default LogtaModal;
