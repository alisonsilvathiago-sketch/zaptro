import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Phone, 
  Trophy, MessageSquare, Clock, 
  Shield, Star, Activity, BarChart3,
  CheckCircle2, ChevronRight, Search,
  Filter, Calendar
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { useAuth } from '../context/AuthContext';
import { supabaseZaptro } from '../lib/supabase-zaptro';

type TeamMember = {
  id: string;
  full_name: string;
  role: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  stats?: {
    totalAttendances: number;
    closedAttendances: number;
    avgResponseTime: string;
    rating: number;
  };
};

const ZaptroTeamMemberProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { palette } = useZaptroTheme();
  const { profile: currentUser } = useAuth();
  const isDark = palette.mode === 'dark';
  const border = palette.sidebarBorder;
  
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'performance'>('overview');

  useEffect(() => {
    const fetchMember = async () => {
      if (!id) return;
      setLoading(true);
      
      try {
        // In real app, fetch from Supabase
        // const { data, error } = await supabaseZaptro.from('profiles').select('*').eq('id', id).single();
        
        // Demo Data Fallback
        const demoMembers: Record<string, TeamMember> = {
          'agent-001': {
            id: 'agent-001',
            full_name: 'Thiago Silva',
            role: 'Especialista em Logística',
            email: 'thiago.silva@zaptro.com.br',
            phone: '+55 11 98877-0011',
            avatar_url: `https://picsum.photos/seed/agent1/200/200`,
            stats: {
              totalAttendances: 1250,
              closedAttendances: 1242,
              avgResponseTime: '2.5 min',
              rating: 4.9
            }
          },
          'agent-002': {
            id: 'agent-002',
            full_name: 'Alisson Santos',
            role: 'Coordenador de Frota',
            email: 'alisson.santos@zaptro.com.br',
            phone: '+55 11 98877-0022',
            avatar_url: `https://picsum.photos/seed/agent2/200/200`,
            stats: {
              totalAttendances: 980,
              closedAttendances: 975,
              avgResponseTime: '3.1 min',
              rating: 4.8
            }
          },
          'agent-003': {
            id: 'agent-003',
            full_name: 'Marcos Oliveira',
            role: 'Atendimento Premium',
            email: 'marcos.oliveira@zaptro.com.br',
            phone: '+55 11 98877-0033',
            avatar_url: `https://picsum.photos/seed/agent3/200/200`,
            stats: {
              totalAttendances: 1560,
              closedAttendances: 1555,
              avgResponseTime: '1.8 min',
              rating: 5.0
            }
          }
        };

        // Simulating delay
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const found = demoMembers[id];
        if (found) {
          setMember(found);
        } else {
          // If not in demo, try Supabase (simplified here)
          const { data } = await supabaseZaptro.from('profiles').select('id, full_name, role, email, avatar_url').eq('id', id).maybeSingle();
          if (data) {
            setMember({
              id: data.id,
              full_name: data.full_name || 'Usuário Zaptro',
              role: data.role || 'Colaborador',
              email: data.email || '—',
              avatar_url: data.avatar_url || undefined,
              stats: {
                totalAttendances: 45,
                closedAttendances: 42,
                avgResponseTime: '5 min',
                rating: 4.5
              }
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchMember();
  }, [id]);

  if (loading) {
    return (
      <ZaptroLayout>
        <div style={{ padding: 80, textAlign: 'center', color: palette.textMuted }}>
          <Activity className="animate-pulse" size={48} color={palette.lime} style={{ margin: '0 auto 20px' }} />
          <p style={{ fontWeight: 700, fontSize: 16 }}>Sincronizando perfil do colaborador...</p>
        </div>
      </ZaptroLayout>
    );
  }

  if (!member) {
    return (
      <ZaptroLayout>
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Shield size={40} color="#EF4444" />
          </div>
          <h2 style={{ color: palette.text, fontSize: 24, fontWeight: 900 }}>Colaborador não encontrado</h2>
          <p style={{ color: palette.textMuted, marginTop: 8, fontWeight: 600 }}>O ID solicitado não existe ou você não tem permissão para acessá-lo.</p>
          <button 
            onClick={() => navigate(ZAPTRO_ROUTES.TEAM)}
            style={{ marginTop: 32, padding: '14px 28px', backgroundColor: '#000', color: '#D9FF00', borderRadius: 16, border: 'none', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            <ArrowLeft size={18} /> Voltar para Equipe
          </button>
        </div>
      </ZaptroLayout>
    );
  }

  return (
    <ZaptroLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 60px' }}>
        
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => navigate(ZAPTRO_ROUTES.TEAM)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 0',
            background: 'transparent',
            border: 'none',
            color: palette.textMuted,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            marginBottom: 20
          }}
        >
          <ArrowLeft size={18} /> Voltar para Equipe
        </button>

        {/* Header Profile Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: 32, 
          flexWrap: 'wrap',
          marginBottom: 40
        }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                width: 120, 
                height: 120, 
                borderRadius: 36, 
                backgroundColor: '#000', 
                overflow: 'hidden',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: ZAPTRO_SHADOW.lg,
                border: `4px solid ${isDark ? '#1a1a1a' : '#fff'}`
              }}>
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={60} color="#D9FF00" />
                )}
              </div>
              <div style={{ 
                position: 'absolute', 
                bottom: -5, 
                right: -5, 
                width: 32, 
                height: 32, 
                borderRadius: 12, 
                backgroundColor: '#10B981', 
                border: `3px solid ${isDark ? '#1a1a1a' : '#fff'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={16} color="#fff" />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em', color: palette.text }}>
                  {member.full_name}
                </h1>
                <span style={{ 
                  padding: '6px 14px', 
                  borderRadius: 99, 
                  backgroundColor: 'rgba(217, 255, 0, 0.1)', 
                  color: isDark ? '#D9FF00' : '#829900', 
                  fontSize: 11, 
                  fontWeight: 900,
                  letterSpacing: '0.05em'
                }}>
                  {member.role.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: palette.textMuted, fontSize: 14, fontWeight: 600 }}>
                  <Mail size={16} /> {member.email}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: palette.textMuted, fontSize: 14, fontWeight: 600 }}>
                  <Phone size={16} /> {member.phone || '—'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ 
              padding: '14px 24px', 
              borderRadius: 18, 
              backgroundColor: '#000', 
              color: '#D9FF00', 
              border: 'none', 
              fontWeight: 900, 
              fontSize: 14, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 10,
              cursor: 'pointer',
              boxShadow: ZAPTRO_SHADOW.md
            }}>
              <MessageSquare size={18} /> Iniciar Chat Direto
            </button>
          </div>
        </div>

        {/* Premium KPI Bar */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: 24, 
          marginBottom: 40 
        }}>
          <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1px solid ${border}`, borderRadius: 28, padding: 24, boxShadow: ZAPTRO_SHADOW.xs }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <MessageSquare size={18} color={palette.lime} />
              <span style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, letterSpacing: '0.05em' }}>ATENDIMENTOS</span>
            </div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: palette.text }}>{member.stats?.totalAttendances}</p>
          </div>
          <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1px solid ${border}`, borderRadius: 28, padding: 24, boxShadow: ZAPTRO_SHADOW.xs }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <CheckCircle2 size={18} color="#10B981" />
              <span style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, letterSpacing: '0.05em' }}>RESOLVIDOS</span>
            </div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: palette.text }}>{member.stats?.closedAttendances}</p>
          </div>
          <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1px solid ${border}`, borderRadius: 28, padding: 24, boxShadow: ZAPTRO_SHADOW.xs }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Clock size={18} color="#F59E0B" />
              <span style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, letterSpacing: '0.05em' }}>MÉDIA RESPOSTA</span>
            </div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: palette.text }}>{member.stats?.avgResponseTime}</p>
          </div>
          <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1px solid ${border}`, borderRadius: 28, padding: 24, boxShadow: ZAPTRO_SHADOW.xs }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Star size={18} color="#D9FF00" />
              <span style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, letterSpacing: '0.05em' }}>AVALIAÇÃO</span>
            </div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: palette.text }}>{member.stats?.rating} <span style={{ fontSize: 16, color: palette.textMuted }}>/ 5.0</span></p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, borderBottom: `1px solid ${border}`, paddingBottom: 16 }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '10px 24px',
              borderRadius: 14,
              backgroundColor: activeTab === 'overview' ? '#000' : 'transparent',
              color: activeTab === 'overview' ? '#D9FF00' : palette.textMuted,
              fontWeight: 900,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Activity size={16} /> Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 24px',
              borderRadius: 14,
              backgroundColor: activeTab === 'history' ? '#000' : 'transparent',
              color: activeTab === 'history' ? '#D9FF00' : palette.textMuted,
              fontWeight: 900,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Clock size={16} /> Histórico de Atendimentos
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            style={{
              padding: '10px 24px',
              borderRadius: 14,
              backgroundColor: activeTab === 'performance' ? '#000' : 'transparent',
              color: activeTab === 'performance' ? '#D9FF00' : palette.textMuted,
              fontWeight: 900,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Trophy size={16} /> Performance & Ranking
          </button>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 32 }}>
          
          <div style={{ gridColumn: 'span 8' }}>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                
                {/* AI Insights Card */}
                <div style={{ 
                  backgroundColor: '#000', 
                  borderRadius: 32, 
                  padding: 32, 
                  color: '#fff',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#D9FF00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <BarChart3 size={24} color="#000" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>Perfil de Performance</h3>
                      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Análise baseada nos últimos 30 dias</p>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                    {member.full_name} mantém uma taxa de conversão em vendas de <span style={{ color: '#D9FF00', fontWeight: 900 }}>94.2%</span> no CRM. 
                    Seu tempo de resposta é o <span style={{ color: '#D9FF00', fontWeight: 900 }}>2º melhor da equipe</span>. 
                    Sugerimos focar na retenção de leads do setor industrial, onde o ticket médio é maior. 
                    Não há registros de reclamações pendentes.
                  </p>
                </div>

                {/* Details Section */}
                <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff', border: `1px solid ${border}`, borderRadius: 32, padding: 32 }}>
                  <h3 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 900, color: palette.text, letterSpacing: '-0.03em' }}>Informações do Colaborador</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                    <div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>ID DO SISTEMA</label>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text, fontFamily: 'monospace' }}>{member.id}</p>
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>DEPARTAMENTO</label>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>Operacional & Logística</p>
                      </div>
                      <div style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>NÍVEL DE ACESSO</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Shield size={14} color={palette.lime} />
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>Administrador Local</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>ADMISSÃO</label>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>15 de Março, 2023</p>
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>STATUS DA CONTA</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981' }} />
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#10B981' }}>ATIVO NO SISTEMA</p>
                        </div>
                      </div>
                      <div style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>ÚLTIMO LOGIN</label>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>Hoje, há 12 minutos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff', border: `1px solid ${border}`, borderRadius: 32, padding: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: palette.text, letterSpacing: '-0.03em' }}>Log de Atendimentos</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: palette.textMuted, fontWeight: 600 }}>Visualizando as conversas mais recentes</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} color={palette.textMuted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="text" 
                        placeholder="Buscar log..." 
                        style={{ padding: '10px 14px 10px 38px', borderRadius: 12, border: `1px solid ${border}`, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', fontSize: 13, fontWeight: 600, width: 200 }}
                      />
                    </div>
                    <button style={{ padding: '10px', borderRadius: 12, border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer' }}>
                      <Filter size={18} color={palette.textMuted} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { id: 'att-1', client: 'Silva Logística Ltda', date: 'Hoje, 10:45', status: 'Fechado', type: 'Comercial', duration: '12 min' },
                    { id: 'att-2', client: 'Carlos Transportes', date: 'Hoje, 09:12', status: 'Em andamento', type: 'Suporte', duration: '--' },
                    { id: 'att-3', client: 'Indústria ABC Matrizes', date: 'Ontem, 16:20', status: 'Fechado', type: 'Operacional', duration: '45 min' },
                    { id: 'att-4', client: 'Frigorífico Sul PR', date: 'Ontem, 14:05', status: 'Fechado', type: 'Comercial', duration: '8 min' },
                    { id: 'att-5', client: 'Logística Rodoviária SP', date: 'Ontem, 11:30', status: 'Fechado', type: 'Faturamento', duration: '22 min' },
                  ].map((item) => (
                    <div key={item.id} style={{ 
                      padding: '18px 24px', 
                      borderRadius: 20, 
                      border: `1px solid ${border}`, 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : '#fcfcfc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MessageSquare size={20} color={palette.textMuted} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: palette.text }}>{item.client}</p>
                          <p style={{ margin: 0, fontSize: 13, color: palette.textMuted, fontWeight: 600 }}>{item.date} · {item.type}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: palette.textMuted, letterSpacing: '0.05em' }}>DURAÇÃO</p>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.text }}>{item.duration}</p>
                        </div>
                        <div style={{ 
                          padding: '6px 12px', 
                          borderRadius: 10, 
                          backgroundColor: item.status === 'Fechado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: item.status === 'Fechado' ? '#10B981' : '#F59E0B',
                          fontSize: 11,
                          fontWeight: 900
                        }}>
                          {item.status.toUpperCase()}
                        </div>
                        <ChevronRight size={18} color={palette.textMuted} />
                      </div>
                    </div>
                  ))}
                </div>
                
                <button style={{ 
                  marginTop: 32, 
                  width: '100%', 
                  padding: '16px', 
                  borderRadius: 20, 
                  backgroundColor: 'transparent', 
                  border: `1px dashed ${border}`, 
                  color: palette.textMuted, 
                  fontWeight: 900, 
                  fontSize: 13, 
                  cursor: 'pointer' 
                }}>
                  Carregar mais atendimentos...
                </button>
              </div>
            )}

            {activeTab === 'performance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                
                {/* Ranking Card */}
                <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff', border: `1px solid ${border}`, borderRadius: 32, padding: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: palette.text, letterSpacing: '-0.03em' }}>Posição no Ranking Global</h3>
                      <p style={{ margin: '4px 0 0', fontSize: 14, color: palette.textMuted, fontWeight: 600 }}>Baseado em produtividade e satisfação do cliente</p>
                    </div>
                    <div style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#D9FF00', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(217, 255, 0, 0.2)' }}>
                      <span style={{ fontSize: 24, fontWeight: 900, color: '#000' }}>#2</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>Taxa de Resolução</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: palette.lime }}>98%</span>
                       </div>
                       <div style={{ width: '100%', height: 10, borderRadius: 5, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ width: '98%', height: '100%', backgroundColor: palette.lime }} />
                       </div>
                    </div>
                    <div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>Engajamento CRM</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: palette.lime }}>85%</span>
                       </div>
                       <div style={{ width: '100%', height: 10, borderRadius: 5, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ width: '85%', height: '100%', backgroundColor: palette.lime }} />
                       </div>
                    </div>
                    <div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>Pontualidade de Resposta</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: palette.lime }}>92%</span>
                       </div>
                       <div style={{ width: '100%', height: 10, borderRadius: 5, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ width: '92%', height: '100%', backgroundColor: palette.lime }} />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Awards / Achievements */}
                <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff', border: `1px solid ${border}`, borderRadius: 32, padding: 32 }}>
                  <h3 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 900, color: palette.text }}>Conquistas & Selos</h3>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {[
                      { icon: Star, label: 'Nota 5.0 Semanal', bg: 'rgba(217, 255, 0, 0.1)', color: '#829900' },
                      { icon: Trophy, label: 'Top Vendedor Março', bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' },
                      { icon: Activity, label: '1000 Atendimentos', bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981' },
                    ].map((badge, bIdx) => (
                      <div key={bIdx} style={{ padding: '12px 20px', borderRadius: 16, backgroundColor: badge.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <badge.icon size={18} color={badge.color} />
                        <span style={{ fontSize: 13, fontWeight: 900, color: badge.color }}>{badge.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column Sidebar */}
          <div style={{ gridColumn: 'span 4' }}>
             
             {/* Account Security / Activity Card */}
             <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1px solid ${border}`, borderRadius: 32, padding: 28, marginBottom: 24, boxShadow: ZAPTRO_SHADOW.sm }}>
               <h4 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 900, color: palette.text, letterSpacing: '-0.02em' }}>Segurança & Atividade</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={16} color="#10B981" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>Autenticação 2FA</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#10B981' }}>ATIVO</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={16} color={palette.textMuted} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>Membro Desde</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>Mar/23</span>
                 </div>
               </div>
               <div style={{ marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${border}` }}>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: palette.textMuted, fontWeight: 600 }}>
                    Última atividade registrada às 11:36 de um dispositivo <span style={{ color: palette.text }}>Chrome / macOS</span> em São Paulo, BR.
                  </p>
               </div>
             </div>

             {/* Quick Actions Card */}
             <div style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1px solid ${border}`, borderRadius: 32, padding: 28, boxShadow: ZAPTRO_SHADOW.sm }}>
               <h4 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 900, color: palette.text, letterSpacing: '-0.02em' }}>Gestão Administrativa</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button style={{ width: '100%', padding: '12px', borderRadius: 14, border: `1px solid ${border}`, backgroundColor: 'transparent', color: palette.text, fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={16} /> Alterar Permissões
                  </button>
                  <button style={{ width: '100%', padding: '12px', borderRadius: 14, border: `1px solid ${border}`, backgroundColor: 'transparent', color: palette.text, fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BarChart3 size={16} /> Relatório Exportável
                  </button>
                  <button style={{ width: '100%', padding: '12px', borderRadius: 14, border: `1px solid ${border}`, backgroundColor: 'transparent', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    Suspender Acesso
                  </button>
               </div>
             </div>

          </div>
        </div>

      </div>
    </ZaptroLayout>
  );
};

export default ZaptroTeamMemberProfile;
