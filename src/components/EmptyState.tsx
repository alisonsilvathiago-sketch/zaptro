import React from 'react';

type IconComponent = React.FC<{ size?: number; color?: string; opacity?: number }>;

interface EmptyStateProps {
  title: string;
  description: string;
  illustration?: string;
  icon?: IconComponent;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  illustration, 
  icon: Icon,
  actionLabel, 
  onAction 
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.illustrationWrapper}>
        {illustration ? (
          <img src={illustration} alt="Illustration" style={styles.image} />
        ) : Icon ? (
          <div style={styles.iconContainer}>
            <Icon size={64} color="var(--primary)" opacity={0.2} />
          </div>
        ) : null}
      </div>
      
      <div style={styles.textWrapper}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.description}>{description}</p>
      </div>

      {actionLabel && onAction && (
        <button style={styles.button} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    textAlign: 'center' as const,
    backgroundColor: 'white',
    borderRadius: '32px',
    border: '1px solid #f1f5f9',
    margin: '20px 0',
    animation: 'fadeIn 0.6s ease-out'
  },
  illustrationWrapper: {
    marginBottom: '32px',
    maxWidth: '300px',
    width: '100%',
    display: 'flex',
    justifyContent: 'center'
  },
  image: {
    width: '100%',
    height: 'auto',
    objectFit: 'contain' as const,
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.05))'
  },
  iconContainer: {
    width: '120px',
    height: '120px',
    borderRadius: '60px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  textWrapper: {
    maxWidth: '400px',
    marginBottom: '32px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '12px',
    letterSpacing: '-0.5px'
  },
  description: {
    fontSize: '15px',
    color: '#64748b',
    lineHeight: '1.6',
    margin: 0
  },
  button: {
    padding: '12px 28px',
    backgroundColor: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 15px rgba(124, 58, 237, 0.2)'
    }
  }
};

export default EmptyState;
