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
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 5000,
  },
  modal: {
    backgroundColor: 'white',
    width: '100%',
    height: '100%',
    boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    borderTopLeftRadius: '32px',
    borderBottomLeftRadius: '32px',
    animation: 'zaptroSlideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  header: {
    padding: '24px 32px',
    borderBottom: '1px solid #EBEBEC',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#000000',
    letterSpacing: '-0.02em',
  },
  closeBtn: {
    padding: '10px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: '#F4F4F5',
    color: '#18181B',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  content: {
    padding: '32px',
    overflowY: 'auto' as const,
    flex: 1,
  },
};

// Add keyframes
const modalGlobalStyles = `
  @keyframes zaptroSlideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
`;

if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = modalGlobalStyles;
  document.head.appendChild(styleTag);
}


export default LogtaModal;
