import React, { useState } from 'react';
import { 
  ArrowLeft, Phone, MessageSquare, DollarSign, 
  Calendar, Clock, Tag, User, MapPin, 
  MoreHorizontal, Send, ChevronRight, 
  CheckCircle2, XCircle, AlertCircle
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
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header / Back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate(ZAPTRO_ROUTES.CLIENTS)}
            style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${border}`, backgroundColor: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: palette.text }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: palette.text, letterSpacing: '-0.02em' }}>{lead.name}</h1>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316', textTransform: 'uppercase' }}>{lead.stage}</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: palette.textMuted }}>Perfil do Lead · Criado em {new Date(lead.date).toLocaleDateString()}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 24 }}>
          {/* Left Column: Info & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 24, padding: 24, boxShadow: d ? 'none' : ZAPTRO_SHADOW.sm }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#000', color: palette.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
                    {lead.name[0]}
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: palette.text }}>{lead.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: palette.textMuted }}>{lead.phone}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `1px solid ${border}`, paddingTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPin size={16} color={palette.textMuted} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>{lead.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <User size={16} color={palette.textMuted} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>Responsável: {lead.owner}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <DollarSign size={16} color={palette.textMuted} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>Potencial: {lead.value}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {lead.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, backgroundColor: surface2, color: palette.textMuted }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button 
                onClick={() => notifyZaptro('success', 'Convertido!', 'Lead convertido em cliente com sucesso.')}
                style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', backgroundColor: palette.lime, color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <CheckCircle2 size={18} /> Converter em Cliente
              </button>
              <button 
                onClick={() => notifyZaptro('info', 'Orçamento', 'Abrindo editor de orçamento...')}
                style={{ width: '100%', padding: 16, borderRadius: 16, border: `1px solid ${border}`, backgroundColor: surface, color: palette.text, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <DollarSign size={18} /> Novo Orçamento
              </button>
              <button 
                onClick={() => notifyZaptro('warning', 'Arquivado', 'Lead marcado como perdido.')}
                style={{ width: '100%', padding: 14, borderRadius: 16, border: `1px solid ${border}`, backgroundColor: 'transparent', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <XCircle size={16} /> Marcar como Perdido
              </button>
            </div>
          </div>

          {/* Right Column: Interaction History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '700px' }}>
            <div style={{ flex: 1, backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: d ? 'none' : ZAPTRO_SHADOW.sm }}>
              {/* Timeline Header */}
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MessageSquare size={18} color={palette.textMuted} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>Histórico de Interações</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                   <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '4px 10px', borderRadius: 20 }}>WhatsApp Online</span>
                </div>
              </div>

              {/* Timeline Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, backgroundColor: surface2 }}>
                {lead.history.map((item: any) => (
                  <div key={item.id} style={{ alignSelf: item.sender === 'me' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    {item.type === 'msg' ? (
                      <div style={{ padding: '12px 16px', borderRadius: 16, backgroundColor: item.sender === 'me' ? '#000' : surface, color: item.sender === 'me' ? palette.lime : palette.text, border: `1px solid ${border}`, boxShadow: ZAPTRO_SHADOW.xs }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{item.text}</p>
                        <span style={{ display: 'block', textAlign: 'right', fontSize: 10, marginTop: 4, opacity: 0.7 }}>{item.time}</span>
                      </div>
                    ) : item.type === 'note' ? (
                      <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: 'rgba(234, 179, 8, 0.05)', border: '1px dashed #eab308', color: '#854d0e', display: 'flex', gap: 12 }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Nota Interna: {item.text}</p>
                          <span style={{ fontSize: 10, opacity: 0.8 }}>Por {item.author} · {item.time}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid #3b82f6', color: '#1e40af', display: 'flex', gap: 12, alignItems: 'center' }}>
                         <DollarSign size={18} />
                         <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{item.text}</p>
                            <span style={{ fontSize: 10, opacity: 0.8 }}>{item.time}</span>
                         </div>
                         <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div style={{ padding: 20, borderTop: `1px solid ${border}`, backgroundColor: surface }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input 
                    placeholder="Escreva uma mensagem para o lead via WhatsApp..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    style={{ flex: 1, padding: '14px 20px', borderRadius: 16, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.text, fontSize: 14, fontWeight: 600, outline: 'none' }}
                  />
                  <button 
                    onClick={handleSendMessage}
                    style={{ width: 50, height: 50, borderRadius: 16, border: 'none', backgroundColor: '#000', color: palette.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ZaptroLayout>
  );
};

export default ZaptroLeadProfile;
