import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getContext, isZaptroProductPath } from '../utils/domains';

const ZAPTRO_DEFAULT_TITLE = 'Zaptro | Atendimento & WhatsApp';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
}

const SEOManager: React.FC<SEOProps> = ({ title, description, keywords }) => {
  const location = useLocation();

  useEffect(() => {
    const context = getContext();
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const onZaptroHost = host.includes('zaptro');
    const isZaptroSeo =
      onZaptroHost || context === 'WHATSAPP' || isZaptroProductPath(location.pathname);

    // Default SEO values highlighting the 360 Ecosystem
    const defaultTitle = isZaptroSeo ? ZAPTRO_DEFAULT_TITLE : 'Zaptro | Ecossistema de Atendimento';
    
    const defaultDescription = isZaptroSeo
      ? 'Escalone seu atendimento no WhatsApp com o Zaptro. Múltiplos agentes, setores ilimitados, automação e relatórios em tempo real em um único número.'
      : 'Gestão total com Zaptro: CRM, Equipe, Atendimento e muito mais. A primeira plataforma 360° para escalar sua empresa com tecnologia avançada e marca própria.';
    
    const defaultKeywords = isZaptroSeo
      ? 'whatsapp multi agente, waas, automação whatsapp, crm whatsapp, atendimento digital, chat multi-usuário'
      : 'atendimento, crm, whatsapp premium, gestão de equipe, whatsapp marketing, white label whatsapp';

    document.title = title || defaultTitle;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description || defaultDescription);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description || defaultDescription;
      document.head.appendChild(meta);
    }

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', keywords || defaultKeywords);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = keywords || defaultKeywords;
      document.head.appendChild(meta);
    }

    // Dynamic OpenGraph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title || defaultTitle);

  }, [title, description, keywords, location]);

  return null;
};

export default SEOManager;
