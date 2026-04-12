SHELL := /bin/sh
.DEFAULT_GOAL := help

# Core tooling
COMPOSE ?= docker compose

# Services (docker-compose.yml)
BACKEND_SERVICE ?= backend
FRONTEND_SERVICE ?= frontend
DB_SERVICE ?= db

# Database access (inside DB container)
DB_USER ?= admin
DB_NAME ?= administreino_db
DB_PASSWORD_ENV ?= POSTGRES_PASSWORD

# Backup settings
BACKUP_DIR ?= backups
DUMP_FILE ?= dump_$(shell date +%Y%m%d_%H%M%S).sql
FILE ?=

.PHONY: \
	help \
	up up-d down build logs ps restart restart-backend restart-frontend clean \
	migrate makemigrations createsuperuser shell-backend shell-db shell-frontend \
	db-dump-clean db-restore-sql

help: ## Mostra esta ajuda
	@awk 'BEGIN {FS = ":.*## "; printf "\nComandos disponiveis:\n\n"} /^[a-zA-Z0-9_.-]+:.*## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n"

up: ## Sobe os containers em foreground
	$(COMPOSE) up

up-d: ## Sobe os containers em background
	$(COMPOSE) up -d

down: ## Derruba os containers
	$(COMPOSE) down

build: ## Rebuilda as imagens
	$(COMPOSE) build

logs: ## Mostra logs em tempo real
	$(COMPOSE) logs -f

ps: ## Lista status dos containers
	$(COMPOSE) ps

restart: ## Reinicia todos os servicos
	$(COMPOSE) restart

restart-backend: ## Reinicia apenas o backend
	$(COMPOSE) restart $(BACKEND_SERVICE)

restart-frontend: ## Reinicia apenas o frontend
	$(COMPOSE) restart $(FRONTEND_SERVICE)

clean: ## Remove containers, volumes e orfaos
	$(COMPOSE) down -v --remove-orphans

migrate: ## Executa migracoes Django
	$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py migrate

makemigrations: ## Gera novas migracoes Django
	$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py makemigrations

createsuperuser: ## Cria superusuario Django
	$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py createsuperuser

shell-backend: ## Abre shell Django
	$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py shell

shell-db: ## Abre shell psql no banco
	$(COMPOSE) exec $(DB_SERVICE) psql -U $(DB_USER) -d $(DB_NAME)

shell-frontend: ## Abre shell do container frontend
	$(COMPOSE) exec $(FRONTEND_SERVICE) sh

db-dump-clean: ## Gera dump SQL clean em backups/ (DROP/IF EXISTS, sem owner/ACL)
	@mkdir -p $(BACKUP_DIR)
	@echo "Gerando dump em $(BACKUP_DIR)/$(DUMP_FILE)..."
	@$(COMPOSE) exec -T $(DB_SERVICE) sh -c 'pg_dump -U "$(DB_USER)" -d "$(DB_NAME)" --clean --if-exists --no-owner --no-privileges --encoding=UTF8' > "$(BACKUP_DIR)/$(DUMP_FILE)"
	@echo "Dump criado: $(BACKUP_DIR)/$(DUMP_FILE)"

db-restore-sql: ## Restaura banco a partir de FILE=...sql
	@test -n "$(FILE)" || (echo "Informe FILE. Exemplo: make db-restore-sql FILE=backups/dump_20260401_220000.sql" && exit 1)
	@test -f "$(FILE)" || (echo "Arquivo nao encontrado: $(FILE)" && exit 1)
	@echo "Restaurando banco a partir de $(FILE)..."
	@cat "$(FILE)" | $(COMPOSE) exec -T $(DB_SERVICE) sh -c 'psql -v ON_ERROR_STOP=1 -U "$(DB_USER)" -d "$(DB_NAME)"'
	@echo "Restore concluido com sucesso."

# ─── Produção (AWS / EC2) ────────────────────────────────────────────────────
PROD_COMPOSE ?= docker compose -f docker-compose.prod.yml

prod-build:          ## [PROD] Build das imagens de producao (backend + nginx multi-stage)
	$(PROD_COMPOSE) build --no-cache

prod-up:             ## [PROD] Sobe todos os servicos em background
	$(PROD_COMPOSE) up -d

prod-down:           ## [PROD] Para todos os servicos
	$(PROD_COMPOSE) down

prod-logs:           ## [PROD] Acompanha logs em tempo real
	$(PROD_COMPOSE) logs -f

prod-ps:             ## [PROD] Status dos containers
	$(PROD_COMPOSE) ps

prod-restart:        ## [PROD] Reinicia todos os servicos
	$(PROD_COMPOSE) restart

prod-migrate:        ## [PROD] Executa migrate no container backend
	$(PROD_COMPOSE) exec backend python manage.py migrate

prod-createsuperuser: ## [PROD] Cria superusuario Django
	$(PROD_COMPOSE) exec backend python manage.py createsuperuser

prod-collectstatic:  ## [PROD] Executa collectstatic manualmente
	$(PROD_COMPOSE) exec backend python manage.py collectstatic --no-input

prod-nginx-reload:   ## [PROD] Recarrega Nginx sem downtime (ex: apos renovar SSL)
	$(PROD_COMPOSE) exec nginx nginx -s reload

prod-shell:          ## [PROD] Shell Django no backend
	$(PROD_COMPOSE) exec backend python manage.py shell

prod-db-dump:        ## [PROD] Dump do banco de producao em backups/
	@mkdir -p $(BACKUP_DIR)
	@$(PROD_COMPOSE) exec -T db sh -c 'pg_dump -U "$(DB_USER)" -d "$(DB_NAME)" --clean --if-exists --no-owner --no-privileges --encoding=UTF8' > "$(BACKUP_DIR)/$(DUMP_FILE)"
	@echo "Dump criado: $(BACKUP_DIR)/$(DUMP_FILE)"

init-ssl:            ## [PROD] Configura SSL Let's Encrypt — uso: make init-ssl DOMAIN=x.com EMAIL=y@z.com
	@test -n "$(DOMAIN)" || (echo "ERRO: Informe DOMAIN. Exemplo: make init-ssl DOMAIN=app.meusite.com EMAIL=admin@meusite.com" && exit 1)
	@test -n "$(EMAIL)"  || (echo "ERRO: Informe EMAIL.  Exemplo: make init-ssl DOMAIN=app.meusite.com EMAIL=admin@meusite.com" && exit 1)
	@./scripts/init-ssl.sh $(DOMAIN) $(EMAIL)

renew-ssl:           ## [PROD] Renova certificado SSL (use no cron: 0 12 * * *)
	$(PROD_COMPOSE) run --rm certbot renew
	$(PROD_COMPOSE) exec nginx nginx -s reload