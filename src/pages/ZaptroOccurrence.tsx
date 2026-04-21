import React, { useState } from 'react';
import { 
  ArrowLeft, MessageCircle, User, Bot, 
  MapPin, Clock, Info, ShieldAlert,
  Star, MessageSquare, Phone, MoreVertical,
  CheckCircle2, AlertCircle, Trash2, Printer, Settings,
  Save, AlertTriangle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { toastSuccess } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import { resolveSessionAvatarUrl } from '../utils/zaptroAvatar';

const ZaptroOccurrence: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile } = useAuth();

  const [adminNote, setAdminNote] = useState('');
  const [savedNotes, setSavedNotes] = useState<any[]>([
    { id: 1, author: 'Admin Master', date: '14/04/2026 15:30', text: 'Bom atendimento, mas poderia ter sido mais ágil no envio do link de rastreio.' }
  ]);

  const occurrence = {
    id: id || 'OCR-5582',
    client: { name: 'Transportadora Silva', phone: '+55 (11) 98877-2211', document: '12.345.678/0001-90' },
    agent: { name: profile?.full_name?.trim() || 'Alison Thiago', role: 'Administrador' },
    summary: {
      duration: '18 min',
      messages: 24,
      score: 4.8,
      status: 'Finalizado'
    },
    timeline: [
      { time: '10:00', type: 'system', text: 'Cliente iniciou a conversa pelo WhatsApp.' },
      { time: '10:00', type: 'bot', text: 'Bot respondeu: "Olá! Selecione uma opção: Rastreio | Fretes"' },
      { time: '10:01', type: 'client', text: 'Selecionou: Rastreio' },
      { time: '10:02', type: 'bot', text: 'Bot solicitou CPF ou CNPJ.' },
      { time: '10:02', type: 'client', text: 'Enviou CNPJ: 12.345.678/0001-90' },
      { time: '10:03', type: 'agent', text: 'Alison assumiu o atendimento manualmente.' },
      { time: '10:05', type: 'agent', text: '"Olá! Verifiquei que sua carga está em trânsito no posto de apoio de Resende-RJ."' },
      { time: '10:10', type: 'driver', text: 'Motorista Marcos alterou status: "CHEGUEI NO DESTINO"' },
      { time: '10:12', type: 'client', text: '"Perfeito! Muito obrigado pela agilidade no retorno."' },
      { time: '10:18', type: 'agent', text: 'Atendimento finalizado com sucesso.' },
    ]
  };

  const agentAvatarUrl = resolveSessionAvatarUrl(profile);

  const handleSaveNote = () => {
    if (!adminNote.trim()) return;
    const newNote = {
      id: Date.now(),
      author: profile?.full_name?.trim() || 'Administrador',
      date: new Date().toLocaleString('pt-BR'),
      text: adminNote
    };
    setSavedNotes([newNote, ...savedNotes]);
    setAdminNote('');
    toastSuccess('Feedback salvo e enviado ao colaborador! 🚀');
  };

  return (
    <ZaptroLayout>
      <div style={styles.container}>
        <header style={styles.header}>
           <button style={styles.backBtn} onClick={() => navigate(-1)}>
             <ArrowLeft size={20} /> Voltar ao Histórico
           </button>
           <div style={styles.headerActions}>
              <button style={styles.printBtn} onClick={() => window.print()}><Printer size={18} /> Imprimir Auditoria</button>
              <button style={styles.deleteBtn}><Trash2 size={18} /> Arquivar Ocorrência</button>
           </div>
        </header>

        <div style={styles.mainGrid}>
           {/* INFO BAR */}
           <div style={styles.infoCol}>
              <div style={styles.summaryCard}>
                 <div style={styles.badge}>DADOS DO CLIENTE</div>
                 <h2 style={styles.clientName}>{occurrence.client.name}</h2>
                 <p style={styles.clientMeta}>{occurrence.client.phone}</p>
                 <p style={styles.clientMeta}>CNPJ: {occurrence.client.document}</p>
                 
                 <div style={styles.divider} />
                 
                 <div style={styles.agentBox}>
                    {agentAvatarUrl ? (
                      <img src={agentAvatarUrl} alt="" style={styles.agentAvatarImg} />
                    ) : (
                      <div style={styles.agentAvatar}>{occurrence.agent.name[0]}</div>
                    )}
                    <div>
                       <span style={styles.label}>ATENDENTE RESPONSÁVEL</span>
                       <strong style={styles.val}>{occurrence.agent.name}</strong>
                       <p style={styles.sub}>{occurrence.agent.role}</p>
                    </div>
                 </div>
              </div>

              {/* FEEDBACKS ADMINISTRATIVOS (NOTAS) */}
              <div style={styles.notesSection}>
                  <h4 style={styles.notesTitle}><AlertTriangle size={16} /> Feedback do Administrador</h4>
                  <div style={styles.notesList}>
                     {savedNotes.length === 0 ? (
                       <p style={styles.noNotes}>Nenhuma nota interna registrada.</p>
                     ) : (
                       savedNotes.map(note => (
                         <div key={note.id} style={styles.noteCard}>
                            <div style={styles.noteHeader}>
                               <span style={styles.noteAuthor}>{note.author}</span>
                               <span style={styles.noteDate}>{note.date}</span>
                            </div>
                            <p style={styles.noteText}>{note.text}</p>
                         </div>
                       ))
                     )}
                  </div>
              </div>

              <div style={styles.metricsGrid}>
                 <div style={styles.metricCard}>
                    <Clock size={18} color="#94A3B8" />
                    <div>
                       <span style={styles.mLabel}>DURAÇÃO</span>
                       <strong style={styles.mVal}>{occurrence.summary.duration}</strong>
                    </div>
                 </div>
                 <div style={styles.metricCard}>
                    <MessageSquare size={18} color="#94A3B8" />
                    <div>
                       <span style={styles.mLabel}>MENSAGENS</span>
                       <strong style={styles.mVal}>{occurrence.summary.messages}</strong>
                    </div>
                 </div>
                 <div style={styles.metricCard}>
                    <Star size={18} color="#FFD700" />
                    <div>
                       <span style={styles.mLabel}>AVALIAÇÃO</span>
                       <strong style={styles.mVal}>{occurrence.summary.score}</strong>
                    </div>
                 </div>
              </div>
           </div>

           {/* TIMELINE */}
           <div style={styles.timelineCol}>
              <div style={styles.timelineHeader}>
                 <h3 style={styles.sectionTitle}>Relatório Detalhado</h3>
                 <span style={styles.idBadge}>ID: {occurrence.id}</span>
              </div>

              <div style={styles.timelineList}>
                 {occurrence.timeline.map((item, idx) => (
                    <div key={idx} style={styles.timelineItem}>
                       <div style={styles.timeMarker}>
                          <span style={styles.timeText}>{item.time}</span>
                          <div style={{
                            ...styles.timeDot, 
                            backgroundColor: item.type === 'agent' ? '#D9FF00' : (item.type === 'bot' ? '#0F172A' : '#E2E8F0')
                          }} />
                       </div>
                       <div style={{
                         ...styles.timelineBubble,
                         backgroundColor: item.type === 'agent' ? '#FBFBFC' : (item.type === 'client' ? '#FFFFFF' : '#FBFBFC'),
                         border: item.type === 'client' ? '1px solid #E2E8F0' : 'none'
                       }}>
                          <div style={styles.bubbleHeader}>
                             <div style={styles.sender}>
                                {item.type === 'agent' && <User size={12} />}
                                {item.type === 'bot' && <Bot size={12} />}
                                {item.type === 'system' && <Settings size={12} />}
                                {item.type.toUpperCase()}
                             </div>
                          </div>
                          <p style={styles.bubbleText}>{item.text}</p>
                       </div>
                    </div>
                 ))}
              </div>

              <div style={styles.observationArea}>
                 <div style={styles.obsCollaboratorCard}>
                    <p style={styles.obsCollaboratorEyebrow}>Observação interna — destinatário</p>
                    <div style={styles.obsCollaboratorRow}>
                       {agentAvatarUrl ? (
                         <img src={agentAvatarUrl} alt="" style={styles.obsCollaboratorAvatar} />
                       ) : (
                         <div style={styles.obsCollaboratorAvatarPh}>{occurrence.agent.name[0]}</div>
                       )}
                       <div style={styles.obsCollaboratorText}>
                          <strong style={styles.obsCollaboratorName}>{occurrence.agent.name}</strong>
                          <span style={styles.obsCollaboratorRole}>{occurrence.agent.role}</span>
                       </div>
                    </div>
                    <p style={styles.obsCollaboratorHint}>
                       Tudo que você escrever abaixo fica ligado a <strong>{occurrence.agent.name.split(' ')[0]}</strong> nesta
                       ocorrência.
                    </p>
                 </div>
                 <div style={styles.obsHeader}>
                    <label style={styles.label}>SUA OBSERVAÇÃO</label>
                    <span style={styles.obsTip}>Visível só para o time interno.</span>
                 </div>
                 <textarea 
                   placeholder={`Ex.: Feedback para ${occurrence.agent.name.split(' ')[0]} — tom de voz, SLA, checklist…`}
                   style={styles.textarea}
                   value={adminNote}
                   onChange={e => setAdminNote(e.target.value)}
                 />
                 <button style={styles.saveNoteBtn} onClick={handleSaveNote}>
                    <Save size={16} /> Salvar comentário
                 </button>
              </div>
           </div>
        </div>
      </div>
    </ZaptroLayout>
  );
};

const styles: Record<string, any> = {
  container: { padding: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  backBtn: { background: 'none', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800', cursor: 'pointer' },
  headerActions: { display: 'flex', gap: '12px' },
  printBtn: { padding: '10px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', background: 'white', color: '#0F172A', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  deleteBtn: { padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#FEE2E2', color: '#EF4444', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },

  mainGrid: { display: 'grid', gridTemplateColumns: '400px 1fr', gap: '48px', alignItems: 'flex-start' },
  
  infoCol: { display: 'flex', flexDirection: 'column', gap: '24px' },
  summaryCard: { backgroundColor: 'white', borderRadius: '32px', padding: '40px', border: '1px solid #F2F4F7' },
  badge: { fontSize: '10px', fontWeight: '950', color: '#94A3B8', letterSpacing: '1px', marginBottom: '16px' },
  clientName: { fontSize: '24px', fontWeight: '950', color: '#000', margin: '0 0 8px 0', letterSpacing: '-1px' },
  clientMeta: { fontSize: '14px', color: '#64748B', fontWeight: '600', margin: '2px 0' },
  divider: { height: '1px', backgroundColor: '#F1F5F9', margin: '32px 0' },
  agentBox: { display: 'flex', alignItems: 'center', gap: '16px' },
  agentAvatar: { width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950' },
  agentAvatarImg: { width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover', display: 'block', flexShrink: 0 },
  label: { fontSize: '10px', fontWeight: '950', color: '#94A3B8', display: 'block', marginBottom: '4px' },
  val: { fontSize: '15px', fontWeight: '900', color: '#000' },
  sub: { fontSize: '12px', color: '#64748B', margin: '2px 0', fontWeight: '500' },

  notesSection: { backgroundColor: 'white', borderRadius: '28px', padding: '32px', border: '1px solid #F1F5F9' },
  notesTitle: { margin: '0 0 20px 0', fontSize: '13px', fontWeight: '950', color: '#000', display: 'flex', alignItems: 'center', gap: '10px' },
  notesList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  noteCard: { padding: '16px', backgroundColor: '#F8F9FA', borderRadius: '16px', borderLeft: '4px solid #D9FF00' },
  noteHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  noteAuthor: { fontSize: '11px', fontWeight: '950', color: '#000' },
  noteDate: { fontSize: '10px', color: '#94A3B8', fontWeight: '600' },
  noteText: { margin: 0, fontSize: '13px', color: '#475569', fontWeight: '500', lineHeight: '1.5' },
  noNotes: { fontSize: '12px', color: '#94A3B8', margin: 0, textAlign: 'center', padding: '10px 0' },

  metricsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' },
  metricCard: { backgroundColor: 'white', padding: '20px 24px', borderRadius: '24px', border: '1px solid #F2F4F7', display: 'flex', alignItems: 'center', gap: '20px' },
  mLabel: { fontSize: '10px', fontWeight: '950', color: '#94A3B8', display: 'block' },
  mVal: { fontSize: '18px', fontWeight: '950', color: '#0F172A' },
  
  timelineCol: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #F2F4F7', padding: '48px' },
  timelineHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  sectionTitle: { fontSize: '22px', fontWeight: '950', color: '#000', margin: 0, letterSpacing: '-0.5px' },
  idBadge: { padding: '6px 14px', backgroundColor: '#FBFBFC', borderRadius: '10px', fontSize: '11px', fontWeight: '900', color: '#64748B' },

  timelineList: { display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' },
  timelineItem: { display: 'flex', gap: '24px' },
  timeMarker: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '50px' },
  timeText: { fontSize: '12px', fontWeight: '850', color: '#475569' },
  timeDot: { width: '10px', height: '10px', borderRadius: '50%', zIndex: 2 },
  
  timelineBubble: { flex: 1, padding: '20px', borderRadius: '24px' },
  bubbleHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  sender: { fontSize: '10px', fontWeight: '950', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' },
  bubbleText: { fontSize: '14px', color: '#1E293B', fontWeight: '500', lineHeight: '1.6', margin: 0 },

  observationArea: { marginTop: '56px', paddingTop: '40px', borderTop: '1px solid #F1F5F9' },
  obsCollaboratorCard: {
    marginBottom: '24px',
    padding: '20px 22px',
    borderRadius: '22px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
  },
  obsCollaboratorEyebrow: {
    margin: '0 0 12px 0',
    fontSize: '10px',
    fontWeight: 950,
    letterSpacing: '0.08em',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  obsCollaboratorRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  obsCollaboratorAvatar: { width: '52px', height: '52px', borderRadius: '16px', objectFit: 'cover', display: 'block', flexShrink: 0 },
  obsCollaboratorAvatarPh: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    backgroundColor: '#000',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 950,
    flexShrink: 0,
  },
  obsCollaboratorText: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  obsCollaboratorName: {
    fontSize: '22px',
    fontWeight: 950,
    color: '#0F172A',
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
  },
  obsCollaboratorRole: { fontSize: '12px', fontWeight: 700, color: '#64748B' },
  obsCollaboratorHint: { margin: '14px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 600, lineHeight: 1.5 },
  obsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  obsTip: { fontSize: '10px', color: '#94A3B8', fontWeight: '600' },
  textarea: { width: '100%', minHeight: '120px', border: '1px solid #E2E8F0', borderRadius: '24px', padding: '20px', fontSize: '14px', fontWeight: '500', outline: 'none', marginBottom: '20px', '&:focus': { borderColor: '#D9FF00' } },
  saveNoteBtn: { padding: '16px 32px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '18px', fontWeight: '950', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }
};

export default ZaptroOccurrence;
