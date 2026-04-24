import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Camera, PenTool, CheckCircle, ArrowLeft, 
  Image as ImageIcon, Trash2, ShieldCheck,
  MapPin, Clock, X, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';
import { toastSuccess, toastError } from '../lib/toast';

const DeliveryAction: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<any>(null);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isSigning, setIsSigning] = useState(false);
  const [loading, setLoading] = useState(false);
  const geo = useGeolocation();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetchShipment();
  }, [id]);

  const fetchShipment = async () => {
    const { data } = await supabase
      .from('shipments')
      .select('*, clients(*)')
      .eq('id', id)
      .single();
    setShipment(data);
  };

  // --- LÓGICA DE ASSINATURA ---
  useEffect(() => {
    if (isSigning && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        context.strokeStyle = '#1E1B4B';
        context.lineWidth = 3;
        context.lineCap = 'round';
        setCtx(context);
      }
    }
  }, [isSigning]);

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const pos = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(pos.x, pos.y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx?.lineTo(pos.x, pos.y);
    ctx?.stroke();
  };

  const getPos = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearSignature = () => {
    const canvas = canvasRef.current!;
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  // --- LÓGICA DE FOTOS ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (photos.length >= 3) {
      toastError('Máximo de 3 fotos atingido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotos([...photos, { 
        file, 
        preview: event.target?.result as string 
      }]);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // --- FINALIZAÇÃO ---
  const handleComplete = async () => {
    if (photos.length === 0) {
      toastError('É necessário ao menos 1 foto do comprovante.');
      return;
    }

    setLoading(true);
    try {
      const uploadedImageUrls: string[] = [];

      // 1. Upload das Fotos para o Storage
      for (const item of photos) {
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${id}/${Math.random()}.${fileExt}`;
        const filePath = `shipments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('shipment-proofs')
          .upload(filePath, item.file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('shipment-proofs')
          .getPublicUrl(filePath);
          
        uploadedImageUrls.push(publicUrl);
      }

      // 2. Upload da Assinatura (se existir)
      let signatureUrl = '';
      if (canvasRef.current) {
        const blob = await new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, 'image/png'));
        if (blob) {
          const sigPath = `signatures/${id}/${Date.now()}.png`;
          const { error: sigError } = await supabase.storage
            .from('shipment-proofs')
            .upload(sigPath, blob);
          
          if (!sigError) {
            const { data: { publicUrl } } = supabase.storage
              .from('shipment-proofs')
              .getPublicUrl(sigPath);
            signatureUrl = publicUrl;
          }
        }
      }

      // 3. Atualizar Registro no Banco
      const { error } = await supabase
        .from('shipments')
        .update({
          status: 'ENTREGUE',
          delivered_at: new Date().toISOString(),
          pod_signature_url: signatureUrl,
          pod_images: uploadedImageUrls,
          delivery_lat: geo.latitude,
          delivery_lng: geo.longitude
        })
        .eq('id', id);

      if (error) throw error;

      toastSuccess('Entrega concluída com sucesso!');
      navigate('/motorista/portal');
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!shipment) return <div style={styles.loader}>Carregando Entrega...</div>;

  return (
    <div style={styles.container}>
      {/* MOBILE HEADER */}
      <header style={styles.header}>
         <button style={styles.backBtn} onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
         <h1 style={styles.title}>Baixa de Carga</h1>
         <div style={{width: 20}} />
      </header>

      {/* DELIVERY INFO */}
      <div style={styles.infoSection}>
         <div style={styles.infoCard}>
            <div style={styles.clientBadge}>Destinatário</div>
            <h2 style={styles.clientName}>{shipment.clients?.name}</h2>
            <p style={styles.addressText}><MapPin size={14} /> {shipment.clients?.address}</p>
         </div>
      </div>

      {/* PROOF SECTION */}
      <div style={styles.actionSection}>
         <h3 style={styles.sectionTitle}>Evidências da Entrega</h3>
         
         {/* PHOTOS GRID */}
         <div style={styles.photoGrid}>
            {photos.map((p, i) => (
              <div key={i} style={styles.photoThumb}>
                 <img src={p.preview} style={styles.img} alt="POD" />
                 <button style={styles.removeBtn} onClick={() => removePhoto(i)}><X size={14} /></button>
              </div>
            ))}
            {photos.length < 3 && (
              <label style={styles.addPhotoBtn}>
                 <Camera size={24} color="var(--primary)" />
                 <span style={styles.btnLabel}>Foto</span>
                 <input type="file" accept="image/*" capture="environment" hidden onChange={handlePhotoUpload} />
              </label>
            )}
         </div>

         {/* SIGNATURE TRIGGER */}
         {!isSigning ? (
           <button style={styles.signTrigger} onClick={() => setIsSigning(true)}>
              <PenTool size={20} /> Coletar Assinatura Digital
           </button>
         ) : (
           <div style={styles.signatureArea}>
              <div style={styles.sigHeader}>
                 <span style={styles.sigTitle}>Assine dentro do quadro</span>
                 <button style={styles.clearBtn} onClick={clearSignature}>Limpar</button>
              </div>
              <canvas 
                ref={canvasRef}
                width={window.innerWidth - 64}
                height={200}
                style={styles.canvas}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={() => setIsDrawing(false)}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={() => setIsDrawing(false)}
              />
           </div>
         )}

         {/* FINISH BUTTON */}
         <button 
           style={{...styles.finishBtn, opacity: loading || photos.length === 0 ? 0.7 : 1}} 
           onClick={handleComplete}
           disabled={loading || photos.length === 0}
         >
            {loading ? 'Sincronizando...' : <><ShieldCheck size={20} /> Confirmar Entrega</>}
         </button>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f4f4f4', paddingBottom: '40px' },
  loader: { padding: '100px', textAlign: 'center' as const, color: 'var(--primary)', fontWeight: '700' },
  header: { backgroundColor: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', position: 'sticky' as const, top: 0, zIndex: 10 },
  backBtn: { background: 'none', border: 'none', color: '#64748b' },
  title: { fontSize: '16px', fontWeight: '700', color: '#000000', margin: 0 },
  
  infoSection: { padding: '24px' },
  infoCard: { backgroundColor: 'var(--primary)', padding: '24px', borderRadius: '24px', color: 'white' },
  clientBadge: { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' as const, backgroundColor: 'rgba(255,255,255,0.15)', padding: '4px 8px', borderRadius: '6px', width: 'fit-content', marginBottom: '12px' },
  clientName: { fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' },
  addressText: { fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' },

  actionSection: { padding: '0 24px', display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  sectionTitle: { fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  photoThumb: { width: '100%', height: '100px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#e2e8f0', position: 'relative' as const },
  img: { width: '100%', height: '100%', objectFit: 'cover' as const },
  removeBtn: { position: 'absolute' as const, top: '4px', right: '4px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: { height: '100px', border: '2px dashed #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' },
  btnLabel: { fontSize: '11px', fontWeight: '600', color: '#64748b' },
  
  signTrigger: { width: '100%', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' },
  
  signatureArea: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  sigHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sigTitle: { fontSize: '12px', fontWeight: '600', color: '#64748b' },
  clearBtn: { background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '700' },
  canvas: { backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', touchAction: 'none' },

  finishBtn: { width: '100%', padding: '18px', borderRadius: '24px', backgroundColor: '#10b981', color: 'white', border: 'none', fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)' }
};

export default DeliveryAction;
