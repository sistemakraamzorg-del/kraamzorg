-- =============================================================================
-- supabase/tests/048_janela_por_canal.sql
--
-- O-18 (PRD 4.1, 11.3, 22.4), migration 0048_janela_por_canal.sql.
-- agente.janela_followup decide a janela de 24 horas conforme o canal em
-- parametro.whatsapp_canal_agente:
--   uazapi    -> texto livre vale, sempre dentro_janela verdadeiro, sem modelo;
--   cloud_api -> comportamento da 0025 (hora da última mensagem, modelo aprovado);
--   ausente ou valor desconhecido -> cloud_api (o caminho seguro).
--
-- Só dado sintético, criado aqui e desfeito no rollback.
-- =============================================================================

begin;

select plan(11);

-- -----------------------------------------------------------------------------
-- 0. Preparação
-- -----------------------------------------------------------------------------

-- modelo aprovado para o follow-up depois do PDF (rascunho -> submetido -> aprovado)
update privado.modelo_whatsapp set status = 'submetido' where mensagem_chave = 'followup_d1_pos_pdf';
update privado.modelo_whatsapp set status = 'aprovado' where mensagem_chave = 'followup_d1_pos_pdf';

insert into auth.users (id, email) values
  ('a4800000-0000-4000-8000-000000000001', 'diretoria.canal@exemplo.invalid');

insert into familia (id, nome_exibicao, dpp) values
  ('c4800000-0000-4000-8000-000000000001', 'Família Teste Canal Três Dias', current_date + 100),
  ('c4800000-0000-4000-8000-000000000002', 'Família Teste Canal Uma Hora', current_date + 100);
insert into pessoa (id, familia_id, papel, nome, telefone_e164) values
  ('d4800000-0000-4000-8000-000000000001', 'c4800000-0000-4000-8000-000000000001', 'mae', 'Helena Sobrenome Teste', '+5511900000981');
insert into conversa (id, wa_jid, telefone_e164, familia_id, pessoa_id, classificacao, iniciada_por, ultima_entrada_em, ultima_saida_em) values
  ('e4800000-0000-4000-8000-000000000001', '5511900000981-teste@s.whatsapp.net', '+5511900000981', 'c4800000-0000-4000-8000-000000000001',
   'd4800000-0000-4000-8000-000000000001', 'lead', 'cliente', now() - interval '3 days', now() - interval '3 days' + interval '1 hour'),
  ('e4800000-0000-4000-8000-000000000002', '5511900000982-teste@s.whatsapp.net', '+5511900000982', 'c4800000-0000-4000-8000-000000000002',
   null, 'lead', 'cliente', now() - interval '1 hour', now() - interval '30 minutes');

insert into automacao_execucao (id, automacao_id, familia_id, agendada_para, status, payload) values
  ('f4800000-0000-4000-8000-000000000001', 'followup_d3_d14', 'c4800000-0000-4000-8000-000000000001', now(), 'agendada',
   jsonb_build_object('conversa_id', 'e4800000-0000-4000-8000-000000000001', 'reservada_em', now(), 'chave_texto', 'followup_d1_pos_pdf', 'etapa', 2)),
  ('f4800000-0000-4000-8000-000000000002', 'followup_d1', 'c4800000-0000-4000-8000-000000000002', now(), 'agendada',
   jsonb_build_object('conversa_id', 'e4800000-0000-4000-8000-000000000002', 'reservada_em', now(), 'chave_texto', 'followup_d1_pos_pdf')),
  ('f4800000-0000-4000-8000-000000000003', 'followup_d1', 'c4800000-0000-4000-8000-000000000001', now(), 'agendada',
   jsonb_build_object('conversa_id', 'e4800000-0000-4000-8000-000000000001', 'chave_texto', 'followup_d1_pos_pdf'));

create temp table t_c (chave text primary key, r jsonb);
grant all on t_c to public;

-- -----------------------------------------------------------------------------
-- 1. O parâmetro e o padrão
-- -----------------------------------------------------------------------------

select is((select count(*)::integer from parametro where chave = 'whatsapp_canal_agente'), 1,
  'parametro.whatsapp_canal_agente existe');
select ok((select valor in ('"uazapi"'::jsonb, '"cloud_api"'::jsonb) from parametro where chave = 'whatsapp_canal_agente'),
  'o valor é uazapi ou cloud_api');

-- -----------------------------------------------------------------------------
-- 2. Canal uazapi: texto livre vale, mesmo com 3 dias de silêncio
-- -----------------------------------------------------------------------------

update parametro set valor = '"uazapi"' where chave = 'whatsapp_canal_agente';
select testes.autenticar('n8n_agente');
insert into t_c select 'uazapi_3d', agente.janela_followup('f4800000-0000-4000-8000-000000000001');
insert into t_c select 'uazapi_nao_reservada', agente.janela_followup('f4800000-0000-4000-8000-000000000003');
reset role;
select set_config('request.jwt.claims', '', true);

select is((select r ->> 'dentro_janela' from t_c where chave = 'uazapi_3d'), 'true',
  'uazapi e última mensagem há 3 dias: dentro da janela (texto livre vale)');
select is((select r -> 'modelo' from t_c where chave = 'uazapi_3d'), 'null'::jsonb,
  'uazapi: nenhum modelo vai junto');
select is((select r ->> 'erro' from t_c where chave = 'uazapi_nao_reservada'), 'execucao_invalida',
  'uazapi não afrouxa a validação: execução não reservada continua recusada');

-- -----------------------------------------------------------------------------
-- 3. Canal cloud_api: comportamento da 0025
-- -----------------------------------------------------------------------------

update parametro set valor = '"cloud_api"' where chave = 'whatsapp_canal_agente';
select testes.autenticar('n8n_agente');
insert into t_c select 'cloud_3d', agente.janela_followup('f4800000-0000-4000-8000-000000000001');
insert into t_c select 'cloud_1h', agente.janela_followup('f4800000-0000-4000-8000-000000000002');
reset role;
select set_config('request.jwt.claims', '', true);

select is((select r ->> 'dentro_janela' from t_c where chave = 'cloud_3d'), 'false',
  'cloud_api e última mensagem há 3 dias: fora da janela');
select is((select r #>> '{modelo,nome}' from t_c where chave = 'cloud_3d'), 'kz_retorno_apresentacao',
  'cloud_api fora da janela: sai o modelo aprovado, nunca texto livre');
select is((select r ->> 'dentro_janela' from t_c where chave = 'cloud_1h'), 'true',
  'cloud_api e última mensagem há 1 hora: dentro da janela');

-- -----------------------------------------------------------------------------
-- 4. Padrão seguro: parâmetro ausente ou desconhecido conta como cloud_api
-- -----------------------------------------------------------------------------

delete from parametro where chave = 'whatsapp_canal_agente';
select testes.autenticar('n8n_agente');
insert into t_c select 'ausente_3d', agente.janela_followup('f4800000-0000-4000-8000-000000000001');
reset role;
select set_config('request.jwt.claims', '', true);
select is((select r ->> 'dentro_janela' from t_c where chave = 'ausente_3d'), 'false',
  'sem o parâmetro de canal, vale cloud_api: fora da janela');

insert into parametro (chave, valor, descricao) values ('whatsapp_canal_agente', '"UAZAPI "', 'valor sintético fora do padrão');
select testes.autenticar('n8n_agente');
insert into t_c select 'estranho_3d', agente.janela_followup('f4800000-0000-4000-8000-000000000001');
reset role;
select set_config('request.jwt.claims', '', true);
select is((select r ->> 'dentro_janela' from t_c where chave = 'estranho_3d'), 'false',
  'valor desconhecido no canal conta como cloud_api: fora da janela');

-- -----------------------------------------------------------------------------
-- 5. Permissões não mudam
-- -----------------------------------------------------------------------------

select testes.autenticar_authenticated('a4800000-0000-4000-8000-000000000001', 'aal2');
select throws_ok($s$ select agente.janela_followup('f4800000-0000-4000-8000-000000000001') $s$, '42501', null,
  'authenticated continua sem executar a função do agente');
select testes.encerrar();

select * from finish();
rollback;
