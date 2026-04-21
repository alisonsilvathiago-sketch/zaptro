import React, { useState } from 'react';
import { 
  HelpCircle, ChevronDown, ChevronUp, Search, MessageCircle, 
  Settings, ShieldCheck, Truck, Users, LayoutDashboard,
  GraduationCap, MessageSquare
} from 'lucide-react';
import SEOManager from '../components/SEOManager';

const faqs = [
  {
    category: 'Geral',
    icon: LayoutDashboard,
    q: 'O que é o Logta 360° e como ele funciona?',
    a: 'O Logta 360° é o primeiro ecossistema tecnológico completo para transporte e logística. Diferente de um ERP comum, ele unifica CRM, Frotas, Logística, Estoque, Financeiro, RH e Treinamentos em uma única interface inteligente, permitindo o controle total da operação de ponta a ponta.'
  },
  {
    category: 'White Label',
    icon: Settings,
    q: 'Posso usar minha própria marca e cores no sistema?',
    a: 'Sim! Toda a plataforma Logta é White Label natively. Você pode personalizar logotipos, cores primárias, nomes de subdomínios e até o nome do app mobile, permitindo que seus clientes e colaboradores vejam a sua marca como a provedora da tecnologia.'
  },
  {
    category: 'Treinamentos',
    icon: GraduationCap,
    q: 'Como funciona o módulo Logta Academy?',
    a: 'O Logta Academy permite que as empresas carreguem seus próprios treinamentos em vídeo, tutoriais e manuais de conduta diretamente para os motoristas e estoquistas. Assim, toda a capacitação é feita online, com controle de conclusão e emissão de certificados.'
  },
  {
    category: 'Logística',
    icon: Truck,
    q: 'O rastreamento de rotas é em tempo real?',
    a: 'Absolutamente. O sistema integra o rastreamento GPS do motorista com o manifesto de carga, permitindo que a central de monitoramento veja a posição exata, status de entrega e ocorrências em tempo real no dashboard logístico.'
  },
  {
    category: 'RH & Saúde',
    icon: Users,
    q: 'O que é o "Health Score" dos motoristas?',
    a: 'O Health Score é uma métrica proprietária da Logta que analisa dados de saúde ocupacional, jornada de trabalho e desempenho em rota. Isso ajuda o RH a identificar motoristas em risco de burnout ou problemas de saúde, prevenindo acidentes e melhorando o bem-estar da equipe.'
  },
  {
    category: 'Integrações',
    icon: MessageSquare,
    q: 'O sistema tem integração com WhatsApp?',
    a: 'Sim, possuímos um Chat Interno integrado e APIs para notificações automáticas de status de entrega diretamente no WhatsApp dos clientes finais e motoristas.'
  }
];

const FAQPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <SEOManager 
        title="FAQ Logta | Dúvidas Frequentes e Suporte 360°"
        description="Encontre respostas para suas dúvidas sobre o Logta 360°. Saiba mais sobre personalização White Label, Treinamento Academy, Rastreamento Logístico e muito mais."
      />

      {/* Header */}
      <header style={styles.header}>
        <HelpCircle size={48} color="var(--primary)" style={{marginBottom: '24px'}} />
        <h1 style={styles.title}>Como podemos ajudar?</h1>
        <p style={styles.subtitle}>Encontre respostas rápidas sobre a plataforma Logta 360° e leve sua transportadora para o próximo nível.</p>
        
        <div style={styles.searchBox}>
           <Search size={20} color="#94a3b8" />
           <input 
              placeholder="Digite sua dúvida (ex: White Label, Rastreamento...)" 
              style={styles.searchInput}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </header>

      {/* FAQ Accordion */}
      <main style={styles.main}>
         <div style={styles.faqList}>
            {filteredFaqs.map((f, i) => (
               <div key={i} style={{...styles.faqItem, backgroundColor: openIndex === i ? 'white' : '#F8FAFC', borderColor: openIndex === i ? 'var(--primary)' : '#E2E8F0'}}>
                  <button style={styles.questionBtn} onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                     <div style={styles.qText}>
                        <div style={{...styles.iconBox, backgroundColor: openIndex === i ? 'var(--primary-light)' : 'white'}}>
                           <f.icon size={20} color={openIndex === i ? 'var(--primary)' : '#64748B'} />
                        </div>
                        <span>{f.q}</span>
                     </div>
                     {openIndex === i ? <ChevronUp size={20} color="var(--primary)" /> : <ChevronDown size={20} color="#94A3B8" />}
                  </button>
                  {openIndex === i && (
                     <div className="animate-fade-in" style={styles.answerArea}>
                        <p style={styles.answer}>{f.a}</p>
                     </div>
                  )}
               </div>
            ))}
         </div>

         {/* Support CTA */}
         <div style={styles.ctaCard}>
            <div style={styles.ctaInfo}>
               <h3 style={styles.ctaTitle}>Ainda tem dúvidas?</h3>
               <p style={styles.ctaDesc}>Nossa equipe de especialistas está pronta para te atender via chat em tempo real.</p>
            </div>
            <button style={styles.ctaBtn}>Falar com Suporte <MessageSquare size={18} /></button>
         </div>
      </main>

      <footer style={styles.footer}>
         <p>© 2026 Logta 360° - Intelligent Logistics Platform</p>
      </footer>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { minHeight: '100vh', backgroundColor: 'white', paddingBottom: '100px' },
  header: { 
     padding: '120px 40px', backgroundColor: '#F8FAFC', textAlign: 'center' as const, 
     display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px' 
  },
  title: { fontSize: '40px', fontWeight: '950', color: '#0F172A', letterSpacing: '-2.0px', margin: 0 },
  subtitle: { fontSize: '16px', color: '#64748B', maxWidth: '600px', lineHeight: '1.6', marginTop: '12px' },
  searchBox: { 
     width: '100%', maxWidth: '700px', backgroundColor: 'white', borderRadius: '24px', 
     padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px', height: '60px', 
     marginTop: '40px', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#1E293B' },

  main: { maxWidth: '900px', margin: '-40px auto 0 auto', padding: '0 40px' },
  faqList: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  faqItem: { borderRadius: '24px', border: '2px solid transparent', overflow: 'hidden', transition: 'all 0.3s ease' },
  questionBtn: { 
     width: '100%', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', 
     alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const
  },
  qText: { display: 'flex', alignItems: 'center', gap: '20px', fontSize: '17px', fontWeight: '800', color: '#1E293B' },
  iconBox: { width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },
  answerArea: { padding: '0 32px 32px 96px', borderTop: 'none' },
  answer: { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: 0 },

  ctaCard: { 
     marginTop: '60px', backgroundColor: '#0F172A', borderRadius: '32px', padding: '40px', 
     display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' 
  },
  ctaTitle: { fontSize: '24px', fontWeight: '900', margin: 0 },
  ctaDesc: { fontSize: '15px', color: '#94A3B8', marginTop: '8px', margin: 0 },
  ctaBtn: { 
     padding: '16px 32px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', 
     borderRadius: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' 
  },
  footer: { marginTop: '100px', textAlign: 'center' as const, color: '#94A3B8', fontSize: '13px' }
};

export default FAQPage;
