# AGENTS.md — Central de Comando Residencial

> Este arquivo é lido automaticamente pelo Antigravity em toda sessão. Ele define como
> os agentes devem trabalhar neste projeto. Leia por completo antes de qualquer tarefa.

## O QUE É ESTE PROJETO

App de gestão doméstica para 2 usuários (eu + parceiro/a). Módulos atuais: Estoque,
Manutenção (tarefas), Central de Comando (dashboard), Ajustes (conta + Telegram).
A meta NÃO é virar SaaS. É uma ferramenta privada que a casa usa de verdade, todo dia.
Critério de qualquer feature: reduz fricção do dia-a-dia OU adiciona inteligência que
o usuário não teria de graça. Se não faz nem um nem outro, não entra.

## STACK (NÃO MUDE SEM PERGUNTAR)

- Next.js (App Router). Componentes Server por padrão; Client só quando precisa de estado/eventos.
- Supabase: Postgres + Auth + Realtime + Storage. RLS LIGADO em toda tabela.
- TypeScript estrito. Sem `any` sem justificativa em comentário.
- Tailwind para estilo. Tema escuro é o padrão (ver paleta abaixo).
- Deploy: Vercel.

## REGRAS DE OURO (MUST / NEVER)

- MUST: toda nova tabela Supabase nasce com RLS habilitado e policy escopada a `auth.uid()`
  ou ao household compartilhado. NUNCA deixe tabela aberta.
- MUST: segredos (token do bot Telegram, chaves) ficam em variáveis de ambiente e em
  tabela protegida por RLS — NUNCA hardcoded, NUNCA expostos no client bundle.
- MUST: toda mutação de dados passa por Server Action ou Route Handler. O client NUNCA
  fala direto com tabelas sensíveis usando a service role key.
- NEVER: usar `localStorage`/`sessionStorage` para estado de domínio. A fonte da verdade é o Supabase.
- NEVER: instalar biblioteca pesada para resolver algo que 30 linhas resolvem.
- MUST: cada feature nova vem com tratamento de erro visível ao usuário (toast/estado), não só `console.log`.
- MUST: pt-BR em toda string de interface. Datas no formato brasileiro (dd de mmm. de aaaa).

## MODELO DE DADOS (estado atual + convenções)

- Existe um conceito de **household** (a casa). Os 2 usuários pertencem ao mesmo household.
  Toda tabela de domínio (itens, tarefas, compras, contas) referencia `household_id`,
  não `user_id` direto — assim os dois enxergam os mesmos dados. RLS valida que o
  `auth.uid()` pertence ao household.
- Estoque: itens com categoria (ALIMENTOS, HIGIENE, LIMPEZA...), status (ok/faltando/vencendo),
  e idealmente `quantidade`, `validade`, `comprado_em`.
- Manutenção: tarefas com periodicidade (a cada N dias), próxima data, prioridade, descrição.
- Ao adicionar campos, escreva a migration em SQL versionada. NÃO altere schema pelo dashboard manualmente.

## PALETA / VISUAL (manter consistência)

- Fundo escuro profundo, cards levemente mais claros, cantos arredondados generosos.
- Acento principal: ciano/azul brilhante (gradiente nos botões de ação primária).
- Estados: vermelho = crítico/atrasado, amarelo/laranja = atenção/próximo, verde = ok/feito.
- Cabeçalho de cada tela: kicker em maiúsculas + título grande. Manter esse padrão.

## COMO QUERO QUE O AGENTE TRABALHE

1. Antes de codar, gere o Artifact de **plano de implementação**: arquivos que vai tocar,
   migrations necessárias, e o critério de aceitação. Espere eu comentar se for feature grande.
2. Para features pequenas, pode executar direto, mas SEMPRE entregue ao final:
   - Lista do que mudou (arquivos + migrations).
   - Screenshot ou gravação do browser provando que funciona.
   - O que falta / o que assumi.
3. Não me peça para rodar comandos que você mesmo pode rodar no terminal integrado.
4. Se uma decisão tem trade-off real (custo, segurança, complexidade), me apresente
   as opções em vez de escolher silenciosamente.
5. Trabalhe em branch separada por feature. Não faça push direto na main.

## CRITÉRIO DE "PRONTO"

Uma feature está pronta quando: funciona no fluxo real (não só no caso feliz),
tem RLS correto, trata erro de forma visível, mantém o visual consistente, e eu
consegui usar de ponta a ponta sem ler o código. Build da Vercel passa.
