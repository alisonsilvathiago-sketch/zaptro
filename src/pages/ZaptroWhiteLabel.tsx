import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Globe, Image, Palette, Shield, Sparkles } from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { ZaptroCompanyBrandingEditor } from '../components/Zaptro/ZaptroCompanyBrandingEditor';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';

export type ZaptroWhiteLabelInnerProps = { /** Dentro de Configurações: não redireciona para o painel. */
  embedded?: boolean };

/**
 * Módulo conceitual: marca branca / domínio próprio (transportadora.zaptro.com.br).
 * Só administradores da empresa acessam; colaboradores são redirecionados.
 */
export const ZaptroWhiteLabelInner: React.FC<ZaptroWhiteLabelInnerProps> = ({ embedded = false }) => {
  const { palette, canCustomizeTenant } = useZaptroTheme();
  const isDark = palette.mode === 'dark';

  const embeddedShell = useMemo(
    () =>
      ({
        width: '100%' as const,
        maxWidth: '100%' as const,
        boxSizing: 'border-box' as const,
        borderRadius: 22,
        border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : '#e8e8ec'}`,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#fafafb',
        boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden' as const,
      }) satisfies React.CSSProperties,
    [isDark],
  );

  const embeddedInner = useMemo(
    () =>
      ({
        padding: '22px 22px 28px',
        boxSizing: 'border-box' as const,
      }) satisfies React.CSSProperties,
    [],
  );

  if (!canCustomizeTenant) {
    if (embedded) {
      return (
        <div style={embeddedShell}>
          <div style={embeddedInner}>
            <ZaptroCompanyBrandingEditor showHeading={false} embedded />
          </div>
        </div>
      );
    }
    return <Navigate to={ZAPTRO_ROUTES.DASHBOARD} replace />;
  }

  if (embedded) {
    return (
      <div style={embeddedShell}>
        <div style={embeddedInner}>
          <ZaptroCompanyBrandingEditor showHeading={false} embedded />
        </div>
      </div>
    );
  }

  const card = {
    padding: '28px 32px',
    borderRadius: '28px',
    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    backgroundColor: isDark ? '#111111' : '#FFFFFF',
    marginBottom: '20px',
  } as const;

  const h2 = {
    margin: '0 0 12px 0',
    fontSize: '22px',
    fontWeight: 700 as const,
    color: palette.text,
    letterSpacing: '-0.5px',
  };

  const p = {
    margin: 0,
    fontSize: '15px',
    lineHeight: 1.65,
    color: palette.textMuted,
    fontWeight: 600,
  };

  const kicker = {
    fontSize: '11px',
    fontWeight: 700 as const,
    letterSpacing: '0.12em',
    color: palette.lime,
    marginBottom: '8px',
  };

  return (
    <div style={{ maxWidth: '900px', padding: 0, boxSizing: 'border-box', width: '100%' }}>
      <header style={{ marginBottom: '40px' }}>
        <p style={kicker}>PACOTE OPCIONAL</p>
        <h1 style={{ ...h2, fontSize: '38px', marginBottom: '10px' }}>Marca & domínio</h1>
        <p style={{ ...p, maxWidth: '720px' }}>
          Para empresas que contratam o Zaptro em modo modular com identidade própria: duas versões de logo
          (ícone para menu recolhido e logotipo com nome quando a barra lateral expande), cores principais da
          marca e endereço dedicado no formato{' '}
          <strong style={{ color: palette.text }}>sua-empresa.zaptro.com.br</strong>, abrindo diretamente a tela
          de login da empresa — já com o visual da empresa. Quem não contratou este pacote continua no
          layout padrão Zaptro (preto, branco e limão).
        </p>
      </header>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: isDark ? '#1e293b' : '#FBFBFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image size={24} color={palette.lime} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={h2}>Dois formatos de logo</h2>
            <p style={p}>
              Envie um arquivo quadrado (ícone) para o favicon e para o menu lateral fechado; e uma versão
              horizontal com nome da marca para o cabeçalho quando o menu está expandido — o mesmo padrão de
              “encolher mostra só o ícone, estender mostra a marca completa”.
            </p>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: isDark ? '#1e293b' : '#FBFBFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Palette size={24} color={palette.lime} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={h2}>Cores da interface</h2>
            <p style={p}>
              Defina a cor primária usada em botões e destaques do painel da sua operação. O modo claro/escuro
              global continua controlado pelo administrador; colaboradores não alteram tema nem marca.
            </p>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: isDark ? '#1e293b' : '#FBFBFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Globe size={24} color={palette.lime} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={h2}>Domínio personalizado</h2>
            <p style={p}>
              Exemplo: <strong style={{ color: palette.text }}>https://transportadora-alpha.zaptro.com.br</strong>{' '}
              — aponta para o login da empresa; após autenticar, o painel exibe os ativos de marca configurados
              acima. A configuração técnica de DNS e certificado costuma ser feita em conjunto com o suporte
              Zaptro.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          ...card,
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          backgroundColor: isDark ? 'rgba(217,255,0,0.08)' : '#FBFBFC',
          borderColor: isDark ? 'rgba(217,255,0,0.25)' : '#E2E8F0',
        }}
      >
        <Shield size={22} color={palette.text} />
        <p style={{ ...p, fontWeight: 700 }}>
          <Sparkles size={16} style={{ display: 'inline', verticalAlign: 'text-top', marginRight: 6 }} />
          Esta área é visível apenas para o administrador da conta. Colaboradores não veem o item no menu nem
          conseguem abrir esta página.
        </p>
      </div>

      <div style={{ marginTop: 36, paddingTop: 28, borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
        <ZaptroCompanyBrandingEditor showHeading />
      </div>
    </div>
  );
};

const ZaptroWhiteLabel: React.FC = () => (
  <ZaptroLayout>
    <ZaptroWhiteLabelInner embedded={false} />
  </ZaptroLayout>
);

export default ZaptroWhiteLabel;
