#!/usr/bin/env bash
# Atualiza Administreino em produção no Debian Conexo.
#
# Paths esperados (não misturar com Conexo ERP):
#   App:    /home/conexosvr/administreino_prod
#   ERP:    /home/conexosvr/conexo_prod   ← NUNCA usar daqui
#
# Variáveis (opcionais):
#   REPO_DIR      default /home/conexosvr/administreino_prod
#   DEPLOY_SHA    commit SHA do Actions (preferido). Se vazio → origin/main
#   PROD_DOMAIN   default app.r-sistemas.online
#   SKIP_BACKUP   se "1", pula dump best-effort
#   HEALTH_ATTEMPTS  default 24
#
# Estratégia de código: git fetch + reset --hard no SHA (reprodutível com o workflow).
# Nunca cria, edita, imprime ou sobrescreve .env.prod.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/conexosvr/administreino_prod}"
DEPLOY_SHA="${DEPLOY_SHA:-}"
PROD_DOMAIN="${PROD_DOMAIN:-app.r-sistemas.online}"
SKIP_BACKUP="${SKIP_BACKUP:-0}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-24}"

COMPOSE=(docker compose --env-file .env.prod -f docker-compose.prod.yml)

log() { printf '[update-prod] %s\n' "$*"; }
die() { printf '[update-prod] ERRO: %s\n' "$*" >&2; exit 1; }

case "${REPO_DIR}" in
  */conexo_prod|*/conexo_prod/*) die "REPO_DIR não pode ser conexo_prod (${REPO_DIR})" ;;
esac

cd "${REPO_DIR}" || die "não foi possível entrar em ${REPO_DIR}"
test -f .env.prod || die ".env.prod ausente em ${REPO_DIR} (não será criado pelo script)"
test -f docker-compose.prod.yml || die "docker-compose.prod.yml ausente"

log "1/7 Atualizando código (reset --hard ao SHA do deploy)"
git fetch origin --prune
if [[ -n "${DEPLOY_SHA}" ]]; then
  # Anexa ao commit exato do workflow (não "o que estiver em main depois").
  git checkout --force "${DEPLOY_SHA}"
  git reset --hard "${DEPLOY_SHA}"
  log "HEAD=$(git rev-parse HEAD) (SHA solicitado=${DEPLOY_SHA})"
else
  git checkout main
  git reset --hard origin/main
  log "HEAD=$(git rev-parse HEAD) (origin/main)"
fi

log "2/7 Garantindo db + tunnel Administreino (sem force-recreate do tunnel)"
# Túnel Administreino (administreino-app) ≠ túnel do ERP — só sobe o compose deste repo.
"${COMPOSE[@]}" up -d db tunnel
sleep 5

if [[ "${SKIP_BACKUP}" != "1" ]]; then
  log "3/7 Backup pre-deploy (best effort)"
  mkdir -p backups
  TS="$(date +%Y%m%d_%H%M%S)"
  if "${COMPOSE[@]}" exec -T db sh -c \
    'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges --encoding=UTF8' \
    > "backups/pre_deploy_${TS}.sql" 2>/dev/null; then
    log "Backup: backups/pre_deploy_${TS}.sql"
  else
    log "Aviso: backup pre-deploy falhou (seguindo)"
    rm -f "backups/pre_deploy_${TS}.sql"
  fi
else
  log "3/7 Backup pulado (SKIP_BACKUP=1)"
fi

log "4/7 Build backend + nginx"
"${COMPOSE[@]}" build backend nginx

log "5/7 Recriando backend + nginx (migrate roda no entry do backend)"
"${COMPOSE[@]}" up -d --force-recreate --remove-orphans backend nginx
# Migrate explícito e seguro (idempotente). Não dropa DB.
for i in 1 2 3 4 5 6 7 8 9 10; do
  if "${COMPOSE[@]}" exec -T backend python manage.py migrate --noinput; then
    break
  fi
  log "Aguardando backend ficar pronto para migrate... (${i}/10)"
  sleep 3
  if [[ "${i}" -eq 10 ]]; then
    die "migrate não executou — backend indisponível"
  fi
done

log "6/7 Status"
"${COMPOSE[@]}" ps

log "7/7 Healthcheck público https://${PROD_DOMAIN}"
ok=0
for i in $(seq 1 "${HEALTH_ATTEMPTS}"); do
  if curl -fsS "https://${PROD_DOMAIN}/" >/dev/null 2>&1 \
    && curl -fsS "https://${PROD_DOMAIN}/api/docs/" >/dev/null 2>&1 \
    && curl -fsS "https://${PROD_DOMAIN}/api/schema/" >/dev/null 2>&1; then
    log "Health OK (/, /api/docs/, /api/schema/)"
    ok=1
    break
  fi
  log "Aguardando health... ${i}/${HEALTH_ATTEMPTS}"
  sleep 5
done

if [[ "${ok}" -ne 1 ]]; then
  log "Health falhou — últimos logs"
  "${COMPOSE[@]}" logs --tail=120 backend nginx tunnel || true
  die "healthcheck falhou após deploy"
fi

log "Deploy concluído."
