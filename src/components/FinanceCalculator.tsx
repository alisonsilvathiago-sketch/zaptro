import React, { useState, useEffect } from 'react';
import { 
  Calculator, History, Save, Share2, Trash2, 
  Copy, CheckCircle2, Lock, Eye, Plus, Minus, X, Divide,
  FileText, ExternalLink, Calendar, Info, Clock, Check,
  ChevronRight, Smartphone, Monitor
} from 'lucide-react';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';

interface CalcEntry {
  id: string;
  title: string;
  expression: string;
  result: number;
  description: string;
  date: string;
  selected?: boolean;
}

interface SharedCalc {
  id: string;
  entries: CalcEntry[];
  status: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
}

/** Only digits, operators and parentheses — no `eval` / dynamic code. */
function evaluateArithmeticExpression(raw: string): number {
  const expr = raw.replace(/x/gi, '*').replace(/\s/g, '');
  if (!expr.length || expr.length > 200) throw new Error('empty');
  if (!/^[\d+\-*/.()]+$/.test(expr)) throw new Error('invalid');

  const tokens: string[] = [];
  let i = 0;
  const unaryOk = () => {
    if (tokens.length === 0) return true;
    const p = tokens[tokens.length - 1];
    return p === '(' || (p.length === 1 && '+-*/'.includes(p));
  };
  while (i < expr.length) {
    const c = expr[i];
    if (c === '-' && unaryOk()) {
      let j = i + 1;
      if (j < expr.length && (/\d/.test(expr[j]) || expr[j] === '.')) {
        while (j < expr.length && /[\d.]/.test(expr[j])) j += 1;
        tokens.push(expr.slice(i, j));
        i = j;
        continue;
      }
    }
    if ('+-*/()'.includes(c)) {
      tokens.push(c);
      i += 1;
      continue;
    }
    if (/\d/.test(c) || c === '.') {
      let j = i;
      while (j < expr.length && /[\d.]/.test(expr[j])) j += 1;
      tokens.push(expr.slice(i, j));
      i = j;
      continue;
    }
    throw new Error('invalid');
  }

  const prec = (op: string) => (op === '*' || op === '/' ? 2 : 1);
  const output: string[] = [];
  const ops: string[] = [];
  for (const tok of tokens) {
    if (/^[\d.]+$/.test(tok)) {
      output.push(tok);
      continue;
    }
    if (tok === '(') {
      ops.push(tok);
      continue;
    }
    if (tok === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop()!);
      ops.pop();
      continue;
    }
    while (ops.length && ops[ops.length - 1] !== '(' && prec(ops[ops.length - 1]) >= prec(tok)) {
      output.push(ops.pop()!);
    }
    ops.push(tok);
  }
  while (ops.length) output.push(ops.pop()!);

  const stack: number[] = [];
  for (const t of output) {
    if (/^[\d.]+$/.test(t)) {
      stack.push(Number(t));
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) throw new Error('syntax');
    switch (t) {
      case '+':
        stack.push(a + b);
        break;
      case '-':
        stack.push(a - b);
        break;
      case '*':
        stack.push(a * b);
        break;
      case '/':
        stack.push(b === 0 ? NaN : a / b);
        break;
      default:
        throw new Error('op');
    }
  }
  if (stack.length !== 1) throw new Error('syntax');
  const v = stack[0];
  if (!Number.isFinite(v)) throw new Error('nan');
  return v;
}

const FinanceCalculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState<CalcEntry[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedLink, setSharedLink] = useState('');

  // Carregar histórico local
  useEffect(() => {
    const saved = localStorage.getItem('logta_calc_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveHistory = (newHistory: CalcEntry[]) => {
    setHistory(newHistory);
    localStorage.setItem('logta_calc_history', JSON.stringify(newHistory));
  };

  const handleCalc = (val: string) => {
    if (val === 'C') {
      setDisplay('0');
      setExpression('');
      return;
    }
    if (val === '=') {
      try {
        const res = evaluateArithmeticExpression(expression);
        setDisplay(res.toString());
        setExpression(`${expression} = ${res}`);
      } catch {
        setDisplay('Erro');
      }
      return;
    }
    
    const newDisplay = display === '0' ? val : display + val;
    const newExpr = expression + val;
    setDisplay(newDisplay);
    setExpression(newExpr);
  };

  const saveToHistory = () => {
    if (!expression.includes('=')) {
      toastError('Realize um cálculo completo para salvar.');
      return;
    }

    const [expr, res] = expression.split(' = ');
    const entry: CalcEntry = {
      id: Math.random().toString(36).substr(2, 9),
      title: title || 'Cálculo Sem Título',
      expression: expr,
      result: parseFloat(res),
      description,
      date: new Date().toLocaleString('pt-BR'),
      selected: false
    };

    const newHistory = [entry, ...history];
    saveHistory(newHistory);
    toastSuccess('Cálculo salvo no seu histórico Logta!');
    setTitle('');
    setDescription('');
    setExpression('');
    setDisplay('0');
  };

  const toggleSelect = (id: string) => {
    const newHistory = history.map(h => h.id === id ? { ...h, selected: !h.selected } : h);
    saveHistory(newHistory);
  };

  const deleteEntry = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    saveHistory(newHistory);
  };

  const generateShareLink = () => {
    const selected = history.filter(h => h.selected);
    if (selected.length === 0) {
      toastError('Selecione ao menos um cálculo para compartilhar.');
      return;
    }

    toastLoading('Gerando link seguro de compartilhamento...');
    setTimeout(() => {
      const shareId = Math.random().toString(36).substr(2, 12);
      // Aqui simularia salvar no Supabase
      const link = `${window.location.origin}/shared-calc/${shareId}`;
      setSharedLink(link);
      setIsSharing(true);
      toastDismiss();
      toastSuccess('Link de compartilhamento ativado!');
    }, 1000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(sharedLink);
    toastSuccess('Link copiado para a área de transferência!');
  };

  const styles = {
    container: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', minHeight: '400px' },
    calcWrap: { backgroundColor: '#f4f4f4', padding: '16px', borderRadius: '20px', border: '1px solid #E2E8F0' },
    displayArea: { backgroundColor: '#0F172A', color: 'white', padding: '16px', borderRadius: '14px', textAlign: 'right' as const, marginBottom: '16px', minHeight: '80px', display: 'flex', flexDirection: 'column' as const, justifyContent: 'flex-end', gap: '4px' },
    exprLabel: { fontSize: '13px', color: '#94A3B8', fontFamily: 'monospace' },
    resLabel: { fontSize: '24px', fontWeight: '700', fontFamily: 'monospace' },
    
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
    btn: { height: '44px', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'white', color: '#1E293B', border: '1px solid #E2E8F0' },
    btnOp: { backgroundColor: '#ebebeb', color: 'var(--primary)', border: '1px solid #E2E8F0' },
    btnEq: { gridColumn: 'span 2', backgroundColor: '#10B981', color: 'white', border: 'none' },
    
    form: { marginTop: '16px', display: 'flex', flexDirection: 'column' as const, gap: '8px' },
    input: { padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontWeight: '700', fontSize: '13px' },
    
    historyWrap: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
    hHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    hTitle: { fontSize: '14px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' },
    hList: { display: 'flex', flexDirection: 'column' as const, gap: '10px', maxHeight: '380px', overflowY: 'auto' as const, paddingRight: '4px' },
    hItem: (sel: boolean) => ({ 
      padding: '12px', borderRadius: '14px', backgroundColor: 'white', border: sel ? '2px solid var(--primary)' : '1px solid #E2E8F0',
      transition: 'all 0.2s', position: 'relative' as const, cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'flex-start'
    }),
    check: (sel: boolean) => ({
      width: '18px', height: '18px', borderRadius: '6px', border: '2px solid #E2E8F0', backgroundColor: sel ? 'var(--primary)' : 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
    }),
    hContent: { flex: 1 },
    hH3: { fontSize: '13px', fontWeight: '600', margin: '0 0 2px 0', color: '#1E293B' },
    hExpr: { fontSize: '11px', color: '#64748B', fontFamily: 'monospace', marginBottom: '4px', display: 'block' },
    hRes: { fontSize: '14px', fontWeight: '700', color: 'var(--primary)' },
    
    shareBox: { backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '12px', borderRadius: '16px', marginTop: 'auto' },
    shareBtn: { width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' },
    linkRow: { display: 'flex', gap: '8px', marginTop: '8px' }
  };

  return (
    <div style={styles.container}>
       {/* Esquerda: Calculadora e Inputs */}
       <div style={styles.calcWrap}>
          <div style={styles.displayArea}>
             <div style={styles.exprLabel}>{expression || '0'}</div>
             <div style={styles.resLabel}>{display}</div>
          </div>

          <div style={styles.grid}>
             {['7', '8', '9', 'C', '4', '5', '6', 'x', '1', '2', '3', '-', '0', '.', '+', '/'].map(btn => (
                <button 
                  key={btn} 
                  style={{...styles.btn, ...(isNaN(Number(btn)) && btn !== '.' ? styles.btnOp : {})}} 
                  onClick={() => handleCalc(btn)}
                >
                  {btn}
                </button>
             ))}
             <button style={{...styles.btn, ...styles.btnEq}} onClick={() => handleCalc('=')}>Calcular (=)</button>
             <button style={{...styles.btn, border: '1px solid #10B981', color: '#10B981'}} onClick={saveToHistory}>
                <Save size={18} /> Salvar Histórico
             </button>
          </div>

          <div style={styles.form}>
             <input 
                placeholder="Título da soma (Ex: Frete + Despesas)" 
                style={styles.input} 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
             />
             <textarea 
                placeholder="Observações ou comprovantes..." 
                style={{...styles.input, height: '80px', fontWeight: '500'}} 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
             />
          </div>
       </div>

       {/* Direita: Histórico e Compartilhamento */}
       <div style={styles.historyWrap}>
          <div style={styles.hHeader}>
             <h3 style={styles.hTitle}><History size={18} color="var(--primary)" /> Histórico Guardado</h3>
             {history.length > 0 && (
                <button 
                  onClick={() => saveHistory([])} 
                  style={{border: 'none', background: 'none', color: '#94A3B8', fontSize: '11px', fontWeight: '600', cursor: 'pointer'}}
                >
                  Limpar Tudo
                </button>
             )}
          </div>

          <div style={styles.hList}>
             {history.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#94A3B8'}}>
                   <Calculator size={48} opacity={0.2} style={{marginBottom: '16px'}} />
                   <p>Nenhum cálculo salvo ainda.</p>
                </div>
             ) : history.map(item => (
                <div key={item.id} style={styles.hItem(!!item.selected)} onClick={() => toggleSelect(item.id)}>
                   <div style={styles.check(!!item.selected)}>
                      {item.selected && <Check size={14} />}
                   </div>
                   <div style={styles.hContent}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                         <h4 style={styles.hH3}>{item.title}</h4>
                         <span style={{fontSize: '10px', color: '#94A3B8'}}>{item.date}</span>
                      </div>
                      <span style={styles.hExpr}>{item.expression}</span>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                         <span style={styles.hRes}>R$ {item.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                         <button 
                           onClick={(e) => { e.stopPropagation(); deleteEntry(item.id); }}
                           style={{border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px'}}
                         >
                           <Trash2 size={14} />
                         </button>
                      </div>
                      {item.description && <p style={{fontSize: '11px', color: '#64748B', marginTop: '8px', borderTop: '1px dashed #E2E8F0', paddingTop: '8px'}}>{item.description}</p>}
                   </div>
                </div>
             ))}
          </div>

          <div style={styles.shareBox}>
             {!isSharing ? (
                <>
                   <p style={{fontSize: '12px', color: '#0C4A6E', marginBottom: '12px', fontWeight: '700'}}>
                      <Info size={14} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      Selecione um ou mais cálculos acima para gerar um link de compartilhamento.
                   </p>
                   <button style={styles.shareBtn} onClick={generateShareLink}>
                      <Share2 size={18} /> Compartilhar Selecionados
                   </button>
                </>
             ) : (
                <>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                      <span style={{fontSize: '12px', fontWeight: '700', color: '#0369A1'}}>LINK ATIVO ✅</span>
                      <button onClick={() => setIsSharing(false)} style={{border: 'none', background: 'none', color: '#EF4444', fontWeight: '600', fontSize: '11px', cursor: 'pointer'}}>Revogar Acesso</button>
                   </div>
                   <div style={styles.linkRow}>
                      <input readOnly value={sharedLink} style={{...styles.input, flex: 1, height: '44px'}} />
                      <button onClick={copyLink} style={{...styles.btn, height: '44px', width: '44px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Copy size={18} /></button>
                   </div>
                   <p style={{fontSize: '10px', color: '#64748B', marginTop: '8px'}}>Qualquer pessoa com este link poderá ver os itens selecionados.</p>
                </>
             )}
          </div>
       </div>
    </div>
  );
};

export default FinanceCalculator;
