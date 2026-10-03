# Decisões pendentes para a cliente

Documento para encaminhar. Reúne o que ficou **de fora** da rodada de 02/10 porque a Camila **não pediu**, ou porque exige uma decisão (clínica, de produto ou de dado) que não é da equipe técnica. O que ela pediu foi feito: o visual idêntico ao HTML dela, o checklist com horário de chegada e saída, o Radar com cronograma sincronizado, o portal da família, o quadro de tarefas e os gráficos.

Cada item diz **o que é**, **por que ficou de fora** e **a recomendação**. Quem decide está no título de cada bloco.

---

## 1. Para a Edilaine (decisão clínica)

O checklist do app (DOC 2) já tem **todas as perguntas** da planilha. O que se achava faltando era o horário de chegada e saída, e isso entrou na tela do checklist. Restam estas dúvidas, que só a Edilaine pode fechar (nenhum campo clínico foi alterado):

| # | Dúvida | Hoje no app | Recomendação |
| :-- | :-- | :-- | :-- |
| 1.1 | **Lesão mamilar.** A planilha escreve "D/E, S/N". Pode haver lesão nos dois lados ao mesmo tempo? | Uma só opção: Não, Direita, Esquerda ou Ambas | Manter "Ambas" se a resposta for sim |
| 1.2 | **Ictérica.** A planilha lista só as zonas I a V. | O app tem também "Ausente" | Manter "Ausente" (sem ele a enfermeira é obrigada a marcar uma zona) |
| 1.3 | **Checklist de 12 dias e de 3 ou 6 horas.** A planilha só cobre D1 a D6. | Um registro por visita, para 6 ou 12 dias | Confirmar que é o mesmo checklist, sem itens diferentes |
| 1.4 | **PDF da visita.** Incluir o horário de chegada e de saída no documento. | O dado existe (`checkin_em`, `checkout_em`); o PDF ainda não mostra | Incluir (é pequeno) |
| 1.5 | **Duração prevista (3h ou 6h) no próprio checklist.** | Hoje vem do aparelho (cache da tela Hoje) | Passar a vir do servidor (exige acrescentar `horas_por_visita` a `api.checklist_visita`, SQL para revisão) |

Se a Edilaine mudar a 1.1 ou a 1.2, a nova versão do instrumento entra por migration revisada, como a 0045.

## 2. Para o Leonardo e a diretoria (produto e dado)

Telas do HTML da Camila que mostram algo que **o sistema ainda não guarda ou não faz**. No app, cada bloco ficou no lugar certo com estado vazio honesto (nenhum número inventado). Para ligar de verdade, cada item pede o dado ou a função indicada.

**Pipeline e famílias**
- Semana gestacional **na entrada** do lead (hoje o gráfico usa a semana de hoje, pela DPP) e a série "viraram contrato". Pede gravar a semana na entrada.
- "Tempo médio parado por etapa" e "Contratos por mês". Pedem histórico de mudança de estágio por etapa e série mensal de contratos.
- Colunas **Pacote, Profissional e Origem** na lista de famílias; **nomes da equipe designada** na ficha; KPI de **ticket médio**; botão **Exportar (sem dados assistenciais)**.
- Rótulos de origem "Agente" e "Handoff" do HTML não são valores do enum `origem_lead`. Decidir se entram como origem ou como outra informação.
- Cartão do pipeline: tabela "Faixas da régua gestacional" e o cartão "+ N famílias em régua automática" do HTML (exigem ler `regua_faixa` com contagem de famílias).

**Início e indicadores**
- Medidor de **fichas no prazo** (89%, meta 95% no HTML): pede definir a regra e um parâmetro.
- Coluna **pacote** na "Agenda de hoje": a tela hoje não carrega o nome do pacote.
- Botão **"Adiar"** em "Precisa de decisão": não existe função. Decidir o que adiar significa.

**Tarefas**
- Indicadores **"Concluídas na semana"** e **"Criadas por automação"**: a tarefa não guarda a data de conclusão nem a origem (automática ou à mão). Pede dois campos.
- Gráfico **"Origem das tarefas"** depende do mesmo campo de origem.

**Pesquisa & NPS e Indicações**
- **Notas por dimensão** (o banco guarda só a nota geral) e o **texto das respostas** (depoimentos).
- Indicações: **receita indicada** por origem, **série mensal** cliente x médica e as etapas do funil "Contato feito" e "Sessões" (o app tem indicações, qualificadas e contratos).
- A frase para notas 7 e 8 em "Ação por nota" ("agradece e escuta a família") foi escrita pela equipe técnica; **a coordenação deve confirmar** se é a prática real.

**Portal da família**
- No portal que a família vê: **"Confirmar presença"**, **"Seus conteúdos"**, **"Seus documentos"** (sem função nem dado). Dia da semana nas visitas e a frase "Sua enfermeira chega amanhã às 9h" (pedem texto em `mensagem_modelo` e cálculo de data no fuso de Brasília).
- Na visão da equipe: **"O que a família mais abre"** (pede contagem de aberturas).

**Radar, Agenda, Escala e Equipe**
- **Cascata do radar:** as três opções do HTML (acionar backup, redistribuir, negociar horários) não existem como dado nem ação.
- **Gatilhos "DPP menos 7, mais 3, mais 10":** são regra, e a regra do projeto é que a DPP nunca dispara ação. Decidir se existe aviso (sem ação) e com que janelas.
- **Capacidade em dias de profissional comprometidos sobre disponíveis** (hoje mede famílias da semana sobre o limite da praça).
- **Conflito de agenda entre profissionais** no radar (pede ler a escala por profissional) e **data da consulta pré-natal** no radar (hoje só vem o status).
- **Agenda:** visões Mês, Ano e Por região. A integração com o Google Calendar está prevista no fluxo 4 do n8n e não é feita no app.
- **Escala:** linha "Não alocado" (demanda sem profissional). **Equipe:** "Deslocamento médio", "Avaliação média", "Entrega de ficha no prazo" (pede o prazo como dado) e "Treinamentos".

**Isadora e Copiloto**
- Blocos vazios por falta de dado: **Solicitações**, **tempo até assumir**, **volume por semana**, **resolução sem humano**, **horário das conversas**, **FAQs mais acionadas**, **custo por conversa** e **lista de termos de alerta** (o app não a lê).
- **Selo "ligado / em teste / pausado / desligado":** o modo do agente é parâmetro da implantação e o app não consegue lê-lo. Exibir exige uma função de leitura (migration).
- Os cinco bloqueios de política do agente ficaram **escritos no código** na aba "Limites do agente". A regra do projeto manda texto de regra ir para tabela de configuração. Decidir se entram em `parametro`.
- O item "Agendar sessão consultando a agenda real" saiu da lista por falta de comprovação. Confirmar com o Leonardo antes de voltar.

**Documentos, Integrações e Configurações**
- **Documentos:** contratos e assinaturas, templates e materiais do cliente não têm tela nem dado.
- **Integrações:** o HTML tem a tela; o app não tem rota nem dado de integrações.
- **Configurações:** as tabelas de **automações** e de **papéis e permissões** do HTML não foram portadas.

**Manuais**
- Gráfico "Aceites pendentes por manual" virou "Leituras confirmadas por manual". Para voltar ao original, a confirmação de leitura precisa expor os pendentes.

## 3. Para a Camila (marca e visual)

- **Cores.** O HTML dela usa marinho `#10202E`, dourado `#AE8B48`, areia `#E6DAC0` e creme `#FBF9ED`. O guia da marca usa `#0F1F36`, `#BC9C5D`, `#E8DAC5` e `#FCF8ED`. O app agora usa as do **HTML**. **Confirmar qual é a oficial.** Está registrado no PRD (v4.7).
- **Fonte.** Jost 200 e 300 foram incluídas (licença livre). A Codec Pro continua com a licença web por confirmar.
- **Tamanho do texto no computador.** A partir de 1024 px a escala segue o HTML (apoio 12,5 px, rótulos de 10 e 11 px). Isso fica abaixo do mínimo de 13 px que o PRD de acessibilidade pede. No celular a regra de 13 px e alvo de 44 px continua. **Confirmar se aceitam a escala do HTML no computador.**
- **Textos novos escritos pela equipe técnica**, para aprovação: o parágrafo do painel dourado do login ("Estamos com cada família nas primeiras semanas em casa, com carinho, calma e segurança.") e o rótulo "Pesquisa & NPS" para a tela de pós-venda.

## 4. Para a equipe técnica (não precisa de cliente)

- Aplicar a migration `0046_tarefas_acoes.sql` (criar, atribuir, mudar estado e concluir tarefa). Já aplicada no Supabase de demonstração.
- Os dados fictícios de demonstração (`carga-demo-completa.sql` e `demo-telas-seed.sql`) devem ser **apagados** antes de qualquer uso com família real.
- Trocar a senha do banco e a `service_role` do Supabase do projeto de demonstração.
- Perfis de teste do seed: `desativar-perfis-teste.sql` desativa sem apagar.
