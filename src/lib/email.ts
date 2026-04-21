import { supabase } from './supabase';

interface EmailParams {
  company_id: string;
  para: string;
  assunto: string;
  mensagem: string;
  nome_destinatario: string;
  cta?: {
    texto: string;
    link: string;
  };
  config: {
    cor: string;
    logo: string;
    empresa_nome: string;
  };
}

/**
 * Gera o HTML White Label conforme o template solicitado.
 */
export const generateEmailHtml = ({ nome_destinatario, mensagem, cta, config }: Partial<EmailParams>) => {
  return `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px;">
      <div style="max-width:600px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; border: 1px solid #e2e8f0;">
        
        <!-- HEADER -->
        <div style="background:${config?.cor || '#3F0B78'}; padding:30px; text-align:center;">
          <img src="${config?.logo || 'https://via.placeholder.com/150'}" alt="Logo" style="max-height:50px;">
        </div>

        <!-- BODY -->
        <div style="padding:40px; color: #1e293b; line-height: 1.6;">
          <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 20px;">Olá, ${nome_destinatario}</h2>
          <p style="font-size: 16px;">${mensagem}</p>

          ${cta ? `
            <div style="text-align: center; margin-top: 32px;">
              <a href="${cta.link}" style="
                display:inline-block;
                padding:16px 32px;
                background:${config?.cor || '#3F0B78'};
                color:#fff;
                text-decoration:none;
                border-radius:12px;
                font-weight: 800;
                font-size: 16px;
              ">
                ${cta.texto}
              </a>
            </div>
          ` : ''}
        </div>

        <!-- FOOTER -->
        <div style="padding:24px; font-size:12px; color:#94a3b8; text-align:center; border-top: 1px solid #f1f5f9; background: #fafafa;">
          © ${config?.empresa_nome || 'Logta Platform'} - Transportes e Logística Inteligente
        </div>

      </div>
    </div>
  `;
};

/**
 * Aciona o envio de email via Supabase Edge Function (Resend) e salva no Log do Banco de Dados.
 */
export const triggerEmail = async (params: EmailParams) => {
  try {
    const html = generateEmailHtml(params);

    // 1. Chamar a Edge Function do Resend
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('resend-email', {
      body: { 
        para: params.para, 
        assunto: params.assunto, 
        html,
        config: params.config 
      }
    });

    if (edgeError) {
       console.warn('Falha no envio real (RESEND_API_KEY pode estar ausente), registrando log como PENDING/FAILED...');
    }

    // 2. Salvar no Banco de Dados (Log de Auditoria)
    const { error: dbError } = await supabase
      .from('emails')
      .insert([
        {
          company_id: params.company_id,
          recipient: params.para,
          subject: params.assunto,
          status: edgeError ? 'FAILED' : 'SENT',
          error_message: edgeError ? JSON.stringify(edgeError) : null
        }
      ]);

    if (dbError) throw dbError;

    return { success: !edgeError, data: edgeData };
  } catch (error: any) {
    console.error('Erro ao processar email:', error.message);
    throw error;
  }
};
