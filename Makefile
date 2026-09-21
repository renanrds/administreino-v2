SHELL := /bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# Administreino v2 — Makefile
# ─────────────────────────────────────────────────────────────────────────────

COMPOSE_DEV  := docker compose -f docker-compose.yml
COMPOSE_PROD := docker compose -f docker-compose.prod.yml --env-file .env.prod

BACKEND_SERVICE  ?= backend
FRONTEND_SERVICE ?= frontend
DB_SERVICE       ?= db

POSTGRES_DB   ?= administreino_db
POSTGRES_USER ?= admin

RESTORE_FILE ?=
BACKUP_FILE  ?=
BACKUPFILE   ?=
FILE         ?=
BACKUP_DIR   ?= backups

DOMAIN ?=
EMAIL  ?=

_B  := \033[1m
_D  := \033[2m
_G  := \033[32m
_Y  := \033[33m
_C  := \033[36m
_R  := \033[0m

define SECTION
	@echo ""
	@echo -e "$(_C)══════════════════════════════════════════════════════════════$(_R)"
	@echo -e "$(_B)  Administreino — $(1)$(_R)"
	@echo -e "$(_C)══════════════════════════════════════════════════════════════$(_R)"
endef

define CMD
	@printf "  $(_G)%-24s$(_R) %s\n" "$(1)" "$(2)"
endef

.DEFAULT_GOAL := help

.PHONY: help \
	dev-build dev-up dev-down dev-restart dev-logs dev-ps dev-clean \
	prod-build prod-up prod-down prod-restart prod-logs prod-ps \
	backend-bash frontend-bash db-bash \
	restore-dev-from-backup backup-dev backup-prod \
	migrate migrate-prod makemigrations createsuperuser collectstatic \
	shell test app-logs frontend-logs \
	prod-migrate prod-createsuperuser prod-collectstatic prod-shell prod-nginx-reload \
	init-ssl renew-ssl \
	up down build logs clean \
	db-dump-clean db-restore-sql shell-backend shell-db shell-frontend \
	restart restart-backend restart-frontend \
	moneyger-bot-check moneyger-bot-check-prod moneyger-bot-webhook moneyger-bot-webhook-prod \
	moneyger-bot-tunnel-stop \
	moneyger-wipe-keep-telegram

# ─────────────────────────────────────────────────────────────────────────────
# Ajuda
# ─────────────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo -e "$(_B)  Administreino v2 — treinos e sessões$(_R)"
	@echo -e "$(_D)  Use: make <comando>  |  make help$(_R)"
	$(call SECTION,Ambiente Docker)
	$(call CMD,dev-up,Sobe stack dev em background)
	$(call CMD,dev-down,Derruba ambiente dev)
	$(call CMD,dev-restart,Reinicia ambiente dev)
	$(call CMD,dev-build,Builda imagens Docker)
	$(call CMD,dev-logs,Logs de todos os serviços)
	$(call CMD,dev-ps,Lista containers)
	$(call CMD,dev-clean,Derruba dev + remove volumes)
	@echo -e "$(_D)  Atalhos: up = dev-up | down = dev-down | build = dev-build | logs = app-logs$(_R)"
	$(call SECTION,Produção — Docker)
	@echo -e "  $(_Y)Requer .env.prod na raiz do projeto$(_R)"
	$(call CMD,prod-build,Builda imagens de produção)
	$(call CMD,prod-up,Sobe stack prod)
	$(call CMD,prod-down,Derruba stack prod)
	$(call CMD,prod-restart,Reinicia stack prod)
	$(call CMD,prod-logs,Logs de produção)
	$(call CMD,prod-ps,Lista containers prod)
	$(call CMD,prod-migrate,Migrations no backend prod)
	$(call CMD,prod-collectstatic,collectstatic no backend prod)
	$(call CMD,prod-nginx-reload,Recarrega Nginx (sem downtime))
	$(call SECTION,Shells e banco)
	$(call CMD,backend-bash,Shell no container backend)
	$(call CMD,frontend-bash,Shell no container frontend)
	$(call CMD,db-bash,psql no Postgres)
	$(call SECTION,Django)
	$(call CMD,migrate,Aplica migrations (dev))
	$(call CMD,migrate-prod,Aplica migrations (prod))
	$(call CMD,makemigrations,Cria migrations)
	$(call CMD,createsuperuser,Cria superusuário)
	$(call CMD,collectstatic,collectstatic (dev))
	$(call CMD,shell,Django shell)
	$(call CMD,test,Testes Django (app workouts))
	$(call SECTION,Backup e restore)
	@echo -e "  $(_G)restore-dev-from-backup$(_R)  BACKUP_FILE=backups/dump.sql"
	$(call CMD,backup-dev,Gera dump clean em backups/)
	$(call CMD,backup-prod,Dump clean do Postgres de produção)
	$(call SECTION,SSL)
	@echo -e "  $(_G)init-ssl$(_R)   DOMAIN=app.exemplo.com EMAIL=admin@exemplo.com"
	$(call CMD,renew-ssl,Renova certificado Let's Encrypt)
	$(call SECTION,Logs)
	$(call CMD,app-logs,Logs do backend (dev))
	$(call CMD,frontend-logs,Logs do frontend (dev))
	$(call SECTION,Moneyger — Telegram)
	$(call CMD,moneyger-bot-check,Dev: túnel HTTPS (:8000) + setWebhook + checagem)
	$(call CMD,moneyger-bot-check-prod,Prod: getMe + webhook público, sem túnel)
	$(call CMD,moneyger-bot-webhook-prod,Prod: registra webhook em MONEYGER_PUBLIC_BASE_URL)
	$(call CMD,moneyger-bot-tunnel-stop,Encerra o túnel cloudflared do Moneyger)
	@echo -e "  $(_G)moneyger-bot-webhook$(_R)  WEBHOOK_URL=... (sem URL = mesmo que moneyger-bot-check)"
	@echo -e "  $(_Y)moneyger-wipe-keep-telegram$(_R)  TEMP: zera dados Moneyger (mantém Telegram)"
	@echo -e "$(_D)  Dev: http://localhost:5173  |  API: http://localhost:8000  |  Docs: /api/docs/$(_R)"
	@echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Ambiente de desenvolvimento
# ─────────────────────────────────────────────────────────────────────────────
dev-build:
	$(COMPOSE_DEV) build

dev-up:
	$(COMPOSE_DEV) up -d --build

dev-down:
	$(COMPOSE_DEV) down

dev-restart: dev-down dev-up

dev-logs:
	$(COMPOSE_DEV) logs -f

dev-ps:
	$(COMPOSE_DEV) ps

dev-clean:
	$(COMPOSE_DEV) down -v --remove-orphans

up: dev-up
down: dev-down
build: dev-build
logs: app-logs
clean: dev-clean
restart: dev-restart

restart-backend:
	$(COMPOSE_DEV) restart $(BACKEND_SERVICE)

restart-frontend:
	$(COMPOSE_DEV) restart $(FRONTEND_SERVICE)

# ─────────────────────────────────────────────────────────────────────────────
# Produção
# ─────────────────────────────────────────────────────────────────────────────
prod-build:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) build --no-cache

prod-up:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) up -d --build

prod-down:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) down

prod-restart: prod-down prod-up

prod-logs:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) logs -f

prod-ps:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) ps

prod-migrate migrate-prod:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) exec $(BACKEND_SERVICE) python manage.py migrate --noinput

prod-createsuperuser:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) exec $(BACKEND_SERVICE) python manage.py createsuperuser

prod-collectstatic:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) exec $(BACKEND_SERVICE) python manage.py collectstatic --no-input

prod-shell:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) exec $(BACKEND_SERVICE) python manage.py shell

prod-nginx-reload:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) exec nginx nginx -s reload

# ─────────────────────────────────────────────────────────────────────────────
# Shells
# ─────────────────────────────────────────────────────────────────────────────
backend-bash:
	$(COMPOSE_DEV) exec $(BACKEND_SERVICE) bash

frontend-bash:
	$(COMPOSE_DEV) exec $(FRONTEND_SERVICE) sh

db-bash:
	$(COMPOSE_DEV) exec $(DB_SERVICE) psql -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)"

shell-backend: backend-bash
shell-frontend: frontend-bash
shell-db: db-bash

# ─────────────────────────────────────────────────────────────────────────────
# Backup / restore
# ─────────────────────────────────────────────────────────────────────────────
backup-dev:
	@set -euo pipefail; \
	mkdir -p "$(BACKUP_DIR)"; \
	backup_file="$(BACKUP_DIR)/administreino_$$(date +%Y%m%d_%H%M%S).sql"; \
	echo "Gerando dump em $$backup_file ..."; \
	$(COMPOSE_DEV) exec -T $(DB_SERVICE) \
		pg_dump -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" --clean --if-exists --no-owner --no-privileges --encoding=UTF8 \
		> "$$backup_file"; \
	cp "$$backup_file" "$(BACKUP_DIR)/latest_dev.sql"; \
	echo "Backup pronto: $$backup_file"; \
	echo "Cópia atual: $(BACKUP_DIR)/latest_dev.sql"

db-dump-clean: backup-dev

backup-prod:
	@set -euo pipefail; \
	test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1); \
	mkdir -p "$(BACKUP_DIR)"; \
	backup_file="$(BACKUP_DIR)/administreino_prod_$$(date +%Y%m%d_%H%M%S).sql"; \
	POSTGRES_USER_PROD=$$($(COMPOSE_PROD) exec -T $(DB_SERVICE) printenv POSTGRES_USER | tr -d '\r'); \
	POSTGRES_DB_PROD=$$($(COMPOSE_PROD) exec -T $(DB_SERVICE) printenv POSTGRES_DB | tr -d '\r'); \
	echo "Gerando dump de produção em $$backup_file ..."; \
	$(COMPOSE_PROD) exec -T $(DB_SERVICE) \
		pg_dump -U "$$POSTGRES_USER_PROD" -d "$$POSTGRES_DB_PROD" --clean --if-exists --no-owner --no-privileges --encoding=UTF8 \
		> "$$backup_file"; \
	cp "$$backup_file" "$(BACKUP_DIR)/latest_prod.sql"; \
	echo "Backup produção: $$backup_file"; \
	echo "Cópia atual: $(BACKUP_DIR)/latest_prod.sql"

restore-dev-from-backup:
	@set -euo pipefail; \
	sql_file="$(or $(RESTORE_FILE),$(BACKUP_FILE),$(BACKUPFILE),$(FILE))"; \
	if [[ -z "$$sql_file" ]]; then \
		echo "Erro: informe o dump com BACKUP_FILE=backups/seu_dump.sql"; \
		echo "Exemplo: make restore-dev-from-backup BACKUP_FILE=backups/latest_dev.sql"; \
		exit 1; \
	fi; \
	if [[ ! -f "$$sql_file" ]]; then \
		echo "Erro: arquivo SQL não encontrado: $$sql_file"; \
		exit 1; \
	fi; \
	echo "Limpando schema public do banco Administreino..."; \
	$(COMPOSE_DEV) exec -T $(DB_SERVICE) psql -v ON_ERROR_STOP=1 -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" \
		-c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $(POSTGRES_USER); GRANT ALL ON SCHEMA public TO public;"; \
	echo "Restaurando $$sql_file (ignorando OWNER/GRANT de roles ausentes)..."; \
	sed -E \
		-e '/^ALTER .* OWNER TO /d' \
		-e '/^GRANT /d' \
		-e '/^REVOKE /d' \
		"$$sql_file" | \
	$(COMPOSE_DEV) exec -T $(DB_SERVICE) psql -v ON_ERROR_STOP=1 -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)"; \
	echo "Aplicando migrations após restore..."; \
	$(COMPOSE_DEV) exec -T $(BACKEND_SERVICE) python manage.py migrate --noinput; \
	echo "Restore finalizado."

db-restore-sql: restore-dev-from-backup

# ─────────────────────────────────────────────────────────────────────────────
# Django
# ─────────────────────────────────────────────────────────────────────────────
makemigrations:
	$(COMPOSE_DEV) exec $(BACKEND_SERVICE) python manage.py makemigrations

migrate:
	$(COMPOSE_DEV) exec $(BACKEND_SERVICE) python manage.py migrate --noinput

createsuperuser:
	$(COMPOSE_DEV) exec $(BACKEND_SERVICE) python manage.py createsuperuser

collectstatic:
	$(COMPOSE_DEV) exec $(BACKEND_SERVICE) python manage.py collectstatic --noinput

shell:
	$(COMPOSE_DEV) exec $(BACKEND_SERVICE) python manage.py shell

test:
	$(COMPOSE_DEV) exec -T $(BACKEND_SERVICE) python manage.py test workouts --noinput

# ─────────────────────────────────────────────────────────────────────────────
# Logs
# ─────────────────────────────────────────────────────────────────────────────
app-logs:
	$(COMPOSE_DEV) logs -f $(BACKEND_SERVICE)

frontend-logs:
	$(COMPOSE_DEV) logs -f $(FRONTEND_SERVICE)

# ─────────────────────────────────────────────────────────────────────────────
# SSL (Let's Encrypt)
# ─────────────────────────────────────────────────────────────────────────────
init-ssl:
	@test -n "$(DOMAIN)" || (echo "ERRO: Informe DOMAIN. Exemplo: make init-ssl DOMAIN=app.meusite.com EMAIL=admin@meusite.com" && exit 1)
	@test -n "$(EMAIL)"  || (echo "ERRO: Informe EMAIL.  Exemplo: make init-ssl DOMAIN=app.meusite.com EMAIL=admin@meusite.com" && exit 1)
	@./scripts/init-ssl.sh "$(DOMAIN)" "$(EMAIL)"

renew-ssl:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz do projeto" && exit 1)
	$(COMPOSE_PROD) run --rm certbot renew
	$(COMPOSE_PROD) exec nginx nginx -s reload

# ─────────────────────────────────────────────────────────────────────────────
# Moneyger — Telegram (Gastôncio)
# ─────────────────────────────────────────────────────────────────────────────
# Sobe (ou reutiliza) túnel HTTPS cloudflared → :8000, registra webhook e checa.
moneyger-bot-check:
	@chmod +x scripts/moneyger-bot-up.sh scripts/moneyger-bot-check.sh scripts/moneyger-bot-set-webhook.sh scripts/moneyger-bot-tunnel-stop.sh
	@ENV_FILE=$${ENV_FILE:-backend/.env} ./scripts/moneyger-bot-up.sh

# Sem WEBHOOK_URL: mesmo fluxo do check (túnel + setWebhook).
# Com WEBHOOK_URL: só registra essa URL (ex. domínio de produção).
moneyger-bot-webhook:
	@chmod +x scripts/moneyger-bot-up.sh scripts/moneyger-bot-check.sh scripts/moneyger-bot-set-webhook.sh
	@if [[ -n "$(WEBHOOK_URL)" ]]; then \
		ENV_FILE=$${ENV_FILE:-backend/.env} WEBHOOK_URL="$(WEBHOOK_URL)" ./scripts/moneyger-bot-set-webhook.sh; \
	else \
		ENV_FILE=$${ENV_FILE:-backend/.env} ./scripts/moneyger-bot-up.sh; \
	fi

moneyger-bot-tunnel-stop:
	@chmod +x scripts/moneyger-bot-tunnel-stop.sh
	@./scripts/moneyger-bot-tunnel-stop.sh

# Só leitura: token e URL pública de .env.prod. Não altera o webhook.
moneyger-bot-check-prod:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz (veja .env.prod.example)" && exit 1)
	@chmod +x scripts/moneyger-bot-check.sh
	@ENV_FILE="$(CURDIR)/.env.prod" CHECK_SCOPE=prod ./scripts/moneyger-bot-check.sh

# Aponta o bot para https://<dominio>/api/moneyger/telegram/webhook/ e checa.
# Não sobe o túnel de desenvolvimento.
moneyger-bot-webhook-prod:
	@test -f .env.prod || (echo "Erro: crie .env.prod na raiz (veja .env.prod.example)" && exit 1)
	@chmod +x scripts/moneyger-bot-webhook-prod.sh scripts/moneyger-bot-set-webhook.sh scripts/moneyger-bot-check.sh
	@ENV_FILE="$(CURDIR)/.env.prod" ./scripts/moneyger-bot-webhook-prod.sh

# TEMPORÁRIO: apaga lançamentos/inbox/contas/orçamentos/parcelas/fixas/categorias
# do usuário (default renanrds), mas NÃO remove TelegramLink.
# Ex.: make moneyger-wipe-keep-telegram
#      make moneyger-wipe-keep-telegram USERNAME=renanrds
moneyger-wipe-keep-telegram:
	@chmod +x scripts/moneyger-wipe-keep-telegram.sh
	@USERNAME=$${USERNAME:-renanrds} ./scripts/moneyger-wipe-keep-telegram.sh
