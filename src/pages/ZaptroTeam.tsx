import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus,
  Star,
  Edit2,
  Trash2,
  Mail,
  Search,
  MessageSquare,
  Clock,
  Loader2,
  Info,
  X,
  Check,
  Shield,
  Users,
  Activity,
  Layers,
  Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import ZaptroKpiMetricCard from '../components/Zaptro/ZaptroKpiMetricCard';
import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER } from '../constants/zaptroUi';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import type { Company } from '../types';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { resolveMemberAvatarUrl } from '../utils/zaptroAvatar';
import { isZaptroTenantAdminRole } from '../utils/zaptroPermissions';
import { ZAPTRO_PAGE_PERMISSION_DEFS, sanitizeZaptroPagePermissions } from '../utils/zaptroPagePermissionMap';
import { isZaptroBrandingEntitledByPlan } from '../utils/zaptroBrandingEntitlement';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { formatZaptroDbErrorForToast } from '../utils/zaptroSchemaErrors';
import { useZaptroTheme } from '../context/ZaptroThemeContext';

type MemberRow = {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url?: string | null;
  email?: string | null;
  metadata?: { email?: string } | null;
  permissions?: string[] | null;
};

function assignablePageIds(company: Company | null): string[] {
  return ZAPTRO_PAGE_PERMISSION_DEFS.filter(
    (d) => !d.requiresBrandingPlan || isZaptroBrandingEntitledByPlan(company),
  ).map((d) => d.id);
}

function normalizeMemberPagePerms(raw: string[] | null | undefined, company: Company | null): string[] {
  const allowed = new Set(assignablePageIds(company));
  if (raw == null) return [...allowed];
  return sanitizeZaptroPagePermissions(raw).filter((id) => allowed.has(id));
}

/** Raio proporcional ao ícone do logo (~15px / 46px) num controlo compacto — cantos “Zaptro”, não quadrado cru. */
const ZAPTRO_PERM_CB_SIZE = 20;
const ZAPTRO_PERM_CB_RADIUS = Math.round((ZAPTRO_PERM_CB_SIZE * 15) / 46);

function ZaptroPermCheckbox({
  checked,
  onChange,
  borderColor,
  isDark,
}: {
  checked: boolean;
  onChange: () => void;
  borderColor: string;
  isDark: boolean;
}) {
  return (
    <span
      className="zaptro-perm-cb-wrap"
      style={{
        position: 'relative',
        width: ZAPTRO_PERM_CB_SIZE,
        height: ZAPTRO_PERM_CB_SIZE,
        flexShrink: 0,
        marginTop: 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {
          onChange();
        }}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          margin: 0,
          width: ZAPTRO_PERM_CB_SIZE,
          height: ZAPTRO_PERM_CB_SIZE,
        }}
      />
      <span
        aria-hidden
        style={{
          display: 'flex',
          width: ZAPTRO_PERM_CB_SIZE,
          height: ZAPTRO_PERM_CB_SIZE,
          borderRadius: ZAPTRO_PERM_CB_RADIUS,
          border: `2px solid ${checked ? '#000000' : borderColor}`,
          backgroundColor: checked ? '#D9FF00' : isDark ? '#000000' : '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      >
        {checked ? <Check size={12} color="#000000" strokeWidth={3} aria-hidden /> : null}
      </span>
    </span>
  );
}

type ZaptroTeamProps = { hideLayout?: boolean };

/** Áreas / funções na transportadora (gravadas em `profiles.role`). */
const TEAM_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'agent', label: 'Atendimento (WhatsApp)' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'suporte', label: 'Suporte' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'estrategia', label: 'Estratégia' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'ADMIN', label: 'Administrador da empresa' },
];

/** Alinha com `TEAM_ROLE_OPTIONS[].value` (ex.: `ADMIN` maiúsculo). Evita `<select>` controlado com valor `admin` sem opção correspondente — o gravação falhava ou não persistia o papel. */
function canonicalTeamRoleValue(role: string | null | undefined): string {
  const raw = (role || 'agent').trim();
  if (!raw) return 'agent';
  const found = TEAM_ROLE_OPTIONS.find((o) => o.value.toLowerCase() === raw.toLowerCase());
  return found?.value ?? 'agent';
}

const ZaptroTeamContent: React.FC = () => {
  const navigate = useNavigate();
  const { profile, onlineUsers, refreshProfile } = useAuth();
  const { company } = useTenant();
  const { palette } = useZaptroTheme();
  const [activeTab, setActiveTab] = useState<'members' | 'ranking' | 'permissions'>('members');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'agent',
    pagePerms: [] as string[],
  });

  const [memberDialog, setMemberDialog] = useState<MemberRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role: '', pagePerms: [] as string[] });

  const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null);

  const isDark = palette.mode === 'dark';
  const modalCardBg = isDark ? '#111111' : '#FFFFFF';
  const modalBorder = isDark ? '#334155' : '#E2E8F0';
  const modalText = palette.text;
  const modalMuted = palette.textMuted;

  const loadMembers = useCallback(async () => {
    if (!profile?.company_id) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabaseZaptro
        .from('profiles')
        .select('id, full_name, role, avatar_url, email, metadata, permissions')
        .eq('company_id', profile.company_id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setMembers((data as MemberRow[]) || []);
    } catch {
      notifyZaptro('error', 'Equipe', 'Não foi possível carregar os colaboradores. Atualize a página.');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!memberDialog) return;
    setEditForm({
      full_name: memberDialog.full_name || '',
      email: memberDialog.email || memberDialog.metadata?.email || '',
      role: canonicalTeamRoleValue(memberDialog.role),
      pagePerms: normalizeMemberPagePerms(memberDialog.permissions, company),
    });
  }, [memberDialog, company]);

  useEffect(() => {
    if (!addOpen) return;
    setAddForm((f) => ({ ...f, pagePerms: assignablePageIds(company) }));
  }, [addOpen, company]);

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const mail = (m.email || m.metadata?.email || '').toLowerCase();
    return (m.full_name || '').toLowerCase().includes(q) || mail.includes(q) || (m.role || '').toLowerCase().includes(q);
  });

  const memberIsOnline = useCallback(
    (m: MemberRow) => m.id === profile?.id || onlineUsers.includes(m.id),
    [profile?.id, onlineUsers],
  );

  const rankedMembers = useMemo(() => {
    const roleWeight = (role: string) => {
      const r = (role || '').toUpperCase();
      if (r === 'MASTER') return 100;
      if (r === 'ADMIN') return 85;
      if (r === 'GERENTE') return 65;
      if (r === 'COMERCIAL' || r === 'ESTRATEGIA') return 55;
      return 30;
    };
    return [...filtered].sort((a, b) => {
      const oa = memberIsOnline(a) ? 1 : 0;
      const ob = memberIsOnline(b) ? 1 : 0;
      if (ob !== oa) return ob - oa;
      const ra = roleWeight(a.role);
      const rb = roleWeight(b.role);
      if (rb !== ra) return rb - ra;
      return (a.full_name || '').localeCompare(b.full_name || '', 'pt', { sensitivity: 'base' });
    });
  }, [filtered, memberIsOnline]);

  const pageLabel = useCallback((id: string) => ZAPTRO_PAGE_PERMISSION_DEFS.find((d) => d.id === id)?.label ?? id, []);

  const displayEmail = (m: MemberRow) => m.email || m.metadata?.email || '—';

  const onlineCount = members.filter((m) => m.id === profile?.id || onlineUsers.includes(m.id)).length;

  const roleLabel = useMemo(() => {
    const map = new Map(TEAM_ROLE_OPTIONS.map((o) => [o.value.toLowerCase(), o.label]));
    return (role: string) => map.get(role.toLowerCase()) || role;
  }, []);

  const isTenantAdmin = isZaptroTenantAdminRole(profile?.role);

  const toggleEditPagePerm = useCallback((id: string) => {
    setEditForm((f) => ({
      ...f,
      pagePerms: f.pagePerms.includes(id) ? f.pagePerms.filter((x) => x !== id) : [...f.pagePerms, id],
    }));
  }, []);

  const toggleAddPagePerm = useCallback((id: string) => {
    setAddForm((f) => ({
      ...f,
      pagePerms: f.pagePerms.includes(id) ? f.pagePerms.filter((x) => x !== id) : [...f.pagePerms, id],
    }));
  }, []);

  const saveEdit = async () => {
    if (!memberDialog || !profile?.company_id) return;
    const editedId = memberDialog.id;
    const roleToSave = canonicalTeamRoleValue(editForm.role);
    const permissionsToSave = sanitizeZaptroPagePermissions(editForm.pagePerms);
    try {
      const { data, error } = await supabaseZaptro
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim() || null,
          email: editForm.email.trim() || null,
          role: roleToSave,
          permissions: permissionsToSave,
        })
        .eq('id', editedId)
        .eq('company_id', profile.company_id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        notifyZaptro(
          'error',
          'Nenhuma alteração aplicada',
          'O Supabase não devolveu linha atualizada. Confirme RLS (UPDATE em profiles), coluna permissions e se o colaborador tem o mesmo company_id.',
          { toastId: 'zaptro-equipe-membro-erro' },
        );
        return;
      }
      notifyZaptro('success', 'Permissões guardadas', 'Dados e páginas do colaborador foram gravados no servidor.', {
        toastId: 'zaptro-equipe-membro-salvar',
      });
      setMemberDialog(null);
      await loadMembers();
      if (editedId === profile.id) await refreshProfile();
    } catch (e: unknown) {
      notifyZaptro('error', 'Não foi possível guardar', formatZaptroDbErrorForToast(e, 'Tente novamente ou verifique as permissões no Supabase.'), {
        toastId: 'zaptro-equipe-membro-erro',
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !profile?.company_id) return;
    if (deleteTarget.id === profile.id) {
      notifyZaptro('error', 'Equipe', 'Não é possível remover a sua própria conta daqui.');
      setDeleteTarget(null);
      return;
    }
    try {
      const { error } = await supabaseZaptro.from('profiles').delete().eq('id', deleteTarget.id).eq('company_id', profile.company_id);
      if (error) throw error;
      notifyZaptro('success', 'Colaborador removido', 'O vínculo com a transportadora foi removido.', {
        toastId: 'zaptro-equipe-membro-excluir',
      });
      setDeleteTarget(null);
      await loadMembers();
    } catch (e: unknown) {
      notifyZaptro('error', 'Não foi possível remover', formatZaptroDbErrorForToast(e, 'Verifique as permissões no Supabase.'), {
        toastId: 'zaptro-equipe-membro-excluir-erro',
      });
    }
  };

  const submitAddMember = async () => {
    if (!addForm.full_name.trim() || !addForm.email.trim()) {
      notifyZaptro('info', 'Equipe', 'Preencha nome e e-mail.');
      return;
    }
    notifyZaptro(
      'info',
      'Equipe',
      'Convites com e-mail e senha exigem a função Auth no projeto (convite ou registo). Os campos estão prontos na interface; confirme com o suporte Zaptro para ativar o endpoint de convite.'
    );
    setAddOpen(false);
    setAddForm({ full_name: '', email: '', password: '', role: 'agent', pagePerms: assignablePageIds(company) });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    border: `1px solid ${modalBorder}`,
    backgroundColor: isDark ? '#0f172a' : '#f4f4f4',
    color: modalText,
    fontWeight: 700,
    fontSize: 14,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: '0.08em',
    color: modalMuted,
    marginBottom: 6,
  };

  const body = (
    <div style={styles.container}>
      <style>{`
        .zaptro-perm-cb-wrap:focus-within {
          outline: 2px solid #d9ff00;
          outline-offset: 2px;
          border-radius: ${ZAPTRO_PERM_CB_RADIUS + 6}px;
        }
      `}</style>
      <header style={styles.header}>
        <div>
          <h1 style={{ ...styles.title, color: palette.text }}>Equipe & Performance</h1>
          <p style={{ ...styles.subtitle, color: palette.textMuted }}>Colaboradores da transportadora — permissões e áreas de atuação.</p>
        </div>
        {isTenantAdmin && (
          <button type="button" style={styles.primaryBtn} onClick={() => setAddOpen(true)}>
            <UserPlus size={20} /> ADICIONAR MEMBRO
          </button>
        )}
      </header>

      <div style={styles.infoStrip}>
        <Info size={20} color="#52525b" style={{ flexShrink: 0 }} />
        <p style={styles.infoStripText}>
          Clique no <strong>cartão</strong> do colaborador para ver quem é e quais <strong>páginas do painel</strong> pode usar. O{' '}
          <strong>lápis</strong> (administrador) ajusta dados e permissões. O <strong>relógio</strong> abre o histórico. A <strong>lixeira</strong>{' '}
          remove o vínculo (com confirmação).
        </p>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search size={18} color="#71717a" />
          <input
            style={styles.searchInput}
            placeholder="Buscar por nome, e-mail ou função…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.statsBar}>
        <ZaptroKpiMetricCard
          icon={Users}
          title="TOTAL NA BASE"
          value={loading ? '—' : members.length}
          titleCaps
        />
        <ZaptroKpiMetricCard
          icon={Activity}
          title="NO PAINEL AGORA"
          value={loading ? '—' : onlineCount}
          titleCaps
        />
        <ZaptroKpiMetricCard
          icon={Layers}
          title="FUNÇÕES DISTINTAS"
          value={loading ? '—' : new Set(members.map((m) => m.role)).size}
          titleCaps
        />
        <ZaptroKpiMetricCard
          icon={Trophy}
          title="TOP DO RANKING"
          value={
            rankedMembers[0]
              ? (() => {
                  const w = (rankedMembers[0].full_name || '—').trim().split(/\s+/)[0];
                  return w.length > 12 ? `${w.slice(0, 12)}…` : w;
                })()
              : '—'
          }
          titleCaps
          valueSize={rankedMembers[0] ? 'lg' : 'xl'}
        />
      </div>

      <div
        role="tablist"
        aria-label="Vistas da equipa"
        style={styles.tabBar}
      >
        {(
          [
            { id: 'members' as const, label: 'Membros' },
            { id: 'ranking' as const, label: 'Ranking' },
            { id: 'permissions' as const, label: 'Acessos' },
          ] as const
        ).map(({ id, label }) => {
          const on = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              id={`zaptro-team-tab-${id}`}
              aria-controls={`zaptro-team-panel-${id}`}
              onClick={() => setActiveTab(id)}
              style={{
                ...styles.tabPill,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0,
                border: on ? '1px solid #18181b' : '1px solid transparent',
                backgroundColor: on ? '#ffffff' : 'transparent',
                color: on ? '#000000' : '#71717a',
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p id="zaptro-team-tab-hint" style={styles.tabHint} role="note" aria-live="polite">
        {(
          [
            {
              id: 'members' as const,
              hint: 'Cartões com contacto, presença no painel e atalhos: editar dados, histórico e remover vínculo (admin).',
            },
            {
              id: 'ranking' as const,
              hint: 'Ordem automática: 1) quem está com sessão no painel, 2) função (ex. administrador), 3) nome. «Ver» abre o mesmo detalhe do cartão.',
            },
            {
              id: 'permissions' as const,
              hint: 'Mapa das páginas do Zaptro que cada pessoa pode abrir (Supabase: profiles.permissions). «Editar acessos» grava no servidor.',
            },
          ] as const
        ).find((t) => t.id === activeTab)?.hint}
      </p>

      {activeTab === 'members' && (
        <div
          id="zaptro-team-panel-members"
          role="tabpanel"
          aria-labelledby="zaptro-team-tab-members"
          style={styles.membersGrid}
        >
          {loading ? (
            <div style={styles.loadingBox}>
              <Loader2 className="animate-spin" size={32} color="#64748B" />
              <span>Carregando colaboradores…</span>
            </div>
          ) : !profile?.company_id ? (
            <div style={styles.emptyBox}>Associe uma transportadora ao seu login para listar a equipe.</div>
          ) : filtered.length === 0 ? (
            <div style={styles.emptyBox}>
              Nenhum colaborador encontrado{search.trim() ? ' com esse filtro.' : '.'}
            </div>
          ) : (
            filtered.map((m) => {
              const av = resolveMemberAvatarUrl(
                { id: m.id, avatar_url: m.avatar_url },
                profile?.id,
                profile ? { id: profile.id, avatar_url: profile.avatar_url } : null
              );
              const on = m.id === profile?.id || onlineUsers.includes(m.id);
              return (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  style={{ ...styles.memberCard, cursor: 'pointer' }}
                  onClick={() => setMemberDialog(m)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setMemberDialog(m);
                    }
                  }}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.avatarWrap}>
                      {av ? (
                        <img src={av} alt="" style={styles.avatarImg} />
                      ) : (
                        <div style={styles.avatar}>{(m.full_name || '?')[0].toUpperCase()}</div>
                      )}
                      <div
                        style={{
                          ...styles.statusDot,
                          backgroundColor: on ? '#10B981' : '#94A3B8',
                        }}
                        title={on ? 'Sessão ativa no painel' : 'Fora do painel ou sem presença'}
                      />
                    </div>
                    <div style={styles.mInfo}>
                      <h4 style={styles.mName}>{m.full_name || 'Sem nome'}</h4>
                      <span style={styles.mRole}>{roleLabel(m.role)}</span>
                    </div>
                  </div>
                  <div style={styles.emailRow}>
                    <Mail size={14} color="#94A3B8" />
                    <span style={styles.emailText}>{displayEmail(m)}</span>
                  </div>
                  <div style={styles.mStats}>
                    <div style={styles.mStatItem}>
                      <span>NO PAINEL</span>
                      <strong>{on ? 'Sim' : 'Não'}</strong>
                    </div>
                    <div style={styles.mStatItem}>
                      <span>WHATSAPP</span>
                      <strong>
                        <MessageSquare size={14} style={{ verticalAlign: 'middle' }} /> Equipe
                      </strong>
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    {isTenantAdmin ? (
                      <>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          title="Editar permissões e dados"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberDialog(m);
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          title="Histórico de atendimentos"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(ZAPTRO_ROUTES.HISTORY);
                          }}
                        >
                          <Clock size={16} />
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.iconBtn,
                            color: m.id === profile?.id ? '#E2E8F0' : '#64748B',
                            cursor: m.id === profile?.id ? 'not-allowed' : 'pointer',
                          }}
                          title={m.id === profile?.id ? 'Não pode remover a si mesmo' : 'Excluir permissão / vínculo'}
                          disabled={m.id === profile?.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (m.id !== profile?.id) setDeleteTarget(m);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>Ações restritas ao administrador</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'ranking' && (
        <div
          id="zaptro-team-panel-ranking"
          role="tabpanel"
          aria-labelledby="zaptro-team-tab-ranking"
          style={styles.tabPanel}
        >
          <div style={styles.tabPanelHead}>
            <Star size={22} color="#0f172a" style={{ flexShrink: 0 }} />
            <div>
              <h2 style={styles.tabPanelTitle}>Ranking da equipa</h2>
              <p style={styles.tabPanelLead}>
                Ordenação por <strong>presença no painel</strong>, <strong>função</strong> e nome. Métricas de conversas WhatsApp podem ser
                ligadas ao histórico numa fase seguinte.
              </p>
            </div>
          </div>
          {loading ? (
            <div style={styles.rankingLoading}>
              <Loader2 className="animate-spin" size={28} color="#64748B" />
              <span>A carregar…</span>
            </div>
          ) : !profile?.company_id ? (
            <p style={styles.tabPanelEmpty}>Associe uma transportadora para ver o ranking.</p>
          ) : rankedMembers.length === 0 ? (
            <p style={styles.tabPanelEmpty}>Nenhum colaborador com o filtro actual.</p>
          ) : (
            <ol style={styles.rankingList}>
              {rankedMembers.map((m, idx) => {
                const on = memberIsOnline(m);
                return (
                  <li key={m.id} style={styles.rankingRow}>
                    <span style={styles.rankingPos}>{idx + 1}</span>
                    <div style={styles.rankingMain}>
                      <strong style={styles.rankingName}>{m.full_name || 'Sem nome'}</strong>
                      <span style={styles.rankingMeta}>{roleLabel(m.role)}</span>
                    </div>
                    <div style={styles.rankingActions}>
                      <span
                        style={{
                          ...styles.rankingBadge,
                          backgroundColor: on ? 'rgba(16, 185, 129, 0.12)' : '#f4f4f5',
                          color: on ? '#047857' : '#71717a',
                        }}
                      >
                        {on ? 'No painel' : 'Ausente'}
                      </span>
                      <button type="button" style={styles.rankingOpenBtn} onClick={() => setMemberDialog(m)}>
                        Ver
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {activeTab === 'permissions' && (
        <div
          id="zaptro-team-panel-permissions"
          role="tabpanel"
          aria-labelledby="zaptro-team-tab-permissions"
          style={styles.tabPanel}
        >
          <div style={styles.tabPanelHead}>
            <Shield size={22} color="#0f172a" style={{ flexShrink: 0 }} />
            <div>
              <h2 style={styles.tabPanelTitle}>Acessos ao painel</h2>
              <p style={styles.tabPanelLead}>
                Páginas que cada pessoa pode abrir (gravadas em <strong>profiles.permissions</strong>). O administrador edita no cartão do
                colaborador ou em <strong>Editar</strong> abaixo.
              </p>
            </div>
          </div>
          {loading ? (
            <div style={styles.rankingLoading}>
              <Loader2 className="animate-spin" size={28} color="#64748B" />
              <span>A carregar…</span>
            </div>
          ) : !profile?.company_id ? (
            <p style={styles.tabPanelEmpty}>Associe uma transportadora para listar acessos.</p>
          ) : filtered.length === 0 ? (
            <p style={styles.tabPanelEmpty}>Nenhum colaborador com o filtro actual.</p>
          ) : (
            <div style={styles.accessList}>
              {filtered.map((m) => {
                const perms = normalizeMemberPagePerms(m.permissions, company);
                return (
                  <div key={m.id} style={styles.accessCard}>
                    <div style={styles.accessCardTop}>
                      <div>
                        <strong style={styles.accessName}>{m.full_name || 'Sem nome'}</strong>
                        <div style={styles.accessRole}>{roleLabel(m.role)}</div>
                      </div>
                      <button type="button" style={styles.accessEditBtn} onClick={() => setMemberDialog(m)}>
                        Editar acessos
                      </button>
                    </div>
                    <div style={styles.accessChips}>
                      {perms.length === 0 ? (
                        <span style={styles.accessChipMuted}>Sem páginas atribuídas</span>
                      ) : (
                        perms.map((pid) => (
                          <span key={pid} style={styles.accessChip}>
                            {pageLabel(pid)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {addOpen && (
        <div style={styles.modalOverlay} onClick={() => setAddOpen(false)}>
          <div
            style={{
              ...styles.modalCard,
              ...styles.modalWide,
              backgroundColor: modalCardBg,
              border: `1px solid ${modalBorder}`,
              color: modalText,
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
          >
            <header style={styles.modalHead}>
              <h2 id="add-member-title" style={{ ...styles.modalTitle, color: modalText }}>
                Adicionar colaborador
              </h2>
              <button type="button" style={styles.modalClose} aria-label="Fechar" onClick={() => setAddOpen(false)}>
                <X size={22} color={modalMuted} />
              </button>
            </header>
            <p style={{ ...styles.modalHint, color: modalMuted }}>
              Preencha os dados. A criação da conta por convite depende da configuração Auth do projeto. As páginas marcadas serão as mesmas ids
              gravadas em <strong>profiles.permissions</strong> quando o fluxo de convite estiver ativo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome completo</label>
                <input style={inputStyle} value={addForm.full_name} onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  style={inputStyle}
                  type="email"
                  autoComplete="off"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Senha (definida no primeiro acesso)</label>
                <input
                  style={inputStyle}
                  type="password"
                  autoComplete="new-password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Área / função na transportadora</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {TEAM_ROLE_OPTIONS.filter((o) => o.value !== 'ADMIN').map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Páginas do painel (plano da transportadora)</label>
                <p style={{ ...styles.modalHint, color: modalMuted, marginTop: 0, marginBottom: 6 }}>
                  Quando o convite por Auth estiver ativo, estas caixas definem o que a pessoa poderá abrir após entrar.
                </p>
                <div style={{ ...styles.permCheckGrid, maxHeight: 200 }}>
                  {ZAPTRO_PAGE_PERMISSION_DEFS.filter(
                    (d) => !d.requiresBrandingPlan || isZaptroBrandingEntitledByPlan(company),
                  ).map((d) => (
                    <label key={d.id} style={{ ...styles.permCheckLabel, color: modalText }}>
                      <ZaptroPermCheckbox
                        checked={addForm.pagePerms.includes(d.id)}
                        onChange={() => toggleAddPagePerm(d.id)}
                        borderColor={modalBorder}
                        isDark={isDark}
                      />
                      <span>{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <footer style={styles.modalFooter}>
              <button type="button" style={styles.btnGhost} onClick={() => setAddOpen(false)}>
                Cancelar
              </button>
              <button type="button" style={styles.btnPrimary} onClick={() => void submitAddMember()}>
                Guardar pedido
              </button>
            </footer>
          </div>
        </div>
      )}

      {memberDialog && (
        <div style={styles.modalOverlay} onClick={() => setMemberDialog(null)}>
          <div
            style={{
              ...styles.modalCard,
              ...styles.modalWide,
              backgroundColor: modalCardBg,
              border: `1px solid ${modalBorder}`,
              color: modalText,
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-dialog-title"
          >
            <header style={styles.modalHead}>
              <h2 id="member-dialog-title" style={{ ...styles.modalTitle, color: modalText }}>
                Colaborador
              </h2>
              <button type="button" style={styles.modalClose} aria-label="Fechar" onClick={() => setMemberDialog(null)}>
                <X size={22} color={modalMuted} />
              </button>
            </header>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
              {(() => {
                const av = resolveMemberAvatarUrl(
                  { id: memberDialog.id, avatar_url: memberDialog.avatar_url },
                  profile?.id,
                  profile ? { id: profile.id, avatar_url: profile.avatar_url } : null,
                );
                return av ? (
                  <img src={av} alt="" style={{ width: 52, height: 52, borderRadius: 16, objectFit: 'cover' }} />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: '#000',
                      color: '#D9FF00',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 950,
                      fontSize: 18,
                    }}
                  >
                    {(memberDialog.full_name || '?')[0].toUpperCase()}
                  </div>
                );
              })()}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 950, color: modalText }}>{memberDialog.full_name || 'Sem nome'}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: modalMuted }}>{roleLabel(memberDialog.role)}</p>
                <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 650, color: modalMuted, wordBreak: 'break-word' }}>
                  {displayEmail(memberDialog)}
                </p>
              </div>
            </div>

            <label style={labelStyle}>Páginas do painel</label>
            {isTenantAdmin ? (
              <>
                <p style={{ ...styles.modalHint, color: modalMuted, marginTop: 0, marginBottom: 6 }}>
                  Marque o que esta pessoa pode abrir. A opção de marca só aparece se o plano da transportadora incluir personalização. Ao guardar, a
                  lista fica em <strong>profiles.permissions</strong> no projeto Supabase Zaptro (UPDATE na mesma transportadora).
                </p>
                <div style={{ ...styles.permCheckGrid, marginBottom: 16, maxHeight: 200 }}>
                  {ZAPTRO_PAGE_PERMISSION_DEFS.filter(
                    (d) => !d.requiresBrandingPlan || isZaptroBrandingEntitledByPlan(company),
                  ).map((d) => (
                    <label key={d.id} style={{ ...styles.permCheckLabel, color: modalText }}>
                      <ZaptroPermCheckbox
                        checked={editForm.pagePerms.includes(d.id)}
                        onChange={() => toggleEditPagePerm(d.id)}
                        borderColor={modalBorder}
                        isDark={isDark}
                      />
                      <span>{d.label}</span>
                    </label>
                  ))}
                </div>
              </>
            ) : memberDialog.permissions == null ? (
              <p style={{ ...styles.modalHint, color: modalMuted, marginTop: 0, marginBottom: 16 }}>
                Todas as páginas do plano (configuração legada — sem lista gravada no perfil).
              </p>
            ) : memberDialog.permissions.length === 0 ? (
              <p style={{ ...styles.modalHint, color: modalMuted, marginTop: 0, marginBottom: 16 }}>
                Nenhuma página explícita — o painel fica muito limitado até o administrador atribuir acessos.
              </p>
            ) : (
              <ul
                style={{
                  ...styles.permReadonlyList,
                  margin: '0 0 16px',
                  color: modalMuted,
                }}
              >
                {memberDialog.permissions.map((id) => (
                  <li key={id} style={{ margin: 0 }}>
                    {ZAPTRO_PAGE_PERMISSION_DEFS.find((x) => x.id === id)?.label ?? id}
                  </li>
                ))}
              </ul>
            )}

            {isTenantAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input style={inputStyle} value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Área / função</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    {TEAM_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <footer style={styles.modalFooter}>
              <button type="button" style={styles.btnGhost} onClick={() => setMemberDialog(null)}>
                {isTenantAdmin ? 'Cancelar' : 'Fechar'}
              </button>
              {isTenantAdmin && (
                <button type="button" style={styles.btnPrimary} onClick={() => void saveEdit()}>
                  Salvar alterações
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div
            style={{
              ...styles.deleteCard,
              position: 'relative',
              backgroundColor: modalCardBg,
              border: `1px solid ${modalBorder}`,
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
          >
            <button
              type="button"
              style={{ ...styles.modalClose, position: 'absolute', top: 14, right: 14 }}
              aria-label="Fechar"
              onClick={() => setDeleteTarget(null)}
            >
              <X size={22} color={modalMuted} />
            </button>

            <div style={{ padding: '8px 4px 0', maxWidth: 360, margin: '0 auto' }} aria-hidden>
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: '0 auto 18px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? 'rgba(217, 255, 0, 0.08)' : '#F4F4F5',
                  border: `1px solid ${modalBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={30} color={modalText} strokeWidth={2} />
              </div>
              <h2 id="delete-title" style={{ ...styles.deleteModalTitle, color: modalText }}>
                Remover da equipa?
              </h2>
              <p style={{ margin: '10px 0 0', fontSize: 18, fontWeight: 950, color: modalText, letterSpacing: '-0.02em' }}>
                {deleteTarget.full_name || 'Colaborador'}
              </p>
            </div>

            <p
              id="delete-desc"
              style={{
                margin: '16px auto 0',
                maxWidth: 340,
                fontSize: 13,
                fontWeight: 600,
                color: modalMuted,
                lineHeight: 1.55,
                textAlign: 'center',
              }}
            >
              O vínculo com a transportadora deixa de existir nesta conta. Dependendo da base de dados, a operação pode
              ser irreversível.
            </p>

            <div
              style={{
                marginTop: 26,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                width: '100%',
                maxWidth: 320,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <button type="button" style={styles.btnDeleteZaptro} onClick={() => void confirmDelete()}>
                Remover
              </button>
              <button type="button" style={styles.btnDeleteCancelWide} onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return body;
};

const ZaptroTeam: React.FC<ZaptroTeamProps> = ({ hideLayout = false }) => {
  const inner = <ZaptroTeamContent />;
  if (hideLayout) return inner;
  return <ZaptroLayout>{inner}</ZaptroLayout>;
};

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: 'transparent', width: '100%', minWidth: 0, boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' },
  title: { fontSize: '38px', fontWeight: 950, margin: 0, letterSpacing: '-2px' },
  subtitle: { fontSize: '15px', fontWeight: 600, marginTop: '6px' },
  primaryBtn: {
    backgroundColor: '#000',
    color: '#FFF',
    border: 'none',
    padding: '18px 25px',
    borderRadius: '18px',
    fontWeight: 950,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  infoStrip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '18px 22px',
    borderRadius: '22px',
    backgroundColor: ZAPTRO_FIELD_BG,
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    marginBottom: '28px',
  },
  infoStripText: { margin: 0, fontSize: '13px', fontWeight: 700, color: '#3f3f46', lineHeight: 1.55 },
  toolbar: { marginBottom: '20px', display: 'flex', width: '100%', boxSizing: 'border-box' },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: '1 1 auto',
    width: '100%',
    maxWidth: 'min(100%, 720px)',
    padding: '12px 18px',
    borderRadius: '18px',
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    backgroundColor: ZAPTRO_FIELD_BG,
    boxSizing: 'border-box',
  },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', fontWeight: 700, flex: 1, minWidth: 0 },
  statsBar: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '36px' },
  tabBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#f4f4f5',
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    marginBottom: '28px',
    boxSizing: 'border-box',
  },
  tabPill: {
    padding: '10px 18px',
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 950,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  tabHint: {
    margin: '0 0 20px 0',
    padding: '12px 16px',
    borderRadius: 16,
    backgroundColor: '#fafafa',
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    fontSize: 13,
    fontWeight: 650,
    color: '#52525b',
    lineHeight: 1.5,
    maxWidth: 'min(100%, 920px)',
    boxSizing: 'border-box',
  },
  membersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  loadingBox: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '48px',
    color: '#64748B',
    fontWeight: 800,
    fontSize: '14px',
  },
  emptyBox: { gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#64748B', fontWeight: 700, fontSize: '14px' },
  memberCard: {
    padding: '26px',
    backgroundColor: '#FFF',
    borderRadius: '28px',
    border: '1px solid #EBEBEC',
    boxShadow: ZAPTRO_SHADOW.sm,
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '14px' },
  avatarWrap: { position: 'relative', width: '56px', height: '56px', flexShrink: 0 },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '18px',
    backgroundColor: '#000',
    color: '#D9FF00',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 950,
    flexShrink: 0,
  },
  avatarImg: { width: '56px', height: '56px', borderRadius: '18px', objectFit: 'cover', display: 'block', flexShrink: 0 },
  mInfo: { flex: 1, minWidth: 0 },
  mName: { margin: 0, fontSize: '17px', fontWeight: 950, letterSpacing: '-0.02em' },
  mRole: { fontSize: '11px', color: '#94A3B8', fontWeight: 900 },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid #FFF',
    position: 'absolute',
    bottom: '-1px',
    right: '-1px',
    boxSizing: 'border-box',
  },
  emailRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', minWidth: 0 },
  emailText: { fontSize: '12px', fontWeight: 700, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  mStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#FBFBFC', padding: '16px', borderRadius: '16px', marginBottom: '18px' },
  mStatItem: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', fontWeight: 950, color: '#94A3B8' },
  cardActions: { display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid #EBEBEC' },
  iconBtn: { padding: '10px', background: 'transparent', border: '1px solid #EBEBEC', borderRadius: '12px', cursor: 'pointer', color: '#64748B' },
  placeholderTab: { padding: '48px 24px', textAlign: 'center', color: '#64748B', fontWeight: 700, fontSize: '14px', lineHeight: 1.6 },
  linkBtn: { background: 'none', border: 'none', color: '#000000', fontWeight: 950, cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' },
  tabPanel: {
    padding: '8px 0 24px',
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: 'min(100%, 920px)',
  },
  tabPanelHead: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 22,
    padding: '18px 20px',
    borderRadius: 22,
    backgroundColor: ZAPTRO_FIELD_BG,
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
  },
  tabPanelTitle: { margin: '0 0 8px 0', fontSize: 18, fontWeight: 950, letterSpacing: '-0.3px', color: '#0f172a' },
  tabPanelLead: { margin: 0, fontSize: 13, fontWeight: 650, color: '#52525b', lineHeight: 1.55 },
  tabPanelEmpty: { margin: '24px 0', color: '#64748B', fontWeight: 700, fontSize: 14 },
  rankingLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '32px 0',
    color: '#64748B',
    fontWeight: 800,
    fontSize: 14,
  },
  rankingList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  rankingRow: {
    display: 'grid',
    gridTemplateColumns: '44px minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
    borderRadius: 18,
    border: '1px solid #EBEBEC',
    backgroundColor: '#FFF',
    boxShadow: ZAPTRO_SHADOW.sm,
    boxSizing: 'border-box',
  },
  rankingActions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  rankingPos: {
    fontSize: 18,
    fontWeight: 950,
    color: '#94a3b8',
    textAlign: 'center',
  },
  rankingMain: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  rankingName: { fontSize: 15, fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em' },
  rankingMeta: { fontSize: 12, fontWeight: 700, color: '#71717a' },
  rankingBadge: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.04em',
    padding: '6px 10px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
  },
  rankingOpenBtn: {
    padding: '8px 14px',
    borderRadius: 12,
    border: '1px solid #18181b',
    background: '#fff',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#0f172a',
  },
  accessList: { display: 'flex', flexDirection: 'column', gap: 14 },
  accessCard: {
    padding: '18px 20px',
    borderRadius: 20,
    border: '1px solid #EBEBEC',
    backgroundColor: '#FFF',
    boxShadow: ZAPTRO_SHADOW.sm,
    boxSizing: 'border-box',
  },
  accessCardTop: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  accessName: { fontSize: 16, fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em' },
  accessRole: { fontSize: 12, fontWeight: 700, color: '#71717a', marginTop: 4 },
  accessEditBtn: {
    padding: '10px 16px',
    borderRadius: 14,
    border: 'none',
    background: '#0f172a',
    color: '#fff',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  accessChips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  accessChip: {
    fontSize: 11,
    fontWeight: 800,
    padding: '6px 10px',
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    border: '1px solid #e4e4e7',
    color: '#3f3f46',
    maxWidth: '100%',
    lineHeight: 1.3,
  },
  accessChipMuted: { fontSize: 12, fontWeight: 700, color: '#94a3b8' },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 4000,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  modalWide: { maxWidth: 480 },
  /** Duas colunas, compacto, alinhado à esquerda (modais de permissões). */
  permCheckGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    columnGap: 10,
    rowGap: 4,
    overflowY: 'auto',
    paddingRight: 2,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    justifyItems: 'start',
    alignContent: 'start',
  },
  permCheckLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    cursor: 'pointer',
    fontWeight: 650,
    fontSize: 12,
    lineHeight: 1.3,
    minWidth: 0,
    width: '100%',
    textAlign: 'left',
    boxSizing: 'border-box',
  },
  permReadonlyList: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    columnGap: 10,
    rowGap: 4,
    listStyle: 'none',
    paddingLeft: 0,
    fontWeight: 600,
    fontSize: 12,
    lineHeight: 1.35,
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 28,
    padding: '28px 28px 24px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
    boxSizing: 'border-box',
  },
  deleteCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    padding: '36px 28px 28px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
    boxSizing: 'border-box',
  },
  deleteModalTitle: { margin: 0, fontSize: 17, fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1.2 },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  modalTitle: { margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: '-0.5px' },
  modalHint: { margin: '0 0 20px', fontSize: 13, fontWeight: 600, lineHeight: 1.5 },
  modalClose: { border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, borderRadius: 12, flexShrink: 0 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, flexWrap: 'wrap' },
  btnGhost: {
    padding: '14px 22px',
    borderRadius: 16,
    border: '1px solid #E2E8F0',
    background: 'transparent',
    fontWeight: 900,
    fontSize: 14,
    cursor: 'pointer',
    color: '#64748B',
  },
  btnPrimary: {
    padding: '14px 22px',
    borderRadius: 16,
    border: 'none',
    background: '#0F172A',
    color: '#fff',
    fontWeight: 950,
    fontSize: 14,
    cursor: 'pointer',
  },
  /** Confirmar remoção — padrão visual Zaptro (preto + limão). */
  btnDeleteZaptro: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '15px 20px',
    borderRadius: 16,
    border: 'none',
    background: '#000000',
    color: '#D9FF00',
    fontWeight: 950,
    fontSize: 15,
    cursor: 'pointer',
  },
  btnDeleteCancelWide: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 20px',
    borderRadius: 16,
    border: '1px solid #E2E8F0',
    background: 'transparent',
    color: '#64748B',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  },
};

export default ZaptroTeam;
