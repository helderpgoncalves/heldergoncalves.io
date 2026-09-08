# Arquitectura — a plataforma

Este ficheiro é o desenho completo do que o site está a tornar-se. O
`CLAUDE.md` fica pequeno de propósito e aponta para aqui; isto é o
mapa que se lê antes de tocar em contas, reuniões, mensagens, Bolsa,
Contactos ou doações. Está escrito para ser lido do princípio ao fim
uma vez, e depois consultado por secção.

## A ideia, numa frase

O site deixa de ser uma montra com formulário de contacto e passa a
ser o sítio onde um visitante — curioso, cliente, ou algures entre os
dois — entra, fica a conhecer o Hélder, marca uma conversa, pede um
orçamento, troca mensagens, comenta o blog, e (havendo à vontade)
contribui. E onde o Hélder tem uma área de trabalho a sério: uma
agenda que gere, uma caixa de entrada só sua, e um Finder com toda a
gente que já passou por ali.

Continua a ser um sistema operativo, não uma aplicação com temas de
sistema operativo. A conta entra pelo mesmo item de menu Apple que já
existe (`Entrar`); o que muda é o que há para fazer depois de entrar.

## As nove invariantes

As primeiras oito são as de sempre, com uma reescrita da sétima e da
primeira para caber Postgres e MinIO. A nona é nova.

1. **Dependências mínimas e todas justificadas.** Cresceu a lista, mas
   a régua é a mesma: cada dependência explica-se numa frase, e o que
   a biblioteca padrão resolve, resolve-se com ela. Ver a lista
   completa em [Dependências novas](#dependências-novas).
2. **O site funciona sem JavaScript.** Continua a valer para tudo o
   que é público — home, escritos, Bolsa como portefólio. As áreas que
   exigem sessão (Mensagens com histórico, Reuniões, Contactos,
   Orçamentos) exigem naturalmente JavaScript para autenticar; o que
   não pode acontecer é uma dessas áreas partir uma página pública ao
   carregar.
3. **Nenhuma chave chega ao browser.** Continua a valer sem excepção —
   agora com mais segredos: `DATABASE_URL`, a chave da OpenRouter (já
   existia), as credenciais do MinIO, e mais tarde a do Stripe.
4. **As duas línguas andam a par.** `copy.pt.ts`/`copy.en.ts` para o
   texto estático; as strings que vivem em Postgres (nome de um
   projecto, corpo de uma nota) não são traduzidas pelo sistema — são
   o que a pessoa escreveu, na língua em que escreveu.
5. **A geometria da Apple não se negoceia.** Vale para todas as áreas
   novas — o formulário de entrar, a caixa de mensagens, o Finder de
   Contactos. Ver `.claude/rules/apple.md`.
6. **Nenhum ficheiro passa das 400 linhas.** Um router que cresce
   parte-se por sub-recurso (`reunioes.py` e `reunioes_admin.py`, não
   um `reunioes.py` com 600 linhas).
7. **Nada que seja segredo ou dado de visitante entra no repositório.**
   Isto já não é só `data/`: é o volume do Postgres, o *bucket* do
   MinIO, e qualquer `.env`. `data/` continua a existir só para o que
   não faz sentido numa tabela (o segredo de sessão gerado no
   arranque, se `SESSION_SECRET` não vier configurado).
8. **Em produção não se calcula o que se pode calcular no build.** Sem
   mudanças — a compressão continua a acontecer uma vez, no build.
9. **Sem tracking de terceiros.** Nenhum Google Analytics, Meta Pixel,
   ou equivalente a enviar dados para fora. O que o próprio site regista
   sobre um visitante logado é produto, não vigilância — mora em
   Postgres, é o rasto natural de usar as apps (marcou uma reunião,
   abriu uma conversa, viu uma página), nunca telemetria de comportamento
   recolhida "por via das dúvidas". Ver [Perfis e analítica](#perfis-e-a-app-contactos).

## Duas contas, um sistema

Continua a haver só uma pessoa com o papel de dono — `OWNER_EMAIL`,
comparado à sessão a cada pedido, exactamente como hoje. Não há tabela
de `roles`; não há hierarquia. Se um dia houver um segundo
administrador, essa é a migração que resolve isso — não se antecipa
agora.

O que muda é o que a sessão do dono desbloqueia:

- **Modo visitante** (sem sessão, ou sessão de uma pessoa qualquer): o
  site de sempre, mais a possibilidade de pedir uma reunião, escrever
  ao bot, pedir um orçamento, comentar, e ver o seu próprio histórico.
- **Modo dono** (sessão cujo email é `OWNER_EMAIL`): as mesmas apps do
  visitante trocam de conteúdo — o Calendário mostra a agenda cheia e
  a disponibilidade para editar (já é assim hoje), as Mensagens mostram
  todas as conversas de todos os visitantes e não só a própria, os
  Contactos abrem em modo Finder (ver abaixo), e os Orçamentos mostram
  a fila de pedidos pendentes por cotar.

Não há uma "área admin" à parte, num caminho diferente. É o mesmo
Shell.astro, as mesmas apps, com mais para ver — como o macOS não tem
uma "vista de administrador" separada do Finder normal.

## Autenticação

Dois caminhos para a mesma sessão, como hoje:

- **Google OAuth** — sem mudanças de fundo. `routers/oauth_google.py`.
- **Magic link por email** — substitui o código de seis dígitos actual
  (`sessions.py`) por uma ligação assinada, no mesmo espírito da
  confirmação da newsletter (`subscribers.py`): pede-se o email,
  chega uma ligação que expira, entrar é abrir a ligação. Mais simples
  para quem está no telemóvel (não há código para copiar entre a app
  de email e o browser).

A sessão continua a ser um cookie assinado (HMAC), sem tabela de
sessões — `sessions.py` guarda o segredo, não a lista de quem está
ligado. O que muda é o que existe *por trás* da sessão: hoje o email
autenticado só é cruzado com ficheiros NDJSON (`pessoas.ndjson`,
`meetings.ndjson`); passa a ser a chave estrangeira para as tabelas
Postgres de utilizador, reuniões, mensagens, orçamentos.

**A conta nasce no primeiro login.** Não há registo separado — entrar
com Google ou por magic link, pela primeira vez, cria a linha em
`users`. É o mesmo princípio de hoje (`users_store.record_visit`),
só que numa tabela em vez de um ficheiro.

## Postgres

Substitui **tudo** o que hoje é NDJSON em `data/`: `subscribers.ndjson`,
`comentarios.ndjson`, `reacoes.ndjson`, `pessoas.ndjson`,
`meetings.ndjson`, `availability.ndjson`, `conversas.ndjson`. Cada um
destes vira uma tabela; a migração é 1:1 na maior parte dos casos,
porque o feitio "uma linha por acontecimento" já existe — os `.ndjson`
de hoje são, na prática, um log de eventos sem esquema.

**Alembic** para as migrações, desde a primeira. Nenhuma tabela nasce
por um `CREATE TABLE` corrido à mão em produção — nasce por uma
revisão do Alembic, testada localmente primeiro.

**Async desde o início.** `asyncpg` por baixo, com SQLAlchemy 2.x no
modo assíncrono (`AsyncSession`) — não `psycopg2` síncrono dentro de
`asyncio.to_thread`, que seria repetir o problema que o `yfinance` já
obriga a contornar. Uma app com sessões, mensagens em quase-tempo-real
e um bot que fala com uma API externa não pode ter o acesso à base de
dados a bloquear o *event loop*.

### O que fica fora de Postgres

- **`knowledge/*.md`** — continua ficheiros. É conteúdo editorial que
  o Hélder escreve directamente, não dado transaccional.
- **O segredo de sessão**, se não vier de variável de ambiente —
  continua gerado e guardado em `DATA_DIR/.session-secret`, tal como
  hoje. Não há razão para uma tabela para isto.
- **Ficheiros anexados** (orçamentos, documentos de projecto) — vão
  para MinIO, não para uma coluna `bytea`. Postgres guarda metadados
  (nome, tamanho, tipo, dono, chave no *bucket*), nunca o conteúdo.

### Esquema (visão de alto nível)

Nomes de tabela em português, como o resto do código. Tipos indicativos,
não o DDL final — isso é trabalho do Alembic quando cada domínio for
implementado.

```
users
  id            uuid pk
  email         text unique not null
  criado_em     timestamptz not null
  ultima_visita timestamptz not null
  visitas       int not null default 1
  -- "dono" NÃO é uma coluna aqui — continua a ser OWNER_EMAIL
  -- comparado ao email, em sessions.py

conversas                    -- Mensagens
  id            uuid pk
  user_id       uuid fk -> users, null se anónima (visitante sem sessão)
  fingerprint   text, null se autenticada -- impressão digital de IP, como hoje
  estado        text -- 'bot' | 'a_espera_de_humano' | 'humano' | 'fechada'
  criado_em     timestamptz
  actualizado_em timestamptz

mensagens                    -- as linhas dentro de uma conversa
  id            uuid pk
  conversa_id   uuid fk -> conversas
  autor         text -- 'visitante' | 'bot' | 'dono'
  corpo         text
  criado_em     timestamptz

reunioes
  id            uuid pk
  user_id       uuid fk -> users
  inicio        timestamptz not null
  fim           timestamptz not null
  titulo        text
  nota          text
  estado        text -- 'pendente' | 'confirmada' | 'recusada' | 'cancelada'
  origem        text -- 'slot_livre' | 'pedido'  (ver Reuniões, abaixo)
  criado_em     timestamptz

disponibilidade_excecoes     -- os bloqueios/aberturas do dono por cima das janelas fixas
  id            uuid pk
  inicio        timestamptz
  fim           timestamptz
  tipo          text -- 'bloqueio' | 'abertura'

projetos                     -- a app Contactos / Finder, e a Bolsa como portefólio
  id            uuid pk
  user_id       uuid fk -> users, dono do projecto (o cliente)
  titulo        text
  descricao     text
  estado        text -- 'ideia' | 'orcamento_pendente' | 'orcamento_enviado'
                      -- | 'aceite' | 'em_curso' | 'concluido' | 'recusado'
  criado_em     timestamptz
  actualizado_em timestamptz

orcamentos
  id            uuid pk
  projeto_id    uuid fk -> projetos
  proposto_por  text -- 'cliente' | 'dono'
  valor_centimos int, null até o dono cotar
  moeda         text default 'EUR'
  nota          text
  criado_em     timestamptz

documentos                   -- anexos do cliente E entregáveis do dono, no mesmo projecto
  id            uuid pk
  projeto_id    uuid fk -> projetos
  enviado_por   text -- 'cliente' | 'dono'
  nome_ficheiro text
  mime          text
  tamanho_bytes bigint
  chave_minio   text -- caminho no bucket, nunca o conteúdo aqui
  criado_em     timestamptz

comentarios                  -- nos escritos do blog
  id            uuid pk
  post_slug     text
  user_id       uuid fk -> users
  corpo         text
  criado_em     timestamptz

reacoes
  id            uuid pk
  post_slug     text
  user_id       uuid fk -> users
  tipo          text -- '👍' | '❤️' | '💡'
  criado_em     timestamptz

visitas_pagina                -- rasto funcional mínimo, não analítica de comportamento
  id            uuid pk
  user_id       uuid fk -> users
  app_id        text -- qual app do sistema abriu
  em            timestamptz

subscritores                  -- a newsletter, como hoje, só que em tabela
  email         text pk
  confirmado_em timestamptz
  cancelado_em  timestamptz, null se activo

doacoes                       -- ver Doações — a tabela nasce documentada, a funcionalidade não
  id            uuid pk
  user_id       uuid fk -> users, null se anónima
  valor_centimos int
  moeda         text
  estado        text -- 'pendente' | 'concluida' | 'falhada'
  criado_em     timestamptz
```

`visitas_pagina` é deliberadamente pobre: só regista a abertura de uma
app por uma sessão autenticada, nunca de um visitante anónimo, e nunca
tempo-na-página, scroll, ou cliques. É o suficiente para responderes
"o que é que esta pessoa andou a ver" sem construir um Google Analytics
por dentro.

## As apps, por domínio

### Reuniões — o Calendário

Já existe em forma quase completa (`meetings.py`, `availability.py`,
`routers/reunioes.py`, `routers/agenda.py`). O que muda:

- **Dois caminhos para marcar**, não um: continua a existir a marcação
  directa num slot livre (o que já há), e passa a existir também um
  **pedido** para um horário fora dos slots publicados — o visitante
  descreve o que quer e quando, o pedido nasce com `estado = 'pendente'`,
  e só o dono o transforma em `'confirmada'` ou `'recusada'` (app
  Mensagens/Reuniões, modo dono). Um pedido pendente **não** ocupa o
  slot enquanto não for confirmado.
- `booked_starts()` (hoje) continua a decidir o que aparece como
  ocupado, mas só para reuniões `confirmada` — um pedido pendente não
  bloqueia outros visitantes.
- O histórico de reuniões passadas de uma pessoa (o que o pedido
  original menciona — "ver histórico de reuniões") é `list_for(user_id)`
  sem o filtro de `futuras primeiro`, com as passadas incluídas.

### Mensagens — o bot e o dono

Já existe a base: `chat_store.py`, `routers/chat.py`, `agent/`. Regras
novas:

- **Sem sessão**: como hoje — respostas guardadas (`cannedFor`) se não
  houver `CHAT_READY`, ou o modelo via OpenRouter se houver, sem
  histórico persistente, por *token* efémero.
- **Com sessão**: o bot responde com o contexto da própria conta —
  os seus projectos, o estado dos seus orçamentos, as suas reuniões
  (ver [Contexto do bot](#o-bot-com-contexto-de-conta)) — e a conversa
  fica gravada, ligada a `user_id`, visível para a pessoa (as suas) e
  para o dono (todas).
- **Detecção de "precisa de humano"**: uma ferramenta nova em
  `agent/tools.py`, `pedir_intervencao_humana`, que o modelo chama
  quando a pergunta foge ao que sabe responder (pedido de preço fora
  do que está documentado, reclamação, algo emocionalmente carregado).
  Muda `conversas.estado` para `'a_espera_de_humano'` e notifica o
  dono (email, para já — ver `mail.py`). O bot pode continuar a
  responder depois, mas a etiqueta fica visível no lado do dono até
  ele intervir.
- O dono lê e responde às conversas na mesma app Mensagens, em modo
  dono: escrever ali é `autor = 'dono'`, e não passa pelo modelo.

### Bolsa — portefólio e orçamentos

Duas coisas distintas debaixo do mesmo nome, porque o pedido original
as junta:

1. **Cotações e portefólio pessoal** — o que já existe
   (`bolsa/client.py`, `yfinance`, cache de um minuto). Sem mudanças
   de fundo.
2. **Portefólio de projectos** (o teu trabalho, e o de clientes
   contigo) — isto é a tabela `projetos`. Um projecto de portefólio
   público (que qualquer visitante vê, tipo caso de estudo) tem
   `user_id` a apontar para a tua própria conta e um campo a marcá-lo
   como público; um projecto de um cliente é privado a esse cliente e
   a ti.
3. **Pedido de cotação** — um visitante descreve uma ideia (texto
   livre, sem formulário rígido de categorias), anexa ficheiros
   (MinIO), e isso nasce como `projetos` (`estado = 'ideia'`) mais um
   `orcamentos` associado (`proposto_por = 'cliente'`, `valor_centimos
   = null`). O dono vê a fila de pedidos pendentes, responde com um
   valor — isso é a segunda linha em `orcamentos`
   (`proposto_por = 'dono'`), e o cliente vê a proposta na sua área.

A app do lado do visitante mostra as duas coisas juntas — o
portefólio como inspiração, o botão de pedir cotação logo a seguir —
porque é assim que o pedido original as descreve: "ver o meu
portfolio e também pedir cotações".

### Notas / Blog — comentários e reações

Já existe quase por inteiro (`comments_store.py`, `reactions_store.py`,
`routers/comments.py`, `comentarios.js`). A única mudança de fundo é a
tabela: `comentarios`/`reacoes` passam a ter `user_id`, não um nome
solto digitado no formulário — quem comenta tem de estar autenticado.
Isto simplifica a regra "o email nunca sai de `comments_store.py`":
deixa de haver email nenhum a guardar ao lado do comentário, porque a
identidade já vive em `users`, e o que se devolve ao público continua
a ser só `id`, o texto e a data — mais o nome público que a pessoa
escolher (ver [Perfil](#perfis-e-a-app-contactos)).

### Perfis e a app Contactos

A app **Contactos funciona como o Finder**, não como uma lista simples:

- **Em modo dono**, abre-a e vês todas as pessoas que já entraram —
  o mesmo que `pessoas.py`/`Pessoas.astro` já fazem hoje, mas agora
  cada uma abre para uma ficha completa: contactos, reuniões,
  mensagens, projectos, orçamentos, comentários — tudo o que essa
  pessoa gerou, num sítio só. É literalmente navegar o Finder por
  pessoa em vez de por pasta.
- **Em modo visitante**, a mesma app mostra só a *tua própria* área de
  trabalho — não achas o Finder de outra pessoa. Essa área **só existe
  quando há algo real**: um projecto, uma reunião, um orçamento. Uma
  conta recém-criada sem nenhuma destas coisas não tem uma pasta para
  mostrar — não se cria uma área de trabalho vazia só porque a conta
  existe.
- Dentro da área de uma pessoa (dono a ver um cliente, ou o cliente a
  ver a sua própria): **projectos**, **documentos** (ambos podem
  contribuir — o cliente anexa e escreve ideias, o dono publica
  entregáveis e propostas, tudo ligado ao mesmo `projeto_id`), e
  **recibos** (pagamentos concluídos — de um orçamento aceite, e mais
  tarde de uma doação, ver abaixo).

Isto é a app que substitui `pessoas.js`/`Pessoas.astro` de hoje — não
uma app nova ao lado.

### Doações

**Documentada, não implementada.** A tabela `doacoes` (acima) existe
no esquema para não obrigar a uma migração extra quando a
funcionalidade for construída, mas nenhum router, nenhum botão, nenhum
UI a chama ainda.

Decisão já tomada para quando for a vez: **Stripe Checkout**. A API
cria a sessão de *checkout* (redirecciona para uma página do Stripe —
PCI compliance é problema deles, não nosso) e recebe a confirmação por
*webhook*; nunca um número de cartão passa pelo browser ou pela API.
Isto acrescenta uma dependência nova, `stripe`, justificada da mesma
forma que as outras: resolve um problema (processar pagamentos com
segurança) que a biblioteca padrão não resolve e que não vale a pena
reescrever.

## O bot com contexto de conta

Quando `user_id` existe, as ferramentas do agente (`agent/tools.py`)
ganham acesso de leitura aos dados *dessa* conta e só dessa — nunca a
de outro visitante. Concretamente, uma ferramenta nova,
`estado_da_conta`, que o modelo chama para responder a "qual o estado
do meu orçamento" ou "quando é a minha próxima reunião": lê
`projetos`, `orcamentos`, `reunioes` filtrados por `user_id = <quem
está a falar>`, nunca por um id que venha do próprio texto da
conversa. O `user_id` chega à ferramenta pelo mesmo caminho que a
sessão chega ao *router* — nunca por algo que o modelo possa inventar
ou que o visitante possa escrever no chat.

## Anexos — MinIO

Um serviço novo no `docker-compose.dev.yml` (e no de produção),
compatível com S3. Postgres guarda metadados (`documentos`, acima);
o conteúdo vive no *bucket*. Dependência nova na API: um cliente S3
(`boto3` ou, mais leve, `aioboto3` para não bloquear o *event loop* —
a decidir no momento de implementar, com a mesma pergunta de sempre:
o mais simples que resolve a sério).

Regra de acesso: um documento só é lido através da API (que confere a
sessão e o dono do projecto antes de gerar uma *presigned URL* de
curta duração) — o *bucket* em si nunca é público.

## SEO

Sem mudanças de fundo nas páginas já públicas — home, escritos, o
portefólio público da Bolsa. Continuam totalmente indexáveis,
`llms.txt`/`llms-full.txt`, `posts.json`, RSS e o endpoint MCP mantêm-se.

Áreas de conta (Mensagens, Reuniões, Orçamentos, Contactos, o portefólio
*privado* de um cliente) levam `noindex` — não são páginas novas em
rotas próprias, são estados de apps dentro do Shell, pelo que o
`noindex` vive ao nível do próprio `index.astro`/`Shell.astro` quando
uma sessão está presente, ou simplesmente não existe HTML server-side
nenhum a indexar para além da concha do sistema (o que já é verdade
hoje para o Calendário em modo dono).

## Arquitectura da API

**Continua um processo só.** A pergunta foi feita directamente e a
resposta é sim, com Postgres assíncrono (`asyncpg`) em vez de ficheiro,
`--workers 1` como hoje, e o mesmo princípio: uma chamada bloqueante
trava tudo, por isso nunca se bloqueia o *event loop* — nem com
Postgres, nem com o cliente MinIO, nem com o `yfinance` (que já corre
em `asyncio.to_thread`).

**O que forçaria separar** — documentado aqui para quando for preciso,
não implementado agora:

- Uma fila de tarefas (ex: `arq`/`Celery` com Redis) se o bot IA ou o
  envio de email começar a ter picos que atrasem pedidos síncronos.
- Um processo dedicado a *websockets* se as Mensagens passarem de
  "recarrega para ver a resposta" para tempo real a sério — hoje o
  chat já funciona por pedido/resposta simples (`talk()` em
  `mensagens.js`), e isso continua a chegar para o volume que este
  site tem.
- Réplicas de leitura do Postgres, só se a app Contactos em modo dono
  (que lê tudo sobre todos) começar a pesar.

Nenhuma destas três é um problema hoje. Não se constrói para o
problema que ainda não existe.

## Dependências novas

Além das cinco que já existem (`fastapi`, `uvicorn`, `httpx`,
`yfinance`, `tzdata`):

| Dependência | Porquê |
| --- | --- |
| `sqlalchemy` (modo async) | O ORM/query builder para Postgres — a alternativa é escrever SQL cru à mão para cada tabela nova, que cresce mais depressa do que uma dependência bem escolhida. |
| `asyncpg` | O driver Postgres que não bloqueia o *event loop* — é a peça que faz "Postgres assíncrono" ser verdade, não só uma intenção. |
| `alembic` | Migrações versionadas — sem isto, mudar o esquema em produção é um `ALTER TABLE` corrido à mão, que é exactamente o tipo de coisa que este projecto evita noutros sítios. |
| `aioboto3` (ou `boto3`, a decidir) | Cliente S3 para o MinIO — anexos de orçamentos e documentos de projecto. |
| `stripe` | Só quando as Doações forem implementadas — Checkout e verificação de *webhook*, nunca dados de cartão pelo nosso lado. |

Todas resolvem um problema que a biblioteca padrão do Python não
resolve (falar com Postgres, gerir migrações, falar com S3, falar com
o Stripe) — a régua da invariante 1 continua a aplicar-se sem excepção.

## O que NÃO muda

Para que fique claro que isto é uma extensão, não uma reescrita:

- O padrão de seis pontos para uma app nova (`/nova-app`) continua
  válido — as apps novas (Reuniões em modo pedido, Orçamentos,
  Contactos/Finder) seguem-no à letra.
- O padrão de sete portões para uma rota nova (`/nova-rota`) continua
  válido — troca-se `bump`/limites em memória por limites que também
  podem viver em Postgres quando fizer sentido (ex: `book_per_user_day`
  já é uma pergunta que uma tabela responde melhor do que um dicionário
  em memória), mas a ordem dos portões não muda.
- `desk`/`ph` como objecto partilhado no frontend, sem importações
  directas entre módulos — sem mudanças.
- A geometria da Apple — sem mudanças, aplica-se a tudo o que é novo.
- `knowledge/*.md` como forma de ensinar o assistente — sem mudanças;
  ganha só mais contexto (o que a app Contactos é, o que os Orçamentos
  são) para o bot saber explicar-se a um visitante.
