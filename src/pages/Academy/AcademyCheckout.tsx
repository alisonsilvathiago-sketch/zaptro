import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, ArrowLeft, CreditCard, 
  Lock, CheckCircle2, Globe, Phone, 
  User, Mail, FileText, CreditCard as CardIcon,
  ShoppingBag, ChevronDown, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { createAsaasCheckout } from '../../lib/asaas';
import { fireTransactionalEmailNonBlocking } from '../../lib/fireTransactionalEmail';

const AcademyCheckout: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activePayment, setActivePayment] = useState<'CARD' | 'BOLETO' | 'PIX'>('CARD');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    confirmEmail: '',
    document: '',
    phone: '',
    // Card Data
    cardNumber: '',
    cardHolder: '',
    cardExpiry: '',
    cardCvv: '',
    installments: '1'
  });

  useEffect(() => {
    const fetchCourse = async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      setCourse(data);
      setLoading(false);
    };
    fetchCourse();
  }, [courseId]);

  // Máscaras (Simplificadas)
  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").substring(0, 14);
  const maskPhone = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);
  const maskCard = (v: string) => v.replace(/\D/g, '').replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, "$1 $2 $3 $4").substring(0, 19);
  const maskExpiry = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d{2})/, "$1/$2").substring(0, 5);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email !== formData.confirmEmail) {
      alert('Os e-mails informados não coincidem.');
      return;
    }

    setProcessing(true);
    
    try {
      const checkout = await createAsaasCheckout({
        company_id: 'academy_master',
        plan_id: courseId!,
        amount: course.price,
        billingType: activePayment === 'CARD' ? 'CREDIT_CARD' : activePayment,
        customerName: formData.name,
        customerEmail: formData.email,
        customerCnpj: formData.document.replace(/\D/g, ''),
        phone: formData.phone.replace(/\D/g, ''),
        creditCard: activePayment === 'CARD' ? {
           holderName: formData.cardHolder,
           number: formData.cardNumber.replace(/\D/g, ''),
           expiryMonth: formData.cardExpiry.split('/')[0],
           expiryYear: '20' + formData.cardExpiry.split('/')[1],
           cvv: formData.cardCvv
        } : undefined
      });

      if (checkout?.invoiceUrl) {
        window.location.href = checkout.invoiceUrl;
      } else if (checkout?.object === 'payment' && checkout.status === 'CONFIRMED') {
         const { data: sess } = await supabase.auth.getSession();
         const to = sess.session?.user?.email?.trim().toLowerCase() || formData.email.trim().toLowerCase();
         if (sess.session?.access_token && to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
           fireTransactionalEmailNonBlocking(supabase, {
             kind: 'payment_approved',
             to,
             variables: {
               userName: formData.name,
               detail: `Pagamento confirmado · ${course?.title || 'Curso Play Logta'}`,
               ctaUrl: `${window.location.origin}/academy/welcome`,
               ctaLabel: 'Entrar na Academia',
             },
           });
         }
         navigate('/academy/welcome');
      } else {
        throw new Error('Falha ao processar pagamento. Verifique os dados do cartão.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro: ' + (err.message || 'Verifique os dados informados'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div style={styles.loading}>Carregando ambiente Play Logta...</div>;

  return (
    <div style={styles.container}>
      {/* HEADER COMPACTO */}
      <header style={styles.header}>
         <div style={styles.logo}>PLAY <span style={{color: '#10b981'}}>LOGTA</span></div>
         <div style={styles.countrySelector}>
            <Globe size={14} /> <span>Alterar país</span> <ChevronDown size={14} />
         </div>
      </header>

      <main style={styles.wrapper}>
         {/* COLUNA FORMULÁRIO */}
         <form style={styles.mainForm} onSubmit={handleCheckout}>
            <div style={styles.inputSection}>
               <div style={styles.field}>
                  <input 
                    required 
                    style={styles.input} 
                    placeholder="Nome" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
               </div>
               <div style={styles.field}>
                  <input 
                    required 
                    type="email"
                    style={styles.input} 
                    placeholder="E-mail" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
               </div>
               <div style={styles.field}>
                  <input 
                    required 
                    type="email"
                    style={styles.input} 
                    placeholder="Confirmar e-mail" 
                    value={formData.confirmEmail}
                    onChange={e => setFormData({...formData, confirmEmail: e.target.value})}
                  />
               </div>
               <div style={styles.row}>
                  <div style={{...styles.field, flex: 1}}>
                     <input 
                       required 
                       style={styles.input} 
                       placeholder="CPF/CNPJ" 
                       value={formData.document}
                       onChange={e => setFormData({...formData, document: maskCPF(e.target.value)})}
                     />
                  </div>
                  <div style={{...styles.field, flex: 1}}>
                     <input 
                       required 
                       style={styles.input} 
                       placeholder="Telefone" 
                       value={formData.phone}
                       onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})}
                     />
                  </div>
               </div>
            </div>

            {/* SELETOR DE PAGAMENTO */}
            <div style={styles.paymentSelector}>
               <button 
                 type="button"
                 onClick={() => setActivePayment('CARD')}
                 style={{...styles.payTab, ...(activePayment === 'CARD' ? styles.payTabActive : {})}}
               >
                  <CardIcon size={20} /> Cartão {activePayment === 'CARD' && <div style={styles.dot}><Check size={10} /></div>}
               </button>
               <button 
                 type="button"
                 onClick={() => setActivePayment('BOLETO')}
                 style={{...styles.payTab, ...(activePayment === 'BOLETO' ? styles.payTabActive : {})}}
               >
                  <FileText size={20} /> Boleto {activePayment === 'BOLETO' && <div style={styles.dot}><Check size={10} /></div>}
               </button>
               <button 
                 type="button"
                 onClick={() => setActivePayment('PIX')}
                 style={{...styles.payTab, ...(activePayment === 'PIX' ? styles.payTabActive : {})}}
               >
                  <Globe size={20} /> Pix {activePayment === 'PIX' && <div style={styles.dot}><Check size={10} /></div>}
               </button>
            </div>

            {/* ÁREA ESPECÍFICA DO CARTÃO */}
            {activePayment === 'CARD' && (
               <div style={styles.cardForm}>
                  <div style={styles.field}>
                     <div style={styles.inputIconWrap}>
                        <input 
                          required 
                          style={styles.input} 
                          placeholder="Número do cartão" 
                          value={formData.cardNumber}
                          onChange={e => setFormData({...formData, cardNumber: maskCard(e.target.value)})}
                        />
                        <Lock size={16} color="#94a3b8" />
                     </div>
                  </div>
                  <div style={styles.field}>
                     <input 
                       required 
                       style={styles.input} 
                       placeholder="Nome impresso no cartão" 
                       value={formData.cardHolder}
                       onChange={e => setFormData({...formData, cardHolder: e.target.value.toUpperCase()})}
                     />
                  </div>
                  <div style={styles.row}>
                     <div style={{...styles.field, flex: 1}}>
                        <input 
                          required 
                          style={styles.input} 
                          placeholder="Mês/Ano" 
                          value={formData.cardExpiry}
                          onChange={e => setFormData({...formData, cardExpiry: maskExpiry(e.target.value)})}
                        />
                     </div>
                     <div style={{...styles.field, flex: 1}}>
                        <input 
                          required 
                          maxLength={4}
                          style={styles.input} 
                          placeholder="CVV" 
                          value={formData.cardCvv}
                          onChange={e => setFormData({...formData, cardCvv: e.target.value.replace(/\D/g, '')})}
                        />
                     </div>
                  </div>
                  <div style={styles.field}>
                     <select 
                       style={styles.select} 
                       value={formData.installments} 
                       onChange={e => setFormData({...formData, installments: e.target.value})}
                     >
                        <option value="1">1x de R$ {course.price?.toFixed(2)}</option>
                        <option value="2">2x de R$ {(course.price / 2).toFixed(2)}</option>
                        <option value="3">3x de R$ {(course.price / 3).toFixed(3)}</option>
                     </select>
                  </div>
               </div>
            )}

            <div style={styles.saveData}>
               <input type="checkbox" id="save" defaultChecked />
               <label htmlFor="save">Salvar dados para as próximas compras</label>
            </div>

            <div style={styles.securityMsg}>
               <Lock size={14} /> Protegemos seus dados de pagamento com criptografia para garantir segurança bancária.
            </div>

            <button type="submit" style={styles.submitBtn} disabled={processing}>
               {processing ? 'Processando...' : 'Pagar agora'}
            </button>

            <div style={styles.footerBranding}>
               <div style={styles.fLogo}>PLAY LOGTA</div>
               <p style={styles.fLegal}>
                 Ao clicar em 'Pagar agora', eu declaro que estou ciente que o sistema está processando essa compra em nome da LOGTA INTELLIGENCE. Termos de Compra, Termos de Uso e Política de Privacidade.
               </p>
            </div>
         </form>

         {/* RESUMO (DIREITA) */}
         <aside style={styles.summary}>
            <div style={styles.sumHeader}>
               <ShoppingBag size={20} /> <h2>Resumo da compra</h2>
            </div>
            <div style={styles.sumCourse}>
               <div style={styles.courseThumb}>
                  {course.thumbnail_url ? <img src={course.thumbnail_url} style={styles.thumbImg} /> : <div style={styles.thumbPlaceholder}><Play size={24} /></div>}
               </div>
               <div style={styles.courseName}>{course.name}</div>
            </div>
            <div style={styles.priceRow}>
               <span>Subtotal</span>
               <span>R$ {course.price?.toFixed(2)}</span>
            </div>
            <div style={styles.divider} />
            <div style={{...styles.priceRow, fontWeight: '900', fontSize: '20px', color: '#1e293b'}}>
               <span>Total</span>
               <span>R$ {course.price?.toFixed(2)}</span>
            </div>
         </aside>
      </main>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#f3f4f6', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const },
  header: { maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: '20px', fontWeight: '950', color: '#000000', letterSpacing: '-1px' },
  countrySelector: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4b5563', backgroundColor: 'white', padding: '6px 14px', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' },
  
  wrapper: { maxWidth: '1000px', width: '100%', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', paddingBottom: '80px' },
  
  mainForm: { backgroundColor: 'white', borderRadius: '12px', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' },
  inputSection: { display: 'flex', flexDirection: 'column' as const, gap: '16px', marginBottom: '32px' },
  field: { width: '100%' },
  row: { display: 'flex', gap: '16px' },
  input: { width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', color: '#000000', outline: 'none' },
  select: { width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', backgroundColor: 'white' },
  inputIconWrap: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
  
  paymentSelector: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' },
  payTab: { position: 'relative' as const, padding: '20px 0', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  payTabActive: { borderColor: '#10b981', color: '#10b981', boxShadow: '0 0 0 1px #10b981' },
  dot: { position: 'absolute' as const, top: '-6px', right: '-6px', width: '20px', height: '20px', backgroundColor: '#10b981', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' },
  
  cardForm: { backgroundColor: '#f9fafb', padding: '24px', borderRadius: '10px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' as const, gap: '16px', marginBottom: '24px' },
  
  saveData: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151', margin: '24px 0' },
  securityMsg: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#6b7280', marginBottom: '24px' },
  
  submitBtn: { width: '100%', padding: '20px', backgroundColor: '#10b981', color: 'white', fontSize: '18px', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' },
  
  footerBranding: { marginTop: '40px', textAlign: 'center' as const, borderTop: '1px solid #f3f4f6', paddingTop: '32px' },
  fLogo: { fontSize: '16px', fontWeight: '900', color: '#d1d5db', marginBottom: '8px' },
  fLegal: { fontSize: '12px', color: '#9ca3af', lineHeight: '1.5', maxWidth: '500px', margin: '0 auto' },
  
  summary: { backgroundColor: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #e5e7eb', height: 'fit-content' },
  sumHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' },
  sumCourse: { display: 'flex', gap: '16px', marginBottom: '32px' },
  courseThumb: { width: '80px', height: '60px', backgroundColor: '#f3f4f6', borderRadius: '8px', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  thumbPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' },
  courseName: { flex: 1, fontSize: '14px', fontWeight: '700', color: '#374151', lineHeight: '1.4' },
  priceRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280', margin: '8px 0' },
  divider: { height: '1px', backgroundColor: '#f3f4f6', margin: '16px 0' },
  
  loading: { padding: '100px', textAlign: 'center' as const, color: 'var(--primary)', fontWeight: '800' }
};

export default AcademyCheckout;
