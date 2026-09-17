# Deploy Administreino v2 (Debian Conexo)

Produção atual **não** é o EC2 Ubuntu antigo. Stack paralela ao Conexo ERP:

| Item | Valor |
|------|--------|
| Host | Debian Conexo, usuário `conexosvr` |
| App dir | `/home/conexosvr/administreino_prod` |
| ERP dir | `/home/conexosvr/conexo_prod` — **não tocar** |
| Compose | `docker compose --env-file .env.prod -f docker-compose.prod.yml` |
| Serviços | `db`, `backend`, `nginx`, `tunnel` (cloudflared Administreino) |
| Público | https://app.r-sistemas.online |
| Health | `/`, `/api/docs/`, `/api/schema/` → 200 |

`.env.prod` (SECRET_KEY, DB, `TUNNEL_TOKEN`) fica **só no servidor**. Nunca commit, log, `cat` ou sobrescrita pelo CI/CD.

Túnel Cloudflare **administreino-app** ≠ túnel do Conexo ERP.

---

## Workflows

| Arquivo | Quando | Função |
|---------|--------|--------|
| `.github/workflows/ci.yml` | PR + push | Backend tests + frontend lint/build |
| `.github/workflows/deploy-production.yml` | `main` (após gates) + `workflow_dispatch` | Deploy no Conexo via runner self-hosted |
| `.github/workflows/deploy-ec2-legacy.yml` | só dispatch + confirmação | EC2/`appleboy` **desativado** |

Deploy usa `concurrency.group: administreino-production-deploy` com **`cancel-in-progress: false`**.

Código em prod: `git fetch` + **`reset --hard` no `github.sha`** do Actions (reprodutível). Script: `deploy/debian/update-prod.sh`.

---

## CI — o que roda / gaps

**Backend:** `manage.py check` + `manage.py test` com Postgres 17 no Actions. Smoke em `backend/core/tests_smoke.py`. Suite de domínio (workouts) ainda fraca no `main` — expandir nos PRs de produto.

**Frontend:** `pnpm build` (TypeScript/Vite) é o gate obrigatório. `pnpm lint` roda no CI com `continue-on-error` por dívida pré-existente (`no-explicit-any` / hooks) no `main` — limpar e passar a falhar o job num PR de qualidade. **Não há Vitest/Jest**; gap consciente.

---

## CD — opção A (preferida): runner self-hosted

### 1. No host Conexo (`conexosvr`)

Clone **uma vez** (se ainda não existir):

```bash
cd /home/conexosvr
git clone https://github.com/renanrds/administreino-v2.git administreino_prod
cd administreino_prod
# criar .env.prod manualmente a partir de .env.prod.example — nunca via CI
```

Garanta Docker Compose e que o usuário do runner possa falar com o daemon Docker.

### 2. Registrar runner **só** Administreino

No GitHub: **Settings → Actions → Runners → New self-hosted runner** (Linux x64).

Labels obrigatórias (além das default):

- `self-hosted`
- `linux`
- `administreino-prod`  ← dedicada; **não** reutilizar label genérica só do ERP

Diretório de trabalho do *processo* do runner pode ser qualquer (ex. `/home/conexosvr/actions-runner-administreino`). O deploy **sempre** opera em `REPO_DIR=/home/conexosvr/administreino_prod` (isolamento explícito do ERP).

```bash
# exemplo após download do pacote do runner
./config.sh --url https://github.com/renanrds/administreino-v2 \
  --token <TOKEN_DO_GITHUB> \
  --name administreino-prod-conexo \
  --labels administreino-prod \
  --work _work
sudo ./svc.sh install
sudo ./svc.sh start
```

Não instale este runner com `working-directory` apontando para `conexo_prod`.

### 3. GitHub Variables / Environment

Em **Settings → Variables** (ou Environment `production`):

| Nome | Exemplo | Obrigatório |
|------|---------|-------------|
| `PROD_REPO_DIR` | `/home/conexosvr/administreino_prod` | Não (default no workflow) |
| `PROD_DOMAIN` | `app.r-sistemas.online` | Não (default no workflow) |

Environment **`production`**: use se quiser approval manual antes do deploy.

**Não** coloque `SECRET_KEY`, `DB_PASS` ou `TUNNEL_TOKEN` em secrets do deploy Conexo — o host já tem `.env.prod`.

### 4. Branch protection (recomendado)

Em `main`: exigir check `Backend (Django tests)` e o job de frontend do workflow **CI** (build) antes do merge.

---

## CD — opção B (alternativa): Cloudflare Access SSH

Se não houver runner no host, documentado para não assumir SSH:22 LAN:

1. `cloudflared access ssh` / Access até `conexosvr@ssh.conexosistemas.com.br` (conforme Access do ambiente).
2. Secrets típicos (somente nesta alternativa): chave SSH + host Access — **sem** embutir `.env.prod`.
3. No remoto: `cd /home/conexosvr/administreino_prod && DEPLOY_SHA=... bash deploy/debian/update-prod.sh`.

O workflow ativo **não** implementa appleboy; a opção A é a suportada out-of-the-box. Opção B = runbook manual ou extensão futura do workflow.

---

## Checklist pós-deploy

- [ ] `docker compose --env-file .env.prod -f docker-compose.prod.yml ps` — serviços healthy
- [ ] https://app.r-sistemas.online/ → 200
- [ ] https://app.r-sistemas.online/api/docs/ → 200
- [ ] https://app.r-sistemas.online/api/schema/ → 200
- [ ] `.env.prod` intacto (mtime/conteúdo não alterados pelo pipeline)
- [ ] Túnel **ERP** Conexo inalterado; só o serviço `tunnel` deste compose
- [ ] Backup `backups/pre_deploy_*.sql` presente (best effort) se DB estava up

### Deploy manual no servidor

```bash
cd /home/conexosvr/administreino_prod
export DEPLOY_SHA=<commit>   # ou omitir para origin/main
export PROD_DOMAIN=app.r-sistemas.online
bash deploy/debian/update-prod.sh
```

---

## O que o script **não** faz

- Não mexe em `/home/conexosvr/conexo_prod`
- Não regenera `TUNNEL_TOKEN` nem altera DNS
- Não faz `down -v` / drop de volume Postgres
- Não imprime nem sobrescreve `.env.prod`
