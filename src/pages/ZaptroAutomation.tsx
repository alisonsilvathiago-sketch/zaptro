import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, MessageSquare, ArrowRight, Plus, Trash2, 
  Users, Save, Play, Settings, Bot, Shield, 
  Layout, Truck, BarChart, Bell, Info, ChevronRight,
  Code, MoreVertical, Edit2, Share2, X, ListOrdered,
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import LogtaModal from '../components/Modal';

interface FlowOption {
  id: string;
  keyword: string;
  label: string;
  action: 'message' | 'routing' | 'external' | 'tracking_public';
  target: string;
  /** Texto quando o cliente ainda não tem carga casada pelo WhatsApp — pedir pedido, NF ou CNPJ/CPF. */
  response: string;
  /** Mensagem quando já existe link (use `{{link}}` ou `{{tracking_link}}`). */
  responseWhenFound?: string;
}

interface ZaptroAutomationProps {
  hideLayout?: boolean;
}

/** Colunas no editor (grelha); o número total de opções é livre — novas linhas de 3 em 3. */
const MENU_OPTION_GRID_COLUMNS = 3;

const DEFAULT_FLOW_OPTIONS: FlowOption[] = [
  {
    id: '1',
    keyword: '1',
    label: 'Rastrear entrega',
    action: 'tracking_public',
    target: '',
    response:
      'Não encontramos carga associada ao seu WhatsApp. Envie o número do pedido, da NF ou o CNPJ/CPF cadastrado (pode enviar só números).',
    responseWhenFound:
      '✅ Encontramos a sua carga.\n🔗 Acompanhe em tempo real (página pública do cliente):\n{{link}}',
  },
  {
    id: '2',
    keyword: '2',
    label: 'Falar com comercial',
    action: 'routing',
    target: 'comercial',
    response: 'Vamos direcionar o seu pedido ao time comercial. Um consultor continua por aqui em breve.',
  },
  {
    id: '3',
    keyword: '3',
    label: 'Solicitar coleta',
    action: 'routing',
    target: 'logistica',
    response: 'Registámos o pedido de coleta. A logística vai confirmar janela e endereço com você.',
  },
  {
    id: '4',
    keyword: '4',
    label: '2ª via / faturamento',
    action: 'routing',
    target: 'financeiro',
    response: 'A equipa financeira vai localizar boletos e faturas. Indique CNPJ e número do CT-e ou NF se tiver à mão.',
  },
  {
    id: '5',
    keyword: '5',
    label: 'Ocorrências / avarias (SAC)',
    action: 'routing',
    target: 'sac',
    response: 'O SAC foi alertado. Descreva o que ocorreu (carga, número do pedido) — tratamos com prioridade.',
  },
  {
    id: '6',
    keyword: '6',
    label: 'Cotação de frete',
    action: 'routing',
    target: 'comercial',
    response: 'Para cotar, envie origem, destino, peso/volume e tipo de mercadoria. O comercial responde com valores.',
  },
  {
    id: '7',
    keyword: '7',
    label: 'Horários e filiais',
    action: 'message',
    target: '',
    response:
      'O nosso expediente e moradas das filiais estão no site e na documentação da transportadora. Se precisar de um contacto específico, digite 2 (comercial).',
  },
];

const AUTOMATION_LOCAL_PREFIX = 'zaptro_automation_flow_local_v1_';

function automationLocalKey(companyId: string) {
  return `${AUTOMATION_LOCAL_PREFIX}${companyId}`;
}

function readAutomationLocal(companyId: string): {
  welcome_message: string;
  options: FlowOption[];
  flowId: string | null;
} | null {
  if (typeof localStorage === 'undefined' || !companyId) return null;
  try {
    const raw = localStorage.getItem(automationLocalKey(companyId));
    if (!raw) return null;
    const j = JSON.parse(raw) as {
      welcome_message?: string;
      options?: unknown;
      flowId?: string | null;
    };
    if (typeof j.welcome_message !== 'string' || !Array.isArray(j.options)) return null;
    return {
      welcome_message: j.welcome_message,
      options: normalizeFlowOptions(j.options),
      flowId: typeof j.flowId === 'string' ? j.flowId : null,
    };
  } catch {
    return null;
  }
}

function writeAutomationLocal(
  companyId: string,
  welcome: string,
  opts: FlowOption[],
  fid: string | null,
) {
  if (typeof localStorage === 'undefined' || !companyId) return;
  try {
    localStorage.setItem(
      automationLocalKey(companyId),
      JSON.stringify({
        welcome_message: welcome,
        options: opts,
        flowId: fid,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

function normalizeFlowOptions(raw: unknown): FlowOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_FLOW_OPTIONS;
  const mapped = raw.map((o: Record<string, unknown>, i: number) => {
    const actionRaw = o.action;
    const action =
      actionRaw === 'routing' || actionRaw === 'external' || actionRaw === 'message' || actionRaw === 'tracking_public'
        ? actionRaw
        : 'message';
    const kid = o.keyword != null && String(o.keyword) !== '' ? String(o.keyword) : String(i + 1);
    const oid = o.id != null && String(o.id) !== '' ? String(o.id) : `opt-${i}-${kid}`;
    const rwf =
      typeof o.responseWhenFound === 'string'
        ? o.responseWhenFound
        : typeof o.response_when_found === 'string'
          ? o.response_when_found
          : '';
    return {
      id: oid,
      keyword: kid,
      label: typeof o.label === 'string' && o.label ? o.label : 'Opção',
      action,
      target: typeof o.target === 'string' ? o.target : '',
      response: typeof o.response === 'string' ? o.response : '',
      ...(rwf ? { responseWhenFound: rwf } : {}),
    };
  });
  return mapped;
}

const ZaptroAutomation: React.FC<ZaptroAutomationProps> = ({ hideLayout = false }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flowId, setFlowId] = useState<string | null>(null);

  const [welcomeMessage, setWelcomeMessage] = useState(
    'Olá! Bem-vindo à central da transportadora. 🚛\n\nDigite o número da opção:\n1 — Rastrear entrega\n2 — Comercial\n3 — Coleta\n4 — Faturamento\n5 — SAC / ocorrências\n6 — Cotação\n7 — Horários / filiais\n\n(Pode personalizar todas as opções abaixo.)',
  );
  
  const [options, setOptions] = useState<FlowOption[]>(DEFAULT_FLOW_OPTIONS);

  /** Após o primeiro carregamento (Supabase ou rascunho local), passamos a gravar alterações no browser. */
  const persistReadyRef = useRef(false);

  const departments = [
    { id: 'comercial', name: 'Time Comercial', color: '#10B981' },
    { id: 'logistica', name: 'Logística / Frota', color: '#52525b' },
    { id: 'financeiro', name: 'Financeiro', color: '#F59E0B' },
    { id: 'sac', name: 'SAC / Reclamações', color: '#EF4444' },
  ];

  const fetchFlow = useCallback(async () => {
    setLoading(true);
    const cid = profile?.company_id || 'local-demo';

    if (!profile?.company_id) {
      const localOnly = readAutomationLocal(cid);
      if (localOnly) {
        setFlowId(localOnly.flowId);
        setWelcomeMessage(localOnly.welcome_message);
        setOptions(localOnly.options);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabaseZaptro
        .from('whatsapp_automation_flows')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('name', 'Padrao')
        .maybeSingle();

      if (error) {
        notifyZaptro(
          'error',
          'Não foi possível carregar a automação',
          error.message || 'Faça login de novo ou abra Configurações e atualize a página.'
        );
      }
      if (data) {
        setFlowId(data.id);
        const wm = data.welcome_message || '';
        const opts = normalizeFlowOptions(data.options);
        setWelcomeMessage(wm);
        setOptions(opts);
        writeAutomationLocal(cid, wm, opts, data.id);
      } else {
        const local = readAutomationLocal(cid);
        if (local) {
          setFlowId(local.flowId);
          setWelcomeMessage(local.welcome_message);
          setOptions(local.options);
        }
      }
    } catch (err) {
      console.error(err);
      const local = readAutomationLocal(cid);
      if (local) {
        setFlowId(local.flowId);
        setWelcomeMessage(local.welcome_message);
        setOptions(local.options);
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    void fetchFlow();
  }, [fetchFlow]);

  useEffect(() => {
    persistReadyRef.current = !loading;
  }, [loading]);

  /** Guarda rascunho no browser sempre que alteras boas-vindas ou opções (debounce). */
  useEffect(() => {
    if (!persistReadyRef.current || loading) return;
    const cid = profile?.company_id || 'local-demo';
    const t = window.setTimeout(() => {
      writeAutomationLocal(cid, welcomeMessage, options, flowId);
    }, 500);
    return () => window.clearTimeout(t);
  }, [welcomeMessage, options, flowId, loading, profile?.company_id]);

  const addOption = () => {
    setOptions((prev) => {
      const nextNum =
        prev.reduce((m, o) => {
          const n = parseInt(String(o.keyword), 10);
          return Number.isFinite(n) ? Math.max(m, n) : m;
        }, 0) + 1;
      const id = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return [
        ...prev,
        {
          id,
          keyword: String(nextNum),
          label: 'Nova Opção',
          action: 'message' as const,
          target: '',
          response: 'Escreva aqui a resposta automática...',
          responseWhenFound: '',
        },
      ];
    });
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => String(o.id) !== String(id)));
  };

  const handleSave = async () => {
    if (!profile?.company_id) {
      toastError('Faça login com uma conta Zaptro para salvar a automação.');
      return;
    }
    const tId = toastLoading('Salvando automação...');
    try {
      const payload = {
        company_id: profile.company_id,
        name: 'Padrao',
        welcome_message: welcomeMessage,
        options: options
      };

      let error;
      if (flowId) {
        const { error: updError } = await supabaseZaptro
          .from('whatsapp_automation_flows')
          .update(payload)
          .eq('id', flowId);
        error = updError;
      } else {
        const { data: newData, error: insError } = await supabaseZaptro
          .from('whatsapp_automation_flows')
          .insert([payload])
          .select()
          .single();
        error = insError;
        if (newData) setFlowId(newData.id);
      }

      if (error) throw error;
      writeAutomationLocal(profile.company_id, welcomeMessage, options, flowId);
      toastSuccess('Automação Zaptro salva com sucesso! 🚀');
    } catch (err: any) {
      writeAutomationLocal(profile.company_id, welcomeMessage, options, flowId);
      toastError('Erro ao salvar no servidor: ' + err.message + ' — rascunho mantido neste browser.');
    } finally {
      toastDismiss(tId);
    }
  };

  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simMessages, setSimMessages] = useState<{from: 'bot' | 'user', text: string}[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    detectNf: true,
    naturalLanguageStatus: true,
    aiModel: 'GPT-4 Logistics Optimized'
  });

  useEffect(() => {
    const cid = profile?.company_id;
    if (!cid) return;
    try {
      const raw = localStorage.getItem(`zaptro_automation_ai_${cid}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{ detectNf: boolean; naturalLanguageStatus: boolean; aiModel: string }>;
      setAiConfig((c) => ({
        ...c,
        ...(typeof parsed.detectNf === 'boolean' ? { detectNf: parsed.detectNf } : {}),
        ...(typeof parsed.naturalLanguageStatus === 'boolean' ? { naturalLanguageStatus: parsed.naturalLanguageStatus } : {}),
        ...(typeof parsed.aiModel === 'string' ? { aiModel: parsed.aiModel } : {}),
      }));
    } catch {
      /* ignore */
    }
  }, [profile?.company_id]);

  const handleSimInput = (opt: FlowOption) => {
    const demoLink = 'https://app.zaptro.com.br/acompanhar/demo-token';
    if (opt.action === 'tracking_public') {
      const found = (opt.responseWhenFound || '').replace(/\{\{\s*link\s*\}\}/gi, demoLink).replace(
        /\{\{\s*tracking_link\s*\}\}/gi,
        demoLink,
      );
      setSimMessages((prev) => [
        ...prev,
        { from: 'user', text: `${opt.keyword}. ${opt.label}` },
        {
          from: 'bot',
          text:
            found.trim() ||
            `✅ (simulador) Carga encontrada.\n🔗 ${demoLink}\n\n— No WhatsApp real: se o telefone estiver na carga em logística, o link é enviado já; senão o robô pede pedido/NF/CNPJ.`,
        },
      ]);
      return;
    }
    setSimMessages([...simMessages, { from: 'user', text: opt.label }, { from: 'bot', text: opt.response }]);
    if (opt.action === 'routing') {
      setTimeout(() => {
        setSimMessages((prev) => [
          ...prev,
          { from: 'bot', text: `🔄 Direcionando para o setor: ${departments.find((d) => d.id === opt.target)?.name}...` },
        ]);
      }, 1000);
    }
  };

  const content = (
      <div style={styles.container}>
        <header style={styles.header}>
           <div style={styles.headerInfo}>
              <h1 style={styles.title}>Automação & Fluxos Inteligentes</h1>
              <p style={styles.subtitle}>
                O menu que grava aqui é o mesmo que o webhook WhatsApp usa: o cliente envia o número da opção e o robô responde,
                direciona setores ou envia o link público de rastreio quando os dados batem com as cargas em logística.
              </p>
              <p style={styles.persistHint}>
                Pode <strong>personalizar</strong> textos, teclas e quantas opções quiser — o modelo abaixo é só um padrão para transportadoras.
                As alterações ficam também <strong>neste browser</strong> ao editar; «Salvar Fluxo» envia para o Supabase.
              </p>
           </div>
           <div style={styles.headerActions}>
              <button type="button" style={styles.secondaryBtn} onClick={() => { setIsSimulatorOpen(true); setSimMessages([{ from: 'bot', text: welcomeMessage }]); }}>
                 <Play size={16} /> Testar Simulador
              </button>
              <button type="button" style={styles.primaryBtn} onClick={handleSave}><Save size={18} /> Salvar Fluxo</button>
           </div>
        </header>

        {isSimulatorOpen && (
          <div style={styles.simulatorOverlay} onClick={() => setIsSimulatorOpen(false)}>
             <div style={styles.simulatorCard} onClick={e => e.stopPropagation()}>
                <div style={styles.simHeader}>
                   <div style={styles.simAvatar}><Bot size={18} /></div>
                   <div style={{flex: 1}}><h4 style={{margin: 0, fontSize: '14px', fontWeight: '950'}}>Simulador Zaptro Bot</h4><span style={{fontSize: '10px', color: '#404040', fontWeight: '800'}}>ONLINE</span></div>
                   <button style={styles.closeBtn} onClick={() => setIsSimulatorOpen(false)}><X size={16} /></button>
                </div>
                <div style={styles.simBody}>
                   {simMessages.map((m, i) => (
                     <div key={i} style={{...styles.simMsg, alignSelf: m.from === 'bot' ? 'flex-start' : 'flex-end', backgroundColor: m.from === 'bot' ? '#FBFBFC' : '#0F172A', color: m.from === 'bot' ? '#0F172A' : '#FFF'}}>
                        {m.text}
                     </div>
                   ))}
                </div>
                <div style={styles.simFooter}>
                   <p style={{fontSize: '11px', color: '#94A3B8', marginBottom: '12px', fontWeight: '700'}}>Selecione uma opção para testar:</p>
                   <div style={styles.simOptions}>
                      {options.map(o => (
                        <button key={o.id} style={styles.simOptBtn} onClick={() => handleSimInput(o)}>{o.keyword}. {o.label}</button>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        <style>{`
          .zaptro-auto-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(200px, 232px);
            gap: 24px 22px;
            align-items: start;
            width: 100%;
          }
          .zaptro-auto-main {
            min-width: 0;
            width: 100%;
          }
          .zaptro-auto-options {
            display: grid;
            width: 100%;
            box-sizing: border-box;
            grid-template-columns: repeat(${MENU_OPTION_GRID_COLUMNS}, minmax(0, 1fr));
            gap: 20px 24px;
            justify-items: stretch;
          }
          .zaptro-auto-options > * {
            min-width: 0;
          }
          .zaptro-auto-aside {
            display: flex;
            flex-direction: column;
            gap: 16px;
            width: 100%;
            min-width: 0;
          }
          .zaptro-auto-menu-row {
            grid-column: 1 / -1;
            width: 100%;
            min-width: 0;
          }
          @media (max-width: 1180px) {
            .zaptro-auto-layout { grid-template-columns: 1fr; }
          }
          @media (max-width: 900px) {
            .zaptro-auto-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 560px) {
            .zaptro-auto-options { grid-template-columns: 1fr; }
          }
        `}</style>
        <div className="zaptro-auto-layout">
           <section className="zaptro-auto-main" style={styles.editorMain}>
              <div style={styles.card}>
                 <div style={styles.cardHeader}>
                    <div style={styles.iconBox}><Bot size={20} color="#0F172A" /></div>
                    <h3 style={styles.cardTitle}>1. Mensagem de Boas-Vindas</h3>
                 </div>
                 <div style={styles.editorArea}>
                    <textarea 
                      style={styles.textarea}
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="Ex: Olá! Como posso te ajudar?"
                    />
                     <div style={styles.previewHint}>
                        {options.map(opt => (
                          <div key={opt.id} style={styles.hintButton}>
                             {opt.keyword} • {opt.label}
                          </div>
                        ))}
                     </div>
                 </div>
              </div>
           </section>

           <aside className="zaptro-auto-aside">
              <div style={styles.sideCard}>
                 <h4 style={styles.sideTitle}>Timeout</h4>
                 <span style={styles.configDesc}>Reset do fluxo após inatividade</span>
                 <select style={{ ...styles.tinySelect, width: '100%', marginTop: 14, accentColor: '#000' }}>
                    <option>15 min</option>
                    <option>1 hora</option>
                 </select>
              </div>
              <div style={{ ...styles.sideCard, backgroundColor: '#0F172A', color: 'white' }}>
                 <h4 style={{ ...styles.sideTitle, color: 'white' }}>Inteligência</h4>
                 <p style={{ ...styles.sideDesc, color: 'rgba(255,255,255,0.72)' }}>
                    Deteção de NF e linguagem natural (configuração detalhada no modal).
                 </p>
                 <button type="button" style={styles.proBtn} onClick={() => setIsAiModalOpen(true)}>
                    Configurar motor
                 </button>
              </div>
           </aside>

           <div className="zaptro-auto-menu-row">
              <div className="zaptro-auto-menu-section" style={styles.menuSectionCard}>
                 <div style={styles.cardHeader}>
                    <div style={styles.iconBox}><ListOrdered size={20} color="#0F172A" /></div>
                    <div style={styles.menuSectionHeaderRow}>
                       <div style={styles.menuSectionTitleBlock}>
                          <h3 style={styles.cardTitle}>2. Opções do Menu (Triagem)</h3>
                          <p style={styles.menuSectionHint}>
                             Editor em {MENU_OPTION_GRID_COLUMNS} colunas. «Rastreio público» tenta casar o telefone do WhatsApp com o campo{' '}
                             <em>Telefone do cliente</em> na carga; se não houver correspondência, pede pedido, NF ou CNPJ/CPF e envia o link{' '}
                             <code style={{ fontSize: 11 }}>/acompanhar/…</code>.
                          </p>
                       </div>
                       <button type="button" style={styles.addBtn} onClick={addOption}>
                          <Plus size={16} /> Adicionar Opção
                       </button>
                    </div>
                 </div>

                 <div style={styles.menuSectionBody}>
                    <div className="zaptro-auto-options">
                    {options.map((opt, idx) => (
                      <div key={opt.id} style={styles.optionCard}>
                         <div style={styles.optTop}>
                            <div style={styles.optIndex}>{idx + 1}</div>
                            <input 
                              style={styles.optInput} 
                              value={opt.label}
                              onChange={(e) => setOptions(options.map(o => o.id === opt.id ? {...o, label: e.target.value} : o))} 
                            />
                            <button
                              type="button"
                              aria-label={`Remover opção ${opt.label || opt.keyword}`}
                              style={styles.delBtn}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeOption(opt.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                         </div>
                         
                         <div style={styles.optBody}>
                            <div style={styles.settingRow}>
                               <label style={styles.miniLabel}>AÇÃO AO CLICAR</label>
                               <select 
                                 style={styles.select}
                                 value={opt.action}
                                 onChange={(e) =>
                                   setOptions(
                                     options.map((o) =>
                                       o.id === opt.id
                                         ? { ...o, action: e.target.value as FlowOption['action'] }
                                         : o,
                                     ),
                                   )
                                 }
                               >
                                  <option value="message">Apenas responder (texto fixo)</option>
                                  <option value="routing">Direcionar para setor</option>
                                  <option value="tracking_public">Rastreio — link público (/acompanhar)</option>
                                  <option value="external">Integração externa (API)</option>
                               </select>
                            </div>

                            {opt.action === 'routing' && (
                              <div style={styles.settingRow}>
                                 <label style={styles.miniLabel}>SETOR DESTINO</label>
                                 <select 
                                   style={styles.select}
                                   value={opt.target}
                                   onChange={(e) => setOptions(options.map(o => o.id === opt.id ? {...o, target: e.target.value} : o))}
                                 >
                                    <option value="">Selecione um setor...</option>
                                    {departments.map(d => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                 </select>
                              </div>
                            )}

                            {opt.action === 'tracking_public' && (
                              <div style={styles.settingRow}>
                                <label style={styles.miniLabel}>QUANDO ENCONTRAR CARGA (opcional)</label>
                                <p style={{ margin: '0 0 8px', fontSize: 11, color: '#64748B', fontWeight: 600, lineHeight: 1.45 }}>
                                  Use <code>{'{{link}}'}</code> ou <code>{'{{tracking_link}}'}</code> no texto. Se ficar vazio, o servidor envia uma mensagem padrão com o URL.
                                </p>
                                <textarea
                                  style={styles.miniTextarea}
                                  value={opt.responseWhenFound ?? ''}
                                  onChange={(e) =>
                                    setOptions(
                                      options.map((o) =>
                                        o.id === opt.id ? { ...o, responseWhenFound: e.target.value } : o,
                                      ),
                                    )
                                  }
                                  placeholder="Ex.: ✅ Carga localizada.\n🔗 {{link}}"
                                />
                              </div>
                            )}

                            <div style={styles.settingRow}>
                               <label style={styles.miniLabel}>
                                 {opt.action === 'tracking_public'
                                   ? 'PEDIR DADOS SE NÃO CASAR O TELEFONE'
                                   : 'RESPOSTA DO ROBÔ'}
                               </label>
                               <textarea 
                                  style={styles.miniTextarea}
                                  value={opt.response}
                                  onChange={(e) => setOptions(options.map(o => o.id === opt.id ? {...o, response: e.target.value} : o))}
                               />
                            </div>
                         </div>
                      </div>
                    ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <LogtaModal 
          isOpen={isAiModalOpen} 
          onClose={() => setIsAiModalOpen(false)} 
          title="🧠 Inteligência Logística Avançada" 
          width="500px"
        >
           <div style={styles.aiModal}>
              <div style={styles.aiHeader}>
                 <Bot size={32} color="#CCFF00" />
                 <p style={styles.aiSubtitle}>Aumente a eficiência do seu chatbot com detecção inteligente de termos de transporte.</p>
              </div>
              <div style={styles.aiGrid}>
                 <div style={styles.aiOption}>
                    <div>
                       <strong style={styles.aiLabel}>Detecção Automática de NF</strong>
                       <p style={styles.aiDesc}>Identifica números de 5 a 9 dígitos no meio de frases e consulta o status da carga.</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={aiConfig.detectNf}
                      style={{ ...styles.aiToggle, ...(aiConfig.detectNf ? { backgroundColor: '#CCFF00' } : styles.aiToggleOff) }}
                      onClick={() => setAiConfig({ ...aiConfig, detectNf: !aiConfig.detectNf })}
                    />
                 </div>
                 <div style={styles.aiOption}>
                    <div>
                       <strong style={styles.aiLabel}>Linguagem Natural (NLP)</strong>
                       <p style={styles.aiDesc}>Entende frases como 'cadê minha mercadoria?' sem precisar digitar o número 1.</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={aiConfig.naturalLanguageStatus}
                      style={{
                        ...styles.aiToggle,
                        ...(aiConfig.naturalLanguageStatus ? { backgroundColor: '#CCFF00' } : styles.aiToggleOff),
                      }}
                      onClick={() => setAiConfig({ ...aiConfig, naturalLanguageStatus: !aiConfig.naturalLanguageStatus })}
                    />
                 </div>
              </div>
              <button
                type="button"
                style={styles.aiSaveBtn}
                onClick={() => {
                  const cid = profile?.company_id;
                  if (cid) {
                    try {
                      localStorage.setItem(`zaptro_automation_ai_${cid}`, JSON.stringify(aiConfig));
                    } catch {
                      /* ignore */
                    }
                  }
                  toastSuccess('Motor de inteligência guardado neste browser.');
                  setIsAiModalOpen(false);
                }}
              >
                 Ativar motor e guardar
              </button>
           </div>
        </LogtaModal>
      </div>
  );

  if (hideLayout) {
     return content;
  }

  return (
    <ZaptroLayout>
      {content}
    </ZaptroLayout>
  );
};

const styles: Record<string, any> = {
  container: { padding: '0px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  title: { fontSize: '32px', fontWeight: '950', color: '#000000', margin: 0, letterSpacing: '-1.5px' },
  subtitle: { fontSize: '16px', color: '#64748B', fontWeight: '500', margin: 0 },
  persistHint: {
    margin: '10px 0 0',
    fontSize: '13px',
    color: '#64748B',
    fontWeight: 600,
    lineHeight: 1.5,
    maxWidth: '720px',
  },
  headerActions: { display: 'flex', gap: '12px' },
  primaryBtn: { backgroundColor: '#0F172A', color: 'white', border: 'none', padding: '16px 28px', borderRadius: '16px', fontWeight: '950', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  secondaryBtn: { backgroundColor: 'white', color: '#0F172A', border: '1px solid #E2E8F0', padding: '16px 24px', borderRadius: '16px', fontWeight: '950', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  editorMain: { display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', minWidth: 0, boxSizing: 'border-box' },
  card: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #EBEBEC', overflow: 'hidden' },
  cardHeader: { padding: '24px 32px', borderBottom: '1px solid #EBEBEC', display: 'flex', alignItems: 'center', gap: '16px' },
  iconBox: { width: '44px', height: '44px', backgroundColor: '#FBFBFC', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: '18px', fontWeight: '900', color: '#0F172A', margin: 0 },
  editorArea: { padding: '32px' },
  textarea: { width: '100%', height: '140px', border: 'none', outline: 'none', fontSize: '16px', fontWeight: '600', color: '#1E293B', backgroundColor: '#FBFBFC', padding: '24px', borderRadius: '20px', lineHeight: '1.6', resize: 'none' },
  previewHint: { marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '8px' },
  hintButton: { padding: '12px 20px', backgroundColor: '#FBFBFC', borderRadius: '14px', fontSize: '14px', color: '#0F172A', fontWeight: '950', border: '1px solid #EBEBEC', transition: '0.2s' },
  menuSectionCard: {
    backgroundColor: '#FAFAFB',
    borderRadius: '32px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
    marginTop: '12px',
    boxShadow: '0 12px 40px rgba(15, 23, 42, 0.06)',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  menuSectionHeaderRow: {
    flex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    minWidth: 0,
  },
  menuSectionTitleBlock: { flex: '1 1 220px', minWidth: 0 },
  menuSectionHint: {
    margin: '6px 0 0',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748B',
    lineHeight: 1.45,
    maxWidth: '520px',
  },
  menuSectionBody: { padding: '8px 20px 28px', backgroundColor: '#FFFFFF' },
  addBtn: { backgroundColor: '#CCFF00', color: '#0F172A', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '950', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: '28px',
    border: '1px solid #EBEBEC',
    padding: '24px',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  optTop: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', minWidth: 0 },
  optIndex: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    backgroundColor: '#0F172A',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '950',
    flexShrink: 0,
  },
  optInput: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    fontWeight: '900',
    color: '#0F172A',
  },
  delBtn: { border: 'none', backgroundColor: 'transparent', color: '#52525b', cursor: 'pointer', padding: 6, borderRadius: 10 },
  optBody: { display: 'flex', flexDirection: 'column', gap: '16px' },
  settingRow: { display: 'flex', flexDirection: 'column', gap: '6px' },
  miniLabel: { fontSize: '10px', fontWeight: '950', color: '#000000', letterSpacing: '0.5px' },
  select: { padding: '12px', borderRadius: '12px', border: '1px solid #EBEBEC', fontSize: '13px', fontWeight: '800', outline: 'none', accentColor: '#000', backgroundColor: '#fff', color: '#0F172A' },
  miniTextarea: {
    width: '100%',
    minHeight: '96px',
    border: '1px solid #EBEBEC',
    outline: 'none',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  sideCard: { backgroundColor: 'white', padding: '28px', borderRadius: '32px', border: '1px solid #EBEBEC' },
  sideTitle: { margin: '0 0 16px', fontSize: '14px', fontWeight: '950', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px' },
  sideDesc: { fontSize: '13px', color: '#94A3B8', lineHeight: '1.6', fontWeight: '600', marginBottom: '20px' },
  configItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  configInfo: { display: 'flex', flexDirection: 'column' },
  configLabel: { fontSize: '13px', fontWeight: '850', color: '#0F172A' },
  configDesc: { fontSize: '11px', color: '#94A3B8', fontWeight: '600' },
  tinySelect: { padding: '8px 10px', borderRadius: '10px', border: '1px solid #E4E4E7', fontSize: '11px', fontWeight: '900', accentColor: '#000', backgroundColor: '#fff', color: '#0F172A', boxSizing: 'border-box' },
  proBtn: { width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: '#CCFF00', color: '#0F172A', fontWeight: '950', fontSize: '13px', cursor: 'pointer' },
  simulatorOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  simulatorCard: { width: '400px', height: '600px', backgroundColor: 'white', borderRadius: '40px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  simHeader: { padding: '24px 32px', backgroundColor: '#FBFBFC', borderBottom: '1px solid #EBEBEC', display: 'flex', alignItems: 'center', gap: '16px' },
  simAvatar: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#0F172A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#64748B' },
  simBody: { flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  simMsg: { padding: '14px 20px', borderRadius: '18px', maxWidth: '85%', fontSize: '14px', fontWeight: '700', lineHeight: '1.5' },
  simFooter: { padding: '24px 32px', backgroundColor: '#FBFBFC', borderTop: '1px solid #EBEBEC' },
  simOptions: { display: 'flex', flexDirection: 'column', gap: '8px' },
  simOptBtn: { width: '100%', padding: '14px 24px', backgroundColor: 'white', border: '1px solid #EBEBEC', borderRadius: '16px', fontSize: '13px', fontWeight: '850', color: '#0F172A', textAlign: 'left', cursor: 'pointer' },
  aiModal: { padding: '20px 10px' },
  aiHeader: { textAlign: 'center', marginBottom: '32px' },
  aiSubtitle: { fontSize: '14px', color: '#64748B', fontWeight: '500', marginTop: '12px', lineHeight: '1.5' },
  aiGrid: { display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' },
  aiOption: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FBFBFC', padding: '20px', borderRadius: '20px', border: '1px solid #EBEBEC' },
  aiLabel: { fontSize: '15px', fontWeight: '900', color: '#0F172A', display: 'block', marginBottom: '4px' },
  aiDesc: { fontSize: '12px', color: '#94A3B8', fontWeight: '600', maxWidth: '300px', lineHeight: '1.4' },
  aiToggle: { width: '48px', height: '24px', borderRadius: '24px', border: 'none', cursor: 'pointer', transition: '0.3s' },
  aiToggleOff: { backgroundColor: '#d4d4d8' },
  aiSaveBtn: { width: '100%', padding: '18px', borderRadius: '16px', border: 'none', backgroundColor: '#0F172A', color: 'white', fontWeight: '950', fontSize: '15px', cursor: 'pointer' }
};

export default ZaptroAutomation;
