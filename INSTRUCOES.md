# Administreino - Instruções de Execução

O **Administreino** é um sistema completo de controle e gerenciamento de treinos, construído com as seguintes tecnologias:
- **Frontend**: React, Vite, Tailwind CSS v4, Zustand, Lucide React (PWA configurado)
- **Backend**: Python 3.12, Django 5, Django REST Framework, Simple JWT
- **Banco de Dados**: PostgreSQL 17
- **Infraestrutura**: Docker e Docker Compose (Hot Reload ativo)

---

## 1. Como rodar o projeto localmente (Debian 13)

### Pré-requisitos
- Docker e Docker Compose instalados.

### Passos
1. No terminal, navegue até a pasta do projeto (`administreino/`).
2. Execute o comando para subir os containers:
   ```bash
   docker compose up --build
   ```
   *Dica: Se quiser rodar em background, use `docker compose up -d --build`.*

3. Após os containers subirem, o backend vai rodar as migrações automaticamente.
4. O frontend estará disponível em: **http://localhost:5173**
5. A API do backend estará disponível em: **http://localhost:8000/api/**
6. A documentação Swagger da API estará em: **http://localhost:8000/api/docs/**

---

## 2. Comandos Úteis (Makefile)

Para facilitar, incluí um `Makefile` na raiz do projeto. Você pode rodar os seguintes comandos:

- `make up`: Inicia os containers.
- `make down`: Para os containers.
- `make build`: Reconstrói as imagens Docker.
- `make logs`: Visualiza os logs dos containers em tempo real.
- `make migrate`: Roda as migrações do banco de dados (caso crie novos modelos).
- `make createsuperuser`: Cria um usuário administrador do Django.
- `make shell-backend`: Abre o shell interativo do Django.

---

## 3. Como usar o App

1. Acesse **http://localhost:5173**.
2. Clique em **Criar conta** para registrar seu primeiro usuário.
3. Após o login, você verá o Dashboard vazio.
4. Vá na aba **Treinos** (ícone de haltere) e crie um novo treino, adicionando exercícios, séries, repetições e tempo de descanso.
5. Inicie o treino! A tela de sessão ativa mostrará um cronômetro de descanso dinâmico entre as séries.
6. Ao finalizar, o treino ficará registrado na aba **Histórico** com as estatísticas e percentual de conclusão.

---

## 4. Acesso Externo (Fora da rede local)

Para acessar o Administreino do seu celular fora de casa (ou em outra rede), você pode usar um túnel seguro como o **Ngrok** ou o **Cloudflare Tunnel**.

### Opção 1: Usando Ngrok
1. Instale o Ngrok no seu Debian 13:
   ```bash
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
   ```
2. Inicie o túnel apontando para a porta do frontend:
   ```bash
   ngrok http 5173
   ```
3. O Ngrok fornecerá uma URL pública (ex: `https://xyz.ngrok-free.app`). Acesse essa URL do seu celular.

*(Nota: Como o Vite no Docker está configurado com proxy para o backend na mesma origem, a API funcionará automaticamente pela mesma URL do Ngrok).*

---

## 5. PWA (Adicionar à Tela Inicial)

O frontend foi configurado como um **Progressive Web App (PWA)** com `manifest.json`, ícones personalizados e Service Worker.

Para instalar no celular:
1. Acesse a URL do projeto (via IP local na mesma rede de Wi-Fi, ou via Ngrok) usando o Google Chrome ou Safari.
2. No menu do navegador, escolha a opção **"Adicionar à Tela Inicial"** (Add to Home Screen).
3. O Administreino aparecerá como um aplicativo nativo no seu celular, rodando em tela cheia e com ícone próprio!

---

## 6. Produção

O deploy é específico de cada ambiente. O roteiro genérico (CI, runner self-hosted, checklist) está em **[docs/deploy.md](docs/deploy.md)**.

Domínio, caminhos no servidor, usuário de SSH e tokens ficam só no host de deploy (arquivo `.env.prod` e variáveis do GitHub). Não coloque esses dados neste repositório.

---

## 7. Moneyger (finanças)

Módulo independente (tema verde), restrito a allowlist/`superuser`. Ver **[docs/moneyger.md](docs/moneyger.md)**.

---

Bons treinos.
