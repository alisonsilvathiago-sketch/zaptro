import { zaptroDarkEmailLayout } from './zaptroDarkLayout.js';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type TemplateVars = Record<string, string | number | undefined | null>;

export type TransactionalKind =
  | 'welcome'
  | 'account_confirmation'
  | 'password_reset_notice'
  | 'payment_approved'
  | 'cargo_created'
  | 'delivery_started'
  | 'delivery_completed'
  | 'route_notification'
  | 'delivery_status';

export function buildTransactionalEmail(
  kind: TransactionalKind,
  companyName: string,
  vars: TemplateVars,
  signatureHtml?: string,
): { subject: string; html: string; text: string } {
  const cn = companyName.trim() || 'Zaptro';
  const name = String(vars.userName ?? vars.clientName ?? 'Cliente').trim() || 'Cliente';

  switch (kind) {
    case 'welcome': {
      const subject = `Bem-vindo à ${cn}`;
      const body = `<p>Olá, <strong>${esc(name)}</strong>.</p>
        <p>A sua conta Zaptro foi criada com sucesso. A partir de agora pode acompanhar rotas, equipa e operações num só lugar.</p>`;
      return {
        subject,
        html: zaptroDarkEmailLayout({
          companyName: cn,
          headline: 'Conta activa',
          bodyHtml: body,
          ctaLabel: typeof vars.ctaLabel === 'string' ? vars.ctaLabel : 'Abrir painel',
          ctaUrl: typeof vars.ctaUrl === 'string' ? vars.ctaUrl : undefined,
          signatureHtml: signatureHtml,
        }),
        text: `${subject}\n\nOlá ${name}. A sua conta na ${cn} foi criada.`,
      };
    }
    case 'account_confirmation': {
      const subject = `Confirme a sua conta — ${cn}`;
      const body = `<p>Olá, <strong>${esc(name)}</strong>.</p>
        <p>Para concluir a configuração da conta, confirme o endereço de e-mail e conclua os passos de segurança no painel.</p>`;
      return {
        subject,
        html: zaptroDarkEmailLayout({
          companyName: cn,
          headline: 'Confirmação de conta',
          bodyHtml: body,
          ctaLabel: typeof vars.ctaLabel === 'string' ? vars.ctaLabel : 'Confirmar conta',
          ctaUrl: typeof vars.ctaUrl === 'string' ? vars.ctaUrl : undefined,
          signatureHtml,
        }),
        text: subject,
      };
    }
    case 'password_reset_notice': {
      const subject = 'Pedido de redefinição de senha';
      const body = `<p>Olá,</p>
        <p>Recebemos um pedido para redefinir a senha associada a este e-mail no Zaptro.</p>
        <p>Se foi você, siga as instruções na mensagem anterior ou no link enviado pelo sistema de autenticação.</p>
        <p>Se não foi você, pode ignorar este e-mail com segurança.</p>`;
      return {
        subject,
        html: zaptroDarkEmailLayout({
          companyName: cn,
          headline: 'Segurança da conta',
          bodyHtml: body,
          signatureHtml,
        }),
        text: subject,
      };
    }
    case 'payment_approved': {
      const subject = `Pagamento confirmado — ${cn}`;
      const body = `<p>Olá, <strong>${esc(name)}</strong>.</p>
        <p>O seu pagamento foi <strong style="color:#D9FF00;">aprovado</strong>.</p>
        <p>${vars.detail ? esc(String(vars.detail)) : 'Obrigado pela confiança na plataforma.'}</p>`;
      return {
        subject,
        html: zaptroDarkEmailLayout({
          companyName: cn,
          headline: 'Pagamento aprovado',
          bodyHtml: body,
          ctaLabel: typeof vars.ctaLabel === 'string' ? vars.ctaLabel : undefined,
          ctaUrl: typeof vars.ctaUrl === 'string' ? vars.ctaUrl : undefined,
          signatureHtml,
        }),
        text: subject,
      };
    }
    case 'cargo_created': {
      const code = vars.trackingCode != null ? esc(String(vars.trackingCode)) : '—';
      const subject = `Nova carga registada — ${code}`;
      const body = `<p>Olá, <strong>${esc(name)}</strong>.</p>
        <p>Uma nova carga foi criada na operação <strong>${esc(cn)}</strong>.</p>
        <p><strong>Código:</strong> ${code}<br/>
        <strong>Cliente:</strong> ${vars.clientName ? esc(String(vars.clientName)) : '—'}<br/>
        <strong>Destino:</strong> ${vars.destination ? esc(String(vars.destination)) : '—'}</p>`;
      return {
        subject,
        html: zaptroDarkEmailLayout({
          companyName: cn,
          headline: 'Carga criada',
          bodyHtml: body,
          ctaLabel: typeof vars.ctaLabel === 'string' ? vars.ctaLabel : 'Acompanhar',
          ctaUrl: typeof vars.ctaUrl === 'string' ? vars.ctaUrl : undefined,
          signatureHtml,
        }),
        text: subject,
      };
    }
    case 'delivery_started':
    case 'route_notification': {
      const subject =
        kind === 'delivery_started'
          ? `Entrega iniciada — ${cn}`
          : `Atualização de rota — ${cn}`;
      const body = `<p>Olá, <strong>${esc(name)}</strong>.</p>
        <p>${vars.message ? esc(String(vars.message)) : 'Há uma nova movimentação na sua entrega.'}</p>
        ${vars.routeLabel ? `<p><strong>Rota:</strong> ${esc(String(vars.routeLabel))}</p>` : ''}`;
      return {
        subject,
        html: zaptroDarkEmailLayout({
          companyName: cn,
          headline: kind === 'delivery_started' ? 'Saiu para entrega' : 'Estado da rota',
          bodyHtml: body,
          ctaLabel: typeof vars.ctaLabel === 'string' ? vars.ctaLabel : 'Ver detalhes',
          ctaUrl: typeof vars.ctaUrl === 'string' ? vars.ctaUrl : undefined,
          signatureHtml,
        }),
        text: subject,
      };
    }
    case 'delivery_completed': {
      const subject = `Entrega concluída — ${cn}`;
      const body = `<p>Olá, <strong>${esc(name)}</strong>.</p>
        <p>A entrega foi marcada como <strong style="color:#D9FF00;">concluída</strong>.</p>
        ${vars.message ? `<p>${esc(String(vars.message))}</p>` : ''}`;
      return {
        subject,
        html: zaptroDarkEmailLayout({
          companyName: cn,
          headline: 'Entrega concluída',
          bodyHtml: body,
          ctaLabel: typeof vars.ctaLabel === 'string' ? vars.ctaLabel : undefined,
          ctaUrl: typeof vars.ctaUrl === 'string' ? vars.ctaUrl : undefined,
          signatureHtml,
        }),
        text: subject,
      };
    }
    case 'delivery_status': {
      const st = vars.status ? esc(String(vars.status)) : 'Atualizado';
      const subject = `Estado da entrega: ${st} — ${cn}`;
      const body = `<p>Olá, <strong>${esc(name)}</strong>.</p>
        <p>O estado da sua entrega foi actualizado para <strong style="color:#D9FF00;">${st}</strong>.</p>`;
      return {
        subject,
        html: zaptroDarkEmailLayout({
          companyName: cn,
          headline: 'Estado da entrega',
          bodyHtml: body,
          ctaLabel: typeof vars.ctaLabel === 'string' ? vars.ctaLabel : 'Acompanhar envio',
          ctaUrl: typeof vars.ctaUrl === 'string' ? vars.ctaUrl : undefined,
          signatureHtml,
        }),
        text: subject,
      };
    }
  }
}
