-- =============================================================================
-- 0048_janela_por_canal.sql · O-18 (PRD 4.1, 11.3, 22.4)
--
-- A janela de 24 horas do WhatsApp é regra da API oficial (cloud_api). No número
-- comum (UAZAPI, usado em homologação) o texto livre continua valendo (PRD 4.1).
-- agente.janela_followup (0025) decidia só pela hora da última mensagem, então a
-- cadência de 1, 3 e 14 dias (sempre com 24 horas ou mais de silêncio) nunca
-- saía na UAZAPI. Agora a função lê o canal em parametro.whatsapp_canal_agente:
--   uazapi    -> dentro_janela verdadeiro, sem modelo;
--   cloud_api -> comportamento da 0025, sem mudança.
-- Parâmetro ausente ou com outro valor conta como cloud_api. Padrão do parâmetro:
-- cloud_api, o caminho seguro em produção. Homologação define uazapi no seed.
-- Mesma assinatura e mesmos grants da 0025.
-- =============================================================================

insert into public.parametro (chave, valor, descricao) values
  ('whatsapp_canal_agente', '"cloud_api"',
   'PRD 4.1, 11.3, 22.4 O-18 (v4.2): canal de envio do agente, uazapi ou cloud_api. Com uazapi (número comum, homologação) o texto livre vale e a cadência de follow-up sai sem a janela de 24 horas. Com cloud_api (API oficial, condição de produção) texto livre fora de whatsapp_janela_horas nunca sai, só modelo aprovado. Padrão cloud_api, o caminho seguro; valor ausente ou diferente de uazapi conta como cloud_api.')
on conflict (chave) do nothing;

create or replace function agente.janela_followup(execucao_id uuid) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
  as $$
#variable_conflict use_column
declare
  v_rec     public.automacao_execucao;
  v_conv    public.conversa;
  v_horas   numeric := privado.agente_parametro_numero('whatsapp_janela_horas');
  v_canal   text := coalesce(privado.agente_parametro('whatsapp_canal_agente') #>> '{}', 'cloud_api');
  v_chave   text;
  v_dentro  boolean;
  v_modelo  privado.modelo_whatsapp;
  v_valores text[];
begin
  perform privado.agente_contexto();

  select e.* into v_rec
  from public.automacao_execucao e
  where e.id = janela_followup.execucao_id
    and e.automacao_id in ('followup_d1', 'followup_d3_d14')
    and e.status = 'agendada'
    and coalesce(e.payload, '{}'::jsonb) ? 'reservada_em';
  if v_rec.id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'erro', 'execucao_invalida');
  end if;

  select c.* into v_conv from public.conversa c where c.id = (v_rec.payload ->> 'conversa_id')::uuid;
  if v_conv.id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'erro', 'conversa_inexistente');
  end if;

  -- [O-18] A janela de 24 horas é regra da API oficial. No número comum (UAZAPI)
  -- o texto livre continua valendo (PRD 4.1), então a cadência sai em texto
  -- livre e o modelo aprovado não entra. Só o valor exato 'uazapi' abre esse
  -- caminho: parâmetro ausente ou com outro valor conta como cloud_api.
  if v_canal = 'uazapi' then
    return pg_catalog.jsonb_build_object('ok', true, 'dentro_janela', true, 'modelo', null);
  end if;

  -- Sem o parâmetro ou sem mensagem da família, conta como fora da janela: o
  -- caminho seguro é o modelo aprovado, nunca o texto livre.
  v_dentro := v_horas is not null and v_horas > 0
              and v_conv.ultima_entrada_em is not null
              and v_conv.ultima_entrada_em >= pg_catalog.now() - pg_catalog.make_interval(secs => (v_horas * 3600)::double precision);

  if v_dentro then
    return pg_catalog.jsonb_build_object('ok', true, 'dentro_janela', true, 'modelo', null);
  end if;

  v_chave := v_rec.payload ->> 'chave_texto';
  select m.* into v_modelo
  from privado.modelo_whatsapp m
  where m.mensagem_chave = v_chave and m.status = 'aprovado' and m.idioma = 'pt_BR'
  order by m.aprovado_em desc, m.id
  limit 1;
  if v_modelo.id is null then
    return pg_catalog.jsonb_build_object('ok', true, 'dentro_janela', false, 'modelo', null, 'motivo', 'sem_modelo_aprovado');
  end if;

  v_valores := privado.modelo_whatsapp_valores(v_modelo, v_conv.id);
  if v_valores is null then
    return pg_catalog.jsonb_build_object('ok', true, 'dentro_janela', false, 'modelo', null, 'motivo', 'parametro_sem_valor');
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'dentro_janela', false,
    'telefone', pg_catalog.regexp_replace(coalesce(v_conv.telefone_e164, ''), '[^0-9]', '', 'g'),
    'modelo', pg_catalog.jsonb_build_object(
      'nome', v_modelo.nome_meta,
      'idioma', v_modelo.idioma,
      'categoria', v_modelo.categoria::text,
      'parametros', pg_catalog.to_jsonb(v_valores),
      'texto', privado.modelo_whatsapp_renderizar(v_modelo.texto, v_valores)));
exception
  when others then
    return privado.agente_erro(sqlstate, sqlerrm);
end;
$$;

comment on function agente.janela_followup(uuid) is '[P18b, 0048] Fluxo 3, entrada B: para uma execução da cadência (followup_d1 ou followup_d3_d14) já reservada, com parametro.whatsapp_canal_agente = uazapi devolve sempre {ok, dentro_janela: true} (o texto livre vale no número comum, PRD 4.1, O-18); com cloud_api (padrão seguro, também sem o parâmetro) diz se a última mensagem da família está dentro da janela de parametro.whatsapp_janela_horas. Dentro: {ok, dentro_janela: true}. Fora: devolve o telefone (só dígitos, a Cloud API não usa jid) e o modelo aprovado (modelo_whatsapp da chave_texto da execução) com os parâmetros resolvidos e o texto renderizado; sem modelo aprovado ou com parâmetro sem valor, devolve modelo nulo e o motivo, e nada de texto livre sai. Chave é a execução reservada, não parâmetro do modelo.';


revoke execute on function agente.janela_followup(uuid) from public, anon, authenticated, service_role;
grant execute on function agente.janela_followup(uuid) to n8n_agente;
