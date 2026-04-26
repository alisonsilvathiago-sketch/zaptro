import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER } from '../constants/zaptroUi';
import { useTenant } from './TenantContext';

export type ZaptroColorMode = 'light' | 'dark';

export type ZaptroThemePalette = {
  mode: ZaptroColorMode;
  pageBg: string;
  sidebarBg: string;
  sidebarBorder: string;
  text: string;
  textMuted: string;
  navActiveBorder: string;
  navActiveBg: string;
  topbarBg: string;
  topbarBorder: string;
  searchBg: string;
  searchBorder: string;
  iconButtonBg: string;
  iconButtonBorder: string;
  lime: string;
  profileBg: string;
  profileBorder: string;
  hubPopupBg: string;
  mobileHeaderBg: string;
  mobileHeaderBorder: string;
};

const STORAGE_KEY = 'zaptro_theme_mode';

const lightPalette: ZaptroThemePalette = {
  mode: 'light',
  /** Fundo geral do app (área principal + topbar) — cinza muito claro. */
  pageBg: '#f4f4f4',
  sidebarBg: '#FFFFFF',
  sidebarBorder: ZAPTRO_SECTION_BORDER,
  text: '#000000',
  textMuted: '#334155',
  navActiveBorder: 'transparent',
  /** Estado activo na rail — lime suave sobre fundo claro. */
  navActiveBg: 'rgba(217, 255, 0, 0.22)',
  topbarBg: '#f4f4f4',
  topbarBorder: ZAPTRO_SECTION_BORDER,
  searchBg: ZAPTRO_FIELD_BG,
  searchBorder: ZAPTRO_SECTION_BORDER,
  iconButtonBg: ZAPTRO_FIELD_BG,
  iconButtonBorder: ZAPTRO_SECTION_BORDER,
  lime: '#D9FF00',
  profileBg: ZAPTRO_FIELD_BG,
  profileBorder: ZAPTRO_SECTION_BORDER,
  hubPopupBg: '#FFFFFF',
  mobileHeaderBg: '#f4f4f4',
  mobileHeaderBorder: ZAPTRO_SECTION_BORDER,
};

const darkPalette: ZaptroThemePalette = {
  mode: 'dark',
  pageBg: '#0a0a0a',
  sidebarBg: '#0c0c0c',
  sidebarBorder: '#1e293b',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  navActiveBorder: '#D9FF00',
  navActiveBg: 'rgba(217, 255, 0, 0.12)',
  topbarBg: '#0c0c0c',
  topbarBorder: '#1e293b',
  searchBg: '#000000',
  searchBorder: '#334155',
  iconButtonBg: '#000000',
  iconButtonBorder: '#334155',
  lime: '#D9FF00',
  profileBg: '#000000',
  profileBorder: '#334155',
  hubPopupBg: '#000000',
  mobileHeaderBg: '#0c0c0c',
  mobileHeaderBorder: '#1e293b',
};

type ZaptroThemeContextValue = {
  palette: ZaptroThemePalette;
  toggleMode: () => void;
  setMode: (m: ZaptroColorMode) => void;
  canCustomizeTenant: boolean;
};

const ZaptroThemeContext = createContext<ZaptroThemeContextValue | null>(null);

export const ZaptroThemeProvider: React.FC<{
  children: React.ReactNode;
  canCustomizeTenant: boolean;
}> = ({ children, canCustomizeTenant }) => {
  const [mode, setModeState] = useState<ZaptroColorMode>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  });
  const { company } = useTenant();

  const customPrimary = company?.primary_color;
  const customSecondary = company?.secondary_color;
  const customMenu = company?.menu_color;
  const customPageBg = company?.bg_color;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  /** Classe CSS global `.zaptro-card-surface` (index.css) usa este atributo no `<html>`. */
  useEffect(() => {
    document.documentElement.setAttribute('data-zaptro-theme', mode);
  }, [mode]);

  /** Tema claro/escuro: qualquer usuário no painel Zaptro pode alternar (preferência fica no aparelho). */
  const setMode = useCallback((m: ZaptroColorMode) => {
    setModeState(m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const palette = useMemo(() => {
    const base = mode === 'dark' ? darkPalette : lightPalette;
    if (canCustomizeTenant && (customPrimary || customSecondary || customMenu || customPageBg)) {
      const pri = (customPrimary || base.lime).trim();
      const sec = (customSecondary || base.text).trim();
      return {
        ...base,
        lime: pri,
        /** Secundária: traços / texto de apoio em áreas de navegação (mantém legibilidade no modo claro). */
        textMuted: sec,
        navActiveBorder: pri,
        navActiveBg: `${pri}22`,
        sidebarBg: customMenu || base.sidebarBg,
        sidebarBorder: customMenu ? `${customMenu}44` : base.sidebarBorder,
        pageBg: customPageBg || base.pageBg,
        topbarBg: customPageBg || base.topbarBg,
        topbarBorder: customPageBg ? `${sec}18` : base.topbarBorder,
      };
    }
    return base;
  }, [mode, canCustomizeTenant, customPrimary, customSecondary, customMenu, customPageBg]);

  const value = useMemo(
    () => ({ palette, setMode, toggleMode, canCustomizeTenant }),
    [palette, setMode, toggleMode, canCustomizeTenant]
  );

  return <ZaptroThemeContext.Provider value={value}>{children}</ZaptroThemeContext.Provider>;
};

export const useZaptroTheme = (): ZaptroThemeContextValue => {
  const ctx = useContext(ZaptroThemeContext);
  if (!ctx) {
    throw new Error('useZaptroTheme deve ser usado dentro de um ZaptroThemeProvider (ex.: árvore em main.tsx ou ZaptroLayout).');
  }
  return ctx;
};
