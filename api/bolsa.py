# ─────────────────────────────────────────────────────────────────────
# O que a Bolsa sabe: cotações, séries, ficha e notícias de cada título.
#
# Tudo vem do Yahoo Finance pelo yfinance, sem chave nenhuma. Nada do
# que ele devolve passa inteiro: cada função aqui escolhe os campos que
# a aplicação usa, arredonda, e devolve JSON simples. O yfinance muda
# de forma de versão para versão — por isso cada leitura é defensiva:
# um campo que falte é um `None`, nunca um erro que deite a resposta
# abaixo.
# ─────────────────────────────────────────────────────────────────────
import logging
import math
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Optional

import yfinance as yf

from cache import remember

# O yfinance é falador quando o Yahoo falha; o que interessa já vem no JSON.
logging.getLogger("yfinance").setLevel(logging.CRITICAL)

# Os intervalos que a aplicação mostra — os mesmos da Bolsa da Apple —
# e como se pedem: período e granularidade.
RANGES: dict[str, tuple[str, str]] = {
    "1d": ("1d", "5m"),
    "1w": ("5d", "30m"),
    "1m": ("1mo", "1h"),
    "3m": ("3mo", "1d"),
    "6m": ("6mo", "1d"),
    "ytd": ("ytd", "1d"),
    "1y": ("1y", "1d"),
    "2y": ("2y", "1wk"),
    "5y": ("5y", "1wk"),
    "all": ("max", "1mo"),
}

# Quanto tempo cada resposta vale. A cotação muda ao minuto; a ficha e
# as notícias, não.
TTL_QUOTE = 60
TTL_CHART = 120
TTL_DETAILS = 600
TTL_SEARCH = 3600


# ── Leituras defensivas ──────────────────────────────────────────────
def num(value: Any, digits: int = 4) -> Optional[float]:
    """Um número ou nada — nunca NaN, nunca uma string."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(v) or math.isinf(v):
        return None
    return round(v, digits)


def text(value: Any, limit: int) -> str:
    return str(value).strip()[:limit] if value is not None else ""


def first(*values: Any) -> Any:
    for v in values:
        if v is not None:
            return v
    return None


def safe(fn, fallback=None):
    """Chama, e se rebentar devolve o recuo: o yfinance falha por dentro."""
    try:
        return fn()
    except Exception:
        return fallback


def fast(ticker: yf.Ticker, *keys: str) -> Optional[float]:
    """Um valor do `fast_info`, por qualquer dos nomes que já teve."""
    fi = safe(lambda: ticker.fast_info)
    if fi is None:
        return None
    for key in keys:
        value = safe(lambda: fi[key])
        if value is None:
            value = safe(lambda: getattr(fi, key))
        if value is not None:
            return num(value)
    return None


def points(frame) -> list[list[float]]:
    """A série como pares [instante, fecho], sem os buracos."""
    out: list[list[float]] = []
    if frame is None or getattr(frame, "empty", True) or "Close" not in frame:
        return out
    for stamp, close in zip(frame.index, frame["Close"]):
        value = num(close)
        if value is None:
            continue
        try:
            at = int(stamp.timestamp())
        except Exception:
            continue
        out.append([at, value])
    return out


def session_of(meta: dict) -> Optional[list[int]]:
    """Início e fim da sessão regular de hoje, em segundos."""
    regular = ((meta.get("currentTradingPeriod") or {}).get("regular")) or {}
    start, end = regular.get("start"), regular.get("end")
    if isinstance(start, (int, float)) and isinstance(end, (int, float)) and end > start:
        return [int(start), int(end)]
    return None


# ── Cotação ──────────────────────────────────────────────────────────
def _quote(symbol: str) -> Optional[dict]:
    ticker = yf.Ticker(symbol)
    period, interval = RANGES["1d"]
    frame = safe(lambda: ticker.history(period=period, interval=interval, prepost=False, auto_adjust=False))
    meta = safe(lambda: ticker.history_metadata, {}) or {}
    series = points(frame)
    price = first(num(meta.get("regularMarketPrice")), series[-1][1] if series else None)
    if price is None:
        return None
    previous = first(num(meta.get("chartPreviousClose")), num(meta.get("previousClose")))
    session = session_of(meta)
    now = time.time()
    market = "REGULAR" if session and session[0] <= now < session[1] else "CLOSED"
    change = round(price - previous, 4) if previous is not None else None
    percent = round((price - previous) / previous * 100, 2) if previous else None
    return {
        "symbol": symbol,
        "name": text(first(meta.get("shortName"), meta.get("longName"), symbol), 60),
        "currency": text(meta.get("currency"), 8),
        "exchange": text(first(meta.get("fullExchangeName"), meta.get("exchangeName")), 40),
        "type": text(meta.get("instrumentType"), 16).upper(),
        "price": price,
        "previous": previous,
        "change": change,
        "percent": percent,
        "market": market,
        "session": session,
        "marketCap": fast(ticker, "marketCap", "market_cap"),
        "at": series[-1][0] if series else int(now),
        "points": series,
    }


def quote(symbol: str) -> Optional[dict]:
    return remember("q:" + symbol, TTL_QUOTE, lambda: _quote(symbol))


def quotes_for(symbols: list[str]) -> list[dict]:
    """Várias cotações de uma vez, em paralelo; as que falham ficam de fora."""
    if not symbols:
        return []
    with ThreadPoolExecutor(max_workers=min(6, len(symbols))) as pool:
        results = list(pool.map(lambda s: safe(lambda: quote(s)), symbols))
    return [q for q in results if q]


# ── Série ────────────────────────────────────────────────────────────
def _chart(symbol: str, key: str) -> Optional[dict]:
    if key == "1d":
        q = quote(symbol)
        return {"symbol": symbol, "range": key, "points": q["points"], "previous": q["previous"], "session": q["session"]} if q else None
    period, interval = RANGES[key]
    ticker = yf.Ticker(symbol)
    frame = safe(lambda: ticker.history(period=period, interval=interval, prepost=False, auto_adjust=False))
    series = points(frame)
    if not series:
        return None
    return {"symbol": symbol, "range": key, "points": series, "previous": None, "session": None}


def chart_for(symbol: str, key: str) -> Optional[dict]:
    key = key if key in RANGES else "1d"
    return remember("c:" + symbol + ":" + key, TTL_QUOTE if key == "1d" else TTL_CHART, lambda: _chart(symbol, key))


# ── Ficha e notícias ─────────────────────────────────────────────────
def _when(value: Any) -> Optional[int]:
    """Um instante em segundos, venha ele como número ou como ISO 8601."""
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str) and value:
        try:
            return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())
        except ValueError:
            return None
    return None


def _thumb(node: Any) -> str:
    sizes = (node or {}).get("resolutions") if isinstance(node, dict) else None
    if not sizes:
        return ""
    url = text((sizes[-1] or {}).get("url"), 400)
    return url if url.startswith("https://") else ""


def _news_item(item: dict) -> Optional[dict]:
    """As notícias já vieram em duas formas; esta função lê as duas."""
    content = item.get("content") if isinstance(item.get("content"), dict) else None
    if content:
        url = first((content.get("canonicalUrl") or {}).get("url"), (content.get("clickThroughUrl") or {}).get("url"))
        out = {
            "title": text(content.get("title"), 200),
            "provider": text((content.get("provider") or {}).get("displayName"), 60),
            "url": text(url, 400),
            "at": _when(first(content.get("pubDate"), content.get("displayTime"))),
            "thumb": _thumb(content.get("thumbnail")),
            "summary": text(content.get("summary"), 240),
        }
    else:
        out = {
            "title": text(item.get("title"), 200),
            "provider": text(item.get("publisher"), 60),
            "url": text(item.get("link"), 400),
            "at": _when(item.get("providerPublishTime")),
            "thumb": _thumb(item.get("thumbnail")),
            "summary": "",
        }
    if not out["title"] or not out["url"].startswith("https://"):
        return None
    return out


def _yield(info: dict) -> Optional[float]:
    """Em percentagem. O Yahoo já deu isto como fracção e como percentagem."""
    trailing = num(info.get("trailingAnnualDividendYield"), 6)
    if trailing is not None:
        return round(trailing * 100, 2)
    for key in ("dividendYield", "yield"):
        value = num(info.get(key), 6)
        if value is not None:
            return round(value * 100, 2) if value < 1 else round(value, 2)
    return None


def _details(symbol: str) -> Optional[dict]:
    ticker = yf.Ticker(symbol)
    info = safe(lambda: ticker.info, {}) or {}
    q = quote(symbol)
    if not q and not info:
        return None
    stats = {
        "open": first(num(info.get("open")), num(info.get("regularMarketOpen")), fast(ticker, "open")),
        "high": first(num(info.get("dayHigh")), num(info.get("regularMarketDayHigh")), fast(ticker, "dayHigh", "day_high")),
        "low": first(num(info.get("dayLow")), num(info.get("regularMarketDayLow")), fast(ticker, "dayLow", "day_low")),
        "volume": first(num(info.get("volume"), 0), num(info.get("regularMarketVolume"), 0), fast(ticker, "lastVolume", "last_volume")),
        "avgVolume": first(num(info.get("averageVolume"), 0), fast(ticker, "threeMonthAverageVolume", "three_month_average_volume")),
        "marketCap": first(num(info.get("marketCap"), 0), num(info.get("totalAssets"), 0), fast(ticker, "marketCap", "market_cap")),
        "pe": num(info.get("trailingPE"), 2),
        "eps": num(info.get("trailingEps"), 2),
        "yield": _yield(info),
        "beta": first(num(info.get("beta"), 2), num(info.get("beta3Year"), 2)),
        "high52": first(num(info.get("fiftyTwoWeekHigh")), fast(ticker, "yearHigh", "year_high")),
        "low52": first(num(info.get("fiftyTwoWeekLow")), fast(ticker, "yearLow", "year_low")),
    }
    profile = {
        "name": text(first(info.get("longName"), info.get("shortName"), q["name"] if q else symbol), 80),
        "sector": text(first(info.get("sector"), info.get("category")), 60),
        "industry": text(first(info.get("industry"), info.get("fundFamily")), 60),
        "summary": text(info.get("longBusinessSummary"), 700),
        "website": text(info.get("website"), 200) if str(info.get("website", "")).startswith("https://") else "",
        "type": text(first(info.get("quoteType"), q["type"] if q else ""), 16).upper(),
    }
    raw = safe(lambda: ticker.news, []) or []
    news = [n for n in (_news_item(i) for i in raw if isinstance(i, dict)) if n][:8]
    return {"symbol": symbol, "stats": stats, "profile": profile, "news": news}


def details_for(symbol: str) -> Optional[dict]:
    return remember("d:" + symbol, TTL_DETAILS, lambda: _details(symbol))


# ── Procura ──────────────────────────────────────────────────────────
def _search(query: str) -> list[dict]:
    found = safe(lambda: yf.Search(query, max_results=8, news_count=0).quotes, []) or []
    out = []
    for item in found:
        if not isinstance(item, dict) or not item.get("symbol"):
            continue
        out.append(
            {
                "symbol": text(item.get("symbol"), 12).upper(),
                "name": text(first(item.get("shortname"), item.get("longname"), item.get("name")), 60),
                "exchange": text(first(item.get("exchDisp"), item.get("exchange")), 30),
                "type": text(first(item.get("typeDisp"), item.get("quoteType")), 16),
            }
        )
    return out[:8]


def search_for(query: str) -> list[dict]:
    key = query.strip().lower()
    return remember("s:" + key, TTL_SEARCH, lambda: _search(key)) if key else []
