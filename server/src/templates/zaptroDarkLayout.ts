const ACCENT = '#D9FF00';
const BG = '#000000';

export type WhiteLabelBranding = {
  companyName: string;
  /** HTML seguro (controlado pelo servidor + variáveis escapadas). */
  signatureHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  headline: string;
  bodyHtml: string;
};

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function zaptroDarkEmailLayout(b: WhiteLabelBranding): string {
  const cta =
    b.ctaLabel && b.ctaUrl
      ? `<a href="${esc(b.ctaUrl)}" style="display:inline-block;padding:16px 28px;background:${ACCENT};color:#000;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px;">${esc(b.ctaLabel)}</a>`
      : '';
  const sig = b.signatureHtml
    ? `<div style="margin-top:28px;padding-top:20px;border-top:1px solid #222;font-size:13px;color:#9ca3af;line-height:1.6;">${b.signatureHtml}</div>`
    : `<div style="margin-top:28px;font-size:12px;color:#6b7280;">${esc(b.companyName)}</div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:${BG};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#0a0a0a;border:1px solid #1f2937;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;font-family:Inter,Segoe UI,system-ui,sans-serif;">
              <div style="font-size:11px;font-weight:900;letter-spacing:0.2em;color:${ACCENT};">ZAPTRO</div>
              <h1 style="margin:12px 0 0;font-size:22px;font-weight:900;color:#f9fafb;line-height:1.25;">${esc(b.headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-family:Inter,Segoe UI,system-ui,sans-serif;color:#e5e7eb;font-size:15px;line-height:1.65;">
              ${b.bodyHtml}
              ${cta ? `<div style="text-align:center;margin-top:28px;">${cta}</div>` : ''}
              ${sig}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
