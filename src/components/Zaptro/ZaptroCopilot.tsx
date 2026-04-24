import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, ArrowUp, ChevronDown, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useZaptroTheme } from '../../context/ZaptroThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ZaptroCopilot({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  const { palette } = useZaptroTheme();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [placeholderText, setPlaceholderText] = useState('');

  useEffect(() => {
    const text = "Como posso te ajudar? CRM, WhatsApp, faturamento, motorista, placa, rota, mapa...";
    let i = 0;
    let isDeleting = false;
    let timeoutId: any;

    const typeWriter = () => {
      if (!isDeleting) {
        setPlaceholderText(text.slice(0, i) + "|");
        i++;
        if (i > text.length) {
          isDeleting = true;
          timeoutId = setTimeout(typeWriter, 4000); // Espera 4s antes de apagar
        } else {
          timeoutId = setTimeout(typeWriter, 50); // Velocidade de digitação
        }
      } else {
        setPlaceholderText(text.slice(0, i) + "|");
        i--;
        if (i < 0) {
          isDeleting = false;
          timeoutId = setTimeout(typeWriter, 1000); // Espera 1s antes de digitar novamente
        } else {
          timeoutId = setTimeout(typeWriter, 20); // Velocidade apagando
        }
      }
    };

    timeoutId = setTimeout(typeWriter, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsTyping(true);
    setResponse(null);
    const currentQuery = query;
    setQuery('');
    
    try {
      const firstName = profile?.full_name?.split(' ')[0] || 'Comandante';
      
      const systemPrompt = `Você é o Assistente Inteligente do sistema Zaptro.

Seu papel é ajudar o usuário a entender tudo o que está acontecendo na operação da empresa em tempo real.

Você tem acesso aos dados do sistema, incluindo:
- CRM (clientes, histórico, leads)
- Financeiro (faturamento, despesas, relatórios)
- Logística (rotas, entregas, ocorrências)
- Motoristas (status, localização, histórico)
- Frota (veículos, manutenção)
- Arquivos (documentos e comprovantes)
- Conversas (WhatsApp e interações)

COMPORTAMENTO:
- Seja humano, natural e direto
- Sempre fale como um assistente inteligente (não robótico)
- Use o nome do usuário sempre que possível
- Considere o horário (bom dia, boa tarde, boa noite)
- Dê respostas diretas e baseadas em dados`;

      const { data, error } = await supabase.functions.invoke('zaptro-ai-copilot', {
        body: { 
          input: currentQuery, 
          systemPrompt: systemPrompt,
          model: 'gpt-4o',
          context: {
            userRole: profile?.role || 'admin',
            tenant: 'zaptro',
            userName: firstName
          }
        }
      });
      
      if (error) {
        console.error("Erro original do Supabase:", error);
        throw error;
      }
      
      if (data?.error) {
        console.error("Erro interno da Edge Function:", data.error);
        throw new Error(data.error);
      }
      
      setResponse(data.answer || "Não consegui processar a resposta. Verifique a API Key ou o modelo configurado.");
    } catch (err: any) {
      console.error("Erro ao chamar Copilot:", err);
      // Extrair mensagem de erro detalhada se existir
      const errorMsg = err?.context?.error || err?.message || err;
      setResponse(`❌ Erro ao conectar com a IA.\nDetalhe: ${errorMsg}\nVerifique se a OPENAI_API_KEY foi adicionada no painel do Supabase.`);
    } finally {
      setIsTyping(false);
    }
  };

  const isDark = palette.mode === 'dark';

  const containerStyle: React.CSSProperties = variant === 'floating' 
    ? { position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 720, zIndex: 9999, padding: '0 20px' }
    : { width: '100%', maxWidth: 767, margin: '23px auto 0', zIndex: 10, padding: 0 };

  return (
    <div style={containerStyle}>
      
      {/* Response Box */}
      {isTyping && (
        <div style={{ marginBottom: 16, padding: 20, background: isDark ? '#1E293B' : '#FFFFFF', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sparkles size={20} color="#D9FF00" className="animate-pulse" />
          <span style={{ color: palette.textMuted, fontSize: 15 }}>Analisando operação do Zaptro...</span>
        </div>
      )}

      {response && !isTyping && (
        <div style={{ marginBottom: 16, padding: 24, background: isDark ? '#1E293B' : '#FFFFFF', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
           <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
             <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #000000, #1A1A1A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
               <Sparkles size={18} color="#D9FF00" />
             </div>
             <div style={{ whiteSpace: 'pre-wrap', color: palette.text, fontSize: 16, lineHeight: 1.6, marginTop: 4 }}>
               {response}
             </div>
           </div>
           
           <div style={{ marginLeft: 52 }}>
             <button 
               onClick={() => navigate('/zaptro/resultados')}
               style={{ 
                 color: '#10B981', 
                 fontWeight: 600, 
                 background: 'transparent', 
                 border: 'none', 
                 cursor: 'pointer', 
                 padding: 0,
                 fontSize: 15,
                 display: 'flex',
                 alignItems: 'center',
                 gap: 4
               }}
             >
               👉 [Ver financeiro completo]
             </button>
           </div>
        </div>
      )}
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ 
        background: isDark ? '#0F172A' : '#F4F4F5', 
        borderRadius: 24, 
        padding: '8px 12px', 
        boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.5)' : '0 12px 40px rgba(0,0,0,0.08)', 
        border: `1px solid ${isDark ? '#334155' : '#E4E4E7'}`, 
        position: 'relative', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
         <textarea 
           value={query}
           onChange={e => setQuery(e.target.value)}
           placeholder={placeholderText || " "}
           style={{ 
             width: '100%', 
             border: 'none', 
             background: 'transparent', 
             resize: 'none', 
             padding: '16px 20px', 
             fontSize: 16, 
             color: palette.text, 
             outline: 'none', 
             minHeight: 64,
             fontFamily: 'inherit'
           }}
           onKeyDown={e => {
             if (e.key === 'Enter' && !e.shiftKey) {
               e.preventDefault();
               handleSubmit(e);
             }
           }}
         />
         
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 8px' }}>
            <button type="button" style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', color: palette.text 
            }}>
              <Plus size={24} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" style={{ 
                display: 'flex', alignItems: 'center', gap: 6, 
                background: isDark ? '#1E293B' : '#E4E4E7', 
                border: 'none', padding: '8px 16px', borderRadius: 20, 
                color: palette.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' 
              }}>
                Atalhos <ChevronDown size={16} />
              </button>
              
              <button type="button" style={{ 
                background: 'transparent', border: 'none', cursor: 'pointer', color: palette.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36
              }}>
                <Mic size={20} />
              </button>
              
              <button type="submit" disabled={!query.trim() || isTyping} style={{ 
                width: 36, height: 36, borderRadius: '50%', 
                background: query.trim() ? (isDark ? '#D9FF00' : '#000000') : (isDark ? '#334155' : '#E4E4E7'), 
                color: query.trim() ? (isDark ? '#000' : '#FFF') : '#A1A1AA', 
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: query.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' 
              }}>
                <ArrowUp size={20} />
              </button>
            </div>
         </div>
      </form>
    </div>
  );
}
