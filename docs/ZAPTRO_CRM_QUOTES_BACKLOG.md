# Zaptro — CRM, orçamentos e atendimento: o que já existe vs. backlog

Referência rápida para não esquecer o que falta fechar para produção.

## Já existe no código (alinhado à spec “ZapTrue”)

- Orçamento **dentro do lead**: modal em 3 passos (`ZaptroCrm`), não depende de página solta para criar.
- Campos: origem, destino, tipo de carga, peso/qtd, valor, prazo, observações.
- **Vários orçamentos** por lead; lista resumida no painel do lead + link para lista global.
- Estados: pendente, enviado, visualizado, aprovado, recusado (`zaptroQuotes.ts`).
- **Link público** `/orcamento/:token` com aprovar / recusar (`ZaptroPublicQuote`).
- Ao **aprovar** no link: atualiza orçamento, **move lead** no kanban local (`negociacao`, `approvedQuoteId`), regista evento na timeline.
- **Responsável no lead** (`assigneeId`), alteração de responsável, regras de quem pode agir (`canActOnLead`).
- Atendimentos WhatsApp: filtro por `company_id`; agente só vê conversas `assigned_to` = ele (`WhatsAppPremium.tsx`).

## Backlog (por prioridade)

### Orçamentos e dados

1. **Persistência Supabase** — Tabela de orçamentos por `company_id` + `lead_id`; substituir / espelhar `localStorage` para o link público funcionar em **qualquer dispositivo** do cliente.
2. **Envio WhatsApp real** — Ao “enviar orçamento”, chamar API (Evolution / gateway já usado no chat) com texto + link, não só copiar mensagem.
3. **Tabela de frete / valor calculado** — Opcional: calcular valor a partir de regras ou integração externa.
4. **Histórico de negociação rico** — Versões de valor, “pediu desconto”, diff entre revisões (hoje há `history[]` básico no quote + timeline).

### Pipeline e operação

5. **“Criar carga” pós-aprovação** — Garantir fluxo completo: criar registo de carga, rota, motorista, rastreio (hoje pode estar só a nível de UI/toast).
6. **Métricas** — Tempo até aprovação, taxa de conversão orçamento → carga, por etapa do funil.

### Atendimento tipo “CRM grande”

7. ~~**Bloqueio de envio** para não-owner~~ — **Feito (WhatsApp Premium):** se `assigned_to` ≠ utilizador atual, input e envio bloqueados + faixa com «Atribuir a mim» (MASTER continua sem bloqueio).
8. ~~**SLA / inatividade** (primeira versão)~~ — **Feito:** faixa amarela quando a **última mensagem** da thread é do cliente e passou **≥ 12 min**; dica contextual no bloco Sparkles.
9. ~~**Transferir conversa**~~ — **Feito:** chip «Transferir» abre seletor de colegas (`profiles` da empresa) e grava `assigned_to` no Supabase.
10. **Presença em tempo real** — “Fulano está a ver este chat” (WebSocket / Supabase presence) — **ainda não**.

### Qualidade e segurança

11. **RLS no Supabase** — Políticas em `whatsapp_conversations`, `whatsapp_messages`, futuras tabelas de orçamento.
12. **Auditoria** — Quem alterou orçamento, transferiu lead, etc.

---

Última revisão: checklist gerado a partir do estado do repositório (CRM + quotes + WhatsApp premium).
