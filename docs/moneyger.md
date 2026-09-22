# Moneyger

Módulo independente de finanças no monorepo Administreino.

## Acesso

- Allowlist: env `MONEYGER_ALLOWED_USERNAMES` (default `renanrds`) **ou** `is_superuser`
- Login/profile retornam `apps.moneyger` e `is_superuser`
- UI: marca Administreino só é clicável (seletor) quando `apps.moneyger === true`
- API: `/api/moneyger/*` exige `HasMoneygerAccess` (403 caso contrário)

## Modo mercado

Listas de compras em Orçamentos (`/moneyger/budgets`):

1. Criar lista com **limite** + itens
2. **Iniciar compra** (uma lista ativa por vez)
3. **Baixar** item informando o valor unitário e a quantidade → soma (valor × quantidade) em tempo real vs limite
4. Adicionar itens a qualquer momento (planejando ou em compra)
5. Concluir ou cancelar
6. Lista **concluída** → `POST .../to-transaction/` com `account_id` (conta, cartão ou vale) gera despesa

API: `/api/moneyger/market-lists/` (+ `start`, `complete`, `cancel`, `to-transaction`, `items`, `items/<id>/check`)

## Contas

- Dinheiro (corrente/poupança/caixa)
- **Cartão de crédito**: exige `limit_amount` (limite a consumir); `available` = limite − fatura em aberto − parcelas ainda não pagas; compras não saem da conta geral
- **Vale alimentação / refeição** e **vale combustível / transporte**: cartão pré-pago (saldo em `initial_balance`; gastos diminuem o saldo). Não entram no dinheiro disponível nem usam limite de crédito.
- **Pagar fatura**: `POST /api/moneyger/accounts/{cartao}/pay-bill/` com `from_account` + `amount`

## Rotas app

- `/moneyger`, `/moneyger/transactions`, `/moneyger/capture`, `/moneyger/planning`, `/moneyger/budgets`, `/moneyger/accounts`, `/moneyger/more`, `/moneyger/activity`
- Histórico: `GET /api/moneyger/activity/` (pagar/marcar parcela, desfazer, troca de conta do lançamento)
- Desfazer parcela: `POST /api/moneyger/installments/{id}/undo/` (último pagar ou só marcar; apaga o lançamento se ele existia)

## Telegram (Gastôncio)

- Bot ranzinza/sovina: respostas em `moneyger/persona.py`
- Status/vínculo: `GET /api/moneyger/telegram/status/` → `linked`, `bot_username`, `deep_link`
- Código: `GET /api/moneyger/telegram/link-code/` (gera `/start CODE` + deep link)
- Env opcional: `MONEYGER_TELEGRAM_BOT_USERNAME` (senão usa `getMe`)
- **Comandos de consulta** (também frases naturais):
  - `/ajuda` — formatos e comandos
  - `/saldo` — saldos das contas (`meu saldo`)
  - `/resumo` — receitas/despesas do mês (`quanto gastei`)
  - `/pendentes` — próximos vencimentos (`o que vence`)
  - `/orcamento` — orçamentos do mês
  - `/inbox` — itens aguardando confirmação
  - `/mercado` — monta a lista de compras (teto, depois um item por mensagem; Remover tira o último; /pronto fecha). 5 min parado avisa; 10 min fecha sozinho.
- **Captura por texto**:
  - Rápido: `45 mercado pix`
  - Natural: `gastei 45 no mercado`, `paguei 90 uber`, `recebi 2000 salário`, `ontem gastei 30 no café`
  - Opcional: `… categoria Transporte`
  - PIX EMV, boleto/código de barras, comprovantes (match e abatimento)
- Preview no bot sugere categoria (fuzzy) e botões rápidos; confirmar grava `category` no lançamento
- Edição no preview: vencimento, valor, descrição e **método** (PIX / Boleto / Crédito / Débito / Dinheiro / Outro)
- Anexos (foto/PDF): download via `getFile` → OCR Tesseract (`moneyger/ocr.py`) → Inbox com `attachment`
  - Boleto (ficha de compensação / recibo do sacado) ≠ comprovante: o primeiro cria `Transaction` `pending`; o segundo abate se houver match de valor
  - Boleto com `parcela N/M` (M≥2) também cria `InstallmentPlan` no planejamento (idempotente por número do acordo)
  - Duplicatas: mesmo nosso número / linha digitável (boleto) ou autenticação E2E (comprovante) → bloqueia novo cadastro (Telegram avisa e descarta; API retorna 409/400)
- Preview autenticado: `GET /api/moneyger/inbox/<id>/attachment/`
- Webhook: `POST /api/moneyger/telegram/webhook/`
- Env: `MONEYGER_TELEGRAM_BOT_TOKEN`, opcional `MONEYGER_TELEGRAM_WEBHOOK_SECRET`, `MONEYGER_TELEGRAM_BOT_USERNAME`
- Checagem local (sobe túnel e **troca** o webhook): `make moneyger-bot-check`
- Parar túnel: `make moneyger-bot-tunnel-stop` (remove o container `moneyger_cf_tunnel`)
- Produção (não sobe túnel): `make moneyger-bot-check-prod` lê `.env.prod` e confere se o webhook é `MONEYGER_PUBLIC_BASE_URL` (ou o primeiro host de `ALLOWED_HOSTS`)
- Registrar webhook de produção: `make moneyger-bot-webhook-prod` — só depois do deploy da rota `/api/moneyger/telegram/webhook/`
- Webhook manual: `make moneyger-bot-webhook WEBHOOK_URL=https://seu-dominio/api/moneyger/telegram/webhook/`

## Setup local

```bash
# migrate
docker compose exec backend python manage.py migrate moneyger

# usuário allowlist
# username = renanrds  OU  is_superuser=True
```

Não commitar tokens do bot nem `.env.prod`.
