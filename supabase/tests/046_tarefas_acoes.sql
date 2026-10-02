-- =============================================================================
-- supabase/tests/046_tarefas_acoes.sql
--
-- 0046_tarefas_acoes.sql: criar, mudar estado, atribuir e concluir tarefa.
-- Só dado sintético, desfeito no rollback.
-- =============================================================================

begin;

select plan(16);

insert into auth.users (id, email) values
  ('a4600000-0000-4000-8000-000000000001', 'coordenacao.t46@exemplo.invalid'),
  ('a4600000-0000-4000-8000-000000000002', 'marketing.t46@exemplo.invalid'),
  ('a4600000-0000-4000-8000-000000000003', 'marketing.b.t46@exemplo.invalid');
insert into perfil (id, nome, email, ativo) values
  ('a4600000-0000-4000-8000-000000000001', 'Perfil Teste Coordenação T46', 'coordenacao.t46@exemplo.invalid', true),
  ('a4600000-0000-4000-8000-000000000002', 'Perfil Teste Marketing T46', 'marketing.t46@exemplo.invalid', true),
  ('a4600000-0000-4000-8000-000000000003', 'Perfil Teste Marketing B T46', 'marketing.b.t46@exemplo.invalid', true);
insert into usuario_papel (usuario_id, papel) values
  ('a4600000-0000-4000-8000-000000000001', 'coordenacao'),
  ('a4600000-0000-4000-8000-000000000002', 'marketing'),
  ('a4600000-0000-4000-8000-000000000003', 'marketing');

create temp table t_r (chave text primary key, j jsonb);
grant all on t_r to public;

-- Coordenação cria para a pessoa de marketing.
select testes.autenticar_authenticated('a4600000-0000-4000-8000-000000000001', 'aal2');
insert into t_r select 'criada', api.tarefa_criar('Tarefa T46 do marketing', 'a4600000-0000-4000-8000-000000000002', 'marketing');
select is((select j ->> 'ok' from t_r where chave = 'criada'), 'true', 'coordenação cria tarefa para outra pessoa');
select throws_ok($s$ select api.tarefa_criar('ab') $s$, 'P0001', null, 'título curto é recusado');
select throws_ok($s$ select api.tarefa_criar('Tarefa T46 sem pessoa', 'a4600000-0000-4000-8000-0000000000ff') $s$, 'P0001', null, 'responsável inexistente é recusado');
select testes.encerrar();

select is((select status::text from tarefa where titulo = 'Tarefa T46 do marketing'), 'aberta', 'a tarefa nasce aberta');

-- Marketing: cria só para si, mexe na própria, não na dos outros.
select testes.autenticar_authenticated('a4600000-0000-4000-8000-000000000002', 'aal1');
select throws_ok($s$ select api.tarefa_criar('Tarefa T46 para outro', 'a4600000-0000-4000-8000-000000000003') $s$, 'P0001', null, 'marketing não cria para outra pessoa');
insert into t_r select 'propria', api.tarefa_criar('Tarefa T46 propria');
select is((select j ->> 'ok' from t_r where chave = 'propria'), 'true', 'marketing cria tarefa para si');
select is((api.tarefa_mudar_estado((select (j ->> 'tarefa_id')::uuid from t_r where chave = 'criada'), 'em_andamento')) ->> 'status', 'em_andamento', 'responsável passa a tarefa para em andamento');
select throws_ok($s$ select api.tarefa_mudar_estado((select (j ->> 'tarefa_id')::uuid from t_r where chave = 'criada'), 'concluida') $s$, 'P0001', null, 'mudar_estado não conclui');
select throws_ok($s$ select api.tarefa_atribuir((select (j ->> 'tarefa_id')::uuid from t_r where chave = 'criada'), 'a4600000-0000-4000-8000-000000000003') $s$, '42501', null, 'marketing não atribui');
select testes.encerrar();

-- Marketing B não mexe na tarefa de A.
select testes.autenticar_authenticated('a4600000-0000-4000-8000-000000000003', 'aal1');
select throws_ok($s$ select api.tarefa_concluir((select (j ->> 'tarefa_id')::uuid from t_r where chave = 'propria')) $s$, 'P0001', null, 'outra pessoa não conclui tarefa alheia');
select testes.encerrar();

-- Coordenação atribui e conclui (a política de 0007 barraria o UPDATE direto).
select testes.autenticar_authenticated('a4600000-0000-4000-8000-000000000001', 'aal2');
select is((api.tarefa_atribuir((select (j ->> 'tarefa_id')::uuid from t_r where chave = 'propria'), 'a4600000-0000-4000-8000-000000000003')) ->> 'ok', 'true', 'coordenação atribui');
select is((api.tarefa_concluir((select (j ->> 'tarefa_id')::uuid from t_r where chave = 'propria'))) ->> 'status', 'concluida', 'coordenação conclui tarefa de outra pessoa');
select is((api.tarefa_concluir((select (j ->> 'tarefa_id')::uuid from t_r where chave = 'propria'))) ->> 'ja_concluida', 'true', 'concluir de novo é idempotente');
select throws_ok($s$ select api.tarefa_atribuir((select (j ->> 'tarefa_id')::uuid from t_r where chave = 'propria'), 'a4600000-0000-4000-8000-000000000002') $s$, 'P0001', null, 'tarefa concluída não troca de responsável');
select testes.encerrar();

select is((select concluida_por::text from tarefa where titulo = 'Tarefa T46 propria'), 'a4600000-0000-4000-8000-000000000001', 'concluida_por grava quem concluiu');
select ok(not has_function_privilege('anon', 'api.tarefa_concluir(uuid)', 'execute'), 'anon não executa');

select * from finish();
rollback;
