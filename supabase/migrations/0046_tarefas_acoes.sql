-- =============================================================================
-- 0046_tarefas_acoes.sql
--
-- Ações do quadro "Tarefas por equipe" (pedido da Camila, Drop/Kraamzorg):
-- criar tarefa, passar entre A fazer e Em andamento, atribuir responsável e
-- concluir. Até aqui só existiam api.tarefas_por_equipe() (leitura) e a
-- conclusão por UPDATE direto em public.tarefa, que a política "alterar" de
-- 0007 deixa só para o responsável, o papel responsável e a diretoria:
-- a coordenação era barrada em silêncio. As quatro funções abaixo fazem a
-- escrita dentro do banco, com papel e log, e devolvem o resultado.
--
-- Não mexe em RLS, não cria tabela, coluna nem enum: usa public.tarefa e
-- status_tarefa ('aberta','em_andamento','concluida','cancelada') como estão.
--
-- Quem pode (privado.autorizar, PRD 13):
--   tarefa_criar           os seis papéis; AAL2 só para quem já exige MFA.
--                          Coordenação e diretoria criam para qualquer pessoa
--                          ou equipe; os demais só para si mesmos.
--   tarefa_mudar_estado    quem pode mexer na tarefa (abaixo).
--   tarefa_atribuir        coordenação e diretoria, AAL2.
--   tarefa_concluir        quem pode mexer na tarefa (abaixo).
-- "Pode mexer": o responsável, o papel responsável (tarefa sem pessoa), a
-- coordenação e a diretoria. Recusa de negócio: P0001 "tarefa:<código>".
-- =============================================================================

create function privado.tarefa_recusar(codigo text, detalhe text default null) returns void
  language plpgsql
  volatile
  set search_path = ''
  as $$
begin
  raise exception 'tarefa:% %', tarefa_recusar.codigo, coalesce(tarefa_recusar.detalhe, '')
    using errcode = 'P0001';
end;
$$;
comment on function privado.tarefa_recusar(text, text) is '[0046] Recusa de negócio das ações de tarefa: erro P0001 com a mensagem "tarefa:<código> <detalhe>", que a tela troca por uma frase. Sem dado pessoal no detalhe. Sem grant.';

create function privado.tarefa_pode_mexer(responsavel_id uuid, papel_responsavel public.papel_usuario) returns boolean
  language sql
  stable
  security definer
  set search_path = ''
  as $$
  select tarefa_pode_mexer.responsavel_id = auth.uid()
      or (tarefa_pode_mexer.responsavel_id is null
          and tarefa_pode_mexer.papel_responsavel is not null
          and privado.tem_papel(tarefa_pode_mexer.papel_responsavel))
      or privado.tem_papel('coordenacao')
      or privado.tem_papel('diretoria')
$$;
comment on function privado.tarefa_pode_mexer(uuid, public.papel_usuario) is '[0046] Quem pode mudar uma tarefa: o responsável, o papel responsável quando não há pessoa, a coordenação e a diretoria (a RLS de 0007 não inclui a coordenação). Sem grant.';

-- --- api.tarefa_criar --------------------------------------------------------

create function api.tarefa_criar(
  titulo            text,
  responsavel_id    uuid default null,
  papel_responsavel public.papel_usuario default null,
  familia_id        uuid default null,
  vence_em          timestamptz default null,
  prioridade        public.prioridade default 'normal'
) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
  as $$
#variable_conflict use_column
declare
  v_titulo  text := pg_catalog.btrim(tarefa_criar.titulo);
  v_gestao  boolean;
  v_resp    uuid := tarefa_criar.responsavel_id;
  v_papel   public.papel_usuario := tarefa_criar.papel_responsavel;
  v_id      uuid;
begin
  perform privado.autorizar(
    array['comercial', 'coordenacao', 'diretoria', 'enfermeira', 'financeiro', 'marketing']::public.papel_usuario[], false);
  v_gestao := privado.tem_papel('coordenacao') or privado.tem_papel('diretoria');

  if v_titulo is null or pg_catalog.char_length(v_titulo) not between 3 and 120 then
    perform privado.tarefa_recusar('titulo_invalido');
  end if;
  if tarefa_criar.prioridade is null then
    perform privado.tarefa_recusar('prioridade_invalida');
  end if;

  if not v_gestao then
    -- Fora da gestão, a tarefa é da própria pessoa.
    if (v_resp is not null and v_resp <> auth.uid()) or (v_papel is not null and not privado.tem_papel(v_papel)) then
      perform privado.tarefa_recusar('so_para_voce');
    end if;
    v_resp := auth.uid();
  end if;

  if v_resp is not null
     and not exists (select 1 from public.perfil p where p.id = v_resp and p.ativo) then
    perform privado.tarefa_recusar('responsavel_invalido');
  end if;

  if tarefa_criar.familia_id is not null then
    if not exists (select 1 from public.familia f where f.id = tarefa_criar.familia_id) then
      perform privado.tarefa_recusar('familia_invalida');
    end if;
    if not (v_gestao or privado.tem_papel('comercial'))
       and tarefa_criar.familia_id not in (select privado.familias_atribuidas()) then
      perform privado.tarefa_recusar('familia_fora_do_alcance');
    end if;
  end if;

  insert into public.tarefa (tipo, familia_id, responsavel_id, papel_responsavel, prioridade, titulo, payload, vence_em, criado_por)
  values ('outro', tarefa_criar.familia_id, v_resp, v_papel, tarefa_criar.prioridade, v_titulo,
          pg_catalog.jsonb_build_object('acao', 'tarefa_manual'), tarefa_criar.vence_em, auth.uid())
  returning id into v_id;

  perform privado.relacao_log('tarefa_criar', 'tarefa', v_id::text, null,
    pg_catalog.jsonb_build_object('status', 'aberta', 'prioridade', tarefa_criar.prioridade, 'com_responsavel', v_resp is not null));
  return pg_catalog.jsonb_build_object('ok', true, 'tarefa_id', v_id);
end;
$$;
comment on function api.tarefa_criar(text, uuid, public.papel_usuario, uuid, timestamptz, public.prioridade) is '[0046] Cria tarefa manual (tipo outro, status aberta). Coordenação e diretoria criam para qualquer pessoa ou equipe; os demais papéis só para si. Família opcional (enfermeira só nas atribuídas). Recusas: tarefa:titulo_invalido, so_para_voce, responsavel_invalido, familia_invalida, familia_fora_do_alcance.';

-- --- api.tarefa_mudar_estado -------------------------------------------------

create function api.tarefa_mudar_estado(tarefa_id uuid, status public.status_tarefa) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
  as $$
#variable_conflict use_column
declare
  v_t public.tarefa;
begin
  perform privado.autorizar(
    array['comercial', 'coordenacao', 'diretoria', 'enfermeira', 'financeiro', 'marketing']::public.papel_usuario[], false);
  if tarefa_mudar_estado.status is null or tarefa_mudar_estado.status not in ('aberta', 'em_andamento') then
    perform privado.tarefa_recusar('estado_invalido');
  end if;

  select * into v_t from public.tarefa t where t.id = tarefa_mudar_estado.tarefa_id for update;
  if not found then
    perform privado.tarefa_recusar('nao_encontrada');
  end if;
  if not privado.tarefa_pode_mexer(v_t.responsavel_id, v_t.papel_responsavel) then
    perform privado.tarefa_recusar('sem_permissao');
  end if;
  if v_t.status not in ('aberta', 'em_andamento') then
    perform privado.tarefa_recusar('tarefa_encerrada');
  end if;

  if v_t.status <> tarefa_mudar_estado.status then
    update public.tarefa t set status = tarefa_mudar_estado.status where t.id = v_t.id;
    perform privado.relacao_log('tarefa_mudar_estado', 'tarefa', v_t.id::text,
      pg_catalog.jsonb_build_object('status', v_t.status),
      pg_catalog.jsonb_build_object('status', tarefa_mudar_estado.status));
  end if;
  return pg_catalog.jsonb_build_object('ok', true, 'tarefa_id', v_t.id, 'status', tarefa_mudar_estado.status);
end;
$$;
comment on function api.tarefa_mudar_estado(uuid, public.status_tarefa) is '[0046] Passa a tarefa entre aberta e em_andamento (concluir é tarefa_concluir). Responsável, papel responsável, coordenação e diretoria. Recusas: tarefa:estado_invalido, nao_encontrada, sem_permissao, tarefa_encerrada.';

-- --- api.tarefa_atribuir -----------------------------------------------------

create function api.tarefa_atribuir(tarefa_id uuid, responsavel_id uuid) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
  as $$
#variable_conflict use_column
declare
  v_t public.tarefa;
begin
  perform privado.autorizar(array['coordenacao', 'diretoria']::public.papel_usuario[], true);
  if tarefa_atribuir.responsavel_id is null
     or not exists (select 1 from public.perfil p where p.id = tarefa_atribuir.responsavel_id and p.ativo) then
    perform privado.tarefa_recusar('responsavel_invalido');
  end if;

  select * into v_t from public.tarefa t where t.id = tarefa_atribuir.tarefa_id for update;
  if not found then
    perform privado.tarefa_recusar('nao_encontrada');
  end if;
  if v_t.status not in ('aberta', 'em_andamento') then
    perform privado.tarefa_recusar('tarefa_encerrada');
  end if;

  update public.tarefa t set responsavel_id = tarefa_atribuir.responsavel_id where t.id = v_t.id;
  perform privado.relacao_log('tarefa_atribuir', 'tarefa', v_t.id::text,
    pg_catalog.jsonb_build_object('responsavel_id', v_t.responsavel_id),
    pg_catalog.jsonb_build_object('responsavel_id', tarefa_atribuir.responsavel_id));
  return pg_catalog.jsonb_build_object('ok', true, 'tarefa_id', v_t.id, 'responsavel_id', tarefa_atribuir.responsavel_id);
end;
$$;
comment on function api.tarefa_atribuir(uuid, uuid) is '[0046] Define a pessoa responsável por uma tarefa aberta. Coordenação e diretoria, AAL2. Recusas: tarefa:responsavel_invalido, nao_encontrada, tarefa_encerrada.';

-- --- api.tarefa_concluir -----------------------------------------------------

create function api.tarefa_concluir(tarefa_id uuid) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
  as $$
#variable_conflict use_column
declare
  v_t public.tarefa;
  v_agora timestamptz := pg_catalog.now();
begin
  perform privado.autorizar(
    array['comercial', 'coordenacao', 'diretoria', 'enfermeira', 'financeiro', 'marketing']::public.papel_usuario[], false);

  select * into v_t from public.tarefa t where t.id = tarefa_concluir.tarefa_id for update;
  if not found then
    perform privado.tarefa_recusar('nao_encontrada');
  end if;
  if not privado.tarefa_pode_mexer(v_t.responsavel_id, v_t.papel_responsavel) then
    perform privado.tarefa_recusar('sem_permissao');
  end if;
  if v_t.status = 'concluida' then
    return pg_catalog.jsonb_build_object('ok', true, 'tarefa_id', v_t.id, 'status', 'concluida', 'ja_concluida', true);
  end if;
  if v_t.status = 'cancelada' then
    perform privado.tarefa_recusar('tarefa_encerrada');
  end if;

  update public.tarefa t
     set status = 'concluida', concluida_em = v_agora, concluida_por = auth.uid()
   where t.id = v_t.id;
  perform privado.relacao_log('tarefa_concluir', 'tarefa', v_t.id::text,
    pg_catalog.jsonb_build_object('status', v_t.status), pg_catalog.jsonb_build_object('status', 'concluida'));
  return pg_catalog.jsonb_build_object('ok', true, 'tarefa_id', v_t.id, 'status', 'concluida', 'ja_concluida', false);
end;
$$;
comment on function api.tarefa_concluir(uuid) is '[0046] Conclui a tarefa (concluida_em e concluida_por) e devolve o resultado; idempotente. Responsável, papel responsável, coordenação e diretoria. Recusas: tarefa:nao_encontrada, sem_permissao, tarefa_encerrada (cancelada).';

-- --- Execute: só authenticated no api; nada no privado -------------------------

do $$
declare
  v_f record;
begin
  for v_f in
    select p.oid::regprocedure as assinatura
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'api'
      and p.proname in ('tarefa_criar', 'tarefa_mudar_estado', 'tarefa_atribuir', 'tarefa_concluir')
  loop
    execute format('revoke execute on function %s from public, anon, service_role', v_f.assinatura);
    execute format('grant execute on function %s to authenticated', v_f.assinatura);
  end loop;

  for v_f in
    select p.oid::regprocedure as assinatura
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'privado' and p.proname in ('tarefa_recusar', 'tarefa_pode_mexer')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, service_role', v_f.assinatura);
  end loop;
end $$;
