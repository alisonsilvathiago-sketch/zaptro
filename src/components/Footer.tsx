import React from 'react';
import { 
  Shield, GraduationCap, Briefcase, HelpCircle, 
  ExternalLink, Share2, Globe, MessageSquare,
  Cpu, Layout, Layers, Box
} from 'lucide-react';
import { LOGTA_DOMAINS } from '../utils/domains';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: 'A Empresa',
      links: [
        { label: 'Sobre a Logta', url: '#' },
        { label: 'Trabalho Conosco', url: '#' },
        { label: 'Ouvidoria', url: '#' },
        { label: 'Portal de Autoridades', url: '#' },
      ]
    },
    {
      title: 'Usar a Logta',
      links: [
        { label: 'Soluções Inteligentes', url: '#' },
        { label: 'Zaptro WhatsApp (WaaS)', url: `https://${LOGTA_DOMAINS.ZAPTRO}` },
        { label: 'Comprar Cursos', url: `https://${LOGTA_DOMAINS.ACADEMY}/catalogo` },
        { label: 'Extensão App (Beta)', url: '#' },
      ]
    },
    {
      title: 'Educação',
      links: [
        { label: 'Logta Academy', url: `https://${LOGTA_DOMAINS.ACADEMY}` },
        { label: 'Blog Logta', url: `https://${LOGTA_DOMAINS.BLOG}` },
        { label: 'Materiais Educativos', url: '#' },
        { label: 'Webinars', url: '#' },
      ]
    },
    {
      title: 'Ajuda',
      links: [
        { label: 'Termos & Políticas', url: '#' },
        { label: 'Privacidade', url: '#' },
        { label: 'Central de Suporte', url: `https://${LOGTA_DOMAINS.SUPPORT}` },
        { label: 'Status do Sistema', url: '#' },
      ]
    }
  ];

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.topSection}>
          <div style={styles.brandBox}>
            <div style={styles.logo}>
               <Shield size={28} color="white" />
               <span style={styles.logoText}>Logta Hub</span>
            </div>
            <p style={styles.brandDesc}>
              A inteligência operacional que move o transporte. 
              Tecnologia de ponta para empresas que buscam escala e precisão.
            </p>
            <div style={styles.socials}>
              <a href="#" className="social-icon-hover" style={styles.socialIcon}><Share2 size={18} /></a>
              <a href="#" className="social-icon-hover" style={styles.socialIcon}><Share2 size={18} /></a>
              <a href="#" className="social-icon-hover" style={styles.socialIcon}><Globe size={18} /></a>
              <a href="#" className="social-icon-hover" style={styles.socialIcon}><MessageSquare size={18} /></a>
            </div>
          </div>

          <div style={styles.linksGrid}>
            {sections.map((section, idx) => (
              <div key={idx} style={styles.sectionCol}>
                <h4 style={styles.sectionTitle}>{section.title}</h4>
                <ul style={styles.linkList}>
                  {section.links.map((link, lIdx) => (
                    <li key={lIdx} style={styles.linkItem}>
                      <a href={link.url} className="hover-link" style={styles.link}>
                        {link.label}
                        {link.url.startsWith('https') && <ExternalLink size={10} style={{marginLeft: '4px'}} />}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.bottomSection}>
          <div style={styles.bottomLeft}>
            <p style={styles.copy}>© {currentYear} Logta Inteligência Operacional Ltda.</p>
            <div style={styles.divider} />
            <p style={styles.made}>Desenvolvido para alta performance logística.</p>
          </div>
          <div style={styles.badges}>
             <div style={styles.badge}><Cpu size={14} /> SaaS Excellence</div>
             <div style={styles.badge}><Shield size={14} /> ISO 27001 Compliance</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const styles: Record<string, any> = {
  footer: { backgroundColor: '#0f172a', padding: '100px 0 40px 0', color: '#94a3b8' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '0 40px' },
  topSection: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '80px', marginBottom: '80px' },
  brandBox: { display: 'flex', flexDirection: 'column', gap: '24px' },
  logo: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoText: { fontSize: '24px', fontWeight: '700', color: 'white', letterSpacing: '-1.5px' },
  brandDesc: { fontSize: '15px', lineHeight: '1.6', color: '#64748b', maxWidth: '300px' },
  socials: { display: 'flex', gap: '12px' },
  socialIcon: { 
    width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#1e293b', 
    color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s', textDecoration: 'none'
  },
  linksGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' },
  sectionCol: { display: 'flex', flexDirection: 'column', gap: '24px' },
  sectionTitle: { fontSize: '15px', fontWeight: '700', color: 'white', textTransform: 'uppercase', letterSpacing: '1px' },
  linkList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
  linkItem: { margin: 0 },
  link: { color: '#94a3b8', fontSize: '14px', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', transition: '0.2s' },
  
  bottomSection: { borderTop: '1px solid #1e293b', paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  bottomLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  copy: { fontSize: '13px', margin: 0 },
  divider: { width: '1px', height: '16px', backgroundColor: '#1e293b' },
  made: { fontSize: '13px', margin: 0, color: '#475569' },
  badges: { display: 'flex', gap: '16px' },
  badge: { 
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '600', 
    backgroundColor: '#1e293b', color: '#94a3b8', padding: '6px 12px', borderRadius: '8px' 
  }
};

export default Footer;
