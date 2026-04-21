/* @refresh reset */
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Zap,
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  Globe2,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Navigation,
  Truck,
  BarChart3,
  Check,
  Layers,
  Plus,
  ChevronDown,
  Search,
  Bell,
  Shield,
  Phone,
  MoreHorizontal,
  Send,
  Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import SEOManager from '../components/SEOManager';

/** Identidade Zaptro na landing: só 3 cores — preto, branco, limão (#D9FF00 como no dashboard). */
const WHITE = '#ffffff';
const BLACK = '#000000';
const LIME = '#D9FF00';
/** Fotos reais (demo inbox) — assets em /public/assets/idemo/. */
const IDEMO_AVATAR_WOMAN = '/assets/idemo/avatar-logistica-norte.png';
const IDEMO_AVATAR_MAN = '/assets/idemo/avatar-transportes-silva.png';

/** Passos da demo animada (≤900px): cliente (mulher) ↔ equipa sobre transportes; depois reinicia. */
const IDEMO_MOBILE_SCRIPT = [
  { kind: 'typing' as const, side: 'in' as const, ms: 520 },
  { kind: 'msg' as const, side: 'in' as const, text: 'Bom dia — a carga #4482 já tem motorista alocado?', ms: 1550 },
  { kind: 'typing' as const, side: 'out' as const, ms: 480 },
  { kind: 'msg' as const, side: 'out' as const, text: 'Confirmado. Motorista a caminho do CD — ETA 10:20.', ms: 1650 },
  { kind: 'typing' as const, side: 'in' as const, ms: 480 },
  { kind: 'msg' as const, side: 'in' as const, text: 'Precisamos travar a janela até 11h — consegue fechar com o cliente?', ms: 1750 },
  { kind: 'typing' as const, side: 'out' as const, ms: 480 },
  { kind: 'msg' as const, side: 'out' as const, text: 'Sim. Janela confirmada e SLA operacional verde no painel.', ms: 1600 },
  { kind: 'typing' as const, side: 'in' as const, ms: 480 },
  { kind: 'msg' as const, side: 'in' as const, text: 'Comprovante e NF saem automáticos quando bater entrega?', ms: 1700 },
  { kind: 'typing' as const, side: 'out' as const, ms: 480 },
  { kind: 'msg' as const, side: 'out' as const, text: 'Isso. Ao marcar entregue, o PDF e o anexo seguem para o cliente.', ms: 1750 },
  { kind: 'pause' as const, ms: 2000 },
  { kind: 'reset' as const },
] as const;
/** Identidade Ciasul / malha — verdes profundos + limão (sem azul de UI genérico). */
const CIASUL_HUB_BG = '#0a110d';
const CIASUL_WIRE = 'rgba(217, 255, 0, 0.52)';
const CIASUL_WIRE_SOFT = 'rgba(217, 255, 0, 0.2)';
const CIASUL_RING = 'rgba(217, 255, 0, 0.32)';
const CIASUL_RIPPLE_STROKE = 'rgba(217, 255, 0, 0.42)';

/** Ligações curvas (Bezier) entre o hub e o nó — evita traçado só ortogonal. */
function ciasulHubWireCurvedLeft(cx: number, cy: number, half: number): string {
  const tx = cx + half;
  const ty = cy;
  const hx = 428;
  const hy = 200;
  const c1x = hx - 105;
  const c1y = hy;
  const c2x = (hx + tx) * 0.52 - 18;
  const c2y = ty;
  return `M ${hx} ${hy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
}

function ciasulHubWireCurvedRight(cx: number, cy: number, half: number): string {
  const tx = cx - half;
  const ty = cy;
  const hx = 572;
  const hy = 200;
  const c1x = hx + 105;
  const c1y = hy;
  const c2x = (hx + tx) * 0.52 + 18;
  const c2y = ty;
  return `M ${hx} ${hy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
}

/** Mobile vertical: do fundo do tile superior até ao topo do hub. */
function ciasulHubWireMobileTopToHub(
  cx: number,
  cy: number,
  half: number,
  hx: number,
  hy: number,
  hubR: number,
): string {
  const sx = cx;
  const sy = cy + half;
  const tx = hx;
  const ty = hy - hubR;
  const c1x = sx + (tx - sx) * 0.35;
  const c1y = sy + (ty - sy) * 0.55;
  const c2x = tx - (tx - sx) * 0.2;
  const c2y = ty - (ty - sy) * 0.35;
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
}

/** Mobile vertical: do topo do tile inferior até à base do hub. */
function ciasulHubWireMobileBottomToHub(
  cx: number,
  cy: number,
  half: number,
  hx: number,
  hy: number,
  hubR: number,
): string {
  const sx = cx;
  const sy = cy - half;
  const tx = hx;
  const ty = hy + hubR;
  const c1x = sx + (tx - sx) * 0.35;
  const c1y = sy - (sy - ty) * 0.55;
  const c2x = tx - (tx - sx) * 0.2;
  const c2y = ty + (sy - ty) * 0.35;
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
}

const ZtIconSocialX: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width={18} height={18} viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    />
  </svg>
);

const ZtIconSocialLinkedin: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width={18} height={18} viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.35-1.85 3.59 0 4.25 2.36 4.25 5.43v6.31ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45Z"
    />
  </svg>
);

const ZtIconSocialInstagram: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width={18} height={18} viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zm6.162-3.838a3.838 3.838 0 1 0 0 7.676 3.838 3.838 0 0 0 0-7.676zm6.406-3.007a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"
    />
  </svg>
);

const ZtIconSocialFacebook: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width={18} height={18} viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
    />
  </svg>
);

const LP_FAQ_ITEMS = [
  {
    id: 'o-que',
    q: 'O que é a Zaptro?',
    a: 'A Zaptro é uma malha de atendimento no WhatsApp: CRM, equipe, fluxos e conversas num único painel — para a operação fechar vendas e atendimentos sem dispersar conversas em grupos ou planilhas.',
  },
  {
    id: 'quem',
    q: 'Quem pode usar a Zaptro?',
    a: 'Equipas de vendas, suporte e atendimento que falam com clientes no WhatsApp e precisam de histórico e responsáveis claros por etapa — do comercial ao pós-venda.',
  },
  {
    id: 'integra',
    q: 'A Zaptro integra com outras ferramentas?',
    a: 'Sim. No plano Enterprise há API, webhooks e integrações dedicadas; nos restantes planos podes ligar fluxos essenciais e exportar dados para o teu ecossistema.',
  },
  {
    id: 'dados',
    q: 'Os meus dados estão seguros na Zaptro?',
    a: 'Aplicamos boas práticas de acesso, permissões por perfil e registo de atividade. Detalhes legais e de tratamento constam na política de privacidade — fala connosco se precisares de DPA ou requisitos específicos.',
  },
  {
    id: 'personalizar',
    q: 'Posso personalizar a Zaptro para a minha operação?',
    a: 'Sim: pipelines, etiquetas, campos e modelos de mensagem adaptam-se à tua malha. Em Enterprise acrescentamos SLA, SSO e integrações à medida.',
  },
] as const;

const ZaptroMarketing: React.FC = () => {
  const navigate = useNavigate();
  /** Largura do painel no hero (%): menor no topo e vai até 100% conforme o scroll. */
  const [heroDashWidthPct, setHeroDashWidthPct] = useState(84);
  /** Efeito no gancho: ao descer, "Do Zap ao" cresce e "fechamento" encolhe (inverte ao subir). */
  const [heroHookTopScale, setHeroHookTopScale] = useState(1);
  const [heroHookBottomScale, setHeroHookBottomScale] = useState(1);
  const heroScrollRaf = useRef<number>(0);
  const [footerNewsletterEmail, setFooterNewsletterEmail] = useState('');
  const [lpFaqOpenIndex, setLpFaqOpenIndex] = useState<number | null>(null);
  /** Ciclo de faturação exibido nos cartões (referência: toggle mensal/anual). */
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'yearly'>('yearly');

  /** Faixa prelude: 3 frases curtas — ciclo automático; o scroll da página não é interceptado pela roda. */
  const PRELUDE_PHRASES = [
    'Métricas, rotas, WhatsApp',
    'Malha CRM integrada',
    'Visão em tempo real',
  ] as const;
  const [preludeIdx, setPreludeIdx] = useState(0);

  /** Demo inbox (≤900px): uma conversa animada com indicador de digitação. */
  const [idemoNarrowViewport, setIdemoNarrowViewport] = useState(false);
  const [idemoMobileMsgs, setIdemoMobileMsgs] = useState<Array<{ id: number; side: 'in' | 'out'; text: string }>>([]);
  const [idemoTyping, setIdemoTyping] = useState<'in' | 'out' | null>(null);
  const idemoMobileStepRef = useRef(0);
  const idemoMsgIdRef = useRef(0);
  const idemoMobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idemoMsgScrollRef = useRef<HTMLDivElement | null>(null);

  /** Logos de parceiros (assets originais, sem moldura). */
  const trustLogos = [
    { id: 'hitech', name: 'Hitech', src: '/assets/trust/hitech.png' },
    { id: 'penta', name: 'Penta', src: '/assets/trust/penta.png' },
    { id: 'nodes', name: 'Parceiro', src: '/assets/trust/nodes.png' },
    { id: 'mark-blue', name: 'Parceiro', src: '/assets/trust/mark-blue.png' },
    { id: 'pebbles', name: 'Parceiro', src: '/assets/trust/pebbles.png' },
    { id: 'colab', name: 'CoLab', src: '/assets/trust/colab.png' },
  ] as const;
  /** 8 marcas no diagrama hub (mesmos assets da faixa trust). */
  const hubPartnerLogos = [...trustLogos, trustLogos[0], trustLogos[1]];
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = BLACK;
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minPct = 84;
    const maxPct = 100;
    if (reduceMotion) {
      setHeroDashWidthPct(maxPct);
      setHeroHookTopScale(1);
      setHeroHookBottomScale(1);
      return;
    }
    const apply = () => {
      const y = window.scrollY;
      const range = Math.min(window.innerHeight * 0.52, 500);
      const t = Math.min(1, Math.max(0, y / range));
      setHeroDashWidthPct(minPct + t * (maxPct - minPct));
      setHeroHookTopScale(1 + t * 0.42);
      setHeroHookBottomScale(Math.max(0.68, 1 - t * 0.36));
    };
    const onScroll = () => {
      cancelAnimationFrame(heroScrollRaf.current);
      heroScrollRaf.current = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(heroScrollRaf.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-zt-scroll-reveal]'));
    if (!nodes.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((el) => el.style.setProperty('--zt-section-reveal', '1'));
      return;
    }
    const vh = window.innerHeight;
    nodes.forEach((el) => {
      const rect = el.getBoundingClientRect();
      let r = 0;
      if (rect.top < vh && rect.bottom > 0) {
        const visible = Math.max(0, Math.min(rect.bottom, vh) - Math.max(0, rect.top));
        r = Math.min(1, visible / Math.max(88, rect.height * 0.88));
      }
      el.style.setProperty('--zt-section-reveal', String(r));
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-zt-scroll-reveal]'));
    if (!nodes.length) return;
    const thresholds = Array.from({ length: 51 }, (_, i) => i / 50);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          const r = Math.min(1, e.intersectionRatio * 1.14);
          el.style.setProperty('--zt-section-reveal', r.toFixed(4));
        }
      },
      { threshold: thresholds, rootMargin: '8% 0px -8% 0px' },
    );
    nodes.forEach((n) => io.observe(n));
    return () => {
      nodes.forEach((n) => io.unobserve(n));
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const n = PRELUDE_PHRASES.length;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /** Conteúdo deve rodar sempre; só o intervalo fica um pouco mais longo com “reduzir movimento”. */
    const ms = prefersReduce ? 7200 : 5200;
    const t = window.setInterval(() => {
      setPreludeIdx((i) => (i + 1) % n);
    }, ms);
    return () => clearInterval(t);
  }, [PRELUDE_PHRASES.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 900px)');
    const sync = () => setIdemoNarrowViewport(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    const el = idemoMsgScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [idemoMobileMsgs, idemoTyping]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!idemoNarrowViewport) {
      if (idemoMobileTimerRef.current) clearTimeout(idemoMobileTimerRef.current);
      idemoMobileTimerRef.current = null;
      idemoMobileStepRef.current = 0;
      setIdemoMobileMsgs([]);
      setIdemoTyping(null);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIdemoMobileMsgs([]);
      setIdemoTyping(null);
      return;
    }

    let cancelled = false;
    const clearT = () => {
      if (idemoMobileTimerRef.current) clearTimeout(idemoMobileTimerRef.current);
      idemoMobileTimerRef.current = null;
    };

    const run = () => {
      if (cancelled) return;
      const idx = idemoMobileStepRef.current;
      const step = IDEMO_MOBILE_SCRIPT[idx];
      if (!step) {
        idemoMobileStepRef.current = 0;
        idemoMobileTimerRef.current = window.setTimeout(run, 30);
        return;
      }
      if (step.kind === 'typing') {
        setIdemoTyping(step.side);
        idemoMobileTimerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          idemoMobileStepRef.current = idx + 1;
          run();
        }, step.ms);
        return;
      }
      if (step.kind === 'msg') {
        setIdemoTyping(null);
        idemoMsgIdRef.current += 1;
        const id = idemoMsgIdRef.current;
        setIdemoMobileMsgs((m) => [...m, { id, side: step.side, text: step.text }]);
        idemoMobileTimerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          idemoMobileStepRef.current = idx + 1;
          run();
        }, step.ms);
        return;
      }
      if (step.kind === 'pause') {
        setIdemoTyping(null);
        idemoMobileTimerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          idemoMobileStepRef.current = idx + 1;
          run();
        }, step.ms);
        return;
      }
      if (step.kind === 'reset') {
        setIdemoTyping(null);
        setIdemoMobileMsgs([]);
        idemoMobileStepRef.current = 0;
        idemoMobileTimerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          run();
        }, 420);
      }
    };

    idemoMobileStepRef.current = 0;
    setIdemoMobileMsgs([]);
    setIdemoTyping(null);
    idemoMobileTimerRef.current = window.setTimeout(run, 500);

    return () => {
      cancelled = true;
      clearT();
    };
  }, [idemoNarrowViewport]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const onFooterNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = footerNewsletterEmail.trim();
    if (!v) return;
    window.location.href = `mailto:suporte@zaptro.com.br?subject=${encodeURIComponent('Newsletter Zaptro')}&body=${encodeURIComponent(`Quero receber novidades: ${v}`)}`;
  };

  return (
    <div className="zt-page">
      <SEOManager
        title="Zaptro | Gestão de Atendimento SaaS"
        description="Organize atendimento e equipe no WhatsApp, com painel operacional e CRM — para empresas que precisam de controle e escala."
        keywords="zaptro, atendimento, whatsapp, evolution api, crm, waas"
      />

      <div className="zt-open">
        <header className="zt-nav-wrap">
          <nav className="zt-nav-pill" aria-label="Principal">
            <button type="button" className="zt-logo-btn" onClick={() => scrollTo('top')}>
              <span className="zt-logo-mark">
                <Zap size={18} color={BLACK} fill={LIME} />
              </span>
              <span className="zt-brand">Zaptro</span>
            </button>

            <div className="zt-nav-mega-root">
              <div className="zt-nav-mega-item">
                <button type="button" className="zt-nav-mega-trigger" aria-haspopup="true">
                  Soluções
                  <ChevronDown className="zt-nav-mega-chevron" size={16} strokeWidth={2.25} aria-hidden />
                </button>
                <div className="zt-nav-mega-panel" role="region" aria-label="Soluções Zaptro">
                  <div className="zt-nav-mega-panel-inner">
                    <div className="zt-nav-mega-intro">
                      <p className="zt-nav-mega-kicker">O que fazemos</p>
                      <p className="zt-nav-mega-lead">
                        Você sabe o que fazemos: malha de atendimento no WhatsApp — suporte, equipe e CRM alinhados para a
                        equipa fechar entregas com clareza.
                      </p>
                    </div>
                    <ul className="zt-nav-mega-list-col">
                      <li>
                        <button type="button" className="zt-nav-mega-link" onClick={() => scrollTo('trust')}>
                          <span className="zt-nav-mega-link-t">Parceiros &amp; confiança</span>
                          <span className="zt-nav-mega-link-d">Marcas que operam na malha</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="zt-nav-mega-link" onClick={() => scrollTo('nossos-servicos')}>
                          <span className="zt-nav-mega-link-t">Integrações &amp; serviços</span>
                          <span className="zt-nav-mega-link-d">CRM, frota e ferramentas na mesma malha</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="zt-nav-mega-link" onClick={() => scrollTo('capabilities')}>
                          <span className="zt-nav-mega-link-t">Funcionalidades</span>
                          <span className="zt-nav-mega-link-d">Tudo numa só malha operacional</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="zt-nav-mega-item">
                <button type="button" className="zt-nav-mega-trigger" aria-haspopup="true">
                  Produto
                  <ChevronDown className="zt-nav-mega-chevron" size={16} strokeWidth={2.25} aria-hidden />
                </button>
                <div className="zt-nav-mega-panel" role="region" aria-label="Produto">
                  <div className="zt-nav-mega-panel-inner zt-nav-mega-panel-inner--grid">
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('capabilities')}>
                      <span className="zt-nav-mega-tile-t">Malha no WhatsApp</span>
                      <span className="zt-nav-mega-tile-d">Atendimento e filas no canal que a equipa já usa</span>
                    </button>
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('nossos-servicos')}>
                      <span className="zt-nav-mega-tile-t">Hub de integrações</span>
                      <span className="zt-nav-mega-tile-d">Conecta CRM, frota e parceiros</span>
                    </button>
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('equipas')}>
                      <span className="zt-nav-mega-tile-t">Equipas &amp; métricas</span>
                      <span className="zt-nav-mega-tile-d">Clareza para operar e acompanhar</span>
                    </button>
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('planos')}>
                      <span className="zt-nav-mega-tile-t">Planos &amp; preços</span>
                      <span className="zt-nav-mega-tile-d">Malha Start até Enterprise</span>
                    </button>
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('comecar')}>
                      <span className="zt-nav-mega-tile-t">Como começar</span>
                      <span className="zt-nav-mega-tile-d">Passos para entrar na malha</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="zt-nav-mega-item">
                <button type="button" className="zt-nav-mega-trigger" aria-haspopup="true">
                  Indústrias
                  <ChevronDown className="zt-nav-mega-chevron" size={16} strokeWidth={2.25} aria-hidden />
                </button>
                <div className="zt-nav-mega-panel" role="region" aria-label="Indústrias">
                  <div className="zt-nav-mega-panel-inner zt-nav-mega-panel-inner--grid">
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('trust')}>
                      <span className="zt-nav-mega-tile-t">Transporte rodoviário</span>
                      <span className="zt-nav-mega-tile-d">Operação e frota em linha</span>
                    </button>
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('trust')}>
                      <span className="zt-nav-mega-tile-t">Última milha</span>
                      <span className="zt-nav-mega-tile-d">Entregas e comunicação com o cliente</span>
                    </button>
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('trust')}>
                      <span className="zt-nav-mega-tile-t">Distribuição B2B</span>
                      <span className="zt-nav-mega-tile-d">Volumes e janelas combinadas</span>
                    </button>
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('trust')}>
                      <span className="zt-nav-mega-tile-t">Operadores logísticos</span>
                      <span className="zt-nav-mega-tile-d">Malha para várias contas</span>
                    </button>
                    <button type="button" className="zt-nav-mega-tile" onClick={() => scrollTo('trust')}>
                      <span className="zt-nav-mega-tile-t">Retail &amp; food</span>
                      <span className="zt-nav-mega-tile-d">Cadência e SLA no ponto de entrega</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="zt-nav-mega-item">
                <button type="button" className="zt-nav-mega-trigger" aria-haspopup="true">
                  Recursos
                  <ChevronDown className="zt-nav-mega-chevron" size={16} strokeWidth={2.25} aria-hidden />
                </button>
                <div className="zt-nav-mega-panel" role="region" aria-label="Recursos">
                  <div className="zt-nav-mega-panel-inner zt-nav-mega-panel-inner--single">
                    <ul className="zt-nav-mega-list-col">
                      <li>
                        <button type="button" className="zt-nav-mega-link" onClick={() => scrollTo('faq')}>
                          <span className="zt-nav-mega-link-t">Perguntas frequentes</span>
                          <span className="zt-nav-mega-link-d">Respostas sobre planos e operação</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="zt-nav-mega-link" onClick={() => scrollTo('planos')}>
                          <span className="zt-nav-mega-link-t">Planos &amp; facturação</span>
                          <span className="zt-nav-mega-link-d">Mensal ou anual, com transparência</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="zt-nav-mega-link" onClick={() => scrollTo('comecar')}>
                          <span className="zt-nav-mega-link-t">Guia rápido</span>
                          <span className="zt-nav-mega-link-d">Como a tua equipa entra na malha</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="zt-nav-mega-item">
                <button type="button" className="zt-nav-mega-trigger" aria-haspopup="true">
                  Empresa
                  <ChevronDown className="zt-nav-mega-chevron" size={16} strokeWidth={2.25} aria-hidden />
                </button>
                <div className="zt-nav-mega-panel" role="region" aria-label="Empresa">
                  <div className="zt-nav-mega-panel-inner zt-nav-mega-panel-inner--single">
                    <ul className="zt-nav-mega-list-col">
                      <li>
                        <button type="button" className="zt-nav-mega-link" onClick={() => scrollTo('equipas')}>
                          <span className="zt-nav-mega-link-t">Equipas em escala</span>
                          <span className="zt-nav-mega-link-d">Como organizamos a operação</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="zt-nav-mega-link" onClick={() => scrollTo('rodape')}>
                          <span className="zt-nav-mega-link-t">Contacto &amp; newsletter</span>
                          <span className="zt-nav-mega-link-d">Fala connosco e mantém-te a par</span>
                        </button>
                      </li>
                      <li>
                        <a className="zt-nav-mega-link zt-nav-mega-link--external" href="mailto:suporte@zaptro.com.br">
                          <span className="zt-nav-mega-link-t">Suporte</span>
                          <span className="zt-nav-mega-link-d">suporte@zaptro.com.br</span>
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="zt-nav-cta-row">
              <button type="button" className="zt-btn-outline" onClick={() => navigate('/login')}>
                Entrar
              </button>
              <button type="button" className="zt-btn-lime" onClick={() => navigate(ZAPTRO_ROUTES.REGISTER)}>
                Começar grátis
              </button>
            </div>
          </nav>
        </header>

        <section className="zt-hero" id="top">
          <div className="zt-hero-inner">
            <p className="zt-atl-kicker zt-hero-an zt-hero-an-1">
              <Globe2 size={15} strokeWidth={2.2} /> Malha de atendimento no WhatsApp
            </p>
            <h1
              className="zt-hero-headline"
              aria-label="O CRM de WhatsApp que o seu negócio precisa. Rápido, seguro e personalizável."
            >
              <span className="zt-hero-headline-line zt-hero-headline-line--hook zt-hero-an zt-hero-an-2a">
                <span
                  className="zt-hero-hook-row zt-hero-hook-row--top"
                  style={{
                    transform: `scale(${heroHookTopScale})`,
                    transformOrigin: 'center top',
                  }}
                >
                  O CRM de WhatsApp
                </span>
                <span
                  className="zt-hero-hook-row zt-hero-hook-row--bottom"
                  style={{
                    transform: `scale(${heroHookBottomScale})`,
                    transformOrigin: 'center bottom',
                  }}
                >
                  que seu negócio precisa
                </span>
              </span>
              <span className="zt-hero-headline-line zt-hero-headline-line--accent zt-hero-an zt-hero-an-2b">
                Rápido, seguro e personalizável.
              </span>
            </h1>
            <div className="zt-hero-cta zt-hero-an zt-hero-an-3">
              <button type="button" className="zt-btn-black" onClick={() => navigate(ZAPTRO_ROUTES.REGISTER)}>
                Começar grátis <ArrowRight size={18} />
              </button>
              <button type="button" className="zt-btn-ghost" onClick={() => scrollTo('trust')}>
                Ver parceiros <ArrowUpRight size={18} />
              </button>
              <button type="button" className="zt-btn-ghost" onClick={() => scrollTo('capabilities')}>
                Funcionalidades <ArrowDown size={18} />
              </button>
            </div>
            <div className="zt-hero-showcase zt-hero-an zt-hero-an-4">
              <div
                className="zt-hero-dashboard-slot"
                style={{
                  width: `${heroDashWidthPct}%`,
                  maxWidth: '100%',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                <img
                  src="/assets/lp/zaptro-lp-dashboard-showcase.png?v=20260420"
                  alt="Painel Zaptro — início, assistente operacional e métricas"
                  className="zt-hero-dashboard-img"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="zt-dark">
        <div className="zt-mesh-bg" aria-hidden="true">
          <span className="zt-mesh-orb zt-mesh-a" />
          <span className="zt-mesh-orb zt-mesh-b" />
          <span className="zt-mesh-orb zt-mesh-c" />
          <span className="zt-mesh-orb zt-mesh-d" />
                  </div>
        <div className="zt-dark-content">
      <section className="zt-trust" id="trust" data-zt-scroll-reveal>
        <p className="zt-trust-line">Quem já organiza entrega e atendimento na malha Zaptro</p>
        <ul className="zt-trust-logos" aria-label="Empresas (marcas ilustrativas)">
          {trustLogos.map((b) => (
            <li key={b.id} className="zt-trust-logo-card">
              <img className="zt-trust-logo-img" src={b.src} alt={b.name} loading="lazy" decoding="async" />
            </li>
          ))}
        </ul>
      </section>

      <section
        className="zt-services-hub"
        id="nossos-servicos"
        aria-labelledby="zt-services-hub-title"
        data-zt-scroll-reveal
      >
        <div className="zt-services-hub-inner">
          <header className="zt-services-hub-head">
            <h2 id="zt-services-hub-title" className="zt-services-hub-title">
              Pensado para encaixar nas ferramentas que a tua equipa já usa
            </h2>
            <p className="zt-services-hub-lead">
              Conecta, colabora e opera com clareza — CRM, frota e WhatsApp na mesma malha, sem saltar entre sistemas.
            </p>
          </header>
          <div
            className="zt-services-hub-diagram"
            role="img"
            aria-label="Diagrama: Zaptro no centro ligado a oito marcas parceiras"
          >
            <svg
              className="zt-services-hub-svg zt-services-hub-svg--desktop"
              viewBox="0 0 1000 400"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <filter id="zt-services-hub-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {[
                { cx: 62, cy: 52 },
                { cx: 130, cy: 142 },
                { cx: 130, cy: 258 },
                { cx: 62, cy: 348 },
              ].map((p, i) => (
                <path
                  key={`wire-l-${i}`}
                  className="zt-services-hub-path"
                  d={ciasulHubWireCurvedLeft(p.cx, p.cy, 32)}
                  fill="none"
                  stroke={CIASUL_WIRE}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#zt-services-hub-glow)"
                />
              ))}
              {[
                { cx: 938, cy: 52 },
                { cx: 870, cy: 142 },
                { cx: 870, cy: 258 },
                { cx: 938, cy: 348 },
              ].map((p, i) => (
                <path
                  key={`wire-r-${i}`}
                  className="zt-services-hub-path"
                  d={ciasulHubWireCurvedRight(p.cx, p.cy, 32)}
                  fill="none"
                  stroke={CIASUL_WIRE}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#zt-services-hub-glow)"
                />
              ))}
              <g aria-hidden className="zt-services-hub-ripples">
                {[0, 1, 2, 3].map((i) => (
                  <circle
                    key={`hub-ripple-d-${i}`}
                    cx="500"
                    cy="200"
                    r="106"
                    fill="none"
                    stroke={CIASUL_RIPPLE_STROKE}
                    strokeWidth="1.25"
                  >
                    <animate
                      attributeName="r"
                      values="106;118;205"
                      keyTimes="0;0.12;1"
                      dur="2.85s"
                      repeatCount="indefinite"
                      begin={`${i * 0.71}s`}
                      calcMode="spline"
                      keySplines="0.25 0.1 0.25 1; 0.2 0.8 0.2 1"
                    />
                    <animate
                      attributeName="stroke-opacity"
                      values="0;0.55;0"
                      keyTimes="0;0.18;1"
                      dur="2.85s"
                      repeatCount="indefinite"
                      begin={`${i * 0.71}s`}
                    />
                  </circle>
                ))}
              </g>
              <circle cx="500" cy="200" r="112" fill="none" stroke={CIASUL_WIRE_SOFT} strokeWidth="1.5">
                <animate attributeName="r" values="112;120;112" dur="2.75s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.25;0.42;0.25" dur="2.75s" repeatCount="indefinite" />
              </circle>
              <circle cx="500" cy="200" r="98" fill={CIASUL_HUB_BG} stroke={CIASUL_RING} strokeWidth="2">
                <animate attributeName="r" values="98;103;98" dur="2.75s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.9;0.42;0.9" dur="2.75s" repeatCount="indefinite" />
              </circle>
              {[
                { cx: 62, cy: 52 },
                { cx: 130, cy: 142 },
                { cx: 130, cy: 258 },
                { cx: 62, cy: 348 },
              ].map((p, i) => {
                const brand = hubPartnerLogos[i];
                return (
                  <foreignObject key={`hub-l-${brand.id}-${i}`} x={p.cx - 32} y={p.cy - 32} width="64" height="64">
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      className="zt-services-hub-tile"
                      title={brand.name}
                    >
                      <img
                        className="zt-services-hub-logo"
                        src={brand.src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      <span className="zt-services-hub-sr">{brand.name}</span>
                    </div>
                  </foreignObject>
                );
              })}
              {[
                { cx: 938, cy: 52 },
                { cx: 870, cy: 142 },
                { cx: 870, cy: 258 },
                { cx: 938, cy: 348 },
              ].map((p, i) => {
                const brand = hubPartnerLogos[i + 4];
                return (
                  <foreignObject key={`hub-r-${brand.id}-${i}`} x={p.cx - 32} y={p.cy - 32} width="64" height="64">
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      className="zt-services-hub-tile"
                      title={brand.name}
                    >
                      <img
                        className="zt-services-hub-logo"
                        src={brand.src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      <span className="zt-services-hub-sr">{brand.name}</span>
                    </div>
                  </foreignObject>
                );
              })}
              <rect x="446" y="146" width="108" height="108" rx="24" fill={LIME} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              <foreignObject x="454" y="154" width="92" height="92">
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <Zap size={48} color={BLACK} fill="none" strokeWidth={2.4} aria-hidden />
                </div>
              </foreignObject>
            </svg>

            <svg
              className="zt-services-hub-svg zt-services-hub-svg--mobile"
              viewBox="0 0 420 880"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <filter id="zt-services-hub-glow-mob" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {[
                { cx: 48, cy: 88 },
                { cx: 136, cy: 182 },
                { cx: 284, cy: 182 },
                { cx: 372, cy: 88 },
              ].map((p, i) => (
                <path
                  key={`wire-mt-${i}`}
                  className="zt-services-hub-path"
                  d={ciasulHubWireMobileTopToHub(p.cx, p.cy, 28, 210, 440, 46)}
                  fill="none"
                  stroke={CIASUL_WIRE}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#zt-services-hub-glow-mob)"
                />
              ))}
              {[
                { cx: 48, cy: 792 },
                { cx: 136, cy: 698 },
                { cx: 284, cy: 698 },
                { cx: 372, cy: 792 },
              ].map((p, i) => (
                <path
                  key={`wire-mb-${i}`}
                  className="zt-services-hub-path"
                  d={ciasulHubWireMobileBottomToHub(p.cx, p.cy, 28, 210, 440, 46)}
                  fill="none"
                  stroke={CIASUL_WIRE}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#zt-services-hub-glow-mob)"
                />
              ))}
              <g aria-hidden className="zt-services-hub-ripples">
                {[0, 1, 2, 3].map((i) => (
                  <circle
                    key={`hub-ripple-m-${i}`}
                    cx="210"
                    cy="440"
                    r="54"
                    fill="none"
                    stroke={CIASUL_RIPPLE_STROKE}
                    strokeWidth="1.15"
                  >
                    <animate
                      attributeName="r"
                      values="54;60;118"
                      keyTimes="0;0.12;1"
                      dur="2.85s"
                      repeatCount="indefinite"
                      begin={`${i * 0.71}s`}
                      calcMode="spline"
                      keySplines="0.25 0.1 0.25 1; 0.2 0.8 0.2 1"
                    />
                    <animate
                      attributeName="stroke-opacity"
                      values="0;0.52;0"
                      keyTimes="0;0.18;1"
                      dur="2.85s"
                      repeatCount="indefinite"
                      begin={`${i * 0.71}s`}
                    />
                  </circle>
                ))}
              </g>
              <circle cx="210" cy="440" r="58" fill="none" stroke={CIASUL_WIRE_SOFT} strokeWidth="1.5">
                <animate attributeName="r" values="58;64;58" dur="2.75s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.25;0.42;0.25" dur="2.75s" repeatCount="indefinite" />
              </circle>
              <circle cx="210" cy="440" r="50" fill={CIASUL_HUB_BG} stroke={CIASUL_RING} strokeWidth="2">
                <animate attributeName="r" values="50;54;50" dur="2.75s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.9;0.42;0.9" dur="2.75s" repeatCount="indefinite" />
              </circle>
              {[
                { cx: 48, cy: 88 },
                { cx: 136, cy: 182 },
                { cx: 284, cy: 182 },
                { cx: 372, cy: 88 },
              ].map((p, i) => {
                const brand = hubPartnerLogos[i];
                return (
                  <foreignObject key={`hub-mt-${brand.id}-${i}`} x={p.cx - 28} y={p.cy - 28} width="56" height="56">
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      className="zt-services-hub-tile zt-services-hub-tile--mob"
                      title={brand.name}
                    >
                      <img
                        className="zt-services-hub-logo"
                        src={brand.src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      <span className="zt-services-hub-sr">{brand.name}</span>
                    </div>
                  </foreignObject>
                );
              })}
              {[
                { cx: 48, cy: 792 },
                { cx: 136, cy: 698 },
                { cx: 284, cy: 698 },
                { cx: 372, cy: 792 },
              ].map((p, i) => {
                const brand = hubPartnerLogos[i + 4];
                return (
                  <foreignObject key={`hub-mb-${brand.id}-${i}`} x={p.cx - 28} y={p.cy - 28} width="56" height="56">
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      className="zt-services-hub-tile zt-services-hub-tile--mob"
                      title={brand.name}
                    >
                      <img
                        className="zt-services-hub-logo"
                        src={brand.src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      <span className="zt-services-hub-sr">{brand.name}</span>
                    </div>
                  </foreignObject>
                );
              })}
              <rect x="162" y="392" width="96" height="96" rx="22" fill={LIME} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              <foreignObject x="170" y="400" width="80" height="80">
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <Zap size={42} color={BLACK} fill="none" strokeWidth={2.4} aria-hidden />
                </div>
              </foreignObject>
            </svg>
          </div>
        </div>
      </section>

      <section className="zt-bento-features" id="capabilities" aria-labelledby="zt-bento-features-title" data-zt-scroll-reveal>
        <div className="zt-bento-features-inner">
          <h2 id="zt-bento-features-title" className="zt-bento-features-kicker">
            <span className="zt-section-head__plain">Tudo numa só </span>
            <span className="zt-section-head__grad">malha</span>
          </h2>
          <div className="zt-bento-features-grid">
            <article className="zt-bento-cap">
              <h3 className="zt-bento-cap-title">Organização inteligente da operação</h3>
              <p className="zt-bento-cap-sub">
                Crie, categorize e priorize entregas com listas, quadros e linhas do tempo flexíveis.
              </p>
              <div className="zt-bento-mock zt-bento-mock--tasks" aria-hidden="true">
                <div className="zt-bento-mock-head">
                  <span className="zt-bento-mock-total">
                    Total atual: <strong>105</strong> entregas
                  </span>
                  <span className="zt-bento-mock-pill">Ver detalhes</span>
                </div>
                <ul className="zt-bento-status-list">
                  <li>
                    <span className="zt-bento-dot zt-bento-dot--blue" /> Não iniciado
                  </li>
                  <li>
                    <span className="zt-bento-dot zt-bento-dot--purple" /> Em rota
                  </li>
                  <li>
                    <span className="zt-bento-dot zt-bento-dot--orange" /> Aguardando doc.
                  </li>
                  <li>
                    <span className="zt-bento-dot zt-bento-dot--green" /> Entregue
                  </li>
                </ul>
                <div className="zt-bento-segbar" role="presentation">
                  <span className="zt-bento-seg zt-bento-seg--blue" style={{ flex: 0.28 }} />
                  <span className="zt-bento-seg zt-bento-seg--purple" style={{ flex: 0.22 }} />
                  <span className="zt-bento-seg zt-bento-seg--orange" style={{ flex: 0.18 }} />
                  <span className="zt-bento-seg zt-bento-seg--green" style={{ flex: 0.32 }} />
                </div>
              </div>
            </article>

            <article className="zt-bento-cap zt-bento-cap--flow">
              <h3 className="zt-bento-cap-title">Fluxos automatizados</h3>
              <div className="zt-bento-mock zt-bento-mock--flow" aria-hidden="true">
                <div className="zt-bento-flow-label">Cotações</div>
                <div className="zt-bento-flow-card">
                  <div className="zt-bento-flow-title">SP → RJ · graneleiro · janela amanhã</div>
                  <div className="zt-bento-flow-row">
                    <span className="zt-bento-tag-hi">Alta</span>
                    <span className="zt-bento-mini-av">CM</span>
                  </div>
                </div>
                <div className="zt-bento-dashed-add">+ Nova cotação</div>
              </div>
            </article>

            <article className="zt-bento-cap zt-bento-cap--tall">
              <h3 className="zt-bento-cap-title">Arquivos e conversas</h3>
              <p className="zt-bento-cap-sub">
                Centralize anexos, comentários em pedidos e fios de atendimento no mesmo lugar.
              </p>
              <div className="zt-bento-mock zt-bento-mock--chat" aria-hidden="true">
                <div className="zt-bento-chat-top">
                  <span className="zt-bento-chat-title">Novas mensagens</span>
                  <span className="zt-bento-chat-badge">2</span>
                </div>
                <ul className="zt-bento-chat-list">
                  <li>
                    <span className="zt-bento-chat-av">HM</span>
                    <div className="zt-bento-chat-meta">
                      <span className="zt-bento-chat-name">Henrique M.</span>
                      <span className="zt-bento-chat-snippet">Digitando…</span>
                    </div>
                    <span className="zt-bento-chat-time">09:12</span>
                  </li>
                  <li>
                    <span className="zt-bento-chat-av zt-bento-chat-av--b">MR</span>
                    <div className="zt-bento-chat-meta">
                      <span className="zt-bento-chat-name">Moni R.</span>
                      <span className="zt-bento-chat-snippet">Online</span>
                    </div>
                    <span className="zt-bento-chat-time">08:58</span>
                  </li>
                  <li>
                    <span className="zt-bento-chat-av zt-bento-chat-av--c">LP</span>
                    <div className="zt-bento-chat-meta">
                      <span className="zt-bento-chat-name">Liam P.</span>
                      <span className="zt-bento-chat-snippet">NF anexada ✓</span>
                    </div>
                    <span className="zt-bento-chat-time">Ontem</span>
                  </li>
                  <li>
                    <span className="zt-bento-chat-av zt-bento-chat-av--d">AS</span>
                    <div className="zt-bento-chat-meta">
                      <span className="zt-bento-chat-name">Ana S.</span>
                      <span className="zt-bento-chat-snippet">Cliente respondeu</span>
                    </div>
                    <span className="zt-bento-chat-time">Ontem</span>
                  </li>
                </ul>
              </div>
            </article>

            <article className="zt-bento-cap zt-bento-cap--wide">
              <h3 className="zt-bento-cap-title">Acompanhamento em tempo real</h3>
              <p className="zt-bento-cap-sub">
                Prazos, marcos e performance com status ao vivo e indicadores visuais para a equipe.
              </p>
              <div className="zt-bento-mock zt-bento-mock--table" aria-hidden="true">
                <div className="zt-bento-table-cap">Visão de operações</div>
                <div className="zt-bento-table">
                  <div className="zt-bento-table-row zt-bento-table-row--head">
                    <span>Operação</span>
                    <span>Equipe</span>
                  </div>
                  <div className="zt-bento-table-row">
                    <span>Suporte · inbound</span>
                    <span className="zt-bento-table-avs">
                      <span className="zt-bento-tav">A</span>
                      <span className="zt-bento-tav">B</span>
                      <span className="zt-bento-tav">C</span>
                    </span>
                  </div>
                  <div className="zt-bento-table-row">
                    <span>Marketing · campanha Q2</span>
                    <span className="zt-bento-table-avs">
                      <span className="zt-bento-tav">D</span>
                      <span className="zt-bento-tav">E</span>
                    </span>
                  </div>
                  <div className="zt-bento-table-row">
                    <span>App Corlax · ICS</span>
                    <span className="zt-bento-table-avs">
                      <span className="zt-bento-tav">F</span>
                      <span className="zt-bento-tav">G</span>
                      <span className="zt-bento-tav">H</span>
                      <span className="zt-bento-tav">+2</span>
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        className="zt-showcase-prelude"
        aria-label="Destaque do painel"
        data-zt-scroll-reveal
      >
        <div className="zt-showcase-prelude-inner">
          <div
            className="zt-showcase-prelude-cycle"
            role="group"
            aria-roledescription="Destaques"
            aria-live="polite"
            aria-atomic="true"
            aria-label={PRELUDE_PHRASES[preludeIdx]}
          >
            <p
              key={preludeIdx}
              className="zt-showcase-prelude-line zt-showcase-prelude-line--current"
            >
              {PRELUDE_PHRASES[preludeIdx]}
            </p>
          </div>
        </div>
      </section>

      <section className="zt-metric-band" id="equipas" aria-labelledby="zt-metric-band-title" data-zt-scroll-reveal>
        <div className="zt-metric-band-inner">
          <header className="zt-metric-band-head">
            <h2 id="zt-metric-band-title" className="zt-metric-band-title">
              <span className="zt-section-head__plain">Por que as equipas escolhem a </span>
              <span className="zt-section-head__grad">Zaptro</span>
            </h2>
            <p className="zt-metric-band-sub">
              Confiança para organizar entrega e atendimento na malha. Pensado para equipas que precisam de velocidade,
              clareza e controlo operacional.
            </p>
          </header>
          <div className="zt-metric-grid" role="list">
            <article className="zt-metric-card zt-metric-card--glow" role="listitem">
              <div className="zt-metric-card-top">
                <span className="zt-metric-val">40%</span>
                <span className="zt-metric-deco" aria-hidden="true">
                  <span className="zt-metric-deco-dot" />
                </span>
              </div>
              <p className="zt-metric-desc">Menos tempo em follow-up com fluxos e lembretes automatizados na operação.</p>
            </article>
            <article className="zt-metric-card zt-metric-card--solid" role="listitem">
              <div className="zt-metric-card-top">
                <span className="zt-metric-val">3×</span>
                <span className="zt-metric-deco" aria-hidden="true">
                  <span className="zt-metric-deco-dot" />
                </span>
              </div>
              <p className="zt-metric-desc">Mais alinhamento entre comercial, frota e atendimento — tudo no mesmo painel.</p>
            </article>
            <article className="zt-metric-card zt-metric-card--glow" role="listitem">
              <div className="zt-metric-card-top">
                <span className="zt-metric-val">100%</span>
                <span className="zt-metric-deco" aria-hidden="true">
                  <span className="zt-metric-deco-dot" />
                </span>
              </div>
              <p className="zt-metric-desc">Visibilidade em tempo real de rotas, status e gargalos — sem caixa negra.</p>
            </article>
            <article className="zt-metric-card zt-metric-card--solid" role="listitem">
              <div className="zt-metric-card-top">
                <span className="zt-metric-val">10k+</span>
                <span className="zt-metric-deco" aria-hidden="true">
                  <span className="zt-metric-deco-dot" />
                </span>
              </div>
              <p className="zt-metric-desc">Eventos e mensagens processados na malha por equipas em crescimento.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="zt-steps" id="comecar" aria-labelledby="zt-steps-h2" data-zt-scroll-reveal>
        <div className="zt-steps-inner">
          <header className="zt-steps-head">
            <h2 id="zt-steps-h2" className="zt-steps-title">
              <span className="zt-section-head__plain">Comece em 3 passos </span>
              <span className="zt-section-head__grad">simples</span>
            </h2>
            <p className="zt-steps-lead">
              Configure a malha, conecte o WhatsApp e acompanhe entregas — um onboarding guiado para ir rápido, sem complicação.
            </p>
          </header>

          <div className="zt-steps-split">
            <div className="zt-steps-visual-wrap" aria-hidden="true">
              <div className="zt-steps-visual-bg">
                <div className="zt-steps-browser">
                  <div className="zt-steps-browser-chrome">
                    <span className="zt-steps-chrome-dots">
                      <span className="zt-steps-chrome-dot" style={{ background: '#ff5f57' }} />
                      <span className="zt-steps-chrome-dot" style={{ background: '#febc2e' }} />
                      <span className="zt-steps-chrome-dot" style={{ background: '#28c840' }} />
                    </span>
                    <span className="zt-steps-url">app.zaptro.com.br/inicio</span>
                  </div>
                  <div className="zt-steps-browser-body">
                    <aside className="zt-steps-side">
                      <div className="zt-steps-side-mark">
                        <Zap size={16} color={BLACK} fill={LIME} />
                      </div>
                      <nav className="zt-steps-side-nav">
                        <span className="zt-steps-side-item zt-steps-side-item--on">
                          <Inbox size={15} strokeWidth={2.2} /> Inbox
                        </span>
                        <span className="zt-steps-side-item">
                          <LayoutDashboard size={15} strokeWidth={2.2} /> Painel
                        </span>
                        <span className="zt-steps-side-item">
                          <MessageSquare size={15} strokeWidth={2.2} /> Atendimentos
                        </span>
                        <span className="zt-steps-side-item">
                          <Navigation size={15} strokeWidth={2.2} /> Rotas
                        </span>
                        <span className="zt-steps-side-item">
                          <Truck size={15} strokeWidth={2.2} /> Frota
                        </span>
                        <span className="zt-steps-side-item">
                          <BarChart3 size={15} strokeWidth={2.2} /> Métricas
                        </span>
                      </nav>
                    </aside>
                    <div className="zt-steps-main">
                      <div className="zt-steps-main-tabs">
                        <span className="zt-steps-tab zt-steps-tab--on">Quadros</span>
                        <span className="zt-steps-tab">Lista</span>
                      </div>
                      <div className="zt-steps-board">
                        <div className="zt-steps-col-h">A fazer</div>
                        <div className="zt-steps-card-mock">
                          <span className="zt-steps-pill">Comercial</span>
                          <div className="zt-steps-card-t">Cotação · análise competitiva</div>
                          <div className="zt-steps-card-meta">Prazo hoje · SP → BH</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="zt-steps-cards">
              <article className="zt-step-card zt-step-card--featured">
                <div className="zt-step-card-top">
                  <span className="zt-step-num">01</span>
                  <div>
                    <h3 className="zt-step-h">Configuração rápida</h3>
                    <p className="zt-step-p">
                      Crie a empresa, convide a equipe e defina permissões — em poucos minutos você já está na malha.
                    </p>
                  </div>
                </div>
                <div className="zt-step-embed">
                  <div className="zt-step-embed-title">Entrar na Zaptro</div>
                  <button
                    type="button"
                    className="zt-step-embed-btn zt-step-embed-btn--lime"
                    onClick={() => navigate(ZAPTRO_ROUTES.REGISTER)}
                  >
                    Continuar com e-mail
                  </button>
                  <button type="button" className="zt-step-embed-btn zt-step-embed-btn--dark" onClick={() => navigate('/login')}>
                    Continuar com Google
                  </button>
                </div>
              </article>

              <article className="zt-step-card">
                <div className="zt-step-card-top">
                  <span className="zt-step-num">02</span>
                  <div>
                    <h3 className="zt-step-h">Trabalho em conjunto</h3>
                    <p className="zt-step-p">
                      CRM, rotas e atendimento no WhatsApp no mesmo painel — sem planilhas soltas nem grupos perdidos.
                    </p>
                  </div>
                </div>
              </article>

              <article className="zt-step-card">
                <div className="zt-step-card-top">
                  <span className="zt-step-num">03</span>
                  <div>
                    <h3 className="zt-step-h">Acompanhe o progresso</h3>
                    <p className="zt-step-p">
                      Métricas, histórico e rastreio em tempo real para a operação e para o cliente.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="zt-idemo" id="conversar-aqui" aria-labelledby="zt-idemo-h2" data-zt-scroll-reveal>
        <div className="zt-idemo-ring" aria-hidden="true" />
        <div className="zt-idemo-inner">
          <header className="zt-idemo-head">
            <h2 id="zt-idemo-h2" className="zt-idemo-title">
              <span className="zt-section-head__plain">Converse aqui — </span>
              <span className="zt-section-head__grad">inbox e WhatsApp juntos</span>
            </h2>
            <p className="zt-idemo-lead">
              Um painel só para mensagens, status da carga e contexto do cliente — o mesmo recorte visual das equipas que já operam com a Zaptro.
            </p>
          </header>

          <div className="zt-idemo-logos" aria-label="Marcas de exemplo (ilustração)">
            <span className="zt-idemo-logo">
              <span className="zt-idemo-logo-mark">TS</span>
              <span className="zt-idemo-logo-txt">Transportes Silva</span>
            </span>
            <span className="zt-idemo-logo">
              <span className="zt-idemo-logo-mark">LN</span>
              <span className="zt-idemo-logo-txt">Atendimento Central</span>
            </span>
            <span className="zt-idemo-logo">
              <span className="zt-idemo-logo-mark">MR</span>
              <span className="zt-idemo-logo-txt">Malha Rápida</span>
            </span>
            <span className="zt-idemo-logo">
              <span className="zt-idemo-logo-mark">CP</span>
              <span className="zt-idemo-logo-txt">Cargo Prime</span>
            </span>
            <span className="zt-idemo-logo zt-idemo-logo--hide-sm">
              <span className="zt-idemo-logo-mark">VX</span>
              <span className="zt-idemo-logo-txt">Via Express</span>
            </span>
            <span className="zt-idemo-logo zt-idemo-logo--hide-xs">
              <span className="zt-idemo-logo-mark">AG</span>
              <span className="zt-idemo-logo-txt">Agrega Log</span>
            </span>
          </div>

          <div className="zt-idemo-visual-wrap" aria-hidden="true">
            <div className="zt-idemo-visual-bg">
              <div className="zt-idemo-fab">
                <MessageSquare size={22} strokeWidth={2.2} aria-hidden />
              </div>
              <div className="zt-idemo-browser">
                <div className="zt-idemo-browser-chrome">
                  <span className="zt-idemo-chrome-dots">
                    <span className="zt-idemo-chrome-dot" style={{ background: '#ff5f57' }} />
                    <span className="zt-idemo-chrome-dot" style={{ background: '#febc2e' }} />
                    <span className="zt-idemo-chrome-dot" style={{ background: '#28c840' }} />
                  </span>
                  <span className="zt-idemo-url">app.zaptro.com.br/inbox</span>
                </div>

                <div className="zt-idemo-topbar">
                  <span className="zt-idemo-search">
                    <Search size={14} strokeWidth={2.2} aria-hidden />
                    <span>pesquisa</span>
                  </span>
                  <span className="zt-idemo-topbar-actions">
                    <span className="zt-idemo-icon-btn">
                      <Bell size={16} strokeWidth={2.2} aria-hidden />
                    </span>
                    <span className="zt-idemo-pill-safe">
                      <Shield size={14} strokeWidth={2.2} aria-hidden />
                      AMBIENTE SEGURO
                    </span>
                    <span className="zt-idemo-user">
                      <span className="zt-idemo-user-avatar">Z</span>
                      <span className="zt-idemo-user-meta">
                        <span className="zt-idemo-user-name">Zaptro</span>
                        <span className="zt-idemo-user-role">ADM</span>
                      </span>
                    </span>
                  </span>
                </div>

                <div className="zt-idemo-shell">
                  <aside className="zt-idemo-rail">
                    <span className="zt-idemo-rail-item zt-idemo-rail-item--brand" aria-hidden title="Zaptro">
                      <span className="zt-idemo-rail-brand-mark">
                        <Zap size={18} color={BLACK} fill={LIME} aria-hidden />
                      </span>
                    </span>
                    <span className="zt-idemo-rail-item">
                      <LayoutDashboard size={16} strokeWidth={2.2} />
                    </span>
                    <span className="zt-idemo-rail-item zt-idemo-rail-item--on">
                      <Inbox size={16} strokeWidth={2.2} />
                    </span>
                    <span className="zt-idemo-rail-item">
                      <BarChart3 size={16} strokeWidth={2.2} />
                    </span>
                    <span className="zt-idemo-rail-item">
                      <Truck size={16} strokeWidth={2.2} />
                    </span>
                  </aside>

                  <div className="zt-idemo-list">
                    <div className="zt-idemo-list-head">
                      <span className="zt-idemo-ai-pill">
                        <Zap size={12} color={BLACK} fill={LIME} aria-hidden />
                        ZAPTRO PRO INTELLIGENCE ATIVA
                      </span>
                    </div>
                    <div className="zt-idemo-thread zt-idemo-thread--active">
                      <span className="zt-idemo-thread-av">
                        <img
                          className="zt-idemo-av-logo"
                          src={IDEMO_AVATAR_WOMAN}
                          alt=""
                          width={32}
                          height={32}
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      </span>
                      <span className="zt-idemo-thread-body">
                        <span className="zt-idemo-thread-top">
                          <span className="zt-idemo-thread-name">Transportes Silva Ltda</span>
                          <span className="zt-idemo-thread-time">09:41</span>
                        </span>
                        <span className="zt-idemo-thread-snippet">Carga #4482 — confirma janela de coleta?</span>
                      </span>
                    </div>
                    <div className="zt-idemo-thread">
                      <span className="zt-idemo-thread-av zt-idemo-thread-av--b">
                        <img
                          className="zt-idemo-av-logo"
                          src={IDEMO_AVATAR_MAN}
                          alt=""
                          width={32}
                          height={32}
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      </span>
                      <span className="zt-idemo-thread-body">
                        <span className="zt-idemo-thread-top">
                          <span className="zt-idemo-thread-name">Logística Norte</span>
                          <span className="zt-idemo-thread-time">Ontem</span>
                        </span>
                        <span className="zt-idemo-thread-snippet">Comprovante anexado no painel.</span>
                      </span>
                    </div>
                  </div>

                  <div className="zt-idemo-chat">
                    <div className="zt-idemo-chat-head">
                      <span className="zt-idemo-chat-av" aria-hidden>
                        <img
                          className="zt-idemo-chat-av-img"
                          src={IDEMO_AVATAR_WOMAN}
                          alt=""
                          width={36}
                          height={36}
                          decoding="async"
                        />
                      </span>
                      <span className="zt-idemo-chat-title">
                        <span className="zt-idemo-chat-name">
                          Empresa Exemplo Atendimento & CRM Ltda.
                        </span>
                        <span className="zt-idemo-chat-sub">+55 11 9 8000-0000 · online</span>
                      </span>
                      <span className="zt-idemo-chat-tools">
                        <span className="zt-idemo-icon-btn">
                          <Phone size={15} strokeWidth={2.2} aria-hidden />
                        </span>
                        <span className="zt-idemo-icon-btn">
                          <MoreHorizontal size={15} strokeWidth={2.2} aria-hidden />
                        </span>
                      </span>
                    </div>
                    <div className="zt-idemo-chat-badges">
                      <span className="zt-idemo-badge zt-idemo-badge--demo">DEMONSTRAÇÃO</span>
                      <span className="zt-idemo-badge zt-idemo-badge--muted">SLA operacional</span>
                    </div>

                    <div className="zt-idemo-status">
                      <div className="zt-idemo-status-track">
                        <span className="zt-idemo-dot zt-idemo-dot--done">Coletado</span>
                        <span className="zt-idemo-dot zt-idemo-dot--on">Em trânsito</span>
                        <span className="zt-idemo-dot">Entregue</span>
                      </div>
                    </div>

                    <div className="zt-idemo-messages zt-idemo-messages--static">
                      <div className="zt-idemo-bubble zt-idemo-bubble--in">
                        Bom dia — a carga #4482 já tem motorista alocado?
                      </div>
                      <div className="zt-idemo-bubble zt-idemo-bubble--in">
                        Precisamos confirmar a janela até 11h.
                      </div>
                      <div className="zt-idemo-bubble zt-idemo-bubble--out">
                        Confirmado. Motorista a caminho do CD — ETA 10:20.
                      </div>
                    </div>
                    <div
                      className="zt-idemo-messages zt-idemo-messages--live"
                      ref={idemoMsgScrollRef}
                      aria-hidden
                    >
                      {idemoMobileMsgs.map((m) => (
                        <div
                          key={m.id}
                          className={
                            m.side === 'in' ? 'zt-idemo-bubble zt-idemo-bubble--in' : 'zt-idemo-bubble zt-idemo-bubble--out'
                          }
                        >
                          {m.text}
                        </div>
                      ))}
                      {idemoTyping && (
                        <div
                          className={
                            idemoTyping === 'in'
                              ? 'zt-idemo-typing zt-idemo-typing--in'
                              : 'zt-idemo-typing zt-idemo-typing--out'
                          }
                        >
                          <span />
                          <span />
                          <span />
                        </div>
                      )}
                    </div>

                    <div className="zt-idemo-quick">
                      <span>Nova carga</span>
                      <span>Orçamento</span>
                      <span>Comprovante</span>
                    </div>
                    <div className="zt-idemo-composer">
                      <span className="zt-idemo-composer-input">Escreva uma mensagem…</span>
                      <span className="zt-idemo-send">
                        <Send size={16} strokeWidth={2.2} aria-hidden />
                      </span>
                    </div>
                  </div>

                  <aside className="zt-idemo-side">
                    <div className="zt-idemo-side-card">
                      <span className="zt-idemo-side-avatar" aria-hidden>
                        <img
                          className="zt-idemo-av-logo"
                          src={IDEMO_AVATAR_WOMAN}
                          alt=""
                          width={44}
                          height={44}
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      </span>
                      <span className="zt-idemo-side-co">Transportes Silva Ltda</span>
                      <span className="zt-idemo-side-tag">Cliente prioritário</span>
                    </div>
                    <div className="zt-idemo-side-block">
                      <span className="zt-idemo-side-h">
                        <Package size={14} strokeWidth={2.2} aria-hidden />
                        Documentos
                      </span>
                      <span className="zt-idemo-doc">Nota fiscal</span>
                      <span className="zt-idemo-doc">Fotos da carga</span>
                    </div>
                    <div className="zt-idemo-side-block">
                      <span className="zt-idemo-side-h">Resumo logístico</span>
                      <p className="zt-idemo-side-p">SP → BH · trânsito · previsão entrega hoje 18h.</p>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="zt-pricing" id="planos" aria-labelledby="zt-pricing-title zt-lp-faq-title" data-zt-scroll-reveal>
        <div className="zt-pricing-ambient" aria-hidden="true" />
        <div className="zt-pricing-inner zt-wrap">
          <header className="zt-pricing-head">
            <div className="zt-pricing-eyebrow">
              <Layers size={14} strokeWidth={2.2} aria-hidden />
              Planos e preços
            </div>
            <h2 id="zt-pricing-title" className="zt-pricing-title zt-pricing-title--hero">
              <span className="zt-section-head__plain">Planos pensados para escalar com a </span>
              <span className="zt-section-head__grad">tua organização</span>
            </h2>
            <p className="zt-pricing-lead">
              Simplifica o fluxo de trabalho e mantém a equipa focada em resultado — não em complexidade.
            </p>
            <div className="zt-pricing-toggle" role="group" aria-label="Ciclo de faturação">
              <button
                type="button"
                className={`zt-pricing-toggle-opt${pricingCycle === 'monthly' ? ' is-active' : ''}`}
                onClick={() => setPricingCycle('monthly')}
                aria-pressed={pricingCycle === 'monthly'}
              >
                Mensal
              </button>
              <button
                type="button"
                className={`zt-pricing-toggle-opt${pricingCycle === 'yearly' ? ' is-active' : ''}`}
                onClick={() => setPricingCycle('yearly')}
                aria-pressed={pricingCycle === 'yearly'}
              >
                Anual
              </button>
            </div>
          </header>
          <div className="zt-pricing-grid">
            <article className="zt-pricing-card zt-pricing-card--panel">
              <div className="zt-pricing-card-body">
                <div className="zt-pricing-card-top">
                  <span className="zt-pricing-card-icon" aria-hidden>
                    <Zap size={20} strokeWidth={2.4} color="#e8e8e8" fill="none" />
                  </span>
                  <h3 className="zt-pricing-card-name">Zaptro Básico</h3>
                </div>
                <p className="zt-pricing-desc">A porta de entrada para automatizar seu atendimento com WhatsApp.</p>
                <div className="zt-pricing-price-row">
                  <span className="zt-pricing-price">R$&nbsp;{pricingCycle === 'monthly' ? '49' : '490'}</span>
                  <span className="zt-pricing-period">/ {pricingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                </div>
                <div className="zt-pricing-rule" aria-hidden />
                <p className="zt-pricing-features-label">O que inclui:</p>
                <ul className="zt-pricing-features">
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>1 Conexão WhatsApp</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Limite reduzido de mensagens</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Retenção de dados: 24 horas</span>
                  </li>
                  <li className="zt-pricing-feature--disabled">
                    <Check className="zt-pricing-check zt-pricing-check--muted" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Sem backup de histórico</span>
                  </li>
                  <li className="zt-pricing-feature--disabled">
                    <Check className="zt-pricing-check zt-pricing-check--muted" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Sem White Label / Branding</span>
                  </li>
                </ul>
                <button type="button" className="zt-pricing-cta zt-pricing-cta--outline" onClick={() => navigate(ZAPTRO_ROUTES.REGISTER)}>
                  Começar agora
                </button>
              </div>
            </article>

            <article className="zt-pricing-card zt-pricing-card--panel zt-pricing-card--highlight">
              <div className="zt-pricing-card-ribbon">Mais Popular</div>
              <div className="zt-pricing-card-body">
                <div className="zt-pricing-card-top">
                  <span className="zt-pricing-card-icon" aria-hidden>
                    <LayoutDashboard size={20} strokeWidth={2.2} color="#e8e8e8" />
                  </span>
                  <h3 className="zt-pricing-card-name">Zaptro Profissional</h3>
                </div>
                <p className="zt-pricing-desc">Para agências e empresas que precisam de escala e organização.</p>
                <div className="zt-pricing-price-row">
                  <span className="zt-pricing-price">R$&nbsp;{pricingCycle === 'monthly' ? '97' : '970'}</span>
                  <span className="zt-pricing-period">/ {pricingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                </div>
                <div className="zt-pricing-rule" aria-hidden />
                <p className="zt-pricing-features-label">O que inclui:</p>
                <ul className="zt-pricing-features">
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Até 3 Conexões WhatsApp</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Mensagens ilimitadas</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Retenção de dados: 3 dias</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Backup opcional disponível</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Suporte prioritário e CRM</span>
                  </li>
                </ul>
                <button type="button" className="zt-pricing-cta zt-pricing-cta--lime" onClick={() => navigate(ZAPTRO_ROUTES.REGISTER)}>
                  Assinar plano
                </button>
              </div>
            </article>

            <article className="zt-pricing-card zt-pricing-card--panel">
              <div className="zt-pricing-card-body">
                <div className="zt-pricing-card-top">
                  <span className="zt-pricing-card-icon" aria-hidden>
                    <Globe2 size={20} strokeWidth={2.2} color="#e8e8e8" />
                  </span>
                  <h3 className="zt-pricing-card-name">Zaptro Avançado</h3>
                </div>
                <p className="zt-pricing-desc">Domínio próprio, White Label total e conexões ilimitadas.</p>
                <div className="zt-pricing-price-row">
                  <span className="zt-pricing-price">R$&nbsp;{pricingCycle === 'monthly' ? '197' : '1970'}</span>
                  <span className="zt-pricing-period">/ {pricingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                </div>
                <div className="zt-pricing-rule" aria-hidden />
                <p className="zt-pricing-features-label">O que inclui:</p>
                <ul className="zt-pricing-features">
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Conexões WhatsApp Ilimitadas</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>White Label + Domínio Customizado</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Retenção de dados: 7 dias</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>Backup automático incluso</span>
                  </li>
                  <li>
                    <Check className="zt-pricing-check" size={18} strokeWidth={2.4} aria-hidden />
                    <span>API completa e Webhooks</span>
                  </li>
                </ul>
                <button type="button" className="zt-pricing-cta zt-pricing-cta--outline" onClick={() => navigate(ZAPTRO_ROUTES.REGISTER)}>
                  Escalar agora
                </button>
              </div>
            </article>
          </div>
          <div id="faq" className="zt-pricing-faq" aria-labelledby="zt-lp-faq-title">
            <div className="zt-lp-faq-inner">
              <header className="zt-lp-faq-head">
                <div className="zt-lp-faq-badge">
                  <MessageSquare size={14} strokeWidth={2.4} aria-hidden />
                  FAQs
                </div>
                <h2 id="zt-lp-faq-title" className="zt-lp-faq-title">
                  <span className="zt-section-head__plain">Isto é o que </span>
                  <span className="zt-section-head__grad">precisa de saber</span>
                </h2>
                <p className="zt-lp-faq-lead">
                  Organizamos a malha para gastares menos tempo em follow-up e mais tempo a crescer a operação — com clareza para a equipa e para o cliente.
                </p>
              </header>
              <div className="zt-lp-faq-list">
                {LP_FAQ_ITEMS.map((item, index) => {
                  const isOpen = lpFaqOpenIndex === index;
                  const panelId = `zt-lp-faq-panel-${item.id}`;
                  const triggerId = `zt-lp-faq-trigger-${item.id}`;
                  return (
                    <div key={item.id} className={`zt-lp-faq-row${isOpen ? ' is-open' : ''}`}>
                      <button
                        type="button"
                        id={triggerId}
                        className="zt-lp-faq-trigger"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setLpFaqOpenIndex(isOpen ? null : index)}
                      >
                        <span className="zt-lp-faq-qtext">{item.q}</span>
                        <span className="zt-lp-faq-icon" aria-hidden>
                          <Plus size={20} strokeWidth={2.25} />
                        </span>
                      </button>
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={triggerId}
                        className="zt-lp-faq-panel"
                        hidden={!isOpen}
                      >
                        <p className="zt-lp-faq-answer">{item.a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="zt-footer" id="rodape" data-zt-scroll-reveal>
        <div className="zt-footer-inner zt-wrap">
          <div className="zt-footer-grid">
            <div className="zt-footer-brand-col">
              <div className="zt-footer-brand-logo">
                <span className="zt-logo-mark">
                  <Zap size={18} color={BLACK} fill={LIME} />
                </span>
                <span className="zt-brand">Zaptro</span>
              </div>
              <p className="zt-foot-tagline">
                Simplifique a operação na malha — WhatsApp, CRM e frota no mesmo painel, com mais clareza para a equipa fechar entregas.
              </p>
              <p className="zt-footer-news-kicker">Subscreva para receber novidades.</p>
              <form className="zt-footer-news" onSubmit={onFooterNewsletterSubmit} noValidate>
                <label htmlFor="zt-footer-news-email" className="zt-visually-hidden">
                  E-mail para newsletter
                </label>
                <input
                  id="zt-footer-news-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="O seu e-mail…"
                  className="zt-footer-news-input"
                  value={footerNewsletterEmail}
                  onChange={(ev) => setFooterNewsletterEmail(ev.target.value)}
                />
                <button type="submit" className="zt-footer-news-btn">
                  Subscrever
                </button>
              </form>
            </div>
            <nav className="zt-footer-nav-col" aria-labelledby="zt-footer-nav-h">
              <div id="zt-footer-nav-h" className="zt-foot-block-title">
                Navegação
              </div>
              <a href="#top" className="zt-foot-a">
                Início
              </a>
              <a href="#trust" className="zt-foot-a">
                Parceiros
              </a>
              <a href="#capabilities" className="zt-foot-a">
                Funcionalidades
              </a>
              <a href="#comecar" className="zt-foot-a">
                Como começar
              </a>
              <a href="#equipas" className="zt-foot-a">
                Porquê Zaptro
              </a>
              <a href="#planos" className="zt-foot-a">
                Planos
              </a>
              <a href="#faq" className="zt-foot-a">
                Perguntas frequentes
              </a>
              <button type="button" className="zt-foot-a btnlink" onClick={() => navigate('/login')}>
                Entrar
              </button>
              <button type="button" className="zt-foot-a btnlink" onClick={() => navigate(ZAPTRO_ROUTES.REGISTER)}>
                Registrar
              </button>
            </nav>
            <nav className="zt-footer-legal-col" aria-labelledby="zt-footer-legal-h">
              <div id="zt-footer-legal-h" className="zt-foot-block-title">
                Legal
              </div>
              <a href="#top" className="zt-foot-a">
                Termos de serviço
              </a>
              <a href="#top" className="zt-foot-a">
                Política de privacidade
              </a>
            </nav>
            <div className="zt-footer-contact-col" aria-labelledby="zt-footer-contact-h">
              <div id="zt-footer-contact-h" className="zt-foot-block-title">
                Contacto
              </div>
              <p className="zt-foot-contact-line">+55 (11) 0000-0000</p>
              <a href="mailto:suporte@zaptro.com.br" className="zt-foot-a zt-foot-contact-link">
                suporte@zaptro.com.br
              </a>
              <p className="zt-foot-contact-line zt-foot-contact-line--addr">São Paulo, Brasil</p>
            </div>
          </div>
          <div className="zt-footer-rule" aria-hidden="true" />
          <div className="zt-footer-bottom">
            <p className="zt-footer-credits">
              © {new Date().getFullYear()} <strong>Zaptro</strong>. Todos os direitos reservados.
            </p>
            <div className="zt-footer-bottom-social">
              <span className="zt-footer-social-label">Redes sociais:</span>
              <ul className="zt-footer-social-icons" aria-label="Redes sociais Zaptro">
                <li>
                  <a
                    className="zt-footer-icon-circle"
                    href="https://www.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                  >
                    <ZtIconSocialFacebook className="zt-footer-icon-svg" />
                  </a>
                </li>
                <li>
                  <a
                    className="zt-footer-icon-circle"
                    href="https://www.instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <ZtIconSocialInstagram className="zt-footer-icon-svg" />
                  </a>
                </li>
                <li>
                  <a className="zt-footer-icon-circle" href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X">
                    <ZtIconSocialX className="zt-footer-icon-svg" />
                  </a>
                </li>
                <li>
                  <a
                    className="zt-footer-icon-circle"
                    href="https://www.linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    <ZtIconSocialLinkedin className="zt-footer-icon-svg" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="zt-footer-watermark" aria-hidden="true">
          ZAPTRO
        </div>
      </footer>
        </div>
      </div>

      <style>{`
        .zt-page {
          --zt-content-max: 1120px;
          --zt-font-heading: 'Outfit', system-ui, -apple-system, sans-serif;
          /* Respiro lateral esquerda/direita (hero, nav, secções, CTA, rodapé) */
          --zt-gutter: clamp(28px, 8.5vw, 64px);
          position: relative;
          min-height: 100vh;
          background: ${BLACK};
          color: ${WHITE};
          font-family: Inter, system-ui, sans-serif;
          overflow-x: visible;
        }
        @media (max-width: 600px) {
          .zt-page {
            --zt-gutter: clamp(32px, 11vw, 52px);
          }
        }
        @media (max-width: 360px) {
          .zt-page {
            --zt-gutter: clamp(28px, 12.5vw, 48px);
          }
        }
        /* Scroll reveal + máscara em degradê — secções com data-zt-scroll-reveal */
        [data-zt-scroll-reveal] {
          --zt-section-reveal: 1;
          position: relative;
          isolation: isolate;
          opacity: var(--zt-section-reveal);
          transform: translate3d(0, calc((1 - var(--zt-section-reveal)) * 28px), 0);
          transition:
            opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.52s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        [data-zt-scroll-reveal]::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: min(120px, 22vw);
          z-index: 0;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, calc((1 - var(--zt-section-reveal)) * 0.26)) 0%,
            transparent 100%
          );
        }
        [data-zt-scroll-reveal] > * {
          position: relative;
          z-index: 1;
        }
        @media (prefers-reduced-motion: reduce) {
          [data-zt-scroll-reveal] {
            opacity: 1 !important;
            transform: none !important;
            will-change: auto;
          }
          [data-zt-scroll-reveal]::before {
            display: none !important;
          }
        }
        .zt-open {
          --zt-fg: ${BLACK};
          --zt-muted: rgba(0,0,0,0.55);
          --zt-faint: rgba(0,0,0,0.38);
          --zt-card: ${WHITE};
          --zt-line: rgba(0,0,0,0.12);
          --zt-border: rgba(0,0,0,0.08);
          /* Hero / nav: margens laterais fixas — não herdam o --zt-gutter ampliado do .zt-page no mobile */
          --zt-gutter: clamp(28px, 8.5vw, 64px);
          position: relative;
          overflow: hidden;
          color: var(--zt-fg);
          background: linear-gradient(180deg, ${WHITE} 0%, #fafafa 55%, #f3f3f3 100%);
        }
        .zt-dark {
          --zt-fg: ${WHITE};
          --zt-muted: rgba(255,255,255,0.62);
          --zt-faint: rgba(255,255,255,0.4);
          --zt-card: #0a0a0a;
          --zt-line: rgba(255,255,255,0.16);
          --zt-border: rgba(255,255,255,0.14);
          position: relative;
          isolation: isolate;
          overflow-x: visible;
          background: ${BLACK};
          color: var(--zt-fg);
        }
        .zt-sticky-trust-inner {
          display: grid;
          grid-template-columns: minmax(240px, 0.95fr) minmax(280px, 1.05fr);
          gap: clamp(28px, 5vw, 64px);
          align-items: start;
        }
        @media (max-width: 960px) {
          .zt-sticky-trust-inner {
            grid-template-columns: 1fr;
          }
          .zt-sticky-trust-left {
            position: relative;
            top: auto;
            max-width: none;
          }
          .zt-sticky-trust-panel {
            min-height: auto;
            padding: 14px 0 18px;
          }
        }
        .zt-sticky-trust-left {
          position: sticky;
          top: max(20px, env(safe-area-inset-top, 0px));
          align-self: start;
          max-width: min(520px, 100%);
          padding-bottom: 28px;
        }
        .zt-sticky-trust-right {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .zt-sticky-trust-panel {
          min-height: 38vh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 10px 0 18px;
        }
        .zt-sticky-trust-panel:last-child {
          min-height: 34vh;
          padding-bottom: 14px;
        }
        .zt-sticky-trust-panel-head {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 10px 24px;
          margin-bottom: 12px;
        }
        .zt-sticky-trust-panel-head--phrase {
          display: block;
          margin-bottom: 12px;
        }
        .zt-sticky-trust-phrase {
          display: block;
          font-size: clamp(1.85rem, 4.8vw, 3.1rem);
          font-weight: 950;
          letter-spacing: -0.035em;
          line-height: 1.12;
          color: ${WHITE};
        }
        .zt-sticky-trust-phrase.zt-grad-on-dark {
          color: transparent;
        }
        .zt-sticky-trust-num {
          font-size: clamp(3rem, 11vw, 5.75rem);
          font-weight: 950;
          letter-spacing: -0.045em;
          line-height: 0.95;
          color: ${WHITE};
        }
        .zt-sticky-trust-num.zt-grad-on-dark {
          color: transparent;
        }
        .zt-sticky-trust-kicker {
          font-size: 13px;
          font-weight: 800;
          color: rgba(255,255,255,0.92);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .zt-sticky-trust-body {
          margin: 0;
          font-size: 16px;
          line-height: 1.5;
          color: var(--zt-muted);
          max-width: 520px;
        }
        .zt-mesh-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .zt-mesh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(110px);
          will-change: transform;
          pointer-events: none;
        }
        .zt-mesh-a {
          width: min(130vw, 760px);
          height: min(130vw, 760px);
          top: -32%;
          left: -35%;
          background: radial-gradient(circle, rgba(217,255,0,0.32) 0%, rgba(217,255,0,0.08) 38%, transparent 68%);
          animation: ztMeshDriftA 26s ease-in-out infinite;
        }
        .zt-mesh-b {
          width: min(95vw, 560px);
          height: min(95vw, 560px);
          top: 8%;
          right: -32%;
          background: radial-gradient(circle, rgba(217,255,0,0.26) 0%, rgba(217,255,0,0.05) 40%, transparent 65%);
          animation: ztMeshDriftB 30s ease-in-out infinite;
        }
        .zt-mesh-c {
          width: min(110vw, 640px);
          height: min(110vw, 640px);
          bottom: 5%;
          left: -28%;
          background: radial-gradient(circle, rgba(217,255,0,0.18) 0%, transparent 62%);
          animation: ztMeshDriftC 34s ease-in-out infinite;
        }
        .zt-mesh-d {
          width: min(85vw, 500px);
          height: min(85vw, 500px);
          bottom: -22%;
          right: -8%;
          background: radial-gradient(circle, rgba(217,255,0,0.12) 0%, transparent 58%);
          animation: ztMeshDriftD 28s ease-in-out infinite;
        }
        @keyframes ztMeshDriftA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(10%, 14%) scale(1.05); }
        }
        @keyframes ztMeshDriftB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-12%, 10%) scale(1.08); }
        }
        @keyframes ztMeshDriftC {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(14%, -8%) scale(0.95); }
        }
        @keyframes ztMeshDriftD {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-8%, -12%) scale(1.06); }
        }
        .zt-dark-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
          overflow-x: hidden;
        }
        @keyframes ztHeroRise {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .zt-nav-wrap {
          position: sticky;
          top: 0;
          z-index: 40;
          padding-top: 16px;
          padding-bottom: 0;
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          background: #f4f4f4;
        }
        .zt-nav-pill {
          width: 100%;
          max-width: min(1320px, 100%);
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 18px;
          border-radius: 999px;
          background: rgba(255,255,255,0.82);
          border: 1px solid var(--zt-border);
          box-shadow: 0 12px 40px rgba(0,0,0,0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .zt-logo-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
        }
        .zt-logo-mark {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background: ${BLACK};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zt-brand { font-size: 21px; font-weight: 950; letter-spacing: -0.04em; color: ${BLACK}; }
        .zt-nav-links { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
        .zt-nav-mega-root {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          min-width: 0;
        }
        .zt-nav-mega-item {
          position: relative;
        }
        .zt-nav-mega-item:hover .zt-nav-mega-chevron,
        .zt-nav-mega-item:focus-within .zt-nav-mega-chevron {
          transform: rotate(180deg);
        }
        .zt-nav-mega-trigger {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          color: var(--zt-muted);
          padding: 8px 12px;
          border-radius: 999px;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .zt-nav-mega-trigger:hover,
        .zt-nav-mega-item:focus-within .zt-nav-mega-trigger {
          color: ${BLACK};
          background: var(--zt-border);
        }
        .zt-nav-mega-chevron {
          flex-shrink: 0;
          opacity: 0.65;
          transition: transform 0.22s ease;
        }
        .zt-nav-mega-panel {
          position: absolute;
          left: 0;
          right: auto;
          top: calc(100% + 4px);
          width: min(720px, calc(100vw - 2 * var(--zt-gutter, 28px)));
          padding-top: 8px;
          z-index: 50;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transform: translateY(6px);
          transition:
            opacity 0.22s ease,
            transform 0.22s ease,
            visibility 0.22s;
        }
        @media (min-width: 961px) {
          .zt-nav-mega-item:nth-last-child(-n + 2) .zt-nav-mega-panel {
            left: auto;
            right: 0;
          }
        }
        .zt-nav-mega-item:hover .zt-nav-mega-panel,
        .zt-nav-mega-item:focus-within .zt-nav-mega-panel {
          pointer-events: auto;
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .zt-nav-mega-panel-inner {
          background: ${WHITE};
          border: 1px solid var(--zt-line);
          border-radius: 20px;
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.14);
          padding: 24px 26px 26px;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
          gap: 28px 32px;
          align-items: start;
          text-align: left;
        }
        .zt-nav-mega-panel-inner--grid {
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .zt-nav-mega-intro {
          min-width: 0;
        }
        .zt-nav-mega-kicker {
          margin: 0 0 8px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(0, 0, 0, 0.45);
        }
        .zt-nav-mega-lead {
          margin: 0;
          font-size: 15px;
          line-height: 1.55;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.62);
        }
        .zt-nav-mega-list-col {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .zt-nav-mega-link {
          display: block;
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 14px;
          padding: 12px 14px;
          transition: background 0.18s ease;
          text-decoration: none;
          color: inherit;
          box-sizing: border-box;
        }
        .zt-nav-mega-link:hover {
          background: rgba(0, 0, 0, 0.04);
        }
        .zt-nav-mega-link-t {
          display: block;
          font-size: 14px;
          font-weight: 850;
          color: ${BLACK};
          letter-spacing: -0.02em;
        }
        .zt-nav-mega-link-d {
          display: block;
          margin-top: 3px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.48);
          line-height: 1.4;
        }
        .zt-nav-mega-tile {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          text-align: left;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #fafafa;
          border-radius: 16px;
          padding: 14px 16px;
          cursor: pointer;
          font: inherit;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .zt-nav-mega-tile:hover {
          border-color: rgba(217, 255, 0, 0.55);
          box-shadow: 0 10px 32px rgba(217, 255, 0, 0.12);
          background: ${WHITE};
        }
        .zt-nav-mega-tile-t {
          font-size: 14px;
          font-weight: 850;
          color: ${BLACK};
          letter-spacing: -0.02em;
        }
        .zt-nav-mega-tile-d {
          font-size: 12px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.48);
          line-height: 1.4;
        }
        .zt-nav-mega-panel-inner--single {
          grid-template-columns: 1fr;
          max-width: min(440px, 100%);
        }
        @media (max-width: 960px) {
          .zt-nav-mega-root {
            display: none;
          }
        }
        .zt-nav-a {
          text-decoration: none;
          color: var(--zt-muted);
          font-weight: 700;
          font-size: 14px;
          padding: 8px 14px;
          border-radius: 999px;
          transition: background 0.2s, color 0.2s;
        }
        .zt-nav-a:hover { color: ${BLACK}; background: var(--zt-border); }
        .zt-nav-cta-row { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .zt-btn-outline {
          padding: 10px 18px;
          border-radius: 999px;
          border: 1px solid var(--zt-line);
          background: var(--zt-card);
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          color: var(--zt-fg);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
        }
        .zt-btn-outline:hover {
          border-color: rgba(217,255,0,0.45);
          color: ${BLACK};
          box-shadow: 0 0 0 1px rgba(217,255,0,0.12), 0 8px 28px rgba(217,255,0,0.12);
        }
        .zt-btn-lime {
          padding: 10px 20px;
          border-radius: 999px;
          border: none;
          background: ${LIME};
          color: ${BLACK};
          font-weight: 950;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(217,255,0,0.35);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
        }
        .zt-btn-lime:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 12px 32px rgba(217,255,0,0.45);
        }
        .zt-btn-lime.lg { padding: 16px 28px; font-size: 15px; }
        .zt-btn-black {
          padding: 16px 28px;
          border-radius: 999px;
          border: none;
          background: ${BLACK};
          color: ${WHITE};
          font-weight: 950;
          font-size: 15px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
        }
        .zt-btn-black:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 14px 36px rgba(0,0,0,0.25);
        }
        .zt-btn-ghost {
          padding: 16px 28px;
          border-radius: 999px;
          border: 2px solid var(--zt-border);
          background: var(--zt-card);
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--zt-fg);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, background 0.2s ease;
        }
        .zt-btn-ghost:hover {
          transform: translateY(-1px);
          border-color: rgba(0,0,0,0.18);
        }
        .zt-hero {
          position: relative;
          z-index: 1;
          padding-top: 40px;
          padding-bottom: 56px;
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          text-align: center;
          background: linear-gradient(
            to top,
            ${BLACK} 0%,
            #6b7a1e 22%,
            ${LIME} 42%,
            #eaff9a 70%,
            #f5ffe8 88%,
            #ffffff 100%
          );
        }
        .zt-hero-inner {
          max-width: min(1240px, 100%);
          margin: 0 auto;
          position: relative;
          z-index: 2;
          padding-top: 30px;
          padding-bottom: 30px;
        }
        .zt-hero-an {
          opacity: 0;
          animation: ztHeroRise 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .zt-hero-an-1 { animation-delay: 0.05s; }
        .zt-hero-an-2a { animation-delay: 0.12s; }
        .zt-hero-an-2b { animation-delay: 0.22s; }
        .zt-hero-an-3 { animation-delay: 0.32s; }
        .zt-hero-an-4 { animation-delay: 0.4s; }
        .zt-atl-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
          color: var(--zt-muted);
          margin: 0 0 16px;
        }
        .zt-hero-headline {
          margin: 0 auto 22px;
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.26em;
          text-align: center;
        }
        .zt-hero-headline-line {
          display: block;
          width: 100%;
          font-size: clamp(1.45rem, 4.25vw, 2.35rem);
          font-weight: 700;
          letter-spacing: -0.034em;
          line-height: 1.16;
          color: ${BLACK};
        }
        .zt-hero-headline-line--hook {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.02em;
          font-size: clamp(2.35rem, 7.8vw, 4.1rem);
          font-weight: 900;
          letter-spacing: -0.046em;
          line-height: 1.02;
          max-width: 100%;
        }
        .zt-hero-hook-row {
          display: block;
          width: 100%;
        }
        .zt-hero-hook-row--top {
          font-size: clamp(3.75rem, 12.5vw, 6.75rem);
          line-height: 1;
          white-space: nowrap;
          letter-spacing: -0.05em;
          will-change: transform;
        }
        .zt-hero-hook-row--bottom {
          will-change: transform;
        }
        .zt-hero-headline-line--accent {
          font-size: clamp(1.12rem, 2.9vw, 1.52rem);
          font-weight: 600;
          color: rgba(0, 0, 0, 0.52);
          margin-top: 0.08em;
          max-width: 100%;
        }
        @media (max-width: 600px) {
          .zt-hero-headline-line {
            font-size: clamp(1.2rem, 5.2vw, 1.9rem);
            line-height: 1.18;
          }
          .zt-hero-headline-line--hook {
            font-size: clamp(1.7rem, 7.5vw, 2.6rem);
            line-height: 1.08;
          }
          .zt-hero-hook-row--top {
            font-size: clamp(2rem, 11vw, 3.1rem);
            white-space: normal;
            line-height: 1.06;
            letter-spacing: -0.045em;
          }
          .zt-hero-hook-row--bottom {
            font-size: clamp(2.2rem, 11.5vw, 3.35rem);
            line-height: 1.06;
            letter-spacing: -0.048em;
          }
          .zt-hero-headline-line--accent {
            font-size: clamp(0.98rem, 3.6vw, 1.28rem);
            line-height: 1.45;
            margin-top: 0.14em;
          }
        }
        .zt-grad-text {
          background: linear-gradient(105deg, ${BLACK} 0%, ${BLACK} 35%, ${LIME} 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .zt-grad-on-dark {
          background: linear-gradient(105deg, ${WHITE} 0%, ${WHITE} 28%, ${LIME} 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .zt-hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
          margin-bottom: 8px;
          padding-top: 27px;
          padding-bottom: 27px;
        }
        .zt-hero-showcase {
          margin-top: 40px;
          max-width: 100%;
          margin-left: auto;
          margin-right: auto;
          padding: 0;
        }
        .zt-hero-dashboard-slot {
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.08);
          background: ${WHITE};
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
        }
        .zt-hero-dashboard-img {
          display: block;
          width: 1012px;
          max-width: 100%;
          height: 487px;
          margin: 20px 16px;
          box-sizing: content-box;
          color: var(--accent);
        }
        .zt-media-ph {
          width: 100%;
          box-sizing: border-box;
          background: ${BLACK};
          border: 1px dashed rgba(255,255,255,0.12);
        }
        .zt-media-ph--feature {
          min-height: min(52vw, 320px);
          border-radius: 20px;
          background: #000000;
          border: 1px dashed rgba(255,255,255,0.14);
          transition: border-color 0.35s ease, box-shadow 0.35s ease;
        }
        .zt-bento-visual:hover .zt-media-ph--feature {
          border-color: rgba(217,255,0,0.35);
          box-shadow: inset 0 0 0 1px rgba(217,255,0,0.08);
        }
        .zt-media-ph--spot {
          aspect-ratio: 16 / 11;
          border: none;
          border-radius: 0;
          background: #000000;
        }
        .zt-media-ph--blog {
          aspect-ratio: 16 / 10;
          border: none;
          border-radius: 0;
          background: #000000;
        }
        .zt-trust {
          position: relative;
          z-index: 1;
          text-align: center;
          padding-top: 28px;
          padding-bottom: 44px;
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          border-top: none;
          border-bottom: none;
          background: transparent;
        }
        .zt-trust-line { font-size: 13px; font-weight: 700; color: var(--zt-faint); margin: 0 0 20px; }
        /* Marcas: uma linha com 6 (desktop / tablet / notebook); em ecrãs estreitos 3×2 */
        .zt-trust-logos {
          list-style: none;
          margin: 0 auto;
          padding: 0;
          max-width: min(1080px, 100%);
          width: 100%;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: clamp(10px, 1.6vw, 16px);
          align-items: stretch;
          justify-items: stretch;
          box-sizing: border-box;
        }
        @media (max-width: 600px) {
          .zt-trust-logos {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: clamp(12px, 2vw, 18px) clamp(12px, 2.2vw, 20px);
            max-width: min(920px, 100%);
          }
        }
        .zt-trust-logo-card {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          min-height: clamp(52px, 7vw, 72px);
          padding: clamp(10px, 1.6vw, 18px) clamp(8px, 1.2vw, 12px);
          list-style: none;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          box-sizing: border-box;
        }
        .zt-trust-logo-img {
          display: block;
          height: clamp(18px, 2.2vw, 30px);
          width: auto;
          max-width: 100%;
          object-fit: contain;
          object-position: center;
          border: none;
          outline: none;
          background: transparent;
          filter: grayscale(1) brightness(1.14);
          opacity: 0.94;
        }
        .zt-subpitch {
          padding-top: 48px;
          padding-bottom: 28px;
        }
        .zt-subpitch-h {
          margin-bottom: 16px;
        }
        /* Desktop: título numa linha; mobile: quebra antes de "WhatsApp" */
        .zt-subpitch-title-br {
          display: none;
        }
        @media (max-width: 768px) {
          .zt-subpitch-title-br {
            display: inline;
          }
        }
        .zt-elevator {
          margin: 26px auto 0;
          max-width: 700px;
          text-align: center;
          font-size: clamp(16px, 1.9vw, 18px);
          line-height: 1.55;
          font-weight: 650;
          color: rgba(255, 255, 255, 0.78);
        }
        .zt-close-line {
          margin: 20px auto 0;
          max-width: 640px;
          text-align: center;
          font-size: 15px;
          line-height: 1.52;
          color: var(--zt-muted);
          font-weight: 600;
        }
        .zt-plan-tier-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-top: 8px;
        }
        @media (max-width: 900px) {
          .zt-plan-tier-grid {
            grid-template-columns: 1fr;
          }
        }
        .zt-plan-tier {
          border-radius: 24px;
          border: 1px solid var(--zt-border);
          background: var(--zt-card);
          padding: 26px 22px 22px;
          display: flex;
          flex-direction: column;
          min-height: 100%;
          box-sizing: border-box;
        }
        .zt-plan-tier--featured {
          border-color: rgba(217, 255, 0, 0.32);
          box-shadow: 0 0 0 1px rgba(217, 255, 0, 0.08), 0 18px 46px rgba(0, 0, 0, 0.42);
        }
        .zt-plan-tier-eyebrow {
          margin: 0 0 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.48);
        }
        .zt-plan-tier-name {
          margin: 0 0 12px;
          font-size: clamp(1.35rem, 3vw, 1.6rem);
          font-weight: 950;
          letter-spacing: -0.03em;
          color: var(--zt-fg);
        }
        .zt-plan-tier ul {
          margin: 0;
          padding-left: 18px;
          color: var(--zt-muted);
          font-size: 14px;
          line-height: 1.55;
        }
        .zt-plan-tier li + li {
          margin-top: 6px;
        }
        .zt-plan-tier-foot {
          margin-top: auto;
          padding-top: 18px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.52);
        }
        .zt-compare-wrap .zt-section-head {
          margin-bottom: 28px;
        }
        .zt-compare {
          margin-top: 0;
          border: 1px solid var(--zt-border);
          border-radius: 20px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
        }
        .zt-compare-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
          gap: 14px 20px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--zt-border);
          align-items: start;
        }
        .zt-compare-row:last-child {
          border-bottom: none;
        }
        .zt-compare-prob {
          font-weight: 850;
          font-size: 14px;
          line-height: 1.35;
          color: rgba(255, 255, 255, 0.78);
        }
        .zt-compare-sol {
          margin: 0;
          font-size: 14px;
          line-height: 1.52;
          color: var(--zt-muted);
        }
        @media (max-width: 640px) {
          .zt-compare-row {
            grid-template-columns: 1fr;
          }
        }
        .zt-section {
          position: relative;
          z-index: 1;
          padding-top: 88px;
          padding-bottom: 88px;
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
        }
        .zt-section.alt { background: #050505; }
        #confianca {
          padding-top: 116px;
          padding-bottom: 116px;
        }
        @media (max-width: 520px) {
          .zt-section {
            padding-top: 72px;
            padding-bottom: 72px;
          }
          .zt-section--faq {
            padding-top: 88px;
            padding-bottom: 88px;
          }
          #confianca {
            padding-top: 88px;
            padding-bottom: 88px;
          }
        }
        .zt-wrap { max-width: var(--zt-content-max); margin: 0 auto; }
        .zt-wrap.narrow { max-width: 720px; }
        .zt-section-head { text-align: center; max-width: 720px; margin: 0 auto 48px; }
        .zt-section-head--recursos {
          margin-bottom: 28px;
        }
        .zt-h2,
        .zt-atl-feature-h,
        .zt-spot-title,
        .zt-cta-title {
          font-size: clamp(2rem, 4.6vw, 3.05rem);
          font-weight: 600;
          letter-spacing: -0.028em;
        }
        /* Títulos de secção (tema escuro): tamanho padrão + Outfit */
        .zt-dark-content .zt-h2:not(.zt-subpitch-h),
        .zt-dark-content .zt-atl-feature-h,
        .zt-dark-content .zt-spot-title {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.55rem, 3.65vw, 2.45rem);
          font-weight: 600;
          line-height: 1.16;
          letter-spacing: -0.032em;
        }
        .zt-cta-inner .zt-cta-title {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.5rem, 3.4vw, 2.25rem);
          font-weight: 600;
          line-height: 1.18;
          letter-spacing: -0.03em;
        }
        .zt-subpitch .zt-h2.zt-subpitch-h,
        #zt-subpitch-title {
          font-family: Outfit, sans-serif;
          font-weight: 500;
          font-size: 35px;
          line-height: 36px;
          letter-spacing: 0.7px;
          height: 75px;
          padding-top: 3px;
          padding-bottom: 3px;
          width: min(453px, 100%);
          max-width: 453px;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        /* Telemóvel / tablet estreito: hierarquia de títulos legível, sem 59px nem margens de desktop. */
        @media (max-width: 768px) {
          .zt-section-head {
            margin-bottom: 32px;
          }
          .zt-section-head--recursos {
            margin-bottom: 22px;
          }
          .zt-subpitch {
            padding-top: 40px;
            padding-bottom: 24px;
          }
          .zt-subpitch .zt-h2.zt-subpitch-h,
          #zt-subpitch-title {
            font-size: 38px;
            font-weight: 600;
            line-height: 42px;
            letter-spacing: 0.5px;
            height: auto;
            width: min(480px, 100%);
            max-width: 480px;
            margin-left: auto;
            margin-right: auto;
            padding: 22px 22px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
            box-sizing: border-box;
          }
          .zt-dark-content .zt-h2:not(.zt-subpitch-h) {
            font-size: clamp(1.95rem, 5.45vw, 2.65rem);
            line-height: 1.16;
          }
          .zt-dark-content .zt-atl-feature-h {
            font-size: clamp(1.52rem, 4.35vw, 2rem);
            line-height: 1.22;
          }
          .zt-dark-content .zt-spot-title {
            font-size: clamp(1.42rem, 4.2vw, 1.95rem);
            line-height: 1.24;
          }
          .zt-dark-content .zt-h2.left {
            font-size: clamp(1.85rem, 5.15vw, 2.45rem);
            line-height: 1.15;
          }
          #recursos .zt-h2-line--recursos-lead {
            font-size: clamp(2rem, 5.65vw, 2.75rem);
            line-height: 1.1;
          }
          .zt-cta-inner .zt-cta-title {
            font-size: clamp(1.75rem, 5.15vw, 2.45rem);
            line-height: 1.2;
          }
          .zt-lead.narrow {
            height: auto;
            min-height: 0;
          }
        }
        .zt-h2 {
          margin: 0 0 16px;
          color: var(--zt-fg);
        }
        .zt-h2--two-lines {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.02em;
          line-height: 1.08;
          margin-bottom: 10px;
        }
        .zt-h2-line {
          display: block;
        }
        #recursos .zt-h2-line--recursos-lead {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.85rem, 4.5vw, 2.65rem);
          font-weight: 600;
          letter-spacing: -0.034em;
          line-height: 1.08;
        }
        #recursos .zt-lead--recursos-intro {
          font-size: clamp(17px, 2.05vw, 20px);
          line-height: 1.55;
          max-width: min(820px, 100%);
          margin-inline: auto;
        }
        .zt-lead--tight {
          line-height: 1.42;
          padding-top: 17px;
          padding-bottom: 17px;
        }
        .zt-dark-content .zt-h2.left {
          text-align: left;
          max-width: min(520px, 100%);
          font-family: var(--zt-font-heading);
          font-size: clamp(1.55rem, 3.65vw, 2.35rem);
          font-weight: 600;
          letter-spacing: -0.032em;
          line-height: 1.18;
        }
        .zt-h2.center { text-align: center; }
        .zt-lead { font-size: 17px; color: var(--zt-muted); line-height: 1.65; margin: 0; }
        #recursos .zt-section-head .zt-lead--tight {
          margin-top: 0;
        }
        .zt-lead.left { text-align: left; }
        .zt-lead.center { text-align: center; margin-inline: auto; }
        .zt-lead.narrow {
          max-width: 633px;
          margin-top: 19px;
          height: 59px;
        }
        .zt-stats-atl { padding-top: 56px; padding-bottom: 72px; }
        .zt-stats-head { margin-bottom: 40px; }
        .zt-stats-eyebrow { text-align: center; margin-left: auto; margin-right: auto; }
        .zt-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        @media (max-width: 900px) {
          .zt-stats-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 520px) {
          .zt-stats-grid { grid-template-columns: 1fr; }
        }
        .zt-stat-atl {
          position: relative;
          text-align: center;
          padding: 30px 20px 26px;
          border-radius: 24px;
          border: 1px solid var(--zt-border);
          background: var(--zt-card);
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.25s ease;
        }
        .zt-stat-atl::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 3px;
          pointer-events: none;
          border-radius: 24px 24px 0 0;
        }
        .zt-stat-atl--vision::before {
          right: 0;
          background: ${LIME};
        }
        .zt-stat-atl--api::before {
          left: 50%;
          transform: translateX(-50%);
          width: min(62%, 200px);
          background: linear-gradient(90deg, transparent, ${LIME} 45%, ${LIME} 55%, transparent);
        }
        .zt-stat-atl--zero::before {
          right: 0;
          background: rgba(255, 255, 255, 0.22);
        }
        .zt-stat-atl--inf::before {
          right: 0;
          background: linear-gradient(90deg, transparent 0%, ${LIME} 18%, ${LIME} 82%, transparent 100%);
        }
        .zt-stat-atl:hover {
          transform: translateY(-5px);
          border-color: rgba(217,255,0,0.14);
          box-shadow: 0 0 40px -10px rgba(217,255,0,0.1), 0 20px 50px rgba(0,0,0,0.48);
        }
        .zt-stat-atl-num {
          font-size: clamp(2rem, 5vw, 3.35rem);
          font-weight: 950;
          letter-spacing: -0.045em;
          line-height: 1;
          margin-bottom: 10px;
          color: var(--zt-fg);
        }
        .zt-stat-atl-label {
          font-size: 12px;
          font-weight: 800;
          color: var(--zt-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          line-height: 1.35;
        }
        .zt-stat-atl-pitch {
          margin: 14px 0 0;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.58);
          max-width: 100%;
          margin-inline: auto;
        }
        .zt-stats-grid .zt-reveal:nth-child(1) { transition-delay: 0.04s; }
        .zt-stats-grid .zt-reveal:nth-child(2) { transition-delay: 0.08s; }
        .zt-stats-grid .zt-reveal:nth-child(3) { transition-delay: 0.12s; }
        .zt-stats-grid .zt-reveal:nth-child(4) { transition-delay: 0.16s; }
        .zt-atl-feature {
          display: grid;
          grid-template-columns: 1fr 1.08fr;
          gap: 36px;
          align-items: center;
          margin-bottom: 22px;
          padding: clamp(22px, 4vw, 40px);
          border-radius: 36px;
          border: 1px solid var(--zt-border);
          background: var(--zt-card);
          box-shadow: 0 8px 40px rgba(0,0,0,0.28);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.25s ease;
        }
        .zt-atl-feature:hover {
          transform: translateY(-3px);
          border-color: rgba(217,255,0,0.12);
          box-shadow:
            0 0 0 1px rgba(217,255,0,0.08),
            0 0 48px -10px rgba(217,255,0,0.08),
            0 18px 56px rgba(0,0,0,0.52);
        }
        .zt-atl-feature--rev { grid-template-columns: 1.08fr 1fr; }
        .zt-atl-feature--rev .zt-atl-feature-visual { order: -1; }
        @media (max-width: 900px) {
          .zt-atl-feature, .zt-atl-feature--rev { grid-template-columns: 1fr; }
          .zt-atl-feature--rev .zt-atl-feature-visual { order: 0; }
        }
        .zt-atl-feature-copy { text-align: left; }
        .zt-atl-dash-figure {
          margin: 0 0 22px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--zt-border);
          background: #070707;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4);
        }
        .zt-atl-dash-img {
          display: block;
          width: 100%;
          height: auto;
          vertical-align: middle;
          /* Arte original com roxo/lilás: desloca matiz para o limão da marca nos gráficos e gradientes. */
          filter: hue-rotate(156deg) saturate(1.14) contrast(1.04);
        }
        .zt-recursos-dual {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          margin-bottom: 22px;
          align-items: stretch;
        }
        @media (max-width: 900px) {
          .zt-recursos-dual {
            grid-template-columns: 1fr;
          }
          .zt-atl-split-card {
            min-height: 0;
          }
          .zt-atl-split-card--text-last .zt-atl-split-copy {
            margin-top: 0;
          }
          .zt-atl-split-card--text-first .zt-split-visual {
            margin-top: clamp(18px, 4vw, 28px);
          }
        }
        .zt-recursos-dual > .zt-reveal:nth-child(2) {
          transition-delay: 0.08s;
        }
        .zt-atl-split-card {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: clamp(480px, 56vw, 640px);
          text-align: left;
          padding: clamp(28px, 4vw, 42px);
          border-radius: 36px;
          border: 1px solid var(--zt-border);
          background: var(--zt-card);
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.28);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.25s ease;
        }
        .zt-atl-split-card:hover {
          transform: translateY(-3px);
          border-color: rgba(217, 255, 0, 0.12);
          box-shadow:
            0 0 0 1px rgba(217, 255, 0, 0.08),
            0 0 48px -10px rgba(217, 255, 0, 0.08),
            0 18px 56px rgba(0, 0, 0, 0.52);
        }
        .zt-atl-split-copy {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .zt-atl-split-copy .zt-atl-feature-h {
          margin: 0 0 12px;
          font-size: clamp(1.32rem, 2.65vw, 1.85rem);
          font-weight: 650;
          letter-spacing: -0.03em;
          line-height: 1.22;
        }
        .zt-atl-split-copy .zt-card-p--split {
          margin: 0;
        }
        .zt-split-visual {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--zt-border);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.38);
          flex-shrink: 0;
        }
        .zt-atl-split-card--text-first .zt-split-visual {
          margin-top: auto;
          margin-bottom: 0;
        }
        .zt-atl-split-card--text-last .zt-split-visual {
          margin-top: 0;
          margin-bottom: clamp(20px, 3vw, 32px);
        }
        .zt-atl-split-card--text-last .zt-atl-split-copy {
          margin-top: auto;
        }
        .zt-atl-dash-figure--embed {
          margin: 0;
          border: none;
          box-shadow: none;
          border-radius: 0;
          background: #070707;
        }
        .zt-card-p--split {
          font-size: clamp(14px, 1.45vw, 16px);
          line-height: 1.62;
        }
        .zt-atl-feature-h {
          line-height: 1.15;
          margin: 0 0 14px;
          color: var(--zt-fg);
        }
        .zt-atl-icon-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 22px;
        }
        .zt-atl-feature-visual .zt-bento-visual { margin-top: 0; }
        .zt-spot-atl { padding-bottom: 88px; }
        .zt-spot-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          margin-top: 8px;
        }
        @media (max-width: 768px) {
          .zt-spot-grid { grid-template-columns: 1fr; }
        }
        .zt-spot-card {
          border-radius: 28px;
          border: 1px solid var(--zt-border);
          background: var(--zt-card);
          overflow: hidden;
          padding: 0 0 26px;
          transition: transform 0.28s ease, border-color 0.25s ease, box-shadow 0.28s ease;
        }
        .zt-spot-card:hover {
          transform: translateY(-4px);
          border-color: rgba(217,255,0,0.14);
          box-shadow:
            0 0 0 1px rgba(217,255,0,0.06),
            0 0 44px -8px rgba(217,255,0,0.09),
            0 22px 56px rgba(0,0,0,0.48);
        }
        .zt-spot-visual {
          margin: 0;
          overflow: hidden;
        }
        .zt-spot-tag {
          font-size: 12px;
          font-weight: 950;
          color: ${LIME};
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 18px 22px 0;
        }
        .zt-spot-title {
          margin: 8px 22px 10px;
          color: var(--zt-fg);
          line-height: 1.2;
        }
        .zt-spot-body {
          font-size: 15px;
          line-height: 1.55;
          color: var(--zt-muted);
          margin: 0 22px;
        }
        .zt-mini-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 0 0 1px rgba(217,255,0,0.12),
            0 0 48px -8px rgba(217,255,0,0.1),
            0 16px 48px rgba(0,0,0,0.5);
        }
        .zt-h3 { font-size: 1.35rem; font-weight: 950; margin: 0 0 10px; letter-spacing: -0.02em; color: var(--zt-fg); }
        @media (max-width: 768px) {
          .zt-h3 {
            font-size: clamp(1.12rem, 3.8vw, 1.32rem);
            line-height: 1.25;
          }
        }
        .zt-h4 { font-size: 1.05rem; font-weight: 950; margin: 0 0 8px; color: var(--zt-fg); }
        .zt-card-p { font-size: 15px; color: var(--zt-muted); line-height: 1.6; margin: 0; }
        .zt-card-p.sm { font-size: 14px; }
        .zt-bento-visual { position: relative; margin-top: 20px; border-radius: 20px; overflow: hidden; border: 1px solid var(--zt-border); }
        .zt-float-badge {
          position: absolute;
          bottom: 14px;
          left: 14px;
          padding: 8px 14px;
          border-radius: 12px;
          background: ${BLACK};
          color: ${LIME};
          font-size: 12px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .zt-icon-stack { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .zt-ico-ring {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          border: 2px solid var(--zt-line);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--zt-fg);
          background: linear-gradient(180deg, #1a1a1a, #000000);
        }
        .zt-bento-row3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 768px) {
          .zt-bento-row3 { grid-template-columns: 1fr; }
        }
        .zt-mini-card {
          background: var(--zt-card);
          border: 1px solid var(--zt-border);
          border-radius: 28px;
          padding: 24px;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .zt-mini-ico {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${LIME};
          margin-bottom: 14px;
        }
        .zt-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .zt-split { grid-template-columns: 1fr; }
        }
        .zt-stat-row { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .zt-stat-num { font-size: clamp(3rem, 8vw, 4.5rem); font-weight: 950; letter-spacing: -0.04em; line-height: 1; }
        .zt-stat-label { font-size: 13px; font-weight: 800; color: var(--zt-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .zt-t-grid-wrap { position: relative; margin-top: 40px; }
        .zt-t-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 900px) {
          .zt-t-grid { grid-template-columns: 1fr; }
        }
        .zt-t-card {
          background: var(--zt-card);
          border: 1px solid var(--zt-border);
          border-radius: 24px;
          padding: 22px;
          text-align: left;
          transition: transform 0.2s ease, border-color 0.2s;
        }
        .zt-t-card:hover {
          border-color: rgba(217,255,0,0.22);
          transform: translateY(-2px);
          box-shadow: 0 0 36px -10px rgba(217,255,0,0.12);
        }
        .zt-t-head { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
        .zt-av {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: ${BLACK};
          color: ${LIME};
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .zt-t-name { font-weight: 900; font-size: 14px; color: var(--zt-fg); }
        .zt-t-role { font-size: 12px; color: var(--zt-faint); font-weight: 600; margin-top: 2px; }
        .zt-t-body { font-size: 14px; color: var(--zt-muted); line-height: 1.55; margin: 0; }
        .zt-t-fade {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 120px;
          pointer-events: none;
          background: linear-gradient(to bottom, transparent, ${BLACK});
        }
        .zt-section.alt .zt-t-fade {
          background: linear-gradient(to bottom, transparent, #050505);
        }
        .zt-t-expanded .zt-t-fade { display: none; }
        .zt-more-wrap { display: flex; justify-content: center; margin-top: 8px; }
        .zt-btn-more {
          margin-top: 8px;
          padding: 12px 24px;
          border-radius: 999px;
          border: 2px solid var(--zt-border);
          background: var(--zt-card);
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--zt-fg);
        }
        .zt-flip { transform: rotate(180deg); transition: transform 0.25s; }
        .zt-blog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 40px;
        }
        @media (max-width: 900px) {
          .zt-blog-grid { grid-template-columns: 1fr; }
        }
        .zt-blog-card {
          background: var(--zt-card);
          border: 1px solid var(--zt-border);
          border-radius: 28px;
          overflow: hidden;
          text-align: left;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .zt-blog-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 0 0 1px rgba(217,255,0,0.1),
            0 0 40px -8px rgba(217,255,0,0.08),
            0 16px 48px rgba(0,0,0,0.45);
        }
        .zt-blog-img-wrap { aspect-ratio: 16/10; overflow: hidden; background: #000000; }
        .zt-blog-date { display: block; font-size: 12px; font-weight: 800; color: var(--zt-faint); padding: 16px 20px 0; }
        .zt-blog-title {
          font-size: clamp(1.12rem, 2vw, 1.35rem);
          font-weight: 600;
          letter-spacing: -0.024em;
          margin: 8px 0 10px;
          padding: 0 20px;
          color: var(--zt-fg);
          line-height: 1.25;
        }
        .zt-blog-card .zt-card-p { padding: 0 20px 22px; }
        .zt-section--faq {
          padding-top: 120px;
          padding-bottom: 120px;
        }
        .zt-faq { display: flex; flex-direction: column; gap: 12px; margin-top: 32px; }
        .zt-faq-item {
          width: 100%;
          text-align: left;
          border: 1px solid var(--zt-border);
          background: var(--zt-card);
          border-radius: 20px;
          padding: 20px 22px;
          cursor: pointer;
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .zt-faq-item:hover {
          border-color: rgba(217,255,0,0.2);
          box-shadow: 0 0 32px -12px rgba(217,255,0,0.08);
        }
        .zt-faq-q { display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 15px; color: var(--zt-fg); }
        .zt-faq-a { margin: 14px 0 0; padding-top: 14px; border-top: 1px solid var(--zt-border); color: var(--zt-muted); font-size: 15px; line-height: 1.6; }
        .zt-cta-band {
          position: relative;
          background: ${BLACK};
          color: ${WHITE};
          height: 285px;
          padding-top: 64px;
          padding-bottom: 64px;
          padding-left: max(60px, env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          margin: 0;
          border: 1px solid rgba(0, 0, 0, 1);
          border-radius: 57px 0 0 0;
          overflow: hidden;
        }
        .zt-cta-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .zt-cta-title {
          margin: 0 0 10px;
          max-width: 520px;
          line-height: 1.12;
          color: ${WHITE};
        }
        .zt-cta-sub { margin: 0; color: rgba(255,255,255,0.75); font-size: 15px; max-width: 480px; line-height: 1.55; }
        /* Hub-and-spoke — integrações / nossos serviços (acima de #capabilities) */
        .zt-services-hub {
          position: relative;
          z-index: 2;
          scroll-margin-top: 24px;
          background: #000000;
          margin-top: 0;
          margin-bottom: 0;
          padding-top: 57px;
          padding-bottom: clamp(28px, 4vw, 48px);
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          box-sizing: border-box;
          height: auto;
          min-height: 0;
        }
        .zt-services-hub-inner {
          max-width: min(1120px, 100%);
          margin: 0 auto;
          padding-bottom: 0;
        }
        .zt-services-hub-head {
          text-align: center;
          margin-bottom: clamp(28px, 4.5vw, 44px);
        }
        .zt-services-hub-tile {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 16px;
          background: linear-gradient(165deg, #151c16 0%, #0a100c 98%);
          border: 1px solid rgba(217, 255, 0, 0.42);
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.4),
            0 0 24px -8px rgba(217, 255, 0, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .zt-services-hub-logo {
          width: 38px;
          height: 38px;
          object-fit: contain;
          filter: brightness(0) invert(1);
          opacity: 0.95;
          pointer-events: none;
          user-select: none;
        }
        .zt-services-hub-tile--mob .zt-services-hub-logo {
          width: 32px;
          height: 32px;
        }
        .zt-services-hub-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .zt-services-hub-title {
          font-family: var(--zt-font-heading);
          font-size: 45px;
          font-weight: 500;
          letter-spacing: -0.04em;
          line-height: 1.1;
          margin: 0 auto 14px;
          max-width: min(920px, 100%);
          color: ${WHITE};
          text-wrap: balance;
        }
        .zt-services-hub-lead {
          margin: 0 auto;
          max-width: 560px;
          font-size: clamp(14px, 1.55vw, 17px);
          line-height: 1.62;
          font-weight: 600;
          color: rgba(148, 163, 184, 0.95);
        }
        .zt-services-hub-diagram {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          position: relative;
        }
        .zt-services-hub-ripples {
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .zt-services-hub-ripples {
            display: none;
          }
        }
        .zt-services-hub-svg {
          display: block;
          width: 100%;
          height: auto;
          min-height: 280px;
          overflow: visible;
        }
        .zt-services-hub-svg--mobile {
          display: none;
        }
        .zt-services-hub-svg--desktop {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          width: 989px;
          max-width: 100%;
          height: 347px;
        }
        .zt-services-hub-path {
          stroke-dasharray: 10 14;
          stroke-dashoffset: 0;
          animation: zt-hub-wire-flow 3.2s linear infinite;
        }
        @keyframes zt-hub-wire-flow {
          to {
            stroke-dashoffset: -48;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .zt-services-hub-path {
            animation: none;
            stroke-dasharray: unset;
          }
        }
        @media (max-width: 768px) {
          .zt-services-hub {
            min-height: 0;
            padding-top: clamp(44px, 5vw, 57px);
          }
          .zt-services-hub-diagram {
            max-width: 420px;
            overflow-x: visible;
            margin-left: auto;
            margin-right: auto;
          }
          .zt-services-hub-svg--desktop {
            display: none;
          }
          .zt-services-hub-svg--mobile {
            display: block;
            min-height: 580px;
            max-height: none;
          }
        }
        /* Bento features (landing): fundo preto sólido, grelha como referência */
        .zt-bento-features {
          position: relative;
          z-index: 2;
          display: flex;
          flex-wrap: wrap;
          width: 100%;
          box-sizing: border-box;
          scroll-margin-top: 24px;
          background: #000000;
          margin-top: clamp(36px, 5vw, 72px);
          margin-bottom: clamp(48px, 8vw, 120px);
          min-height: 0;
          height: auto;
          padding-bottom: clamp(48px, 7vw, 88px);
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .zt-bento-features-inner {
          max-width: min(1000px, 100%);
          width: 100%;
          margin-inline: auto;
          box-sizing: border-box;
          min-height: 0;
          height: auto;
        }
        .zt-bento-features-kicker {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.65rem, 4.5vw, 2.85rem);
          font-weight: 500;
          letter-spacing: -0.04em;
          color: ${WHITE};
          margin: 0 0 clamp(24px, 4vw, 36px);
          text-align: center;
          line-height: 1.08;
          text-wrap: balance;
        }
        .zt-bento-features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr minmax(260px, 320px);
          grid-template-rows: auto auto;
          gap: 20px;
          align-items: stretch;
        }
        .zt-bento-cap--tall {
          grid-column: 3;
          grid-row: 1 / span 2;
        }
        .zt-bento-cap--wide {
          grid-column: 1 / span 2;
          grid-row: 2;
        }
        @media (max-width: 960px) {
          /* Mobile / tablet: 2×2 — dois cards por linha */
          .zt-bento-features-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: none;
            gap: clamp(12px, 3vw, 18px);
          }
          .zt-bento-cap--tall {
            grid-column: auto;
            grid-row: auto;
          }
          .zt-bento-cap--wide {
            grid-column: auto;
            grid-row: auto;
          }
        }
        .zt-bento-cap {
          display: flex;
          flex-direction: column;
          text-align: left;
          padding: clamp(22px, 3vw, 28px);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(165deg, #141414 0%, #0a0a0a 100%);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
          min-height: 0;
        }
        .zt-bento-cap-title {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.05rem, 1.8vw, 1.2rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: ${WHITE};
          margin: 0 0 10px;
          line-height: 1.25;
        }
        .zt-bento-cap-sub {
          font-size: clamp(13px, 1.35vw, 14px);
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.58);
          margin: 0 0 18px;
          flex-shrink: 0;
        }
        .zt-bento-cap--tall .zt-bento-mock--chat {
          flex: 1;
          min-height: min(320px, 42vh);
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 960px) {
          .zt-bento-cap {
            padding: clamp(14px, 3.2vw, 22px);
            border-radius: 22px;
          }
          .zt-bento-cap--tall .zt-bento-mock--chat {
            min-height: min(200px, 36vh);
          }
        }
        .zt-bento-mock {
          margin-top: auto;
          background: ${WHITE};
          border-radius: 14px;
          padding: 14px 14px 12px;
          font-size: 11px;
          color: #0f172a;
          box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
        }
        .zt-bento-mock-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .zt-bento-mock-total {
          font-weight: 600;
          color: #334155;
        }
        .zt-bento-mock-total strong {
          font-weight: 900;
          color: #0f172a;
        }
        .zt-bento-mock-pill {
          font-size: 10px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 999px;
          background: #000000;
          color: ${WHITE};
        }
        .zt-bento-status-list {
          list-style: none;
          margin: 0 0 12px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .zt-bento-status-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #475569;
        }
        .zt-bento-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .zt-bento-dot--blue { background: #3b82f6; }
        .zt-bento-dot--purple { background: #8b5cf6; }
        .zt-bento-dot--orange { background: #f97316; }
        .zt-bento-dot--green { background: #22c55e; }
        .zt-bento-segbar {
          display: flex;
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: #e2e8f0;
        }
        .zt-bento-seg { min-width: 4px; }
        .zt-bento-seg--blue { background: #3b82f6; }
        .zt-bento-seg--purple { background: #8b5cf6; }
        .zt-bento-seg--orange { background: #f97316; }
        .zt-bento-seg--green { background: #22c55e; }
        .zt-bento-flow-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 10px;
        }
        .zt-bento-flow-card {
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          margin-bottom: 10px;
        }
        .zt-bento-flow-title {
          font-weight: 700;
          font-size: 11px;
          color: #0f172a;
          line-height: 1.35;
          margin-bottom: 8px;
        }
        .zt-bento-flow-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .zt-bento-tag-hi {
          font-size: 9px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(249, 115, 22, 0.15);
          color: #c2410c;
        }
        .zt-bento-mini-av {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: #000000;
          color: ${LIME};
          font-size: 9px;
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zt-bento-dashed-add {
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          padding: 10px;
          text-align: center;
          font-weight: 800;
          font-size: 11px;
          color: #64748b;
        }
        .zt-bento-cap--flow .zt-bento-cap-title {
          margin-bottom: 14px;
        }
        .zt-bento-mock--flow {
          flex: 1 1 auto;
          min-height: min(280px, 34vh);
          padding: 18px 16px 16px;
          font-size: 12px;
        }
        .zt-bento-mock--flow .zt-bento-flow-label {
          font-size: 11px;
          margin-bottom: 12px;
        }
        .zt-bento-mock--flow .zt-bento-flow-card {
          padding: 14px 14px;
          margin-bottom: 12px;
          border-radius: 14px;
        }
        .zt-bento-mock--flow .zt-bento-flow-title {
          font-size: 13px;
          margin-bottom: 10px;
          line-height: 1.4;
        }
        .zt-bento-mock--flow .zt-bento-tag-hi {
          font-size: 10px;
          padding: 4px 10px;
        }
        .zt-bento-mock--flow .zt-bento-mini-av {
          width: 30px;
          height: 30px;
          font-size: 10px;
        }
        .zt-bento-mock--flow .zt-bento-dashed-add {
          padding: 14px 12px;
          font-size: 12px;
          border-radius: 14px;
        }
        @media (max-width: 960px) {
          .zt-bento-mock--flow {
            min-height: min(240px, 38vh);
            padding: 16px 14px 14px;
          }
        }
        .zt-bento-chat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .zt-bento-chat-title {
          font-weight: 800;
          font-size: 12px;
          color: #0f172a;
        }
        .zt-bento-chat-badge {
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          background: #7c3aed;
          color: ${WHITE};
          font-size: 11px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .zt-bento-chat-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
          overflow: hidden;
        }
        .zt-bento-chat-list li {
          display: grid;
          grid-template-columns: 32px 1fr auto;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .zt-bento-chat-av {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: ${WHITE};
          font-size: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zt-bento-chat-av--b {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }
        .zt-bento-chat-av--c {
          background: linear-gradient(135deg, #0ea5e9, #38bdf8);
        }
        .zt-bento-chat-av--d {
          background: linear-gradient(135deg, #10b981, #34d399);
        }
        .zt-bento-chat-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .zt-bento-chat-name {
          font-weight: 800;
          font-size: 11px;
          color: #0f172a;
        }
        .zt-bento-chat-snippet {
          font-size: 10px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .zt-bento-chat-time {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .zt-bento-table-cap {
          font-weight: 800;
          font-size: 12px;
          color: #0f172a;
          margin-bottom: 10px;
        }
        .zt-bento-table {
          display: flex;
          flex-direction: column;
          gap: 0;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }
        .zt-bento-table-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #334155;
          border-top: 1px solid #f1f5f9;
        }
        .zt-bento-table-row:first-child {
          border-top: none;
        }
        .zt-bento-table-row--head {
          background: #f8fafc;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
        }
        .zt-bento-table-avs {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .zt-bento-tav {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          border: 2px solid ${WHITE};
          margin-left: -8px;
          background: #0f172a;
          color: ${WHITE};
          font-size: 9px;
          font-weight: 950;
          font-style: normal;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .zt-bento-tav:first-child {
          margin-left: 0;
        }
        /* Destaque em gradiente (limão) — títulos de secção e cartões */
        .zt-section-head__plain,
        .zt-section-head__grad {
          font-weight: 500;
        }
        .zt-section-head__grad {
          background: linear-gradient(92deg, ${LIME} 0%, #c8f030 40%, #f2ff9c 78%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        /* Faixa métricas — modelo “why teams choose”, preto / limão / branco */
        .zt-metric-band {
          position: relative;
          z-index: 2;
          scroll-margin-top: 24px;
          background: #000000;
          padding-top: clamp(40px, 6vw, 72px);
          padding-bottom: clamp(40px, 6vw, 72px);
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        #equipas.zt-metric-band {
          border-radius: 100px;
          box-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.15);
          padding-top: clamp(40px, 6vw, 96px);
          padding-bottom: clamp(40px, 6vw, 96px);
        }
        .zt-metric-band-inner {
          max-width: min(1120px, 100%);
          margin: 0 auto;
        }
        .zt-metric-band-head {
          text-align: center;
          margin-bottom: clamp(28px, 4vw, 40px);
        }
        .zt-metric-band-title {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.75rem, 4.8vw, 3.1rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          color: ${WHITE};
          margin: 0 0 12px;
          line-height: 1.08;
          text-wrap: balance;
        }
        .zt-metric-band-sub {
          margin: 0 auto;
          max-width: 640px;
          font-size: clamp(14px, 1.45vw, 16px);
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.52);
          font-weight: 600;
        }
        .zt-metric-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: clamp(12px, 2vw, 18px);
          align-items: stretch;
        }
        @media (max-width: 960px) {
          .zt-metric-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 520px) {
          .zt-metric-grid {
            grid-template-columns: 1fr;
          }
        }
        .zt-metric-card {
          position: relative;
          border-radius: 20px;
          padding: 20px 18px 18px;
          min-height: 168px;
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .zt-metric-card:hover {
          border-color: rgba(217, 255, 0, 0.22);
          box-shadow: 0 0 40px -12px rgba(217, 255, 0, 0.12);
          transform: translateY(-2px);
        }
        .zt-metric-card--glow {
          background: radial-gradient(
            ellipse 130% 90% at 18% 0%,
            rgba(217, 255, 0, 0.16) 0%,
            rgba(18, 28, 14, 0.55) 42%,
            #070707 100%
          );
          border-color: rgba(217, 255, 0, 0.14);
        }
        .zt-metric-card--solid {
          margin-top: 63px;
          background: rgba(255, 255, 255, 0.035);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .zt-metric-card-top {
          height: 127px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: auto;
        }
        .zt-metric-val {
          font-family: var(--zt-font-heading);
          font-size: clamp(2rem, 4.2vw, 2.65rem);
          font-weight: 950;
          letter-spacing: -0.045em;
          color: ${WHITE};
          line-height: 1;
        }
        .zt-metric-deco {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          flex-shrink: 0;
          background: linear-gradient(145deg, ${LIME} 0%, #6b8f1e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
        }
        .zt-metric-deco-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: ${WHITE};
        }
        .zt-metric-desc {
          margin: 20px 0 0;
          font-size: 13px;
          line-height: 1.52;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.52);
        }
        /* Faixa única (frase em degradê) — abaixo de #capabilities; cola ao topo ao fazer scroll */
        .zt-showcase-prelude {
          position: sticky;
          top: 0;
          z-index: 15;
          scroll-margin-top: 24px;
          height: 303px;
          padding-top: 0;
          padding-bottom: 0;
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          background: #000000;
        }
        .zt-showcase-prelude-inner {
          max-width: min(1060px, 100%);
          margin: 0 auto;
          text-align: center;
        }
        .zt-showcase-prelude-cycle {
          position: relative;
          width: 100%;
          max-width: 1060px;
          margin: 0 auto;
          height: 108px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zt-showcase-prelude-line {
          margin: 0;
          max-width: 1060px;
          padding: 0 clamp(8px, 2vw, 20px);
          box-sizing: border-box;
          font-family: var(--zt-font-heading);
          font-size: clamp(2.2rem, 6.4vw + 0.62rem, 4.15rem);
          font-weight: 650;
          letter-spacing: -0.042em;
          line-height: 1.12;
          text-wrap: balance;
          overflow-wrap: break-word;
          word-wrap: break-word;
          background: linear-gradient(92deg, ${LIME} 0%, #c8f030 42%, #f2ff9c 80%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .zt-showcase-prelude-line--current {
          animation: ztPreludePhraseIn 0.58s ease both;
        }
        @keyframes ztPreludePhraseIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .zt-showcase-prelude-line--current {
            animation: none;
          }
        }
        @media (max-width: 640px) {
          .zt-showcase-prelude-line {
            line-height: 1.22;
            font-size: clamp(1.9rem, 7vw + 0.48rem, 2.95rem);
          }
        }
        /* 3 passos — fundo preto, texto claro + limão (alinhado ao resto da malha escura) */
        .zt-steps {
          position: relative;
          z-index: 2;
          scroll-margin-top: 24px;
          color: ${WHITE};
          background: #000000;
          padding-top: clamp(48px, 7vw, 88px);
          padding-bottom: clamp(56px, 8vw, 96px);
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          border-bottom-left-radius: clamp(20px, 3vw, 40px);
          border-bottom-right-radius: clamp(20px, 3vw, 40px);
          overflow: hidden;
        }
        .zt-steps-inner {
          max-width: min(1120px, 100%);
          margin: 0 auto;
        }
        .zt-steps-head {
          text-align: center;
          margin-bottom: clamp(36px, 5vw, 52px);
        }
        .zt-steps-title {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.85rem, 5vw, 3.15rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          color: ${WHITE};
          margin: 0 0 14px;
          line-height: 1.08;
          text-wrap: balance;
        }
        .zt-steps-title .zt-section-head__plain {
          color: #ffffff;
        }
        .zt-steps-lead {
          margin: 0 auto;
          max-width: 560px;
          font-size: clamp(14px, 1.5vw, 16px);
          line-height: 1.62;
          color: rgba(255, 255, 255, 0.55);
          font-weight: 600;
        }
        /* Planos — preto + cinza muito escuro (sem ardósia/azul) */
        .zt-pricing {
          position: relative;
          z-index: 2;
          scroll-margin-top: 24px;
          padding-top: clamp(56px, 9vw, 100px);
          padding-bottom: clamp(64px, 10vw, 112px);
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          background: ${BLACK};
          color: ${WHITE};
          overflow: hidden;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .zt-pricing-ambient {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 55% 70% at 0% 40%, rgba(217, 255, 0, 0.14) 0%, transparent 55%),
            radial-gradient(ellipse 50% 65% at 100% 55%, rgba(217, 255, 0, 0.08) 0%, transparent 52%);
        }
        .zt-pricing-inner {
          position: relative;
          z-index: 1;
          max-width: min(1120px, 100%);
          margin: 0 auto;
        }
        .zt-pricing-head {
          text-align: center;
          margin-bottom: clamp(40px, 6vw, 56px);
        }
        .zt-pricing-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px 8px 14px;
          margin-bottom: 20px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.9);
          background: rgba(12, 12, 12, 0.94);
          border: 1px solid rgba(217, 255, 0, 0.28);
          box-shadow: 0 0 32px -10px rgba(217, 255, 0, 0.2);
        }
        .zt-pricing-eyebrow svg {
          color: ${LIME};
        }
        .zt-pricing-title {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.85rem, 5.2vw, 3.15rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.08;
          margin: 0 0 clamp(14px, 2.4vw, 22px);
          color: ${WHITE};
          text-wrap: balance;
        }
        .zt-pricing-title .zt-section-head__plain {
          color: #ffffff;
        }
        .zt-pricing-title--hero {
          max-width: min(920px, 100%);
          margin-left: auto;
          margin-right: auto;
        }
        .zt-pricing-lead {
          margin: 0 auto 28px;
          max-width: 560px;
          font-size: clamp(15px, 1.65vw, 18px);
          line-height: 1.62;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.55);
        }
        .zt-pricing-toggle {
          display: inline-flex;
          align-items: center;
          padding: 4px;
          border-radius: 999px;
          background: rgba(18, 18, 18, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          gap: 4px;
        }
        .zt-pricing-toggle-opt {
          appearance: none;
          border: none;
          cursor: pointer;
          padding: 10px 22px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          color: rgba(255, 255, 255, 0.45);
          background: transparent;
          transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .zt-pricing-toggle-opt.is-active {
          color: #0a0a0f;
          background: ${LIME};
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
        }
        .zt-pricing-toggle-opt:not(.is-active):hover {
          color: rgba(255, 255, 255, 0.75);
        }
        .zt-pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          column-gap: clamp(20px, 2.5vw, 32px);
          row-gap: 28px;
          align-items: stretch;
        }
        @media (max-width: 960px) {
          .zt-pricing-grid {
            grid-template-columns: 1fr;
            max-width: 440px;
            margin: 0 auto;
          }
        }
        .zt-pricing-card {
          position: relative;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          min-height: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }
        .zt-pricing-card--panel {
          background: linear-gradient(165deg, #2a2a2a 0%, #141414 44%, #050505 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
          color: ${WHITE};
        }
        .zt-pricing-card--highlight {
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.08),
            0 0 48px -14px rgba(0, 0, 0, 0.65),
            0 32px 72px rgba(0, 0, 0, 0.6);
          z-index: 1;
        }
        @media (min-width: 961px) {
          .zt-pricing-card--highlight {
            transform: translateY(-6px);
          }
        }
        .zt-pricing-card-ribbon {
          text-align: center;
          padding: 10px 16px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #f0f0f0;
          background: linear-gradient(180deg, #2c2c2c 0%, #1a1a1a 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .zt-pricing-card-body {
          padding: 26px 26px 28px;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .zt-pricing-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .zt-pricing-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(165deg, #333333 0%, #1c1c1c 100%);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .zt-pricing-card-name {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.15rem, 2.2vw, 1.35rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin: 0;
          text-wrap: balance;
          color: #fafafa;
        }
        .zt-pricing-desc {
          margin: 0 0 16px;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.52);
          flex-grow: 0;
        }
        .zt-pricing-price-row {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 6px 10px;
          margin-bottom: 16px;
        }
        .zt-pricing-price {
          font-family: var(--zt-font-heading);
          font-size: clamp(2rem, 4.2vw, 2.6rem);
          font-weight: 950;
          letter-spacing: -0.04em;
          line-height: 1;
          color: #fafafa;
        }
        .zt-pricing-price--consult {
          font-size: clamp(1.35rem, 2.8vw, 1.85rem);
          font-weight: 900;
          letter-spacing: -0.03em;
        }
        .zt-pricing-period {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.48);
        }
        .zt-pricing-rule {
          height: 1px;
          margin: 0 0 14px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
        }
        .zt-pricing-features-label {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.42);
        }
        .zt-pricing-features {
          list-style: none;
          margin: 0 0 22px;
          padding: 0;
          flex: 1;
        }
        .zt-pricing-features li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.45;
          color: rgba(245, 245, 245, 0.9);
        }
        .zt-pricing-feature--disabled {
          opacity: 0.55;
        }
        .zt-pricing-feature--disabled span {
          color: rgba(255, 255, 255, 0.42);
        }
        .zt-pricing-check {
          flex-shrink: 0;
          margin-top: 1px;
          color: rgba(230, 230, 230, 0.92);
        }
        .zt-pricing-check--muted {
          color: rgba(255, 255, 255, 0.22) !important;
        }
        .zt-pricing-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin-top: auto;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          box-sizing: border-box;
          border: 2px solid transparent;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, background 0.15s ease,
            border-color 0.15s ease;
        }
        .zt-pricing-cta:hover {
          transform: translateY(-1px);
        }
        .zt-pricing-cta--outline {
          background: rgba(22, 22, 22, 0.95);
          color: #fafafa;
          border-color: rgba(255, 255, 255, 0.22);
        }
        .zt-pricing-cta--outline:hover {
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
          border-color: rgba(255, 255, 255, 0.38);
          background: rgba(34, 34, 34, 0.98);
        }
        .zt-pricing-cta--lime {
          background: ${LIME};
          color: #0a0a0f;
          border-color: ${LIME};
          box-shadow: 0 8px 28px rgba(217, 255, 0, 0.22);
        }
        .zt-pricing-cta--lime:hover {
          box-shadow: 0 12px 36px rgba(217, 255, 0, 0.35);
        }
        .zt-pricing-cta--light {
          background: #ffffff;
          color: #0a0a0a;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.35) inset;
        }
        .zt-pricing-cta--light:hover {
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.2);
        }
        .zt-pricing-cta--dark {
          background: #0a0a0a;
          color: #fafafa;
        }
        .zt-pricing-cta--dark:hover {
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.25);
        }
        #planos.zt-pricing {
          opacity: 0.97;
          box-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.15);
        }
        /* #planos — só escala de cinza/preto (sem ardósia, roxo ou azul visual) */
        #planos .zt-pricing-ambient {
          background:
            radial-gradient(ellipse 55% 70% at 0% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 55%),
            radial-gradient(ellipse 50% 65% at 100% 55%, rgba(255, 255, 255, 0.035) 0%, transparent 52%);
        }
        #planos .zt-pricing-eyebrow {
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: none;
        }
        #planos .zt-pricing-eyebrow svg {
          color: #c8c8c8;
        }
        #planos .zt-pricing-toggle-opt.is-active {
          color: #0a0a0a;
          background: #e4e4e4;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
        }
        #planos .zt-pricing-cta--lime {
          background: #ececec;
          color: #0a0a0a;
          border-color: #ececec;
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.3);
        }
        #planos .zt-pricing-cta--lime:hover {
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.38);
        }
        /* FAQ dentro de #planos — acordeão (continua no fundo preto da secção) */
        .zt-pricing-faq {
          position: relative;
          z-index: 1;
          margin-top: clamp(28px, 5vw, 48px);
          padding-top: clamp(40px, 6vw, 72px);
          padding-bottom: clamp(4px, 1vw, 12px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          scroll-margin-top: 24px;
          color: ${WHITE};
        }
        .zt-lp-faq-inner {
          max-width: min(720px, 100%);
          margin: 0 auto;
        }
        .zt-lp-faq-head {
          text-align: center;
          margin-bottom: clamp(32px, 5vw, 44px);
        }
        .zt-lp-faq-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 16px 7px 14px;
          margin-bottom: 18px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.88);
          background: rgba(24, 24, 24, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
        }
        .zt-lp-faq-badge svg {
          color: #c4c4c4;
        }
        .zt-lp-faq-title {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.85rem, 5.2vw, 3.15rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.08;
          margin: 0 0 clamp(14px, 2.2vw, 20px);
          color: #ffffff;
          text-wrap: balance;
        }
        .zt-lp-faq-title .zt-section-head__plain {
          color: #ffffff;
        }
        .zt-lp-faq-lead {
          margin: 0 auto;
          max-width: 520px;
          font-size: clamp(14px, 1.55vw, 17px);
          line-height: 1.62;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.55);
        }
        .zt-lp-faq-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .zt-lp-faq-row {
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          transition: border-color 0.22s ease, box-shadow 0.22s ease;
        }
        .zt-lp-faq-row:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }
        .zt-lp-faq-row.is-open {
          border-color: rgba(255, 255, 255, 0.18);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
        }
        .zt-lp-faq-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          border: none;
          margin: 0;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          background: transparent;
          color: #fafafa;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.35;
        }
        .zt-lp-faq-trigger:focus-visible {
          outline: 2px solid ${LIME};
          outline-offset: 2px;
        }
        .zt-lp-faq-qtext {
          flex: 1;
          min-width: 0;
        }
        .zt-lp-faq-icon {
          flex-shrink: 0;
          display: inline-flex;
          color: #fafafa;
          transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .zt-lp-faq-row.is-open .zt-lp-faq-icon {
          transform: rotate(45deg);
        }
        .zt-lp-faq-panel {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0 20px 18px;
        }
        .zt-lp-faq-panel[hidden] {
          display: none;
        }
        .zt-lp-faq-answer {
          margin: 14px 0 0;
          font-size: 15px;
          line-height: 1.62;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.58);
        }
        @media (prefers-reduced-motion: reduce) {
          .zt-lp-faq-icon {
            transition: none;
          }
        }
        .zt-steps-split {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: clamp(28px, 4vw, 44px);
          align-items: start;
        }
        @media (max-width: 900px) {
          .zt-steps-split {
            grid-template-columns: 1fr;
          }
        }
        .zt-steps-visual-bg {
          border-radius: 32px;
          padding: clamp(18px, 3vw, 28px);
          min-height: min(420px, 52vw);
          background: linear-gradient(
            145deg,
            rgba(217, 255, 0, 0.14) 0%,
            #141418 42%,
            #050506 100%
          );
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 24px 60px rgba(0, 0, 0, 0.5);
        }
        .zt-steps-browser {
          background: ${WHITE};
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.1);
        }
        .zt-steps-browser-chrome {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }
        .zt-steps-chrome-dots {
          display: flex;
          gap: 5px;
          flex-shrink: 0;
        }
        .zt-steps-chrome-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }
        .zt-steps-url {
          flex: 1;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
        }
        .zt-steps-browser-body {
          display: grid;
          grid-template-columns: 120px 1fr;
          min-height: 220px;
        }
        @media (max-width: 520px) {
          .zt-steps-browser-body {
            grid-template-columns: 1fr;
          }
          .zt-steps-side {
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-direction: row;
            flex-wrap: wrap;
            padding: 10px;
          }
          .zt-steps-side-nav {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 6px;
          }
          .zt-steps-side-item {
            font-size: 10px;
            padding: 4px 2px;
          }
        }
        .zt-steps-side {
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 10px;
          background: #0f0f12;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .zt-steps-side-mark {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          background: ${BLACK};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zt-steps-side-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .zt-steps-side-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.52);
          padding: 6px 4px;
          border-radius: 8px;
        }
        .zt-steps-side-item--on {
          background: rgba(217, 255, 0, 0.18);
          color: #f8fafc;
        }
        .zt-steps-main {
          height: 328px;
          padding: 12px 14px 16px;
          background: ${WHITE};
          box-sizing: border-box;
        }
        .zt-steps-main-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 12px;
        }
        .zt-steps-tab {
          font-size: 10px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 8px;
          color: #94a3b8;
        }
        .zt-steps-tab--on {
          background: #000000;
          color: ${LIME};
        }
        .zt-steps-board {
          border-radius: 12px;
          border: 1px dashed #cbd5e1;
          padding: 10px;
          background: #f8fafc;
        }
        .zt-steps-col-h {
          font-size: 9px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          margin-bottom: 8px;
        }
        .zt-steps-card-mock {
          background: ${WHITE};
          border-radius: 10px;
          padding: 10px;
          border: 1px solid #e2e8f0;
        }
        .zt-steps-pill {
          display: inline-block;
          font-size: 9px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(217, 255, 0, 0.35);
          color: #14532d;
          margin-bottom: 6px;
        }
        .zt-steps-card-t {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.35;
          margin-bottom: 4px;
        }
        .zt-steps-card-meta {
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
        }
        .zt-steps-cards {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .zt-step-card {
          border-radius: 22px;
          padding: 20px 22px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .zt-step-card:hover {
          border-color: rgba(217, 255, 0, 0.45);
        }
        .zt-step-card--featured {
          border-color: rgba(217, 255, 0, 0.35);
          background: linear-gradient(
            165deg,
            rgba(217, 255, 0, 0.12) 0%,
            rgba(255, 255, 255, 0.06) 45%,
            rgba(12, 12, 16, 0.95) 100%
          );
          box-shadow: 0 0 0 1px rgba(217, 255, 0, 0.14);
        }
        .zt-step-card-top {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .zt-step-num {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: ${LIME};
          color: ${BLACK};
          font-size: 13px;
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zt-step-h {
          margin: 0 0 8px;
          font-family: var(--zt-font-heading);
          font-size: clamp(1.02rem, 1.6vw, 1.15rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fafafa;
          line-height: 1.25;
        }
        .zt-step-p {
          margin: 0;
          font-size: 14px;
          line-height: 1.58;
          color: rgba(255, 255, 255, 0.58);
          font-weight: 600;
        }
        .zt-step-embed {
          margin-top: 16px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .zt-step-embed-title {
          font-size: 12px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.78);
          margin-bottom: 10px;
          text-align: center;
        }
        .zt-step-embed-btn {
          width: 100%;
          display: block;
          margin-bottom: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          border: none;
          font-family: inherit;
        }
        .zt-step-embed-btn:last-child {
          margin-bottom: 0;
        }
        .zt-step-embed-btn--lime {
          background: ${LIME};
          color: ${BLACK};
        }
        .zt-step-embed-btn--dark {
          background: rgba(255, 255, 255, 0.08);
          color: #f1f5f9;
          border: 1px solid rgba(255, 255, 255, 0.16);
        }
        .zt-step-embed-btn--dark:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.22);
        }
        /* Inbox demo — secção abaixo de #comecar (só layout visual) */
        .zt-idemo {
          position: relative;
          z-index: 2;
          scroll-margin-top: 24px;
          color: ${WHITE};
          background: #000000;
          padding-top: clamp(44px, 7vw, 80px);
          padding-bottom: clamp(56px, 9vw, 100px);
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        @media (min-width: 901px) {
          #conversar-aqui.zt-idemo {
            min-height: 1073px;
          }
        }
        .zt-idemo-ring {
          position: absolute;
          left: 50%;
          top: 38%;
          width: min(1180px, 160vw);
          height: min(1180px, 160vw);
          transform: translate(-50%, -50%);
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(circle, rgba(217, 255, 0, 0.07) 0%, transparent 62%);
          box-shadow: 0 0 0 1px rgba(217, 255, 0, 0.12);
        }
        .zt-idemo-inner {
          position: relative;
          z-index: 1;
          max-width: min(1120px, 100%);
          margin: 0 auto;
        }
        .zt-idemo-head {
          text-align: center;
          margin-bottom: clamp(28px, 4vw, 40px);
        }
        .zt-idemo-title {
          font-family: var(--zt-font-heading);
          font-size: clamp(1.75rem, 4.8vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          color: ${WHITE};
          margin: 0 0 14px;
          line-height: 1.08;
          text-wrap: balance;
        }
        .zt-idemo-title .zt-section-head__plain {
          color: #ffffff;
        }
        .zt-idemo-lead {
          margin: 0 auto;
          max-width: 560px;
          font-size: clamp(14px, 1.5vw, 16px);
          line-height: 1.62;
          color: rgba(255, 255, 255, 0.55);
          font-weight: 600;
        }
        .zt-idemo-logos {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: stretch;
          gap: clamp(10px, 2vw, 16px);
          margin-bottom: clamp(28px, 4vw, 40px);
          height: 63px;
          padding-top: 0;
          padding-bottom: 0;
          box-sizing: border-box;
        }
        .zt-idemo-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .zt-idemo-logo-mark {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(217, 255, 0, 0.16);
          color: #f8fafc;
          font-size: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .zt-idemo-logo-txt {
          font-size: 12px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.82);
          white-space: nowrap;
        }
        @media (max-width: 720px) {
          .zt-idemo-logo--hide-sm {
            display: none;
          }
        }
        @media (max-width: 520px) {
          .zt-idemo-logo--hide-xs {
            display: none;
          }
          .zt-idemo-logo-txt {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
        .zt-idemo-visual-wrap {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 1120px;
          max-width: 100%;
          margin-inline: auto;
          height: 608px;
          min-height: 0;
          gap: 0;
        }
        @media (min-width: 1024px) {
          .zt-idemo-visual-wrap {
            min-height: 608px;
          }
        }
        @media (max-width: 640px) {
          .zt-idemo-visual-wrap {
            overflow: hidden;
            border-radius: clamp(18px, 4vw, 24px);
          }
        }
        .zt-idemo-visual-bg {
          position: relative;
          display: grid;
          justify-content: center;
          align-items: center;
          column-gap: 0;
          row-gap: 0;
          gap: 0;
          width: 1067px;
          max-width: min(1067px, 100%);
          margin-inline: 0;
          margin-top: 65px;
          height: 631px;
          min-height: 0;
          border-radius: 17px;
          padding: 34px 12px;
          box-sizing: content-box;
          background: linear-gradient(
            145deg,
            rgba(217, 255, 0, 0.12) 0%,
            rgba(20, 20, 24, 1) 57%,
            rgba(5, 5, 6, 1) 100%
          );
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 24px 60px rgba(0, 0, 0, 0.5);
        }
        .zt-idemo-visual-bg > .zt-idemo-browser {
          width: 100%;
          max-width: 1060px;
        }
        @media (max-width: 900px) {
          .zt-idemo-visual-wrap {
            width: 100%;
            max-width: 100%;
            height: auto;
            min-height: 0;
            margin-inline: auto;
          }
          .zt-idemo-visual-bg {
            width: 100%;
            max-width: 100%;
            margin-top: 0;
            height: auto;
            min-height: min(658px, 88vh);
            padding: 52px 29px max(14px, env(safe-area-inset-bottom, 0px));
            border-radius: clamp(18px, 4vw, 22px);
            box-sizing: border-box;
          }
        }
        .zt-idemo-fab {
          position: absolute;
          right: clamp(12px, 2.5vw, 22px);
          bottom: clamp(12px, 2.5vw, 22px);
          z-index: 3;
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border-radius: 50%;
          background: ${WHITE};
          color: #0f172a;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22);
          pointer-events: none;
        }
        .zt-idemo-fab svg {
          color: ${BLACK};
        }
        .zt-idemo-browser {
          position: relative;
          z-index: 1;
          background: ${WHITE};
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
        }
        @media (max-width: 900px) {
          .zt-idemo-browser {
            display: flex;
            flex-direction: column;
            flex: 1 1 auto;
            min-height: 0;
            max-height: min(78vh, 640px);
            overflow: hidden;
          }
          .zt-idemo-browser-chrome,
          .zt-idemo-topbar {
            flex-shrink: 0;
          }
        }
        .zt-idemo-browser-chrome {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }
        .zt-idemo-chrome-dots {
          display: flex;
          gap: 5px;
          flex-shrink: 0;
        }
        .zt-idemo-chrome-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }
        .zt-idemo-url {
          flex: 1;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
        }
        .zt-idemo-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 12px;
          background: #fafafa;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }
        .zt-idemo-search {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
          padding: 6px 10px;
          border-radius: 10px;
          background: ${WHITE};
          border: 1px solid #e2e8f0;
          font-size: 10px;
          font-weight: 600;
          color: #94a3b8;
        }
        .zt-idemo-search svg {
          flex-shrink: 0;
          color: #94a3b8;
        }
        .zt-idemo-topbar-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .zt-idemo-icon-btn {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: ${WHITE};
          border: 1px solid #e2e8f0;
          color: #475569;
        }
        .zt-idemo-pill-safe {
          display: none;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: ${LIME};
          color: ${BLACK};
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.04em;
        }
        .zt-idemo-pill-safe svg {
          flex-shrink: 0;
        }
        @media (min-width: 520px) {
          .zt-idemo-pill-safe {
            display: inline-flex;
          }
        }
        .zt-idemo-user {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .zt-idemo-user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: #0f172a;
          color: #f8fafc;
          font-size: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zt-idemo-user-meta {
          display: flex;
          flex-direction: column;
          gap: 0;
          line-height: 1.15;
        }
        .zt-idemo-user-name {
          font-size: 11px;
          font-weight: 900;
          color: #0f172a;
        }
        .zt-idemo-user-role {
          font-size: 9px;
          font-weight: 800;
          color: #64748b;
        }
        @media (max-width: 480px) {
          .zt-idemo-user-meta {
            display: none;
          }
        }
        .zt-idemo-shell {
          display: grid;
          grid-template-columns: 52px minmax(0, 282px) minmax(0, 540px) minmax(0, 138px);
          min-height: 280px;
          background: #f8fafc;
        }
        /* Tablet/telemóvel: só rail + conversa (uma thread); lista oculta — demo animada nas mensagens */
        @media (max-width: 900px) {
          .zt-idemo-shell {
            grid-template-columns: 48px minmax(0, 1fr);
            grid-template-rows: minmax(0, 1fr);
            flex: 1 1 auto;
            min-height: 0;
            align-items: stretch;
            overflow: hidden;
          }
          .zt-idemo-rail {
            grid-column: 1;
            grid-row: 1 / -1;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            align-self: stretch;
            width: 48px;
            min-width: 48px;
            box-sizing: border-box;
            background: #f4f4f4f4;
            border-right: 1px solid rgba(15, 23, 42, 0.08);
            border-bottom: none;
            padding: 22px 6px 16px;
            gap: 16px;
            flex-wrap: nowrap;
            overflow-x: visible;
            overflow-y: auto;
            min-height: 0;
          }
          .zt-idemo-rail-item {
            width: 30px;
            height: 30px;
            border-radius: 9px;
            flex-shrink: 0;
          }
          .zt-idemo-rail-item svg {
            width: 14px;
            height: 14px;
          }
          .zt-idemo-rail-item--brand svg {
            width: 15px;
            height: 15px;
          }
          .zt-idemo-list {
            display: none !important;
          }
          .zt-idemo-chat {
            grid-column: 2;
            grid-row: 1 / -1;
            display: flex;
            flex-direction: column;
            min-width: 0;
            min-height: 0;
            overflow: hidden;
          }
          .zt-idemo-chat-av {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .zt-idemo-chat-head {
            align-items: center;
            width: auto;
            height: auto;
            min-height: 0;
          }
          .zt-idemo-composer {
            width: auto;
            max-width: none;
          }
          .zt-idemo-messages--static {
            display: none !important;
          }
          .zt-idemo-messages--live {
            display: flex !important;
          }
          .zt-idemo-messages {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        @media (max-width: 900px) and (prefers-reduced-motion: reduce) {
          .zt-idemo-messages--static {
            display: flex !important;
          }
          .zt-idemo-messages--live {
            display: none !important;
          }
        }
        .zt-idemo-rail {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 22px 8px 16px;
          background: #f4f4f4f4;
          border-right: 1px solid rgba(15, 23, 42, 0.08);
        }
        @media (min-width: 901px) {
          .zt-idemo-rail {
            margin-top: 11px;
            margin-bottom: 11px;
          }
        }
        .zt-idemo-rail-item {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }
        .zt-idemo-rail-item svg {
          flex-shrink: 0;
        }
        .zt-idemo-rail-item--on {
          background: rgba(217, 255, 0, 0.38);
          color: #0f172a;
        }
        .zt-idemo-rail-item--brand {
          background: #ffffff;
          color: ${LIME};
          border: 1px solid rgba(15, 23, 42, 0.1);
          padding: 3px;
          box-sizing: border-box;
        }
        .zt-idemo-rail-brand-mark {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 901px) {
          .zt-idemo-rail-item--brand .zt-idemo-rail-brand-mark svg {
            width: 18px;
            height: 18px;
          }
        }
        @media (max-width: 640px) {
          .zt-idemo-rail-item--brand .zt-idemo-rail-brand-mark svg {
            width: 16px;
            height: 16px;
          }
        }
        .zt-idemo-list {
          width: 282px;
          max-width: 282px;
          border-right: 1px solid #e2e8f0;
          background: ${WHITE};
          padding: 10px 8px;
          overflow: auto;
          height: 177px;
          min-height: 177px;
          box-sizing: border-box;
        }
        .zt-idemo-list-head {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 10px;
        }
        .zt-idemo-demo-pill {
          align-self: flex-start;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.08em;
          padding: 3px 8px;
          border-radius: 6px;
          background: #e2e8f0;
          color: #475569;
        }
        .zt-idemo-ai-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 37px;
          box-sizing: border-box;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: #14532d;
          padding: 4px 8px;
          border-radius: 8px;
          background: rgba(217, 255, 0, 0.45);
        }
        .zt-idemo-thread {
          display: flex;
          gap: 8px;
          padding: 8px 6px;
          border-radius: 10px;
          margin-bottom: 4px;
        }
        .zt-idemo-thread--active {
          background: #f1f5f9;
        }
        .zt-idemo-thread-av {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: #f4f4f4;
          color: #0f172a;
          border: 1px solid rgba(15, 23, 42, 0.08);
          font-size: 10px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .zt-idemo-thread-av svg {
          flex-shrink: 0;
        }
        .zt-idemo-av-logo {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center top;
          border-radius: inherit;
        }
        .zt-idemo-thread-av--b {
          background: #f4f4f4;
          color: #1e3a8a;
          border-color: rgba(30, 58, 138, 0.2);
        }
        .zt-idemo-thread-body {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .zt-idemo-thread-top {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          align-items: baseline;
        }
        .zt-idemo-thread-name {
          font-size: 10px;
          font-weight: 900;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .zt-idemo-thread-time {
          font-size: 9px;
          font-weight: 700;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .zt-idemo-thread-snippet {
          font-size: 7px;
          font-weight: 600;
          color: #64748b;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .zt-idemo-chat {
          display: flex;
          flex-direction: column;
          background: #f4f4f4;
          min-width: 0;
        }
        .zt-idemo-chat-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          width: 559px;
          height: 52px;
          box-sizing: border-box;
          padding: 10px 27px;
          background: ${WHITE};
          border-bottom: 1px solid #e2e8f0;
        }
        .zt-idemo-chat-av {
          display: none;
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .zt-idemo-chat-av-img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center top;
        }
        .zt-idemo-chat-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .zt-idemo-chat-name {
          font-size: 12px;
          font-weight: 950;
          color: #0f172a;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }
        .zt-idemo-chat-sub {
          font-size: 9px;
          font-weight: 600;
          color: #22c55e;
        }
        .zt-idemo-chat-tools {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .zt-idemo-chat-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 6px 12px 0;
        }
        .zt-idemo-badge {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .zt-idemo-badge--demo {
          background: #e2e8f0;
          color: #475569;
        }
        .zt-idemo-badge--muted {
          background: ${WHITE};
          border: 1px solid #e2e8f0;
          color: #64748b;
        }
        .zt-idemo-status {
          padding: 8px 12px 4px;
        }
        .zt-idemo-status-track {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 0;
          margin-bottom: 0;
          padding-top: 17px;
          padding-bottom: 17px;
        }
        .zt-idemo-dot {
          font-size: 9px;
          font-weight: 800;
          padding: 5px 10px;
          border-radius: 999px;
          background: ${WHITE};
          border: 1px solid #e2e8f0;
          color: #64748b;
        }
        .zt-idemo-dot--done {
          background: #ecfdf5;
          border-color: #bbf7d0;
          color: #166534;
        }
        .zt-idemo-dot--on {
          background: rgba(217, 255, 0, 0.55);
          border-color: rgba(217, 255, 0, 0.85);
          color: #14532d;
          font-weight: 950;
        }
        .zt-idemo-messages {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 120px;
        }
        .zt-idemo-messages.zt-idemo-messages--static {
          flex: 0 0 auto;
          width: 540px;
          height: 230px;
          padding-top: 68px;
          padding-bottom: 68px;
          justify-content: flex-start;
          align-items: center;
        }
        .zt-idemo-messages--live {
          display: none;
          flex: 1;
          width: 394px;
          max-width: 100%;
          height: 162px;
          padding: 118px 12px;
          flex-direction: column;
          gap: 8px;
          min-height: 120px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .zt-idemo-messages--live .zt-idemo-bubble {
          animation: ztIdemoBubbleIn 0.38s ease both;
        }
        @keyframes ztIdemoBubbleIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .zt-idemo-messages--live .zt-idemo-bubble {
            animation: none;
          }
        }
        .zt-idemo-typing {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 9px 12px;
          border-radius: 12px;
          max-width: 88%;
          font-size: 10px;
          font-weight: 700;
        }
        .zt-idemo-typing span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #94a3b8;
          animation: ztIdemoTypingDot 1.05s ease-in-out infinite;
        }
        .zt-idemo-typing span:nth-child(2) {
          animation-delay: 0.15s;
        }
        .zt-idemo-typing span:nth-child(3) {
          animation-delay: 0.3s;
        }
        .zt-idemo-typing--in {
          align-self: flex-start;
          background: ${WHITE};
          border: 1px solid #e2e8f0;
        }
        .zt-idemo-typing--out {
          align-self: flex-end;
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
        }
        .zt-idemo-typing--out span {
          background: #166534;
        }
        @keyframes ztIdemoTypingDot {
          0%,
          70%,
          100% {
            opacity: 0.28;
            transform: translateY(0);
          }
          35% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .zt-idemo-typing span {
            animation: none;
            opacity: 0.55;
          }
        }
        .zt-idemo-bubble {
          max-width: 92%;
          padding: 8px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.45;
        }
        .zt-idemo-bubble--in {
          align-self: flex-start;
          background: ${WHITE};
          border: 1px solid #e2e8f0;
          color: #0f172a;
        }
        .zt-idemo-bubble--out {
          align-self: flex-end;
          background: ${LIME};
          color: ${BLACK};
          font-weight: 800;
        }
        .zt-idemo-quick {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 0 12px 8px;
        }
        .zt-idemo-quick span {
          font-size: 9px;
          font-weight: 800;
          padding: 5px 8px;
          border-radius: 8px;
          background: ${WHITE};
          border: 1px solid #e2e8f0;
          color: #475569;
        }
        .zt-idemo-composer {
          margin: 0 12px 12px;
          width: 530px;
          max-width: calc(100% - 24px);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 18px 10px;
          height: 111px;
          min-height: 111px;
          box-sizing: border-box;
          border-radius: 12px;
          background: ${WHITE};
          border: 1px solid #e2e8f0;
        }
        .zt-idemo-composer-input {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
        }
        .zt-idemo-send {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: ${LIME};
          color: ${BLACK};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.35) inset;
        }
        .zt-idemo-send svg {
          color: ${BLACK};
        }
        .zt-idemo-side {
          width: 138px;
          min-width: 0;
          box-sizing: border-box;
          border-left: 1px solid #e2e8f0;
          background: #f4f4f4;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .zt-idemo-side-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 6px;
          padding: 10px 8px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        .zt-idemo-side-avatar {
          width: 62px;
          height: 70px;
          border-radius: 14px;
          background: #f4f4f4;
          border: 1px solid rgba(15, 23, 42, 0.1);
          font-size: 13px;
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          overflow: hidden;
        }
        .zt-idemo-side-avatar .zt-idemo-av-logo {
          width: 100%;
          height: 65px;
          object-fit: cover;
        }
        .zt-idemo-side-avatar svg {
          flex-shrink: 0;
        }
        .zt-idemo-side-co {
          font-size: 10px;
          font-weight: 950;
          color: #0f172a;
          line-height: 1.3;
        }
        .zt-idemo-side-tag {
          font-size: 8px;
          font-weight: 900;
          color: #64748b;
        }
        .zt-idemo-side-block {
          padding: 8px;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
          background: #fafafa;
        }
        .zt-idemo-side-h {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 6px;
        }
        .zt-idemo-doc {
          display: block;
          font-size: 9px;
          font-weight: 700;
          color: #0f172a;
          padding: 4px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .zt-idemo-doc:last-of-type {
          border-bottom: none;
        }
        .zt-idemo-side-p {
          margin: 0;
          font-size: 9px;
          font-weight: 600;
          color: #475569;
          line-height: 1.45;
        }
        /* Tem de vir depois da regra base .zt-idemo-side (display:flex), senão o painel cobre o chat no mobile */
        @media (max-width: 900px) {
          aside.zt-idemo-side {
            display: none !important;
          }
        }
        /* Rodapé — grelha 4 colunas + barra inferior + marca d’água (referência Neurom, identidade Zaptro) */
        .zt-visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .zt-footer {
          position: relative;
          overflow: hidden;
          padding-top: clamp(56px, 8vw, 96px);
          padding-bottom: clamp(120px, 16vw, 200px);
          padding-left: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
          padding-right: max(var(--zt-gutter), env(safe-area-inset-right, 0px));
          background: #f4f4f4;
          color: #1a1a1a;
        }
        .zt-footer::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: min(52%, 420px);
          background: linear-gradient(to top, #f4f4f4 0%, rgba(244, 244, 244, 0) 100%);
          pointer-events: none;
          z-index: 1;
        }
        .zt-footer-inner {
          position: relative;
          z-index: 2;
        }
        .zt-footer .zt-brand {
          color: #0f0f0f;
          font-family: var(--zt-font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .zt-footer-brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .zt-foot-tagline {
          margin: 0 0 20px;
          max-width: 340px;
          font-size: 14px;
          line-height: 1.55;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.48);
        }
        .zt-footer-news-kicker {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 700;
          color: rgba(0, 0, 0, 0.55);
        }
        .zt-footer-news {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: stretch;
          max-width: 400px;
        }
        .zt-footer-news-input {
          flex: 1 1 180px;
          min-width: 0;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(255, 255, 255, 0.95);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          color: #0f0f0f;
          box-sizing: border-box;
        }
        .zt-footer-news-input::placeholder {
          color: rgba(0, 0, 0, 0.38);
        }
        .zt-footer-news-input:focus {
          outline: 2px solid rgba(217, 255, 0, 0.55);
          outline-offset: 1px;
        }
        .zt-footer-news-btn {
          flex: 0 0 auto;
          padding: 12px 20px;
          border: none;
          border-radius: 10px;
          background: ${LIME};
          color: ${BLACK};
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          transition: filter 0.15s ease, transform 0.15s ease;
        }
        .zt-footer-news-btn:hover {
          filter: brightness(0.97);
        }
        .zt-footer-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) repeat(3, minmax(0, 1fr));
          gap: clamp(28px, 4vw, 48px);
          align-items: flex-start;
        }
        .zt-foot-block-title {
          font-family: var(--zt-font-heading);
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f0f0f;
          margin: 0 0 16px;
        }
        .zt-footer .zt-foot-a {
          color: rgba(0, 0, 0, 0.52);
        }
        .zt-footer .zt-foot-a:hover {
          color: #0f0f0f;
        }
        .zt-foot-a {
          display: block;
          font-size: 14px;
          color: var(--zt-muted);
          text-decoration: none;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .zt-foot-a:hover {
          color: ${WHITE};
        }
        .zt-foot-a.btnlink {
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          padding: 0;
          width: 100%;
        }
        .zt-foot-contact-line {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.45;
          color: rgba(0, 0, 0, 0.52);
        }
        .zt-foot-contact-line--addr {
          margin-top: 12px;
          margin-bottom: 0;
          max-width: 220px;
        }
        .zt-foot-contact-link {
          margin-bottom: 0;
        }
        .zt-footer-rule {
          height: 1px;
          margin: clamp(32px, 4vw, 44px) 0 clamp(22px, 3vw, 28px);
          background: rgba(0, 0, 0, 0.08);
        }
        .zt-footer-bottom {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 20px 28px;
        }
        .zt-footer-credits {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.42);
          max-width: min(100%, 420px);
        }
        .zt-footer-credits strong {
          font-weight: 900;
          color: rgba(0, 0, 0, 0.55);
        }
        .zt-footer-bottom-social {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px 14px;
        }
        .zt-footer-social-label {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0, 0, 0, 0.45);
        }
        .zt-footer-social-icons {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .zt-footer-social-icons > li {
          margin: 0;
          padding: 0;
        }
        .zt-footer-icon-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #0f0f0f;
          color: #fafafa;
          text-decoration: none;
          transition:
            background 0.18s ease,
            color 0.18s ease,
            transform 0.15s ease;
        }
        .zt-footer-icon-circle:hover {
          background: ${LIME};
          color: ${BLACK};
          transform: translateY(-2px);
        }
        .zt-footer-icon-svg {
          display: block;
        }
        .zt-footer-watermark {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translate(-50%, 22%);
          z-index: 0;
          font-family: var(--zt-font-heading);
          font-size: clamp(4rem, 22vw, 12.5rem);
          font-weight: 950;
          letter-spacing: -0.03em;
          line-height: 0.82;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          text-transform: uppercase;
          background: linear-gradient(
            185deg,
            rgba(217, 255, 0, 0.38) 0%,
            rgba(20, 20, 24, 0.12) 52%,
            rgba(0, 0, 0, 0.05) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        @media (max-width: 1024px) {
          .zt-footer-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }
          .zt-footer-brand-col {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 640px) {
          .zt-footer-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
          .zt-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        .zt-reveal,
        .zt-reveal.zt-in {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .zt-mesh-orb { animation: none; }
          .zt-hero-an {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .zt-reveal,
          .zt-reveal.zt-in {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
        @media (max-width: 720px) {
          .zt-nav-links { display: none; }
        }

        /* Mobile: secções abaixo do hero (.zt-dark) — layout tipo streaming / ZATPRO; não altera .zt-open */
        @media (max-width: 640px) {
          .zt-dark .zt-subpitch .zt-h2.zt-subpitch-h,
          .zt-dark #zt-subpitch-title {
            font-size: 40px;
            /* Duas linhas (quebra antes de WhatsApp): altura de linha ≥ corpo do texto */
            line-height: 1.14;
            height: auto;
            padding: 24px 22px;
            max-width: min(100%, 492px);
          }
          .zt-dark .zt-elevator,
          .zt-dark .zt-close-line {
            font-size: clamp(16px, 4.2vw, 18px);
          }
          /* Títulos de secção (celular): mesmo tamanho, peso e degradê limão nos destaques */
          .zt-dark #capabilities .zt-bento-features-kicker,
          .zt-dark #equipas .zt-metric-band-title,
          .zt-dark #comecar .zt-steps-title,
          .zt-dark #conversar-aqui .zt-idemo-title,
          .zt-dark #planos .zt-pricing-title,
          .zt-dark #faq .zt-lp-faq-title {
            font-size: clamp(1.95rem, 5.85vw + 0.45rem, 2.48rem);
            font-weight: 800;
            letter-spacing: -0.045em;
            line-height: 1.07;
            text-wrap: balance;
          }
          .zt-dark #capabilities .zt-bento-features-kicker .zt-section-head__plain,
          .zt-dark #capabilities .zt-bento-features-kicker .zt-section-head__grad,
          .zt-dark #equipas .zt-metric-band-title .zt-section-head__plain,
          .zt-dark #equipas .zt-metric-band-title .zt-section-head__grad,
          .zt-dark #comecar .zt-steps-title .zt-section-head__plain,
          .zt-dark #comecar .zt-steps-title .zt-section-head__grad,
          .zt-dark #conversar-aqui .zt-idemo-title .zt-section-head__plain,
          .zt-dark #conversar-aqui .zt-idemo-title .zt-section-head__grad,
          .zt-dark #planos .zt-pricing-title .zt-section-head__plain,
          .zt-dark #planos .zt-pricing-title .zt-section-head__grad,
          .zt-dark #faq .zt-lp-faq-title .zt-section-head__plain,
          .zt-dark #faq .zt-lp-faq-title .zt-section-head__grad {
            font-weight: 800;
          }
          .zt-dark #faq .zt-lp-faq-title .zt-section-head__grad,
          .zt-dark #planos .zt-pricing-title .zt-section-head__grad {
            background: linear-gradient(92deg, ${LIME} 0%, #c8f030 40%, #f2ff9c 78%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .zt-dark .zt-trust {
            padding-top: 36px;
            padding-bottom: 36px;
          }
          .zt-dark .zt-atl-split-card {
            min-height: 0;
            padding: 26px 20px;
            border-radius: 28px;
          }
          .zt-dark .zt-spot-grid {
            display: flex;
            flex-direction: row;
            gap: 14px;
            overflow-x: auto;
            overflow-y: visible;
            scroll-snap-type: x mandatory;
            scroll-padding-inline: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
            -webkit-overflow-scrolling: touch;
            margin-inline: calc(-1 * max(var(--zt-gutter), env(safe-area-inset-left, 0px)));
            padding-inline: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
            padding-bottom: 6px;
            scrollbar-width: thin;
          }
          .zt-dark .zt-spot-card {
            flex: 0 0 min(88vw, 318px);
            scroll-snap-align: start;
          }
          .zt-dark #depoimentos .zt-t-grid {
            display: flex;
            flex-direction: row;
            gap: 14px;
            overflow-x: auto;
            overflow-y: visible;
            scroll-snap-type: x mandatory;
            scroll-padding-inline: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
            -webkit-overflow-scrolling: touch;
            margin-inline: calc(-1 * max(var(--zt-gutter), env(safe-area-inset-left, 0px)));
            padding-inline: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
            padding-bottom: 8px;
          }
          .zt-dark #depoimentos .zt-t-card {
            flex: 0 0 min(90vw, 356px);
            scroll-snap-align: start;
          }
          .zt-dark #depoimentos .zt-t-expanded .zt-t-grid {
            display: flex;
            flex-direction: column;
            overflow-x: visible;
            margin-inline: 0;
            padding-inline: 0;
          }
          .zt-dark #depoimentos .zt-t-expanded .zt-t-card {
            flex: none;
            width: 100%;
          }
          .zt-dark .zt-t-fade {
            display: none;
          }
          .zt-dark #insights .zt-blog-grid {
            display: flex;
            flex-direction: row;
            gap: 16px;
            overflow-x: auto;
            overflow-y: visible;
            scroll-snap-type: x mandatory;
            scroll-padding-inline: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
            -webkit-overflow-scrolling: touch;
            margin-inline: calc(-1 * max(var(--zt-gutter), env(safe-area-inset-left, 0px)));
            padding-inline: max(var(--zt-gutter), env(safe-area-inset-left, 0px));
            margin-top: 28px;
            scrollbar-width: thin;
          }
          .zt-dark #insights .zt-blog-card {
            flex: 0 0 min(90vw, 336px);
            scroll-snap-align: start;
          }
          .zt-dark .zt-sticky-trust-panel {
            min-height: 0 !important;
            padding: 18px 20px !important;
            margin-bottom: 10px;
            border-radius: 18px;
            border: 1px solid var(--zt-border);
            background: rgba(255, 255, 255, 0.03);
            box-sizing: border-box;
          }
          .zt-dark .zt-sticky-trust-panel:last-child {
            margin-bottom: 0;
          }
          .zt-dark .zt-plan-tier {
            border-radius: 22px;
            padding: 26px 20px 22px;
          }
          .zt-dark .zt-faq-item {
            border-radius: 16px;
            padding: 18px 20px;
          }
          .zt-dark .zt-faq-q {
            font-size: 16px;
          }
          .zt-dark .zt-card-p,
          .zt-dark .zt-t-body {
            font-size: 16px;
          }
          .zt-cta-band {
            height: auto;
            min-height: 0;
            padding-top: 52px;
            padding-bottom: 52px;
            border-radius: 40px 0 0 0;
          }
          .zt-cta-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .zt-cta-inner .zt-btn-lime.lg {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
};

export default ZaptroMarketing;
