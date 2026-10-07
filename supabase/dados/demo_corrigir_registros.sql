-- =============================================================================
-- supabase/dados/demo_corrigir_registros.sql
--
-- REPARO ÚNICO, SÓ PARA DADO DE TESTE. Leia antes de rodar.
--
-- O que conserta: as famílias "Família Teste ..." criadas pelos seeds antigos
-- (supabase/seed.sql e supabase/dados/demo_telas_seed.sql, antes de 07/10/2026)
-- gravaram o registro de cada dia num formato inventado, {"bloco_2": {...}},
-- que não é o do DOC 2. Por isso a evolução lê tudo como vazio ("Campos sem
-- registro em nenhum dia") e pede para digitar à mão o que o checklist já
-- tem. Este script regrava o `dados` desses registros no formato do DOC 2
-- (um objeto por bloco, bloco do recém-nascido por bebê), com todos os
-- campos do checklist.
--
-- Por que precisa de cuidado: `registro_atendimento` só aceita acréscimo
-- (CLAUDE.md, regra "append-only"); o banco recusa UPDATE por gatilho. Aqui o
-- gatilho `recusar_update_delete` é desligado DENTRO desta transação e religado
-- antes do fim; se qualquer conferência falhar, nada é gravado e o gatilho
-- continua ligado. A auditoria (`auditar`) segue ligada: a troca fica no log.
--
-- Trava de segurança: só mexe em registro que (1) está no formato antigo (tem a
-- chave "bloco_2"), (2) é de família cujo nome começa com "Família Teste " e
-- (3) não tem adendo (registro corrigido por pessoa fica como está, e o script
-- diz quantos pulou). Registro de família real nunca entra. Mantém id, visita,
-- assinatura e hora de assinatura; troca apenas `dados`.
--
-- Como rodar: SQL Editor do Supabase, como o dono das tabelas ("postgres"),
-- uma vez. Pode rodar de novo: depois da primeira vez não sobra alvo e ele
-- avisa e não faz nada. Só em ambiente de teste/demonstração.
-- =============================================================================

begin;

create temp table reparo_alvo on commit drop as
select r.id as registro_id
from registro_atendimento r
join visita vi on vi.id = r.visita_id
join acompanhamento ac on ac.id = vi.acompanhamento_id
join familia f0 on f0.id = ac.familia_id
where r.dados ? 'bloco_2'
  and f0.nome_exibicao like 'Família Teste %'
  and not exists (select 1 from registro_adendo ad where ad.registro_id = r.id);

do $guarda$
declare
  v_alvos integer;
  v_fora integer;
begin
  select count(*) into v_alvos from reparo_alvo;
  -- nenhum registro de família que não seja de teste pode estar na lista
  select count(*) into v_fora
  from reparo_alvo t
  join registro_atendimento r on r.id = t.registro_id
  join visita vi on vi.id = r.visita_id
  join acompanhamento ac on ac.id = vi.acompanhamento_id
  join familia f0 on f0.id = ac.familia_id
  where f0.nome_exibicao not like 'Família Teste %';
  if v_fora > 0 then
    raise exception 'reparo abortado: % registro(s) de família que não é de teste na lista', v_fora;
  end if;
  if v_alvos > 1000 then
    raise exception 'reparo abortado: % registros na lista, mais do que um banco de teste costuma ter', v_alvos;
  end if;
  raise notice 'registros de teste no formato antigo que serão regravados: %', v_alvos;
  raise notice 'registros de teste no formato antigo com adendo, mantidos como estão: %',
    (select count(*) from registro_atendimento r
       join visita vi on vi.id = r.visita_id
       join acompanhamento ac on ac.id = vi.acompanhamento_id
       join familia f0 on f0.id = ac.familia_id
      where r.dados ? 'bloco_2' and f0.nome_exibicao like 'Família Teste %'
        and exists (select 1 from registro_adendo ad where ad.registro_id = r.id));
end
$guarda$;

alter table registro_atendimento disable trigger recusar_update_delete;

update registro_atendimento r
set dados = novo.dados
from (
  select r2.id as registro_id,
       -- Mesmo formato que a enfermeira grava pelo portal (DOC 2): um objeto por bloco, com o
       -- id do bloco como chave ("1", "2.1", "3.1"...), e os blocos do recém-nascido ("3",
       -- "3.1", "3.2") como lista, um item por bebê. É o que a evolução lê para pré-preencher.
       jsonb_build_object(
         '1', jsonb_build_object(
                'data', to_char(vi.data, 'YYYY-MM-DD'), 'horario', to_char(vi.hora_prevista + interval '4 minutes', 'HH24:MI'),
                'acompanhante_presente', jsonb_build_object('resposta', true,
                                           'texto', case when vi.dia_numero % 2 = 0 then 'Avó materna' else 'Parceiro' end),
                'pontualidade_confirmada', true, 'higienizacao_das_maos', true,
                'apresentacao_acolhimento_familia', true)
              || case when vi.dia_numero > 1 then jsonb_build_object('relato_desde_ultima_visita', true) else '{}'::jsonb end,
         '2', jsonb_build_object(
                'bem_estar_geral_preservado', true,
                'queixa_de_dor', case when vi.dia_numero <= 2 then jsonb_build_object('resposta', true, 'texto', 'Local da cirurgia ou períneo')
                                      else jsonb_build_object('resposta', false) end,
                'dor_intensidade', greatest(0, 5 - vi.dia_numero), 'sangramento_loquios_esperado', true),
         '2.1', jsonb_build_object(
                'pressao_arterial', jsonb_build_object('partes', jsonb_build_object('sistolica', 108 + vi.dia_numero * 2, 'diastolica', 70 + vi.dia_numero)),
                'temperatura', case when vi.dia_numero = 2 and f0.nome_exibicao = 'Família Teste Jade' then 38.4 else 36.4 + (vi.dia_numero % 3) * 0.2 end, 'frequencia_cardiaca', 72 + vi.dia_numero),
         '2.4', jsonb_build_object(
                'higiene_intima_orientada', true, 'sono_repouso_adequados', vi.dia_numero <> 2,
                'alimentacao_hidratacao_adequadas', true, 'eliminacoes_evacuacao_presentes', vi.dia_numero > 1),
         '2.5', jsonb_build_object('turgidas_ou_secretantes', true, 'flacidas', false, 'ingurgitadas', vi.dia_numero = 2),
         '2.6', jsonb_build_object('dor_mamilos_amamentar', vi.dia_numero <= 3, 'evn', greatest(0, 4 - vi.dia_numero),
                                   'intervencoes_para_dor', 'Compressa morna e pega corrigida'),
         '2.7', jsonb_build_object('lesao_mamilar', case when vi.dia_numero in (2, 3) then 'esquerda' else 'nao' end,
                                   'nts', case when vi.dia_numero in (2, 3) then 2 else 0 end, 'interrupcao_adequada_succao', true),
         '2.8', jsonb_build_object('latch', jsonb_build_object('valor', least(10, 6 + vi.dia_numero),
                                                               'complemento', case when 6 + vi.dia_numero <= 7 then 'regular' else 'otimo' end),
                                   'teste_da_linguinha', 'normal'),
         '2.9', jsonb_build_object('fbm_aplicada', case when vi.dia_numero in (2, 3) then jsonb_build_array('analgesia') else jsonb_build_array('nao_aplicada') end),
         '2.10', jsonb_build_object('bicos_artificiais', false, 'forros_e_conchas', false, 'bomba_de_extracao', false),
         '2.11', jsonb_build_object('succoes_por_dia', 'mais_de_8'),
         '2.12', jsonb_build_object('producao_de_leite', 'normal'),
         '2.13', jsonb_build_object('sente_se_apoiada', least(10, 6 + vi.dia_numero), 'quem_mais_apoia', 'Parceiro')
       )
       || jsonb_build_object(
         '3', f.b3, '3.1', f.b31, '3.2', f.b32,
         '4', jsonb_build_object('massagem_extracao_leite', true, 'correcao_pega_posicao', vi.dia_numero <= 3,
                                 'livre_demanda_reforcada', true, 'colica_disquesia', vi.dia_numero >= 3,
                                 'posturas_de_conforto', vi.dia_numero >= 2, 'sinais_de_fome', vi.dia_numero = 1,
                                 'manobra_de_desengasgo', vi.dia_numero = 2),
         '5', jsonb_build_object('sono_seguro_orientado', vi.dia_numero = 1, 'sinais_janelas_sono_explicados', vi.dia_numero = 2,
                                 'organizacao_rotina_familiar', vi.dia_numero >= 3),
         '6', jsonb_build_object('orientacoes_ao_parceiro', vi.dia_numero <= 2, 'duvidas_esclarecidas', true),
         '7', jsonb_build_object('escuta_ativa_emocoes_validadas', true,
                                 'sinais_sofrimento_emocional', jsonb_build_object('resposta', false)),
         '8', jsonb_build_object('ambiente_organizado', true, 'alinhamento_dia_seguinte', vi.dia_numero < ac.dias_contratados),
         '9', jsonb_build_object('contato_medico_necessario', false))
       || case when coalesce(f.cesarea, false)
               then jsonb_build_object('2.2', jsonb_build_object('cesarea_sem_sinais_infeccao', true,
                      'episiotomia_laceracao_sem_alteracoes', true, 'orientacoes_cuidado_reforcadas', true))
               else '{}'::jsonb end
       || case when vi.dia_numero <= 3
               then jsonb_build_object('2.3', jsonb_build_object('medicacoes_em_uso', 'Paracetamol 750 mg, se dor'))
               else '{}'::jsonb end
       || case when vi.dia_numero = ac.dias_contratados
               then jsonb_build_object('ultimo_dia', jsonb_build_object(
                      'contato_obstetra', 'Dra. Teste Obstetra, contato por e-mail',
                      'contato_pediatra', 'Dr. Teste Pediatra, contato por e-mail',
                      'resumo_encerramento', 'Família segura na rotina e com os sinais de alerta revisados.'))
               else '{}'::jsonb end
         as dados
  from reparo_alvo t
  join registro_atendimento r2 on r2.id = t.registro_id
  join visita vi on vi.id = r2.visita_id
  join acompanhamento ac on ac.id = vi.acompanhamento_id
  join familia f0 on f0.id = ac.familia_id
  cross join lateral (
  select bool_or(b.tipo_parto = 'cesarea') as cesarea,
         coalesce(jsonb_agg(jsonb_build_object(
           'bebe_id', b.id, 'cor_da_pele_icterica', case when vi.dia_numero <= 2 then 'zona_i' else 'ausente' end,
           'respiracao_sem_sinais_esforco', true, 'choro_habitual', true,
           'atividade_responsividade_preservadas', true) order by b.ordem), '[]'::jsonb) as b3,
         coalesce(jsonb_agg(jsonb_build_object(
           'bebe_id', b.id, 'temperatura', 36.6 + (vi.dia_numero % 2) * 0.2, 'frequencia_cardiaca', 132,
           'frequencia_respiratoria', 42,
           'peso', coalesce(b.peso_alta_g, b.peso_nascimento_g, 3000) + vi.dia_numero * 35) order by b.ordem), '[]'::jsonb) as b31,
         coalesce(jsonb_agg(jsonb_build_object(
           'bebe_id', b.id, 'troca_fraldas_avaliacao_diurese', jsonb_build_object('resposta', true, 'texto', 'Diurese presente'),
           'banho_orientado_realizado', vi.dia_numero % 3 = 1,
           'coto_umbilical_avaliado', jsonb_build_object('resposta', true,
              'texto', case when vi.dia_numero >= 5 then 'em mumificação, seco' else 'úmido, sem sinais flogísticos' end),
           'vestimenta_adequada_clima', true) order by b.ordem), '[]'::jsonb) as b32
  from bebe b where b.familia_id = ac.familia_id
) f
) novo
where r.id = novo.registro_id;

alter table registro_atendimento enable trigger recusar_update_delete;

do $conferencia$
declare
  v_restam integer;
  v_gatilho "char";
begin
  select count(*) into v_restam
  from registro_atendimento r
  join visita vi on vi.id = r.visita_id
  join acompanhamento ac on ac.id = vi.acompanhamento_id
  join familia f0 on f0.id = ac.familia_id
  where r.dados ? 'bloco_2' and f0.nome_exibicao like 'Família Teste %'
    and not exists (select 1 from registro_adendo ad where ad.registro_id = r.id);
  select tgenabled into v_gatilho from pg_trigger
  where tgrelid = 'public.registro_atendimento'::regclass and tgname = 'recusar_update_delete';
  if v_gatilho is distinct from 'O' then
    raise exception 'o gatilho recusar_update_delete não voltou a ficar ligado';
  end if;
  if v_restam > 0 then
    raise exception 'ainda restam % registro(s) de teste no formato antigo', v_restam;
  end if;
  raise notice 'pronto: nenhum registro de teste sem adendo no formato antigo, e a trava de append-only está ligada de novo';
end
$conferencia$;

commit;
