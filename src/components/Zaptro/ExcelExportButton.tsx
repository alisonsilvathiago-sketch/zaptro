import React from 'react';
import { exportToExcel } from '../../lib/exportToExcel';

type CsvRow = Record<string, string | number | boolean | null | undefined>;

interface ExcelExportButtonProps {
  /** Dados para exportar */
  rows: CsvRow[];
  /** Nome do arquivo (sem extensão) */
  filename: string;
  /** Mapeamento de colunas: { chave: 'Rótulo' } */
  columns?: Record<string, string>;
  /** Rótulo visível no botão (padrão: 'Exportar Excel') */
  label?: string;
  /** Estilo visual: 'outline' ou 'solid' */
  variant?: 'outline' | 'solid';
  style?: React.CSSProperties;
}

/**
 * Botão de exportação Excel reutilizável.
 * Usa apenas CSS inline — compatível com qualquer página do Zaptro.
 */
const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  rows,
  filename,
  columns,
  label = 'Exportar Excel',
  variant = 'outline',
  style,
}) => {
  const handleClick = () => {
    exportToExcel(rows, filename, columns);
  };

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
    transition: 'all 0.18s ease',
    letterSpacing: '-0.01em',
    opacity: rows.length === 0 ? 0.45 : 1,
    whiteSpace: 'nowrap',
    ...(variant === 'solid'
      ? {
          background: '#16a34a',
          color: '#fff',
          border: 'none',
        }
      : {
          background: 'transparent',
          color: '#16a34a',
          border: '1.5px solid #16a34a',
        }),
    ...style,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={rows.length === 0}
      style={base}
      title={rows.length === 0 ? 'Sem dados para exportar' : `Baixar ${rows.length} registros em Excel`}
      onMouseEnter={(e) => {
        if (rows.length === 0) return;
        if (variant === 'solid') {
          e.currentTarget.style.background = '#15803d';
        } else {
          e.currentTarget.style.background = '#16a34a15';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'solid') {
          e.currentTarget.style.background = '#16a34a';
        } else {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {/* Excel/table icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="16" y2="17"/>
        <line x1="8" y1="9" x2="10" y2="9"/>
      </svg>
      {label}
      {rows.length > 0 && (
        <span style={{
          background: variant === 'solid' ? 'rgba(255,255,255,0.2)' : '#16a34a20',
          color: variant === 'solid' ? '#fff' : '#16a34a',
          borderRadius: 999,
          padding: '1px 7px',
          fontSize: 11,
          fontWeight: 800,
        }}>
          {rows.length}
        </span>
      )}
    </button>
  );
};

export default ExcelExportButton;
