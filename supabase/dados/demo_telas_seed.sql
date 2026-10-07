-- =============================================================================
-- supabase/dados/demo_telas_seed.sql
--
-- Dados SINTÉTICOS de demonstração que COMPLEMENTAM supabase/seed.sql e
-- supabase/dados/*.sql, para que TODAS as telas do app mostrem conteúdo
-- realista (ocorrências, alertas clínicos, tarefas, cobranças, notas,
-- despesas, extrato, NPS, marketing, evoluções, pré-natal, agenda, escala,
-- documentos, talentos, parceiros, manuais, sessões de venda, pós-venda,
-- portal da família, transferências e conversas).
--
-- Pedido da cliente (feedback relatado): "todas as telas têm que ter uma
-- forma de mock ... para que a gente consiga ver como são todas as telas".
--
-- REGRAS (CLAUDE.md): dado exclusivamente sintético. Todo nome de família,
-- pessoa, bebê, médico, profissional e candidata tem a palavra "Teste";
-- telefones sempre +5511900000XXX; e-mails só em domínio .test; nenhuma
-- pessoa real, nenhum dado do Drive do cliente, nenhum segredo. Conferido por
--   node supabase/checar-seed.mjs supabase/dados/demo_telas_seed.sql
--
-- ORDEM DE EXECUÇÃO
--   1. supabase/seed.sql e supabase/dados/*.sql (ou ~/Downloads/carga-demo-completa.sql,
--      que é o mesmo conteúdo em um arquivo só);
--   2. ESTE arquivo, uma vez, no SQL Editor do Supabase (ou por psql), como o
--      dono das tabelas ("postgres"), igual ao seed.sql. É uma transação só:
--      se der erro, nada é gravado.
--
-- IDEMPOTÊNCIA: pode rodar de novo. Cada bloco só insere o que ainda não
-- existe (famílias pela chave "Família Teste <Nome>", demais linhas pelo
-- título, descrição ou chave natural). Não apaga nem altera nada que o
-- seed.sql criou, exceto UPDATEs nas linhas criadas por ESTE arquivo (estado
-- do pós-venda e das tarefas que os gatilhos abrem sozinhos).
--
-- DATAS: tudo relativo a hoje (current_date / now() com intervalos, fuso
-- America/Sao_Paulo), para o dado nunca ficar velho. Os 6 últimos meses ficam
-- cobertos para os gráficos de receita, NPS, funil, capacidade e marketing.
--
-- COMO O ARQUIVO É ORGANIZADO
--    1. Equipe extra, pacotes, as 41 famílias do "ciclo completo" (da venda ao
--       pós-venda, 6 meses de história) e os 28 leads do funil (pessoas,
--       bebês, médicos, oportunidades)
--    2. Comercial: sessões de venda, contratos, cobranças, notas fiscais,
--       tarefas do comercial, indicações e marketing
--    3. Operação: acompanhamentos, designações, visitas, registros, pré-natal,
--       alertas clínicos, ocorrências, evoluções e pós-venda
--    4. Financeiro: despesas, extrato, pagamento da equipe
--    5. Gestão: equipe (documentos, folgas), talentos, manuais e trilhas,
--       portal da família, tarefas por equipe, notificações e linha do tempo
--    6. Conversas e mensagens, transferências, consultas da Isadora à equipe,
--       execuções de automações, marketing de captação, copiloto e saúde
--       (os parceiros médicos e as indicações entram na seção 2)
-- =============================================================================

begin;

set local search_path = public, extensions;
set local timezone = 'America/Sao_Paulo';

-- CPF fictício com dígitos verificadores válidos (nunca um CPF real: a base
-- sai de um número de série, não de pessoa).
create function pg_temp.cpf_demo(n integer) returns text
language plpgsql immutable as $f$
declare
  b text := lpad((300000000 + n * 104729)::text, 9, '0');
  s1 integer := 0;
  s2 integer := 0;
  d1 integer;
  d2 integer;
begin
  for i in 1..9 loop
    s1 := s1 + substr(b, i, 1)::integer * (11 - i);
  end loop;
  d1 := (s1 * 10) % 11 % 10;
  b := b || d1::text;
  for i in 1..10 loop
    s2 := s2 + substr(b, i, 1)::integer * (12 - i);
  end loop;
  d2 := (s2 * 10) % 11 % 10;
  b := b || d2::text;
  return substr(b, 1, 3) || '.' || substr(b, 4, 3) || '.' || substr(b, 7, 3) || '-' || substr(b, 10, 2);
end;
$f$;

-- -----------------------------------------------------------------------------
-- 0. Perfis de teste e profissionais do seed.sql
-- -----------------------------------------------------------------------------
create temp table demo_perfil (chave text primary key, id uuid not null);
insert into demo_perfil (chave, id)
select split_part(email, '.', 1), id from perfil where email like '%.teste@kraamzorgbrasil.test';

do $$
begin
  if (select count(*) from demo_perfil) < 6 then
    raise exception 'demo_telas_seed: rode antes o supabase/seed.sql (faltam os perfis de teste por papel)';
  end if;
end $$;

-- Equipe extra (todas fictícias): mais profissionais para a escala e a agenda.
insert into profissional (usuario_id, nome, funcao, conselho, conselho_uf, conselho_numero,
                          telefone_e164, regioes, vinculo, valor_hora_centavos,
                          adicional_deslocamento_centavos, ativa)
select null, v.nome, v.funcao, 'COREN', v.uf::char(2), v.conselho_numero, v.telefone,
       array[(select r.id from regiao r where r.nome = v.regiao)],
       v.vinculo::vinculo_profissional, v.valor_hora, v.adicional, true
from (values
  ('Profissional Teste Sul 4',   'enfermeira_obstetrica', 'SP', 'TESTE-SP-0004', '+5511900000207', 'São Paulo', 'pj',        10000, 0),
  ('Profissional Teste Sul 5',   'enfermeira_neonatal',   'SP', 'TESTE-SP-0005', '+5511900000208', 'São Paulo', 'mei',       10000, 0),
  ('Profissional Teste Sul 6',   'enfermeira_neonatal',   'SP', 'TESTE-SP-0006', '+5511900000210', 'São Paulo', 'pj',        10000, 0),
  ('Profissional Teste Sul 7',   'enfermeira_obstetrica', 'SP', 'TESTE-SP-0007', '+5511900000211', 'São Paulo', 'clt',       10000, 0),
  ('Profissional Teste Norte 2', 'enfermeira_obstetrica', 'PR', 'TESTE-PR-0002', '+5511900000209', 'Londrina',  'autonoma',  10000, 10000)
) as v(nome, funcao, uf, conselho_numero, telefone, regiao, vinculo, valor_hora, adicional)
where not exists (select 1 from profissional p where p.nome = v.nome);

create temp table demo_prof (chave text primary key, id uuid not null);
insert into demo_prof (chave, id)
select v.chave, p.id
from (values
  ('sul_1', 'Profissional Teste Sul 1'), ('sul_2', 'Profissional Teste Sul 2'),
  ('sul_3', 'Profissional Teste Sul 3'), ('sul_4', 'Profissional Teste Sul 4'),
  ('sul_5', 'Profissional Teste Sul 5'), ('sul_6', 'Profissional Teste Sul 6'), ('sul_7', 'Profissional Teste Sul 7'),
  ('norte_1', 'Profissional Teste Norte 1'),
  ('norte_2', 'Profissional Teste Norte 2'), ('coord', 'Profissional Teste Coordenação')
) as v(chave, nome)
join profissional p on p.nome = v.nome;

-- Pacotes na versão vigente (preços do banco, nunca no código)
create temp table demo_pv (nome text primary key, pacote_id uuid, pv_id uuid, valor integer, horas numeric, dias integer);
insert into demo_pv (nome, pacote_id, pv_id, valor, horas, dias)
select p.nome, p.id, pv.id, pv.valor_centavos, pv.horas_por_visita, p.dias
from pacote p join pacote_versao pv on pv.pacote_id = p.id
where pv.vigencia_fim is null;

-- -----------------------------------------------------------------------------
-- 1. Famílias do "ciclo completo" (contrato, pagamento, atendimento, pós-venda)
--    s     = dias desde a assinatura do contrato
--    nasc  = dias (relativos a hoje) até o nascimento (nulo: ainda não nasceu)
--    dpp   = dias (relativos a hoje) até a data provável do parto (estimativa)
--    fase  = enc (encerrado), exec (em atendimento), nasceu (aguarda a alta),
--            pre (aguardando o nascimento)
-- -----------------------------------------------------------------------------
create temp table demo_c (
  chave text primary key, mae text, tel integer, cidade text, bairro text,
  origem origem_lead, codigo text, pacote text, forma text, s integer,
  nasc integer, dpp integer, fase text, p2 estagio_p2, titular text, backup text,
  nps integer, pv text, gem boolean, prim boolean
);
insert into demo_c values
  ('alba',  'Luciana',  611, 'São Paulo',              'Pinheiros',     'instagram_organico', 'IGBIO',  'Essencial',         'cartao_3x', 175, -115, -111, 'enc',    'atendimento_liberado',       'sul_1',   'sul_3',   10,   'arquivado',        false, true),
  ('bela',  'Priscila', 612, 'São Paulo',              'Vila Madalena', 'meta_ads',           'META',   'Imersão',           'cartao_3x', 160, -108, -106, 'enc',    'atendimento_liberado',       'sul_2',   'sul_1',   9,    'acao_executada',   false, false),
  ('cora',  'Tatiane',  613, 'Alphaville',             'Alphaville',    'google',             'GOOGLE', 'Essencial',         'pix',       140,  -70,  -72, 'enc',    'atendimento_liberado',       'sul_3',   'sul_2',   7,    'classificado',     false, true),
  ('dana',  'Mariana',  614, 'São Bernardo do Campo',  'Centro',        'indicacao_cliente',  null,     'Essencial',         'cartao_3x', 125,  -80,  -79, 'enc',    'atendimento_liberado',       'sul_1',   'sul_3',   3,    'classificado',     false, false),
  ('elis',  'Cristina', 615, 'Londrina',               'Gleba Palhano', 'site',               'SITE',   'Essencial',         'pix',       110,  -50,  -52, 'enc',    'atendimento_liberado',       'norte_1', 'norte_2', 10,   'acao_executada',   false, true),
  ('fabi',  'Roberta',  616, 'São Paulo',              'Moema',         'indicacao_medica',   null,     'Essencial',         'cartao_3x',  95,  -40,  -39, 'enc',    'atendimento_liberado',       'sul_2',   'sul_1',   8,    'classificado',     false, false),
  ('gabi',  'Débora',   617, 'Granja Viana',           'Granja Viana',  'instagram_organico', 'IGBIO',  'Essencial',         'cartao_3x',  80,  -35,  -37, 'enc',    'atendimento_liberado',       'sul_3',   'sul_1',   null, 'pesquisa_enviada', false, true),
  ('hana',  'Simone',   618, 'São Paulo',              'Lapa',          'google',             'GOOGLE', 'Gemelar Essencial', 'pix',        65,  -15,  -18, 'enc',    'atendimento_liberado',       'sul_1',   'sul_4',   null, 'protocolo',        true,  false),
  ('iva',   'Tânia',    601, 'São Paulo',              'Santana',       'instagram_organico', 'IGBIO',  'Essencial',         'cartao_3x', 205, -150, -147, 'enc',    'atendimento_liberado',       'sul_3',   'sul_2',   9,    'arquivado',        false, true),
  ('jaci',  'Rosângela',603, 'São Paulo',              'Santo Amaro',   'google',             'GOOGLE', 'Essencial',         'pix',       141,  -78,  -76, 'enc',    'atendimento_liberado',       'sul_1',   'sul_2',   8,    'classificado',     false, false),
  ('zana',  'Eliane',   602, 'São Paulo',              'Vila Formosa',  'meta_ads',           'META',   'Essencial',         'pix',        24,  -11,  -12, 'enc',    'atendimento_liberado',       'sul_2',   'sul_4',   10,   'classificado',     false, false),
  ('ema',     'Ariane',   681, 'São Paulo',              'Bela Vista',    'instagram_organico', 'IGBIO',  'Essencial',         'cartao_3x',  85,  -35,  -37, 'enc',    'atendimento_liberado',       'sul_1',   'sul_3',   10,   'arquivado',        false, true),
  ('fatima',  'Rebeca',   682, 'São Paulo',              'Vila Carrão',   'meta_ads',           'META',   'Essencial',         'pix',        80,  -30,  -30, 'enc',    'atendimento_liberado',       'sul_2',   'sul_4',   9,    'acao_executada',   false, false),
  ('gema',    'Talita',   683, 'Londrina',               'Vila Brasil',   'google',             'GOOGLE', 'Essencial',         'pix',        74,  -24,  -26, 'enc',    'atendimento_liberado',       'norte_1', 'norte_2', 8,    'classificado',     false, true),
  ('hilda',   'Viviane',  684, 'Alphaville',             'Alphaville',    'site',               'SITE',   'Imersão',           'cartao_3x',  68,  -18,  -20, 'enc',    'atendimento_liberado',       'sul_4',   'sul_1',   10,   'acao_executada',   false, false),
  ('ivone',   'Mônica',   685, 'São Paulo',              'Pompeia',       'indicacao_cliente',  null,     'Essencial',         'cartao_3x', 110,  -60,  -62, 'enc',    'atendimento_liberado',       'sul_3',   'sul_2',   9,    'arquivado',        false, true),
  ('jussara', 'Raquel',   686, 'São Bernardo do Campo',  'Baeta Neves',   'instagram_organico', 'IGBIO',  'Essencial',         'pix',       100,  -50,  -52, 'enc',    'atendimento_liberado',       'sul_1',   'sul_2',   6,    'classificado',     false, false),
  ('karen',   'Sueli',    687, 'São Paulo',              'Cidade Ademar', 'meta_ads',           'META',   'Essencial',         'pix',       145,  -95,  -97, 'enc',    'atendimento_liberado',       'sul_2',   'sul_3',   10,   'arquivado',        false, true),
  ('lidia',   'Giovana',  688, 'Londrina',               'Higienópolis',  'site',               'SITE',   'Essencial',         'pix',       138,  -88,  -90, 'enc',    'atendimento_liberado',       'norte_1', 'norte_2', 7,    'classificado',     false, false),
  ('magda',   'Nayara',   689, 'São Paulo',              'Santa Efigênia','google',             'GOOGLE', 'Essencial',         'cartao_3x', 130,  -80,  -82, 'enc',    'atendimento_liberado',       'sul_4',   'sul_1',   9,    'acao_executada',   false, true),
  ('neusa',   'Helen',    691, 'São Paulo',              'Vila Maria',    'instagram_organico', 'IGBIO',  'Essencial',         'pix',        62,  -10,  -12, 'enc',    'atendimento_liberado',       'sul_3',   'sul_4',   10,   'classificado',     false, true),
  ('odete',   'Cíntia',   692, 'São Paulo',              'Cursino',       'meta_ads',           'META',   'Essencial',         'pix',        60,  -10,  -11, 'enc',    'atendimento_liberado',       'sul_1',   'sul_3',   9,    'classificado',     false, false),
  ('pamela',  'Lorena',   693, 'Santo André',            'Campestre',     'google',             'GOOGLE', 'Essencial',         'cartao_3x',  58,   -9,  -10, 'enc',    'atendimento_liberado',       'sul_2',   'sul_1',   8,    'classificado',     false, true),
  ('quiteria','Sheila',   694, 'São Paulo',              'Jabaquara',     'site',               'SITE',   'Essencial',         'pix',        57,   -9,   -9, 'enc',    'atendimento_liberado',       'sul_4',   'sul_2',   10,   'classificado',     false, false),
  ('pia',   'Elaine',   621, 'São Paulo',              'Vila Olímpia',  'meta_ads',           'META',   'Essencial',         'cartao_3x',  75,   -5,   -8, 'exec',   'atendimento_liberado',       'sul_2',   'sul_1',   null, null,               false, true),
  ('nair',  'Gisele',   622, 'São Paulo',              'Brooklin',      'site',               'SITE',   'Imersão',           'pix',        80,   -4,   -3, 'exec',   'atendimento_liberado',       'sul_4',   'sul_3',   null, null,               false, false),
  ('lia',   'Amanda',   623, 'São Paulo',              'Saúde',         'instagram_organico', 'IGBIO',  'Essencial',         'cartao_3x',  70,   -3,   -5, 'exec',   'atendimento_liberado',       'sul_1',   'sul_3',   null, null,               false, true),
  ('rita',  'Carolina', 624, 'São Caetano do Sul',     'Santo Antônio', 'indicacao_cliente',  null,     'Essencial',         'pix',        66,   -2,   -2, 'exec',   'atendimento_liberado',       'sul_1',   'sul_3',   null, null,               false, false),
  ('tuca',  'Flávia',   625, 'Londrina',               'Centro',        'site',               'SITE',   'Essencial',         'cartao_3x',  58,   -3,   -4, 'exec',   'atendimento_liberado',       'norte_1', 'norte_2', null, null,               false, true),
  ('sara',  'Paula',    626, 'São Paulo',              'Ipiranga',      'google',             'GOOGLE', 'Essencial',         'cartao_3x',  95,   -8,   -9, 'exec',   'atendimento_liberado',       'sul_3',   'sul_2',   null, null,               false, false),
  ('uma',   'Bianca',   627, 'São Paulo',              'Tatuapé',       'meta_ads',           'META',   'Essencial',         'pix',       100,   -6,   -7, 'exec',   'atendimento_liberado',       'sul_2',   'sul_4',   null, null,               false, true),
  ('vera',  'Letícia',  631, 'Santo André',            'Jardim',        'indicacao_medica',   null,     'Essencial',         'pix',        30,   -1,   -3, 'nasceu', 'aguardando_alta',            'sul_4',   'sul_3',   null, null,               false, false),
  ('xana',  'Thaís',    632, 'São Paulo',              'Mooca',         'instagram_organico', 'IGBIO',  'Essencial',         'cartao_3x', 105,    0,   -2, 'nasceu', 'bebe_nasceu',                'sul_3',   'sul_1',   null, null,               false, true),
  ('ines',  'Karina',   641, 'São Paulo',              'Perdizes',      'google',             'GOOGLE', 'Essencial',         'cartao_3x',  55, null,   20, 'pre',    'aguardando_nascimento',      'sul_2',   'sul_1',   null, null,               false, true),
  ('jana',  'Vivian',   642, 'Londrina',               'Centro',        'site',               'SITE',   'Essencial',         'pix',        35, null,    5, 'pre',    'enfermeira_designada',       'norte_2', 'norte_1', null, null,               false, false),
  ('kely',  'Natália',  643, 'Alphaville',             'Alphaville',    'meta_ads',           'META',   'Essencial',         'parcelado',  45, null,   50, 'pre',    'consulta_prenatal_agendada', 'sul_6',   'sul_4',   null, null,               false, true),
  ('lara',  'Bruna',    644, 'São Paulo',              'Vila Mariana',  'instagram_organico', 'IGBIO',  'Gemelar Essencial', 'parcelado',  18, null,   42, 'pre',    'nota_fiscal_emitida',        'sul_4',   'sul_3',   null, null,               true,  false),
  ('mila',  'Cláudia',  645, 'São Bernardo do Campo',  'Rudge Ramos',   'indicacao_cliente',  null,     'Essencial',         'cartao_3x',  12, null,   90, 'pre',    'pagamento_confirmado',       'sul_2',   'sul_1',   null, null,               false, true),
  ('nina',  'Adriana',  646, 'São Paulo',              'Itaim Bibi',    'google',             'GOOGLE', 'Imersão',           'pix',         9, null,  100, 'pre',    'assinado',                   null,      null,      null, null,               false, false),
  ('olga',  'Márcia',   647, 'Londrina',               'Gleba Palhano', 'meta_ads',           'META',   'Essencial',         'pix',         1, null,  110, 'pre',    'pagamento_confirmado',       'sul_2',   null,      null, null,               false, true),
  ('pati',  'Sabrina',  648, 'Barueri',                'Centro',        'site',               'SITE',   'Essencial',         'pix',         7, null,   60, 'pre',    'aguardando_assinatura',      null,      null,      null, null,               false, false);

-- Leads do funil (pipeline 1 e negociações). criado = dias desde a entrada.
create temp table demo_l (
  chave text primary key, mae text, tel integer, cidade text, bairro text,
  origem origem_lead, codigo text, criado integer, dpp integer,
  p1 estagio_p1, p2 estagio_p2, score integer, classif classificacao_lead,
  motivo motivo_perda, pacote text, sensivel estado_sensivel
);
insert into demo_l values
  ('ana',    'Fernanda', 651, 'São Paulo',   'Vila Prudente', 'instagram_organico', 'IGBIO',  172,  -60, 'perdido',               null,             28, 'frio',   'preco',                       null,         'normal'),
  ('bia',    'Gabriela', 652, 'São Paulo',   'Jabaquara',     'meta_ads',           'META',   160,  -50, 'perdido',               null,             35, 'frio',   'optou_outro_servico',         null,         'normal'),
  ('cleo',   'Renata',   653, 'São Paulo',   'Casa Verde',    'google',             'GOOGLE', 150,  -40, 'perdido',               null,             22, 'frio',   'sem_resposta',                null,         'normal'),
  ('dora',   'Aline',    654, 'São Paulo',   'Penha',         'site',               'SITE',   138,  -35, 'nao_qualificado',       null,             20, 'frio',   null,                          null,         'normal'),
  ('eva',    'Sandra',   655, 'Campinas',    'Cambuí',        'instagram_organico', 'IGBIO',  130,  -30, 'fora_de_cobertura',     null,             15, 'frio',   null,                          null,         'normal'),
  ('fani',   'Joana',    656, 'São Paulo',   'Butantã',       'meta_ads',           'META',   118,  -22, 'perdido',               null,             40, 'morno',  'sem_disponibilidade',         null,         'normal'),
  ('gil',    'Marta',    657, 'São Paulo',   'Santana',       'indicacao_amigo',    null,     110,   10, 'nutricao',              null,             33, 'frio',   null,                          null,         'normal'),
  ('hebe',   'Vitória',  658, 'Londrina',    'Centro',        'google',             'GOOGLE',  97,  -12, 'perdido',               null,             30, 'frio',   'achou_que_nao_precisaria',    null,         'normal'),
  ('isa',    'Daniela',  659, 'São Paulo',   'Vila Sônia',    'indicacao_cliente',  null,      90,  -10, 'perdido',               null,             38, 'morno',  'familia_assumiu',             null,         'normal'),
  ('jo',     'Bárbara',  660, 'São Paulo',   'Liberdade',     'meta_ads',           'META',    84,   40, 'nutricao',              null,             36, 'frio',   null,                          null,         'normal'),
  ('kika',   'Lúcia',    661, 'Sorocaba',    'Centro',        'google',             'GOOGLE',  70,   25, 'fora_de_cobertura',     null,             12, 'frio',   null,                          null,         'normal'),
  ('lis',    'Rosana',   662, 'São Paulo',   'Cambuci',       'site',               'SITE',    62,  -20, 'perdido',               null,             0,  'frio',   'perda_gestacional',           null,         'encerrado_sensivel'),
  ('mel',    'Tereza',   663, 'São Paulo',   'Barra Funda',   'indicacao_medica',   null,      55,   30, 'perdido',               null,             45, 'morno',  'sem_interesse',               null,         'normal'),
  ('nube',   'Elisa',    664, 'São Paulo',   'Vila Leopoldina','instagram_organico','IGBIO',   48,   75, 'sessao_venda_realizada', null,             72, 'quente', null,                          'Essencial',  'normal'),
  ('opal',   'Silvia',   665, 'São Paulo',   'Campo Belo',    'google',             'GOOGLE',  40,   70, 'qualificado',           'em_negociacao',  80, 'quente', null,                          'Imersão',    'normal'),
  ('pera',   'Lívia',    666, 'Londrina',    'Centro',        'meta_ads',           'META',    33,   90, 'qualificado',           null,             68, 'quente', null,                          'Essencial',  'normal'),
  ('quenia', 'Heloísa',  667, 'São Paulo',   'Santa Cecília', 'site',               'SITE',    28,   65, 'sessao_venda_realizada', null,             75, 'quente', null,                          'Essencial',  'normal'),
  ('rosa',   'Michele',  668, 'São Paulo',   'Vila Clementino','google',            'GOOGLE',  24,   85, 'sessao_venda_agendada', null,             78, 'quente', null,                          'Essencial',  'normal'),
  ('sol',    'Ingrid',   669, 'São Paulo',   'Ipiranga',      'instagram_organico', 'IGBIO',   20,  120, 'nutricao',              null,             30, 'frio',   null,                          null,         'normal'),
  ('tati',   'Renata',   653, 'São Paulo',   'Casa Verde',    'instagram_organico', 'IGBIO',   14,  150, 'em_conversa_ia',        null,             42, 'morno',  null,                          null,         'normal'),
  ('uva',    'Patrícia', 671, 'São Caetano do Sul','Centro',  'meta_ads',           'META',     9,   95, 'qualificado',           null,             70, 'quente', null,                          'Essencial',  'normal'),
  ('vilma',  'Jéssica',  672, 'São Paulo',   'Água Branca',   'indicacao_medica',   null,       6,  100, 'em_conversa_ia',        null,             48, 'morno',  null,                          null,         'normal'),
  ('yara',   'Beatriz',  673, 'São Paulo',   'Pompeia',       'instagram_organico', 'IGBIO',    3,  130, 'novo',                  null,             null,null,    null,                          null,         'normal'),
  ('zeli',   'Beatriz',  673, 'São Paulo',   'Pompeia',       'google',             'GOOGLE',   1,  130, 'novo',                  null,             null,null,    null,                          null,         'normal'),
  ('dalva',  'Nádia',    674, 'São Paulo',   'Vila Guilherme','meta_ads',           'META',    75,   -5, 'qualificado',           'cancelado',      60, 'morno',  null,                          'Essencial',  'normal'),
  ('edna',   'Olívia',   675, 'São Paulo',   'Jardim Paulista','google',            'GOOGLE', 100,  -15, 'qualificado',           'distrato',       70, 'morno',  null,                          'Essencial',  'normal'),
  ('fran',   'Valéria',  676, 'São Paulo',   'Morumbi',       'instagram_organico', 'IGBIO',   16,   80, 'qualificado',           'ganho',          88, 'quente', null,                          'Essencial',  'normal'),
  ('giza',   'Débora',   677, 'Alphaville',  'Alphaville',    'indicacao_cliente',  null,      11,   72, 'qualificado',           'contrato_gerado',86, 'quente', null,                          'Imersão',    'normal');

-- Sobrenome de cada família de teste: nomes longos e sem terminação em comum, para a
-- detecção de duplicatas não achar "provável duplicata" em todo par de famílias
-- (todas se chamam "Família Teste ...", e o limiar de nome é 0,6).
create temp table demo_nome (chave text primary key, sobre text not null);
insert into demo_nome (chave, sobre) values
  ('alba', 'Albuquerque'),
  ('bela', 'Bittencourt'),
  ('cora', 'Cavalcanti'),
  ('dana', 'Drummond'),
  ('elis', 'Esteves'),
  ('fabi', 'Figueiredo'),
  ('gabi', 'Gusmão'),
  ('hana', 'Holanda'),
  ('iva', 'Ibiapina'),
  ('jaci', 'Jordão'),
  ('zana', 'Zanetti'),
  ('pia', 'Pimentel'),
  ('nair', 'Nogueira'),
  ('lia', 'Lacerda'),
  ('rita', 'Rezende'),
  ('tuca', 'Tolentino'),
  ('sara', 'Santoro'),
  ('uma', 'Ubaldo'),
  ('vera', 'Valença'),
  ('xana', 'Xavier'),
  ('ines', 'Ildefonso'),
  ('jana', 'Jaguaribe'),
  ('kely', 'Kronenberg'),
  ('lara', 'Linhares'),
  ('mila', 'Malta Ferraz'),
  ('nina', 'Nascimento'),
  ('olga', 'Osório'),
  ('ana', 'Andrade'),
  ('bia', 'Barroso'),
  ('cleo', 'Cordeiro'),
  ('dora', 'Dutra'),
  ('eva', 'Evangelista'),
  ('fani', 'Fontoura'),
  ('gil', 'Goulart'),
  ('hebe', 'Henriques'),
  ('isa', 'Ibirapuera'),
  ('jo', 'Jacobina'),
  ('kika', 'Konder'),
  ('lis', 'Lisboa'),
  ('mel', 'Mendonça'),
  ('nube', 'Nepomuceno'),
  ('opal', 'Orlandi'),
  ('pera', 'Peçanha'),
  ('quenia', 'Quintanilha'),
  ('rosa', 'Rodrigues'),
  ('sol', 'Sampaio'),
  ('tati', 'Tabosa'),
  ('uva', 'Urquiza'),
  ('vilma', 'Vasconcelos'),
  ('yara', 'Yamamoto'),
  ('zeli', 'Zacarias'),
  ('dalva', 'Dornelas'),
  ('edna', 'Eufrásio'),
  ('fran', 'Fagundes'),
  ('giza', 'Garrido'),
  ('pati', 'Portugal'),
  ('ema', 'Albernaz'),
  ('fatima', 'Bragança'),
  ('gema', 'Camargo'),
  ('hilda', 'Domingues'),
  ('ivone', 'Escobar'),
  ('jussara', 'Ferrante'),
  ('karen', 'Gouveia'),
  ('lidia', 'Hipólito'),
  ('magda', 'Itapemirim'),
  ('neusa', 'Kerber'),
  ('odete', 'Mascarenhas'),
  ('pamela', 'Lemgruber'),
  ('quiteria', 'Quaresma');

-- Tabela única de famílias (ciclo + leads) que alimenta as inserções abaixo.
create temp table demo_fam (
  chave text primary key,
  familia_id uuid not null default gen_random_uuid(),
  sob text not null,
  tipo text not null,
  mae text, tel integer, cidade text, bairro text, origem origem_lead, codigo text,
  criado timestamptz, dpp date, nasc date, alta date, inicio date,
  gemelar boolean, primeira boolean, sensivel estado_sensivel
);

insert into demo_fam (chave, sob, tipo, mae, tel, cidade, bairro, origem, codigo, criado, dpp, nasc, alta, inicio, gemelar, primeira, sensivel)
select c.chave, n.sobre, 'c', c.mae, c.tel, c.cidade, c.bairro, c.origem, c.codigo,
       now() - make_interval(days => c.s + 12, hours => 2 + (c.tel % 7)),
       current_date + c.dpp,
       case when c.nasc is null then null else current_date + c.nasc end,
       case when c.fase in ('enc', 'exec') then current_date + c.nasc + 2 end,
       case when c.fase in ('enc', 'exec') then current_date + c.nasc + 2 end,
       c.gem, c.prim, 'normal'
from demo_c c
join demo_nome n on n.chave = c.chave
where not exists (select 1 from familia f where f.nome_exibicao = 'Família Teste ' || n.sobre);

insert into demo_fam (chave, sob, tipo, mae, tel, cidade, bairro, origem, codigo, criado, dpp, nasc, alta, inicio, gemelar, primeira, sensivel)
select l.chave, n.sobre, 'l', l.mae, l.tel, l.cidade, l.bairro, l.origem, l.codigo,
       now() - make_interval(days => l.criado, hours => 1 + (l.tel % 9)),
       current_date + l.dpp, null, null, null, false, (l.tel % 2 = 0), l.sensivel
from demo_l l
join demo_nome n on n.chave = l.chave
where not exists (select 1 from familia f where f.nome_exibicao = 'Família Teste ' || n.sobre);

insert into familia (id, nome_exibicao, cidade_id, regiao_id, bairro, endereco_atendimento,
                     dpp, data_nascimento, data_alta, data_inicio_efetivo, gemelar, primeira_gestacao,
                     estado_sensivel, estado_sensivel_motivo, estado_sensivel_em, estado_sensivel_por,
                     nao_contatar, nao_contatar_em, nao_contatar_motivo,
                     origem, codigo_origem, utm, criado_em, cidade_informada)
select d.familia_id, 'Família Teste ' || d.sob, ci.id, ci.regiao_id, d.bairro,
       jsonb_build_object('rua', 'Rua Teste ' || initcap(d.chave), 'numero', (10 + d.tel % 90)::text),
       d.dpp, d.nasc, d.alta, d.inicio, d.gemelar, d.primeira,
       d.sensivel,
       case when d.sensivel <> 'normal' then 'Perda gestacional relatada à equipe. Contato só por pessoa, com cuidado.' end,
       case when d.sensivel <> 'normal' then d.criado + interval '3 days' end,
       case when d.sensivel <> 'normal' then (select id from demo_perfil where chave = 'coordenacao') end,
       d.sensivel = 'encerrado_sensivel',
       case when d.sensivel = 'encerrado_sensivel' then d.criado + interval '3 days' end,
       case when d.sensivel = 'encerrado_sensivel' then 'Pedido da família após a perda gestacional.' end,
       d.origem, d.codigo,
       case when d.codigo is not null and d.origem in ('instagram_organico', 'meta_ads', 'google')
            then jsonb_build_object('utm_source', case d.origem when 'meta_ads' then 'meta' when 'google' then 'google' else 'instagram' end,
                                    'utm_campaign', 'teste_' || d.chave) end,
       d.criado, d.cidade
from demo_fam d
join cidade ci on ci.nome = d.cidade;

-- Pessoas: mãe (contato principal) e, em metade das famílias, o parceiro.
insert into pessoa (familia_id, papel, nome, telefone_e164, email, idade, contato_principal, consentimentos, criado_em)
select d.familia_id, 'mae', d.mae || ' Teste ' || d.sob, '+5511900000' || d.tel,
       'mae.teste.' || d.chave || '@exemplo.test', 25 + d.tel % 12, true,
       jsonb_build_object('lgpd_dados_saude', jsonb_build_object('aceito', true, 'versao', '1',
         'em', to_char(d.criado + interval '1 day', 'YYYY-MM-DD"T"HH24:MI:SS'), 'canal', 'formulario')),
       d.criado
from demo_fam d;

insert into pessoa (familia_id, papel, nome, telefone_e164, email, idade, contato_principal, consentimentos, criado_em)
select d.familia_id, 'parceiro',
       (array['Rafael', 'Bruno', 'Diego', 'Felipe', 'Thiago'])[1 + d.tel % 5] || ' Teste ' || d.sob,
       '+5511900000' || (d.tel + 100), 'parceiro.teste.' || d.chave || '@exemplo.test', 27 + d.tel % 12, false,
       jsonb_build_object('lgpd_dados_saude', jsonb_build_object('aceito', true, 'versao', '1',
         'em', to_char(d.criado + interval '1 day', 'YYYY-MM-DD"T"HH24:MI:SS'), 'canal', 'formulario')),
       d.criado
from demo_fam d
where d.tel % 2 = 0 and d.tipo = 'c';

-- Dados de contrato (só quem já tem contrato: o ciclo completo)
insert into pessoa_dados_contrato (pessoa_id, cpf, data_nascimento, endereco_residencial, preenchido_via)
select p.id, pg_temp.cpf_demo(d.tel), date '1990-01-01' + (d.tel * 37 % 3000),
       jsonb_build_object('rua', 'Rua Teste ' || initcap(d.chave), 'numero', (10 + d.tel % 90)::text,
                          'cidade', d.cidade, 'uf', ci.uf, 'cep', '01000-000'),
       'formulario_seguro'
from demo_fam d
join pessoa p on p.familia_id = d.familia_id and p.papel = 'mae'
join cidade ci on ci.nome = d.cidade
where d.tipo = 'c' and d.chave not in ('pati')
  and not exists (select 1 from pessoa_dados_contrato x where x.pessoa_id = p.id);

-- Bebês de quem já nasceu (gemelar: dois)
insert into bebe (familia_id, ordem, nome, sexo, data_nascimento, peso_nascimento_g, peso_alta_g, tipo_parto, criado_em)
select d.familia_id, g.ordem, 'Bebê Teste ' || d.sob || case when d.gemelar then ' ' || g.ordem else '' end,
       case when (d.tel + g.ordem) % 2 = 0 then 'feminino' else 'masculino' end,
       d.nasc, 2600 + (d.tel * 13 % 900), 2540 + (d.tel * 13 % 900),
       case when d.tel % 3 = 0 then 'vaginal' else 'cesarea' end,
       d.nasc::timestamptz + interval '1 day'
from demo_fam d
cross join lateral generate_series(1, case when d.gemelar then 2 else 1 end) as g(ordem)
where d.nasc is not null;
-- peso de alta só de quem já teve alta
update bebe set peso_alta_g = null
where familia_id in (select familia_id from demo_fam where alta is null and nasc is not null);

-- Médicos de cada família que já passou do pré-natal (contato para a evolução)
insert into medico (familia_id, especialidade, nome, telefone_e164, email, hospital, origem_cadastro, capturado_em)
select d.familia_id, v.esp::especialidade_medico,
       case v.esp when 'obstetra' then 'Dra. ' else 'Dr. ' end ||
         (array['Helena', 'Marcos', 'Beatriz', 'Otávio', 'Lúcia', 'Ricardo'])[1 + (d.tel + v.k) % 6] || ' Teste ' ||
         case v.esp when 'obstetra' then 'Obstetra ' else 'Pediatra ' end || d.sob,
       '+5511900000' || (410 + (d.tel % 100) * 2 + v.k), v.esp || '.teste.' || d.chave || '@exemplo.test',
       'Hospital Teste ' || d.cidade, 'prenatal', d.criado + interval '20 days'
from demo_fam d
cross join (values ('obstetra', 0), ('pediatra', 1)) as v(esp, k)
join demo_c c on c.chave = d.chave
where c.fase in ('enc', 'exec', 'nasceu') or c.chave in ('ines', 'jana');

-- Oportunidades --------------------------------------------------------------
-- Ciclo completo: pipeline 2 no estágio da história (dono da tabela pode
-- inserir o estágio final, como o seed.sql faz).
insert into oportunidade (familia_id, pipeline, estagio_p1, estagio_p2, score, classificacao, responsavel_id,
                          plano_interesse_pacote_id, pagamento_preferido, qualificacao, pdf_enviado_em,
                          sessao_interesse_em, cadencia_etapa, criado_em)
select d.familia_id, 2, 'qualificado', c.p2, 80 + d.tel % 16, 'quente',
       (select id from demo_perfil where chave = 'comercial'),
       pv.pacote_id, case c.forma when 'pix' then 'pix' else 'cartao_3x' end,
       jsonb_build_object('rede_apoio', 'parceiro e família por perto', 'principal_preocupacao',
                          (array['amamentação', 'sono do bebê', 'recuperação do parto'])[1 + d.tel % 3],
                          'parceiro_participa', d.tel % 2 = 0),
       d.criado + interval '3 days', d.criado + interval '5 days', 0, d.criado
from demo_fam d
join demo_c c on c.chave = d.chave
join demo_pv pv on pv.nome = c.pacote;

-- Leads: um estágio de cada, com motivo de perda quando perdido
insert into oportunidade (familia_id, pipeline, estagio_p1, estagio_p2, score, classificacao, responsavel_id,
                          plano_interesse_pacote_id, motivo_perda, motivo_perda_detalhe, pagamento_preferido,
                          qualificacao, pdf_enviado_em, sessao_interesse_em, proximo_contato_em, cadencia_etapa,
                          criado_em)
select d.familia_id, case when l.p2 is null then 1 else 2 end, l.p1, l.p2, l.score, l.classif,
       (select id from demo_perfil where chave = 'comercial'),
       (select pv.pacote_id from demo_pv pv where pv.nome = l.pacote),
       l.motivo,
       case l.motivo
         when 'preco' then 'Achou o valor alto para o momento (dado de demonstração).'
         when 'optou_outro_servico' then 'Fechou com outro serviço da região (dado de demonstração).'
         when 'sem_resposta' then 'Parou de responder depois do envio da apresentação.'
         when 'perda_gestacional' then 'Encerrado com cuidado, sem novo contato.'
       end,
       case when l.p1 in ('qualificado', 'sessao_venda_realizada', 'sessao_venda_agendada') then 'cartao_3x' end,
       case when l.p1 in ('qualificado', 'sessao_venda_realizada', 'sessao_venda_agendada')
            then jsonb_build_object('rede_apoio', 'família por perto', 'principal_preocupacao', 'amamentação',
                                    'parceiro_participa', true, 'disponibilidade_sessao', 'noite') else '{}'::jsonb end,
       case when l.p1 in ('qualificado', 'sessao_venda_realizada', 'sessao_venda_agendada', 'perdido')
            then d.criado + interval '2 days' end,
       case when l.p1 in ('qualificado', 'sessao_venda_realizada', 'sessao_venda_agendada')
            then d.criado + interval '3 days' end,
       case when l.p1 in ('nutricao', 'qualificado', 'em_conversa_ia') then current_date + (l.tel % 6) - 2 end,
       case when l.p1 = 'nutricao' then 1 + l.tel % 3 else 0 end,
       d.criado
from demo_fam d
join demo_l l on l.chave = d.chave;

-- Leads de P2 com desconto/condição (Pix à vista com aprovação já registrada)
update oportunidade o
   set condicao_id = (select id from condicao_comercial where nome = 'Pix à vista'),
       desconto_pct = 5.00,
       desconto_motivo = 'Pix à vista, condição aprovada pela diretoria.',
       desconto_aprovado_por = (select id from demo_perfil where chave = 'diretoria')
from demo_fam d
where o.familia_id = d.familia_id and d.chave in ('giza', 'fran');

-- Mapa de todas as famílias de teste (as do seed.sql e as deste arquivo), por
-- chave sem acento ("aurora", "iris", "opal"...). Os blocos que não nascem
-- junto com a família procuram por aqui, o que os torna idempotentes.
create temp table demo_f (chave text primary key, id uuid not null);
insert into demo_f (chave, id)
select n.chave, f.id
from demo_nome n
join familia f on f.nome_exibicao = 'Família Teste ' || n.sobre;
insert into demo_f (chave, id)
select lower(extensions.unaccent(substr(f.nome_exibicao, 15))), f.id
from familia f
where f.nome_exibicao like 'Família Teste %'
  and not exists (select 1 from demo_nome n where 'Família Teste ' || n.sobre = f.nome_exibicao);

-- =============================================================================
-- 2. COMERCIAL
-- =============================================================================

-- --- Médicos parceiros (sem família), base da tela de parceiros e das indicações
insert into medico (familia_id, especialidade, nome, telefone_e164, email, hospital, origem_cadastro, capturado_em)
select null, v.esp::especialidade_medico, v.nome, v.telefone, v.email, v.hospital, 'parceria', now() - make_interval(days => v.dias)
from (values
  ('obstetra', 'Dra. Cecília Teste Parceira',  '+5511900000801', 'cecilia.teste.parceira@exemplo.test',  'Maternidade Teste Paulista',  150),
  ('obstetra', 'Dr. Álvaro Teste Parceiro',    '+5511900000802', 'alvaro.teste.parceiro@exemplo.test',   'Hospital Teste Vila Nova',    140),
  ('pediatra', 'Dra. Mônica Teste Parceira',   '+5511900000803', 'monica.teste.parceira@exemplo.test',   'Clínica Teste Infantil',      120),
  ('pediatra', 'Dr. Henrique Teste Parceiro',  '+5511900000804', 'henrique.teste.parceiro@exemplo.test', 'Clínica Teste Bem Nascer',     60),
  ('obstetra', 'Dra. Vera Teste Parceira',     '+5511900000805', 'vera.teste.parceira@exemplo.test',     'Hospital Teste Alphaville',   35),
  ('obstetra', 'Dr. Sérgio Teste Parceiro',    '+5511900000806', 'sergio.teste.parceiro@exemplo.test',   'Maternidade Teste Londrina',  90),
  ('pediatra', 'Dra. Paula Teste Parceira',    '+5511900000807', 'paula.teste.parceira@exemplo.test',    'Clínica Teste Pequenos',      170),
  ('outro',    'Dr. Caio Teste Parceiro',      '+5511900000808', 'caio.teste.parceiro@exemplo.test',     'Centro Teste de Lactação',    25)
) as v(esp, nome, telefone, email, hospital, dias)
where not exists (select 1 from medico m where m.nome = v.nome);

insert into privado.parceiro_medico (medico_id, estado, observacao, ultimo_contato_em, proximo_contato_em)
select m.id, v.estado::privado.estado_parceiro, v.obs,
       case when v.ult is null then null else now() - make_interval(days => v.ult) end,
       case when v.prox is null then null else current_date + v.prox end
from (values
  ('Dra. Cecília Teste Parceira',  'ativo',      'Indica com frequência. Gosta de receber o relatório da evolução no mesmo dia.', 20,   10),
  ('Dr. Álvaro Teste Parceiro',    'ativo',      'Pediu material impresso para a sala de espera.',                                  45,   -3),
  ('Dra. Mônica Teste Parceira',   'ativo',      'Atende recém-nascidos da região; prefere contato por WhatsApp.',                  12,   18),
  ('Dr. Henrique Teste Parceiro',  'prospeccao', 'Primeira conversa feita. Combinar uma visita à clínica.',                          8,    2),
  ('Dra. Vera Teste Parceira',     'prospeccao', 'Indicação de uma família. Ainda sem retorno.',                                    35,   -1),
  ('Dr. Sérgio Teste Parceiro',    'pausado',    'Pausou as indicações até o fim do semestre.',                                      90,   null),
  ('Dra. Paula Teste Parceira',    'encerrado',  'Encerrada a parceria a pedido da clínica.',                                       170,   null),
  ('Dr. Caio Teste Parceiro',      'ativo',      'Consultor de lactação; indica famílias de Londrina.',                              6,   25)
) as v(nome, estado, obs, ult, prox)
join medico m on m.nome = v.nome and m.familia_id is null
where not exists (select 1 from privado.parceiro_medico x where x.medico_id = m.id);

-- --- Sessões de venda ----------------------------------------------------------
-- Ciclo completo: uma sessão realizada, 4 dias antes da assinatura.
insert into sessao_venda (familia_id, agendada_para, opcoes_informadas, realizada_em, conduzida_por, link_reuniao,
                          parceiro_presente, status, resultado, criado_em)
select d.familia_id,
       now() - make_interval(days => c.s + 4),
       'Terça às 10h ou quinta às 15h',
       now() - make_interval(days => c.s + 4) + interval '50 minutes',
       (select id from demo_perfil where chave = case when c.tel % 3 = 0 then 'coordenacao' else 'comercial' end),
       'https://meet.exemplo.test/teste-' || c.chave,
       c.tel % 2 = 0, 'realizada',
       'Seguiu para a proposta e fechou o pacote ' || c.pacote || '.',
       now() - make_interval(days => c.s + 6)
from demo_c c
join demo_fam d on d.chave = c.chave;

-- Leads: realizada, agendada, não compareceu, cancelada, remarcada
insert into sessao_venda (familia_id, agendada_para, opcoes_informadas, realizada_em, conduzida_por, link_reuniao,
                          parceiro_presente, status, resultado, criado_em)
select f.id, now() + make_interval(days => v.dias, hours => v.horas), 'Segunda às 19h ou quarta às 11h',
       case when v.status = 'realizada' then now() + make_interval(days => v.dias, hours => v.horas) + interval '45 minutes' end,
       (select id from demo_perfil where chave = v.quem),
       'https://meet.exemplo.test/teste-' || v.chave,
       case when v.status = 'realizada' then true end, v.status::status_sessao, v.resultado,
       least(now() - interval '1 hour', now() + make_interval(days => v.dias - 3))
from (values
  ('nube',   'realizada',      -38, 0, 'comercial',   'Quer a proposta do Essencial; vai conversar com o parceiro.'),
  ('quenia', 'realizada',      -21, 0, 'coordenacao', 'Ficou com dúvida sobre o deslocamento; a coordenação retorna.'),
  ('opal',   'realizada',      -32, 0, 'comercial',   'Em negociação do pacote Imersão.'),
  ('dalva',  'realizada',      -70, 0, 'comercial',   'Fechou, mas depois cancelou o contrato.'),
  ('edna',   'realizada',      -95, 0, 'comercial',   'Fechou o Essencial; distrato depois.'),
  ('fran',   'realizada',       -1, -3, 'comercial',   'Fechou; aguarda os dados do contrato.'),
  ('giza',   'realizada',       -6, 0, 'coordenacao', 'Fechou o Imersão; contrato gerado.'),
  ('mel',    'realizada',      -45, 0, 'comercial',   'Preferiu não seguir neste momento.'),
  ('hebe',   'nao_compareceu', -88, 0, 'comercial',   'Não entrou na reunião e não respondeu depois.'),
  ('fani',   'cancelada',     -110, 0, 'comercial',   'A família cancelou a reunião.'),
  ('bia',    'remarcada',     -150, 0, 'comercial',   'Remarcada a pedido da família.'),
  ('rosa',   'agendada',         2, 0, 'comercial',   null),
  ('pera',   'agendada',         5, 2, 'coordenacao', null),
  ('uva',    'agendada',         0, -4, 'comercial',  null)
) as v(chave, status, dias, horas, quem, resultado)
join demo_f f on f.chave = v.chave
where not exists (select 1 from sessao_venda s where s.familia_id = f.id and s.status = v.status::status_sessao);

-- Transcrição, consentimento e resumo (sessões realizadas de quatro leads)
insert into sessao_venda_gravacao (sessao_id, consentimento_gravacao, consentimento_versao, consentimento_em,
                                   transcricao, resumo)
select s.id, true, '1', s.realizada_em - interval '2 minutes', v.transcricao,
       jsonb_build_object(
         'duvidas', v.duvidas, 'objecoes', v.objecoes, 'plano_interesse', v.plano,
         'proximos_passos', v.passos, 'origem', 'pessoa', 'modelo', null,
         'salvo_por', (select id from demo_perfil where chave = 'comercial'),
         'salvo_em', s.realizada_em + interval '30 minutes')
from (values
  ('nube',   'Atendente: Como você imagina os primeiros dias em casa? Cliente: Tenho receio da amamentação e do banho. Atendente: A enfermeira acompanha cada dia da primeira semana.',
             '["Como funciona a primeira semana", "Se a enfermeira ajuda na amamentação"]'::jsonb, '["Valor do pacote"]'::jsonb, 'Essencial', '["Enviar a proposta", "Conversar com o parceiro"]'::jsonb),
  ('quenia', 'Atendente: Em qual bairro você mora? Cliente: Santa Cecília, perto do metrô. Atendente: Está dentro da nossa área, sem taxa.',
             '["Se há taxa de deslocamento", "Quantas horas por visita"]'::jsonb, '[]'::jsonb, 'Essencial', '["Confirmar o bairro", "Mandar a proposta por WhatsApp"]'::jsonb),
  ('opal',   'Atendente: Qual pacote faz mais sentido para vocês? Cliente: O de presença estendida, mas queremos parcelar. Atendente: Posso apresentar as condições de pagamento.',
             '["Parcelamento no cartão"]'::jsonb, '["Preço acima do esperado"]'::jsonb, 'Imersão', '["Apresentar a condição de pagamento", "Retornar em dois dias"]'::jsonb),
  ('fran',   'Atendente: Ficou alguma dúvida sobre o contrato? Cliente: Não, podemos seguir. Atendente: Vou enviar o formulário seguro para os dados.',
             '["Como funciona o contrato"]'::jsonb, '[]'::jsonb, 'Essencial', '["Enviar o formulário do contrato"]'::jsonb)
) as v(chave, transcricao, duvidas, objecoes, plano, passos)
join demo_f f on f.chave = v.chave
join sessao_venda s on s.familia_id = f.id and s.status = 'realizada'
where not exists (select 1 from sessao_venda_gravacao g where g.sessao_id = s.id);

-- --- Contratos (ciclo completo e leads que chegaram até o contrato) ------------
create temp table demo_k (
  chave text primary key, contrato_id uuid not null default gen_random_uuid(), familia_id uuid not null,
  status status_contrato not null, enviado timestamptz, assinado timestamptz,
  pacote text not null, forma text not null, parcelas integer not null
);
insert into demo_k (chave, familia_id, status, enviado, assinado, pacote, forma, parcelas)
select c.chave, d.familia_id,
       case when c.p2 = 'aguardando_assinatura' then 'enviado' else 'assinado' end::status_contrato,
       now() - make_interval(days => c.s + 1),
       case when c.p2 = 'aguardando_assinatura' then null else now() - make_interval(days => c.s) end,
       c.pacote, c.forma, case c.forma when 'pix' then 1 else 3 end
from demo_c c join demo_fam d on d.chave = c.chave;

insert into demo_k (chave, familia_id, status, enviado, assinado, pacote, forma, parcelas)
select v.chave, d.familia_id, v.status::status_contrato,
       case when v.dias_envio is null then null else now() - make_interval(days => v.dias_envio) end,
       case when v.dias_assina is null then null else now() - make_interval(days => v.dias_assina) end,
       v.pacote, v.forma, v.parcelas
from (values
  ('dalva', 'cancelado',        65, null, 'Essencial', 'cartao_3x', 3),
  ('edna',  'distrato',         86, 85,   'Essencial', 'pix',       1),
  ('giza',  'gerado',            null, null, 'Imersão', 'pix',      1),
  ('fran',  'aguardando_dados',  null, null, 'Essencial', 'pix',    1)
) as v(chave, status, dias_envio, dias_assina, pacote, forma, parcelas)
join demo_fam d on d.chave = v.chave;

insert into contrato (id, familia_id, pacote_versao_id, contratante_pessoa_id, pagador_pessoa_id, testemunha_pessoa_id,
                      valor_centavos, taxa_deslocamento_centavos, desconto_centavos, parcelas, template_versao,
                      formulario_token_hash, formulario_expira_em, autentique_doc_id, pdf_path,
                      enviado_em, assinado_em, status, criado_em)
select k.contrato_id, k.familia_id, pv.pv_id, mae.id, mae.id, par.id,
       pv.valor, ci.taxa_deslocamento_centavos, 0, k.parcelas, 'padrao-provisorio-v1',
       case when k.status = 'aguardando_dados' then encode(extensions.digest('formulario-teste-' || k.chave, 'sha256'), 'hex') end,
       case when k.status = 'aguardando_dados' then now() + interval '5 days' end,
       case when k.status in ('gerado', 'enviado', 'assinado', 'cancelado', 'distrato') then 'teste-autentique-' || k.chave end,
       case when k.status in ('gerado', 'enviado', 'assinado', 'cancelado', 'distrato') then 'contratos/teste-' || k.chave || '.pdf' end,
       k.enviado, k.assinado, k.status,
       coalesce(k.enviado, now() - interval '2 days') - interval '1 day'
from demo_k k
join demo_fam d on d.chave = k.chave
join demo_pv pv on pv.nome = k.pacote
join cidade ci on ci.nome = d.cidade
join pessoa mae on mae.familia_id = k.familia_id and mae.papel = 'mae'
left join pessoa par on par.familia_id = k.familia_id and par.papel = 'parceiro';

-- Dados de contrato dos leads que chegaram ao contrato
insert into pessoa_dados_contrato (pessoa_id, cpf, data_nascimento, endereco_residencial, preenchido_via)
select p.id, pg_temp.cpf_demo(d.tel), date '1992-03-01' + (d.tel * 41 % 2500),
       jsonb_build_object('rua', 'Rua Teste ' || initcap(d.chave), 'numero', (10 + d.tel % 90)::text,
                          'cidade', d.cidade, 'uf', 'SP', 'cep', '01000-000'),
       'formulario_seguro'
from demo_fam d
join pessoa p on p.familia_id = d.familia_id and p.papel = 'mae'
where d.chave in ('dalva', 'edna', 'giza')
  and not exists (select 1 from pessoa_dados_contrato x where x.pessoa_id = p.id);

-- --- Cobranças: pix, cartão em 3x, parcelado, aberta, vencida, cancelada, estornada
with base as (
  select k.chave, k.contrato_id, k.forma, k.status as kstatus, k.assinado,
         pv.valor + ci.taxa_deslocamento_centavos as total, g.p,
         case when k.forma = 'parcelado' then 3 else 1 end as n
  from demo_k k
  join demo_fam d on d.chave = k.chave
  join demo_pv pv on pv.nome = k.pacote
  join cidade ci on ci.nome = d.cidade
  cross join lateral generate_series(1, case when k.forma = 'parcelado' then 3 else 1 end) as g(p)
  where k.status in ('assinado', 'cancelado', 'distrato')
), venc as (
  select b.*,
         case when b.chave = 'nina' then current_date - 3
              else (coalesce(b.assinado, now() - interval '65 days'))::date + 1 + 30 * (b.p - 1) end as v
  from base b
), calc as (
  select v.*,
         case v.chave when 'dalva' then 'cancelada' when 'edna' then 'estornada' when 'nina' then 'aberta'
              else case when v.v < current_date and not (v.chave = 'kely' and v.p = 2) then 'paga'
                        when v.chave = 'kely' and v.p = 2 then 'vencida'
                        when v.v = current_date and v.chave = 'olga' then 'paga'
                        else 'aberta' end end as st,
         case when v.forma = 'parcelado' then (v.total / 3) + case when v.p = 3 then v.total - 3 * (v.total / 3) else 0 end
              else v.total end as valor
  from venc v
)
insert into cobranca (contrato_id, parcela, valor_centavos, vencimento, external_id, provider, link_pagamento,
                      invoice_slug, transaction_nsu, capture_method, parcelas_cartao,
                      valor_pago_centavos, pago_em, status, criado_em)
select c.contrato_id, c.p, c.valor, c.v, 'teste-cobranca-' || c.chave || '-' || c.p, 'infinitepay',
       'https://pay.exemplo.test/teste-' || c.chave || '-' || c.p,
       case when c.st in ('paga', 'estornada') then 'teste-' || c.chave || '-' || c.p end,
       case when c.st in ('paga', 'estornada') then 'nsu-teste-' || c.chave || '-' || c.p end,
       case when c.forma = 'pix' then 'pix' else 'credit_card' end,
       case c.forma when 'cartao_3x' then 3 when 'parcelado' then 1 end,
       case when c.st in ('paga', 'estornada') then c.valor end,
       case when c.st in ('paga', 'estornada')
            then least(now() - interval '1 hour', c.v::timestamp + interval '9 hours' + make_interval(mins => c.p * 7)) end,
       c.st::status_cobranca,
       coalesce(c.assinado, now() - interval '65 days')
from calc c;

-- --- Notas fiscais: emitida, pendente, processando, erro, cancelada ------------
insert into nota_fiscal (id, cobranca_id, provider, provider_ref, numero, status, pdf_path, xml_path,
                         emitida_em, erro, tentativas, ultima_tentativa_em, criado_em)
select n.id, n.cob_id, 'nfse-teste', 'ref-teste-' || n.chave || '-' || n.parcela,
       case when n.st = 'emitida' then lpad((100 + n.rn)::text, 6, '0') end,
       n.st::status_nota,
       case when n.st = 'emitida' then 'notas/' || n.id || '.pdf' end,
       case when n.st = 'emitida' then 'notas/' || n.id || '.xml' end,
       case when n.st = 'emitida' then least(now() - interval '30 minutes', n.pago_em + interval '1 day') end,
       case when n.st = 'erro' then 'A prefeitura recusou o envio: o endereço do tomador está incompleto (dado de demonstração).' end,
       case n.st when 'pendente' then 0 when 'processando' then 1 when 'erro' then 3 else 1 end,
       case when n.st <> 'pendente' then n.pago_em + interval '2 hours' end,
       n.pago_em + interval '5 minutes'
from (
  select gen_random_uuid() as id, c.id as cob_id, k.chave, c.parcela, c.pago_em,
         row_number() over (order by c.pago_em, c.id) as rn,
         case when k.chave = 'olga' then 'pendente'
              when k.chave = 'mila' then 'processando'
              when k.chave = 'lara' and c.parcela = 1 then 'erro'
              when k.chave = 'edna' then 'cancelada'
              else 'emitida' end as st
  from cobranca c
  join demo_k k on k.contrato_id = c.contrato_id
  where c.status in ('paga', 'estornada')
    and not exists (select 1 from nota_fiscal x where x.cobranca_id = c.id)
) n;

-- --- Estágios dos leads em contrato: motivo da perda/distrato ------------------
update oportunidade o
   set motivo_perda = v.motivo::motivo_perda, motivo_perda_detalhe = v.detalhe
from (values
  ('dalva', 'sem_disponibilidade', 'Cancelou o contrato: a data do parto mudou (dado de demonstração).'),
  ('edna',  'familia_assumiu',     'Distrato: a família decidiu cuidar sozinha (dado de demonstração).')
) as v(chave, motivo, detalhe)
join demo_fam d on d.chave = v.chave
where o.familia_id = d.familia_id;

-- --- Indicações (com e sem vínculo) e família que indicou ----------------------
insert into privado.indicacao (familia_id, medico_id, familia_promotora_id, observacao, criado_em)
select f.id,
       (select m.id from medico m where m.nome = v.medico and m.familia_id is null),
       (select pf.id from demo_f pf where pf.chave = v.promotora),
       v.obs, least(now(), (select fa.criado_em from familia fa where fa.id = f.id) + interval '1 hour')
from (values
  ('fabi',  'Dra. Cecília Teste Parceira', null,   'Indicada no consultório, no pré-natal.'),
  ('vera',  'Dra. Cecília Teste Parceira', null,   'A obstetra entregou o cartão da Kraamzorg.'),
  ('vilma', 'Dr. Álvaro Teste Parceiro',   null,   'Veio por indicação do obstetra.'),
  ('mel',   'Dra. Mônica Teste Parceira',  null,   'Indicação da pediatra da família.'),
  ('gruta', 'Dra. Cecília Teste Parceira', null,   'Indicação da obstetra.'),
  ('dana',  null,                          'alba', 'Amiga que já foi atendida.'),
  ('rita',  null,                          'pia',  'Prima que contratou antes.'),
  ('mila',  null,                          'bela', 'Colega de trabalho que foi atendida.'),
  ('giza',  null,                          'alba', 'Indicação de uma família atendida.'),
  ('isa',   null,                          'cora', 'Vizinha que foi atendida.'),
  ('gil',   null,                          null,   'Indicação de uma amiga, sem vínculo cadastrado.'),
  ('pati',  null,                          null,   'Disse que "uma conhecida indicou", sem nome.')
) as v(chave, medico, promotora, obs)
join demo_f f on f.chave = v.chave
where not exists (select 1 from privado.indicacao i where i.familia_id = f.id);

update familia f
   set indicacao_medico_id = i.medico_id, indicacao_familia_id = i.familia_promotora_id
from privado.indicacao i
where i.familia_id = f.id and f.id in (select id from demo_f)
  and f.indicacao_medico_id is null and f.indicacao_familia_id is null
  and (i.medico_id is not null or i.familia_promotora_id is not null);

-- --- Tarefas do comercial (abertas, em andamento, atrasadas, concluídas) -------
insert into tarefa (tipo, familia_id, responsavel_id, papel_responsavel, prioridade, titulo, payload, vence_em,
                    status, concluida_em, concluida_por, criado_em)
select v.tipo::tipo_tarefa, f.id,
       case when v.quem is not null and v.quem <> 'fila' then (select id from demo_perfil where chave = v.quem) end,
       case when v.quem is null or v.quem = 'fila' then v.papel::papel_usuario end,
       v.prioridade::prioridade, v.titulo,
       jsonb_build_object('textoSugerido', v.texto, 'telefoneE164', '+5511900000' || v.tel,
                          'categoria', v.categoria, 'contexto', v.contexto),
       now() + v.vence, v.status::status_tarefa,
       case when v.status = 'concluida' then now() + v.vence + interval '1 hour' end,
       case when v.status = 'concluida' then (select id from demo_perfil where chave = 'comercial') end,
       now() + v.vence - interval '3 days'
from (values
  ('followup_comercial',        'opal',   'comercial', 'comercial', 'alta',   'Retomar a negociação e confirmar a condição de pagamento',                    interval '3 hours',   'aberta',       665, 'Oi, Silvia! Conseguimos uma condição de pagamento para o pacote Imersão. Posso te explicar por aqui?', 'conteudo',     'Negociação do pacote Imersão'),
  ('followup_comercial',        'nube',   'comercial', 'comercial', 'normal', 'Perguntar se a proposta foi vista e se ficou alguma dúvida',                   interval '-1 day',    'aberta',       664, 'Oi, Elisa, tudo bem? Passando para saber se você viu a proposta e se ficou alguma dúvida.',           'conteudo',     'Sessão realizada há 38 dias'),
  ('enviar_formulario_contrato','fran',   'comercial', 'comercial', 'alta',   'Enviar o formulário seguro com os dados do contrato',                         interval '5 hours',   'aberta',       676, null,                                                                                                  'operacional',  'Fechou na sessão; falta o formulário'),
  ('nutricao_contato',          'gil',    'comercial', 'comercial', 'normal', 'Contato de nutrição: conteúdo sobre os primeiros dias em casa',                interval '-2 days',   'aberta',       657, 'Oi, Marta! Separei um conteúdo curto sobre os primeiros dias em casa com o bebê. Quer que eu envie?',  'conteudo',     'Etapa 2 da régua'),
  ('nutricao_contato',          'jo',     'comercial', 'comercial', 'normal', 'Contato de nutrição: lembrar da disponibilidade da equipe na semana do parto',interval '1 day',     'em_andamento', 660, 'Oi, Bárbara! Tudo certo por aí? Quando quiser conversar sobre o acompanhamento, estou por aqui.',    'conteudo',     'Etapa 1 da régua'),
  ('registrar_desfecho_sessao', 'uva',    'comercial', 'comercial', 'alta',   'Registrar como foi a sessão de venda de hoje',                                interval '-1 hour',   'aberta',       671, null,                                                                                                  'operacional',  'Sessão de hoje sem desfecho'),
  ('agendar_sessao',            'pera',   'comercial', 'comercial', 'normal', 'Confirmar a sessão de venda marcada para a próxima semana',                   interval '2 days',    'aberta',       666, 'Oi, Lívia! Confirmando a nossa conversa da próxima semana. Esse horário continua bom?',               'operacional',  'Sessão em 5 dias'),
  ('followup_comercial',        'quenia', 'comercial', 'comercial', 'normal', 'Responder sobre a taxa de deslocamento e enviar a proposta',                  interval '-6 hours',  'em_andamento', 667, 'Oi, Heloísa! Confirmei com a equipe: no seu bairro não há taxa de deslocamento.',                    'conteudo',     'Dúvida da sessão'),
  ('followup_comercial',        'cleo',   'comercial', 'comercial', 'normal', 'Última tentativa de contato com quem parou de responder',                      interval '-1 day',    'concluida',    653, null,                                                                                                  'conteudo',     'Sem resposta'),
  ('nutricao_contato',          'sol',    'comercial', 'comercial', 'normal', 'Contato de nutrição: lembrar do pré-natal',                                    interval '-3 days',   'concluida',    669, null,                                                                                                  'conteudo',     'Etapa 1 da régua'),
  ('followup_comercial',        'hebe',   'comercial', 'comercial', 'normal', 'Contato de retomada com quem não compareceu à sessão',                         interval '-5 days',   'cancelada',    658, null,                                                                                                  'conteudo',     'Família perdida'),
  ('followup_comercial',        'tati',   'fila',      'comercial', 'normal', 'Primeiro contato humano: conferir a conversa com a Isadora',                   interval '2 hours',   'aberta',       653, null,                                                                                                  'operacional',  'Lead em conversa com a IA'),
  ('followup_comercial',        'vilma',  'fila',      'comercial', 'alta',   'Ligar para quem veio por indicação do obstetra',                               interval '4 hours',   'aberta',       672, null,                                                                                                  'operacional',  'Indicação de parceiro'),
  ('agendar_sessao',            'yara',   'fila',      'comercial', 'normal', 'Oferecer horários para a sessão de venda',                                     interval '1 day',     'aberta',       673, 'Oi, Beatriz! Tenho horários esta semana para conversarmos sobre o acompanhamento. Qual fica melhor?', 'operacional',  'Lead novo'),
  ('nutricao_contato',          'dora',   'fila',      'comercial', 'normal', 'Conteúdo de nutrição para quem ainda não qualificou',                          interval '-4 hours',  'aberta',       654, null,                                                                                                  'conteudo',     'Aguardando qualificação')
) as v(tipo, chave, quem, papel, prioridade, titulo, vence, status, tel, texto, categoria, contexto)
join demo_f f on f.chave = v.chave
where not exists (select 1 from tarefa t where t.titulo = v.titulo and t.familia_id = f.id);

-- Remove a chave "textoSugerido" nula das tarefas sem texto (a tela trata o ausente)
update tarefa set payload = payload - 'textoSugerido'
where payload ? 'textoSugerido' and payload -> 'textoSugerido' = 'null'::jsonb;

-- =============================================================================
-- 3. OPERAÇÃO: acompanhamentos, designações, visitas, registros, pré-natal,
--    alertas clínicos, ocorrências, evoluções e pós-venda
-- =============================================================================

create temp table demo_a (
  chave text primary key, acomp_id uuid not null default gen_random_uuid(),
  familia_id uuid not null, contrato_id uuid not null, fase text not null,
  estado estado_acompanhamento not null, periodo periodo_visita not null,
  dias integer not null, horas numeric not null, inicio date, fim date, prev_alta date,
  prof uuid, bkp uuid, criado timestamptz not null
);
insert into demo_a (chave, familia_id, contrato_id, fase, estado, periodo, dias, horas, inicio, fim, prev_alta, prof, bkp, criado)
select c.chave, d.familia_id, k.contrato_id, c.fase,
       (case when c.fase = 'enc' then 'encerrado'
             when c.chave = 'sara' then 'ultima_visita_realizada'
             when c.chave = 'uma' then 'pendencias'
             when c.fase = 'exec' then 'em_execucao'
             else 'aguardando' end)::estado_acompanhamento,
       (case when c.chave = 'olga' then 'noite_avaliar' when c.chave in ('pia', 'lia') then 'manha'
             when c.tel % 3 = 0 or c.chave in ('uma', 'tuca') then 'tarde' else 'manha' end)::periodo_visita,
       pv.dias, pv.horas, d.inicio, case when d.inicio is not null then d.inicio + pv.dias - 1 end,
       case when c.chave = 'vera' then current_date + 1 when c.chave = 'xana' then current_date + 2 end,
       (select id from demo_prof where chave = c.titular), (select id from demo_prof where chave = c.backup),
       least(now() - interval '30 minutes', coalesce(k.assinado, now() - interval '3 days') + interval '1 day')
from demo_c c
join demo_fam d on d.chave = c.chave
join demo_k k on k.chave = c.chave
join demo_pv pv on pv.nome = c.pacote
where c.fase in ('enc', 'exec', 'nasceu') or c.chave in ('ines', 'jana', 'kely', 'lara', 'mila', 'olga');

insert into acompanhamento (id, contrato_id, familia_id, dias_contratados, horas_por_visita, periodo,
                            inicio_efetivo, encerramento, estado, previsao_alta, criado_em)
select a.acomp_id, a.contrato_id, a.familia_id, a.dias, a.horas, a.periodo, a.inicio,
       case when a.fase = 'enc' then a.fim end, a.estado, a.prev_alta, a.criado
from demo_a a;

-- --- Designações: histórico (recusada, expirada), titular e backup ------------
insert into designacao (acompanhamento_id, profissional_id, papel, status, oferecida_em, respondida_em,
                        motivo_recusa, prazo_resposta_em, criado_em)
select a.acomp_id, (select id from demo_prof where chave = v.prof), 'titular', v.status::status_designacao,
       a.criado + interval '30 minutes',
       case when v.status = 'recusada' then a.criado + interval '4 hours' end,
       v.motivo, a.criado + interval '1 day', a.criado
from demo_a a
join (values
  ('ines', 'sul_3',   'recusada', 'Agenda fechada na semana prevista para o parto.'),
  ('jana', 'norte_2', 'expirada', null),
  ('pia',  'sul_3',   'recusada', 'Sem disponibilidade no período combinado.')
) as v(chave, prof, status, motivo) on v.chave = a.chave;

insert into designacao (acompanhamento_id, profissional_id, papel, status, oferecida_em, respondida_em,
                        prazo_resposta_em, direta, motivo_direta, criado_em)
select a.acomp_id, a.prof, 'titular',
       case when a.chave in ('kely', 'mila', 'olga') then 'oferecida' else 'aceita' end::status_designacao,
       case a.chave when 'kely' then now() - interval '4 hours' when 'mila' then now() - interval '50 hours'
                    when 'olga' then now() - interval '6 hours' else a.criado + interval '2 hours' end,
       case when a.chave in ('kely', 'mila', 'olga') then null else a.criado + interval '5 hours' end,
       case a.chave when 'kely' then now() + interval '20 hours' when 'mila' then now() - interval '2 hours'
                    when 'olga' then now() + interval '30 hours' end,
       a.chave = 'vera',
       case when a.chave = 'vera' then 'Atribuição direta: única profissional livre na semana do parto.' end,
       a.criado + interval '2 hours'
from demo_a a
where a.prof is not null;

insert into designacao (acompanhamento_id, profissional_id, papel, status, oferecida_em, respondida_em, criado_em)
select a.acomp_id, a.bkp, 'backup', 'aceita'::status_designacao, a.criado + interval '3 hours',
       a.criado + interval '6 hours', a.criado + interval '3 hours'
from demo_a a
where a.bkp is not null and a.chave <> 'mila';

-- --- Visitas: 6 dias seguidos a partir do início efetivo ----------------------
-- Hoje: uma em andamento, uma a caminho, duas confirmadas e uma agendada. Duas
-- visitas da mesma profissional no mesmo turno formam o conflito da agenda.
create temp table demo_v (
  chave text not null, dia integer not null, visita_id uuid not null default gen_random_uuid(),
  acomp_id uuid not null, prof uuid not null, data date not null, hora time not null,
  estado estado_visita not null, checkin timestamptz, checkout timestamptz,
  primary key (chave, dia)
);
insert into demo_v (chave, dia, acomp_id, prof, data, hora, estado, checkin, checkout)
select a.chave, g.dia, a.acomp_id, a.prof, a.inicio + g.dia - 1,
       coalesce(h.hora, case a.periodo when 'tarde' then time '14:00' else time '09:00' end),
       (case when a.inicio + g.dia - 1 < current_date
                  then case when a.chave = 'uma' and g.dia = 4 then 'ficha_pendente'
                            when a.chave = 'pia' and g.dia = 3 then 'concluida'
                            when a.inicio + g.dia - 1 >= current_date - 2 then 'ficha_entregue'
                            else 'encerrada' end
             when a.inicio + g.dia - 1 = current_date then coalesce(h.estado, 'agendada')
             when a.inicio + g.dia - 1 = current_date + 1 then 'confirmada'
             else 'agendada' end)::estado_visita,
       null, null
from demo_a a
cross join generate_series(1, 6) as g(dia)
left join (values
  ('pia',  4, time '08:00', 'iniciada'),
  ('nair', 3, time '14:00', 'confirmada'),
  ('lia',  2, time '09:30', 'agendada'),
  ('rita', 1, time '09:00', 'a_caminho'),
  ('tuca', 2, time '14:30', 'confirmada'),
  ('uma',  5, time '15:00', 'confirmada')
) as h(chave, dia, hora, estado) on h.chave = a.chave and h.dia = g.dia
where a.fase in ('enc', 'exec');

update demo_v v
   set checkin = case when v.estado in ('concluida', 'ficha_pendente', 'ficha_entregue', 'encerrada') then (v.data + v.hora)::timestamp + interval '5 minutes'
                      when v.estado = 'iniciada' then now() - interval '90 minutes' end,
       checkout = case when v.estado in ('concluida', 'ficha_pendente', 'ficha_entregue', 'encerrada')
                       then (v.data + v.hora)::timestamp + make_interval(mins => (a.horas * 60)::integer) end
from demo_a a
where a.chave = v.chave;

insert into visita (id, acompanhamento_id, profissional_id, dia_numero, data, hora_prevista, checkin_em, checkout_em,
                    estado, criado_em)
select v.visita_id, v.acomp_id, v.prof, v.dia, v.data, v.hora, v.checkin, v.checkout, v.estado,
       least(now() - interval '10 minutes', a.criado + interval '1 day')
from demo_v v join demo_a a on a.chave = v.chave;

-- Pós-venda (pipeline 4): nasce já no estado final, como o seed.sql faz (o dono da
-- tabela pode inserir o estágio final; o UPDATE de estágio só passa por
-- privado.transicionar). Entra ANTES dos registros porque o gatilho do último
-- dia usa "on conflict do nothing" e não duplica. Pesquisas respondidas em
-- todos os meses, com promotores, neutros e detratores. hana e sara (último
-- dia muito recente) ficam com o que o gatilho abrir sozinho.
insert into pos_venda (acompanhamento_id, estagio, pesquisa_token_hash, pesquisa_enviada_em, pesquisa_expira_em,
                       pesquisa_respondida_em, nps, classificacao, respostas, depoimento_autorizado,
                       autorizacao_imagem, acao_executada_em, criado_em)
select a.acomp_id,
       (case x.pv when 'arquivado' then 'arquivado' when 'acao_executada' then 'acao_executada'
                  when 'classificado' then 'classificado' else 'pesquisa_enviada' end)::estagio_p4,
       case when x.pv = 'pesquisa_enviada' then encode(extensions.digest('pesquisa-demo-' || x.chave, 'sha256'), 'hex') end,
       a.fim::timestamptz + interval '1 day 10 hours',
       a.fim::timestamptz + interval '31 days',
       case when x.nps is not null
            then case when x.chave = 'zana' then now() - interval '5 hours'
                      else least(now() - interval '2 hours', a.fim::timestamptz + interval '3 days 11 hours') end end,
       x.nps,
       case when x.nps is null then null when x.nps >= 9 then 'promotor' when x.nps >= 7 then 'neutro' else 'detrator' end::classificacao_nps,
       case when x.nps is null then null else jsonb_build_object(
         'recomendaria', case when x.nps >= 9 then 'com certeza' when x.nps >= 7 then 'provavelmente' else 'talvez' end,
         'destaque', case when x.nps >= 9 then 'a presença diária da enfermeira' when x.nps >= 7 then 'a orientação sobre a amamentação' else 'o cuidado da enfermeira' end,
         'sugestao', case when x.nps >= 9 then 'nenhuma' when x.nps >= 7 then 'mais clareza nos horários' else 'entregar a evolução ao pediatra mais rápido' end) end,
       case when x.nps is null then null else x.nps >= 9 end,
       case when x.nps is null then null else x.nps >= 9 and x.chave in ('alba', 'iva', 'bela') end,
       case when x.pv in ('arquivado', 'acao_executada') then a.fim::timestamptz + interval '5 days' end,
       a.fim::timestamptz + interval '1 day'
from demo_a a
join demo_c x on x.chave = a.chave
where a.fase = 'enc' and x.pv <> 'protocolo';

-- Registro assistencial (append-only: só INSERT). O gatilho do último dia abre
-- o pós-venda e as tarefas da evolução e da pesquisa sozinho.
insert into registro_atendimento (visita_id, profissional_id, instrumento_versao, dados, resumo_descritivo,
                                  assinado_em, assinatura, criado_em)
select v.visita_id, v.prof, 'v1-2026-09',
       -- Mesmo formato que a enfermeira grava pelo portal (DOC 2): um objeto por bloco, com o
       -- id do bloco como chave ("1", "2.1", "3.1"...), e os blocos do recém-nascido ("3",
       -- "3.1", "3.2") como lista, um item por bebê. É o que a evolução lê para pré-preencher.
       jsonb_build_object(
         '1', jsonb_build_object(
                'data', to_char(v.data, 'YYYY-MM-DD'), 'horario', to_char(v.hora + interval '4 minutes', 'HH24:MI'),
                'acompanhante_presente', jsonb_build_object('resposta', true,
                                           'texto', case when v.dia % 2 = 0 then 'Avó materna' else 'Parceiro' end),
                'pontualidade_confirmada', true, 'higienizacao_das_maos', true,
                'apresentacao_acolhimento_familia', true)
              || case when v.dia > 1 then jsonb_build_object('relato_desde_ultima_visita', true) else '{}'::jsonb end,
         '2', jsonb_build_object(
                'bem_estar_geral_preservado', true,
                'queixa_de_dor', case when v.dia <= 2 then jsonb_build_object('resposta', true, 'texto', 'Local da cirurgia ou períneo')
                                      else jsonb_build_object('resposta', false) end,
                'dor_intensidade', greatest(0, 5 - v.dia), 'sangramento_loquios_esperado', true),
         '2.1', jsonb_build_object(
                'pressao_arterial', jsonb_build_object('partes', jsonb_build_object('sistolica', 108 + v.dia * 2, 'diastolica', 70 + v.dia)),
                'temperatura', 36.4 + (v.dia % 3) * 0.2, 'frequencia_cardiaca', 72 + v.dia),
         '2.4', jsonb_build_object(
                'higiene_intima_orientada', true, 'sono_repouso_adequados', v.dia <> 2,
                'alimentacao_hidratacao_adequadas', true, 'eliminacoes_evacuacao_presentes', v.dia > 1),
         '2.5', jsonb_build_object('turgidas_ou_secretantes', true, 'flacidas', false, 'ingurgitadas', v.dia = 2),
         '2.6', jsonb_build_object('dor_mamilos_amamentar', v.dia <= 3, 'evn', greatest(0, 4 - v.dia),
                                   'intervencoes_para_dor', 'Compressa morna e pega corrigida'),
         '2.7', jsonb_build_object('lesao_mamilar', case when v.dia in (2, 3) then 'esquerda' else 'nao' end,
                                   'nts', case when v.dia in (2, 3) then 2 else 0 end, 'interrupcao_adequada_succao', true),
         '2.8', jsonb_build_object('latch', jsonb_build_object('valor', least(10, 6 + v.dia),
                                                               'complemento', case when 6 + v.dia <= 7 then 'regular' else 'otimo' end),
                                   'teste_da_linguinha', 'normal'),
         '2.9', jsonb_build_object('fbm_aplicada', case when v.dia in (2, 3) then jsonb_build_array('analgesia') else jsonb_build_array('nao_aplicada') end),
         '2.10', jsonb_build_object('bicos_artificiais', false, 'forros_e_conchas', false, 'bomba_de_extracao', false),
         '2.11', jsonb_build_object('succoes_por_dia', 'mais_de_8'),
         '2.12', jsonb_build_object('producao_de_leite', 'normal'),
         '2.13', jsonb_build_object('sente_se_apoiada', least(10, 6 + v.dia), 'quem_mais_apoia', 'Parceiro')
       )
       || jsonb_build_object(
         '3', f.b3, '3.1', f.b31, '3.2', f.b32,
         '4', jsonb_build_object('massagem_extracao_leite', true, 'correcao_pega_posicao', v.dia <= 3,
                                 'livre_demanda_reforcada', true, 'colica_disquesia', v.dia >= 3,
                                 'posturas_de_conforto', v.dia >= 2, 'sinais_de_fome', v.dia = 1,
                                 'manobra_de_desengasgo', v.dia = 2),
         '5', jsonb_build_object('sono_seguro_orientado', v.dia = 1, 'sinais_janelas_sono_explicados', v.dia = 2,
                                 'organizacao_rotina_familiar', v.dia >= 3),
         '6', jsonb_build_object('orientacoes_ao_parceiro', v.dia <= 2, 'duvidas_esclarecidas', true),
         '7', jsonb_build_object('escuta_ativa_emocoes_validadas', true,
                                 'sinais_sofrimento_emocional', jsonb_build_object('resposta', false)),
         '8', jsonb_build_object('ambiente_organizado', true, 'alinhamento_dia_seguinte', v.dia < a.dias),
         '9', jsonb_build_object('contato_medico_necessario', false))
       || case when coalesce(f.cesarea, false)
               then jsonb_build_object('2.2', jsonb_build_object('cesarea_sem_sinais_infeccao', true,
                      'episiotomia_laceracao_sem_alteracoes', true, 'orientacoes_cuidado_reforcadas', true))
               else '{}'::jsonb end
       || case when v.dia <= 3
               then jsonb_build_object('2.3', jsonb_build_object('medicacoes_em_uso', 'Paracetamol 750 mg, se dor'))
               else '{}'::jsonb end
       || case when v.dia = a.dias
               then jsonb_build_object('ultimo_dia', jsonb_build_object(
                      'contato_obstetra', 'Dra. Teste Obstetra, contato por e-mail',
                      'contato_pediatra', 'Dr. Teste Pediatra, contato por e-mail',
                      'resumo_encerramento', 'Família segura na rotina e com os sinais de alerta revisados.'))
               else '{}'::jsonb end,
       'Visita do dia ' || v.dia || ' do acompanhamento sintético de teste, sem intercorrências relevantes.',
       v.checkout,
       encode(extensions.digest('registro-demo:' || v.visita_id::text, 'sha256'), 'hex'),
       v.checkout + interval '10 minutes'
from demo_v v
join demo_a a on a.chave = v.chave
cross join lateral (
  select bool_or(b.tipo_parto = 'cesarea') as cesarea,
         coalesce(jsonb_agg(jsonb_build_object(
           'bebe_id', b.id, 'cor_da_pele_icterica', case when v.dia <= 2 then 'zona_i' else 'ausente' end,
           'respiracao_sem_sinais_esforco', true, 'choro_habitual', true,
           'atividade_responsividade_preservadas', true) order by b.ordem), '[]'::jsonb) as b3,
         coalesce(jsonb_agg(jsonb_build_object(
           'bebe_id', b.id, 'temperatura', 36.6 + (v.dia % 2) * 0.2, 'frequencia_cardiaca', 132,
           'frequencia_respiratoria', 42,
           'peso', coalesce(b.peso_alta_g, b.peso_nascimento_g, 3000) + v.dia * 35) order by b.ordem), '[]'::jsonb) as b31,
         coalesce(jsonb_agg(jsonb_build_object(
           'bebe_id', b.id, 'troca_fraldas_avaliacao_diurese', jsonb_build_object('resposta', true, 'texto', 'Diurese presente'),
           'banho_orientado_realizado', v.dia % 3 = 1,
           'coto_umbilical_avaliado', jsonb_build_object('resposta', true,
              'texto', case when v.dia >= 5 then 'em mumificação, seco' else 'úmido, sem sinais flogísticos' end),
           'vestimenta_adequada_clima', true) order by b.ordem), '[]'::jsonb) as b32
  from bebe b where b.familia_id = a.familia_id
) f
where v.estado in ('ficha_entregue', 'encerrada')
order by v.chave, v.dia;

-- Áudio de visita (transcrito, pendente e com erro)
insert into anexo_audio (visita_id, arquivo_path, duracao_seg, transcricao, retencao_ate, status)
select v.visita_id, 'audios/teste-' || v.chave || '-' || v.dia || '.m4a', x.dur, x.transcricao,
       current_date + 60, x.status::status_audio
from (values
  ('tuca', 1, 94,  'Orientação de amamentação conferida junto com o casal. Bebê mamou bem na posição sentada.', 'transcrito'),
  ('pia',  3, 120, null, 'pendente'),
  ('lia',  1, 61,  null, 'erro')
) as x(chave, dia, dur, transcricao, status)
join demo_v v on v.chave = x.chave and v.dia = x.dia
where not exists (select 1 from anexo_audio a where a.visita_id = v.visita_id);

-- --- Pré-natal -----------------------------------------------------------------
insert into consulta_prenatal (familia_id, agendada_para, realizada_em, conduzida_por, instrumento_versao,
                               urgente, status, periodo_preferido, iniciada_em, criado_em)
select a.familia_id,
       case c.chave when 'kely' then now() + interval '3 days 2 hours'
                    when 'mila' then null when 'olga' then null
                    else k.assinado + interval '9 days' end,
       case when c.chave in ('kely', 'mila', 'olga') then null else k.assinado + interval '9 days' + interval '50 minutes' end,
       case when c.chave in ('mila', 'olga') then null else (select id from demo_perfil where chave = 'coordenacao') end,
       'v1-2026-09', c.chave = 'olga',
       (case when c.chave = 'kely' then 'agendada' when c.chave in ('mila', 'olga') then 'pendente' else 'realizada' end)::status_consulta,
       case when c.chave = 'olga' then array['manha']::periodo_visita[] end,
       case when c.chave in ('kely', 'mila', 'olga') then null else k.assinado + interval '9 days' end,
       least(now() - interval '5 minutes', coalesce(k.assinado, now()) + interval '1 day')
from demo_a a
join demo_c c on c.chave = a.chave
join demo_k k on k.chave = a.chave;

-- --- Alertas clínicos ----------------------------------------------------------
-- Imediato (crítico) em aberto, imediato já acionado, prioritário aberto e
-- vários já fechados com a conduta registrada.
insert into alerta_clinico (familia_id, visita_id, bebe_id, regra_id, instrumento_versao, severidade, campo,
                            valor_observado, conduta, reconhecido_por, reconhecido_em, sinal_identificado,
                            acionado_em, orientacao_medica, conduta_adotada, fechado_em, fechado_por, criado_em)
select a.familia_id, v.visita_id,
       case when r.grupo = 'recem_nascido' then (select b.id from bebe b where b.familia_id = a.familia_id and b.ordem = 1) end,
       r.id, r.instrumento_versao, r.severidade, r.campo, x.valor, r.conduta,
       case when x.etapa >= 1 then (select id from demo_perfil where chave = 'enfermeira') end,
       case when x.etapa >= 1 then base.criado + interval '15 minutes' end,
       case when x.etapa >= 2 then x.sinal end,
       case when x.etapa >= 2 then base.criado + interval '25 minutes' end,
       case when x.etapa >= 2 then x.orientacao end,
       case when x.etapa >= 2 then x.conduta end,
       case when x.etapa = 3 then base.criado + interval '4 hours' end,
       case when x.etapa = 3 then (select id from demo_perfil where chave = 'coordenacao') end,
       base.criado
from (values
  ('pia',  4, 'PU-01', 0, '38,6 °C',
     null, null, null),
  ('nair', 2, 'RN-07', 2, 'Hiperemia no coto umbilical',
     'Coto umbilical com hiperemia e secreção, sem febre.', 'Supervisão médica orientou avaliação pediátrica no mesmo dia.', 'Família orientada e consulta pediátrica marcada para a tarde; reavaliação na próxima visita.'),
  ('sara', 3, 'RN-10', 1, 'Pele amarelada até o tronco',
     null, null, null),
  ('lia',  1, 'SM-04', 1, 'Relato de tristeza intensa e persistente',
     null, null, null),
  ('lia',  1, 'PU-09', 0, 'Dor moderada que não cede com a medicação',
     null, null, null),
  ('uma',  3, 'PU-12', 3, 'Fissuras com sinais inflamatórios',
     'Fissura mamilar com sinais inflamatórios, sem febre.', 'Coordenação orientou cuidados locais e reavaliação em 24 horas.', 'Cuidados locais feitos; na reavaliação, melhora dos sinais.'),
  ('tuca', 1, 'RN-08', 3, '38,3 °C',
     'Temperatura do bebê de 38,3 °C, confirmada em nova aferição.', 'Supervisão médica orientou avaliação pediátrica imediata.', 'Família levou o bebê à avaliação pediátrica; sem intercorrência grave.'),
  ('hana', 2, 'AM-05', 3, 'Dor persistente na mamada',
     'Dor persistente em uma das mamas durante a mamada.', 'Coordenação orientou ajuste de pega e reavaliação.', 'Pega ajustada na visita; dor reduzida na reavaliação.'),
  ('cora', 4, 'PU-08', 3, '37,8 °C',
     'Temperatura de 37,8 °C em duas aferições.', 'Coordenação orientou hidratação e nova aferição em 4 horas.', 'Temperatura normalizada na nova aferição.'),
  ('fabi', 1, 'RN-13', 3, 'Ganho de peso abaixo do esperado',
     'Ganho de peso do bebê abaixo do esperado na semana.', 'Coordenação orientou ajuste das mamadas e novo peso em 48 horas.', 'Mamadas ajustadas; peso retomou o ganho na revisão.'),
  ('dana', 3, 'SM-04', 3, 'Relato de tristeza persistente',
     'Relato de tristeza e cansaço persistentes nos últimos dias.', 'Coordenação orientou acolhimento e encaminhamento ao serviço de saúde mental.', 'Família orientada e encaminhamento combinado com a obstetra.')
) as x(chave, dia, regra, etapa, valor, sinal, orientacao, conduta)
join demo_v v on v.chave = x.chave and v.dia = x.dia
join demo_a a on a.chave = x.chave
join regra_alerta r on r.id = x.regra and r.instrumento_versao = 'v1-2026-09'
cross join lateral (
  select case when x.chave = 'pia' then now() - interval '40 minutes'
              else coalesce(v.checkin, v.data::timestamptz) + interval '30 minutes' end as criado
) base
where not exists (select 1 from alerta_clinico z where z.visita_id = v.visita_id and z.regra_id = r.id);

-- Avisos internos dos alertas (central de notificação; título sem nome de família)
insert into notificacao (papel, prioridade, titulo, corpo, link, canais, lida_em, criado_em)
select 'coordenacao', v.prioridade::prioridade, v.titulo, v.corpo, v.link, array['app'], v.lida, v.quando
from (values
  ('alta',   'Alerta clínico imediato em uma visita de hoje', 'Febre confirmada em uma puérpera. Abra o alerta e registre o acionamento.', '/alertas-clinicos', null::timestamptz, now() - interval '40 minutes'),
  ('alta',   'Alerta imediato já acionado, aguardando o fechamento', 'Conduta registrada. Falta confirmar a reavaliação.', '/alertas-clinicos', null, now() - interval '20 hours'),
  ('normal', 'Alerta prioritário aberto', 'Icterícia progressiva relatada na visita. Confira o alerta.', '/alertas-clinicos', null, now() - interval '3 days'),
  ('normal', 'Uma ficha de visita está pendente', 'A ficha de ontem ainda não foi assinada.', '/ocorrencias', null, now() - interval '25 hours'),
  ('normal', 'Evolução de enfermagem perto do prazo', 'Uma evolução está no aviso de prazo.', '/evolucoes', now() - interval '1 day', now() - interval '2 days')
) as v(prioridade, titulo, corpo, link, lida, quando)
where not exists (select 1 from notificacao n where n.titulo = v.titulo and n.papel = 'coordenacao');

-- --- Ocorrências: prioridades e estados variados, uma com SLA vencido ----------
insert into ocorrencia (familia_id, profissional_id, tipo, prioridade, privada, titulo, descricao,
                        responsavel_id, sla_vence_em, status, historico, resolvida_em, criado_em)
select (select id from demo_f where chave = v.familia),
       (select id from demo_prof where chave = v.prof),
       v.tipo::tipo_ocorrencia, v.prioridade::prioridade, v.tipo = 'detrator', v.titulo, v.descricao,
       (select id from demo_perfil where chave = v.resp),
       now() + v.sla, v.status::status_ocorrencia,
       jsonb_build_array(
         jsonb_build_object('em', now() + v.criado, 'por', (select id from demo_perfil where chave = 'coordenacao'),
                            'acao', 'aberta', 'para', 'aberta'),
         jsonb_build_object('em', now() + v.criado + interval '30 minutes', 'por', (select id from demo_perfil where chave = 'coordenacao'),
                            'acao', 'status', 'para', v.status, 'nota', v.nota)),
       case when v.status in ('resolvida', 'encerrada') then now() + v.criado + interval '20 hours' end,
       now() + v.criado
from (values
  ('intercorrencia', 'maxima', 'pia',   'sul_2',   'Febre da puérpera durante a visita de hoje',
     'Temperatura de 38,6 °C aferida na visita. Alerta clínico aberto e supervisão acionada.',  'coordenacao', interval '2 hours',   'em_acompanhamento', interval '-2 hours',  'Coordenação acompanhando a conduta.'),
  ('registro_atrasado', 'alta', 'uma',  'sul_2',   'Ficha da visita de ontem ainda não assinada',
     'A ficha do dia 4 do acompanhamento ficou pendente depois do prazo de 24 horas.',          'coordenacao', interval '-3 hours',  'responsavel_definido', interval '-27 hours', 'Pedido de assinatura enviado à profissional.'),
  ('contato_perdido', 'normal', 'ines', null,      'Família sem resposta ao check-in da DPP',
     'A família não respondeu às duas tentativas de contato da semana.',                          null,          interval '40 hours',  'triagem', interval '-8 hours',  'Aguardando triagem.'),
  ('reclamacao', 'alta', 'tuca',        'norte_1', 'Reclamação sobre o horário de chegada',
     'A família relatou que a profissional chegou 40 minutos depois do horário combinado.',      'diretoria',   interval '10 hours',  'responsavel_definido', interval '-14 hours', 'Diretoria vai ligar para a família.'),
  ('detrator', 'alta', 'dana',          'sul_1',   'Detratora da pesquisa de satisfação (nota 3)',
     'Nota 3 na pesquisa. Comentário: atraso na entrega da evolução ao pediatra.',                'diretoria',   interval '15 hours',  'em_acompanhamento', interval '-9 hours', 'Escuta individual agendada.'),
  ('experiencia', 'normal', 'elis',     'norte_1', 'Elogio sobre a orientação de amamentação',
     'A família elogiou a paciência da profissional com a amamentação do bebê.',                  'coordenacao', interval '-100 hours', 'resolvida', interval '-5 days',  'Elogio compartilhado com a equipe.'),
  ('capacidade', 'alta', null,          null,      'Semana com muitas famílias previstas em São Paulo',
     'O radar mostra mais famílias esperadas do que o limite semanal da região São Paulo.',      null,          interval '20 hours',  'aberta', interval '-4 hours',  'Aguardando decisão da coordenação.'),
  ('outro', 'normal', 'rita',           null,      'Dúvida sobre a taxa de deslocamento',
     'A família perguntou se a taxa de deslocamento entra no valor do contrato.',                 'coordenacao', interval '-9 days',   'encerrada', interval '-12 days', 'Esclarecido pelo comercial.'),
  ('intercorrencia', 'maxima', 'tuca',  'norte_1', 'Febre do recém-nascido na visita (resolvida)',
     'Febre do bebê aferida na primeira visita. Atendimento pediátrico feito no mesmo dia.',     'coordenacao', interval '-20 hours', 'resolvida', interval '-30 hours', 'Conduta registrada e alerta fechado.'),
  ('registro_atrasado', 'normal', 'hana','sul_1',  'Ficha atrasada de um dia da primeira semana',
     'A ficha foi assinada com atraso e já foi regularizada.',                                    'coordenacao', interval '-130 hours', 'encerrada', interval '-9 days',  'Regularizada.')
) as v(tipo, prioridade, familia, prof, titulo, descricao, resp, sla, status, criado, nota)
where not exists (select 1 from ocorrencia o where o.titulo = v.titulo);

-- --- Evoluções (relatório ao médico): enviadas, em revisão, rascunho, com erro --
insert into relatorio_medico (id, acompanhamento_id, tipo, bebe_id, conteudo, pdf_path, profissional_id, aprovado_por,
                              aprovado_em, enviado_em, destinatarios, status, erro_envio, nota_revisao, criado_em)
select r.id, a.acomp_id, r.tipo::tipo_relatorio, r.bebe_id, '{"dados": {}, "conteudo": null}'::jsonb,
       case when r.status = 'enviado' then 'evolucoes/' || r.id || '.pdf' end,
       a.prof,
       case when r.status in ('aprovado', 'enviado', 'erro_envio') then (select id from demo_perfil where chave = 'coordenacao') end,
       case when r.status in ('aprovado', 'enviado', 'erro_envio') then least(now() - interval '20 minutes', a.fim::timestamptz + interval '2 days 9 hours') end,
       case when r.status = 'enviado' then least(now() - interval '10 minutes', a.fim::timestamptz + interval '2 days 10 hours') end,
       case when r.status = 'enviado' and m.id is not null
            then jsonb_build_array(jsonb_build_object('especialidade', m.especialidade::text, 'medico_id', m.id,
                                                      'enviado_em', least(now() - interval '10 minutes', a.fim::timestamptz + interval '2 days 10 hours'))) end,
       r.status::status_relatorio,
       case when r.status = 'erro_envio' then 'O e-mail do pediatra foi recusado pelo servidor (dado de demonstração).' end,
       case when r.status = 'em_revisao' then 'Conferir a data da última mamada antes de aprovar.' end,
       a.fim::timestamptz + interval '1 day'
from (
  select a2.chave, b.id as bebe_id, 'neonatal'::text as tipo, gen_random_uuid() as id, b.ordem,
         case a2.chave when 'fabi' then 'erro_envio' when 'gabi' then 'em_revisao'
                       when 'hana' then (case when b.ordem = 1 then 'em_revisao' end) else 'enviado' end as status
  from demo_a a2 join bebe b on b.familia_id = a2.familia_id
  where a2.fase = 'enc'
  union all
  select a2.chave, null, 'puerperal', gen_random_uuid(), 0,
         case a2.chave when 'gabi' then 'aprovado' when 'hana' then 'rascunho' else 'enviado' end
  from demo_a a2
  where a2.fase = 'enc'
) r
join demo_a a on a.chave = r.chave
left join medico m on m.familia_id = a.familia_id
     and m.especialidade = (case r.tipo when 'puerperal' then 'obstetra' else 'pediatra' end)::especialidade_medico
where r.status is not null;

-- Tarefas que os gatilhos do último dia abriram: as de quem já fechou o ciclo
-- ficam concluídas; hana e sara seguem abertas (evolução e pesquisa pendentes),
-- gabi segue com a evolução em revisão.
update tarefa t
   set status = 'concluida', concluida_em = coalesce(t.vence_em, now() - interval '30 days') - interval '2 hours',
       concluida_por = (select id from demo_perfil where chave = 'coordenacao'),
       criado_em = coalesce(t.vence_em, now() - interval '30 days') - interval '3 days'
where t.status = 'aberta'
  and t.tipo in ('emitir_evolucao', 'enviar_pesquisa')
  and t.familia_id in (select a.familia_id from demo_a a where a.fase = 'enc' and a.chave not in ('hana', 'gabi'));

-- =============================================================================
-- 4. FINANCEIRO: despesas (6 meses), custo por canal, extrato e pagamento da
--    equipe. As receitas vêm das cobranças pagas da seção 2.
-- =============================================================================

-- --- Pagamento da equipe por acompanhamento concluído --------------------------
-- pago (evolução enviada e pagamento feito), liberado (aguarda o pagamento) e
-- bloqueado (evolução ainda não enviada: regra do PRD, nada de pagar sem ela).
insert into privado.pagamento_equipe (acompanhamento_id, profissional_id, visitas, horas, valor_hora_centavos,
                                      valor_horas_centavos, ajuda_deslocamento_centavos, total_centavos, status,
                                      motivo_bloqueio, liberado_em, pago_em, pago_por, criado_em)
select a.acomp_id, a.prof, 6, a.dias * a.horas, p.valor_hora_centavos,
       (a.dias * a.horas * p.valor_hora_centavos)::integer, 6 * p.adicional_deslocamento_centavos,
       (a.dias * a.horas * p.valor_hora_centavos)::integer + 6 * p.adicional_deslocamento_centavos,
       x.status::privado.status_pagamento_equipe,
       case when x.status = 'bloqueado' then 'evolucao_nao_enviada'::privado.motivo_bloqueio_pagamento end,
       case when x.status in ('liberado', 'pago') then a.fim::timestamptz + interval '3 days' end,
       case when x.status = 'pago' then least(current_date - 1, a.fim + 10) end,
       case when x.status = 'pago' then (select id from demo_perfil where chave = 'financeiro') end,
       a.fim::timestamptz + interval '1 day'
from demo_a a
join (values
  ('iva', 'pago'), ('alba', 'pago'), ('bela', 'pago'), ('jaci', 'pago'), ('dana', 'pago'), ('cora', 'pago'),
  ('elis', 'pago'), ('fabi', 'liberado'), ('zana', 'liberado'), ('gabi', 'bloqueado'), ('hana', 'bloqueado')
) as x(chave, status) on x.chave = a.chave
join profissional p on p.id = a.prof;

-- Cada pagamento feito vira uma despesa da categoria equipe (uma por pagamento)
insert into privado.despesa (data, categoria, descricao, fornecedor, valor_centavos, pagamento_equipe_id)
select pe.pago_em, 'equipe_assistencial', 'Pagamento da equipe: acompanhamento concluído', p.nome, pe.total_centavos, pe.id
from privado.pagamento_equipe pe
join profissional p on p.id = pe.profissional_id
where pe.status = 'pago'
  and not exists (select 1 from privado.despesa d where d.pagamento_equipe_id = pe.id);

-- --- Despesas dos 6 últimos meses (m = 5 é o mais antigo, m = 0 o mês corrente)
-- No mês corrente entram só as despesas de dias que já passaram (nada no futuro).
insert into privado.despesa (data, categoria, descricao, fornecedor, valor_centavos, canal)
select (date_trunc('month', current_date) - make_interval(months => m.n))::date + v.dia - 1,
       v.categoria::privado.categoria_despesa,
       v.descricao || ' (' || to_char(date_trunc('month', current_date) - make_interval(months => m.n), 'MM/YYYY') || ')',
       v.fornecedor,
       (v.base + v.passo * (5 - m.n))::integer,
       v.canal::origem_lead
from generate_series(0, 5) as m(n)
cross join (values
  (3,  'marketing_anuncios', 'Anúncios na Meta',                        'Meta Ads (teste)',                 'meta_ads', 250000, 12000),
  (5,  'marketing_anuncios', 'Anúncios no Google',                      'Google Ads (teste)',               'google',   150000, 9000),
  (8,  'deslocamento',       'Deslocamento das profissionais',          'Transporte por aplicativo (teste)', null,      52000,  6500),
  (10, 'contabilidade',      'Honorários contábeis',                    'Contabilidade Teste Ltda.',        null,       120000, 0),
  (1,  'tecnologia',         'Ferramentas, hospedagem e mensageria',    'Fornecedores de software (teste)', null,        89000, 4000),
  (15, 'pro_labore',         'Pró-labore das sócias',                   null,                               null,       300000, 0),
  (18, 'equipe_assistencial','Profissionais: horas extras e plantões',  'Equipe assistencial (teste)',      null,       120000, 15000),
  (2,  'outros',             'Material de apoio das visitas',           'Fornecedor Teste de Materiais',    null,        31000, 2500)
) as v(dia, categoria, descricao, fornecedor, canal, base, passo)
where ((date_trunc('month', current_date) - make_interval(months => m.n))::date + v.dia - 1) < current_date
  and not exists (
  select 1 from privado.despesa d
  where d.descricao = v.descricao || ' (' || to_char(date_trunc('month', current_date) - make_interval(months => m.n), 'MM/YYYY') || ')'
);

-- --- Custo por canal (mês a mês), que alimenta o custo por lead e por contrato ----
insert into privado.custo_canal (canal_id, mes, valor_centavos, fonte)
select k.id, (date_trunc('month', current_date) - make_interval(months => m.n))::date,
       case k.codigo
         when 'META'   then (250000 + 12000 * (5 - m.n))
         when 'GOOGLE' then (150000 + 9000 * (5 - m.n))
         when 'IGBIO'  then 30000 + 2000 * (5 - m.n)
         else 15000 end,
       case when k.codigo in ('META', 'GOOGLE') then 'lancamento' else 'manual' end
from generate_series(0, 5) as m(n)
cross join privado.canal_captacao k
where not exists (
  select 1 from privado.custo_canal c
  where c.canal_id = k.id and c.mes = (date_trunc('month', current_date) - make_interval(months => m.n))::date
);

-- --- Extrato bancário importado: conferido, sugerido e sem correspondência ------
insert into privado.extrato_importacao (arquivo_hash, formato, linhas, linhas_novas, periodo_inicio, periodo_fim, criado_em)
select encode(extensions.digest(v.semente, 'sha256'), 'hex'), v.formato, v.linhas, v.linhas, v.ini, v.fim, v.criado
from (values
  ('extrato-demo-mes-anterior', 'ofx', 0, current_date - 60, current_date - 31, now() - interval '31 days'),
  ('extrato-demo-mes-atual',    'csv', 0, current_date - 30, current_date - 1,  now() - interval '1 day')
) as v(semente, formato, linhas, ini, fim, criado)
where not exists (select 1 from privado.extrato_importacao e where e.arquivo_hash = encode(extensions.digest(v.semente, 'sha256'), 'hex'));

-- Entradas (recebimentos de cobranças pagas) e saídas (despesas), por período
with linhas as (
  select 'demo-cob-' || c.id as chave, (c.pago_em at time zone 'America/Sao_Paulo')::date as data,
         c.valor_pago_centavos as valor, c.id as cobranca_id, null::uuid as despesa_id,
         case c.capture_method when 'pix' then 'PIX RECEBIDO - DEMONSTRACAO' else 'RECEBIMENTO CARTAO - DEMONSTRACAO' end as descricao,
         row_number() over (order by c.pago_em) as rn
  from cobranca c
  where c.status = 'paga' and c.external_id like 'teste-cobranca-%'
    and (c.pago_em at time zone 'America/Sao_Paulo')::date >= current_date - 60
  union all
  select 'demo-desp-' || d.id, d.data, - d.valor_centavos, null, d.id,
         'PAGAMENTO - ' || upper(left(d.categoria::text, 20)) || ' - DEMONSTRACAO',
         row_number() over (order by d.data)
  from privado.despesa d
  where d.removida_em is null and d.data >= current_date - 60 and d.data < current_date
    and d.categoria in ('marketing_anuncios', 'contabilidade', 'tecnologia')
)
insert into privado.extrato_linha (importacao_id, chave, data, valor_centavos, descricao, documento, situacao,
                                   cobranca_id, despesa_id, conferida_em)
select (select e.id from privado.extrato_importacao e
         where l.data between e.periodo_inicio and e.periodo_fim
         order by e.periodo_inicio limit 1),
       l.chave, l.data, l.valor, l.descricao, 'DOC' || lpad(l.rn::text, 6, '0'),
       (case when l.rn % 5 = 0 then 'sugerida' else 'conferida' end)::privado.situacao_extrato,
       l.cobranca_id, l.despesa_id,
       case when l.rn % 5 = 0 then null else least(now() - interval '1 minute', (l.data + 1)::timestamptz + interval '10 hours') end
from linhas l
where exists (select 1 from privado.extrato_importacao e where l.data between e.periodo_inicio and e.periodo_fim)
  and not exists (select 1 from privado.extrato_linha x where x.chave = l.chave);

-- Linhas que o banco lançou e o sistema não reconhece (para a conciliação manual)
insert into privado.extrato_linha (importacao_id, chave, data, valor_centavos, descricao, documento, situacao)
select (select e.id from privado.extrato_importacao e where v.data between e.periodo_inicio and e.periodo_fim limit 1),
       'demo-sem-' || v.n, v.data, v.valor, v.descricao, 'DOC9' || lpad(v.n::text, 5, '0'), 'sem_correspondencia'
from (values
  (1, current_date - 12, -4590,  'TARIFA BANCARIA - DEMONSTRACAO'),
  (2, current_date - 9,  250000, 'DEPOSITO NAO IDENTIFICADO - DEMONSTRACAO'),
  (3, current_date - 5,  -12900, 'ASSINATURA DE SERVICO - DEMONSTRACAO'),
  (4, current_date - 40, -3200,  'TARIFA BANCARIA - DEMONSTRACAO')
) as v(n, data, valor, descricao)
where exists (select 1 from privado.extrato_importacao e where v.data between e.periodo_inicio and e.periodo_fim)
  and not exists (select 1 from privado.extrato_linha x where x.chave = 'demo-sem-' || v.n);

update privado.extrato_importacao e
   set linhas = (select count(*) from privado.extrato_linha l where l.importacao_id = e.id),
       linhas_novas = (select count(*) from privado.extrato_linha l where l.importacao_id = e.id)
where e.arquivo_hash in (encode(extensions.digest('extrato-demo-mes-anterior', 'sha256'), 'hex'),
                         encode(extensions.digest('extrato-demo-mes-atual', 'sha256'), 'hex'));

-- =============================================================================
-- 5. GESTÃO: equipe, talentos, manuais, portal da família, tarefas por equipe,
--    notificações e linha do tempo
-- =============================================================================

-- --- Equipe: documentos (em dia, vencendo, vencido) e folgas ------------------
insert into documento_profissional (profissional_id, tipo, numero, validade, arquivo_path)
select (select id from demo_prof where chave = v.prof), v.tipo, v.numero,
       case when v.dias is null then null else current_date + v.dias end,
       'documentos/teste-' || v.prof || '-' || v.slug || '.pdf'
from (values
  ('sul_1',   'Carteira do conselho',                'COREN-TESTE-0001', 200,  'conselho'),
  ('sul_1',   'Contrato de prestação de serviço',    'CT-TESTE-001',     300,  'contrato'),
  ('sul_1',   'Comprovante de vacinação',            null,               -10,  'vacina'),
  ('sul_2',   'Carteira do conselho',                'COREN-TESTE-0002', 25,   'conselho'),
  ('sul_2',   'Contrato de prestação de serviço',    'CT-TESTE-002',     null, 'contrato'),
  ('sul_2',   'Comprovante de vacinação',            null,               400,  'vacina'),
  ('sul_3',   'Carteira do conselho',                'COREN-TESTE-0003', -45,  'conselho'),
  ('sul_3',   'Comprovante de vacinação',            null,               10,   'vacina'),
  ('sul_4',   'Carteira do conselho',                'COREN-TESTE-0004', 365,  'conselho'),
  ('sul_4',   'Contrato de prestação de serviço',    'CT-TESTE-004',     180,  'contrato'),
  ('sul_4',   'Comprovante de vacinação',            null,               90,   'vacina'),
  ('sul_5',   'Carteira do conselho',                'COREN-TESTE-0005', 90,   'conselho'),
  ('sul_5',   'Comprovante de vacinação',            null,               5,    'vacina'),
  ('norte_1', 'Carteira do conselho',                'COREN-TESTE-0101', 150,  'conselho'),
  ('norte_1', 'Contrato de prestação de serviço',    'CT-TESTE-101',     120,  'contrato'),
  ('norte_1', 'Comprovante de vacinação',            null,               365,  'vacina'),
  ('sul_6',   'Carteira do conselho',                'COREN-TESTE-0006', 120,  'conselho'),
  ('sul_7',   'Carteira do conselho',                'COREN-TESTE-0007', 60,   'conselho'),
  ('sul_7',   'Comprovante de vacinação',            null,               45,   'vacina'),
  ('norte_2', 'Carteira do conselho',                'COREN-TESTE-0102', 30,   'conselho'),
  ('norte_2', 'Contrato de prestação de serviço',    'CT-TESTE-102',     -3,   'contrato'),
  ('coord',   'Carteira do conselho',                'COREN-TESTE-0000', 500,  'conselho')
) as v(prof, tipo, numero, dias, slug)
where not exists (select 1 from documento_profissional d
                  where d.profissional_id = (select id from demo_prof where chave = v.prof) and d.tipo = v.tipo);

insert into bloqueio_agenda (profissional_id, inicio, fim, motivo)
select (select id from demo_prof where chave = v.prof), current_date + v.ini, current_date + v.fim, v.motivo
from (values
  ('sul_5',   0,  2,  'Folga combinada'),
  ('norte_2', 7,  10, 'Férias'),
  ('sul_3',   9,  16, 'Férias'),
  ('sul_1',   -20, -18, 'Curso de atualização'),
  ('sul_4',   4,  4,  'Consulta médica')
) as v(prof, ini, fim, motivo)
where not exists (select 1 from bloqueio_agenda b
                  where b.profissional_id = (select id from demo_prof where chave = v.prof) and b.motivo = v.motivo and b.inicio = current_date + v.ini);

-- Portal da profissional: autorização de nome e foto (sem foto real)
insert into privado.profissional_portal (profissional_id, autoriza_nome, autoriza_foto, foto_path)
select (select id from demo_prof where chave = v.prof), v.nome, v.foto, null
from (values ('sul_1', true, false), ('sul_2', true, false), ('sul_3', false, false), ('sul_4', true, false), ('norte_1', true, false)
) as v(prof, nome, foto)
where not exists (select 1 from privado.profissional_portal x where x.profissional_id = (select id from demo_prof where chave = v.prof));

-- --- Banco de talentos: candidatas em cada etapa ---------------------------------
insert into privado.candidata (nome, telefone_e164, email, cidade, conselho, apresentacao, origem, estado, observacoes,
                               consentimento, criado_em)
select v.nome, v.tel, v.email, v.cidade, v.conselho, v.apresentacao, v.origem, v.estado::privado.estado_candidata, v.obs,
       jsonb_build_object('lgpd_candidatura', jsonb_build_object('aceito', true, 'versao', '1',
                          'em', to_char(now() - make_interval(days => v.dias), 'YYYY-MM-DD"T"HH24:MI:SS'))),
       now() - make_interval(days => v.dias)
from (values
  ('Candidata Teste Aurora',   '+5511900000521', 'candidata.teste.aurora@exemplo.test',   'São Paulo', 'COREN-TESTE-9001', 'Enfermeira obstetra com experiência em maternidade e interesse em atendimento domiciliar.', 'pagina_publica', 'nova',                'Chegou pela página pública.', 2),
  ('Candidata Teste Brisa',    '+5511900000522', 'candidata.teste.brisa@exemplo.test',    'Santo André', 'COREN-TESTE-9002', 'Enfermeira neonatal, atua em UTI neonatal e quer complementar a renda.',                 'pagina_publica', 'nova',                null, 1),
  ('Candidata Teste Cravo',    '+5511900000523', 'candidata.teste.cravo@exemplo.test',    'Alphaville', 'COREN-TESTE-9003', 'Consultora de lactação e enfermeira com cinco anos de experiência.',                       'indicacao',      'em_triagem',          'Indicada pela Profissional Teste Sul 1. Conferir o registro no conselho.', 6),
  ('Candidata Teste Dália',    '+5511900000524', 'candidata.teste.dalia@exemplo.test',    'São Paulo', 'COREN-TESTE-9004', 'Enfermeira com especialização em saúde da mulher.',                                        'coordenacao',    'entrevista_agendada', 'Entrevista marcada para esta semana.', 9),
  ('Candidata Teste Estrela',  '+5511900000525', 'candidata.teste.estrela@exemplo.test',  'Londrina', 'COREN-TESTE-9005', 'Enfermeira obstetra de Londrina, disponível para atender Apucarana e Arapongas.',            'pagina_publica', 'entrevista_agendada', null, 12),
  ('Candidata Teste Flor',     '+5511900000526', 'candidata.teste.flor@exemplo.test',     'São Paulo', 'COREN-TESTE-9006', 'Enfermeira neonatal com experiência em alojamento conjunto.',                               'coordenacao',    'entrevistada',        'Boa conversa. Falta a segunda avaliação.', 20),
  ('Candidata Teste Girassol', '+5511900000527', 'candidata.teste.girassol@exemplo.test', 'São Bernardo do Campo', 'COREN-TESTE-9007', 'Enfermeira obstetra, atendimento domiciliar há três anos.',                            'indicacao',      'entrevistada',        'Aguardando retorno sobre a disponibilidade de horários.', 25),
  ('Candidata Teste Hortênsia','+5511900000528', 'candidata.teste.hortensia@exemplo.test','São Paulo', 'COREN-TESTE-9008', 'Enfermeira com experiência em centro de parto.',                                             'coordenacao',    'aprovada',            'Aprovada. Início previsto no próximo ciclo de contratação.', 35),
  ('Candidata Teste Íris',     '+5511900000529', 'candidata.teste.iris@exemplo.test',     'Londrina', 'COREN-TESTE-9009', 'Enfermeira neonatal, quer atuar nos fins de semana.',                                         'pagina_publica', 'banco_reserva',       'Perfil bom; sem vaga agora, fica no banco de reserva.', 50),
  ('Candidata Teste Jasmim',   '+5511900000530', 'candidata.teste.jasmim@exemplo.test',   'São Paulo', 'COREN-TESTE-9010', 'Enfermeira recém-formada com estágio em obstetrícia.',                                       'pagina_publica', 'nao_seguiu',          'Não segue por falta de experiência domiciliar.', 60),
  ('Candidata Teste Lírio',    '+5511900000531', 'candidata.teste.lirio@exemplo.test',    'Cotia', 'COREN-TESTE-9011', 'Enfermeira obstetra; desistiu depois da entrevista por mudança de cidade.',                      'indicacao',      'desistiu',            'Mudou de cidade.', 70)
) as v(nome, tel, email, cidade, conselho, apresentacao, origem, estado, obs, dias)
where not exists (select 1 from privado.candidata c where c.nome = v.nome);

-- Avaliações com o roteiro vigente (escala de 1 a 5, 10 critérios)
insert into privado.candidata_avaliacao (candidata_id, avaliador_id, roteiro_versao, respostas, notas, observacoes,
                                         criterios_avaliados, media_notas, criado_em)
select c.id, (select id from demo_perfil where chave = v.quem), 'R-1 provisório',
       jsonb_build_object('p01', 'Formação em enfermagem e atuação em maternidade.',
                          'p03', 'Cerca de ' || (3 + v.n % 5) || ' anos na área.',
                          'p05', 'Acho fundamental a continuidade do cuidado em casa.'),
       jsonb_build_object('c01', v.n1, 'c02', v.n2, 'c03', v.n3, 'c04', v.n4, 'c05', v.n5,
                          'c06', v.n6, 'c07', v.n7, 'c08', v.n8, 'c09', v.n9, 'c10', v.n10),
       v.obs, 10, round((v.n1 + v.n2 + v.n3 + v.n4 + v.n5 + v.n6 + v.n7 + v.n8 + v.n9 + v.n10) / 10.0, 2),
       c.criado_em + interval '5 days'
from (values
  ('Candidata Teste Flor',      'coordenacao', 1, 4, 4, 3, 5, 4, 4, 5, 4, 3, 4, 'Segura na conversa; precisa de mais prática no domicílio.'),
  ('Candidata Teste Girassol',  'coordenacao', 2, 5, 5, 4, 4, 5, 5, 4, 5, 4, 5, 'Excelente experiência domiciliar.'),
  ('Candidata Teste Girassol',  'diretoria',   3, 4, 5, 4, 5, 5, 4, 4, 5, 4, 4, 'Ótima comunicação com as famílias.'),
  ('Candidata Teste Hortênsia', 'coordenacao', 4, 5, 4, 5, 5, 5, 5, 5, 5, 5, 4, 'Aprovada sem ressalvas.'),
  ('Candidata Teste Íris',      'coordenacao', 0, 3, 3, 3, 4, 4, 3, 4, 4, 3, 3, 'Boa base; ainda precisa de autonomia.'),
  ('Candidata Teste Jasmim',    'coordenacao', 1, 2, 1, 2, 3, 3, 2, 3, 3, 2, 1, 'Pouca vivência em domicílio.')
) as v(nome, quem, n, n1, n2, n3, n4, n5, n6, n7, n8, n9, n10, obs)
join privado.candidata c on c.nome = v.nome
where not exists (select 1 from privado.candidata_avaliacao a
                  where a.candidata_id = c.id and a.avaliador_id = (select id from demo_perfil where chave = v.quem));

-- --- Manuais, protocolos e trilhas, com leituras confirmadas --------------------
-- O texto é de demonstração: o conteúdo oficial é aprovado pela coordenação.
insert into privado.manual (titulo, categoria, papeis_alvo, ativo, criado_em)
select v.titulo, v.categoria::privado.categoria_manual, v.papeis::papel_usuario[], v.ativo, now() - make_interval(days => v.dias)
from (values
  ('Manual de boas-vindas à equipe Kraamzorg',               'manual',    array[]::text[],                         true,  170),
  ('Protocolo de biossegurança nas visitas',                 'protocolo', array['enfermeira'],                     true,  160),
  ('Manual do atendimento comercial pelo WhatsApp',          'manual',    array['comercial', 'coordenacao'],       true,  150),
  ('Protocolo de alerta clínico e acionamento da supervisão','protocolo', array['enfermeira', 'coordenacao'],      true,  140),
  ('Manual de cobrança e conciliação financeira',            'manual',    array['financeiro'],                     true,  120),
  ('Guia de tom de voz e linguagem para a família',          'manual',    array[]::text[],                         true,  100),
  ('Protocolo de registro assistencial sem internet',        'protocolo', array['enfermeira'],                     true,  80),
  ('Manual de campanhas e códigos de origem',                'manual',    array['marketing'],                      true,  60),
  ('Manual antigo de contratação (arquivado)',               'manual',    array['coordenacao'],                    false, 300)
) as v(titulo, categoria, papeis, ativo, dias)
where not exists (select 1 from privado.manual m where m.titulo = v.titulo);

insert into privado.manual_versao (manual_id, versao, conteudo, resumo_mudanca, publicada_por, criado_em)
select m.id, g.v,
       '# ' || m.titulo || E'\n\n' ||
       case g.v when 1 then E'Texto de demonstração, primeira versão.\n\n## Para que serve\n\nOrientar a equipe sobre o que fazer, em que ordem e a quem pedir ajuda quando surgir uma dúvida.\n\n## Como usar\n\n1. Leia o documento até o fim.\n2. Confirme a leitura no final da página.\n3. Em caso de dúvida, fale com a coordenação.\n'
                else E'Texto de demonstração, segunda versão.\n\n## Para que serve\n\nOrientar a equipe sobre o que fazer, em que ordem e a quem pedir ajuda quando surgir uma dúvida.\n\n## O que mudou\n\nO passo a passo ficou mais curto e ganhou um exemplo.\n\n## Como usar\n\n1. Leia o documento até o fim.\n2. Confirme a leitura no final da página.\n3. Em caso de dúvida, fale com a coordenação.\n' end ||
       E'\n_O conteúdo oficial é aprovado pela coordenação antes de entrar em uso._\n',
       case g.v when 1 then 'Primeira versão' else 'Passo a passo mais curto e com exemplo' end,
       (select id from demo_perfil where chave = 'coordenacao'),
       m.criado_em + make_interval(days => (g.v - 1) * 30)
from privado.manual m
cross join generate_series(1, 2) as g(v)
where m.titulo in (select v.titulo from (values
      ('Manual de boas-vindas à equipe Kraamzorg'), ('Protocolo de biossegurança nas visitas'),
      ('Manual do atendimento comercial pelo WhatsApp'), ('Protocolo de alerta clínico e acionamento da supervisão'),
      ('Manual de cobrança e conciliação financeira'), ('Guia de tom de voz e linguagem para a família'),
      ('Protocolo de registro assistencial sem internet'), ('Manual de campanhas e códigos de origem'),
      ('Manual antigo de contratação (arquivado)')) as v(titulo))
  and (g.v = 1 or m.titulo in ('Manual de boas-vindas à equipe Kraamzorg', 'Protocolo de alerta clínico e acionamento da supervisão',
                               'Guia de tom de voz e linguagem para a família'))
  and not exists (select 1 from privado.manual_versao x where x.manual_id = m.id and x.versao = g.v);

-- Leituras confirmadas na versão mais recente
insert into privado.manual_leitura (versao_id, usuario_id, confirmada_em)
select (select mv.id from privado.manual_versao mv where mv.manual_id = m.id order by mv.versao desc limit 1),
       (select id from demo_perfil where chave = v.quem), now() - make_interval(days => v.dias)
from (values
  ('Manual de boas-vindas à equipe Kraamzorg',                'comercial',   40),
  ('Manual de boas-vindas à equipe Kraamzorg',                'enfermeira',  38),
  ('Manual de boas-vindas à equipe Kraamzorg',                'financeiro',  35),
  ('Manual de boas-vindas à equipe Kraamzorg',                'coordenacao', 60),
  ('Protocolo de biossegurança nas visitas',                  'enfermeira',  30),
  ('Manual do atendimento comercial pelo WhatsApp',           'comercial',   20),
  ('Protocolo de alerta clínico e acionamento da supervisão', 'enfermeira',  12),
  ('Protocolo de alerta clínico e acionamento da supervisão', 'coordenacao', 15),
  ('Guia de tom de voz e linguagem para a família',           'comercial',   9),
  ('Guia de tom de voz e linguagem para a família',           'enfermeira',  8),
  ('Guia de tom de voz e linguagem para a família',           'coordenacao', 10),
  ('Manual de campanhas e códigos de origem',                 'marketing',   5)
) as v(titulo, quem, dias)
join privado.manual m on m.titulo = v.titulo
where not exists (select 1 from privado.manual_leitura l
                  where l.usuario_id = (select id from demo_perfil where chave = v.quem)
                    and l.versao_id = (select mv.id from privado.manual_versao mv where mv.manual_id = m.id order by mv.versao desc limit 1));

insert into privado.trilha (nome, papel_alvo, ativa)
select v.nome, v.papel::papel_usuario, true
from (values
  ('Integração da enfermeira',  'enfermeira'),
  ('Integração do comercial',   'comercial'),
  ('Integração do financeiro',  'financeiro')
) as v(nome, papel)
where not exists (select 1 from privado.trilha t where t.nome = v.nome);

insert into privado.trilha_item (trilha_id, manual_id, ordem)
select t.id, m.id, v.ordem
from (values
  ('Integração da enfermeira', 'Manual de boas-vindas à equipe Kraamzorg', 1),
  ('Integração da enfermeira', 'Protocolo de biossegurança nas visitas', 2),
  ('Integração da enfermeira', 'Protocolo de alerta clínico e acionamento da supervisão', 3),
  ('Integração da enfermeira', 'Protocolo de registro assistencial sem internet', 4),
  ('Integração do comercial',  'Manual de boas-vindas à equipe Kraamzorg', 1),
  ('Integração do comercial',  'Manual do atendimento comercial pelo WhatsApp', 2),
  ('Integração do comercial',  'Guia de tom de voz e linguagem para a família', 3),
  ('Integração do financeiro', 'Manual de boas-vindas à equipe Kraamzorg', 1),
  ('Integração do financeiro', 'Manual de cobrança e conciliação financeira', 2)
) as v(trilha, manual, ordem)
join privado.trilha t on t.nome = v.trilha
join privado.manual m on m.titulo = v.manual
where not exists (select 1 from privado.trilha_item x where x.trilha_id = t.id and x.manual_id = m.id);

-- --- Portal da família: liberado, aguardando liberação (sem linha) e suspenso -----
insert into privado.acesso_familia (familia_id, pessoa_id, ativo, suspenso_em, ultimo_acesso_em, criado_em)
select f.id, p.id, v.ativo, case when not v.ativo then now() - interval '6 days' end,
       case when v.dias_acesso is null then null else now() - make_interval(days => v.dias_acesso) end,
       now() - interval '20 days'
from (values
  ('pia',   'mae',      true,  0),
  ('pia',   'parceiro', true,  1),
  ('nair',  'mae',      true,  2),
  ('lia',   'mae',      true,  null),
  ('lia',   'parceiro', true,  3),
  ('tuca',  'mae',      true,  0),
  ('hana',  'mae',      true,  9),
  ('dana',  'mae',      false, 70),
  ('jaci',  'mae',      false, 40),
  ('sara',  'mae',      true,  null),
  ('iris',  'mae',      true,  null)
) as v(chave, papel, ativo, dias_acesso)
join demo_f f on f.chave = v.chave
join pessoa p on p.familia_id = f.id and p.papel = v.papel::papel_pessoa
where not exists (select 1 from privado.acesso_familia a where a.pessoa_id = p.id);

-- --- Tarefas das demais equipes (coordenação, financeiro, marketing, enfermeira) ---
insert into tarefa (tipo, familia_id, responsavel_id, papel_responsavel, prioridade, titulo, payload, vence_em,
                    status, concluida_em, concluida_por, criado_em)
select v.tipo::tipo_tarefa, (select id from demo_f where chave = v.chave),
       case when v.resp is not null then (select id from demo_perfil where chave = v.resp) end,
       case when v.resp is null then v.papel::papel_usuario end,
       v.prioridade::prioridade, v.titulo,
       jsonb_build_object('categoria', 'interna', 'contexto', v.contexto),
       now() + v.vence, v.status::status_tarefa,
       case when v.status = 'concluida' then now() + v.vence + interval '2 hours' end,
       case when v.status = 'concluida' then (select id from demo_perfil where chave = coalesce(v.resp, v.papel)) end,
       least(now() - interval '1 hour', now() + v.vence - interval '2 days')
from (values
  -- coordenação
  ('agendar_prenatal',       'mila',  null,          'coordenacao', 'alta',   'Agendar a consulta pré-natal',                                   interval '1 day',    'aberta',       'Pagamento confirmado há 12 dias'),
  ('designar_profissional',  'olga',  null,          'coordenacao', 'alta',   'Escolher a profissional titular e a reserva',                    interval '6 hours',  'aberta',       'Pagamento confirmado ontem'),
  ('checkin_dpp',            'jana',  null,          'coordenacao', 'normal', 'Check-in da data provável do parto',                             interval '-2 hours', 'aberta',       'DPP em 5 dias'),
  ('checkin_dpp',            'ines',  'coordenacao', 'coordenacao', 'normal', 'Check-in da data provável do parto',                             interval '1 day',    'em_andamento', 'DPP em 20 dias'),
  ('obter_contato_medico',   'kely',  null,          'coordenacao', 'alta',   'Pedir o contato do obstetra e do pediatra',                      interval '2 days',   'aberta',       'Necessário para a evolução'),
  ('escuta_neutro',          'jaci',  null,          'coordenacao', 'normal', 'Ouvir a família depois da nota neutra na pesquisa',              interval '4 hours',  'aberta',       'Nota 8'),
  ('escuta_neutro',          'fabi',  null,          'coordenacao', 'normal', 'Ouvir a família depois da nota neutra na pesquisa',              interval '-3 days',  'concluida',    'Nota 8'),
  ('enviar_guia',            'vera',  null,          'coordenacao', 'alta',   'Enviar o guia dos primeiros dias para a família',                interval '3 hours',  'aberta',       'Bebê nasceu ontem'),
  ('documento_vencendo',     null,    null,          'coordenacao', 'alta',   'Documento vencido de uma profissional: pedir a renovação',      interval '-1 day',   'aberta',       'Carteira do conselho vencida'),
  ('documento_vencendo',     null,    null,          'coordenacao', 'normal', 'Documento vencendo em breve: pedir o novo comprovante',         interval '5 days',   'aberta',       'Comprovante de vacinação'),
  ('outro',                  null,    'coordenacao', 'coordenacao', 'normal', 'Revisar a escala da próxima semana',                             interval '1 day',    'em_andamento', 'Escala de São Paulo'),
  ('outro',                  null,    null,          'coordenacao', 'alta',   'Decidir sobre a semana com muitas famílias previstas',           interval '-5 hours', 'aberta',       'Ocorrência de capacidade'),
  -- financeiro
  ('cobranca_atraso',        'nina',  null,          'financeiro',  'alta',   'Cobrança vencida: falar com a família sobre o pagamento',        interval '-1 day',   'aberta',       'Vencida há 3 dias'),
  ('cobranca_atraso',        'kely',  null,          'financeiro',  'alta',   'Parcela vencida: enviar o novo link de pagamento',               interval '-12 days', 'aberta',       'Parcela 2 de 3 vencida'),
  ('outro',                  null,    'financeiro',  'financeiro',  'normal', 'Conferir as notas fiscais com erro do mês',                      interval '2 days',   'aberta',       'Uma nota com erro'),
  ('outro',                  null,    null,          'financeiro',  'normal', 'Importar o extrato bancário do mês',                             interval '-6 days',  'concluida',    'Extrato do mês anterior'),
  ('outro',                  null,    null,          'financeiro',  'normal', 'Liberar o pagamento das profissionais com evolução enviada',     interval '1 day',    'aberta',       'Duas liberações pendentes'),
  -- marketing
  ('outro',                  null,    null,          'marketing',   'normal', 'Revisar os custos de anúncios do mês',                           interval '2 days',   'aberta',       'Meta e Google'),
  ('outro',                  null,    'marketing',   'marketing',   'normal', 'Atualizar os códigos de campanha do Instagram',                  interval '-1 day',   'aberta',       'Códigos da bio'),
  ('outro',                  null,    null,          'marketing',   'normal', 'Publicar os depoimentos autorizados do mês',                     interval '3 days',   'em_andamento', 'Quatro depoimentos autorizados'),
  -- enfermeira
  ('documento_vencendo',     null,    'enfermeira',  'enfermeira',  'normal', 'Renovar a carteira do conselho (vence em 25 dias)',              interval '5 days',   'aberta',       'Documento da própria profissional'),
  ('outro',                  null,    'enfermeira',  'enfermeira',  'normal', 'Confirmar a leitura do protocolo de registro sem internet',      interval '3 days',   'aberta',       'Trilha de integração')
) as v(tipo, chave, resp, papel, prioridade, titulo, vence, status, contexto)
where not exists (select 1 from tarefa t where t.titulo = v.titulo
                  and t.familia_id is not distinct from (select id from demo_f where chave = v.chave));

-- --- Notificações (sino): por papel e por pessoa, lidas e não lidas ---------------
insert into notificacao (usuario_id, papel, prioridade, titulo, corpo, link, canais, lida_em, criado_em)
select (select id from demo_perfil where chave = v.usuario), v.papel::papel_usuario, v.prioridade::prioridade,
       v.titulo, v.corpo, v.link, array['app'],
       case when v.lida then now() - interval '1 hour' end, now() - v.quando
from (values
  ('diretoria',   null,          'alta',   'Ocorrência de prioridade máxima aberta',        'Uma intercorrência de visita pede acompanhamento.',                 '/ocorrencias',        false, interval '35 minutes'),
  ('diretoria',   null,          'normal', 'Relatório do mês pronto para conferência',      'O painel executivo do mês anterior foi fechado.',                   '/painel',             true,  interval '2 days'),
  ('coordenacao', null,          'alta',   'Ocorrência entregue a você',                    'A ocorrência de febre da puérpera está com você.',                  '/ocorrencias',        false, interval '2 hours'),
  ('coordenacao', null,          'normal', 'Oferta de designação sem resposta',             'Uma oferta de atendimento passou do prazo de resposta.',            '/radar',              false, interval '3 hours'),
  (null,          'financeiro',  'normal', 'Cobrança vencida',                              'Há cobranças vencidas esperando contato.',                          '/cobrancas',          false, interval '1 day'),
  (null,          'financeiro',  'normal', 'Nota fiscal com erro',                          'Uma nota fiscal voltou com erro da prefeitura.',                    '/notas',              false, interval '5 hours'),
  (null,          'marketing',   'normal', 'Novo lead de campanha',                         'Chegaram novos leads pelos anúncios.',                              '/marketing',          true,  interval '4 days'),
  (null,          'comercial',   'alta',   'Transferência aberta no seu nome',              'A Isadora passou uma conversa para o comercial.',                   '/transferencias',     false, interval '50 minutes'),
  (null,          'comercial',   'normal', 'Sessão de venda de hoje sem desfecho',          'Registre como foi a sessão de hoje.',                               '/sessoes-venda',      false, interval '3 hours'),
  ('enfermeira',  null,          'normal', 'Nova oferta de atendimento',                    'Você recebeu uma oferta de acompanhamento. Responda no prazo.',     '/ofertas',            false, interval '4 hours'),
  ('enfermeira',  null,          'normal', 'Lembrete: ficha da visita pendente',            'A ficha de ontem ainda não foi assinada.',                          '/hoje',               false, interval '20 hours')
) as v(usuario, papel, prioridade, titulo, corpo, link, lida, quando)
where not exists (select 1 from notificacao n where n.titulo = v.titulo and n.corpo = v.corpo);

-- --- Linha do tempo das famílias (ficha 360º): só famílias sem nenhum evento ------
insert into evento_familia (familia_id, tipo, titulo, dados, restrito, criado_em)
select e.familia_id, e.tipo, e.titulo, e.dados, false, e.quando
from (
  select f.id as familia_id, 'lead_entrou'::text as tipo, 'Entrou pelo contato inicial'::text as titulo,
         jsonb_build_object('origem', f.origem::text) as dados, f.criado_em as quando
  from familia f where f.id in (select id from demo_f)
  union all
  select o.familia_id, 'estagio', 'novo → em_conversa_ia',
         jsonb_build_object('maquina', 'p1', 'de', 'novo', 'para', 'em_conversa_ia', 'sistema', true),
         f.criado_em + interval '10 minutes'
  from oportunidade o join familia f on f.id = o.familia_id
  where o.familia_id in (select id from demo_f) and (o.estagio_p2 is not null or o.estagio_p1 <> 'novo')
  union all
  select o.familia_id, 'estagio', 'em_conversa_ia → qualificado',
         jsonb_build_object('maquina', 'p1', 'de', 'em_conversa_ia', 'para', 'qualificado', 'sistema', true),
         f.criado_em + interval '1 day'
  from oportunidade o join familia f on f.id = o.familia_id
  where o.familia_id in (select id from demo_f)
    and (o.estagio_p2 is not null or o.estagio_p1 in ('qualificado', 'sessao_venda_agendada', 'sessao_venda_realizada'))
  union all
  select o.familia_id, 'estagio', 'qualificado → perdido',
         jsonb_build_object('maquina', 'p1', 'de', 'qualificado', 'para', 'perdido', 'motivo', o.motivo_perda::text),
         f.criado_em + interval '4 days'
  from oportunidade o join familia f on f.id = o.familia_id
  where o.familia_id in (select id from demo_f) and o.estagio_p1 = 'perdido' and o.estagio_p2 is null
  union all
  select s.familia_id, 'sessao', case s.status when 'realizada' then 'Sessão de venda realizada' when 'agendada' then 'Sessão de venda agendada'
                                                 when 'nao_compareceu' then 'Família não compareceu à sessão' else 'Sessão de venda ' || s.status::text end,
         jsonb_build_object('sessao_id', s.id, 'status', s.status::text), coalesce(s.realizada_em, least(s.agendada_para, now()))
  from sessao_venda s where s.familia_id in (select id from demo_f)
  union all
  select k.familia_id, 'contrato', 'Contrato enviado para assinatura', jsonb_build_object('contrato_id', k.id), k.enviado_em
  from contrato k where k.familia_id in (select id from demo_f) and k.enviado_em is not null
  union all
  select k.familia_id, 'contrato', 'Contrato assinado', jsonb_build_object('contrato_id', k.id), k.assinado_em
  from contrato k where k.familia_id in (select id from demo_f) and k.assinado_em is not null
  union all
  select k.familia_id, 'marco', 'Pagamento confirmado', jsonb_build_object('cobranca_id', c.id, 'parcela', c.parcela), c.pago_em
  from cobranca c join contrato k on k.id = c.contrato_id
  where k.familia_id in (select id from demo_f) and c.status = 'paga' and c.pago_em is not null
  union all
  select f.id, 'data_nascimento', 'Nascimento registrado', jsonb_build_object('data', f.data_nascimento), f.data_nascimento::timestamptz + interval '10 hours'
  from familia f where f.id in (select id from demo_f) and f.data_nascimento is not null
        and f.data_nascimento::timestamptz + interval '10 hours' < now()
  union all
  select f.id, 'data_alta', 'Alta registrada', jsonb_build_object('data', f.data_alta), f.data_alta::timestamptz + interval '10 hours'
  from familia f where f.id in (select id from demo_f) and f.data_alta is not null
        and f.data_alta::timestamptz + interval '10 hours' < now()
) e
where e.quando is not null and e.quando <= now()
  and not exists (select 1 from evento_familia x where x.familia_id = e.familia_id and x.titulo = e.titulo and x.tipo = e.tipo);

-- =============================================================================
-- 6. CONVERSAS, AGENTE, TRANSFERÊNCIAS E MARKETING DE CAPTAÇÃO
-- =============================================================================

-- --- Conversas (WhatsApp) de todas as famílias criadas aqui --------------------
create temp table demo_cv (
  chave text primary key, conversa_id uuid not null default gen_random_uuid(), familia_id uuid not null,
  pessoa_id uuid, jid text not null, tel text not null, nome text not null, contato text not null,
  classe classificacao_contato not null, ini timestamptz not null, nivel integer not null,
  perdido boolean not null default false, codigo text, utm jsonb
);
insert into demo_cv (chave, familia_id, pessoa_id, jid, tel, nome, contato, classe, ini, nivel, perdido, codigo, utm)
select d.chave, d.familia_id, p.id,
       '5511900000' || d.tel || case when d.chave = 'tati' then '-teste2' else '-teste' end || '@s.whatsapp.net',
       '+5511900000' || d.tel, d.mae || ' (Teste)', d.mae || ' Teste ' || d.sob,
       (case when d.tipo = 'c' then 'cliente' else 'lead' end)::classificacao_contato,
       d.criado + interval '10 minutes',
       case when d.tipo = 'c' then 4
            when l.p1 = 'novo' then 1 when l.p1 = 'em_conversa_ia' then 2 else 3 end,
       coalesce(l.p1 in ('perdido', 'nao_qualificado', 'fora_de_cobertura'), false),
       d.codigo, f.utm
from demo_fam d
join familia f on f.id = d.familia_id
join pessoa p on p.familia_id = d.familia_id and p.papel = 'mae'
left join demo_l l on l.chave = d.chave
where d.chave <> 'zeli';

insert into conversa (id, canal, wa_jid, telefone_e164, familia_id, pessoa_id, classificacao, nome_whatsapp,
                      nome_contato_salvo, iniciada_por, primeira_msg_em, criado_em)
select cv.conversa_id, 'whatsapp', cv.jid, cv.tel, cv.familia_id, cv.pessoa_id, cv.classe, cv.nome, cv.contato,
       'cliente', cv.ini, cv.ini
from demo_cv cv;

-- Mensagens: o diálogo cresce com o estágio da família (nível 1 a 4)
insert into mensagem (conversa_id, direcao, enviado_por, tipo, conteudo, enviada_em, criado_em)
select cv.conversa_id, t.direcao::direcao_mensagem, t.por::enviado_por, 'texto',
       replace(t.texto, '{nome}', split_part(cv.nome, ' ', 1)),
       least(now() - interval '1 minute', cv.ini + t.desloca),
       least(now() - interval '1 minute', cv.ini + t.desloca)
from demo_cv cv
join (values
  (1, 'entrada', 'cliente', 'Oi, vi o perfil de vocês e queria entender como funciona o acompanhamento depois do parto.', interval '0 minutes'),
  (1, 'saida',   'ia',      'Oi, {nome}! Que alegria receber a sua mensagem. Me conta, de quantas semanas você está e em qual cidade?', interval '2 minutes'),
  (2, 'entrada', 'cliente', 'Estou na reta final, moro perto do centro e a data prevista é daqui a algumas semanas.', interval '25 minutes'),
  (2, 'saida',   'ia',      'Perfeito, atendemos a sua região. Posso te explicar os pacotes e combinar uma conversa rápida com a nossa equipe?', interval '27 minutes'),
  (3, 'entrada', 'cliente', 'Pode sim, tenho curiosidade sobre o que a enfermeira faz em cada visita.', interval '3 hours'),
  (3, 'saida',   'humano',  'Oi, {nome}! Aqui é da equipe comercial da Kraamzorg. Vamos combinar um horário para te explicar com calma?', interval '1 day'),
  (3, 'entrada', 'cliente', 'Combinado, pode ser no fim da tarde.', interval '1 day 20 minutes'),
  (4, 'saida',   'humano',  'Segue o link do formulário seguro para os dados do contrato. Qualquer dúvida, me chame por aqui.', interval '6 days'),
  (4, 'entrada', 'cliente', 'Preenchido, obrigada!', interval '6 days 3 hours'),
  (4, 'saida',   'sistema', 'Recebemos o seu pagamento. Obrigada pela confiança, vamos cuidar de tudo com carinho.', interval '8 days')
) as t(nivel, direcao, por, texto, desloca) on t.nivel <= cv.nivel;

-- Quem desistiu agradece e some; o restante segue conforme o estágio
insert into mensagem (conversa_id, direcao, enviado_por, tipo, conteudo, enviada_em, criado_em)
select cv.conversa_id, 'entrada', 'cliente', 'texto', 'Obrigada pelas informações, vamos pensar e retornamos.',
       least(now() - interval '1 minute', cv.ini + interval '3 days'), least(now() - interval '1 minute', cv.ini + interval '3 days')
from demo_cv cv
join demo_l l on l.chave = cv.chave
where cv.perdido and l.motivo is distinct from 'sem_resposta' and l.p1 = 'perdido';

-- Famílias em atendimento hoje: conversa recente sobre a visita
insert into mensagem (conversa_id, direcao, enviado_por, tipo, conteudo, enviada_em, criado_em)
select cv.conversa_id, t.direcao::direcao_mensagem, t.por::enviado_por, 'texto', t.texto, now() - t.atras, now() - t.atras
from demo_cv cv
join (values
  ('sistema', 'saida',   'Lembrete: a visita de amanhã está confirmada. Se precisar mudar o horário, responda esta mensagem.', interval '1 day 2 hours'),
  ('cliente', 'entrada', 'Bom dia! A enfermeira já está a caminho?',                                                           interval '3 hours'),
  ('ia',      'saida',   'Bom dia! Ela chega no horário combinado. Se houver qualquer mudança, eu aviso por aqui.',            interval '2 hours 55 minutes')
) as t(por, direcao, texto, atras) on true
where cv.chave in ('pia', 'nair', 'lia', 'rita', 'tuca', 'uma');

-- Cobertura de cada conversa: primeira/última mensagem de entrada e saída
update conversa c
   set primeira_msg_em = x.primeira, ultima_entrada_em = x.ult_ent, ultima_saida_em = x.ult_sai
from (
  select m.conversa_id, min(m.enviada_em) as primeira,
         max(m.enviada_em) filter (where m.direcao = 'entrada') as ult_ent,
         max(m.enviada_em) filter (where m.direcao = 'saida') as ult_sai
  from mensagem m
  where m.conversa_id in (select conversa_id from demo_cv)
  group by m.conversa_id
) x
where c.id = x.conversa_id;

-- Estado do agente: pausado, encerrado e em silêncio, como os modos do PRD 11.7
update conversa c
   set agente_pausado_ate = now() + interval '20 hours',
       agente_pausa_motivo = 'Transferência aberta (condicao_comercial), aguardando o comercial responder.'
from demo_cv cv
where cv.conversa_id = c.id and cv.chave = 'opal';

update conversa c
   set agente_encerrado_em = c.ultima_saida_em, agente_encerrado_motivo = 'contratar'
from demo_cv cv
where cv.conversa_id = c.id and cv.chave in ('fran', 'giza');

-- Status de entrega das mensagens enviadas nos últimos dias (entregue, lida, falhou)
insert into privado.mensagem_status (mensagem_id, status, ocorrido_em, codigo_erro)
select m.id, s.status::privado.status_entrega, m.enviada_em + s.atraso,
       case when s.status = 'falhou' then '131026' end
from mensagem m
join (values
  ('enviada', interval '1 second'), ('entregue', interval '4 seconds'), ('lida', interval '12 minutes')
) as s(status, atraso) on s.status <> 'lida' or m.id::text < '8'
where m.direcao = 'saida' and m.conversa_id in (select conversa_id from demo_cv)
  and m.enviada_em > now() - interval '5 days'
  and not exists (select 1 from privado.mensagem_status x where x.mensagem_id = m.id and x.status = s.status::privado.status_entrega);

-- Uma mensagem que falhou na entrega (o número não recebeu)
insert into privado.mensagem_status (mensagem_id, status, ocorrido_em, codigo_erro)
select m.id, 'falhou', m.enviada_em + interval '9 seconds', '131026'
from mensagem m
join demo_cv cv on cv.conversa_id = m.conversa_id and cv.chave = 'rita'
where m.direcao = 'saida' and m.enviado_por = 'sistema' and m.enviada_em > now() - interval '5 days'
  and not exists (select 1 from privado.mensagem_status x where x.mensagem_id = m.id and x.status = 'falhou')
limit 1;

-- Origem da conversa (canal de captação) para o relatório de marketing
insert into privado.captacao_visita (canal_id, token, utm, criado_em, usada_em)
select k.id, upper(substr(md5('demo-visita-' || k.codigo || '-' || g.n), 1, 6)),
       jsonb_build_object('utm_source', lower(k.codigo), 'utm_campaign', 'teste_' || k.codigo),
       now() - make_interval(days => (g.n * 4) % 175, hours => g.n % 20),
       case when g.n % 3 = 0 then null else now() - make_interval(days => (g.n * 4) % 175, hours => g.n % 20) + interval '2 minutes' end
from privado.canal_captacao k
cross join generate_series(1, 14) as g(n)
where not exists (select 1 from privado.captacao_visita v where v.canal_id = k.id and v.token = upper(substr(md5('demo-visita-' || k.codigo || '-' || g.n), 1, 6)));

insert into privado.conversa_origem (conversa_id, criado_em, canal_id, codigo, visita_id, utm, familia_id)
select cv.conversa_id, cv.ini, k.id, k.codigo,
       (select v.id from privado.captacao_visita v where v.canal_id = k.id and v.usada_em is not null
         order by md5(v.id::text || cv.chave) limit 1),
       coalesce(cv.utm, '{}'::jsonb), cv.familia_id
from demo_cv cv
join privado.canal_captacao k on k.codigo = cv.codigo
where not exists (select 1 from privado.conversa_origem o where o.conversa_id = cv.conversa_id);

-- --- Transferências (handoff): abertas, assumidas, resolvidas, canceladas e vencidas ---
insert into handoff (conversa_id, familia_id, motivo, destino, prioridade, resumo, solicitacao, sla_vence_em,
                     notificado_em, notificacao_ok, assumido_por, assumido_em, resolvido_em, status, criado_em)
select (select c.id from conversa c where c.familia_id = f.id order by c.criado_em limit 1), f.id,
       v.motivo::handoff_motivo, v.destino::handoff_destino, v.prioridade::prioridade, v.resumo, v.solicitacao,
       now() + v.sla,
       now() + v.criado + interval '1 minute', v.notif,
       case when v.status in ('assumido', 'resolvido') then (select id from demo_perfil where chave = v.quem) end,
       case when v.status in ('assumido', 'resolvido') then now() + v.criado + interval '30 minutes' end,
       case when v.status = 'resolvido' then now() + v.criado + interval '3 hours' end,
       v.status::status_handoff, now() + v.criado
from (values
  ('bruma',   'perda',                 'coordenacao_clinica', 'maxima',  'Relato de perda gestacional. Contato só por pessoa, com cuidado e pelo nome.',                'Ligar com cuidado e sem mensagem automática.', interval '1 hour',     'aberto',    'coordenacao', interval '-3 hours',   true),
  ('cedro',   'condicao_comercial',    'comercial',           'alta',    'Pergunta se há desconto para pagamento à vista no pacote Essencial.',                         'Confirmar a condição de pagamento à vista.',  interval '2 hours',     'aberto',    'comercial',   interval '-20 hours',  true),
  ('opal',    'condicao_comercial',    'comercial',           'alta',    'Pede parcelamento em até 6 vezes no pacote Imersão.',                                         'Responder com a condição aprovada.',          interval '3 hours',     'aberto',    'comercial',   interval '-2 hours',   true),
  ('uva',     'reuniao',               'comercial',           'normal',  'Pediu horários para a reunião de apresentação.',                                              'Marcar a reunião de hoje.',                   interval '1 day',       'assumido',  'comercial',   interval '-5 hours',   true),
  ('quenia',  'cobertura_taxa',        'comercial',           'normal',  'Dúvida sobre taxa de deslocamento no bairro.',                                                'Confirmar a cobertura do bairro.',            interval '-3 days',     'resolvido', 'comercial',   interval '-4 days',    true),
  ('pia',     'saude',                 'coordenacao_clinica', 'maxima',  'Relata febre e calafrios hoje; já há alerta clínico aberto.',                                 'Acompanhar junto com a supervisão.',          interval '30 minutes',  'assumido',  'coordenacao', interval '-1 hour',    true),
  ('tuca',    'reclamacao',            'operacao',            'alta',    'Reclamação sobre o atraso da profissional na primeira visita.',                               'Ligar para a família e pedir desculpas.',     interval '-2 hours',    'aberto',    'coordenacao', interval '-9 hours',   false),
  ('nair',    'pos_venda_operacao',    'operacao',            'normal',  'Pede para trocar o horário da visita de amanhã.',                                             'Reagendar a visita com a profissional.',      interval '6 hours',     'aberto',    'coordenacao', interval '-1 hour',    true),
  ('sara',    'duvida_sem_resposta',   'operacao',            'normal',  'Pergunta como pedir o reembolso no plano de saúde.',                                          'Orientar sobre o recibo.',                    interval '-8 days',     'resolvido', 'coordenacao', interval '-9 days',    true),
  ('hebe',    'pediu_humano',          'comercial',           'normal',  'Pediu para falar com uma pessoa.',                                                            'Responder pelo comercial.',                   interval '-80 days',    'cancelado', 'comercial',   interval '-81 days',   true),
  ('mel',     'audio_nao_transcrito',  'comercial',           'normal',  'Enviou um áudio que não pôde ser transcrito.',                                                'Ouvir o áudio e responder.',                  interval '4 hours',     'aberto',    'comercial',   interval '-2 hours',   true),
  ('iva',     'reembolso_fiscal',      'comercial',           'normal',  'Pede a segunda via da nota fiscal para o plano de saúde.',                                    'Enviar a segunda via.',                       interval '-120 days',   'resolvido', 'comercial',   interval '-121 days',  true),
  ('horizonte','contratar',            'comercial',           'alta',    'Confirmou que quer contratar e pediu o contrato.',                                            'Enviar o formulário seguro.',                 interval '-5 days',     'resolvido', 'comercial',   interval '-6 days',    true)
) as v(chave, motivo, destino, prioridade, resumo, solicitacao, sla, status, quem, criado, notif)
join demo_f f on f.chave = v.chave
where not exists (select 1 from handoff h where h.familia_id = f.id and h.motivo = v.motivo::handoff_motivo);

-- --- Consultas da Isadora à equipe (área, dúvida, horário da coordenação clínica) -------------
insert into consulta_equipe (conversa_id, familia_id, tipo, pergunta, preferencia, destino, resposta, respondida_por,
                             respondida_em, notificada_em, expira_em, devolvida_em, status, criado_em)
select (select c.id from conversa c where c.familia_id = f.id order by c.criado_em limit 1), f.id,
       v.tipo::tipo_consulta_equipe, v.pergunta, coalesce(v.preferencia, '{}'::jsonb), v.destino::handoff_destino,
       v.resposta,
       case when v.status = 'respondida' then (select id from demo_perfil where chave = 'comercial') end,
       case when v.status = 'respondida' then now() + v.criado + interval '25 minutes' end,
       now() + v.criado + interval '1 minute', now() + v.expira,
       case when v.status = 'respondida' then now() + v.criado + interval '30 minutes' end,
       v.status::status_consulta_equipe, now() + v.criado
from (values
  ('pera',   'area',             'A família pergunta se o atendimento cobre o bairro Centro de Londrina.',   null::jsonb,                                               'comercial', null,                                                    interval '2 hours',  interval '-20 minutes', 'aberta'),
  ('rosa',   'horario_edilaine', 'Qual horário a coordenação clínica tem para conversar com a família esta semana?',    '{"dias": ["terça", "quinta"], "periodo": "tarde"}'::jsonb, 'comercial', null,                                                    interval '3 hours',  interval '-10 minutes', 'aberta'),
  ('quenia', 'duvida',           'Há taxa de deslocamento para o bairro Santa Cecília?',                      null,                                                      'comercial', 'Não há taxa de deslocamento nesse bairro.',            interval '-3 days',  interval '-4 days',     'respondida'),
  ('mel',    'duvida',           'O pacote cobre acompanhamento de gêmeos?',                                  null,                                                      'comercial', null,                                                    interval '-1 day',   interval '-2 days',     'expirada'),
  ('yara',   'area',             'A família mora em Barueri; confirmar se atendemos.',                        null,                                                      'comercial', null,                                                    interval '-2 days',  interval '-3 days',     'cancelada')
) as v(chave, tipo, pergunta, preferencia, destino, resposta, expira, criado, status)
join demo_f f on f.chave = v.chave
where not exists (select 1 from consulta_equipe q where q.pergunta = v.pergunta);

-- --- Execuções de automações (histórico: executada, abortada pelo freio, falhou...) ----
insert into automacao_execucao (automacao_id, familia_id, agendada_para, executada_em, status, motivo_aborto, payload, erro, criado_em)
select v.automacao, f.id, now() + v.quando,
       case when v.status in ('executada', 'falhou') then now() + v.quando end,
       v.status::status_execucao, v.motivo, '{}'::jsonb, v.erro, least(now() - interval '1 minute', now() + v.quando - interval '1 hour')
from (values
  ('boas_vindas',            'yara',   interval '-3 days',    'executada',     null, null),
  ('boas_vindas',            'vilma',  interval '-6 days',    'executada',     null, null),
  ('followup_d1',            'tati',   interval '-13 days',   'executada',     null, null),
  ('followup_d3_d14',        'uva',    interval '-6 days',    'executada',     null, null),
  ('followup_d3_d14',        'bruma',  interval '-5 days',    'abortada_freio','Estado sensível: bloqueio total.', null),
  ('regua_nutricao',         'estrela',interval '-4 days',    'abortada_freio','Estado sensível: atenção, conteúdo pausado.', null),
  ('regua_nutricao',         'gil',    interval '-2 days',    'executada',     null, null),
  ('lembrete_sessao',        'uva',    interval '-26 hours',  'executada',     null, null),
  ('contrato_fechado',       'giza',   interval '-6 days',    'executada',     null, null),
  ('pagamento_confirmado',   'mila',   interval '-11 days',   'executada',     null, null),
  ('pagamento_confirmado',   'olga',   interval '-10 hours',  'executada',     null, null),
  ('pagamento_atrasado',     'nina',   interval '-2 days',    'executada',     null, null),
  ('pagamento_atrasado',     'kely',   interval '-13 days',   'falhou',        null, 'Falha ao enviar pela API do WhatsApp (dado de demonstração).'),
  ('checkin_dpp',            'jana',   interval '-1 day',     'executada',     null, null),
  ('dpp_sem_contato',        'ines',   interval '-3 days',    'executada',     null, null),
  ('nascimento',             'vera',   interval '-1 day',     'executada',     null, null),
  ('nascimento',             'xana',   interval '-2 hours',   'executada',     null, null),
  ('alta',                   'pia',    interval '-4 days',    'executada',     null, null),
  ('regua_nutricao',         'lis',    interval '-50 days',   'cancelada',     'Família encerrada com cuidado; sem novos contatos.', null),
  ('boas_vindas',            'zeli',   interval '-20 hours',  'executada',     null, null)
) as v(automacao, chave, quando, status, motivo, erro)
join demo_f f on f.chave = v.chave
where not exists (select 1 from automacao_execucao e where e.automacao_id = v.automacao and e.familia_id = f.id
                  and e.status = v.status::status_execucao);

-- --- Perguntas ao copiloto (histórico) ------------------------------------------------
insert into privado.copiloto_pergunta (usuario_id, pergunta, ferramenta, parametros, situacao, motivo, tokens_entrada, tokens_saida, criado_em)
select (select id from demo_perfil where chave = v.quem), v.pergunta, v.ferramenta, v.parametros::jsonb, v.situacao, v.motivo,
       v.te, v.ts, now() - make_interval(days => v.dias, hours => v.dias % 7)
from (values
  ('comercial', 'Quantos leads entraram por origem neste mês?',                'copiloto_leads_origem', '{"periodo":"mes_atual"}',     'respondida', null,            410, 180, 1),
  ('diretoria', 'Qual foi a receita dos últimos três meses?',                  'copiloto_receita',      '{"meses":3}',                'respondida', null,            380, 210, 2),
  ('comercial', 'Como está o funil do pipeline de venda?',                     'copiloto_pipeline',     '{"pipeline":1}',             'respondida', null,            350, 240, 3),
  ('diretoria', 'Qual a ocupação das próximas oito semanas?',                  'copiloto_ocupacao',     '{"semanas":8}',              'respondida', null,            360, 200, 5),
  ('comercial', 'Qual foi a conversão de lead para contrato no trimestre?',    'copiloto_conversao',    '{"periodo":"trimestre"}',    'respondida', null,            390, 190, 8),
  ('diretoria', 'Mostre o resumo do registro assistencial da família tal.',    null,                    '{}',                         'recusada',   'assistencial',  120, 40,  9),
  ('comercial', 'Qual o telefone pessoal de uma profissional?',                null,                    '{}',                         'recusada',   'fora_do_escopo',110, 35,  12),
  ('diretoria', 'Quanto faturamos por campanha?',                              'copiloto_receita',      '{"agrupar":"campanha"}',     'respondida', null,            400, 230, 15)
) as v(quem, pergunta, ferramenta, parametros, situacao, motivo, te, ts, dias)
where not exists (select 1 from privado.copiloto_pergunta c where c.pergunta = v.pergunta and c.situacao = v.situacao);

-- --- Saúde do sistema: recálculo diário e webhooks (só datas) ---------------------------
insert into privado.recalculo_execucao (iniciado_em, concluido_em, origem, status)
select now() - make_interval(days => g.n, hours => 3), now() - make_interval(days => g.n, hours => 3) + interval '40 seconds',
       'cron', 'concluido'::privado.status_recalculo
from generate_series(0, 4) as g(n)
where not exists (select 1 from privado.recalculo_execucao);

insert into privado.saude_webhook (origem, ultimo_recebido_em, ultimo_ok_em, ultima_falha_em)
select v.origem, now() - v.recebido, now() - v.ok, case when v.falha is null then null else now() - v.falha end
from (values
  ('whatsapp',    interval '3 minutes',  interval '3 minutes',  null::interval),
  ('autentique',  interval '2 days',     interval '2 days',     null),
  ('infinitepay', interval '5 hours',    interval '5 hours',    interval '3 days')
) as v(origem, recebido, ok, falha)
where not exists (select 1 from privado.saude_webhook w where w.origem = v.origem);

-- --- Adendos aos registros (append-only: só INSERT) ---------------------------------------
insert into registro_adendo (registro_id, autor_id, motivo, conteudo, criado_em)
select r.id, (select id from demo_perfil where chave = 'enfermeira'), x.motivo, x.conteudo,
       least(now() - interval '5 minutes', r.criado_em + interval '1 day')
from (values
  ('pia', 1, 'Correção do horário de saída', 'O horário de saída correto foi às 12h10.'),
  ('uma', 2, 'Informação complementar',      'A família confirmou que a avó acompanhou a visita inteira.'),
  ('elis', 3, 'Correção de digitação',       'O campo de observação ficou com uma palavra trocada; o sentido do registro não muda.')
) as x(chave, dia, motivo, conteudo)
join demo_v v on v.chave = x.chave and v.dia = x.dia
join registro_atendimento r on r.visita_id = v.visita_id
where not exists (select 1 from registro_adendo a where a.registro_id = r.id);

-- --- Horários que a Isadora ofereceu na conversa (escolhido, descartado, ainda válido) ---
insert into sessao_venda_opcao (conversa_id, inicio, fim, consultada_em, valida_ate, conferida_em, escolhida_em, descartada_em, criado_em)
select (select c.id from conversa c where c.familia_id = f.id order by c.criado_em limit 1),
       now() + v.ini, now() + v.ini + interval '50 minutes', now() - v.ago, now() - v.ago + interval '30 minutes',
       case when v.estado <> 'valida' then now() - v.ago + interval '10 minutes' end,
       case when v.estado = 'escolhida' then now() - v.ago + interval '12 minutes' end,
       case when v.estado = 'descartada' then now() - v.ago + interval '12 minutes' end,
       now() - v.ago
from (values
  ('rosa', 'escolhida',  interval '2 days',   interval '20 hours'),
  ('rosa', 'descartada', interval '3 days',   interval '20 hours'),
  ('pera', 'valida',     interval '5 days 2 hours', interval '5 minutes')
) as v(chave, estado, ini, ago)
join demo_f f on f.chave = v.chave
where not exists (select 1 from sessao_venda_opcao o
                  where o.conversa_id = (select c.id from conversa c where c.familia_id = f.id order by c.criado_em limit 1));

-- --- Última leitura da base de conhecimento da Isadora ---------------------------------------
insert into agente.ingestao_execucao (lote_id, documentos, status, erro, criado_em)
select gen_random_uuid(), v.docs, v.status::status_ingestao, v.erro, now() - v.ago
from (values
  (0,  'falhou', 'Tempo esgotado ao gerar os vetores (dado de demonstração).', interval '2 days'),
  (43, 'ok',     null,                                                          interval '3 hours')
) as v(docs, status, erro, ago)
where not exists (select 1 from agente.ingestao_execucao);

commit;
