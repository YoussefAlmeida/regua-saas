# Prompt de fundação — RÉGUA (colar no Claude Code)

Este documento é o ponto de partida do projeto. Cole isto como a primeira mensagem
pro Claude Code, dentro da pasta `regua-saas`.

---

## Contexto (cole isso primeiro, como resumo)

Estou construindo um projeto **novo**, do zero, chamado **RÉGUA** — um SaaS de
agendamento e fluxo de caixa pra barbearias do interior da Bahia. Nesta mesma
pasta existe também o código de um projeto anterior meu, o **Concept Barber**
(Next.js + Supabase) — **use ele só como referência de padrão** (como resolvi
login, agenda, etc. lá), **não copie arquivos dele nem construa em cima do
código dele**. O RÉGUA nasce com estrutura, schema e configuração próprios,
descritos neste documento.

O plano completo de produto está no arquivo `REGUA-projeto-completo.md`
anexado a este repositório — leia ele inteiro antes de tocar em qualquer código.

Regras não-negociáveis:
- **Sprint de 6 dias, full-time.** (Um dia a mais que o original — sem
  reaproveitar código pronto do Concept Barber, o Dia 1 fica mais pesado.)
  Nada de v1.1 (Clube do Corte, WhatsApp completo, metas, etc.) entra nesse
  código agora. Se não está no escopo do Dia 1 ao Dia 6 abaixo, não constrói.
- **Sem comissão, sem fiado, sem forma de pagamento pelo app, sem comanda.** Esses
  conceitos foram cortados do produto de propósito — não reintroduza nenhum deles
  "pra ficar mais completo".
- **RLS em toda tabela, desde a primeira migration.** Nenhuma tabela nasce sem
  política de segurança escrita no mesmo commit.
- **Trabalhe direto na `main`**, com deploy de preview a cada push.

---

## 1. Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- shadcn/ui, com os tokens de design abaixo sobrescrevendo o tema padrão
- Zustand (estado global leve) + TanStack Query (dados do servidor)
- Supabase (Postgres + Auth + Storage) — reaproveitar o projeto do Concept Barber
- Vercel (hospedagem + deploy de preview + Supabase pg_cron ou Vercel Cron pro job de lembrete)
- Recharts (gráficos do painel do gestor)
- Asaas (cobrança recorrente do SaaS — Pix, boleto, cartão)
- WhatsApp: Cloud API oficial da Meta via BSP com plano free (ex.: AraraHQ) —
  fallback manual (`wa.me`) se a aprovação da Meta não sair a tempo
- Zod (validação client + server)
- Sentry + Posthog (free tier no início)

**Dependência externa crítica, verificar antes do Dia 1:** verificação de negócio
na Meta e conta de cobrança no Asaas exigem CNPJ (MEI resolve). Se ainda não
existir, o Dia 1 já pode submeter a verificação da Meta em paralelo — não trava
o resto do código, só o WhatsApp automático e a cobrança real.

---

## 2. Tokens de design (usar em todo o app, não só na landing)

```css
:root {
  --bg:            #0B0B0C;
  --surface:       #141416;
  --surface-2:     #1E1E21;
  --line:          #2A2A2E;
  --fg:            #F2F1ED;
  --fg-muted:      #A1A1A8;
  --accent:        #E8B04B;
  --accent-press:  #C9963B;
  --accent-fg:     #14110A;
  --entrada:       #4FB477;
  --saida:         #E2564D;
  --info:          #6BA3D6;

  --font-display: 'Anton', 'Arial Narrow', sans-serif;
  --font-ui:      'Oswald', sans-serif;
  --font-body:    'Open Sans', system-ui, sans-serif;
  --font-mono:    'Space Mono', 'Courier New', monospace;
}
```

Regras de UI fixas (não são sugestão, são padrão do projeto):
- Toda ação usada mais de 10x/dia fica na metade inferior da tela (regra do polegar) — o dono usa em pé, de uma mão.
- Ícone nunca sozinho: sempre ícone + rótulo escrito.
- Verde = dinheiro entrando, vermelho = dinheiro saindo. Nunca usar essas cores pra outra coisa (sucesso/erro de formulário usa `--info` e um terceiro tom neutro).
- Números em dinheiro usam `--font-mono`, tamanho grande (28px+ no dashboard, 40-64px no "Hoje").
- Grid de 4px, raio 12px em cards / 8px em botões.
- Contraste mínimo WCAG AA (4.5:1) — barbearia tem luz ruim.
- Estado vazio nunca fica vazio: sempre com uma ação ("Nenhum lançamento hoje. Registrar entrada").

---

## 3. Schema SQL completo — rodar como primeira migration

```sql
-- ========== EXTENSÕES ==========
create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;

-- ========== BARBEARIAS ==========
create table barbearias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text unique not null,
  telefone text,
  endereco text,
  instagram text,
  logo_url text,
  fuso text not null default 'America/Bahia',
  horario_funcionamento jsonb not null default '{}',
  dias_fechados jsonb not null default '[]',
  plano text not null default 'trial' check (plano in ('trial','cadeira','barbearia','rede')),
  status text not null default 'trial' check (status in ('trial','ativo','leitura','cancelado')),
  trial_fim timestamptz not null default (now() + interval '14 days'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ========== USUARIOS (dono, barbeiro, cliente — login unificado) ==========
create table usuarios (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  nome text not null,
  email text unique,           -- só dono
  whatsapp text,                -- barbeiro/cliente (único DENTRO da barbearia, ver índice abaixo)
  senha_hash text not null,
  papel text not null check (papel in ('dono','barbeiro','cliente')),
  status text not null default 'aprovado' check (status in ('pendente','aprovado')),
  email_confirmado boolean not null default false,
  ativo boolean not null default true,
  ultimo_acesso timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint email_so_dono check (papel != 'dono' or email is not null),
  constraint whatsapp_nao_dono check (papel = 'dono' or whatsapp is not null)
);
create unique index usuarios_whatsapp_unico on usuarios (whatsapp) where whatsapp is not null;
create index usuarios_barbearia_whatsapp on usuarios (barbearia_id, whatsapp);

-- ========== DISPOSITIVOS (sessão / refresh token) ==========
create table dispositivos (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  token_hash text not null,
  apelido text,
  ip_ultimo text,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);

-- ========== PROFISSIONAIS ==========
create table profissionais (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  nome text not null,
  foto_url text,
  especialidade text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table horarios_trabalho (
  id uuid primary key default uuid_generate_v4(),
  profissional_id uuid not null references profissionais(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  inicio time not null,
  fim time not null,
  intervalo_inicio time,
  intervalo_fim time
);

create table bloqueios_agenda (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  profissional_id uuid not null references profissionais(id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text,
  criado_por uuid not null references usuarios(id),
  criado_em timestamptz not null default now()
);

-- ========== SERVIÇOS ==========
create table servicos (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  nome text not null,
  preco numeric(10,2) not null check (preco >= 0),
  duracao_min int not null check (duracao_min > 0),
  cor text not null default '#E8B04B',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ========== AGENDAMENTOS ==========
create table agendamentos (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  cliente_id uuid not null references usuarios(id),
  profissional_id uuid not null references profissionais(id),
  servico_id uuid not null references servicos(id),
  inicio timestamptz not null,
  fim timestamptz not null,
  status text not null default 'agendado'
    check (status in ('agendado','confirmado','concluido','cancelado','faltou')),
  valor_servico numeric(10,2) not null,     -- snapshot do preço no momento
  cancelado_por text check (cancelado_por in ('dono','barbeiro','cliente')),
  observacao text,
  criado_por uuid not null references usuarios(id),
  notificacao_barbeiro_enviada boolean not null default false,
  lembrete_cliente_enviado boolean not null default false,
  notificacao_via text check (notificacao_via in ('api','manual')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index agendamentos_barbearia_inicio on agendamentos (barbearia_id, inicio);
create index agendamentos_profissional_inicio on agendamentos (profissional_id, inicio);

-- impede dois agendamentos no mesmo horário com o mesmo barbeiro (exclusion constraint)
create extension if not exists btree_gist;
alter table agendamentos add constraint sem_conflito_horario
  exclude using gist (
    profissional_id with =,
    tstzrange(inicio, fim) with &&
  ) where (status not in ('cancelado','faltou'));

-- ========== NOTIFICAÇÕES WHATSAPP ==========
create table notificacoes_wa (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  agendamento_id uuid references agendamentos(id) on delete cascade,
  destinatario_id uuid not null references usuarios(id),
  tipo text not null check (tipo in ('aviso_barbeiro','lembrete_cliente')),
  template text not null,
  status text not null default 'pendente' check (status in ('enviada','falhou','pendente')),
  custo numeric(10,4),
  enviada_em timestamptz,
  criado_em timestamptz not null default now()
);

-- ========== FINANCEIRO ==========
create table categorias_fin (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('entrada','saida')),
  cor text not null default '#A1A1A8',
  padrao boolean not null default false
);

create table despesas_fixas (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  descricao text not null,
  valor numeric(10,2) not null,
  dia_vencimento int not null check (dia_vencimento between 1 and 28),
  categoria_id uuid references categorias_fin(id),
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table movimentacoes (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  categoria_id uuid references categorias_fin(id),
  descricao text not null,
  valor numeric(10,2) not null check (valor > 0),
  data date not null default current_date,
  profissional_id uuid references profissionais(id),
  agendamento_id uuid references agendamentos(id),   -- só quando origem = automatica
  origem text not null default 'manual' check (origem in ('automatica','manual')),
  recorrente_id uuid references despesas_fixas(id),
  criado_por uuid not null references usuarios(id),
  criado_em timestamptz not null default now()
);
create index movimentacoes_barbearia_data on movimentacoes (barbearia_id, data);

-- ========== AUDITORIA ==========
create table auditoria (
  id uuid primary key default uuid_generate_v4(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  usuario_id uuid not null references usuarios(id),
  acao text not null,
  tabela text not null,
  registro_id uuid,
  valor_antes jsonb,
  valor_depois jsonb,
  ip text,
  criado_em timestamptz not null default now()
);

-- ========== FUNÇÃO: papel do usuário logado (usada em toda policy) ==========
create or replace function auth_papel() returns text as $$
  select papel from usuarios where id = auth.uid()::uuid
$$ language sql stable security definer;

create or replace function auth_barbearia_id() returns uuid as $$
  select barbearia_id from usuarios where id = auth.uid()::uuid
$$ language sql stable security definer;

-- ========== RLS — ativar em TODAS as tabelas ==========
alter table barbearias enable row level security;
alter table usuarios enable row level security;
alter table dispositivos enable row level security;
alter table profissionais enable row level security;
alter table horarios_trabalho enable row level security;
alter table bloqueios_agenda enable row level security;
alter table servicos enable row level security;
alter table agendamentos enable row level security;
alter table notificacoes_wa enable row level security;
alter table categorias_fin enable row level security;
alter table despesas_fixas enable row level security;
alter table movimentacoes enable row level security;
alter table auditoria enable row level security;

-- Regra base: ninguém vê dado de outra barbearia, nunca.
create policy isolamento_barbearias on barbearias
  for select using (id = auth_barbearia_id());

create policy isolamento_usuarios on usuarios
  for select using (barbearia_id = auth_barbearia_id());

create policy isolamento_servicos on servicos
  for select using (barbearia_id = auth_barbearia_id());
create policy escrita_servicos_so_dono on servicos
  for insert with check (barbearia_id = auth_barbearia_id() and auth_papel() = 'dono');
create policy update_servicos_so_dono on servicos
  for update using (barbearia_id = auth_barbearia_id() and auth_papel() = 'dono');

create policy isolamento_agendamentos on agendamentos
  for select using (barbearia_id = auth_barbearia_id());
-- barbeiro só cria/edita os próprios; dono edita qualquer um da barbearia
create policy escrita_agendamentos on agendamentos
  for insert with check (
    barbearia_id = auth_barbearia_id()
    and (auth_papel() in ('dono','cliente')
         or profissional_id in (select id from profissionais where usuario_id = auth.uid()::uuid))
  );
create policy update_agendamentos on agendamentos
  for update using (
    barbearia_id = auth_barbearia_id()
    and (auth_papel() = 'dono'
         or (auth_papel() = 'barbeiro' and profissional_id in (select id from profissionais where usuario_id = auth.uid()::uuid))
         or (auth_papel() = 'cliente' and cliente_id = auth.uid()::uuid))
  );

-- financeiro: só dono lê e escreve
create policy financeiro_so_dono_select on movimentacoes
  for select using (barbearia_id = auth_barbearia_id() and auth_papel() = 'dono');
create policy financeiro_so_dono_insert on movimentacoes
  for insert with check (barbearia_id = auth_barbearia_id() and auth_papel() = 'dono');
create policy financeiro_so_dono_update on movimentacoes
  for update using (barbearia_id = auth_barbearia_id() and auth_papel() = 'dono');

create policy despesas_so_dono on despesas_fixas
  for all using (barbearia_id = auth_barbearia_id() and auth_papel() = 'dono');

create policy categorias_so_dono on categorias_fin
  for all using (barbearia_id = auth_barbearia_id() and auth_papel() = 'dono');

create policy auditoria_so_dono on auditoria
  for select using (barbearia_id = auth_barbearia_id() and auth_papel() = 'dono');

-- (repita o padrão "isolamento por barbearia_id + regra de papel" pras tabelas
--  restantes: profissionais, horarios_trabalho, bloqueios_agenda, notificacoes_wa —
--  todas seguem select isolado por barbearia_id, escrita restrita por papel
--  conforme a tabela de permissões da seção 6.1.1 do documento de produto)
```

**Nunca esqueça:** toda tabela nova que você criar depois desse ponto de partida
nasce com `alter table ... enable row level security;` **no mesmo commit** que a
cria. Essa é a regra de ouro do projeto (seção 8.2 do documento de produto).

---

## 4. Estrutura de pastas

```
/app
  /(publico)
    /[slug]                 → página pública de agendamento da barbearia
      page.tsx
    /entrar
      page.tsx               → login unificado (detecta papel por email/whatsapp)
    /cadastro-barbearia
      page.tsx
  /(painel)
    /painel
      /hoje/page.tsx
      /agenda/page.tsx
      /financeiro/page.tsx
      /mais
        /relatorios/page.tsx
        /clientes/page.tsx
        /barbeiros/page.tsx
        /servicos/page.tsx
        /configuracoes/page.tsx
        /plano/page.tsx
  /admin                     → domínio separado (admin.regua.app), só você
    /page.tsx
  /api
    /webhooks
      /asaas/route.ts
      /whatsapp/route.ts
    /cron
      /lembrete-cliente/route.ts   → job de 15 em 15 min (seção 8.1)
/components
  /ui                        → shadcn, com os tokens sobrescritos
  /agenda
  /financeiro
  /dashboard
/lib
  /supabase                  → clients (server + browser)
  /auth                      → hash de senha, bloqueio progressivo, sessão
  /whatsapp                  → cliente da Cloud API + fallback wa.me
  /permissoes.ts             → a função central de checagem (seção 6.1.1)
/supabase
  /migrations                → uma migration por tabela/mudança, nunca editar uma já aplicada
```

---

## 5. Escopo dia a dia (não pule a ordem)

### Dia 1 — Scaffold + Fundação
- Criar o projeto Next.js do zero (App Router, TypeScript, Tailwind, shadcn/ui) — **não copiar arquivos do Concept Barber**, só consultar como referência se travar em algo
- Criar o projeto Supabase novo (ou schema novo dentro do mesmo projeto, se preferir reaproveitar só a infraestrutura de conta) e rodar a migration da seção 3
- Rebrand visual (tokens da seção 2 deste prompt)
- Configurar deploy na Vercel com preview automático a cada push
- Teste de aceite: projeto sobe local e em preview, com os tokens de design aplicados e a migration rodada sem erro.

### Dia 2 — Conta e Cadastros
- Login: dono por e-mail+senha (confirmação por link de e-mail), barbeiro/cliente por WhatsApp+senha
- Cadastro da barbearia (com Instagram), convite de barbeiro (link + botão WhatsApp), aprovação pendente
- Cadastro de serviços
- **Submeter verificação de negócio + template na Meta hoje** (paralelo, não bloqueia)
- Teste de aceite: crio a barbearia, aprovo um barbeiro, cadastro um serviço. Usuário de outra barbearia não lê meus dados (testar com script de RLS).

### Dia 3 — Agenda + conta do cliente
- Grade diária/semanal por barbeiro
- Criar/cancelar agendamento, mudar status (agendado→confirmado→concluído/faltou)
- Bloqueio de horário do barbeiro (próprio horário de trabalho + bloqueio pontual) — avisar se colidir com agendamento existente
- Cadastro de cliente (nome/WhatsApp/senha) + página pública de agendamento
- Tela "Meus agendamentos" do cliente, com cancelamento até 1h antes
- Teste de aceite: um amigo cria conta e agenda pelo celular sem ajuda; um barbeiro bloqueia horário e ele some da página pública.

### Dia 4 — Financeiro + Dashboards
- Entrada automática ao marcar "concluído" (valor = `valor_servico`, remove se o status voltar)
- Saídas manuais, categorias, despesas fixas recorrentes (cron mensal)
- Extrato por período e barbeiro
- Painel do gestor: 3 níveis (Hoje / Mês / Insights) — seção 6.1 módulo 5 do documento de produto
- Tela "Meu desempenho" do barbeiro (atendimentos concluídos + valor gerado, hoje/semana/mês)
- Teste de aceite: marco um corte como concluído e a entrada aparece sozinha, no valor certo.

### Dia 5 — WhatsApp + Painel Admin + Comercial
- Notificação automática ao barbeiro (evento) + lembrete automático ao cliente 2h antes (cron)
- Botão ligar/mensagem (`tel:`/`wa.me`) usando o WhatsApp cadastrado
- Log de auditoria
- Painel admin (`admin.regua.app`): lista de barbearias, status, métricas gerais
- Landing page (usar o HTML já aprovado como referência visual) + cobrança Asaas + trial de 14 dias
- Teste de aceite: agendo um teste pra daqui 2h10 e o lembrete chega sozinho.

### Dia 6 — Testes e publicação
- Teste ponta a ponta: criar conta → cadastrar → agendar → lançar financeiro → ver dashboard
- Backup configurado, correção de bugs críticos, deploy final
- Teste de aceite: primeira barbearia real usa o sistema sozinha, do zero, sem ninguém do lado.

**Depois do sprint (fora da contagem de 6 dias):** beta de 2 semanas com 3 barbearias reais, hardening antes do primeiro cliente pagante.

---

## 6. Permissões — a função central (não copiar regra tela por tela)

Implemente uma função única (`lib/permissoes.ts`) chamada em toda ação, não
duplicada em cada componente. A tabela completa está na seção 6.1.1 do
documento de produto — resumo:

- **Só o dono**: preço/catálogo de serviços, dados da barbearia, aprovar/remover
  barbeiro, financeiro completo, relatórios da barbearia, plano/cobrança
- **Barbeiro**: edita o próprio horário e bloqueios, cria/cancela/muda status só
  dos próprios agendamentos, vê só "Meu desempenho"
- **Cliente**: cria/cancela só o próprio agendamento (até 1h antes), vê só
  "Meus agendamentos"

---

## 7. Segurança — checklist a aplicar desde o primeiro commit

- Senha: `argon2id` + pepper (variável de ambiente, nunca no banco)
- Bloqueio progressivo: 3 erros → 30s, 5 erros → 5min, 8 erros → bloqueio até recuperação
- Bloquear senhas óbvias (0000, 1234, sequências) na hora do cadastro
- Reautenticação (senha de novo) em: apagar movimentação, exportar relatório completo, remover barbeiro
- Erro de login genérico: nunca revelar se a conta existe
- Rate limit em `/entrar`, `/[slug]` (agendamento público), `/recuperar-senha`
- Headers: CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- `service_role` do Supabase nunca no client
- Upload de foto: validar tipo real do arquivo, limitar tamanho
- Backup diário + teste de restauração mensal (calendário, não só "algum dia")

---

## 8. O que NÃO construir agora (v1.1, só depois do primeiro cliente pagante)

Clube do Corte, WhatsApp automático completo (aniversário, promoção), fidelidade
digital, catálogo de cortes com foto, relatório mensal em PDF automático,
indicação premiada, multi-unidade consolidada, marca branca/revenda.

Se bater vontade de construir algo dessa lista antes da hora: não. É a
armadilha nº 1 de dev solo sob prazo apertado.
