import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Zap } from 'lucide-react';
import { getContext } from '../utils/domains';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';

const ZaptroNotFound: React.FC = () => {
  const navigate = useNavigate();
  const context = getContext();
  const isZaptro = context === 'WHATSAPP';

  return (
    <div style={{
      ...styles.container,
      backgroundColor: isZaptro ? '#000000' : '#FFFFFF'
    }}>
      <div style={styles.card}>
         <div style={{
           ...styles.iconBox,
           backgroundColor: isZaptro ? '#D9FF00' : '#7C3AED'
         }}>
            <ShieldAlert size={40} color={isZaptro ? '#000' : '#FFF'} />
         </div>
         
         <h1 style={{
           ...styles.title,
           color: isZaptro ? '#FFF' : '#0F172A'
         }}>
            Página Não Encontrada
         </h1>
         
         <p style={styles.text}>
            O caminho solicitado não existe ou você não tem permissão para acessá-lo.
            {isZaptro ? ' Retorne agora para a central Zaptro.' : ' Retorne ao hub administrativo.'}
         </p>

         <button 
           onClick={() => navigate('/')}
           style={{
             ...styles.btn,
             backgroundColor: isZaptro ? '#D9FF00' : '#7C3AED',
             color: isZaptro ? '#000' : '#FFF'
           }}
         >
            <ArrowLeft size={18} />
            VOLTAR PARA O INÍCIO
         </button>
      </div>

      <div style={styles.watermark}>
         <Zap size={14} /> <span>Powered by Zaptro Neural Security</span>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' },
  card: { textAlign: 'center', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '0 20px' },
  iconBox: { width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: ZAPTRO_SHADOW.lg },
  title: { fontSize: '28px', fontWeight: '950', margin: 0, letterSpacing: '-1px' },
  text: { fontSize: '15px', color: '#64748B', lineHeight: '1.6', margin: 0 },
  btn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 32px', borderRadius: '16px', border: 'none', fontWeight: '950', fontSize: '13px', cursor: 'pointer', transition: '0.2s' },
  watermark: { position: 'absolute', bottom: '40px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5 }
};

export default ZaptroNotFound;
