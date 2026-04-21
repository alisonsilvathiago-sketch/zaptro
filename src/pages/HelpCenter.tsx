import React, { useState } from 'react';
import { 
  Search, LayoutDashboard, MessageSquare, GraduationCap, 
  CreditCard, Headphones, AlertCircle, ChevronRight,
  ArrowRight, ExternalLink, MessageCircle, ChevronDown, ChevronUp, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEOManager from '../components/SEOManager';
import Footer from '../components/Footer';

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'saas' | 'waas' | 'academy'>('saas');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const productFaqs = {
    saas: [
      { q: "Como configurar meu primeiro veículo?", a: "Acesse o módulo Frota > Veículos e clique em 'Novo Veículo'. Você precisará da placa, renavam e capacidade de carga para o sistema calcular os custos operacionais (combustível, manutenção e impostos) automaticamente em cada viagem." },
      { q: "Onde vejo o status financeiro da empresa?", a: "O Gabinete Digital (Dashboard) oferece uma visão 360° em tempo real. Para detalhes granulares, utilize o módulo Financeiro onde você encontrará DRE Automatizado, Fluxo de Caixa Diário, e a gestão Inteligente de Contas a Pagar/Receber vinculadas ao faturamento de fretes." },
      { q: "Como gerenciar permissões de motoristas?", a: "Vá em Configurações > Usuários e selecione o perfil do motorista. No Logta, você pode criar regras específicas de visibilidade (ex: apenas suas próprias viagens) para garantir que cada colaborador foque apenas no necessário, mantendo a segurança dos dados da transportadora." },
      { q: "O sistema possui aplicativo para o motorista?", a: "Sim! Disponibilizamos um portal mobile-first (Web App) onde o motorista acessa rotas via GPS, realiza checklists de saída, registra abastecimentos e anexa canhotos digitais com validade jurídica diretamente no destino." },
      { q: "Como funciona a emissão de CT-e e MD-e?", a: "A integração é nativa. Ao fechar uma carga no módulo Logística, o sistema pré-preenche todos os dados fiscais e tributários. Basta um clique para autorizar junto à SEFAZ, enviando o XML e PDF automaticamente para o embarcador e motorista." }
    ],
    waas: [
      { q: "Como conectar minha API oficial da Meta (WhatsApp Business)?", a: "No seu portal de gestão Zaptro, acesse Configurações > Instâncias. Scaneie o QR Code gerado pelo sistema para vincular seu número. O Zaptro utiliza a estrutura oficial Cloud API, garantindo que seu número nunca seja banido por spam ou uso excessivo." },
      { q: "Posso ter múltiplos atendentes no mesmo número?", a: "Com certeza! O Zaptro permite agentes ilimitados sob uma única conta administrativa. Você cria departamentos (Comercial, Operacional, Suporte) e o sistema distribui os chats de forma organizada, permitindo inclusive a transferência de conversas entre setores." },
      { q: "Como funcionam os Chatbots de triagem?", a: "Você pode configurar fluxos automáticos de boas-vindas. O robô identifica a necessidade do cliente (Cotação de Frete, Rastreio de Carga, Financeiro) e já o direciona para a pessoa certa, reduzindo o tempo de espera em até 80%." },
      { q: "Existe integração com o ERP Logta?", a: "Sim. Se você utiliza o combo Zaptro + Logta, o sistema identifica automaticamente se o contato é um Cliente ou Motorista já cadastrado, exibindo o histórico financeiro e de fretes diretamente na lateral do chat para o atendente." },
      { q: "Onde vejo minhas faturas do WhatsApp?", a: "As faturas de consumo de mensagens (sessions) e a mensalidade do Zaptro podem ser acessadas no menu 'Faturamento' dentro do painel administrativo do Zaptro. Tudo com nota fiscal e transparência total." }
    ],
    academy: [
      { q: "Como emitir meu certificado de conclusão?", a: "Ao finalizar todas as aulas e realizar o quiz de avaliação, o botão 'Gerar Certificado' será liberado no seu dashboard de aluno. O documento possui QR Code de autenticidade para comprovação de competência técnica." },
      { q: "Posso assistir às aulas pelo celular?", a: "Sim, o Logta Academy é totalmente responsivo e otimizado para mobile. Você pode estudar no caminhão, no escritório ou em casa, com o progresso sincronizado em todos os aparelhos." },
      { q: "Quais cursos estão inclusos na assinatura?", a: "O catálogo inclui desde Gestão Financeira para Transportadoras, Operação de Frota Pesada, até Treinamentos de Direção Econômica e Segurança no Transporte de Cargas Perigosas." },
      { q: "Meus colaboradores podem ter acessos individuais?", a: "Sim. O gestor pode cadastrar cada membro da equipe. O sistema enviará um convite por e-mail e cada um terá seu próprio portal do aluno para acompanhar sua evolução profissional." },
      { q: "Existe suporte para tirar dúvidas sobre as aulas?", a: "Dentro de cada aula existe um campo de comentários onde nossos instrutores respondem em até 24h úteis. Além disso, temos mentorias mensais ao vivo para alunos Pro." }
    ]
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/ajuda/busca?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <SEOManager 
        title="Central de Ajuda Logta | Suporte e Conhecimento 360°"
        description="Como podemos te ajudar hoje? Encontre guias completos sobre o sistema, WhatsApp (WaaS) e Academy."
      />

      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.badge}>CENTRAL DE CONHECIMENTO LOGTA</div>
          <h1 style={styles.heroTitle}>Como podemos <span className="text-gradient-purple">te ajudar?</span></h1>
          <p style={styles.heroSubtitle}>Explore tutoriais passo a passo e domine todas as ferramentas do ecossistema Logta 360°.</p>
          
          <form style={styles.searchBox} onSubmit={handleSearch}>
            <Search size={22} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Ex: como conectar whatsapp ou cadastrar frota..." 
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" style={styles.searchBtn}>Buscar</button>
          </form>
        </div>
      </header>

      <main style={styles.main}>
        {/* Product Selection Tabs */}
        <div style={styles.tabContainer}>
           <button 
             style={{...styles.tab, borderBottom: activeTab === 'saas' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'saas' ? 'var(--primary)' : '#64748b'}} 
             onClick={() => {setActiveTab('saas'); setActiveFaq(null);}}
           >
             <LayoutDashboard size={20} /> Logta ERP 
           </button>
           <button 
             style={{...styles.tab, borderBottom: activeTab === 'waas' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'waas' ? 'var(--primary)' : '#64748b'}} 
             onClick={() => {setActiveTab('waas'); setActiveFaq(null);}}
           >
             <MessageSquare size={20} /> Zaptro WhatsApp (WaaS)
           </button>
        </div>

        <div style={styles.contentLayout}>
          {/* Main FAQ Content */}
          <div style={styles.mainContent}>
            <h2 style={styles.sectionTitle}>
              Perguntas Frequentes: {activeTab === 'saas' ? 'Sistema Logta' : activeTab === 'waas' ? 'Zaptro WhatsApp' : 'Logta Academy'}
            </h2>
            <div style={styles.faqList}>
              {productFaqs[activeTab].map((faq, idx) => (
                <div key={idx} style={styles.faqItem} onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}>
                   <div style={styles.faqHeader}>
                      <span style={styles.faqQuestion}>{faq.q}</span>
                      {activeFaq === idx ? <ChevronUp size={20} color="var(--primary)" /> : <ChevronDown size={20} color="#cbd5e1" />}
                   </div>
                   {activeFaq === idx && (
                     <div style={styles.faqAnswer}>
                        <p style={{margin: 0, lineHeight: '1.7'}}>{faq.a}</p>
                     </div>
                   )}
                </div>
              ))}
            </div>

            {/* Support CTA */}
            <div style={styles.supportBanner}>
               <div style={styles.bannerInfo}>
                 <h3 style={styles.bannerTitle}>Não encontrou o que precisava?</h3>
                 <p style={styles.bannerText}>Nossa equipe de especialistas está pronta para te atender agora mesmo.</p>
               </div>
               <button style={styles.supportBtn} onClick={() => navigate('/suporte')}>
                 <Headphones size={20} /> Falar com Suporte
               </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside style={styles.sidebar}>
            <div style={styles.card}>
               <div style={styles.cardHeader}>
                  <Globe size={20} color="var(--primary)" />
                  <h4 style={styles.cardTitle}>Status do Sistema</h4>
               </div>
               <div style={styles.statusRow}>
                  <div style={styles.statusDot} />
                  <span style={styles.statusText}>Todos os serviços operacionais</span>
               </div>
            </div>

            <div style={{...styles.card, background: 'linear-gradient(135deg, #000000 0%, #D9FF00 100%)', color: '#ffffff'}}>
               <h4 style={{...styles.cardTitle, color: 'white'}}>Certificação 360°</h4>
               <p style={{...styles.cardText, color: 'rgba(255,255,255,0.8)'}}>Torne-se um mestre na logística moderna com nossos treinamentos.</p>
               <button style={styles.academyBtn} onClick={() => window.open('https://academy.logta.com.br', '_blank')}>
                  Acessar Academy <ArrowRight size={16} />
               </button>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const styles: Record<string, any> = {
  container: { minHeight: '100vh', backgroundColor: '#fcfcfc' },
  hero: { 
    padding: '100px 20px', backgroundColor: '#fff', textAlign: 'center', 
    borderBottom: '1px solid #e8e8e8'
  },
  heroContent: { maxWidth: '800px', margin: '0 auto' },
  badge: { 
    display: 'inline-block', padding: '6px 16px', backgroundColor: 'rgba(217, 255, 0, 0.18)', 
    color: 'var(--primary)', borderRadius: '20px', fontSize: '12px', fontWeight: '900', 
    marginBottom: '24px', letterSpacing: '1px' 
  },
  heroTitle: { fontSize: '48px', fontWeight: '950', color: '#0F172A', letterSpacing: '-2px', marginBottom: '16px' },
  heroSubtitle: { fontSize: '18px', color: '#64748B', lineHeight: '1.6', marginBottom: '40px' },
  searchBox: { 
    width: '100%', backgroundColor: 'white', borderRadius: '24px', 
    padding: '8px 8px 8px 24px', display: 'flex', alignItems: 'center', gap: '16px', height: '80px', 
    border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)'
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '18px', color: '#1E293B' },
  searchBtn: { padding: '16px 32px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '18px', fontWeight: '800', cursor: 'pointer' },

  main: { maxWidth: '1300px', margin: '0 auto', padding: '60px 40px' },
  tabContainer: { 
    display: 'flex', gap: '40px', borderBottom: '1px solid #e2e8f0', 
    marginBottom: '60px', paddingBottom: '0' 
  },
  tab: { 
    padding: '16px 8px', border: 'none', backgroundColor: 'transparent', 
    fontSize: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', 
    alignItems: 'center', gap: '10px', transition: 'all 0.2s' 
  },

  contentLayout: { display: 'grid', gridTemplateColumns: '1fr 360px', gap: '80px' },
  mainContent: { display: 'flex', flexDirection: 'column', gap: '32px' },
  sectionTitle: { fontSize: '24px', fontWeight: '900', color: '#0f172a' },
  faqList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  faqItem: { 
    backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e8e8e8', 
    cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
  },
  faqHeader: { padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' },
  faqQuestion: { fontSize: '17px', fontWeight: '800', color: '#1e293b' },
  faqAnswer: { padding: '0 32px 32px 32px', fontSize: '15px', color: '#64748b' },

  supportBanner: { 
    marginTop: '40px', padding: '48px', borderRadius: '32px', backgroundColor: '#0f172a',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white'
  },
  bannerTitle: { fontSize: '24px', fontWeight: '900', marginBottom: '8px' },
  bannerText: { color: '#94a3b8', fontSize: '16px' },
  supportBtn: { 
    padding: '18px 32px', backgroundColor: 'white', color: '#0f172a', 
    border: 'none', borderRadius: '18px', fontWeight: '900', fontSize: '16px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' 
  },

  sidebar: { display: 'flex', flexDirection: 'column', gap: '24px' },
  card: { padding: '32px', borderRadius: '28px', border: '1px solid #e8e8e8', backgroundColor: 'white' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  cardTitle: { fontSize: '18px', fontWeight: '900', color: '#1e293b' },
  cardText: { fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '12px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' },
  statusText: { fontSize: '13px', fontWeight: '800', color: '#166534' },
  academyBtn: { 
    width: '100%', padding: '14px', backgroundColor: 'rgba(255,255,255,0.2)', 
    color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', 
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' 
  }
};

export default HelpCenter;
