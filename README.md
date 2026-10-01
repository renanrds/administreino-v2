# Administreino

PWA full stack para **treino e musculação**: montar fichas, executar a sessão com cronômetro de descanso e consultar o histórico.

**App em produção:** [https://app.r-sistemas.online/](https://app.r-sistemas.online/)

Cada pessoa cria a própria conta, organiza os treinos e registra o que foi feito. A interface é uma SPA instalável; a API fica atrás de autenticação JWT.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, TypeScript, Zustand |
| Backend | Django 5, Django REST Framework, Simple JWT |
| Banco | PostgreSQL |
| Infra | Docker e Docker Compose |

## Funcionalidades

- **Fichas** — treinos com exercícios, séries, repetições e tempo de descanso
- **Sessão** — execução com cronômetro de descanso entre as séries
- **Histórico** — sessões concluídas, estatísticas e percentual de conclusão
- **PWA** — manifesto, ícones e service worker para instalar na tela inicial
- **Conta** — cadastro, login e API documentada em Swagger (`/api/docs/`)

Há também um módulo opcional de finanças (Moneyger), separado do fluxo de treino. Detalhes em [docs/moneyger.md](docs/moneyger.md).

## Como rodar

Pré-requisitos: Docker e Docker Compose.

```bash
cp backend/.env.example backend/.env
docker compose up --build db backend frontend
```

Em segundo plano:

```bash
docker compose up -d --build db backend frontend
```

Atalhos do [Makefile](Makefile):

| Comando | O que faz |
| --- | --- |
| `make up` | Sobe o ambiente de desenvolvimento |
| `make down` | Para os containers |
| `make build` | Reconstrói as imagens |
| `make logs` | Acompanha os logs |
| `make migrate` | Aplica migrações |
| `make createsuperuser` | Cria um administrador do Django |
| `make shell-backend` | Abre o shell do Django |

Depois de subir (ambiente local):

- App: http://localhost:5173
- API: http://localhost:8000/api/
- Swagger: http://localhost:8000/api/docs/

Produção: [https://app.r-sistemas.online/](https://app.r-sistemas.online/)

O serviço `tunnel` do Compose é opcional (túnel HTTPS). Use um token seu, só no ambiente local, e não o versione.

Passo a passo de uso, PWA e comandos extras: **[INSTRUCOES.md](INSTRUCOES.md)**.

## Produção

Copie [`.env.prod.example`](.env.prod.example) para `.env.prod` no servidor e preencha os valores lá. Esse arquivo fica fora do Git. Visão geral do deploy (sem hosts nem segredos deste ambiente): [docs/deploy.md](docs/deploy.md).

## Licença

Uso pessoal / portfólio. Ajuste a licença se for redistribuir.
