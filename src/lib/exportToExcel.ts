/**
 * Zaptro — Exportação de listas para Excel (CSV UTF-8 BOM).
 * Abre nativamente no Excel/LibreOffice/Numbers sem dependências externas.
 */

type CsvRow = Record<string, string | number | boolean | null | undefined>;

/**
 * Converte array de objetos em CSV e faz download automático.
 * @param rows    Array de objetos (1 objeto = 1 linha)
 * @param filename Nome do arquivo sem extensão (ex: 'clientes')
 * @param columns  Mapeamento opcional { chave: 'Rótulo da Coluna' }.
 *                 Se omitido usa as chaves do objeto como cabeçalhos.
 */
export function exportToExcel(
  rows: CsvRow[],
  filename: string,
  columns?: Record<string, string>,
): void {
  if (!rows.length) return;

  const keys = columns ? Object.keys(columns) : Object.keys(rows[0]);
  const headers = columns ? Object.values(columns) : keys;

  const escape = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Wrap in quotes if contains comma, newline or quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines: string[] = [
    headers.map(escape).join(','),
    ...rows.map((row) => keys.map((k) => escape(row[k])).join(',')),
  ];

  // UTF-8 BOM so Excel opens accented chars correctly
  const bom = '\uFEFF';
  const csv = bom + csvLines.join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
