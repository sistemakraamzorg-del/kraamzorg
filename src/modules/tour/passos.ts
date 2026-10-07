import type { Papel } from "@/lib/auth/papeis";
import type { ROTAS } from "@/lib/navegacao";

/**
 * Catálogo de textos do tour guiado: um verbete para cada tela do registro
 * de navegação (src/lib/navegacao), mais a abertura, o passo do checklist
 * da visita, o encerramento e os rótulos do próprio tour. Todo texto do
 * tour mora aqui e em nenhum outro arquivo.
 *
 * A régua é uma pessoa que nunca viu o sistema e não é técnica. Por isso:
 * - `serve` explica o termo do ofício logo no começo (pipeline, radar,
 *   pré-natal, pós-venda, capacidade, copiloto), em uma ou duas frases;
 * - `fazer` são 2 ou 3 frases curtas no imperativo;
 * - `ondeFica` diz onde estão as coisas principais na tela;
 * - `dica` é opcional, prática e curta.
 * Nenhum nome de pessoa ou de família, nenhuma sigla sem explicação, sem
 * travessão (testes em passos.test.ts).
 *
 * Os textos saem da leitura das telas reais (src/app/(app)/<rota>/page.tsx,
 * src/app/(enfermeira)/<rota>/page.tsx e os módulos de cada uma), do PRD
 * (capítulos 11, 12, 13 e 20) e dos manuais em docs/manual. Tela nova:
 * acrescente a rota em src/lib/navegacao e o verbete aqui (o tipo exige).
 */

/** Uma chamada do mini-tour de uma tela: aponta para `data-tour="<caminho>:<nome>"`. */
export interface Detalhe {
  /** Nome do elemento; o alvo na página é `data-tour="<caminho>:<nome>"`. */
  nome: string;
  titulo: string;
  texto: string;
}

/** Parte do verbete que muda conforme o papel de quem faz o tour. */
export interface TextoPorPapel {
  serve?: string;
  fazer?: string[];
  ondeFica?: string;
  dica?: string;
  /** Mini-tour próprio do papel (ex.: o Início, que é diferente para cada um). */
  detalhes?: Detalhe[];
}

export interface Verbete {
  titulo: string;
  /** Uma ou duas frases: para que a tela serve, explicando o termo do ofício. */
  serve: string;
  /** 2 ou 3 frases no imperativo. */
  fazer: string[];
  /** Onde ficam as coisas principais na tela. */
  ondeFica: string;
  dica?: string;
  /** Mini-tour da tela (só nas telas principais de cada papel, ver TELAS_EM_DETALHE). */
  detalhes?: Detalhe[];
  porPapel?: Partial<Record<Papel, TextoPorPapel>>;
}

/** Caminho de cada rota do registro de navegação. */
export type CaminhoRota = (typeof ROTAS)[keyof typeof ROTAS]["caminho"];

/** Versão do tour: mude quando o tour mudar muito, para o convite voltar a aparecer. */
export const VERSAO_TOUR = "1";

export const PASSOS: Record<CaminhoRota, Verbete> = {
  "/inicio": {
    titulo: "Início",
    serve:
      "O Início é a primeira tela do dia. Ele mostra o que pede a sua atenção agora e os números principais da sua área.",
    fazer: [
      "Leia a frase do alto, que resume o dia",
      "Comece pelo que pede ação agora",
      "Toque num cartão para abrir a tela que resolve",
    ],
    ondeFica:
      "A frase do dia fica no alto, os números logo abaixo e as listas de trabalho mais embaixo.",
    porPapel: {
      comercial: {
        serve:
          "O Início mostra o que pede ação agora: conversas que a Isadora passou para a equipe, tarefas que vencem hoje e conversas de orientação marcadas.",
        fazer: [
          "Comece pela lista O que pede ação agora",
          "Assuma uma transferência em Assumir conversa",
          "Feche as tarefas de hoje, no fim da tela",
        ],
        ondeFica:
          "No alto, o que pede ação; no meio, os números e o funil dos contatos novos; embaixo, as transferências e as tarefas de hoje.",
        dica: "O número vermelho no item Início do menu conta as transferências que pedem atenção.",
        detalhes: [
          {
            nome: "acao",
            titulo: "O que pede ação agora",
            texto:
              "A lista do que precisa de você, em ordem de urgência. Toque numa linha para ir direto ao assunto.",
          },
          {
            nome: "numeros",
            titulo: "Os números do dia",
            texto:
              "Transferências esperando, tarefas de hoje, conversas marcadas e contatos quentes. Cada número abre a tela dele.",
          },
          {
            nome: "transferencias",
            titulo: "Transferências",
            texto:
              "As conversas que a Isadora passou para a equipe, com o motivo e o prazo. Toque em Assumir conversa para responder a família.",
          },
          {
            nome: "tarefas",
            titulo: "Tarefas de hoje",
            texto:
              "O que vence hoje. Resolva e toque em Concluir; Ver família abre a ficha.",
          },
        ],
      },
      coordenacao: {
        serve:
          "O Início mostra a operação de hoje: visitas, fichas sem assinatura, famílias esperando o nascimento, ofertas sem resposta e alertas de saúde.",
        fazer: [
          "Comece pelos Alertas prioritários",
          "Confira a Agenda de hoje, com cada enfermeira",
          "Resolva o que aparece em Precisa de decisão",
        ],
        ondeFica:
          "Os números ficam no alto; os alertas e a agenda de hoje, no meio; as decisões e as famílias perto do fim do cuidado, mais embaixo.",
        dica: "Ficha sem assinatura é uma visita que terminou e ainda não teve o registro entregue.",
        detalhes: [
          {
            nome: "numeros",
            titulo: "Os números do dia",
            texto:
              "Visitas de hoje, fichas sem assinatura, famílias esperando o nascimento e ofertas sem resposta. Cada número abre a tela dele.",
          },
          {
            nome: "alertas",
            titulo: "Alertas prioritários",
            texto:
              "Alertas de saúde, fichas por assinar e bebês que nasceram, em ordem de urgência. Os atalhos de baixo levam às telas que resolvem cada um.",
          },
          {
            nome: "agenda",
            titulo: "Agenda de hoje",
            texto:
              "Cada visita do dia, com a enfermeira, a região e o dia do cuidado. Ver a agenda do dia abre a agenda completa.",
          },
          {
            nome: "decisoes",
            titulo: "Precisa de decisão",
            texto:
              "Conflitos de escala, semanas perto do limite e famílias sem enfermeira titular, cada um com o botão que resolve.",
          },
        ],
      },
      financeiro: {
        serve:
          "O Início mostra o dinheiro do mês: o que entrou, as despesas, o que falta receber e as cobranças vencidas.",
        fazer: [
          "Veja as cobranças vencidas em O que pede ação agora",
          "Compare o recebido com a despesa de cada mês",
          "Cobre primeiro as dívidas mais antigas",
        ],
        ondeFica:
          "No alto, o que pede ação e os quatro números do mês; embaixo, o gráfico de recebido e despesa e o atraso por faixa de dias.",
        detalhes: [
          {
            nome: "acao",
            titulo: "O que pede ação agora",
            texto:
              "As cobranças vencidas, com o total em atraso. Toque para abrir a lista e comece pelas mais antigas.",
          },
          {
            nome: "numeros",
            titulo: "Os números do mês",
            texto:
              "Recebido, despesas, o que falta receber e o que já venceu. Cada número abre a tela que explica.",
          },
          {
            nome: "graficos",
            titulo: "Os gráficos",
            texto:
              "O recebido e a despesa de cada mês e o atraso separado por faixa de dias.",
          },
        ],
      },
      marketing: {
        serve:
          "O Início mostra o resumo do mês: quantos contatos novos chegaram, quantos foram qualificados e quantos viraram família. São números somados, sem dado de família.",
        fazer: [
          "Leia os números do mês no alto",
          "Veja de qual canal veio cada contato",
          "Compare as barras do caminho até o contrato",
        ],
        ondeFica:
          "Os números ficam no alto; o gráfico por canal e o caminho do contato até o contrato, logo abaixo.",
        dica: "Na tela, contato novo aparece como lead.",
        detalhes: [
          {
            nome: "numeros",
            titulo: "Os números do mês",
            texto:
              "Contatos novos, qualificados e famílias ganhas no mês, comparados com o mês anterior.",
          },
          {
            nome: "graficos",
            titulo: "Os gráficos",
            texto:
              "De qual canal veio cada contato e onde as famílias ficam pelo caminho até o contrato.",
          },
        ],
      },
      diretoria: {
        serve:
          "O Início da diretoria resume a empresa no mês: contratos e faturamento contra a meta, famílias em atendimento, visitas de hoje e o que foi recebido.",
        fazer: [
          "Leia a frase do alto, com a meta do mês",
          "Veja os Alertas prioritários e a Agenda de hoje",
          "Siga os atalhos para Radar, Capacidade e Painel",
        ],
        ondeFica:
          "Os números do mês ficam no alto; o funil, a capacidade e os alertas, no meio; a agenda de hoje e as decisões, embaixo.",
        detalhes: [
          {
            nome: "frase",
            titulo: "A frase do mês",
            texto:
              "Contratos assinados e faturamento do mês, comparados com a meta, numa frase só.",
          },
          {
            nome: "numeros",
            titulo: "Os números do mês",
            texto:
              "Famílias em atendimento, visitas de hoje, famílias esperando o nascimento e o que entrou no mês. Cada número abre a tela dele.",
          },
          {
            nome: "alertas",
            titulo: "Alertas prioritários",
            texto:
              "Alertas de saúde, fichas por assinar e bebês que nasceram, em ordem de urgência. Os atalhos de baixo levam às telas que resolvem cada um.",
          },
          {
            nome: "agenda",
            titulo: "Agenda de hoje",
            texto:
              "Cada visita do dia, com a enfermeira, a região e o dia do cuidado. Ver a agenda do dia abre a agenda completa.",
          },
        ],
      },
    },
  },

  "/pipeline": {
    titulo: "Pipeline",
    serve:
      "O pipeline é o quadro com as etapas da venda, do primeiro contato até o contrato. Cada família é um cartão na coluna da etapa em que está.",
    fazer: [
      "Escolha o quadro nas abas do alto, de 1 a 4",
      "Busque pelo nome ou filtre por região",
      "Abra um cartão para ver a ficha da família",
    ],
    ondeFica:
      "As abas dos quatro quadros ficam no alto, a busca e os filtros logo abaixo e as colunas das etapas em seguida. No menu do computador, a tela se chama CRM · pipelines.",
    dica: "Quente, morno e frio dizem o quanto a família está perto de decidir.",
    detalhes: [
      {
        nome: "quadros",
        titulo: "Os quatro quadros",
        texto:
          "Entrada e qualificação, Venda e pré-atendimento, Atendimento e Pós-venda. Toque num deles para trocar de quadro.",
      },
      {
        nome: "filtros",
        titulo: "Busca e filtros",
        texto:
          "Busque pelo nome ou pelo telefone e filtre por região e temperatura. Filtrar aplica; Limpar volta ao começo.",
      },
      {
        nome: "colunas",
        titulo: "As colunas das etapas",
        texto:
          "Cada coluna é uma etapa e cada cartão, uma família. Arraste o cartão para outra coluna ou use o botão Mover para.",
      },
      {
        nome: "cadastrar",
        titulo: "Cadastrar lead",
        texto:
          "Cadastra à mão um contato novo, com a origem. Ele entra na etapa Novo do quadro de entrada.",
      },
    ],
  },

  "/familias": {
    titulo: "Famílias",
    serve:
      "A lista de todas as famílias, com a situação de cada uma. A ficha da família junta a linha do tempo, a parte comercial e as conversas.",
    fazer: [
      "Busque pelo nome ou pelo telefone",
      "Use os filtros Gestando, Em atendimento ou Com freio",
      "Toque em Abrir para ver a ficha",
    ],
    ondeFica:
      "Os números ficam no alto, a busca e os filtros logo abaixo e cada família é uma linha da lista, com o botão Abrir no fim.",
    dica: "Na ficha, o botão Freio pausa na hora todas as mensagens automáticas para aquela família.",
    detalhes: [
      {
        nome: "numeros",
        titulo: "Os números",
        texto:
          "Quantas famílias estão cadastradas, gestando, em atendimento e com freio.",
      },
      {
        nome: "busca",
        titulo: "Busca",
        texto:
          "Ache a família pelo nome, pelo bairro, pela cidade ou pelo telefone.",
      },
      {
        nome: "filtros",
        titulo: "Filtros e ordem",
        texto:
          "Mostre só uma fase, como Gestando ou Com freio, e escolha a ordem da lista.",
      },
      {
        nome: "linha",
        titulo: "Cada família, uma linha",
        texto: "Toque na linha para abrir a ficha da família.",
      },
    ],
    porPapel: {
      financeiro: {
        serve:
          "A lista das famílias com contrato, para você conferir o contrato, a forma de pagamento e a situação da cobrança de cada uma.",
        fazer: [
          "Busque pelo nome ou pelo telefone",
          "Toque em Abrir para ver contrato e pagamento",
        ],
        dica: "Você vê a ficha comercial; o registro de saúde não aparece para o financeiro.",
      },
      coordenacao: {
        serve:
          "A lista de todas as famílias, com a etapa e o próximo passo de cada uma. A ficha mostra as quatro datas: parto previsto, nascimento, alta e início do cuidado.",
        fazer: [
          "Filtre por Em atendimento para ver quem está com a equipe",
          "Abra a ficha para ver as datas e as pessoas",
          "Toque em Freio quando a família precisar de silêncio",
        ],
      },
    },
  },

  "/conversas": {
    titulo: "Conversas",
    serve:
      "As conversas de WhatsApp com as famílias, da Isadora e da equipe, num lugar só. A Isadora é a atendente virtual que faz o primeiro atendimento.",
    fazer: [
      "Comece pelo filtro Esperando alguém",
      "Escolha uma conversa da lista para abrir",
      "Responda no campo que fica embaixo da conversa",
    ],
    ondeFica:
      "A busca e os filtros ficam no alto da lista; a conversa escolhida abre ao lado, com a transferência no topo quando houver.",
    dica: "O número ao lado de Conversas, no menu, conta as conversas que esperam alguém da equipe.",
    detalhes: [
      {
        nome: "busca",
        titulo: "Busca",
        texto: "Ache a conversa pelo nome ou pelo telefone.",
      },
      {
        nome: "filtros",
        titulo: "Filtros",
        texto:
          "Esperando alguém mostra quem precisa de resposta da equipe. Os outros separam as conversas da Isadora, da equipe, as pausadas e as com freio.",
      },
      {
        nome: "lista",
        titulo: "A lista de conversas",
        texto:
          "Cada linha mostra a última mensagem e quem conduz. Toque para abrir a conversa e responder no campo de baixo.",
      },
    ],
  },

  "/transferencias": {
    titulo: "Transferências",
    serve:
      "A transferência é quando a Isadora passa a conversa para uma pessoa da equipe. A fila delas mora dentro de Conversas, no filtro Esperando alguém.",
    fazer: [
      "Abra Conversas e escolha Esperando alguém",
      "Comece pelas de prazo mais curto",
      "Toque em Assumir conversa para responder",
    ],
    ondeFica:
      "Cada transferência aparece no topo da conversa, com o motivo, a prioridade e quanto tempo falta.",
    dica: "Enquanto você conversa, a Isadora fica em pausa.",
  },

  "/agente": {
    titulo: "Isadora",
    serve:
      "A Isadora é a atendente virtual, feita com inteligência artificial, que responde as famílias no WhatsApp. Aqui você acompanha como ela está atendendo.",
    fazer: [
      "Veja as conversas que ela está conduzindo",
      "Troque de assunto pelas abas do alto",
      "Abra a conversa para pausar ou assumir",
    ],
    ondeFica:
      "As abas ficam no alto: Conversas, Handoffs (as passagens para a equipe), Solicitações, Métricas e Limites e FAQs (as perguntas frequentes). No menu do computador, a tela se chama Agente de IA.",
    dica: "Pausar, assumir ou devolver uma conversa à Isadora se faz dentro da própria conversa, nos botões do alto.",
  },

  "/tarefas": {
    titulo: "Tarefas",
    serve:
      "As suas tarefas, agrupadas pelo prazo. Cada uma diz por que existe, o que fazer e traz o botão da ação ao lado.",
    fazer: [
      "Comece pelas que vencem hoje",
      "Leia Por que existe e O que fazer",
      "Toque em Concluir quando resolver",
    ],
    ondeFica:
      "Os números ficam no alto; a lista Minhas tarefas vem logo abaixo, separada por prazo.",
    porPapel: {
      comercial: {
        fazer: [
          "Comece pelas que vencem hoje",
          "Use o texto sugerido e ajuste com as suas palavras",
          "Toque em Concluir ou em Enviei quando terminar",
        ],
        dica: "Com texto sugerido, o WhatsApp abre com ele pronto e nada sai antes de você tocar em enviar.",
      },
      coordenacao: {
        dica: "As tarefas de cada pessoa da equipe ficam em Tarefas por equipe.",
      },
      diretoria: {
        dica: "As tarefas de cada pessoa da equipe ficam em Tarefas por equipe.",
      },
      financeiro: {
        serve:
          "As tarefas que o sistema ou a equipe abriram para você, agrupadas pelo prazo. Cada uma diz por que existe e o que fazer.",
      },
    },
  },

  "/configuracoes": {
    titulo: "Configurações",
    serve:
      "Onde a empresa ajusta as próprias regras sem mexer no sistema: pacotes e preços, regiões, condições de pagamento, mensagens, termos de alerta e a régua de contato.",
    fazer: [
      "Escolha o assunto nas abas do alto",
      "Crie uma nova versão de preço com a data de início",
      "Revise cada mensagem antes de aprovar",
    ],
    ondeFica:
      "As abas ficam no alto: Pacotes e preços, Regiões e localidades, Condições comerciais, Mensagens, Termos de alerta e Régua.",
    dica: "Contrato já assinado mantém o preço da versão em que foi assinado.",
    porPapel: {
      coordenacao: {
        serve:
          "A coordenação cuida aqui dos termos de alerta: palavras que, quando a família escreve, fazem o sistema agir na hora, antes de a Isadora responder.",
        fazer: [
          "Confira a ação de cada termo",
          "Toque em Novo termo para incluir um",
          "Desative um termo que não serve mais",
        ],
        ondeFica:
          "O botão Novo termo fica no alto da lista; cada termo é uma linha, com a ação e o texto que a família recebe.",
        dica: "Mudança de regra de saúde passa antes pela coordenação clínica.",
      },
    },
  },

  "/equipe": {
    titulo: "Equipe",
    serve:
      "As enfermeiras e demais profissionais, com a função, a cidade onde atendem, o vínculo, a carga da semana, os documentos e a situação de cada uma.",
    fazer: [
      "Filtre pela cidade no alto",
      "Abra uma profissional para ver os documentos",
      "Veja a escala em Escala da semana",
    ],
    ondeFica:
      "Nova profissional fica no alto, ao lado do título; os filtros e a Escala da semana, abaixo dos números; a tabela da equipe, no meio.",
    dica: "Documentos vencendo aparecem nos números do alto, antes de vencerem.",
    detalhes: [
      {
        nome: "nova",
        titulo: "Nova profissional",
        texto: "Cadastra uma enfermeira ou outra profissional na equipe.",
      },
      {
        nome: "filtros",
        titulo: "Filtros e escala",
        texto:
          "Filtre pela cidade, mostre quem está inativa e abra a Escala da semana.",
      },
      {
        nome: "tabela",
        titulo: "A equipe",
        texto:
          "Cada profissional é uma linha, com função, cidade, vínculo, carga da semana, documentos e situação. No celular, role a tabela para o lado.",
      },
    ],
  },

  "/sessoes": {
    titulo: "Sessões e acessos",
    serve:
      "Quem tem acesso ao sistema, com os papéis e o último acesso de cada pessoa. Só a diretoria convida e tira o acesso de alguém.",
    fazer: [
      "Toque em Convidar pessoa para dar acesso",
      "Escolha o papel com o menor acesso que resolve",
      "Toque em Encerrar sessões se um celular sumir",
    ],
    ondeFica:
      "Convidar pessoa fica no alto, ao lado do título; cada pessoa é uma linha da tabela, com Encerrar sessões no fim.",
    dica: "Encerrar as sessões tira a pessoa de todos os aparelhos na hora.",
  },

  "/sessoes-venda": {
    titulo: "Sessões de venda",
    serve:
      "A sessão de venda é a conversa online de orientação com a família, antes de ela contratar. Aqui fica a agenda dessas conversas.",
    fazer: [
      "Registre como foi cada conversa que já passou",
      "Marque os pedidos de conversa que chegaram",
      "Confira as próximas conversas, por dia",
    ],
    ondeFica:
      "No alto, as conversas que esperam o registro de como foi; depois, as próximas e as anteriores; embaixo, os pedidos, com Marcar a conversa.",
    dica: "Conversa que passou do horário fica no topo até alguém registrar como foi.",
    detalhes: [
      {
        nome: "resumo",
        titulo: "O resumo da agenda",
        texto:
          "Numa frase: se há conversa hoje, qual é a próxima e quantas esperam o registro de como foi.",
      },
      {
        nome: "registro",
        titulo: "Esperam o registro",
        texto:
          "Conversas que já passaram do horário. Abra cada uma e registre como foi.",
      },
      {
        nome: "proximas",
        titulo: "Próximas conversas",
        texto: "As conversas marcadas, por dia, com a família e quem conduz.",
      },
      {
        nome: "pedidos",
        titulo: "Pedidos de conversa",
        texto:
          "Pedidos que chegaram pela Isadora, com os horários que a família sugeriu. Toque em Marcar a conversa.",
      },
    ],
    porPapel: {
      coordenacao: {
        serve:
          "A sessão de venda é a conversa online de orientação com a família, antes de ela contratar. A coordenação conduz essas conversas.",
        fazer: [
          "Confira as próximas conversas, por dia",
          "Depois de cada conversa, registre como foi",
          "Deixe os pedidos com o comercial, que marca",
        ],
      },
    },
  },

  "/radar": {
    titulo: "Radar de nascimentos",
    serve:
      "O radar mostra as famílias com parto previsto nas próximas semanas, com a enfermeira titular e a reserva de cada uma, para nenhuma ficar sem cuidado.",
    fazer: [
      "Resolva primeiro as famílias sem titular",
      "Abra a família para escolher titular e reserva",
      "Confira a ocupação de cada cidade, embaixo",
    ],
    ondeFica:
      "Cada família é uma linha, com uma faixa nas semanas em que o parto pode acontecer e a situação à direita. A ocupação por cidade vem logo abaixo.",
    dica: "A data provável do parto é só uma estimativa: ela organiza a tela, mas não dispara nada sozinha.",
    detalhes: [
      {
        nome: "urgentes",
        titulo: "Quem precisa de você agora",
        texto:
          "Famílias sem enfermeira titular na janela do parto, ou com a data provável já passada sem resposta.",
      },
      {
        nome: "cronograma",
        titulo: "O radar de nascimentos",
        texto:
          "Cada família é uma linha, e a faixa mostra as semanas em que o parto pode acontecer. Toque na família para escolher titular e reserva.",
      },
      {
        nome: "capacidade",
        titulo: "Capacidade projetada",
        texto:
          "Quanto de cada cidade fica ocupado em cada semana. A cor muda quando a semana passa do limite.",
      },
    ],
  },

  "/prenatal": {
    titulo: "Pré-natal",
    serve:
      "A consulta pré-natal é a entrevista online com a gestante, por volta de 34 semanas, para preparar o cuidado. Aqui você marca e faz essa entrevista.",
    fazer: [
      "Marque primeiro as urgentes",
      "Toque em Marcar a consulta em cada família",
      "Retome uma entrevista de onde parou",
    ],
    ondeFica:
      "Os números ficam no alto; a lista vem por grupo: Urgentes, Para marcar, Marcadas e em andamento, e Concluídas.",
    dica: "Cada resposta da entrevista fica salva assim que você sai do campo.",
    detalhes: [
      {
        nome: "numeros",
        titulo: "Os números",
        texto:
          "Quantas consultas faltam marcar, quantas estão marcadas e quantas entrevistas já foram concluídas.",
      },
      {
        nome: "urgentes",
        titulo: "Urgentes",
        texto:
          "Famílias que contrataram perto do parto. Marque estas primeiro.",
      },
      {
        nome: "para-agendar",
        titulo: "Para marcar",
        texto:
          "Toque em Marcar a consulta em cada família para escolher o dia e a hora.",
      },
      {
        nome: "agendadas",
        titulo: "Marcadas e em andamento",
        texto:
          "As consultas marcadas e as entrevistas começadas. Retome de onde parou pelo botão da família.",
      },
    ],
  },

  "/agenda": {
    titulo: "Agenda",
    serve:
      "As visitas de todas as enfermeiras, por dia ou por semana, junto com as conversas de orientação marcadas.",
    fazer: [
      "Escolha Dia ou Semana e a enfermeira no alto",
      "Confira os conflitos de cada visita",
      "Toque em Reagendar numa visita que não começou",
    ],
    ondeFica:
      "Dia, Semana e o filtro da enfermeira ficam no alto; a grade da semana vem logo abaixo e a lista de visitas do período, mais embaixo.",
    dica: "Conflito é visita além do limite do dia, em horário sobreposto ou num dia bloqueado.",
    detalhes: [
      {
        nome: "filtros",
        titulo: "Dia, semana e enfermeira",
        texto:
          "Escolha ver um dia ou a semana, filtre pela enfermeira e use as setas para mudar o período.",
      },
      {
        nome: "grade",
        titulo: "A grade",
        texto:
          "Cada visita aparece no dia e no horário, com a família, o dia do cuidado e a enfermeira.",
      },
      {
        nome: "lista",
        titulo: "Visitas do período",
        texto:
          "A lista por dia, com os conflitos marcados. Toque em Reagendar numa visita que ainda não começou.",
      },
    ],
  },

  "/cobrancas": {
    titulo: "Cobranças",
    serve:
      "Os pagamentos das famílias: o que espera pagamento, o que venceu e o que já foi pago, com o link de cada cobrança.",
    fazer: [
      "Filtre por Em aberto, Vencidas ou Pagas",
      "Toque em Abrir cobrança para ver o estado",
      "Veja o recibo das que já foram pagas",
    ],
    ondeFica:
      "Os totais e os gráficos ficam no alto; os filtros e a tabela das cobranças, embaixo.",
    dica: "Quando o pagamento é confirmado, a cobrança se atualiza sozinha.",
    detalhes: [
      {
        nome: "totais",
        titulo: "Os totais",
        texto: "Quanto falta receber e quanto já foi recebido.",
      },
      {
        nome: "filtros",
        titulo: "Filtros",
        texto: "Mostre todas, só as em aberto, as vencidas ou as pagas.",
      },
      {
        nome: "tabela",
        titulo: "As cobranças",
        texto:
          "Cada cobrança com a situação, o valor, o vencimento e o botão para abrir ou ver o recibo.",
      },
    ],
  },

  "/notas": {
    titulo: "Notas fiscais",
    serve:
      "As notas fiscais de serviço das famílias: as que esperam emissão, as que voltaram com erro, as em processamento e as emitidas.",
    fazer: [
      "Comece pelas notas Com erro, que trazem o motivo",
      "Emita as notas A emitir com a contadora",
      "Registre aqui o número da nota emitida",
    ],
    ondeFica:
      "Os números ficam no alto; os filtros e a tabela das notas, logo abaixo.",
    dica: "Por enquanto a nota é emitida à mão, no site do emissor, e o número é registrado aqui.",
    detalhes: [
      {
        nome: "numeros",
        titulo: "Os números",
        texto: "Notas para emitir, com erro, em processamento e emitidas.",
      },
      {
        nome: "filtros",
        titulo: "Filtros",
        texto: "Mostre só as notas de uma situação, como A emitir ou Com erro.",
      },
      {
        nome: "tabela",
        titulo: "As notas fiscais",
        texto:
          "Cada nota com quem paga, a parcela, o valor, a data do pagamento e o número, quando já tem.",
      },
    ],
  },

  "/evolucoes": {
    titulo: "Evoluções",
    serve:
      "A evolução é o relatório final que vai para o obstetra e o pediatra depois do último dia de cada família. A coordenação revisa, aprova e envia.",
    fazer: [
      "Veja primeiro as de prazo vencido",
      "Abra a evolução para revisar o texto",
      "Cadastre o contato do médico quando faltar",
    ],
    ondeFica:
      "Os números ficam no alto; cada família é um cartão com o prazo e as evoluções da mãe e de cada bebê.",
    dica: "Sem o contato do médico na ficha, o documento não segue.",
  },

  "/ocorrencias": {
    titulo: "Ocorrências",
    serve:
      "A ocorrência é o que fugiu do plano: atraso, troca de enfermeira, reclamação ou nota baixa na pesquisa. Cada uma tem prazo de resposta.",
    fazer: [
      "Responda primeiro as que passaram do prazo",
      "Abra a ocorrência e escolha quem cuida",
      "Registre uma nova em Abrir uma ocorrência",
    ],
    ondeFica:
      "Abrir uma ocorrência fica no alto, ao lado do título; as abas Abertas, Fechadas e Todas, logo abaixo; a lista vem por prazo.",
    dica: "Ocorrência privada só aparece para a coordenação e a diretoria.",
  },

  "/pos-venda": {
    titulo: "Pós-venda",
    serve:
      "O pós-venda cuida da pesquisa de satisfação de quem terminou o cuidado. O NPS é a nota de 0 a 10 que mede se a família indicaria a Kraamzorg.",
    fazer: [
      "Gere o link da pesquisa para quem não recebeu",
      "Leia as respostas recentes e as notas",
      "Siga a ação indicada para cada faixa de nota",
    ],
    ondeFica:
      "Os números e os gráficos ficam no alto; as respostas recentes, no meio; as famílias, com Gerar o link da pesquisa, embaixo. No menu do computador, a tela se chama Pesquisa & NPS.",
    dica: "Nota de 0 a 6 vira uma ocorrência privada, com contato pessoal da coordenação.",
  },

  "/financeiro": {
    titulo: "Financeiro",
    serve:
      "O dinheiro da empresa no mês: o que entrou, o que falta receber, os custos, a margem, os atrasos e o pagamento da equipe.",
    fazer: [
      "Escolha o mês no alto",
      "Use as abas Despesas, Pagamento da equipe e Extrato do banco",
      "Abra uma cobrança em atraso pela tabela",
    ],
    ondeFica:
      "As abas e o mês ficam no alto; os números e os gráficos, abaixo; os atrasos, o pagamento da equipe e o resultado do mês, mais embaixo.",
    dica: "Os valores contam o que foi pago no mês, não o que foi vendido.",
    detalhes: [
      {
        nome: "abas",
        titulo: "Abas e mês",
        texto:
          "Troque entre Visão do mês, Despesas, Pagamento da equipe e Extrato do banco, e escolha o mês.",
      },
      {
        nome: "numeros",
        titulo: "Os números do mês",
        texto: "Receita, o que falta receber, o custo do cuidado e a margem.",
      },
      {
        nome: "atrasos",
        titulo: "Contas a receber",
        texto:
          "As cobranças em atraso, da mais antiga para a mais nova, com o botão para abrir cada uma.",
      },
    ],
  },

  "/capacidade": {
    titulo: "Capacidade",
    serve:
      "A capacidade mostra quanto da equipe de cada região já está ocupado nas próximas oito semanas, e avisa quando há risco de vender mais do que a equipe atende.",
    fazer: [
      "Leia primeiro os avisos do alto",
      "Veja a ocupação de cada semana por região",
      "Converse antes de vender numa semana em alerta",
    ],
    ondeFica:
      "Os avisos ficam no alto; depois vem um bloco para cada região, com as oito semanas e a ocupação de cada uma.",
    dica: "Quando a semana passa do limite de atenção, ela muda de cor.",
  },

  "/painel": {
    titulo: "Painel executivo",
    serve:
      "O painel executivo responde, sem pedir relatório a ninguém, as cinco perguntas da empresa: venda, marketing, operação, satisfação das famílias e dinheiro.",
    fazer: [
      "Escolha o mês no alto",
      "Compare cada número com o mês anterior",
      "Desça pelos detalhes de cada área",
    ],
    ondeFica:
      "O mês fica no alto; os números e o funil, logo abaixo; as metas e as cinco perguntas, no meio; os detalhes do mês, no fim. No menu do computador, a tela se chama Indicadores.",
    detalhes: [
      {
        nome: "mes",
        titulo: "O mês",
        texto: "Escolha o mês que o painel mostra.",
      },
      {
        nome: "numeros",
        titulo: "Os números do mês",
        texto:
          "Contatos novos, conversão até o contrato, custo para conquistar cada cliente e tempo de venda, comparados com o mês anterior.",
      },
      {
        nome: "perguntas",
        titulo: "As cinco perguntas",
        texto:
          "Venda, marketing, operação, satisfação das famílias e dinheiro, com a situação de cada uma agora.",
      },
    ],
  },

  "/marketing": {
    titulo: "Marketing",
    serve:
      "De onde as famílias chegam, quanto cada canal custou e quantas viraram contrato. Os números são somados, sem dado de família.",
    fazer: [
      "Escolha o período no alto",
      "Compare contatos e receita de cada origem",
      "Veja o gasto de cada canal em Canais e custos",
    ],
    ondeFica:
      "As abas e o período ficam no alto; os gráficos por origem, logo abaixo; a tabela de desempenho por origem, no meio.",
    dica: "Com poucos contatos no período, espere mais uma semana antes de mudar um canal.",
    detalhes: [
      {
        nome: "abas",
        titulo: "Visão geral e canais",
        texto:
          "A visão geral mostra os resultados. Canais e custos guarda os links de cada canal e o gasto de cada um.",
      },
      {
        nome: "periodo",
        titulo: "O período",
        texto:
          "Escolha a data de início e a de fim, ou um dos atalhos, como Este mês.",
      },
      {
        nome: "origens",
        titulo: "Contatos e receita por origem",
        texto:
          "De onde vieram os contatos e quanto cada origem trouxe de receita.",
      },
      {
        nome: "tabela",
        titulo: "Desempenho por origem",
        texto:
          "Para cada origem: contatos, qualificados, contratos, conversão, investimento, custo por cliente e receita.",
      },
    ],
    porPapel: {
      financeiro: {
        serve:
          "Você lê o marketing para cruzar quanto cada canal custou com a receita que ele trouxe. Os números são somados, sem dado de família.",
        fazer: [
          "Escolha o período no alto",
          "Compare o investimento com a receita de cada origem",
        ],
      },
    },
  },

  "/copiloto": {
    titulo: "Copiloto",
    serve:
      "O copiloto é um assistente de perguntas: você escreve em uma frase e ele responde com os números e a conta. Ele só mostra o que o seu papel pode ver.",
    fazer: [
      "Escreva a pergunta e toque em Enviar",
      "Ou toque numa das perguntas frequentes",
      "Confira a conta que sustenta cada número",
    ],
    ondeFica:
      "O campo da pergunta fica no centro; as perguntas frequentes, logo abaixo; o gasto do mês com o copiloto, ao lado. O botão Copiloto do alto da tela também abre aqui.",
    dica: "O copiloto não consulta o registro de saúde das famílias.",
  },

  "/portal-familia": {
    titulo: "Portal da família",
    serve:
      "A família tem um portal próprio, fora deste sistema, onde vê as datas, as visitas e o contato da equipe. Aqui você libera e acompanha o acesso de cada pessoa.",
    fazer: [
      "Toque em Liberar o portal para enviar o convite",
      "Toque em Suspender para fechar um acesso",
      "Escolha se a família vê o nome e a foto da enfermeira",
    ],
    ondeFica:
      "Os números ficam no alto; a busca e os filtros, logo abaixo; cada família é um bloco com as pessoas e o botão de cada uma.",
    dica: "O portal da família não entra neste tour, porque a família não usa este sistema.",
  },

  "/parceiros": {
    titulo: "Parceiros médicos",
    serve:
      "Os médicos que conhecem a Kraamzorg, as indicações que chegaram de cada um e o próximo contato combinado. É relacionamento, sem pagamento por indicação.",
    fazer: [
      "Veja quem tem contato combinado para agora",
      "Toque em Registrar contato de hoje depois de falar",
      "Crie uma tarefa para o próximo contato",
    ],
    ondeFica:
      "Os números e o caminho das indicações ficam no alto; a tabela dos médicos, no meio; o cartão de cada médico, com os botões, embaixo.",
  },

  "/tarefas-equipe": {
    titulo: "Tarefas por equipe",
    serve:
      "Todas as tarefas abertas da equipe num quadro, com uma coluna para cada momento: A fazer, Em andamento e Concluída.",
    fazer: [
      "Filtre pela equipe no alto",
      "Arraste a tarefa de coluna, ou use Começar e Concluir",
      "Toque na tarefa para passar a outra pessoa",
    ],
    ondeFica:
      "Nova tarefa e os filtros de equipe ficam no alto; as três colunas vêm logo abaixo.",
    dica: "Tarefa que ninguém pegou aparece com o aviso Sem responsável.",
  },

  "/manuais": {
    titulo: "Manuais e treinamentos",
    serve:
      "Os manuais e protocolos da sua função, sempre na versão de hoje. Quando um texto muda, a leitura pede uma nova confirmação.",
    fazer: [
      "Abra um manual para ler",
      "Confirme a leitura de cada versão nova",
      "Veja na lista o que ainda falta confirmar",
    ],
    ondeFica:
      "A sua leitura fica no alto; a lista Manuais da equipe, logo abaixo, mostra se falta confirmar cada um.",
    detalhes: [
      {
        nome: "leitura",
        titulo: "Sua leitura",
        texto:
          "Quantos manuais da sua função você já confirmou na versão de hoje.",
      },
      {
        nome: "lista",
        titulo: "Manuais da equipe",
        texto:
          "Cada manual mostra a versão e se falta confirmar a leitura. Toque no título para ler.",
      },
    ],
    porPapel: {
      coordenacao: {
        serve:
          "Os manuais e protocolos da equipe, quem já confirmou a leitura de cada um e as trilhas de treinamento de cada função.",
        fazer: [
          "Veja quem já confirmou cada manual",
          "Cadastre um manual novo no fim da tela",
          "Monte uma trilha de leitura para uma função",
        ],
        ondeFica:
          "Os gráficos de leitura ficam no alto; os manuais e as trilhas, no meio; os formulários Novo manual e Nova trilha, no fim.",
        dica: "Protocolo de saúde só entra com a aprovação da coordenação clínica.",
      },
      diretoria: {
        serve:
          "Os manuais e protocolos da equipe, quem já confirmou a leitura de cada um e as trilhas de treinamento de cada função.",
        fazer: [
          "Veja quem já confirmou cada manual",
          "Cadastre um manual novo no fim da tela",
          "Monte uma trilha de leitura para uma função",
        ],
        ondeFica:
          "Os gráficos de leitura ficam no alto; os manuais e as trilhas, no meio; os formulários Novo manual e Nova trilha, no fim.",
      },
      enfermeira: {
        ondeFica:
          "Você chega aqui pelo Perfil, em Ver os manuais. Cada manual mostra se falta confirmar a leitura.",
      },
    },
  },

  "/talentos": {
    titulo: "Banco de talentos",
    serve:
      "As candidatas a trabalhar na Kraamzorg, a etapa da seleção de cada uma e a nota da entrevista.",
    fazer: [
      "Veja as candidatas por etapa, em colunas",
      "Abra uma candidata para registrar a entrevista",
      "Cadastre uma nova no formulário do fim",
    ],
    ondeFica:
      "Os números e os gráficos ficam no alto; a busca e as colunas por etapa, no meio; o formulário Nova candidata, no fim.",
    dica: "A página de candidatura do site está desligada; quem liga é a diretoria, em Configurações.",
  },

  "/mais": {
    titulo: "Mais",
    serve:
      "No celular, a aba Mais guarda as telas que não cabem nas abas de baixo, o botão de sair e o botão para rever este tour.",
    fazer: [
      "Toque em Mais, na barra de baixo",
      "Escolha a tela pelo grupo",
      "Toque em Fazer o tour para rever este passo a passo",
    ],
    ondeFica: "No computador, tudo isso já aparece na barra lateral.",
  },

  "/hoje": {
    titulo: "Hoje",
    serve:
      "O Hoje é a sua tela do dia: as visitas na ordem, com endereço, horário e o dia do cuidado, e o que ficou pendente.",
    fazer: [
      "Confira as visitas de hoje e de amanhã",
      "Toque no endereço para abrir o mapa",
      "Resolva a ficha pendente que aparecer no alto",
    ],
    ondeFica:
      "Os números ficam no alto; a ficha pendente, logo abaixo; os cartões das visitas de hoje, no meio; amanhã e as evoluções, no fim.",
    dica: "Abra o Hoje uma vez com sinal, para o aparelho guardar o dia.",
    detalhes: [
      {
        nome: "numeros",
        titulo: "Os números do dia",
        texto: "Visitas de hoje, fichas pendentes e visitas de amanhã.",
      },
      {
        nome: "pendente",
        titulo: "Ficha pendente",
        texto:
          "Uma visita que terminou sem o registro. Toque para terminar e assinar.",
      },
      {
        nome: "visita",
        titulo: "A visita do dia",
        texto:
          "O cartão tem o horário, o endereço (que abre o mapa), o telefone e, no pé, os botões Cheguei e Saí da casa.",
      },
      {
        nome: "evolucoes",
        titulo: "Evoluções para os médicos",
        texto:
          "Abre as evoluções que você escreve no fim do cuidado de cada família.",
      },
    ],
  },

  "/minhas-familias": {
    titulo: "Famílias",
    serve:
      "As famílias que estão com você agora, com a régua de dias de cada uma: o que já foi feito, o dia de hoje e a próxima visita.",
    fazer: [
      "Toque numa família para ver o acompanhamento",
      "Leia os dias anteriores antes da visita",
      "Confira os médicos e o plano de cuidado",
    ],
    ondeFica:
      "Cada família é um cartão com a régua dos dias, do primeiro (D1) ao último; o dia de hoje vem marcado.",
    dica: "Só aparecem as famílias designadas a você.",
    detalhes: [
      {
        nome: "familia",
        titulo: "Cada família",
        texto:
          "Toque no cartão para ver o acompanhamento: os dias anteriores, os médicos e o plano de cuidado.",
      },
      {
        nome: "regua",
        titulo: "A régua de dias",
        texto:
          "Um quadrinho para cada dia do cuidado. O de hoje vem marcado, e embaixo aparece quantas visitas já foram feitas.",
      },
      {
        nome: "proxima",
        titulo: "A próxima visita",
        texto: "O dia, a hora e o número da próxima visita.",
      },
    ],
  },

  "/alertas": {
    titulo: "Alertas",
    serve:
      "Os alertas de saúde das famílias que você acompanha. O alerta aparece quando um valor do checklist passa do limite combinado.",
    fazer: [
      "Ligue para a supervisão médica pelo botão do alerta",
      "Depois, toque em Registrar acionamento",
      "Preencha o horário, a orientação e a conduta",
    ],
    ondeFica:
      "As abas Abertos e Fechados ficam no alto; cada alerta é um cartão com a conduta e os botões de ligar e de registrar.",
    dica: "Se for urgente, ligue na hora, sem esperar o aplicativo.",
    detalhes: [
      {
        nome: "abas",
        titulo: "Abertos e fechados",
        texto:
          "Os alertas abertos pedem ação; os fechados ficam para consulta.",
      },
      {
        nome: "numeros",
        titulo: "Os números",
        texto:
          "Quantos alertas estão abertos, quantos são imediatos e quantos já têm o registro completo.",
      },
      {
        nome: "lista",
        titulo: "Cada alerta",
        texto:
          "O sinal, o valor registrado e a conduta aprovada, com os botões Ligar para a supervisão e Registrar acionamento.",
      },
    ],
  },

  "/alertas-clinicos": {
    titulo: "Alertas clínicos",
    serve:
      "Os alertas de saúde de todas as famílias em atendimento. Um alerta imediato pede ligação para a supervisão médica na hora.",
    fazer: [
      "Comece pelos alertas imediatos",
      "Veja o que falta para fechar cada alerta",
      "Abra a visita para ver o registro do dia",
    ],
    ondeFica:
      "As abas Abertos e Fechados e os números ficam no alto; cada alerta é um cartão com o sinal, a conduta e o botão Ligar para a supervisão.",
    dica: "O alerta só fecha com quatro respostas: o sinal, o horário da ligação, a orientação médica e a conduta.",
  },

  "/perfil": {
    titulo: "Perfil",
    serve:
      "Como a coordenação vê você agora, a sua semana com as visitas de cada dia e a validade dos seus documentos.",
    fazer: [
      "Confira a semana antes de sair de casa",
      "Veja os documentos perto de vencer",
      "Abra ofertas, treinamentos e manuais pelos atalhos",
    ],
    ondeFica:
      "A sua situação fica no alto; a semana e os documentos, no meio; os atalhos, o botão do tour e o de sair, no fim.",
    dica: "É aqui que você refaz este tour quando quiser.",
    detalhes: [
      {
        nome: "semana",
        titulo: "Sua semana",
        texto:
          "Os próximos sete dias, com as visitas de cada um. O dia de hoje vem destacado.",
      },
      {
        nome: "documentos",
        titulo: "Seus documentos",
        texto:
          "A validade da carteira do conselho e dos outros documentos. A coordenação avisa antes de vencer.",
      },
      {
        nome: "atalhos",
        titulo: "Para o seu dia a dia",
        texto:
          "Atalhos para ofertas, treinamentos, manuais, como instalar o aplicativo e este tour.",
      },
    ],
  },

  "/minhas-evolucoes": {
    titulo: "Evoluções",
    serve:
      "A evolução é o relatório que vai para o obstetra e o pediatra depois do último dia de cada família. Você escreve e manda para a revisão da coordenação.",
    fazer: [
      "Veja o prazo de cada família",
      "Abra a evolução da mãe ou do bebê para escrever",
      "Mande para a revisão dentro do prazo",
    ],
    ondeFica:
      "Você chega aqui pelo Hoje, no fim da tela, em Evoluções para os médicos. Cada família é um cartão com o prazo.",
  },

  "/ofertas": {
    titulo: "Ofertas",
    serve:
      "A oferta é o convite da coordenação para você acompanhar uma família nova, com o bairro, as datas e o horário.",
    fazer: [
      "Leia onde é, o pacote e o prazo",
      "Toque em Aceitar a família ou Não posso aceitar",
      "Responda antes do prazo de cada oferta",
    ],
    ondeFica:
      "Você chega aqui pelo Perfil, em Ver as ofertas. Cada oferta é um cartão com os dois botões no fim.",
    dica: "Recusar não tem penalidade: a coordenação chama outra pessoa.",
  },

  "/treinamentos": {
    titulo: "Treinamentos",
    serve:
      "A trilha de leitura que a coordenação montou para a sua função, na ordem certa.",
    fazer: [
      "Leia os manuais na ordem da trilha",
      "Confirme a leitura de cada um",
    ],
    ondeFica:
      "Você chega aqui pelo Perfil, em Ver os treinamentos. Cada manual mostra se falta ler.",
  },
};

/** O passo próprio do checklist da visita, no portal da enfermeira (fica no Hoje). */
export const PASSO_CHECKLIST: Verbete = {
  titulo: "Checklist da visita",
  serve:
    "Você faz o checklist pelo cartão da visita, no Hoje. Funciona sem sinal: fica salvo no aparelho e sobe sozinho.",
  fazer: [
    "Ao chegar, toque em Cheguei",
    "Toque em Preencher registro e siga as etapas",
    "No fim, assine o registro do dia",
    "Ao sair, toque em Saí da casa",
  ],
  ondeFica: "Assinado, aparecem o resumo do dia e a grade com todos os dias.",
  dica: "Os botões ficam no pé do cartão da visita. Assinado, o registro não muda; para corrigir, faça um adendo.",
};

/** Rótulos de grupo que não vêm da barra lateral. */
export const GRUPOS_TOUR = {
  abertura: "Boas-vindas",
  encerramento: "Fim do tour",
  celular: "No celular",
  portal: "Portal da enfermeira",
} as const;

const NOME_TOUR: Record<Papel, string> = {
  comercial: "do Comercial",
  coordenacao: "da Coordenação",
  financeiro: "do Financeiro",
  marketing: "do Marketing",
  diretoria: "da Diretoria",
  enfermeira: "da Enfermeira",
};

/** "Tour do Comercial", "Tour do Comercial e do Financeiro", "Tour completo, para quem administra". */
export function tituloDoTour(papeis: readonly Papel[]): string {
  if (papeis.includes("diretoria"))
    return "Tour completo, para quem administra";
  const nomes = papeis.map((papel) => NOME_TOUR[papel]);
  if (nomes.length === 0) return "Tour do sistema";
  if (nomes.length === 1) return `Tour ${nomes[0]}`;
  return `Tour ${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

function telasEmTexto(telas: number): string {
  return telas === 1 ? "1 tela" : `${telas} telas`;
}

function minutosEmTexto(minutos: number): string {
  return minutos === 1 ? "1 minuto" : `${minutos} minutos`;
}

/** Passo de abertura: para quem é o tour e quanto tempo leva. */
export function textoAbertura(opcoes: {
  papeis: readonly Papel[];
  telas: number;
  minutos: number;
}): Verbete & { meta: string } {
  return {
    titulo: tituloDoTour(opcoes.papeis),
    meta: `${telasEmTexto(opcoes.telas)} · cerca de ${minutosEmTexto(opcoes.minutos)}`,
    serve: `Em cerca de ${minutosEmTexto(opcoes.minutos)}, você conhece as telas que usa no trabalho: para que serve cada uma, onde fica cada coisa e o que fazer nela.`,
    fazer: [
      "Toque em Próximo; a tela de fundo muda sozinha",
      "Toque em Voltar para rever um passo",
      "Saia quando quiser em Pular o tour",
    ],
    ondeFica:
      "A cada passo, o lugar da tela no menu fica destacado em dourado.",
  };
}

/** Passo de encerramento: onde rever o tour depois. */
export function textoEncerramento(opcoes: {
  telas: number;
  soPortal: boolean;
}): Verbete {
  return {
    titulo: "Pronto, você já conhece o sistema",
    serve: `Você passou pelas ${telasEmTexto(opcoes.telas)} da sua função. Quando quiser, faça o tour de novo.`,
    fazer: [
      "Toque em Concluir para começar a usar",
      "Toque em Rever o tour para ver tudo de novo",
    ],
    ondeFica: opcoes.soPortal
      ? "Depois, o botão Fazer o tour fica no Perfil, perto do botão de sair."
      : "Depois, o botão Fazer o tour fica no pé da barra lateral, perto do seu nome. No celular, fica na aba Mais.",
  };
}

/** Rótulos do próprio tour (cartão, botões e convite). */
export const TEXTOS_TOUR = {
  passoDe: (n: number, total: number) => `Passo ${n} de ${total}`,
  progresso: "Progresso do tour",
  paraQueServe: "Para que serve",
  oQueFazer: "O que fazer aqui",
  comoFunciona: "Como funciona",
  naOrdem: "Na visita, nesta ordem",
  ondeFica: "Onde fica",
  dica: "Dica",
  verMais: "Ver mais",
  verMenos: "Ver menos",
  proximo: "Próximo",
  voltar: "Voltar",
  comecar: "Começar",
  concluir: "Concluir",
  pular: "Pular o tour",
  reverTour: "Rever o tour",
  abrirTela: "Abrir esta tela",
  fazerTour: "Fazer o tour",
  fazerTourApoio: "Um passo a passo pelas telas da sua função.",
  ficaEmMais: "No celular, esta tela fica na aba Mais.",
  convite: {
    titulo: (minutos: number) =>
      `Quer conhecer o sistema em ${minutosEmTexto(minutos)}?`,
    texto:
      "Um passo a passo mostra as telas da sua função e onde fica cada coisa.",
    comecar: "Começar o tour",
    agoraNao: "Agora não",
  },
} as const;

/**
 * Telas que ganham o mini-tour (as chamadas que apontam para elementos da
 * página) em cada papel: as mais usadas, na ordem do menu. Quem tem
 * diretoria segue a lista da diretoria; os demais juntam as listas dos seus
 * papéis. As chamadas de cada tela estão no `detalhes` do verbete.
 */
export const TELAS_EM_DETALHE: Record<Papel, readonly CaminhoRota[]> = {
  comercial: [
    "/inicio",
    "/pipeline",
    "/conversas",
    "/sessoes-venda",
    "/familias",
  ],
  coordenacao: ["/inicio", "/radar", "/agenda", "/equipe", "/prenatal"],
  financeiro: ["/inicio", "/familias", "/financeiro", "/cobrancas", "/notas"],
  marketing: ["/inicio", "/marketing", "/manuais"],
  diretoria: [
    "/inicio",
    "/pipeline",
    "/conversas",
    "/familias",
    "/radar",
    "/agenda",
    "/painel",
    "/financeiro",
  ],
  enfermeira: ["/hoje", "/minhas-familias", "/alertas", "/perfil"],
};
