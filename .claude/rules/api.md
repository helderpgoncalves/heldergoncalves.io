---
paths:
  - "api/app/**/*.py"
  - "api/tests/**/*.py"
---

# A API

Python (FastAPI). Dependências mínimas e todas justificadas — `fastapi`,
`uvicorn`, `httpx`, `yfinance`, `tzdata`. Se uma coisa se resolve com a
biblioteca padrão, resolve-se com ela: é por isso que a segurança
(`hmac`, `hashlib`, `secrets`) e as datas (`zoneinfo`) não trazem mais
nada.

## Onde cada coisa vive

Cada ficheiro tem um assunto, e só um.

| | |
| --- | --- |
| `config.py` | **o único ficheiro que lê `os.environ`.** Se leres uma variável de ambiente noutro sítio, está errado. |
| `http.py` | ler o corpo do pedido, com tecto |
| `validation.py` | limpar o que vem de fora — `clean`, `one_line`, `EMAIL_RE`, `escape_html` |
| `security.py` | cabeçalhos, limites por visitante, tokens |
| `static_files.py` | os ficheiros que o Astro gerou |
| `mail.py` | entregar email — o contrato é `True`/`False` |
| `knowledge.py` | o que o assistente sabe, e a pesquisa |
| `subscribers.py` | a lista da newsletter |
| `sessions.py` | o código por email, e a sessão |
| `meetings.py` / `availability.py` | as reuniões marcadas, e quando há vaga |
| `availability_store.py` | os bloqueios e aberturas que o dono cria por cima das janelas fixas |
| `copy.py` | o texto das páginas e emails que não passam pelo Astro |
| `agent/` | o prompt e as ferramentas do assistente |
| `bolsa/` | o que a Bolsa sabe — cliente do Yahoo (`client.py`) e a sua cache (`cache.py`) |
| `routers/` | uma família de rotas, um ficheiro |
| `main.py` | a aplicação FastAPI: inclui os routers, e mais nada de lógica |

## Invariantes

- **Nenhum texto de fora chega a lado nenhum sem passar por `clean` ou
  `one_line`.** É em `validation.py` que isso se decide, e só lá.
- **Todos os `print` dizem que aconteceu, nunca o quê.** Nada de
  emails, mensagens ou IPs nos logs.
- **O IP nunca é guardado em claro.** `ip_key(request)` devolve uma
  impressão digital HMAC que morre com o processo.
- **A lista de subscritores nunca é servida por HTTP.** Não há endpoint
  que a devolva, nem sequer para a contar.
- **Uma ferramenta do agente nunca lança.** Uma falha é uma frase que
  diz o que correu mal e o que fazer a seguir — o modelo vai ler aquilo.
- **A API não comprime nada em tempo de pedido.** Quem comprime é
  `scripts/precompress.mjs`, no build do Astro, e à qualidade máxima.
  `static_files.py` só lê o `.br` ou o `.gz` que já lá está.
- **Se uma funcionalidade não estiver configurada, responde `503` e o
  site continua.** O contacto volta ao `mailto:`, as Mensagens usam as
  respostas guardadas. Nunca se perde nada.
- **Chamadas bloqueantes (o `yfinance`, sobretudo) correm em
  `asyncio.to_thread`.** Um endpoint `async def` que bloqueia a
  `event loop` trava a API inteira, não só o pedido de quem o fez.
- **O dono não é um papel guardado em lado nenhum** — é
  `sessions.is_owner(email)` a comparar com `OWNER_EMAIL`, a cada
  pedido. Um endpoint só para o dono (`routers/agenda.py`) começa
  sempre por essa verificação, antes de tocar em dados.
- **Um bloqueio ou uma abertura do dono valem para toda a gente.**
  `availability.free_slots` já os inclui por omissão — não é preciso
  (nem se deve) filtrar por `email` para decidir quem os vê.
- **O servidor fala sempre em UTC; o fuso é de quem vê.** Nenhuma rota
  formata uma hora para mostrar a um visitante — devolve o instante ISO
  e deixa o browser decidir. A excepção é o email: o da pessoa usa o
  fuso que ela mandou (`tz`, opcional), o do dono fica sempre em Lisboa.

## Um endpoint que recebe alguma coisa

Pela ordem, e nenhuma se salta:

1. a funcionalidade está ligada? senão `503`
2. `wrong_origin(request, SITE_ORIGIN)` — origem e `content-type`
3. `bump(...)` por visitante **e** global — senão `429`
4. `read_json(request)` — senão `400`
5. a armadilha (`payload.get('company')`) — se vier preenchida, responde
   `200` e não faz nada; o robô não pode perceber que foi apanhado
6. `check_token(...)` — senão `400`
7. só agora se valida o conteúdo

Os números todos vivem em `LIMITS`, em `config.py`. Nenhum número
mágico espalhado pelo código.

## Segredos

`security.py` gera o seu segredo a cada arranque, de propósito:
reiniciar invalida os tokens antigos.

As excepções são os da newsletter e das sessões, que **têm** de
sobreviver a reinícios — uma ligação de confirmação ou uma sessão já
emitidas têm de continuar a valer amanhã. Vivem em `subscribers.py` e
`sessions.py`, vêm de `SUBSCRIBE_SECRET`/`SESSION_SECRET` ou são
gerados e guardados ao lado dos dados, em `DATA_DIR`.

## Testes

`api/tests/`, com `pytest` (`pip install -r api/requirements-dev.txt &&
cd api && pytest`). Não corre aqui — ver `~/CLAUDE.md`, a máquina onde
isto costuma abrir está a servir produção. Corre no CI.

- Lógica pura (`validation`, `security`, `availability`, a assinatura
  de ligações em `subscribers`) tem testes unitários, sem tocar em
  HTTP.
- Os endpoints têm testes de integração com `fastapi.testclient`, com o
  envio de email sempre simulado — nenhum teste manda email a sério ou
  fala com o Yahoo.

## Ao acrescentar uma rota

Ver `/nova-rota`. Em resumo: um ficheiro em `routers/`, incluído em
`main.py`, e o `DEPLOY.md` actualizado se trouxer variáveis de ambiente
novas.
