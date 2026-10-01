# Deploy Administreino v2

Este documento descreve o formato do deploy. **Não** registra domínio, host SSH, usuário ou diretórios reais do ambiente de produção. Esses valores ficam em variáveis do GitHub (`PROD_REPO_DIR`, `PROD_DOMAIN`) e no `.env.prod` do servidor.

| Item | Valor |
| --- | --- |
| Compose | `docker compose --env-file .env.prod -f docker-compose.prod.yml` |
| Serviços | `db`, `backend`, `nginx`, `tunnel` (cloudflared) |
| Público | `https://SEU_DOMINIO` (defina `PROD_DOMAIN`) |
| Health | `/`, `/api/docs/`, `/api/schema/` → 200 |

`.env.prod` (`SECRET_KEY`, banco, `TUNNEL_TOKEN`) fica **só no servidor**. Nunca commitar, logar, `cat` ou sobrescrever pelo CI/CD.

Se o mesmo host roda outros projetos, o deploy deste app deve usar um diretório e um túnel próprios. Não aponte o runner para o diretório de outro sistema.

---

## Workflows

| Arquivo | Quando | Função |
| --- | --- | --- |
| `.github/workflows/ci.yml` | PR + push | Testes do backend + lint/build do frontend |
| `.github/workflows/deploy-production.yml` | `main` (após gates) + `workflow_dispatch` | Deploy via runner self-hosted |
| `.github/workflows/deploy-ec2-legacy.yml` | só dispatch + confirmação | Fluxo antigo, desativado |

Deploy usa `concurrency.group: administreino-production-deploy` com **`cancel-in-progress: false`**.

Código em produção: `git fetch` + **`reset --hard` no `github.sha`** do Actions. Script: `deploy/debian/update-prod.sh`.

---

## CI — o que roda / gaps

**Backend:** `manage.py check` + `manage.py test` com Postgres 17 no Actions. Smoke em `backend/core/tests_smoke.py`. A suíte de domínio (workouts) ainda é curta no `main`.

**Frontend:** `pnpm build` (TypeScript/Vite) é o gate obrigatório. `pnpm lint` roda no CI com `continue-on-error` por dívida pré-existente (`no-explicit-any` / hooks). **Não há Vitest/Jest.**

---

## CD — opção A (preferida): runner self-hosted

### 1. No servidor

Clone uma vez, em um diretório dedicado (exemplo: `$HOME/administreino_prod`):

```bash
git clone https://github.com/renanrds/administreino-v2.git administreino_prod
cd administreino_prod
# criar .env.prod manualmente a partir de .env.prod.example — nunca via CI
```

Garanta Docker Compose e que o usuário do runner possa falar com o daemon Docker.

### 2. Registrar runner só deste app

No GitHub: **Settings → Actions → Runners → New self-hosted runner** (Linux x64).

Labels obrigatórias (além das default):

- `self-hosted`
- `linux`
- `administreino-prod`

O processo do runner pode viver em qualquer diretório. O deploy opera em `REPO_DIR` (variável `PROD_REPO_DIR`), isolado de outros projetos no mesmo host.

```bash
# exemplo após download do pacote do runner
./config.sh --url https://github.com/renanrds/administreino-v2 \
  --token <TOKEN_DO_GITHUB> \
  --name administreino-prod \
  --labels administreino-prod \
  --work _work
sudo ./svc.sh install
sudo ./svc.sh start
```

Não instale o runner com diretório de trabalho apontando para outro projeto.

### 3. GitHub Variables / Environment

Em **Settings → Variables** (ou Environment `production`):

| Nome | Exemplo | Obrigatório |
| --- | --- | --- |
| `PROD_REPO_DIR` | `$HOME/administreino_prod` | Recomendado (há default no workflow) |
| `PROD_DOMAIN` | `app.exemplo.com` | Recomendado (há default no workflow) |

Environment **`production`**: use se quiser aprovação manual antes do deploy.

**Não** coloque `SECRET_KEY`, `DB_PASS` ou `TUNNEL_TOKEN` em secrets do deploy. O host já tem `.env.prod`.

### 4. Branch protection (recomendado)

Em `main`: exigir o check `Backend (Django tests)` e o job de frontend do workflow **CI** (build) antes do merge.

---

## CD — opção B (alternativa): SSH

Se não houver runner no host, o acesso remoto fica a cargo do ambiente (não documente host, usuário ou porta neste repositório).

1. Conecte por SSH com a chave do ambiente.
2. No remoto: `cd "$PROD_REPO_DIR" && DEPLOY_SHA=... bash deploy/debian/update-prod.sh`.

O workflow ativo não implementa deploy por SSH a partir do GitHub. A opção A é a suportada. A opção B é runbook manual.

---

## Checklist pós-deploy

- [ ] `docker compose --env-file .env.prod -f docker-compose.prod.yml ps` — serviços healthy
- [ ] `https://SEU_DOMINIO/` → 200
- [ ] `https://SEU_DOMINIO/api/docs/` → 200
- [ ] `https://SEU_DOMINIO/api/schema/` → 200
- [ ] `.env.prod` intacto (mtime/conteúdo não alterados pelo pipeline)
- [ ] Túnel de outros projetos no mesmo host inalterado
- [ ] Backup `backups/pre_deploy_*.sql` presente (best effort) se o banco estava no ar

### Deploy manual no servidor

```bash
cd "$PROD_REPO_DIR"
export DEPLOY_SHA=<commit>   # ou omitir para origin/main
export PROD_DOMAIN=app.exemplo.com
bash deploy/debian/update-prod.sh
```

---

## O que o script não faz

- Não mexe em outros projetos no mesmo host
- Não regenera `TUNNEL_TOKEN` nem altera DNS
- Não faz `down -v` / drop de volume Postgres
- Não imprime nem sobrescreve `.env.prod`
