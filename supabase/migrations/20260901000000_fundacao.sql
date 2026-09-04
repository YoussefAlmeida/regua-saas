-- ================================================================
-- RÉGUA — Migration 001: Fundação
-- Sprint Dia 1 · 2026-09-01
--
-- Rodar UMA única vez no projeto Supabase novo.
-- Via SQL Editor no dashboard ou: supabase db push
--
-- Regra de ouro: toda tabela nova criada depois desse ponto
-- nasce com ALTER TABLE ... ENABLE ROW LEVEL SECURITY no mesmo
-- commit (seção 8.2 do documento de produto).
-- ================================================================

-- ── Extensões ──────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

-- ================================================================
-- TABELAS
-- ================================================================

-- ── Barbearias ──────────────────────────────────────────────────
create table barbearias (
  id                      uuid        primary key default uuid_generate_v4(),
  nome                    text        not null,
  slug                    text        unique not null,
  telefone                text,
  endereco                text,
  instagram               text,
  logo_url                text,
  fuso                    text        not null default 'America/Bahia',
  horario_funcionamento   jsonb       not null default '{}',
  dias_fechados           jsonb       not null default '[]',
  plano                   text        not null default 'trial'
    check (plano in ('trial','cadeira','barbearia','rede')),
  status                  text        not null default 'trial'
    check (status in ('trial','ativo','leitura','cancelado')),
  trial_fim               timestamptz not null default (now() + interval '14 days'),
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now()
);

-- ── Usuários (dono, barbeiro, cliente — auth unificado) ─────────
create table usuarios (
  id                  uuid        primary key default uuid_generate_v4(),
  barbearia_id        uuid        not null references barbearias(id) on delete cascade,
  nome                text        not null,
  email               text        unique,           -- só dono
  whatsapp            text,                          -- barbeiro / cliente
  senha_hash          text        not null,
  papel               text        not null check (papel in ('dono','barbeiro','cliente')),
  status              text        not null default 'aprovado'
    check (status in ('pendente','aprovado')),
  email_confirmado    boolean     not null default false,
  ativo               boolean     not null default true,
  ultimo_acesso       timestamptz,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  -- dono obrigatoriamente tem e-mail; barbeiro/cliente obrigatoriamente têm WhatsApp
  constraint email_so_dono         check (papel != 'dono'     or email    is not null),
  constraint whatsapp_nao_dono     check (papel = 'dono'      or whatsapp is not null)
);
-- WhatsApp único no sistema (não por barbearia — decisão de MVP para simplificar auth)
create unique index usuarios_whatsapp_unico on usuarios (whatsapp) where whatsapp is not null;
create index        usuarios_barbearia_whatsapp on usuarios (barbearia_id, whatsapp);

-- ── Dispositivos / sessões ──────────────────────────────────────
create table dispositivos (
  id          uuid        primary key default uuid_generate_v4(),
  usuario_id  uuid        not null references usuarios(id) on delete cascade,
  token_hash  text        not null,
  apelido     text,
  ip_ultimo   text,
  expira_em   timestamptz not null,
  criado_em   timestamptz not null default now()
);

-- ── Profissionais ────────────────────────────────────────────────
create table profissionais (
  id              uuid    primary key default uuid_generate_v4(),
  barbearia_id    uuid    not null references barbearias(id) on delete cascade,
  usuario_id      uuid    not null references usuarios(id)   on delete cascade,
  nome            text    not null,
  foto_url        text,
  especialidade   text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

-- ── Horários de trabalho do profissional ─────────────────────────
create table horarios_trabalho (
  id                  uuid    primary key default uuid_generate_v4(),
  profissional_id     uuid    not null references profissionais(id) on delete cascade,
  dia_semana          int     not null check (dia_semana between 0 and 6), -- 0=dom, 6=sáb
  inicio              time    not null,
  fim                 time    not null,
  intervalo_inicio    time,
  intervalo_fim       time
);

-- ── Bloqueios pontuais de agenda ─────────────────────────────────
create table bloqueios_agenda (
  id              uuid        primary key default uuid_generate_v4(),
  barbearia_id    uuid        not null references barbearias(id)    on delete cascade,
  profissional_id uuid        not null references profissionais(id) on delete cascade,
  inicio          timestamptz not null,
  fim             timestamptz not null,
  motivo          text,
  criado_por      uuid        not null references usuarios(id),
  criado_em       timestamptz not null default now()
);

-- ── Serviços ─────────────────────────────────────────────────────
create table servicos (
  id              uuid           primary key default uuid_generate_v4(),
  barbearia_id    uuid           not null references barbearias(id) on delete cascade,
  nome            text           not null,
  preco           numeric(10,2)  not null check (preco >= 0),
  duracao_min     int            not null check (duracao_min > 0),
  cor             text           not null default '#E8B04B',
  ativo           boolean        not null default true,
  criado_em       timestamptz    not null default now()
);

-- ── Agendamentos ─────────────────────────────────────────────────
create table agendamentos (
  id                              uuid          primary key default uuid_generate_v4(),
  barbearia_id                    uuid          not null references barbearias(id)    on delete cascade,
  cliente_id                      uuid          not null references usuarios(id),
  profissional_id                 uuid          not null references profissionais(id),
  servico_id                      uuid          not null references servicos(id),
  inicio                          timestamptz   not null,
  fim                             timestamptz   not null,
  status                          text          not null default 'agendado'
    check (status in ('agendado','confirmado','concluido','cancelado','faltou')),
  valor_servico                   numeric(10,2) not null,  -- snapshot do preço no momento — não muda
  cancelado_por                   text          check (cancelado_por in ('dono','barbeiro','cliente')),
  observacao                      text,
  criado_por                      uuid          not null references usuarios(id),
  notificacao_barbeiro_enviada    boolean       not null default false,
  lembrete_cliente_enviado        boolean       not null default false,
  notificacao_via                 text          check (notificacao_via in ('api','manual')),
  criado_em                       timestamptz   not null default now(),
  atualizado_em                   timestamptz   not null default now()
);
create index agendamentos_barbearia_inicio    on agendamentos (barbearia_id, inicio);
create index agendamentos_profissional_inicio on agendamentos (profissional_id, inicio);

-- Impede dois agendamentos no mesmo horário com o mesmo barbeiro
alter table agendamentos add constraint sem_conflito_horario
  exclude using gist (
    profissional_id with =,
    tstzrange(inicio, fim) with &&
  ) where (status not in ('cancelado','faltou'));

-- ── Notificações WhatsApp ────────────────────────────────────────
create table notificacoes_wa (
  id              uuid           primary key default uuid_generate_v4(),
  barbearia_id    uuid           not null references barbearias(id)    on delete cascade,
  agendamento_id  uuid           references agendamentos(id)           on delete cascade,
  destinatario_id uuid           not null references usuarios(id),
  tipo            text           not null check (tipo in ('aviso_barbeiro','lembrete_cliente')),
  template        text           not null,
  status          text           not null default 'pendente'
    check (status in ('enviada','falhou','pendente')),
  custo           numeric(10,4),
  enviada_em      timestamptz,
  criado_em       timestamptz    not null default now()
);

-- ── Financeiro ───────────────────────────────────────────────────
create table categorias_fin (
  id              uuid    primary key default uuid_generate_v4(),
  barbearia_id    uuid    not null references barbearias(id) on delete cascade,
  nome            text    not null,
  tipo            text    not null check (tipo in ('entrada','saida')),
  cor             text    not null default '#A1A1A8',
  padrao          boolean not null default false
);

create table despesas_fixas (
  id              uuid          primary key default uuid_generate_v4(),
  barbearia_id    uuid          not null references barbearias(id)  on delete cascade,
  descricao       text          not null,
  valor           numeric(10,2) not null,
  dia_vencimento  int           not null check (dia_vencimento between 1 and 28),
  categoria_id    uuid          references categorias_fin(id),
  ativa           boolean       not null default true,
  criado_em       timestamptz   not null default now()
);

create table movimentacoes (
  id              uuid          primary key default uuid_generate_v4(),
  barbearia_id    uuid          not null references barbearias(id)   on delete cascade,
  tipo            text          not null check (tipo in ('entrada','saida')),
  categoria_id    uuid          references categorias_fin(id),
  descricao       text          not null,
  valor           numeric(10,2) not null check (valor > 0),
  data            date          not null default current_date,
  profissional_id uuid          references profissionais(id),
  agendamento_id  uuid          references agendamentos(id),     -- só quando origem = automatica
  origem          text          not null default 'manual'
    check (origem in ('automatica','manual')),
  recorrente_id   uuid          references despesas_fixas(id),
  criado_por      uuid          not null references usuarios(id),
  criado_em       timestamptz   not null default now()
);
create index movimentacoes_barbearia_data on movimentacoes (barbearia_id, data);

-- ── Auditoria ────────────────────────────────────────────────────
create table auditoria (
  id              uuid        primary key default uuid_generate_v4(),
  barbearia_id    uuid        not null references barbearias(id) on delete cascade,
  usuario_id      uuid        not null references usuarios(id),
  acao            text        not null,
  tabela          text        not null,
  registro_id     uuid,
  valor_antes     jsonb,
  valor_depois    jsonb,
  ip              text,
  criado_em       timestamptz not null default now()
);

-- ================================================================
-- FUNÇÕES HELPER — security definer bypass RLS ao ler usuarios
-- ================================================================

create or replace function auth_papel() returns text as $$
  select papel from usuarios where id = auth.uid()
$$ language sql stable security definer;

create or replace function auth_barbearia_id() returns uuid as $$
  select barbearia_id from usuarios where id = auth.uid()
$$ language sql stable security definer;

-- ================================================================
-- RLS — ATIVAR EM TODAS AS TABELAS
-- (regra de ouro: nenhuma tabela nasce sem política)
-- ================================================================

alter table barbearias         enable row level security;
alter table usuarios           enable row level security;
alter table dispositivos       enable row level security;
alter table profissionais      enable row level security;
alter table horarios_trabalho  enable row level security;
alter table bloqueios_agenda   enable row level security;
alter table servicos           enable row level security;
alter table agendamentos       enable row level security;
alter table notificacoes_wa    enable row level security;
alter table categorias_fin     enable row level security;
alter table despesas_fixas     enable row level security;
alter table movimentacoes      enable row level security;
alter table auditoria          enable row level security;

-- ================================================================
-- POLÍTICAS RLS
-- Padrão: isolamento por barbearia_id + restrição por papel
-- ================================================================

-- ── Barbearias ──────────────────────────────────────────────────
create policy barbearias_select on barbearias
  for select using (id = auth_barbearia_id());

-- ── Usuários ────────────────────────────────────────────────────
create policy usuarios_select on usuarios
  for select using (barbearia_id = auth_barbearia_id());

-- dono pode criar usuários (convite de barbeiro, cadastro de cliente pelo painel)
create policy usuarios_insert on usuarios
  for insert with check (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

-- usuário edita o próprio perfil; dono edita qualquer um da barbearia
create policy usuarios_update on usuarios
  for update using (
    barbearia_id = auth_barbearia_id()
    and (auth_papel() = 'dono' or id = auth.uid())
  );

-- só dono desativa/remove usuário
create policy usuarios_delete on usuarios
  for delete using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

-- ── Dispositivos (sessões) ───────────────────────────────────────
create policy dispositivos_select on dispositivos
  for select using (usuario_id = auth.uid());

create policy dispositivos_insert on dispositivos
  for insert with check (usuario_id = auth.uid());

create policy dispositivos_delete on dispositivos
  for delete using (usuario_id = auth.uid());

-- ── Profissionais ────────────────────────────────────────────────
create policy profissionais_select on profissionais
  for select using (barbearia_id = auth_barbearia_id());

create policy profissionais_insert on profissionais
  for insert with check (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

-- dono edita qualquer profissional; barbeiro edita o próprio (foto, especialidade)
create policy profissionais_update on profissionais
  for update using (
    barbearia_id = auth_barbearia_id()
    and (auth_papel() = 'dono' or usuario_id = auth.uid())
  );

create policy profissionais_delete on profissionais
  for delete using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

-- ── Horários de trabalho ─────────────────────────────────────────
-- helper para encontrar profissionais do barbeiro logado (evita repetição)

create policy horarios_trabalho_select on horarios_trabalho
  for select using (
    profissional_id in (
      select id from profissionais where barbearia_id = auth_barbearia_id()
    )
  );

create policy horarios_trabalho_insert on horarios_trabalho
  for insert with check (
    profissional_id in (
      select id from profissionais
      where barbearia_id = auth_barbearia_id()
      and (auth_papel() = 'dono' or usuario_id = auth.uid())
    )
  );

create policy horarios_trabalho_update on horarios_trabalho
  for update using (
    profissional_id in (
      select id from profissionais
      where barbearia_id = auth_barbearia_id()
      and (auth_papel() = 'dono' or usuario_id = auth.uid())
    )
  );

create policy horarios_trabalho_delete on horarios_trabalho
  for delete using (
    profissional_id in (
      select id from profissionais
      where barbearia_id = auth_barbearia_id()
      and (auth_papel() = 'dono' or usuario_id = auth.uid())
    )
  );

-- ── Bloqueios de agenda ──────────────────────────────────────────
create policy bloqueios_select on bloqueios_agenda
  for select using (barbearia_id = auth_barbearia_id());

create policy bloqueios_insert on bloqueios_agenda
  for insert with check (
    barbearia_id = auth_barbearia_id()
    and (
      auth_papel() = 'dono'
      or profissional_id in (
        select id from profissionais where usuario_id = auth.uid()
      )
    )
  );

create policy bloqueios_update on bloqueios_agenda
  for update using (
    barbearia_id = auth_barbearia_id()
    and (
      auth_papel() = 'dono'
      or profissional_id in (
        select id from profissionais where usuario_id = auth.uid()
      )
    )
  );

create policy bloqueios_delete on bloqueios_agenda
  for delete using (
    barbearia_id = auth_barbearia_id()
    and (
      auth_papel() = 'dono'
      or profissional_id in (
        select id from profissionais where usuario_id = auth.uid()
      )
    )
  );

-- ── Serviços ─────────────────────────────────────────────────────
create policy servicos_select on servicos
  for select using (barbearia_id = auth_barbearia_id());

create policy servicos_insert on servicos
  for insert with check (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

create policy servicos_update on servicos
  for update using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

create policy servicos_delete on servicos
  for delete using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

-- ── Agendamentos ─────────────────────────────────────────────────
create policy agendamentos_select on agendamentos
  for select using (barbearia_id = auth_barbearia_id());

-- dono ou cliente cria para qualquer barbeiro;
-- barbeiro cria apenas na própria agenda
create policy agendamentos_insert on agendamentos
  for insert with check (
    barbearia_id = auth_barbearia_id()
    and (
      auth_papel() in ('dono', 'cliente')
      or profissional_id in (
        select id from profissionais where usuario_id = auth.uid()
      )
    )
  );

-- dono: qualquer; barbeiro: só os próprios; cliente: só cancelar o próprio
create policy agendamentos_update on agendamentos
  for update using (
    barbearia_id = auth_barbearia_id()
    and (
      auth_papel() = 'dono'
      or (
        auth_papel() = 'barbeiro'
        and profissional_id in (
          select id from profissionais where usuario_id = auth.uid()
        )
      )
      or (
        auth_papel() = 'cliente'
        and cliente_id = auth.uid()
      )
    )
  );

-- ── Notificações WhatsApp ────────────────────────────────────────
-- Dono lê; service_role escreve (bypassa RLS automaticamente)
create policy notificacoes_wa_select on notificacoes_wa
  for select using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

-- ── Financeiro — só dono ─────────────────────────────────────────
create policy categorias_fin_all on categorias_fin
  for all using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

create policy despesas_fixas_all on despesas_fixas
  for all using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

create policy movimentacoes_select on movimentacoes
  for select using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

create policy movimentacoes_insert on movimentacoes
  for insert with check (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

create policy movimentacoes_update on movimentacoes
  for update using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

create policy movimentacoes_delete on movimentacoes
  for delete using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

-- ── Auditoria — só dono lê, ninguém escreve diretamente ──────────
create policy auditoria_select on auditoria
  for select using (
    barbearia_id = auth_barbearia_id() and auth_papel() = 'dono'
  );

-- ================================================================
-- CATEGORIAS PADRÃO (inseridas via service_role após migration)
-- ================================================================
-- Execute separadamente depois de rodar esta migration:
--
-- insert into categorias_fin (barbearia_id, nome, tipo, cor, padrao)
-- values
--   (<id>, 'Serviços',          'entrada', '#4FB477', true),
--   (<id>, 'Outras entradas',   'entrada', '#6BA3D6', true),
--   (<id>, 'Aluguel',           'saida',   '#E2564D', true),
--   (<id>, 'Energia / Água',    'saida',   '#E2564D', true),
--   (<id>, 'Produtos',          'saida',   '#E8B04B', true),
--   (<id>, 'Pró-labore (dono)', 'saida',   '#A1A1A8', true),
--   (<id>, 'Marketing',         'saida',   '#A1A1A8', true),
--   (<id>, 'Outros',            'saida',   '#A1A1A8', true);
