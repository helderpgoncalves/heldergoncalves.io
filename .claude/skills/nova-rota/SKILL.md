---
name: nova-rota
description: Acrescenta um endpoint novo à API, com os portões de segurança pela ordem certa. Usa quando alguém pedir uma API nova, um formulário que envie alguma coisa, um webhook, ou qualquer coisa em /api/.
disable-model-invocation: true
argument-hint: [nome-da-rota]
arguments: [nome]
---

# Rota nova: `$nome`

## 1. O ficheiro — `api/app/routers/$nome.py`

Um assunto por ficheiro. O que já existe reutiliza-se; nada se copia.

```python
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.config import LIMITS, MAIL_READY, SITE_ORIGIN
from app.http import read_json
from app.security import bump, check_token, ip_key, wrong_origin
from app.validation import clean

router = APIRouter()


@router.post("/api/$nome")
async def $nome(request: Request) -> JSONResponse:
    ...
```

## 2. Os portões, por esta ordem

Se a rota **recebe** alguma coisa, os sete passos fazem-se todos e por
esta ordem. Saltar um é abrir um buraco:

```python
if not pronto:
    return JSONResponse({"ok": False, "error": "indisponivel"}, status_code=503)

bad = wrong_origin(request, SITE_ORIGIN)
if bad:
    return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)

key = ip_key(request)
if not bump(f"$nome:{key}", LIMITS.x_per_ip_window, LIMITS.x_per_ip):
    return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
if not bump("$nome:global", LIMITS.x_global_window, LIMITS.x_global):
    return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

payload = await read_json(request)
if payload is None:
    return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

# A armadilha: responde ok e não faz nada. O robô não pode perceber.
if clean(payload.get("company"), 200):
    return JSONResponse({"ok": True})

token_error = check_token(payload.get("token"), key)
if token_error:
    return JSONResponse({"ok": False, "error": token_error}, status_code=400)

# só agora se valida o conteúdo
```

Se a rota só **devolve** coisas, bastam a prontidão e os limites.

Uma chamada bloqueante (outra API, uma biblioteca síncrona como o
`yfinance`) corre em `asyncio.to_thread(...)` — nunca directamente num
`async def`, ou trava a API inteira enquanto espera.

## 3. Os números — `api/app/config.py`

Todos os limites novos vão para `Limits`, com nome. **Nenhum número
mágico no ficheiro da rota.** Variáveis de ambiente novas também: é o
único ficheiro que lê `os.environ`.

## 4. Incluir o router — `api/app/main.py`

Uma linha na lista que passa por `app.include_router(...)`, e mais
nada. Nenhuma lógica no `main.py`. Ele é o mapa.

## 5. O cliente

Se houver formulário, o token vem de `lib/session.js` — **um por
envio**, porque a API só aceita cada um uma vez. E a armadilha precisa
de existir no HTML: um campo escondido com `.sr`, `tabindex="-1"` e
`aria-hidden="true"`.

## 6. Os testes — `api/tests/`

Lógica pura ganha um teste unitário. Um endpoint que fala com o
exterior (email, um webhook) ganha um teste de integração com
`fastapi.testclient` e o envio simulado — nunca uma chamada a sério.

## 7. O DEPLOY.md

Se trouxe variáveis de ambiente, um volume, ou um limite que interesse a
quem opera, documenta-o lá. Uma rota que só existe no código é uma rota
que ninguém sabe configurar.

## Regras que não se dobram

- **Dependências mínimas e justificadas.** Se resolve com a biblioteca
  padrão do Python, resolve-se com ela.
- **Tudo o que vem de fora passa por `clean` ou `one_line`.**
- **Os `print` dizem que aconteceu, nunca o quê.** Nada de emails,
  mensagens ou IPs.
- **Sem configuração, responde `503` e o site continua a funcionar.**

## No fim

`cd api && pytest` — não nesta máquina (ver `~/CLAUDE.md`); corre no CI
a cada push.
