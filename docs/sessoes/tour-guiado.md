# Tour guiado · Um passo a passo por papel, dentro do app

Data: 07/10/2026
Branch: `drop/redesenho-camila-v2`. Commits com o prefixo `Tour:` (ver `git log --grep "^Tour:"`).

Pedido do cliente: "Monte um tour completo para cada membro que for utilizar o CRM e também um tour completo para o admin cobrindo todas as telas. Os tours dos outros membros devem cobrir apenas aquilo que diz respeito a cada uma das suas funções." Reforço: "se nem eu entendi como funciona, imagine quem for usar. Preciso de um tour forte e bem explicado, sem linguagem de dev, interface polida e experiência impecável, para a pessoa saber exatamente onde está cada coisa e como usar."

## Feito

**Tour por papel, tirado do registro de navegação.** `montarTour(papeis)` (`src/modules/tour/montar.ts`, função pura) monta o tour de cada pessoa a partir de `src/lib/navegacao`: passa por toda tela que ela pode abrir (`rotasPermitidas`), na ordem da barra lateral (Comercial, Operação, Experiência, Gestão, Sistema). Não há lista de telas copiada: rota nova no registro entra sozinha no tour do papel que a abre (e o teste reprova se o catálogo não tiver o texto dela).

- As telas sem item próprio no menu entram logo depois da tela onde moram, com o destaque no item dessa tela: Transferências depois de Conversas (a fila mora no filtro "Esperando alguém"); no portal da enfermeira, Evoluções depois do Hoje e Ofertas, Treinamentos e Manuais depois do Perfil.
- A aba Mais do celular é um passo para quem tem a aba (grupo "No celular").
- O admin é quem tem diretoria: os perfis de demonstração não têm uma pessoa com todos os papéis, e a diretoria já abre todas as 31 telas do painel. O tour dela passa por todas (testado). Quem também é enfermeira termina pela seção "Portal da enfermeira" (testado com todos os papéis).
- A enfermeira faz o tour no portal dela, com um passo próprio, numerado, sobre o checklist da visita: onde abre (Hoje, cartão da visita do dia), a ordem (Cheguei, Preencher registro e as etapas, assinar, Saí da casa), que funciona sem sinal e sobe sozinho, e o que aparece depois de assinado (o resumo do dia e a grade com todos os dias).
- Abertura com o nome do tour ("Tour do Comercial", "Tour da Coordenação", "Tour completo, para quem administra") e o tempo estimado; encerramento com "Rever o tour", destacando onde fica o botão "Fazer o tour".

| Tour              | Passos |               Telas | Tempo estimado      |
| :---------------- | -----: | ------------------: | :------------------ |
| Comercial         |     15 |                  13 | cerca de 6 minutos  |
| Coordenação       |     23 |                  21 | cerca de 9 minutos  |
| Financeiro        |     11 |                   9 | cerca de 4 minutos  |
| Marketing         |      6 |                   4 | cerca de 2 minutos  |
| Enfermeira        |     11 | 9 (com o checklist) | cerca de 4 minutos  |
| Diretoria (admin) |     33 |                  31 | cerca de 13 minutos |
| Todos os papéis   |     41 |                  39 | cerca de 17 minutos |

Os números contam a abertura e o encerramento nos passos. O mini-tour das telas (abaixo) acrescenta passos; a tabela atualizada está na seção do mini-tour.

**Textos** (`src/modules/tour/passos.ts`, o único arquivo com texto do tour). Um verbete para cada rota do registro (o tipo `Record<CaminhoRota, Verbete>` exige todas), com `titulo`, `serve` (para que serve, explicando o termo do ofício no começo: pipeline, radar, pré-natal, sessão de venda, pós-venda e NPS, capacidade, copiloto, evolução, ocorrência, transferência, oferta), `fazer` (2 ou 3 frases no imperativo), `ondeFica` (onde estão as coisas na tela) e `dica`. `porPapel` onde a mesma tela serve a funções diferentes: Início (um para cada papel), Famílias (financeiro e coordenação), Tarefas, Configurações (a coordenação só vê os termos de alerta), Sessões de venda (a coordenação conduz, o comercial marca), Marketing (leitura do financeiro), Manuais (coordenação e diretoria publicam; a enfermeira chega pelo Perfil). Lidos da tela real: o texto de cada página em modo demonstração, o código das páginas e dos módulos, o PRD (11, 12, 13, 20) e `docs/manual`.

**Cartão e destaque** (`cartao-tour.tsx`). Diálogo não modal (`role="dialog"`, `aria-modal="false"`, `aria-labelledby` no título, `aria-describedby` no "para que serve"):

- Hierarquia: "Passo N de M" e a barra fina de progresso, o grupo do menu em rótulo pequeno, o título, a frase de para que serve, "O que fazer aqui" em lista, depois "Onde fica" e a dica. Até cerca de 60 palavras ficam à vista; o resto vai para "Ver mais" (recolhido, `aria-expanded`). Botão principal grande (Próximo; Começar na abertura; Concluir no fim), Voltar e "Pular o tour" discretos, e "Abrir esta tela" quando a pessoa saiu da tela do passo.
- O destaque é um contorno dourado em volta do item do menu, com um véu marinho translúcido em volta (a tela de fundo continua à vista e tocável). Barra lateral no computador, abas de baixo no celular. Tela que no celular mora em "Mais" ganha o destaque na aba Mais e a linha "No celular, esta tela fica na aba Mais.". Sem alvo visível, o cartão fica no centro, sem destaque.
- O cartão fica ao lado da barra lateral, acima ou abaixo do alvo, sempre dentro da parte visível da tela; sem espaço, encolhe e rola por dentro. Alvo da página fora da vista é rolado até ela (uma vez por passo).
- Teclado: Esc fecha, setas esquerda e direita voltam e avançam, o foco vai para o cartão a cada passo e volta para quem abriu o tour. O passo é anunciado numa região `aria-live="polite"`. Movimento só com `motion-safe`; o `prefers-reduced-motion` do globals.css zera o resto.
- Enquanto a tela do passo carrega, Próximo e Voltar esperam (`useTransition` em volta do `router.push`): duas navegações seguidas, uma delas com redirecionamento (Transferências), terminavam na tela errada.
- Visual só com tokens e primitivas existentes: cartão `rounded-3`, `shadow-2`, borda `linha`, `Barra` do mockup, rótulo em `dourado-texto`, linhas em `creme-2`. Alvos de toque de 44 px.

**Provedor** (`provedor-tour.tsx`) nas duas cascas (`CascaApp` e `CascaEnfermeira`, em `src/components/shell/casca-app.tsx`). O passo atual mora no `sessionStorage` (`kz-tour:andamento`), lido como loja externa (`useSyncExternalStore`), para o tour seguir quando a pessoa passa do painel para o portal e voltar depois de recarregar. Sem armazenamento (janela anônima, site bloqueado), uma cópia em memória segura o tour enquanto a página estiver aberta; toda leitura e escrita tem try/catch (`estado.ts`).

**Como começa**, nunca sozinho:

1. Botão "Fazer o tour": no pé da barra lateral (perto do nome e do Sair), na aba Mais do celular e no Perfil da enfermeira ("Para o seu dia a dia").
2. `?tour=1` em qualquer tela do painel ou do portal (o parâmetro some da barra de endereço depois).
3. Convite discreto no canto, só na tela inicial da pessoa (Início ou Hoje), na primeira entrada: "Quer conhecer o sistema em N minutos?", com "Começar o tour" e "Agora não". Não puxa o foco, não bloqueia nada e não volta depois de respondido (`localStorage`, chave `kz-tour:<usuarioId>:<versao>`, valor `iniciado`, `dispensado` ou `concluido`).

**Marcas do destaque.** `data-tour="<caminho da rota>"` nos links da barra lateral e das abas de baixo (propriedade `idTour` de `BarraLateral` e `AbasInferiores`, preenchida em `navegacao-app.tsx`) e `data-tour="fazer-tour"` no botão do tour.

## Testes

- `src/modules/tour/montar.test.ts`: para cada papel, o tour tem exatamente as telas que o papel abre, sem repetir, na ordem do menu, mais abertura e encerramento; telas sem item no menu logo depois da casa; o tour da diretoria cobre todas as telas do painel; o de todos os papéis cobre painel e portal e termina pelo portal; o passo do checklist (ordem, sem sinal, o que aparece depois de assinado); ids únicos; tempo da abertura.
- `src/modules/tour/passos.test.ts`: toda rota tem verbete e o catálogo não tem rota que não existe; nenhum texto vazio, com travessão, meia-risca, "mãezinha", "mamãe", "papai" ou nome de família; nenhum termo técnico ou sigla sem explicação (RLS, AAL2, MFA, RPC, log, token, slug, id, payload, enum, sync, status, deploy, app, offline e outros) nem palavra com sublinhado ou nome de arquivo; `serve` com até 180 caracteres, cada item de `fazer` com até 110, de 2 a 3 itens (4 no checklist) e até 60 palavras à vista; o termo do ofício explicado no começo de `serve`; o portal da família explicado como portal à parte.
- `src/modules/tour/tour.test.tsx` (Testing Library): abre pelo botão com o foco no cartão e o anúncio do passo; avança, volta e navega para a tela do passo; setas e Esc, com o foco de volta em quem abriu; Pular grava "dispensado"; Concluir grava "concluido"; Rever volta ao começo; retoma o passo guardado, mas não o de outra pessoa; `?tour=1`; o convite aparece na tela inicial, "Agora não" o some e ele não volta; não aparece fora da tela inicial nem para navegador conduzido por robô; funciona sem armazenamento; o checklist numerado da enfermeira; sem provedor, o botão não aparece.
- `tests/e2e/tour/tour.spec.ts` (Playwright, modo demonstração, celular e computador): para cada perfil, `?tour=1` e Próximo até o fim, conferindo o título e o "Passo N de M" de cada passo contra `montarTour`, a tela de cada passo, o foco no cartão e a falta de rolagem lateral; axe só dentro do cartão no primeiro passo, no do meio e no último (falha em serious ou critical); Esc e setas; o convite aparece, "Agora não" o some e ele não volta ao recarregar; "Começar o tour" abre o primeiro passo.

## Decisões tomadas nesta sessão

- **O tour de uma pessoa é tudo o que ela pode abrir** (`rotasPermitidas`: abas, barra lateral e telas sem item no menu), não só o que a barra lateral mostra. Só assim o tour do admin cobre todas as rotas (Transferências e Mais não estão na barra lateral). As telas sem item no menu entram logo depois da tela onde moram, e o destaque vai para essa tela.
- **Admin é a diretoria.** Os perfis de demonstração não têm uma pessoa com todos os papéis; a diretoria abre todas as telas do painel. A seção do portal da enfermeira só entra para quem também é enfermeira (a diretoria sozinha não abre o portal; o proxy a levaria de volta ao Início).
- **Abertura e encerramento não navegam** (ficam na tela atual), com uma exceção: o encerramento da enfermeira vai para o Perfil, onde fica o botão para rever o tour.
- **Convite só na tela inicial e nunca para robô.** O convite aparece no Início (ou no Hoje) e não para navegador conduzido por robô (`navigator.webdriver`), para não cobrir a tela dos testes de ponta a ponta que já existem; o teste do convite se passa por pessoa.
- **Destaque na aba Mais**: o pedido dizia "cartão centralizado" para tela que no celular só está em Mais. Destacar a aba Mais, com a linha "No celular, esta tela fica na aba Mais.", responde melhor ao reforço do cliente ("saber exatamente onde está cada coisa"). Sem a aba (enfermeira), continua centralizado.
- **Tempo estimado**: 25 segundos por tela, 12 por chamada do mini-tour, 10 na abertura e no encerramento, arredondado para minutos (em `montar.ts`, porque é estimativa de tela, não regra de negócio).
- **Texto de interface no código**: o pedido permite, só em `passos.ts`. Nenhum preço, prazo, limite ou parâmetro aparece nos textos (a capacidade fala em "limite de atenção", sem o número).

## Ficou de fora e achados

- **Rolagem lateral antiga no celular**: o Início do financeiro (112 px), o Pós-venda (12 px) e o Painel executivo (27 px) já rolam de lado no celular antes do tour, pelo balão dos gráficos (`Dica` em `src/components/graficos/index.tsx`, invisível mas com largura, perto da borda) e por uma tabela no painel. Nessas telas a navegação fixa de baixo sai da área visível. O tour se protege (o cartão fica sempre dentro da parte visível e, sem alvo visível, vai para o centro), e o e2e confere nelas só que o cartão não passa da tela. A correção é de outra sessão.
- **Chave repetida no Início da coordenação**: o gráfico "Visitas por enfermeira" usa o mesmo `key` ("Profissional") para as barras; o `next dev` mostra o aviso. Não corrigido aqui.
- O portal da família não entra no tour (a família não usa o CRM); o passo do Portal da família explica que ela tem um portal próprio.

## Como testar

```bash
pnpm vitest run src/modules/tour src/lib/navegacao src/components
PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium pnpm e2e tests/e2e/tour/tour.spec.ts --project=celular --project=computador
```

À mão, em modo demonstração (`NEXT_PUBLIC_APP_ENV=desenvolvimento KZ_DADOS=demonstracao pnpm dev`): entre com um perfil e veja o convite no canto do Início; ou abra qualquer tela com `?tour=1`; ou toque em "Fazer o tour" no pé da barra lateral (computador), na aba Mais (celular) ou no Perfil (enfermeira).

## Como acrescentar uma tela nova ao tour

1. Acrescente a rota em `src/lib/navegacao/index.ts` (`ROTAS` e `NAVEGACAO`), como sempre.
2. O TypeScript passa a exigir o verbete em `PASSOS` (`src/modules/tour/passos.ts`): escreva `titulo`, `serve`, `fazer`, `ondeFica` e, se ajudar, `dica` e `porPapel`, lendo a tela pronta.
3. Se a tela não tem item próprio no menu, diga em `MORA_EM` (`montar.ts`) em qual tela ela mora.
4. Rode `pnpm vitest run src/modules/tour`: os testes conferem cobertura por papel, tamanho e palavras proibidas. O e2e do tour pega a tela nova sozinho.
5. Se a tela mudar muito o tour, suba `VERSAO_TOUR` em `passos.ts` para o convite voltar a aparecer a quem já respondeu.
