import React from 'react';
import { FileText, Download } from 'lucide-react';

interface ExportButtonProps {
  filename?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ filename }) => {
  const handleExport = () => {
    // Definimos o título temporário para o arquivo PDF (o navegador usa o document.title)
    const originalTitle = document.title;
    if (filename) document.title = filename;
    
    window.print();
    
    // Restauramos o título original
    document.title = originalTitle;
  };

  return (
    <button 
      onClick={handleExport}
      style={styles.exportBtn}
      className="no-print"
      title="Exportar para PDF"
    >
      <FileText size={18} />
      <span>Exportar PDF</span>
    </button>
  );
};

const styles = {
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '52px',
    padding: '0 20px',
    backgroundColor: '#1e293b', // High contrast dark
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  }
};

export default ExportButton;
