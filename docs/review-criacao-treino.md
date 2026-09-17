# Review: criação de treino — Administreino v2

**Tipo:** investigação / arquitetura (somente leitura).  
**Escopo:** branch `main` atual. Nenhum código de aplicação foi alterado.  
**Público:** product owner (Renan) + operação/engenharia.  
**Data:** 2026-09-17.

Este documento descreve **como a criação de treino funciona hoje**, o que o modelo de dados realmente cobre, e o que vale otimizar ou substituir com recursos modernos **deste** stack. Toda afirmação aponta para arquivos do repositório. Onde algo **não existe**, isso é dito explicitamente — não foi inventado.

---

## 1. Stack atual (versões do repo)

| Camada | O que está no repo |
|---|---|
| Backend | Django **5.2**, DRF **3.17.1**, Simple JWT **5.5.1**, drf-spectacular **0.28.0**, Pillow, PostgreSQL **17** (`backend/requirements.txt`, `docker-compose.yml`) |
| Frontend | React **19.2**, Vite **8**, Tailwind **4.2**, React Router **7**, Zustand **5**, Axios, Lucide. **TanStack Query 5.95 está no `package.json`, mas não é usado em nenhum componente** (`frontend/src/main.tsx` não monta `QueryClientProvider`) |
| Auth | JWT (access 8h, refresh 30d), filtro por `request.user` |
| Docs API | Swagger em `/api/docs/` (`backend/core/urls.py`) |
| PWA | `manifest.json` + service worker **network-first sem cache** (`frontend/public/sw.js`) |
| Templates Django | só admin. A UI de treino é 100% SPA React |
| Celery / Redis / Channels | **não existem** neste repo |
| Testes | `backend/workouts/tests.py` e `backend/users/tests.py` estão vazios |

### O que o produto **não tem** hoje (e o briefing pedia para checar)

Não há, em `main`:

- papéis **personal / aluno**
- **multi-tenant** (academia, organização)
- atribuição de treino a outro usuário
- modelo de **programa / semana / periodização**
- catálogo compartilhado de exercícios
- templates reutilizáveis ou endpoint de **clone**
- supersets, circuits, dropsets, carga por série
- jobs assíncronos

Há um branch remoto `migracao-administudo` com entitlements (free/premium) e o app Adminisgrana. Os **modelos de treino lá são os mesmos** (`Workout` / `Exercise`). Mesmo nesse branch **não há** relação personal↔aluno. Este review cobre o que está em `main`.

---

## 2. Resumo do fluxo atual

O usuário autenticado cria treinos **só para si**. Um “treino” (`Workout`) é **um dia/sessão planejada**, não um programa de vários dias.

Há **três entradas de criação**:

1. **Manual** — tela “Novo Treino” (`/workouts/new`). Salva o cabeçalho (`POST /api/workouts/`) e depois **um request por exercício** (`POST /api/workouts/{id}/exercises/`).
2. **Edição** — mesma tela (`/workouts/:id/edit`). Atualiza o cabeçalho (`PATCH`) e cada exercício (`PATCH` se já tem `id`, senão `POST`). **Remover um exercício na UI não chama DELETE.**
3. **IA (indireta)** — “Gerador de Prompts” monta um texto no browser, o usuário cola em ChatGPT/Claude/Gemini, volta com JSON, revisa em “Importar Treino” e envia `POST /api/workouts/import-from-json/`. O backend **explode o JSON em N treinos**, um por dia, com nome `{programa} - Dia {A}`.

A “sequência A/B/C” **não é um modelo**. É convenção de nome + regex em `RecommendedWorkoutView` (`parse_program_base` / `parse_sequence_order`). Listagem recomenda o “próximo dia” a partir do último `WorkoutSession` concluído.

Execução (fora da criação, mas acoplada): “Iniciar” cria `WorkoutSession`; cada série vira `ExerciseLog`. A sessão lê o plano vivo (`GET /workouts/{id}/`), não uma cópia estruturada dos exercícios — só alguns campos são snapshotados.

Permissão: `IsAuthenticated` + queryset `user=request.user`. Soft-delete (`is_active=False`) na exclusão. Sem papéis, sem object-level permissions extras.

---

## 3. Diagrama textual do fluxo

```
[Login JWT]
    │
    ▼
[Meus Treinos]  /workouts
    │
    ├──► [Novo Treino] /workouts/new
    │         │  preenche nome, tipo, exercícios (autocomplete local)
    │         ▼
    │    POST /api/workouts/                 → cria Workout (sem exercícios)
    │    for each exercício:
    │        POST /api/workouts/{id}/exercises/   → cria Exercise
    │         │
    │         └── (sem transaction no backend; N round-trips)
    │
    ├──► [Editar] /workouts/:id/edit
    │         PATCH /api/workouts/{id}/
    │         PATCH /api/exercises/{id}/  ou  POST .../exercises/
    │         ❌ exercício removido na tela NÃO é apagado no banco
    │
    ├──► [Gerar prompt] /workouts/gerar-prompt   (só frontend, zero API)
    │         copia prompt → IA externa → JSON
    │         ▼
    │    [Importar] /workouts/importar
    │         POST /api/workouts/import-from-json/
    │         transaction.atomic():
    │             para cada day em JSON:
    │                 cria Workout("{name} - Dia {A}")
    │                 cria Exercise (loop, um INSERT por exercício)
    │
    └──► [Iniciar] POST /api/sessions/ { workout }
              GET  /api/sessions/{id}/
              GET  /api/workouts/{id}/     ← plano usado na sessão
              POST /api/sessions/{id}/logs/  (por série)

Recomendação do próximo treino (não é criação):
    GET /api/workouts/recommended/
        lê todos os treinos ativos do user na memória
        agrupa pelo sufixo do nome (" - Dia A" / " - Treino A")
        avança para o próximo da lista
```

---

## 4. Como o treino é composto hoje

### 4.1 Modelo real

Definido em `backend/workouts/models.py`:

| Conceito de produto | No código |
|---|---|
| Programa / split (ABC, PPL) | **Não existe.** Vira vários `Workout` com nome padronizado na importação |
| Dia da semana / ordem no ciclo | **Não existe.** Inferido por regex no nome (`backend/workouts/views.py`, `parse_sequence_order`) |
| Treino (1 sessão planejada) | `Workout`: `user`, `name`, `description`, `workout_type`, `is_active` |
| Exercício no treino | `Exercise`: `name` (texto livre), `muscle_group` (enum), `sets` (quantidade), `reps` + `min_reps`/`max_reps`, `rest_seconds`, `weight_kg` (uma carga para todas as séries), `notes`, `order` |
| Série planejada individual | **Não existe.** Só um inteiro `sets` |
| Superset / bi-set / circuito | **Não existe** |
| Carga por série / RPE planejado | **Não existe no plano.** RPE só no `ExerciseLog` da execução |
| Template / cópia / biblioteca | **Não existe** |
| Atribuição a aluno | **Não existe.** `Workout.user` é o dono |

Enums:

- `WorkoutType`: strength, hypertrophy, endurance, cardio, hiit, flexibility, functional
- `MuscleGroup`: chest, back, shoulders, biceps, triceps, legs, glutes, abs, calves, forearms, full_body, cardio

### 4.2 Relação com execução

- `WorkoutSession` guarda snapshot de **nome/tipo** e contagens planejadas (`capture_workout_snapshot`).
- `ExerciseLog` snapshota nome, grupo, reps/carga/descanso **no `save()`**, se os campos ainda estiverem vazios.
- A tela ativa ainda busca o `Workout` vivo. Se o plano for editado no meio da sessão, o layout das séries muda; logs antigos podem ficar órfãos conceitualmente (FK `exercise` continua apontando para o exercício, que pode ter sido alterado).

### 4.3 Catálogo de exercícios

Não há tabela `ExerciseCatalog`. A sugestão de nomes é um array hardcoded `SUGGESTED_EXERCISES` em `frontend/src/pages/WorkoutFormPage.tsx` (~80 nomes). Autocomplete só nessa tela; a importação JSON **não** usa essa lista.

### 4.4 Campo `notes`

Existe no model, no serializer e no estado do form (`ExerciseForm.notes`). **Não há input de observações na UI de criação/edição.** Na importação, `notes` entra no JSON de exemplo mas **não é editável** na revisão. Ou seja: o backend aceita, a UI de criação quase não expõe.

---

## 5. API, permissões e consistência

### 5.1 Endpoints de criação/edição

Fonte: `backend/workouts/urls.py` + `backend/workouts/views.py`.

| Método | Path | View | Papel |
|---|---|---|---|
| GET/POST | `/api/workouts/` | `WorkoutListCreateView` | lista ativos; POST usa `WorkoutCreateSerializer` (sem nested exercises) |
| GET/PATCH/DELETE | `/api/workouts/{pk}/` | `WorkoutDetailView` | DELETE = soft-delete (`is_active=False`) |
| GET/POST | `/api/workouts/{workout_id}/exercises/` | `ExerciseListCreateView` | cria exercício avulso |
| GET/PATCH/DELETE | `/api/exercises/{pk}/` | `ExerciseDetailView` | |
| POST | `/api/workouts/import-from-json/` | `ImportWorkoutFromJSONView` | cria N treinos |
| GET | `/api/workouts/recommended/` | `RecommendedWorkoutView` | heurística de sequência |

Serializers em `backend/workouts/serializers.py`:

- `WorkoutSerializer` — leitura com `exercises` **read_only** e `total_exercises` (property que faz `COUNT`).
- `WorkoutCreateSerializer` — só cabeçalho; injeta `user` no `create()`.
- `ExerciseSerializer` — valida intervalo `min_reps`/`max_reps` e normaliza `reps`.

Não há serializer de escrita aninhada. Não há DTO dedicado para o payload de importação: a view valida dicionários na mão.

### 5.2 Permissões e isolamento

- JWT obrigatório (`REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES']`).
- Querysets filtrados por `workout__user=self.request.user` ou `user=self.request.user`.
- Um usuário **não** vê treino de outro (desde que os querysets sejam usados — estão).
- Sem grupos Django, sem `IsAdminUser` nas views de treino, sem tenant.

### 5.3 Transações e condições de corrida

- Criação manual: **sem** `transaction.atomic()`. Se o 4º exercício falhar, fica treino pela metade.
- Importação: usa `atomic()`, mas **retorna `Response` 400 de dentro do bloco**. Em Django, `return` não dá rollback — só exception. Validação tardia (dia 2 sem exercício, muscle_group inválido) **pode gravar o dia 1**.
- Uma sessão `in_progress` por usuário é checada com `.first()` **sem lock** (`select_for_update`). Dois “Iniciar” simultâneos podem criar duas sessões.
- `ExerciseLog.unique_together = (session, exercise, set_number)` existe, mas o `save()` recálcula agregados da sessão em todo INSERT/UPDATE (write extra por série).

### 5.4 Queries (N+1)

Não há **nenhum** `select_related` / `prefetch_related` / `annotate` no app `workouts` (busca no repo: zero ocorrências).

`GET /api/workouts/`:

1. SELECT dos treinos
2. **N** SELECTs de exercícios (nested serializer)
3. **N** `COUNT` via property `Workout.total_exercises` (`models.py`)

`GET /api/workouts/recommended/` carrega **todos** os treinos ativos em lista Python e ordena por regex.

`WorkoutHistoryView` faz um loop de sessões e, para cada uma, `ExerciseLog.objects.filter(...)` + `completion_percentage` (outro `COUNT`).

`DashboardView` dispara vários COUNTs independentes (aceitável na escala atual; dá para unificar).

### 5.5 Constraints de banco

FKs ganham índice automático. Além disso:

- **não há** `indexes` compostos (ex.: `user + is_active`, `user + status`)
- **não há** `UniqueConstraint` / `CheckConstraint` (Django 5 recomenda `constraints` no lugar de `unique_together`)
- **não há** check `min_reps <= max_reps` no banco (só no serializer)
- `unique_together` em `ExerciseLog` e `GymLocation` ainda no estilo antigo

---

## 6. Frontend da criação

Rotas em `frontend/src/App.tsx`:

- `/workouts` — lista, iniciar, excluir, atalhos IA/importar
- `/workouts/new` e `/workouts/:id/edit` — form único
- `/workouts/gerar-prompt` — gerador de prompt
- `/workouts/importar` — colar JSON + revisão

### 6.1 Form manual (`WorkoutFormPage.tsx`)

- Estado local (`useState`), sem React Hook Form / TanStack Form / Zod.
- Autocomplete por substring na lista hardcoded; ao casar o nome, preenche `muscle_group`.
- Ícone `GripVertical` **é só visual** — não há drag-and-drop nem reorder.
- Validação: `alert()` (nome vazio, exercício sem nome, reps inválidas).
- `handleSave` faz N chamadas HTTP em série; erro no meio deixa dados parciais.
- `notes` no estado, sem campo na tela.
- Componente monolítico (~490 linhas) com catálogo, parser de reps, form e layout juntos.

### 6.2 Importação (`ImportWorkoutPage.tsx`)

Fluxo em 3 passos: colar JSON → revisar (edita nome/tipo/dias/exercícios) → sucesso.  
Limpa fences ` ```json `. Revisão **não** permite adicionar exercício nem reordenar; só editar e remover. `notes` do JSON não aparece na revisão.

### 6.3 Prompt IA (`PromptGeneratorPage.tsx`)

Zero chamada de backend. Usa dados do perfil Zustand (`gender`, `experience_level`, `age`, peso, altura, objetivo, dias/semana) **se existirem**. Split (A, AB, ABC… PPL) só entra no texto do prompt; o app não persiste o split.

O loop atual é: **app gera prompt → humano cola na IA → humano cola JSON no app**. Não há geração in-app, nem chave de LLM, nem fila.

### 6.4 Estado / cache / offline

- Zustand só para auth (`frontend/src/store/authStore.ts`), persistido no localStorage.
- Listas de treino: `useEffect` + `useState` + Axios. Sem cache, sem invalidação, sem retry estruturado.
- PWA: SW não guarda draft; offline = 503 “Sem conexao no momento.”
- React Query já está na dependência — oportunidade imediata, sem novo pacote.

### 6.5 UX colateral na lista

O modal de exclusão diz: *“Essa ação exclui o treino e seus exercícios cadastrados. Não é possível desfazer.”*  
O backend só marca `is_active=False`. Exercícios e sessões históricas **permanecem**. Copy e comportamento divergem (`WorkoutsPage.tsx` vs `WorkoutDetailView.destroy`).

---

## 7. O que avaliar e **descartar** neste stack

| Ideia do briefing | Veredito |
|---|---|
| Django async views | **Descartar agora.** Criação é CRUD síncrono no Postgres (`psycopg2`). Async não reduz N+1 nem os N POSTs do form. |
| Django formsets | **Descartar.** UI é SPA; formsets são para templates Django, que o app não usa. |
| Channels / websocket | **Descartar para criação.** Não há colaboração em tempo real. Sessão ativa já funciona com HTTP. |
| JSONField como “documento do treino” | **Não como substituto do modelo relacional.** Já existe payload JSON na importação; persistir o plano só como blob prejudica listagem, recomendação e histórico. JSONField pode **complementar** metadados (split, período) depois de um modelo `Program`. |
| Paginação | Útil quando a lista crescer; hoje a API devolve array inteiro (DRF sem `PAGE_SIZE`). Prioridade média. |
| OpenAPI | **Já existe** (spectacular + `/api/docs/`). Falta documentar o payload de import e os erros 400 manuais. Não é blocker da criação. |

---

## 8. Recomendações priorizadas

### Quick wins (alto efeito / baixo risco)

#### Q1 — Prefetch + annotate na listagem de treinos

- **Hoje:** `WorkoutListCreateView.get_queryset()` devolve `Workout.objects.filter(...)` sem prefetch; `total_exercises` chama `.count()` (`models.py`, property).
- **Proposta:** `prefetch_related('exercises')` + `annotate(total_exercises=Count('exercises'))`. Trocar a property por annotated field (ou `len(obj.exercises.all())` se o prefetch estiver presente — `.count()` ignora cache e vai ao banco).
- **Benefício:** lista “Meus Treinos” deixa de fazer 2N+1 queries.
- **Risco/esforço:** baixo. Só leitura.

#### Q2 — Um POST atômico com exercícios aninhados

- **Hoje:** frontend em `WorkoutFormPage.handleSave` faz 1 + N requests; backend não tem nested write; sem `atomic()`.
- **Proposta:** `WorkoutWriteSerializer` com `exercises = ExerciseSerializer(many=True)` writable; `create`/`update` dentro de `transaction.atomic()`; `bulk_create` dos exercícios novos. Frontend passa a um único `POST`/`PUT`.
- **Benefício:** some treino “pela metade”, some latência de N round-trips (crítico no celular), some a lógica duplicada de save.
- **Risco/esforço:** médio-baixo. Manter os endpoints soltos de exercício por um tempo se a sessão ainda criar/editar exercício avulso (hoje a sessão **não** cria exercício).

#### Q3 — Edição: apagar exercícios removidos

- **Hoje:** `removeExercise` só filtra o array React. IDs antigos ficam no banco e reaparecem no próximo GET.
- **Proposta:** no `update` nested, `exclude(id__in=ids_enviados).delete()` (ou DELETE explícito). Confirmar impacto em `ExerciseLog` (FK `CASCADE` — logs históricos do exercício somem). Preferível: soft-delete no exercício **ou** snapshot completo na sessão (já parcialmente feito) + `on_delete=PROTECT`/`SET_NULL`.
- **Benefício:** o que o usuário vê é o que fica salvo.
- **Risco:** médio se já houver histórico apontando para o exercício. Tratar CASCADE antes de ligar o delete.

#### Q4 — Import: rollback de verdade + `bulk_create`

- **Hoje:** `ImportWorkoutFromJSONView` valida na mão; `return Response(400)` dentro de `atomic()` **não desfaz** o dia anterior; um `Exercise.objects.create` por item.
- **Proposta:** serializer de import (`ProgramImportSerializer`); `raise ValidationError` (isso sim dá rollback); `bulk_create` dos exercícios por dia.
- **Benefício:** import all-or-nothing; menos round-trips no Postgres; contrato da API documentável no Swagger.
- **Risco/esforço:** baixo.

#### Q5 — Usar o TanStack Query que já está instalado

- **Hoje:** `package.json` declara `@tanstack/react-query`; `main.tsx` não configura; páginas usam `useEffect`+Axios.
- **Proposta:** `QueryClientProvider`; `useQuery` na lista/detalhe; `useMutation` no save/import com invalidação de `['workouts']`.
- **Benefício:** cache da lista, menos refetch, loading/error padronizados, base para UI otimista depois.
- **Risco/esforço:** baixo. Sem dependência nova.

#### Q6 — Copy de exclusão + parser de reps único

- **Hoje:** UI promete exclusão definitiva; backend faz soft-delete. `parseRepsInput` existe no frontend **e** `parse_reps_input` no backend, regras iguais copiadas.
- **Proposta:** alinhar texto (“arquivar treino; histórico permanece”) **ou** hard-delete consciente. Extrair regra de reps para um único contrato (serializer + mensagem de erro da API).
- **Benefício:** confiança do usuário; menos drift 8-10 vs 10.
- **Risco/esforço:** baixo.

#### Q7 — Campo observações + constraint simples

- **Hoje:** `Exercise.notes` some na UI; `min_reps > max_reps` só no serializer.
- **Proposta:** textarea no card do exercício; `CheckConstraint` no model Django 5 (`min_reps <= max_reps`); índice `(user, is_active)` em `Workout`.
- **Benefício:** o que a IA manda em `notes` vira visível; integridade no banco.
- **Risco/esforço:** baixo.

---

### Médio prazo

#### M1 — Programa como entidade (dias de verdade)

- **Hoje:** import cria `Hipertrofia ABC - Dia A`, `... - Dia B`; recomendação parseia o nome (`PROGRAM_DAY_SUFFIX_PATTERN`).
- **Proposta:** `Program` (nome, tipo, user, split) 1—N `Workout` (ou `ProgramDay` com `letter`, `focus`, `order`). Recomendação usa `order`, não regex.
- **Benefício:** split ABC/PPL deixa de ser convenção frágil; UI pode mostrar “programa” em vez de N cards soltos; clonar/adaptar um ciclo inteiro fica natural.
- **Risco/esforço:** médio. Migração dos nomes atuais ` - Dia X` para linhas de programa. Frontend da lista muda.

#### M2 — Catálogo de exercícios + picker composto

- **Hoje:** array de ~80 itens no form; import aceita qualquer string.
- **Proposta:** model `ExerciseDefinition` (nome pt-BR, grupo, aliases, flags composto/isolado). Picker reutilizável (form, import, revisão IA). Manter “exercício livre” para nomes fora da lista.
- **Benefício:** autocomplete consistente, analytics por exercício, base para vídeo/orientação sem scrape ad-hoc.
- **Risco/esforço:** médio. Seed inicial pode sair da lista atual.

#### M3 — Clone / “adaptar treino anterior”

- **Hoje:** não há botão nem endpoint. Único “reuse” é editar o mesmo `Workout` (o que mistura plano e histórico).
- **Proposta:** `POST /api/workouts/{id}/clone/` (e, com M1, clone de programa). UI: “Duplicar” na lista. Opcional: puxar última carga de `ExerciseLog` como `weight_kg` sugerido.
- **Benefício:** o atalho que personal/aluno mais usam, sem esperar IA.
- **Risco/esforço:** baixo-médio depois de Q2.

#### M4 — Drag-and-drop de ordem

- **Hoje:** `order` existe; GripVertical não faz nada; ordem = índice no save.
- **Proposta:** `@dnd-kit/core` (leve, touch-friendly) no picker; persistir `order` no nested PUT.
- **Benefício:** UX de montagem de treino; no celular, reordenar 8 exercícios sem “excluir e recadastrar”.
- **Risco/esforço:** médio (acessibilidade + persistência).

#### M5 — Carga/reps por série no plano (sem ainda virar periodização)

- **Hoje:** uma carga e um range de reps para todas as séries.
- **Proposta:** JSONField `sets_prescription: [{reps, weight_kg, rest}]` **ou** model `PlannedSet`. Começar por JSONField validado no serializer se quiser ir rápido; model se for consultar/agrupar.
- **Benefício:** warmup sets, pirâmide, rest-pause — o que o JSON de IA às vezes já tenta descrever em `notes`.
- **Risco/esforço:** médio. Sessão ativa (`ActiveSessionPage`) hoje gera séries com `for (s = 1; s <= ex.sets)`. Teria que ler a prescrição.

#### M6 — Geração IA in-app (em vez de copy-paste)

- **Hoje:** prompt client-side + 4 links externos (`PromptGeneratorPage.tsx`).
- **Proposta:** endpoint `POST /api/workouts/generate/` que chama um LLM, valida no **mesmo** serializer da importação, devolve preview. Manter o fluxo manual/colar como fallback. Sem Celery no início (request-response com timeout); se a latência do LLM incomodar, aí sim fila (Redis+Celery seria **nova** infra — hoje não existe).
- **Benefício:** cai o atrito principal da criação “inteligente”. Perfil do aluno (já no `User`) entra direto.
- **Risco:** custo, chave, alucinação de `muscle_group`. Mitigar com validação rígida (já existe na import) e preview obrigatório (já existe na UI).

#### M7 — Snapshot completo do plano na sessão

- **Hoje:** snapshot de nome/tipo/contagens e de alguns campos no log; a UI da sessão reconsulta o `Workout` atual.
- **Proposta:** gravar `plan_snapshot` JSON no `WorkoutSession` no `create()`. Tela ativa lê o snapshot, não o plano vivo.
- **Benefício:** editar o treino não corrompe sessão em andamento; histórico reproduz o que foi feito.
- **Risco/esforço:** médio. `ActiveSessionPage` precisa de um contrato estável.

---

### Bigger bets (produto / modelo)

#### B1 — Papel personal ↔ aluno (hoje inexistente)

Não há nada para “otimizar”: é **feature nova**. Implica `Role`, vínculo `CoachAthlete`, `Workout.user` vs `Workout.assigned_to`, permissões DRF (`IsCoachOfAthlete`), UI de atribuição, e provavelmente `Program` (M1) para o personal montar uma vez e copiar para vários alunos.

Fazer isso **antes** de Q2/M1 aumenta retrabalho: nested write e programa deveriam nascer já com `owner` + `assignee`.

#### B2 — Supersets, circuits, blocos

Exige agrupamento (`ExerciseGroup` com tipo: straight / superset / circuit, e filhos ordenados). A sessão (timer de descanso, “próxima série”) muda bastante (`ActiveSessionPage.tsx` é o arquivo mais complexo do frontend). Só vale depois do plano nested estável.

#### B3 — Periodização (mesociclo, deload, progressão)

Depende de programa (M1) + histórico de cargas. Hoje o histórico existe (`WorkoutHistoryView`, snapshots de log) mas a criação não lê isso. Caminho: clone com última carga (M3) → regras simples de progressão (“+2,5 kg se bateu o teto do range”) → só então periodização.

#### B4 — Offline drafts / PWA de verdade

O SW atual **apaga cache** e não persiste POST. Draft no `indexedDB` (Zustand persist ou TanStack Query persister) para o form de treino é o passo certo; service worker full-offline é outro projeto (conflita com JWT e com o SW atual de `no-store`).

#### B5 — Multi-tenant academia

Fora do modelo atual. `GymLocation` é geofence do **próprio** usuário (Wellhub/TotalPass), não um tenant. Não reutilizar essa tabela para “a academia dona dos treinos”.

---

## 9. Ordem sugerida de execução

Se a meta é “criar treino melhor, no produto de hoje” (usuário treina sozinho):

1. Q1 (queries) + Q5 (React Query) — ninguém vê, todo mundo sente.
2. Q2 + Q3 + Q4 — um save confiável, import all-or-nothing.
3. Q6 + Q7 — UX honesta e notes visíveis.
4. M3 (clone) — maior ganho de produto por linha de código.
5. M1 (Program) — destravar split de verdade e a recomendação sem regex.
6. M2 + M4 — picker e reorder.
7. M6 — IA in-app, reusando o serializer da importação.
8. Só então B1 (personal/aluno), se esse for o posicionamento SaaS.

Não começar por async Django, Channels, nem JSONField “god object”.

---

## 10. Arquivos-chave

### Backend

| Path | Por quê |
|---|---|
| `backend/workouts/models.py` | `Workout`, `Exercise`, `WorkoutSession`, `ExerciseLog`; property N+1; snapshot no `save()` do log |
| `backend/workouts/serializers.py` | leitura nested; escrita só do cabeçalho; validação de reps |
| `backend/workouts/views.py` | CRUD, import JSON, recomendação por regex, dashboard, YouTube scrape |
| `backend/workouts/urls.py` | mapa da API |
| `backend/workouts/admin.py` | inline de exercícios no Django admin (outro canal de criação, pouco usado pelo app) |
| `backend/workouts/tests.py` | vazio |
| `backend/workouts/migrations/0001_initial.py` | schema original |
| `backend/workouts/migrations/0003_exercise_rep_ranges_and_log_snapshots.py` | `min_reps` / `max_reps` |
| `backend/users/models.py` | `User` (perfil do “aluno” = o próprio user); `GymLocation` (não é treino) |
| `backend/users/views.py` | registro/perfil/termos; sem papéis |
| `backend/core/settings.py` | DRF, JWT, spectacular, Postgres; sem Celery/Channels |
| `backend/core/urls.py` | `/api/`, `/api/docs/` |
| `backend/requirements.txt` | versões |

### Frontend

| Path | Por quê |
|---|---|
| `frontend/src/pages/WorkoutFormPage.tsx` | criação/edição manual, catálogo local, save N+1 |
| `frontend/src/pages/WorkoutsPage.tsx` | lista, recomendação, iniciar, delete copy errado |
| `frontend/src/pages/PromptGeneratorPage.tsx` | prompt IA 100% client-side |
| `frontend/src/pages/ImportWorkoutPage.tsx` | colar JSON, review, POST import |
| `frontend/src/pages/ActiveSessionPage.tsx` | consome o plano criado (séries derivadas de `ex.sets`) |
| `frontend/src/App.tsx` | rotas |
| `frontend/src/types/index.ts` | contratos TS (`Workout`, `Exercise`, `RecommendedWorkout`) |
| `frontend/src/services/api.ts` | Axios + refresh JWT |
| `frontend/src/store/authStore.ts` | único store; perfil usado no prompt |
| `frontend/src/main.tsx` | sem QueryClient |
| `frontend/package.json` | React 19, Query instalado e ocioso |
| `frontend/public/sw.js` | PWA sem draft offline |

### Produto / ops

| Path | Por quê |
|---|---|
| `INSTRUCOES.md` | descreve o fluxo oficial: Treinos → criar → iniciar → Histórico |
| `docker-compose.yml` | Postgres 17 + runserver; sem worker |

---

## 11. Riscos de produto já visíveis (para o owner)

1. **“Programa” é um nome de arquivo.** Se o usuário criar “Treino A” na mão, sem o sufixo ` - Dia X`, a recomendação não agrupa. Importação e criação manual **não compartilham o mesmo conceito de split**.
2. **IA é um ritual de copiar e colar**, não um recurso da plataforma. Qualquer concorrente com um botão “Gerar” ganha na percepção.
3. **Editar o treino é mutar a fonte da verdade** de sessões passadas (mitigado só em parte pelos snapshots).
4. **Não dá para atribuir treino a aluno** — o SaaS “personal + alunos”, se for a visão, ainda não começou no modelo.
5. **Zero testes** no domínio de treino. Nested write e import atômico (Q2/Q4) são o momento certo para cobrir isso, não um luxo depois.

---

*Fim do review. Nenhuma alteração de comportamento foi feita no aplicativo.*
