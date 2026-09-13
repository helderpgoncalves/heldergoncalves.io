# ─────────────────────────────────────────────────────────────────────
# As Finanças — a área do dono, e só dele.
#
#   GET  /api/financas                     tudo: clientes, projetos, fases, avenças, faturas, taxas
#   GET  /api/financas/resumo?ano=AAAA     o ano com as contas feitas
#   POST /api/financas/guardar/{tipo}      cria ou altera uma peça
#   POST /api/financas/remover/{tipo}      remove uma peça, e o que pende dela
#   POST /api/financas/taxas               corrige as taxas por cima das de config.py
#   POST /api/financas/partilhar           liga ou desliga a fatura na pasta do cliente
#
# **Todas as rotas começam por `require_owner`.** Um visitante nunca vê
# que isto existe: sem sessão de dono não há resposta nenhuma, nem uma
# lista vazia. Ver `owner_guard.py`.
#
# Sem armadilha (`company`) nem token de formulário, pela mesma razão de
# `routers/ficheiros.py` e `routers/escritos.py`: estes endpoints exigem
# uma sessão verdadeira do dono, e um robô não a tem. Ficam os portões
# de origem e de limites, pela ordem de `.claude/rules/api.md`.
#
# **Nenhum `print` diz o quê.** Nem nomes de clientes, nem valores, nem
# números de fatura — isto é o dinheiro de uma pessoa, e os logs são
# lidos por quem estiver a ver a consola.
# ─────────────────────────────────────────────────────────────────────
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app import financas_partilha as partilha
from app import financas_store as loja
from app.config import FINANCAS, LIMITS, SITE_ORIGIN
from app.financas_calc import irs_estimado, previsao, resumo_ano, seguranca_social, trimestre_de
from app.financas_campos import valida, valida_taxas
from app.financas_store import TIPOS
from app.http import read_json
from app.owner_guard import require_owner
from app.security import bump, ip_key, wrong_origin
from app.validation import one_line

router = APIRouter()


def _ler(request: Request):
    """O portão de leitura: dono, e dentro do limite."""
    _, error = require_owner(request)
    if error:
        return error
    if not bump("financas:" + ip_key(request), LIMITS.financas_window, LIMITS.financas_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    return None


def _escrever(request: Request):
    """O portão de escrita, pela ordem dos portões: dono, origem, e
    limite próprio — escrever é mais raro do que ler, e custa mais."""
    _, error = require_owner(request)
    if error:
        return error
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)
    if not bump("financas-escrita:" + ip_key(request), LIMITS.financas_escrita_window, LIMITS.financas_escrita_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)
    return None


# ── Ler ──────────────────────────────────────────────────────────────
@router.get("/api/financas")
async def tudo(request: Request) -> JSONResponse:
    error = _ler(request)
    if error:
        return error
    return JSONResponse({"ok": True, "moeda": FINANCAS.moeda, "taxas": loja.taxas(), **loja.tudo()})


@router.get("/api/financas/resumo")
async def resumo(request: Request) -> JSONResponse:
    """O ano com as contas feitas — e cada uma diz de onde veio.

    A ordem da resposta é a da pergunta que o Hélder faz ao abrir isto:
    o que já faturei, o que falta faturar, e o que disso não é meu."""
    error = _ler(request)
    if error:
        return error

    hoje = datetime.now(timezone.utc)
    try:
        ano = int(one_line(request.query_params.get("ano"), 4) or hoje.year)
    except ValueError:
        return JSONResponse({"ok": False, "error": "ano"}, status_code=400)
    if not 2000 <= ano <= 2100:
        return JSONResponse({"ok": False, "error": "ano"}, status_code=400)

    taxas = loja.taxas()
    faturas = loja.ativos("fatura")
    ano_feito = resumo_ano(faturas, ano, taxas, int(taxas.get("objetivo") or 0))
    # A previsão conta a partir do mês corrente quando o ano é o de
    # agora, e do princípio quando se olha para um ano futuro.
    desde = hoje.month if ano == hoje.year else 1
    trimestre = trimestre_de(hoje.month) if ano == hoje.year else 4

    return JSONResponse(
        {
            "ok": True,
            "moeda": FINANCAS.moeda,
            "hoje": hoje.date().isoformat(),
            "resumo": ano_feito,
            "previsao": previsao(loja.ativos("avenca"), loja.ativos("fase"), ano, desde),
            "seguranca_social": seguranca_social(faturas, ano, trimestre, taxas),
            "irs": irs_estimado(ano_feito["faturado"], ano_feito["retido"]["valor"], taxas),
            "taxas": taxas,
            # Não é uma opinião do cliente: é o servidor a dizer que tudo
            # o que vai acima é estimativa de gestão, e não contabilidade.
            "estimativa": True,
        }
    )


# ── Escrever ─────────────────────────────────────────────────────────
@router.post("/api/financas/guardar/{tipo}")
async def guardar(request: Request, tipo: str) -> JSONResponse:
    error = _escrever(request)
    if error:
        return error
    if tipo not in TIPOS:
        return JSONResponse({"ok": False, "error": "tipo"}, status_code=404)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    campos, erro = valida(tipo, payload, loja.taxas())
    if erro or campos is None:
        return JSONResponse({"ok": False, "error": erro or "dados"}, status_code=400)

    row_id = one_line(payload.get("id"), 40)
    if not row_id and len(loja.ativos(tipo)) >= LIMITS.financas_linhas:
        return JSONResponse({"ok": False, "error": "cheio"}, status_code=409)

    linha = await loja.guardar(tipo, campos, row_id or None)
    if linha is None:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    print(f"[finanças] {tipo} {'alterado' if row_id else 'criado'} pelo dono")
    return JSONResponse({"ok": True, "linha": linha})


@router.post("/api/financas/remover/{tipo}")
async def remover(request: Request, tipo: str) -> JSONResponse:
    """Remover leva o que pende — um cliente leva os projetos, as
    avenças e as faturas dele. Uma fatura partilhada sai também da pasta
    do cliente: o registo desaparece daqui, e o acesso desaparece lá."""
    error = _escrever(request)
    if error:
        return error
    if tipo not in TIPOS:
        return JSONResponse({"ok": False, "error": "tipo"}, status_code=404)

    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    row_id = one_line(payload.get("id"), 40)
    alvo = loja.um(tipo, row_id)
    if not alvo:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)

    for fatura in _faturas_sob(tipo, row_id):
        await partilha.deixar_de_partilhar(str(fatura.get("ficheiro") or ""))

    quantos = await loja.remover_em_cascata(tipo, row_id)
    print(f"[finanças] {tipo} removido pelo dono, {quantos} linhas ao todo")
    return JSONResponse({"ok": True, "removidas": quantos})


def _faturas_sob(tipo: str, row_id: str) -> list[dict]:
    """As faturas partilhadas que caem com esta peça. Sem isto, remover
    um cliente deixava o PDF dele na pasta partilhada — um acesso vivo a
    um registo que já não existe."""
    faturas = loja.ativos("fatura")
    if tipo == "fatura":
        return [f for f in faturas if f["id"] == row_id]
    if tipo == "cliente":
        return [f for f in faturas if f.get("cliente") == row_id]
    if tipo == "projeto":
        return [f for f in faturas if f.get("projeto") == row_id]
    if tipo == "avenca":
        return [f for f in faturas if f.get("avenca") == row_id]
    return []


@router.post("/api/financas/taxas")
async def taxas(request: Request) -> JSONResponse:
    """As taxas que o dono corrige por cima das de `config.py`. Mudam de
    ano para ano — é para isso que isto existe, e é por isso que nenhuma
    delas está escrita dentro de uma função."""
    error = _escrever(request)
    if error:
        return error
    payload = await read_json(request)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)
    campos, erro = valida_taxas(payload)
    if erro:
        return JSONResponse({"ok": False, "error": erro}, status_code=400)
    return JSONResponse({"ok": True, "taxas": await loja.guardar_taxas(campos)})


# ── A fatura que vai ao Finder do cliente ────────────────────────────
@router.post("/api/financas/partilhar")
async def partilhar(request: Request) -> JSONResponse:
    """Liga ou desliga a partilha de uma fatura.

    A ligar, o PDF verdadeiro — o que saiu do Portal das Finanças — vai
    para a pasta «Faturas» do cliente, na app Ficheiros. A desligar, sai
    de lá; o registo da fatura fica, porque o que se desfaz é o acesso,
    não a contabilidade. Ver `financas_partilha.py`."""
    dono, error = require_owner(request)
    if error:
        return error
    bad = wrong_origin(request, SITE_ORIGIN)
    if bad:
        return JSONResponse({"ok": False, "error": bad}, status_code=403 if bad == "origem" else 415)
    chave = ip_key(request)
    if not bump("financas-pdf:" + chave, LIMITS.ficheiro_upload_window, LIMITS.ficheiro_upload_per_ip):
        return JSONResponse({"ok": False, "error": "limite"}, status_code=429)

    # O corpo leva um PDF em base64 — o tecto é o das Ficheiros, não o
    # de um corpo normal.
    payload = await read_json(request, cap=LIMITS.ficheiro_max * 4 // 3 + 8192)
    if payload is None:
        return JSONResponse({"ok": False, "error": "corpo"}, status_code=400)

    fatura = loja.um("fatura", one_line(payload.get("id"), 40))
    if not fatura:
        return JSONResponse({"ok": False, "error": "inexistente"}, status_code=404)
    anterior = str(fatura.get("ficheiro") or "")

    if not payload.get("ligar"):
        await partilha.deixar_de_partilhar(anterior)
        linha = await loja.guardar("fatura", {"ficheiro": "", "partilhada": False}, fatura["id"])
        print("[finanças] partilha de fatura desligada pelo dono")
        return JSONResponse({"ok": True, "linha": linha})

    cliente = loja.um("cliente", str(fatura.get("cliente") or ""))
    email = str((cliente or {}).get("email") or "")
    if not email:
        # Sem email não há pasta a que a fatura pertença. Dizê-lo é
        # melhor do que partilhar para o sítio errado.
        return JSONResponse({"ok": False, "error": "email"}, status_code=400)

    dados = partilha.descodificar(payload.get("pdf"))
    if not dados or not partilha.e_pdf(dados):
        # Só PDF, e só PDF a sério: a app não gera faturas, e o que vai
        # para a pasta do cliente é o documento das Finanças.
        return JSONResponse({"ok": False, "error": "pdf"}, status_code=400)

    # Substituir é tirar o anterior primeiro: dois PDF da mesma fatura na
    # mesma pasta era a dúvida que isto existe para não criar.
    await partilha.deixar_de_partilhar(anterior)
    nome = partilha.nome_do_ficheiro(str(fatura.get("numero") or ""), str(fatura.get("data") or ""))
    # Quem lá pôs o ficheiro foi o dono, não o cliente — é o que as
    # Ficheiros mostram por baixo do nome, e tem de dizer a verdade.
    guardado = await partilha.partilhar(email, nome, dados, dono or "")
    if not guardado:
        return JSONResponse({"ok": False, "error": "cheio"}, status_code=409)

    linha = await loja.guardar("fatura", {"ficheiro": guardado["id"], "partilhada": True}, fatura["id"])
    print("[finanças] fatura partilhada com o cliente pelo dono")
    return JSONResponse({"ok": True, "linha": linha, "ficheiro": guardado})
