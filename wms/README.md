# Controle de Embalagens — WMS leve (piloto Santa Maria/RS)

Sistema web para controle de estoque de embalagens de uma empresa de moinho de
trigo com duas unidades (Santa Maria/RS e Canoas/RS). Substitui a planilha e a
contagem manual semanal por saldo em tempo real, calculado a partir do
registro de toda entrada e saída física — inclusive a retirada de embalagem
para as linhas de envase, que hoje não é registrada em lugar nenhum.

## Por que este sistema existe

O ponto cego de hoje é a saída: a nota de recebimento é registrada, a
embalagem vai para o depósito, e o setor de envase retira sem lançar nada.
O saldo só é conferido uma vez por semana, contra o volume envasado. Este
sistema fecha esse ponto cego: **toda movimentação física (entrada ou saída)
gera um registro**, e o saldo é sempre `soma(entradas) - soma(saídas)` —
nunca digitado manualmente.

## Stack técnica

- **Next.js 16** (App Router, Server Actions) + **React 19** + TypeScript
- **Tailwind CSS 4** — interface responsiva, pensada para tablet/celular no
  chão de fábrica (poucos campos por tela, botões grandes)
- **Prisma 7** + **SQLite** (via `better-sqlite3` driver adapter) — banco
  persistente em arquivo, adequado para o piloto. Migrar para Postgres é uma
  troca de `datasource provider` no `prisma/schema.prisma` + `DATABASE_URL`;
  o restante do código não muda (ver [Migração para Postgres](#migração-para-postgres)).
- Autenticação por sessão em cookie assinado (JWT via `jose`), sem
  dependência externa

## Rodando localmente

```bash
npm install
cp .env.example .env        # ajuste SESSION_SECRET em produção
npx prisma migrate deploy   # cria o banco SQLite e aplica o schema
npx prisma db seed          # cria unidade Santa Maria + SKUs classe A + usuários piloto
npm run dev
```

Acesse `http://localhost:3000`. Usuários criados pelo seed (senha para
todos: `trocar123`, trocar no primeiro acesso real):

| Perfil                            | E-mail                           |
| ---------------------------------- | --------------------------------- |
| Administrador                      | admin@antoniazzi.com.br          |
| Estoquista (Santa Maria)           | estoquista.sm@antoniazzi.com.br  |
| Operador de Envase (Santa Maria)   | envase.sm@antoniazzi.com.br      |

`npm run build` / `npm run lint` para validar antes de subir para produção.

## Modelo de dados (visão geral)

- **Unit** — unidade/localização (Santa Maria, Canoas...). Uma nova unidade é
  só uma linha nova nesta tabela; nenhuma alteração de schema é necessária
  para expandir o piloto.
- **Sku** — cadastro de embalagem, **pertence a uma Unit**. Isso reflete que
  o estoque físico é separado por unidade: o mesmo tipo de embalagem em duas
  unidades é dois registros de `Sku` (mesmo `internalCode` permitido em
  unidades diferentes, único dentro da mesma unidade).
- **Movement** — o livro-razão de movimentação. Um único registro por
  entrada ou saída, com `type` (`ENTRADA`/`SAIDA`), quantidade, SKU, usuário
  responsável e os campos específicos do tipo (fornecedor/NF para entrada;
  linha de destino/ordem de produção para saída).
- **Saldo** — **nunca armazenado**. Sempre calculado on-the-fly como
  `SUM(ENTRADA.quantity) - SUM(SAIDA.quantity)` agrupado por SKU
  (`src/lib/balance.ts`). Isso garante que o saldo mostrado é sempre
  consistente com o histórico de movimentação — não existe como o saldo
  "dessincronizar" do histórico.
- **CycleCount** — contagem cíclica. Guarda a contagem física, um snapshot
  do saldo do sistema no momento da contagem, e a divergência calculada.
  Divergências acima do limite configurável (`Setting.divergenceThresholdPercent`,
  padrão 5%) ficam `PENDING_REVIEW` e aparecem no dashboard; só um
  Administrador pode revisar, e um ajuste de saldo **sempre cria um novo
  Movement de correção** — o saldo nunca é sobrescrito diretamente.
- **User** — perfis `ADMIN`, `ESTOQUISTA`, `OPERADOR_ENVASE`. Estoquista e
  Operador de Envase são vinculados a uma unidade; Administrador vê todas.

## Fluxo crítico: registro de saída

A tela `/saidas/nova` (rota padrão de login do Operador de Envase) foi
desenhada para ser o caminho de menor resistência: busca de SKU por
autocomplete (sem câmera/QR nesta versão), quantidade, linha de destino e
ordem de produção opcional — 4 campos, poucos cliques, sem redirecionamento
para outras telas. Não existe nenhum fluxo no app que registre consumo sem
passar por este formulário, então o saldo do sistema é sempre confiável.

## SKU quase-duplicado

Ao cadastrar um SKU (`/skus/novo`), a descrição é comparada em tempo real
(similaridade por sobreposição de palavras, `src/lib/similar-skus.ts`) contra
os SKUs já cadastrados na mesma unidade. Se houver correspondência, o
cadastro exige confirmação explícita antes de habilitar o botão de salvar.

## Preparado para leitura de QR code (não incluído no MVP)

O picker de SKU (`src/components/sku-picker.tsx`) é um componente isolado
que resolve um `skuId` a partir de busca textual e escreve num único input
oculto. Adicionar leitura de QR code no futuro é substituir (ou complementar)
a fonte de input desse componente — nenhuma mudança de schema ou de fluxo de
negócio é necessária.

## Exportação para planilha

`/saldo` e a página de detalhe de cada SKU exportam CSV
(`/api/export/saldo`, `/api/export/movements`) para cruzamento com a
planilha atual durante o período de transição.

## Migração para Postgres

O schema já foi desenhado para múltiplas unidades e não usa nenhum recurso
específico do SQLite. Para migrar:

1. Trocar `provider = "sqlite"` por `provider = "postgresql"` em
   `prisma/schema.prisma`.
2. Trocar o driver adapter em `src/lib/prisma.ts` (e `prisma/seed.ts`) de
   `@prisma/adapter-better-sqlite3` para `@prisma/adapter-pg` (ou equivalente).
3. Apontar `DATABASE_URL` para o Postgres de destino e rodar
   `npx prisma migrate deploy`.

## Escopo do piloto

O seed cria apenas a unidade Santa Maria ativa, com 8 SKUs classe A/B
representativos (sacaria, big bag, filme de ensacadeira, etiquetas, fita,
palete). Canoas/RS já existe no cadastro de unidades (`/admin/unidades`),
marcada como inativa — ativar libera imediatamente o cadastro de SKUs e
lançamentos para ela, sem qualquer alteração de banco de dados.

## O que fica para uma próxima iteração

- Leitura de QR code por SKU (ponto de extensão já isolado, ver acima)
- Autenticação mais robusta (recuperação de senha, 2FA) caso o piloto saia
  do ambiente controlado da fábrica
- Notificações automáticas de ruptura iminente de linha (a partir do cálculo
  de cobertura já existente no dashboard)
