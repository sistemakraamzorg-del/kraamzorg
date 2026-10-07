-- =============================================================================
-- supabase/tests/047_rotina_evolucao.sql
--
-- Migration 0047_rotina_evolucao (P41 · PRD 9.2, "uma coluna por dia, de D1 a
-- D6 ou D12"): assistencial.ler_base_evolucao passa a devolver o dia a dia do
-- atendimento como a planilha de papel do DOC 2.
--   1. acompanhamento.horas_por_visita (as horas por dia do plano).
--   2. rotina: todas as visitas do acompanhamento, com ou sem registro, por
--      dia, com data, horário combinado, check-in, check-out e estado; lista
--      vazia sem visita.
--   3. definicao_checklist: a definição do DOC 2 vigente (nula sem vigente).
--   4. visitas (com registro) ganha resumo_descritivo e assinado_em; o resto
--      do que a função devolvia não mudou.
--   5. A leitura continua gravando 'leitura' no log, continua sem grant e a
--      enfermeira de fora da família continua recusada (42501).
--
-- Só dado sintético, criado aqui e desfeito no rollback.
-- =============================================================================

begin;

select plan(39);

-- -----------------------------------------------------------------------------
-- 0. Preparação
-- -----------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('a4600000-0000-4000-8000-000000000001', 'enfermeira.a.rotina@exemplo.invalid'),
  ('a4600000-0000-4000-8000-000000000002', 'enfermeira.b.rotina@exemplo.invalid'),
  ('a4600000-0000-4000-8000-000000000003', 'coordenacao.rotina@exemplo.invalid');

insert into perfil (id, nome, email, ativo) values
  ('a4600000-0000-4000-8000-000000000001', 'Enfermeira A Teste Rotina', 'enfermeira.a.rotina@exemplo.invalid', true),
  ('a4600000-0000-4000-8000-000000000002', 'Enfermeira B Teste Rotina', 'enfermeira.b.rotina@exemplo.invalid', true),
  ('a4600000-0000-4000-8000-000000000003', 'Coordenação Teste Rotina',  'coordenacao.rotina@exemplo.invalid', true);

insert into usuario_papel (usuario_id, papel) values
  ('a4600000-0000-4000-8000-000000000001', 'enfermeira'),
  ('a4600000-0000-4000-8000-000000000002', 'enfermeira'),
  ('a4600000-0000-4000-8000-000000000003', 'coordenacao');

insert into pacote (id, nome, dias) values ('b4600000-0000-4000-8000-000000000003', 'Pacote Teste Rotina', 3);
insert into pacote_versao (id, pacote_id, valor_centavos, horas_por_visita, vigencia_inicio)
  values ('b4600000-0000-4000-8000-000000000004', 'b4600000-0000-4000-8000-000000000003', 100, 6, '2020-01-01');

insert into profissional (id, usuario_id, nome, funcao, conselho, conselho_uf, conselho_numero) values
  ('d4600000-0000-4000-8000-000000000001', 'a4600000-0000-4000-8000-000000000001', 'Enfermeira A Teste Rotina', 'enfermeira_obstetrica', 'COREN', 'SP', 'TESTE-4601'),
  ('d4600000-0000-4000-8000-000000000002', 'a4600000-0000-4000-8000-000000000002', 'Enfermeira B Teste Rotina', 'enfermeira_neonatal', 'COREN', 'SP', 'TESTE-4602');

-- Um caso: família, mãe, bebê, contrato e acompanhamento de 3 dias (4 horas por dia no
-- acompanhamento, de propósito diferente das 6 do pacote), com a enfermeira indicada
-- como titular aceita. As visitas cada teste cria como precisa.
create function testes.rotina_caso(p_n integer, p_prof uuid)
returns void language plpgsql as $$
declare
  v_s   text := lpad(p_n::text, 2, '0');
  v_fam uuid := ('c4600000-0000-4000-8000-0000000001' || v_s)::uuid;
  v_ac  uuid := ('d4600000-0000-4000-8000-0000000001' || v_s)::uuid;
begin
  insert into familia (id, nome_exibicao, dpp, data_nascimento, data_alta, estado_sensivel)
    values (v_fam, 'Família Teste Rotina ' || v_s, current_date - 30, current_date - 12, current_date - 10, 'normal');
  insert into pessoa (id, familia_id, papel, nome, telefone_e164, email, idade, contato_principal)
    values (('94600000-0000-4000-8000-0000000001' || v_s)::uuid, v_fam, 'mae', 'Marina Teste Rotina ' || v_s,
            '+551190046' || lpad(p_n::text, 4, '0'), 'marina.rotina' || v_s || '@exemplo.invalid', 29, true);
  insert into bebe (id, familia_id, ordem, nome, sexo, tipo_parto, data_nascimento, peso_nascimento_g)
    values (('e4600000-0000-4000-8000-0000000001' || v_s)::uuid, v_fam, 1, 'Bebê Teste Rotina ' || v_s,
            'feminino', 'cesarea', current_date - 12, 3300);
  insert into contrato (id, familia_id, pacote_versao_id, valor_centavos, template_versao, status)
    values (('b4600000-0000-4000-8000-0000000001' || v_s)::uuid, v_fam, 'b4600000-0000-4000-8000-000000000004', 100, 'teste', 'assinado');
  insert into acompanhamento (id, contrato_id, familia_id, dias_contratados, horas_por_visita, estado, inicio_efetivo)
    values (v_ac, ('b4600000-0000-4000-8000-0000000001' || v_s)::uuid, v_fam, 3, 4, 'em_execucao', current_date - 5);
  insert into designacao (acompanhamento_id, profissional_id, papel, status) values (v_ac, p_prof, 'titular', 'aceita');
end $$;

create temp table t_r (chave text primary key, r jsonb) on commit drop;
grant all on t_r to public;

-- Caso 1: três visitas, criadas fora de ordem (D3, D1, D2).
--   D1: com registro, horário combinado 09:30, entrada às 09:40 e saída às 15:50 (horário de São Paulo).
--   D2: SEM registro, horário combinado 14:00, entrada às 14:05, ainda sem saída.
--   D3: SEM registro, sem horário combinado, sem entrada nem saída.
-- Caso 2: a enfermeira B atende; é a que não pertence à família do caso 1. Sem visita nenhuma.
select testes.rotina_caso(1, 'd4600000-0000-4000-8000-000000000001');
select testes.rotina_caso(2, 'd4600000-0000-4000-8000-000000000002');

insert into visita (id, acompanhamento_id, profissional_id, dia_numero, data, hora_prevista, checkin_em, checkout_em, estado)
values ('f4600000-0000-4000-8000-000000000103', 'd4600000-0000-4000-8000-000000000101', 'd4600000-0000-4000-8000-000000000001',
        3, current_date - 3, null, null, null, 'agendada');
insert into visita (id, acompanhamento_id, profissional_id, dia_numero, data, hora_prevista, checkin_em, checkout_em, estado)
values ('f4600000-0000-4000-8000-000000000101', 'd4600000-0000-4000-8000-000000000101', 'd4600000-0000-4000-8000-000000000001',
        1, current_date - 5, time '09:30',
        ((current_date - 5) + time '09:40') at time zone 'America/Sao_Paulo',
        ((current_date - 5) + time '15:50') at time zone 'America/Sao_Paulo', 'ficha_entregue');
insert into visita (id, acompanhamento_id, profissional_id, dia_numero, data, hora_prevista, checkin_em, checkout_em, estado)
values ('f4600000-0000-4000-8000-000000000102', 'd4600000-0000-4000-8000-000000000101', 'd4600000-0000-4000-8000-000000000001',
        2, current_date - 4, time '14:00',
        ((current_date - 4) + time '14:05') at time zone 'America/Sao_Paulo', null, 'iniciada');

insert into registro_atendimento (visita_id, profissional_id, instrumento_versao, dados, resumo_descritivo, assinado_em, assinatura)
values ('f4600000-0000-4000-8000-000000000101', 'd4600000-0000-4000-8000-000000000001', 'v1-2026-09',
        '{"2.1":{"temperatura":36.6,"frequencia_cardiaca":78}}', 'Resumo sintético do dia 1.',
        ((current_date - 5) + time '15:45') at time zone 'America/Sao_Paulo', 'a1');

-- -----------------------------------------------------------------------------
-- 1. A enfermeira da família lê a base: horas do plano, rotina, definição, resumo
-- -----------------------------------------------------------------------------

insert into t_r select 'log_antes', to_jsonb((select count(*) from log_auditoria
  where acao = 'leitura' and entidade = 'registro_atendimento'
    and entidade_id = 'd4600000-0000-4000-8000-000000000101'));

select testes.autenticar_authenticated('a4600000-0000-4000-8000-000000000001', 'aal2');
insert into t_r select 'base1', api.base_evolucao('d4600000-0000-4000-8000-000000000101');
select testes.encerrar();

-- (a) horas por visita do plano, dentro de acompanhamento
select is((select (r #>> '{acompanhamento,horas_por_visita}')::numeric from t_r where chave = 'base1'), 4.0,
  'acompanhamento traz horas_por_visita (as do acompanhamento, não as da versão do pacote)');

-- (b) rotina: todas as visitas, com e sem registro, por dia
select is((select jsonb_array_length(r -> 'rotina')::integer from t_r where chave = 'base1'), 3,
  'rotina traz as três visitas do acompanhamento, tenham registro ou não');
select is((select array_agg((e ->> 'dia_numero')::integer order by ord)
             from t_r, jsonb_array_elements(r -> 'rotina') with ordinality as x(e, ord) where chave = 'base1'),
  array[1, 2, 3], 'rotina vem em ordem de dia (as visitas foram criadas na ordem D3, D1, D2)');
select is((select jsonb_array_length(r -> 'visitas')::integer from t_r where chave = 'base1'), 1,
  'visitas continua só com as que têm registro');
select ok((select (r -> 'rotina') @> '[{"visita_id": "f4600000-0000-4000-8000-000000000102"}]'::jsonb
                  and not ((r -> 'visitas') @> '[{"visita_id": "f4600000-0000-4000-8000-000000000102"}]'::jsonb)
             from t_r where chave = 'base1'),
  'a visita sem registro (D2) está em rotina e fora de visitas');
select is((select (r #>> '{rotina,0,visita_id}') from t_r where chave = 'base1'), 'f4600000-0000-4000-8000-000000000101',
  'rotina: o primeiro item é a visita do dia 1');
select is((select (r #>> '{rotina,0,checkin_em}')::timestamptz from t_r where chave = 'base1'),
  ((current_date - 5) + time '09:40') at time zone 'America/Sao_Paulo', 'rotina: checkin_em do dia 1');
select is((select (r #>> '{rotina,0,checkout_em}')::timestamptz from t_r where chave = 'base1'),
  ((current_date - 5) + time '15:50') at time zone 'America/Sao_Paulo', 'rotina: checkout_em do dia 1');
select is((select (r #>> '{rotina,0,data}')::date from t_r where chave = 'base1'), current_date - 5,
  'rotina: data do dia 1');
select is((select r #>> '{rotina,0,hora_prevista}' from t_r where chave = 'base1'), '09:30:00',
  'rotina: hora_prevista vem como hora com segundos (o mapeador do app corta para HH:MM)');
select is((select (r #>> '{rotina,1,checkin_em}')::timestamptz from t_r where chave = 'base1'),
  ((current_date - 4) + time '14:05') at time zone 'America/Sao_Paulo',
  'rotina: o dia 2, sem registro, traz o checkin_em');
select is((select r #> '{rotina,1,checkout_em}' from t_r where chave = 'base1'), 'null'::jsonb,
  'rotina: o dia 2 ainda sem saída tem checkout_em nulo');
select is((select r #> '{rotina,2,hora_prevista}' from t_r where chave = 'base1'), 'null'::jsonb,
  'rotina: o dia 3 sem horário combinado tem hora_prevista nula');
select is((select array_agg(e ->> 'estado' order by ord)
             from t_r, jsonb_array_elements(r -> 'rotina') with ordinality as x(e, ord) where chave = 'base1'),
  array['ficha_entregue', 'iniciada', 'agendada'], 'rotina: o estado de cada visita');

-- (c) definição do DOC 2 vigente
select is((select r #>> '{definicao_checklist,codigo}' from t_r where chave = 'base1'), 'DOC2_CHECKLIST',
  'definicao_checklist é a definição do DOC2_CHECKLIST');
select ok((select jsonb_array_length(r #> '{definicao_checklist,blocos}') > 0 from t_r where chave = 'base1'),
  'definicao_checklist traz os blocos do instrumento');
select is((select r -> 'definicao_checklist' from t_r where chave = 'base1'),
  (select i.definicao from public.instrumento i where i.codigo = 'DOC2_CHECKLIST' and i.vigente
    order by i.aprovado_em desc nulls last, i.criado_em desc limit 1),
  'definicao_checklist é, inteira, a definição vigente do instrumento');

-- resumo e assinatura da visita com registro
select is((select r #>> '{visitas,0,resumo_descritivo}' from t_r where chave = 'base1'), 'Resumo sintético do dia 1.',
  'visitas: o resumo descritivo vem na visita com registro');
select is((select (r #>> '{visitas,0,assinado_em}')::timestamptz from t_r where chave = 'base1'),
  ((current_date - 5) + time '15:45') at time zone 'America/Sao_Paulo',
  'visitas: a hora da assinatura vem na visita com registro');

-- o que a função já devolvia continua igual
select is((select r #>> '{visitas,0,dados,2.1,temperatura}' from t_r where chave = 'base1'), '36.6',
  'visitas continua trazendo os dados do checklist');
select is((select r #>> '{visitas,0,visita_id}' from t_r where chave = 'base1'), 'f4600000-0000-4000-8000-000000000101',
  'visitas continua trazendo a visita com registro, com o visita_id');
select is((select array_agg(k order by k) from t_r, jsonb_object_keys(r) as k where chave = 'base1'),
  array['acompanhamento', 'bebes', 'definicao_checklist', 'familia_nome', 'filiacao', 'funcoes', 'hoje', 'medicos',
        'paciente', 'profissional', 'relatorios', 'rotina', 'rotulos_orientacoes', 'textos', 'visitas'],
  'chaves da base: as de antes mais rotina e definicao_checklist');
select is((select r #>> '{acompanhamento,dias_contratados}' from t_r where chave = 'base1'), '3',
  'acompanhamento continua trazendo dias_contratados');
select is((select r #>> '{acompanhamento,inicio}' from t_r where chave = 'base1'), (current_date - 5)::text,
  'acompanhamento continua trazendo o início (o início efetivo)');
select is((select r #>> '{paciente,nome}' from t_r where chave = 'base1'), 'Marina Teste Rotina 01',
  'a base continua trazendo a paciente');

-- (d) a leitura continua gravando o log
select is((select count(*)::integer from log_auditoria where acao = 'leitura' and entidade = 'registro_atendimento'
            and entidade_id = 'd4600000-0000-4000-8000-000000000101') - (select (r #>> '{}')::integer from t_r where chave = 'log_antes'),
  1, 'a leitura da base grava uma linha de leitura no log');
select ok(exists (select 1 from log_auditoria where acao = 'leitura' and entidade = 'registro_atendimento'
                   and entidade_id = 'd4600000-0000-4000-8000-000000000101'
                   and usuario_id = 'a4600000-0000-4000-8000-000000000001'
                   and valor_depois ->> 'funcao' = 'assistencial.ler_base_evolucao'),
  'o log diz quem leu e por qual função');

-- -----------------------------------------------------------------------------
-- 2. A coordenação lê o mesmo acompanhamento; acompanhamento sem visita
-- -----------------------------------------------------------------------------

select testes.autenticar_authenticated('a4600000-0000-4000-8000-000000000003', 'aal2');
insert into t_r select 'base_coord', api.base_evolucao('d4600000-0000-4000-8000-000000000101');
insert into t_r select 'base_vazia', api.base_evolucao('d4600000-0000-4000-8000-000000000102');
select testes.encerrar();

select is((select jsonb_array_length(r -> 'rotina')::integer from t_r where chave = 'base_coord'), 3,
  'a coordenação também recebe a rotina completa');
select ok(exists (select 1 from log_auditoria where acao = 'leitura' and entidade = 'registro_atendimento'
                   and entidade_id = 'd4600000-0000-4000-8000-000000000101'
                   and usuario_id = 'a4600000-0000-4000-8000-000000000003'),
  'a leitura da coordenação também fica no log');
select is((select r -> 'rotina' from t_r where chave = 'base_vazia'), '[]'::jsonb,
  'sem visita nenhuma, rotina é uma lista vazia');
select is((select r -> 'visitas' from t_r where chave = 'base_vazia'), '[]'::jsonb,
  'sem visita nenhuma, visitas continua uma lista vazia');

-- -----------------------------------------------------------------------------
-- 3. Sem DOC 2 vigente, a definição é nula e o resto da base continua saindo
-- -----------------------------------------------------------------------------

update public.instrumento set vigente = false where codigo = 'DOC2_CHECKLIST';
select testes.autenticar_authenticated('a4600000-0000-4000-8000-000000000003', 'aal2');
insert into t_r select 'base_sem_def', api.base_evolucao('d4600000-0000-4000-8000-000000000101');
select testes.encerrar();
select is((select r -> 'definicao_checklist' from t_r where chave = 'base_sem_def'), 'null'::jsonb,
  'sem versão vigente do DOC 2, definicao_checklist é nula');
select is((select jsonb_array_length(r -> 'rotina')::integer from t_r where chave = 'base_sem_def'), 3,
  'sem versão vigente do DOC 2, a rotina continua saindo');

-- -----------------------------------------------------------------------------
-- 4. Acesso: a enfermeira de fora da família é recusada; a função continua sem grant
-- -----------------------------------------------------------------------------

select testes.autenticar_authenticated('a4600000-0000-4000-8000-000000000002', 'aal2');
select throws_ok($s$ select api.base_evolucao('d4600000-0000-4000-8000-000000000101') $s$, '42501', null,
  'a enfermeira que não atende a família continua recusada (42501)');
select testes.encerrar();

select ok(not has_function_privilege('authenticated', 'assistencial.ler_base_evolucao(uuid)', 'execute')
      and not has_function_privilege('anon', 'assistencial.ler_base_evolucao(uuid)', 'execute')
      and not has_function_privilege('service_role', 'assistencial.ler_base_evolucao(uuid)', 'execute'),
  'assistencial.ler_base_evolucao continua sem grant para o app (authenticated, anon e service_role)');
select is_definer('assistencial', 'ler_base_evolucao', array['uuid'], 'a função continua security definer');
select volatility_is('assistencial', 'ler_base_evolucao', array['uuid'], 'volatile',
  'a função continua volatile (grava o log)');
select ok((select p.proconfig @> array['search_path=""']
             from pg_proc p where p.oid = 'assistencial.ler_base_evolucao(uuid)'::regprocedure),
  'a função continua com set search_path = ''''');
select ok(obj_description('assistencial.ler_base_evolucao(uuid)'::regprocedure, 'pg_proc') like '%rotina%',
  'o comentário da função cita a rotina');

select * from finish();
rollback;
