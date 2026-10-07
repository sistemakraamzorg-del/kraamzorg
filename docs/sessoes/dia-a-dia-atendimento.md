# Dia a dia do atendimento na evolução, e o símbolo da barra lateral

Data: 06/10/2026. Pedido da Camila depois de testar o sistema publicado: a logo da barra lateral voltou a aparecer cortada, e a tela de evolução não mostrava a data de cada atendimento, a hora de entrada e de saída da casa (check-in e check-out) nem todos os campos da planilha de papel do DOC 2.

## O que foi feito

1. **Símbolo da marca.** O `public/brand/simbolo-provisorio.png` era um recorte justo demais do logo: a ponta esquerda da lua dourada e a base ficavam cortadas no próprio arquivo. Foi recortado de novo a partir do `logo-provisorio.png`, com respiro em volta (196 x 145). Nada foi redesenhado. A barra lateral passou a usar a proporção nova (36 x 27) e o símbolo não encolhe mais ao lado do nome (`shrink-0`). A cópia do protótipo (`docs/prototipo/assets`) recebeu o mesmo arquivo.
2. **Dia a dia do atendimento** (`src/modules/assistencial/evolucao/componentes/dia-a-dia.tsx`, lógica em `rotina.ts`). Na página de cada documento da evolução, para a coordenação (`/evolucoes/...`) e para a enfermeira (`/minhas-evolucoes/...`):
   - frase com dias registrados, dias contratados, plano (por exemplo "12 dias de 6h") e o tempo total na casa comparado às horas do plano nesses dias;
   - o cabeçalho da planilha: paciente, bebê com peso ao nascer e na alta, obstetra, pediatra e data da alta;
   - tabela com uma coluna por dia (D1 a D6 ou D12): data e dia da semana, horário combinado, entrada na casa, saída da casa e tempo na casa ("6h05 de 6h"). A linha "Situação da visita" aparece só quando algum dia não aconteceu como previsto (agendada, cancelada, não realizada);
   - "Ver o checklist de cada dia, campo por campo": todos os blocos e campos do DOC 2 vigente, com os rótulos do próprio instrumento, o valor de cada dia, o bloco do recém-nascido repetido por bebê nos gemelares, a hora da assinatura e o resumo descritivo. Campo condicional sem valor em dia nenhum (motivo do contato médico, bloco do último dia) fica de fora, como no papel.
   - A tabela rola de lado dentro da própria caixa, com a primeira coluna presa; a página não rola de lado no celular.
3. **Banco.** Migration `0047_rotina_evolucao.sql` (escrita, não aplicada em ambiente nenhum): troca `assistencial.ler_base_evolucao` com o corpo da 0024 inteiro e acrescenta `acompanhamento.horas_por_visita`, a lista `rotina` (todas as visitas, com ou sem registro: data, horário combinado, check-in, check-out e estado), `definicao_checklist` (DOC 2 vigente) e, em cada visita com registro, `resumo_descritivo` e `assinado_em`. Mesma checagem de acesso, mesma gravação de leitura antes de devolver, sem grant novo. Ensaiada como papel sem superuser, como no Supabase gerenciado.
4. **Demonstração.** As evoluções fictícias passaram a preencher todos os campos do DOC 2 aprovado (antes só os obrigatórios, e por isso a tela parecia ter campos faltando), com entrada e saída de cada dia. A Família Teste Estrela virou um plano de 12 dias de 6 horas; Aurora e Cedro, 6 dias de 3 horas; Brisa (gêmeos), 6 dias de 6 horas.
5. `formatarHora` ("09:34", fuso de Brasília) e `formatarDuracao` ("3h05", "6h", "45min") em `src/lib/formatacao`.

## Planilha de papel comparada com o instrumento

A planilha enviada é o DOC 2 em branco ("DOC 2 - CHECKLIST DIÁRIO – KRAAMZORG BRASIL.xlsx", sem dado de paciente). Todos os campos dela já estão no `supabase/dados/instrumentos/doc2.json`, um por um, do bloco 1 (chegada e preparo) ao 9 (comunicação), mais a assinatura com hora e o resumo descritivo. Nenhum campo clínico foi criado, removido ou renomeado. Diferenças:

- a planilha tem uma linha "Horário"; o sistema guarda esse horário e, além dele, a entrada e a saída da casa marcadas pela enfermeira no portal ("Cheguei" e a saída), que agora aparecem na tabela;
- a planilha vai até D6; o sistema vai até D12 (PRD 9.2);
- o sistema tem o bloco do último dia (contatos do obstetra e do pediatra e resumo de encerramento), que a planilha não tem.

## O que ficou de fora

- O dia a dia aparece na evolução. Durante o acompanhamento, a entrada e a saída hoje só aparecem no cartão da visita, no portal da enfermeira; a coordenação vê na agenda o estado de cada visita, sem os horários. Uma aba "Atendimento" na ficha da família, com a mesma tabela enquanto os dias acontecem, é o passo seguinte (a leitura auditada já aceita acompanhamento em andamento).
- O PDF aos médicos não mudou: as seções dele são as do PRD 9.5.
- Adendos de correção (`registro_adendo`) não aparecem na tabela; ela mostra o registro assinado de cada dia.
- A tabela não julga o tempo na casa (não pinta de aviso quem ficou menos que o plano): esse limite seria regra de negócio e teria de morar em `parametro`, com decisão da Edilaine.

## Decisões

- Os rótulos das linhas do checklist vêm da definição do DOC 2 vigente que a própria base da evolução devolve, nunca de texto no código.
- A tabela lê a definição vigente, não a versão gravada em cada registro. Hoje só existe a v1; quando houver uma v2, vale rever.
- Tom lavanda na agenda (tempo e agenda) e areia clara nos blocos do checklist, conforme os tons de apoio.

## Pendências novas

- PRD 22.4, O-17 (novo): [confirmar: Leonardo] se existe plano de 4 horas, porque o PRD prevê 3, 4 ou 6 horas por visita e a Camila falou em 3 ou 6; [confirmar: Edilaine] se a diferença entre o tempo na casa e o plano vira aviso, com o limite em `parametro`.
- Aplicar a 0047 no Supabase depois da revisão humana do SQL (CLAUDE.md), na ordem, depois da 0046 (tarefas, do DashCore).
- PRD 22.4, O-18 (novo): retornos da Isadora no número comum não saem fora da janela de 24 horas; e o lembrete da véspera não nasce para reunião marcada à tarde para o dia seguinte.

## Testes

```bash
PGPORT=54480 PGDATA=/tmp/kz-pg-final supabase/sem-docker/scripts/testar.sh   # 4795 de 4795 (39 novos)
pnpm vitest run src/modules/assistencial/evolucao src/lib/formatacao src/lib/dados
pnpm e2e:evolucao-ocorrencia-nf     # inclui "o dia a dia mostra data, entrada e saída..."
pnpm e2e:offline
pnpm typecheck && pnpm lint && pnpm format:check
```

Roteiro manual: `pnpm dev:demo`, entrar como Coordenação (código 123456), Evoluções, Família Teste Estrela, Evolução puerperal, rolar até "Dia a dia do atendimento" e abrir "Ver o checklist de cada dia". Repetir com a largura de 390 px.

## Testes da Isadora que dependiam da hora (achado na mesma sessão)

Seis cenários do roteiro local (`tests/agente/local/roteiro-local.test.ts`) falhavam às 16h20 de São Paulo, também no commit anterior a esta sessão. Duas causas:

1. **C18, V18 e V19 (lembrete da véspera), fragilidade do teste.** `privado.agenda_lembrete_em` não cria o lembrete quando a véspera, na hora de `agenda_lembrete_hora` (10:00), já passou. Rodando depois das 10h, o caso marca a reunião para a tarde do dia seguinte e a véspera é hoje às 10h. O preparo `agendaDeTeste` passou a usar a hora do lembrete no fim da agenda de teste (18:00), e o caso não depende mais da hora em que roda. Provado sob `faketime` às 00:10, 09:00, 12:30, 16:20, 19:50 e 23:40, e em sexta, sábado e domingo.
2. **C16, C27 e V30 (cadência e retomada), defeito do sistema.** O fluxo 3 consulta a janela de 24 horas da API oficial antes de todo retorno, em qualquer canal, e fora dela só tenta modelo aprovado pela Meta. A cadência sai sempre com 24 horas ou mais de silêncio, então no número comum (UAZAPI) ela não sai, ao contrário do que o PRD 4.1 diz. Não foi escondido no teste: os três casos declaram a lacuna (`LACUNA_JANELA_UAZAPI` em `tests/agente/lib/casos-agenda.ts`) e o PRD ganhou o O-18. Quando o fluxo 3 passar a olhar o canal, o teste local acusa a lacuna resolvida.

Resultado: `pnpm vitest run tests/agente` 87 de 87; `node --test n8n/build.test.mjs` 408 de 408.
