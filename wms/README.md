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
- **Prisma 7** + **PostgreSQL** (via `@prisma/adapter-pg`). O protótipo
  começou em SQLite em arquivo, mas isso causou perda de dados real em
  produção: discos de nuvem compartilhados (como o volume do Railway) não
  são confiáveis para SQLite entre reinícios/deploys. Postgres é a única
  opção usada a partir daqui — ver [Por que Postgres, não SQLite](#por-que-postgres-e-não-sqlite).
- Autenticação por sessão em cookie assinado (JWT via `jose`), sem
  dependência externa

## Rodando localmente

Requer um Postgres rodando (local, Docker, ou um serviço gerenciado —
Railway/Neon/Supabase todos funcionam).

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL e SESSION_SECRET
npx prisma migrate deploy   # aplica o schema no Postgres
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

## Por que Postgres, e não SQLite

O plano original era rodar o piloto em SQLite (arquivo local), migrando
para Postgres só se o piloto validasse — é um padrão comum para protótipos.
Na prática, ao publicar o piloto no Railway com o banco em um volume
persistente, uma reinicialização do container resetou o arquivo SQLite e
apagou os SKUs cadastrados pelo usuário (os dados do seed, sendo recriados
por `upsert`, voltaram; os dados reais não). A causa mais provável é que
volumes de nuvem compartilhados não garantem as mesmas semânticas de
arquivo/lock que o SQLite espera, especialmente entre deploys. Por isso o
projeto migrou para Postgres antes mesmo do piloto validar — a
confiabilidade dos dados não é negociável, mesmo em fase de teste.

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
