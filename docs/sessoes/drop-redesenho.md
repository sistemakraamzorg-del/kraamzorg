# Drop redesenho · Visual do mockup da Camila, gráficos e dados de demonstração

Data: 02/10/2026
Branch: `drop/redesenho-camila` (local; nada foi enviado ao GitHub).

## Feito

- Logos oficiais do guia da marca em `public/brand` (vertical marinho, vertical dourado, negativo para fundo escuro). A barra lateral usa a negativa.
- Tokens novos em `globals.css`: raios (`--radius-2` 12px, `--radius-3` 20px), sombras com brilho interno, `--brilho-*` e `--halo-dourado`.
- Fontes Jost 200 e 300 (Fontsource, SIL OFL 1.1) em `src/app/fonts`; títulos de tela em peso leve.
- Gráficos compartilhados em `src/components/graficos` (Sparkline, BarrasHorizontais, Colunas, Rosca/pizza) com dica no hover, grade e linha de referência.
- Login em tela dividida; barra lateral e cabeçalho refinados.
- Início de diretoria, coordenação, comercial, financeiro e marketing no padrão institucional (faixa do dia, "O que pede ação agora", indicadores com comparação, gráficos). Início da enfermeira não mudou (fluxo assistencial offline).
- Pipeline: colunas, arrastar e soltar (API nativa, mesma ação do menu Mover), painel de detalhes do cartão, dicas no hover, gráficos.
- Portal da família (tela da equipe), Painel executivo, Financeiro, Cobranças e Marketing (duas abas, pizza) com gráficos; Isadora com primeira tela simples e "Configurações avançadas" recolhidas.
- Checklist: o aviso de pendência só aparece depois de clicar em Concluir.
- Tarefas por equipe: detalhes, quadro, criar, mudar estado, atribuir e concluir.
- Correções de dados e telas de erro (parâmetros e automações ausentes, uuid inválido, PDF na Vercel, logs `[erro-banco]` e `[tela-erro]`).

## Fora

- Rótulos "Agente" e "Handoff" do mockup como origem do lead: não são valores do enum `origem_lead`.
- Dia da semana nas visitas do portal da família e a frase "Sua enfermeira chega amanhã às 9h": o formato de data simples voltaria um dia no fuso de Brasília e a frase é texto de negócio (vem de `mensagem_modelo`).

## Rodada 2 (finalização)

- Gráficos compartilhados com `formato="moeda" | "numero" | "percentual"` (texto serializável, pois quem chama é componente de servidor); `graficos-dinheiro.tsx` removido. Colunas pareadas escrevem os valores sob o período, não no topo.
- NPS mês a mês no Painel executivo (`src/lib/gestao/nps-mensal.ts`), a partir de `api.pos_vendas`, sem migration; mês abaixo da amostra mínima mostra "sem amostra".
- Pipeline: origem do lead no cartão (via `api.lead_origem`, que já existia) e abas Atendimento e Pós-venda somente leitura (estágios mudam por registros e automações).
- Portal que a família acessa: progresso, atalhos, frases de apoio por bloco, próxima visita em destaque e botão fixo "Fale com a equipe". Modo sensível intocado.

## Rodada 3 (retorno da cliente)

- Barra lateral: logo centralizada, rolagem dentro do arredondado (cabeçalho e rodapé fixos), esmaecido no topo e no fim. Animações suaves de troca de tela e de entrada dos gráficos, desligadas com `prefers-reduced-motion`.
- Pipeline: colunas com altura máxima e rolagem interna, gráficos logo abaixo em grid de 3 colunas (sem o vão). Tarefas e Tarefas por equipe presas à altura da janela, com Concluída recolhível.
- Pré-natal em bento grid, com Concluídas recolhida por padrão.
- Banco de talentos, Pós-venda, Financeiro, Marketing (pizza e funil com conversão) e Isadora no mesmo padrão do Painel e das Cobranças.
- NPS mês a mês também no Pós-venda (reaproveita `src/lib/gestao/nps-mensal.ts`).
- Varredura de UX: só Famílias ganhou frase de apoio; o restante já estava no padrão. Recomendações abertas (baixa): componente único para "link de volta + título" nas telas de detalhe; copy do Copiloto cita "pipeline 1".

## Decisões

- Direção "institucional, legível, acolhedor na medida" depois do retorno da cliente (sem degradê decorativo).
- Demonstração em memória continua igual ao banco de hoje: a coordenação não conclui tarefa de outra pessoa até a 0046 ser aplicada.

## Pendências

- **Migration `0046_tarefas_acoes.sql` NÃO aplicada.** Revisar o SQL e rodar `supabase db push`. Antes disso, criar, mudar estado e atribuir mostram "Esta ação ainda não foi liberada no banco". Teste pgTAP: `supabase/tests/046_tarefas_acoes.sql` (validado só com shim local).
- Dados de demonstração: rodar `carga-demo-completa.sql` e depois `supabase/dados/demo_telas_seed.sql` no Supabase de demonstração, e apagar tudo antes de uso com família real.
- Perfis de teste: `ativo = false` (script no pacote de entrega) se não forem necessários.
- `[confirmar]`: licença web da Codec Pro; textos novos do painel (parágrafo do login) pela Camila.

## Comandos para testar

```bash
pnpm typecheck && pnpm lint && pnpm test
NEXT_PUBLIC_APP_ENV=desenvolvimento KZ_DADOS=demonstracao KZ_DEMO_VOLUME=grande pnpm dev   # MFA de demonstração: 123456
```
