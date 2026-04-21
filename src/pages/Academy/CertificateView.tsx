import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Award, ShieldCheck, Download, 
  Printer, ArrowLeft, Share2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CertificateView: React.FC = () => {
  const { certificateId } = useParams();
  const navigate = useNavigate();
  
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCert = async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('*, courses(name), profiles(full_name)')
        .eq('id', certificateId)
        .single();
      
      if (data) setCert(data);
      setLoading(false);
    };
    fetchCert();
  }, [certificateId]);

  const handlePrint = () => window.print();

  if (loading) return <div style={styles.loader}>Validando autenticidade do certificado...</div>;
  if (!cert) return <div style={styles.error}>Certificado não localizado ou inválido.</div>;

  return (
    <div style={styles.container}>
      <header style={styles.noPrint}>
         <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Voltar ao Portal
         </button>
         <div style={styles.actions}>
            <button style={styles.actionBtn} onClick={handlePrint}><Printer size={18} /> Imprimir PDF</button>
            <button style={styles.actionBtn}><Share2 size={18} /> Compartilhar</button>
         </div>
      </header>

      {/* PAPER CANVAS */}
      <div style={styles.certificateCanvas} id="certificate-print">
         <div style={styles.borderOut}>
            <div style={styles.borderIn}>
               {/* Content */}
               <div style={styles.content}>
                  <div style={styles.badge}><Award size={64} color="var(--primary)" /></div>
                  <h1 style={styles.mainTitle}>CERTIFICADO DE CONCLUSÃO</h1>
                  <p style={styles.introText}>Certificamos para os devidos fins que</p>
                  
                  <h2 style={styles.studentName}>{cert.profiles?.full_name}</h2>
                  
                  <p style={styles.introText}>concluiu com êxito o treinamento especializado em</p>
                  <h3 style={styles.courseName}>{cert.courses?.name}</h3>
                  
                  <div style={styles.stats}>
                     <div style={styles.statItem}>
                        <span style={styles.statLabel}>Data de Emissão</span>
                        <span style={styles.statValue}>{new Date(cert.issued_at).toLocaleDateString()}</span>
                     </div>
                     <div style={styles.statItem}>
                        <span style={styles.statLabel}>Carga Horária</span>
                        <span style={styles.statValue}>12 Horas</span>
                     </div>
                  </div>

                  <div style={styles.footer}>
                     <div style={styles.signature}>
                        <div style={styles.sigLine} />
                        <span>Logta Intelligence HQ</span>
                     </div>
                     <div style={styles.validation}>
                        <div style={styles.qrMock}>QR</div>
                        <div style={styles.valInfo}>
                           <span style={styles.valTitle}>VALIDAÇÃO DIGITAL</span>
                           <span style={styles.valCode}>Code: {cert.certificate_code}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#ebebeb', padding: '40px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  noPrint: { width: '1000px', display: 'flex', justifyContent: 'space-between', marginBottom: '32px', '@media print': { display: 'none' } } as any,
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', color: '#64748b', fontWeight: '800', cursor: 'pointer' },
  actions: { display: 'flex', gap: '12px' },
  actionBtn: { padding: '10px 20px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#1e293b' },
  
  certificateCanvas: { 
    width: '1000px', height: '707px', backgroundColor: 'white', 
    padding: '40px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
    position: 'relative' as const, overflow: 'hidden'
  },
  borderOut: { border: '10px solid var(--primary)', height: '100%', padding: '10px' },
  borderIn: { border: '2px solid var(--primary-light)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' },
  
  content: { textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', width: '100%' },
  badge: { marginBottom: '24px' },
  mainTitle: { fontSize: '48px', fontWeight: '950', color: '#1e293b', marginBottom: '24px', letterSpacing: '4px' },
  introText: { fontSize: '18px', color: '#64748b', margin: '8px 0', fontStyle: 'italic' },
  studentName: { fontSize: '42px', fontWeight: '800', color: 'var(--primary)', margin: '24px 0', borderBottom: '2px solid #e8e8e8', paddingBottom: '12px', minWidth: '400px' },
  courseName: { fontSize: '28px', fontWeight: '900', color: '#000000', margin: '24px 0' },
  
  stats: { display: 'flex', gap: '60px', marginTop: '40px' },
  statItem: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  statLabel: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const },
  statValue: { fontSize: '18px', fontWeight: '800', color: '#1e293b' },
  
  footer: { marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '60px' },
  signature: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px' },
  sigLine: { width: '200px', height: '1px', backgroundColor: '#cbd5e1' },
  
  validation: { display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' as const },
  qrMock: { width: '64px', height: '64px', backgroundColor: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: '#cbd5e1' },
  valTitle: { display: 'block', fontSize: '10px', fontWeight: '900', color: '#94a3b8' },
  valCode: { fontSize: '12px', color: '#64748b', fontWeight: '700' },

  loader: { padding: '100px', color: 'var(--primary)', fontWeight: '800' },
  error: { padding: '100px', color: 'var(--primary)', fontWeight: '800' }
};

export default CertificateView;
