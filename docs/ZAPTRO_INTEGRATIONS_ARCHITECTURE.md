# Arquitetura de integrações Zaptro (APIs externas)

Este documento define **como o produto deve evoluir** para aceitar qualquer integração sem gambiarras: conexão, entrada, normalização, acções e observabilidade — alinhado a SaaS multi-tenant.

---

## 1. Camada de conexão (auth + armazenamento)

Cada **tenant** (`company_id`) pode ter várias integrações. Dados mínimos por conexão:

| Campo | Descrição |
|--------|-----------|
| `company_id` | Tenant |
| `provider` | Identificador estável (`shopify`, `zapier`, `nfe_focus`, `custom`) |
| `auth_type` | `api_key`, `oauth2`, `webhook_only` |
| `access_token` / `refresh_token` | Conforme OAuth |
| `api_key` | Quando aplicável (cifrado em repouso) |
| `status` | `connected`, `disconnected`, `error` |
| `metadata` | JSON (scopes, loja ID, etc.) |

**OAuth 2.0:** fluxo padrão — redirect → callback na nossa rota → troca de code por tokens → persistência.

**API Key:** entrada manual + validação opcional com ping ao provedor.

---

## 2. Camada de entrada (webhooks)

Contrato recomendado para o **backend** (não confundir com o SPA):

```http
POST /api/v1/webhooks/inbound/:source
```

Exemplos de `source`: `shopify`, `zapier`, `custom`.

Responsabilidades:

1. Resolver `company_id` (header `X-Zaptro-Tenant`, subdomínio, ou segredo por integração).
2. Validar assinatura / secret (`X-Hub-Signature`, HMAC, etc.).
3. Responder `200` rapidamente; processamento assíncrono (fila).
4. Persistir payload bruto + id de correlação (ver logs).

---

## 3. Normalização (anti-corruption layer)

Cada `source` tem um **adaptador** que transforma o payload externo num **evento interno canónico**, por exemplo:

```json
{
  "event_type": "order.created",
  "occurred_at": "2026-04-20T12:00:00Z",
  "customer": { "name": "João", "phone": "+5511…" },
  "amount": { "value": 500, "currency": "BRL" },
  "source": "shopify",
  "raw_ref": "optional-external-id"
}
```

Mapeamento configurável pelo cliente (fase 2): `external_field → canonical_field`.

---

## 4. Motor de acções

Após normalizar:

- Regras tipo **SE** `event_type` **ENTÃO** criar carga, atualizar CRM, enviar WhatsApp, notificar equipa.
- Idempotência por `(source, external_id)` ou hash do payload.

---

## 5. Segurança e multi-tenant

- Segredo por webhook rotativo.
- Rate limit por IP e por `company_id`.
- Logs sem dados sensíveis em claro (mascarar tokens).

---

## 6. Estado actual no repositório (frontend)

- A aba **Configuração → Integrações API** guarda integrações **saída** (URL base + chave) em `localStorage` para demo (`zaptroExternalApisStore`).
- O **backend** descrito acima deve ser implementado em API + Supabase usando o script SQL sugerido em `scripts/schema-zaptro-integrations.sql`.

---

## Referências

- Contrato de URL de entrada: ver `src/constants/zaptroIntegrationContract.ts`
- UI: `src/pages/ZaptroSettingsApiTab.tsx`
