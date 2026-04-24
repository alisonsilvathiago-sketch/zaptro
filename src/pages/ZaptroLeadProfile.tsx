import React, { useState } from 'react';
import { 
  ArrowLeft, Phone, MessageSquare, DollarSign, 
  Calendar, Clock, Tag, User, MapPin, 
  MoreHorizontal, Send, ChevronRight, 
  CheckCircle2, XCircle, AlertCircle, ArrowRight
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';

const ZaptroLeadProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { palette } = useZaptroTheme();
  const d = palette.mode === 'dark';
  const border = palette.sidebarBorder;
  const surface = d ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const surface2 = d ? 'rgba(255,255,255,0.06)' : '#F8FAFC';

  // Mock Lead Data
  const lead = {
    id: id || 'l1',
    name: 'Transportes Transville',
    phone: '(11) 98877-6655',
    email: 'contato@transville.com.br',
    location: 'São Paulo, SP',
    stage: 'negociacao',
    value: 'R$ 12.500,00',
    date: '2024-04-23',
    tags: ['Urgente', 'Alto Valor', 'Frota Própria'],
    owner: 'Alison Silva',
    history: [
      { id: 1, type: 'msg', sender: 'lead', text: 'Olá, gostaria de um orçamento para transporte de carga refrigerada para o Sul.', time: '10:30' },
      { id: 2, type: 'msg', sender: 'me', text: 'Com certeza! Quais seriam as dimensões e o destino exato?', time: '10:32' },
      { id: 3, type: 'note', text: 'Lead demonstrou interesse em contrato recorrente mensal.', time: '10:45', author: 'Alison' },
      { id: 4, type: 'quote', text: 'Orçamento #4452 enviado: R$ 12.500,00', time: '11:00' },
    ]
  };

  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (!message.trim()) return;
    notifyZaptro('success', 'Mensagem enviada', 'Sua resposta foi enviada via WhatsApp.');
    setMessage('');
  };

  return (
    <ZaptroLayout>
      <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}>
        {/* Header Superior */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button 
              onClick={() => navigate(ZAPTRO_ROUTES.CLIENTS)}
              style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${border}`, backgroundColor: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: palette.text, transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = surface2}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = surface}
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: palette.text, letterSpacing: '-0.04em' }}>{lead.name}</h1>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '5px 12px', borderRadius: 20, backgroundColor: '#000', color: palette.lime, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LEAD</span>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '5px 12px', borderRadius: 20, backgroundColor: 'rgba(249, 115, 22, 0.12)', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lead.stage}</span>
                </div>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 600, color: palette.textMuted }}>Oportunidade gerada em {new Date(lead.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
             <button style={{ padding: '12px 24px', borderRadius: 16, border: `1px solid ${border}`, backgroundColor: surface, color: palette.text, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
               <MoreHorizontal size={18} /> Ações
             </button>
             <button 
                onClick={() => notifyZaptro('success', 'Convertido!', 'Lead convertido em cliente com sucesso.')}
                style={{ padding: '12px 28px', borderRadius: 16, border: 'none', backgroundColor: '#000', color: palette.lime, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              >
                <CheckCircle2 size={18} strokeWidth={2.5} /> Converter Agora
              </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 32, alignItems: 'flex-start' }}>
          {/* Coluna Esquerda: Detalhes e CRM */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Card Principal */}
            <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 28, padding: 32, boxShadow: d ? 'none' : '0 10px 40px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#000', color: palette.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}>
                    {lead.name[0]}
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: 18, fontWeight: 800, color: palette.text, letterSpacing: '-0.02em' }}>{lead.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: palette.textMuted }}>{lead.location}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: '24px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Phone size={18} color={palette.textMuted} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>{lead.phone}</span>
                    </div>
                    <button style={{ padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: '#22c55e', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Ligar</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Tag size={18} color={palette.textMuted} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>{lead.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <User size={18} color={palette.textMuted} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>Dono: {lead.owner}</span>
                  </div>
                </div>

                <div>
                   <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: palette.textMuted, letterSpacing: '0.1em', marginBottom: 16, textTransform: 'uppercase' }}>Potencial de Negócio</label>
                   <div style={{ padding: '20px', borderRadius: 20, backgroundColor: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <DollarSign size={24} color="#f97316" />
                      <span style={{ fontSize: 24, fontWeight: 800, color: '#f97316', letterSpacing: '-0.02em' }}>{lead.value}</span>
                   </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: palette.textMuted, letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>Etiquetas</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {lead.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 10, backgroundColor: surface2, color: palette.text, border: `1px solid ${border}` }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Notes Card */}
            <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 28, padding: 24 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: palette.text }}>Resumo do Lead (AI)</h4>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: palette.textMuted, lineHeight: 1.6 }}>
                Interessado em transporte refrigerado recorrente. Volume estimado de 4 viagens/mês. Orçamento enviado aguardando aprovação da diretoria.
              </p>
            </div>
          </div>

          {/* Coluna Direita: Timeline de Interações */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 780, backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 32, overflow: 'hidden', boxShadow: d ? 'none' : '0 15px 50px rgba(15,23,42,0.05)' }}>
              {/* Header do Chat */}
              <div style={{ padding: '24px 32px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: surface }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.15)' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>Atendimento via WhatsApp</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                   <button style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Calendar size={18} /></button>
                   <button style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Clock size={18} /></button>
                </div>
              </div>

              {/* Feed de Mensagens */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: surface2 }}>
                {lead.history.map((item: any) => (
                  <div key={item.id} style={{ alignSelf: item.sender === 'me' ? 'flex-end' : 'flex-start', maxWidth: '85%', minWidth: '200px' }}>
                    {item.type === 'msg' ? (
                      <div style={{ 
                        padding: '16px 20px', 
                        borderRadius: item.sender === 'me' ? '22px 22px 4px 22px' : '22px 22px 22px 4px', 
                        backgroundColor: item.sender === 'me' ? '#000' : surface, 
                        color: item.sender === 'me' ? palette.lime : palette.text, 
                        border: item.sender === 'me' ? 'none' : `1px solid ${border}`,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                      }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{item.text}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 8, opacity: 0.6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700 }}>{item.sender === 'me' ? 'VOCÊ' : 'LEAD'}</span>
                          <span style={{ fontSize: 10 }}>· {item.time}</span>
                        </div>
                      </div>
                    ) : item.type === 'note' ? (
                      <div style={{ padding: '16px 20px', borderRadius: 20, backgroundColor: 'rgba(234, 179, 8, 0.08)', border: '1px dashed rgba(234, 179, 8, 0.4)', color: '#854d0e', display: 'flex', gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(234, 179, 8, 0.1)' }}>
                          <AlertCircle size={18} color="#eab308" />
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800 }}>Nota de Equipe</p>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{item.text}</p>
                          <span style={{ display: 'block', fontSize: 10, marginTop: 8, opacity: 0.8, fontWeight: 700 }}>{item.author.toUpperCase()} · {item.time}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '16px 20px', borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#1e40af', display: 'flex', gap: 14, alignItems: 'center' }}>
                         <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(59, 130, 246, 0.1)' }}>
                           <DollarSign size={20} color="#3b82f6" />
                         </div>
                         <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800 }}>Documento Enviado</p>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{item.text}</p>
                         </div>
                         <ArrowRight size={18} style={{ marginLeft: 8, opacity: 0.5 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Área de Input de Mensagem */}
              <div style={{ padding: '24px 32px', borderTop: `1px solid ${border}`, backgroundColor: surface }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input 
                      placeholder="Responda ao lead agora..." 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      style={{ width: '100%', padding: '16px 24px', borderRadius: 18, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.text, fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 8 }}>
                       {/* Emojis / Attachments could go here */}
                    </div>
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    style={{ width: 54, height: 54, borderRadius: 18, border: 'none', backgroundColor: '#000', color: palette.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Send size={22} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
          </div>
        </div>
      </div>
    </ZaptroLayout>
  );
};

export default ZaptroLeadProfile;
