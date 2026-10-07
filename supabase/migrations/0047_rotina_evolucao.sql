-- =============================================================================
-- 0047_rotina_evolucao.sql
--
-- Evolução (P41) · PRD 9.2 ("uma coluna por dia, de D1 a D6 ou D12")
--
-- Pedido da coordenação: a tela de evolução precisa mostrar o dia a dia do
-- atendimento como a planilha de papel do DOC 2. Uma coluna por dia, com a
-- data, o horário combinado, a entrada e a saída da casa (check-in e
-- check-out) e o tempo trabalhado comparado às horas do plano, mais as duas
-- últimas linhas da planilha: o resumo descritivo e a hora da assinatura.
--
-- A base da evolução (assistencial.ler_base_evolucao, 0024) só devolvia as
-- visitas que já têm registro_atendimento, sem horário combinado, sem entrada
-- e sem saída, e sem as horas do plano. Esta migration troca a função, com o
-- corpo da 0024 inteiro e o mesmo contrato, e acrescenta só o que faltava:
--
--   1. acompanhamento.horas_por_visita: as horas por dia do plano (3, 4 ou 6),
--      para comparar com o tempo entre check-in e check-out;
--   2. rotina: TODAS as visitas do acompanhamento, com ou sem registro, por
--      dia_numero, cada uma com visita_id, dia_numero, data, hora_prevista,
--      checkin_em, checkout_em e estado, tirados de public.visita. Lista
--      vazia quando o acompanhamento ainda não tem visita. Uma visita sem
--      registro aparece aqui e continua fora de "visitas", que não muda;
--   3. definicao_checklist: a definição do DOC2_CHECKLIST vigente, para
--      rotular as linhas com as palavras do instrumento aprovado e não com
--      texto no código. Nula quando não houver versão vigente. Mesmo critério
--      de api.checklist_visita (0023): a mais recentemente aprovada;
--   4. em cada item de "visitas" (a lista que já existia, com o join em
--      registro_atendimento): resumo_descritivo e assinado_em.
--
-- Nada do que já era devolvido muda de nome, de forma ou de valor.
--
-- Mesmos atributos da 0024: plpgsql, volatile (grava o log), security
-- definer, set search_path = '' e nomes qualificados. A checagem de acesso
-- (privado.evolucao_acesso) e a gravação da leitura (privado.registrar_leitura)
-- continuam antes de qualquer dado sair. O log registra a leitura, não o
-- conteúdo (a regra do ADR 0002 vale como antes).
--
-- Grants: "create or replace" mantém a lista de privilégios da função. A 0024
-- já revogou o execute de public, anon, authenticated e service_role; só
-- api.base_evolucao chama esta função, por dentro, como dono. Nada a refazer.
--
-- Revisão humana do SQL antes de qualquer db push (CLAUDE.md).
-- =============================================================================

create or replace function assistencial.ler_base_evolucao(p_acompanhamento_id uuid) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
  as $$
declare
  v_a       public.acompanhamento;
  v_f       public.familia;
  v_prof    public.profissional;
  v_mae     public.pessoa;
  v_visitas jsonb;
  v_rotina  jsonb;
  v_bebes   jsonb;
  v_medicos jsonb;
  v_rel     jsonb;
  v_textos  jsonb;
  v_filiacao jsonb;
  v_rotulos jsonb;
  v_checklist jsonb;
  v_ini     date;
  v_fim     date;
begin
  v_a := privado.evolucao_acesso(p_acompanhamento_id, false);
  select f.* into v_f from public.familia f where f.id = v_a.familia_id;
  perform privado.registrar_leitura('registro_atendimento', v_a.id::text,
    pg_catalog.jsonb_build_object('funcao', 'assistencial.ler_base_evolucao'));

  v_prof := privado.evolucao_profissional(v_a.id);
  select p.* into v_mae from public.pessoa p
   where p.familia_id = v_a.familia_id and p.papel = 'mae'
   order by p.contato_principal desc, p.criado_em, p.id limit 1;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
           'visita_id', vi.id, 'dia_numero', vi.dia_numero, 'data', vi.data,
           'profissional_id', vi.profissional_id, 'dados', r.dados,
           'resumo_descritivo', r.resumo_descritivo, 'assinado_em', r.assinado_em) order by vi.dia_numero), '[]'::jsonb),
         min(vi.data), max(vi.data)
    into v_visitas, v_ini, v_fim
  from public.visita vi join public.registro_atendimento r on r.visita_id = vi.id
  where vi.acompanhamento_id = v_a.id;

  -- o dia a dia da planilha de papel: todas as visitas, com ou sem registro
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
           'visita_id', vi.id, 'dia_numero', vi.dia_numero, 'data', vi.data,
           'hora_prevista', vi.hora_prevista, 'checkin_em', vi.checkin_em,
           'checkout_em', vi.checkout_em, 'estado', vi.estado) order by vi.dia_numero), '[]'::jsonb)
    into v_rotina
  from public.visita vi
  where vi.acompanhamento_id = v_a.id;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
           'id', b.id, 'ordem', b.ordem, 'nome', b.nome, 'sexo', b.sexo, 'tipo_parto', b.tipo_parto,
           'data_nascimento', b.data_nascimento, 'peso_nascimento_g', b.peso_nascimento_g,
           'peso_alta_g', b.peso_alta_g) order by b.ordem), '[]'::jsonb)
    into v_bebes from public.bebe b where b.familia_id = v_a.familia_id;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
           'id', m.id, 'especialidade', m.especialidade, 'nome', m.nome,
           'tem_email', nullif(pg_catalog.btrim(coalesce(m.email, '')), '') is not null,
           'email_mascarado', privado.venda_email_mascarado(m.email),
           'tem_contato', coalesce(m.telefone_e164, m.email) is not null) order by m.criado_em), '[]'::jsonb)
    into v_medicos from public.medico m where m.familia_id = v_a.familia_id;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.btrim(p.nome) order by (p.papel = 'mae') desc, p.criado_em), '[]'::jsonb)
    into v_filiacao from public.pessoa p
   where p.familia_id = v_a.familia_id and p.papel in ('mae', 'parceiro');

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
           'id', r.id, 'tipo', r.tipo, 'bebe_id', r.bebe_id, 'status', r.status, 'versao', r.edicao,
           'enviado_em', r.enviado_em) order by r.criado_em), '[]'::jsonb)
    into v_rel from public.relatorio_medico r where r.acompanhamento_id = v_a.id;

  select coalesce(pg_catalog.jsonb_object_agg(m.chave, m.texto), '{}'::jsonb)
    into v_textos from public.mensagem_modelo m
   where m.destinatario = 'medico' and m.chave like 'evo\_%';

  -- rótulos dos campos de orientação (blocos 4 e 5 do DOC 2 vigente): a evolução neonatal lista
  -- as orientações feitas com as palavras do próprio instrumento, sem texto clínico no código
  select coalesce(pg_catalog.jsonb_object_agg((b.value ->> 'id') || '.' || (c.value ->> 'id'), c.value ->> 'rotulo'), '{}'::jsonb)
    into v_rotulos
  from public.instrumento i
  cross join lateral pg_catalog.jsonb_array_elements(i.definicao -> 'blocos') b
  cross join lateral pg_catalog.jsonb_array_elements(coalesce(b.value -> 'campos', '[]'::jsonb)) c
  where i.codigo = 'DOC2_CHECKLIST' and i.vigente and (b.value ->> 'id') in ('4', '5')
    and (c.value ->> 'tipo') = 'sim_nao';

  -- a definição inteira do DOC 2 vigente (a mais recentemente aprovada, como em api.checklist_visita);
  -- sem versão vigente, fica nula
  select i.definicao into v_checklist
  from public.instrumento i
  where i.codigo = 'DOC2_CHECKLIST' and i.vigente
  order by i.aprovado_em desc nulls last, i.criado_em desc limit 1;

  return pg_catalog.jsonb_build_object(
    'acompanhamento', pg_catalog.jsonb_build_object(
      'id', v_a.id, 'familia_id', v_a.familia_id, 'estado', v_a.estado, 'dias_contratados', v_a.dias_contratados,
      'horas_por_visita', v_a.horas_por_visita,
      'inicio', coalesce(v_a.inicio_efetivo, v_ini), 'fim', v_fim,
      'concluido_em', privado.data_conclusao_atendimento(v_a.id),
      'data_alta', v_f.data_alta, 'data_nascimento', v_f.data_nascimento),
    'hoje', privado.hoje_sp(),
    'funcoes', coalesce(privado.venda_parametro('profissional_funcoes'), '{}'::jsonb),
    'familia_nome', v_f.nome_exibicao,
    'paciente', case when v_mae.id is not null
                     then pg_catalog.jsonb_build_object('nome', v_mae.nome, 'idade', v_mae.idade) end,
    'filiacao', v_filiacao,
    'bebes', v_bebes,
    'medicos', v_medicos,
    'profissional', case when v_prof.id is not null then pg_catalog.jsonb_build_object(
      'id', v_prof.id, 'nome', v_prof.nome, 'funcao', v_prof.funcao, 'conselho', v_prof.conselho,
      'conselho_uf', v_prof.conselho_uf, 'conselho_numero', v_prof.conselho_numero) end,
    'visitas', v_visitas,
    'rotina', v_rotina,
    'definicao_checklist', v_checklist,
    'relatorios', v_rel,
    'textos', v_textos,
    'rotulos_orientacoes', v_rotulos);
end;
$$;
comment on function assistencial.ler_base_evolucao(uuid) is 'Leitura auditada da base da evolução de um acompanhamento (P41, 0047): período, horas por visita do plano, paciente, bebês, médicos (e-mail só mascarado), profissional, registros do checklist por visita (com resumo descritivo e hora da assinatura), a rotina (todas as visitas, com ou sem registro: data, horário combinado, check-in, check-out e estado), a definição do DOC 2 vigente, textos padrão evo_* e os documentos já criados. Grava ''leitura'' antes de devolver. Coordenação e diretoria em todos, enfermeira nas famílias atribuídas. Sem grant.';
