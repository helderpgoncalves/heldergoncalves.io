# ─────────────────────────────────────────────────────────────────────
# Quando o Hélder está disponível.
#
# A regra vem da configuração — que dias da semana, que janelas do dia,
# de quantos minutos é cada conversa — e vale no fuso de Lisboa, seja de
# onde for quem marca. Daqui saem os horários livres entre duas datas,
# já sem os que estão marcados, sem os que já passaram e sem os que
# estão demasiado em cima da hora.
#
# `zoneinfo` (biblioteca padrão) trata do fuso e do horário de verão —
# sem bibliotecas de datas, como o resto.
# ─────────────────────────────────────────────────────────────────────
import re
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.availability_store import active_overrides
from app.config import MEETINGS

_DAY_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
_WINDOW_RE = re.compile(r"^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$")


def _parse_days(spec: str) -> set[int]:
    """1 = segunda … 7 = domingo, como `date.isoweekday()`. '0' também
    quer dizer domingo, para bater certo com a convenção do cron."""
    days: set[int] = set()
    for part in spec.split(","):
        m = re.match(r"^([0-7])(?:-([0-7]))?$", part.strip())
        if not m:
            continue
        a = int(m.group(1))
        b = int(m.group(2)) if m.group(2) else a
        for d in range(a, b + 1):
            days.add(7 if d == 0 else d)
    return days


def _parse_windows(spec: str) -> list[tuple[int, int]]:
    out = []
    for part in spec.split(","):
        m = _WINDOW_RE.match(part.strip())
        if m:
            h1, m1, h2, m2 = (int(g) for g in m.groups())
            out.append((h1 * 60 + m1, h2 * 60 + m2))
    return out


_DAYS = _parse_days(MEETINGS.days)
_WINDOWS = _parse_windows(MEETINGS.windows)
_TZ = ZoneInfo(MEETINGS.tz)


def to_iso_millis(dt: datetime) -> str:
    """O mesmo formato do `Date.prototype.toISOString()` do JavaScript."""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def _parse_instant(iso: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None


def _blocked_by(start: datetime, blocks: list[tuple[datetime, datetime]]) -> bool:
    """Este horário cai dentro de algum bloqueio do dono?"""
    return any(block_start <= start < block_end for block_start, block_end in blocks)


def _opening_slots(opening: dict, not_before: datetime, horizon: datetime) -> list[datetime]:
    """Uma abertura fatia-se nos mesmos incrementos de `MEETINGS.minutes`
    que as janelas fixas — é o que a torna reservável como qualquer
    outro horário."""
    start, end = _parse_instant(opening["start"]), _parse_instant(opening["end"])
    if start is None or end is None:
        return []
    step = timedelta(minutes=MEETINGS.minutes)
    out = []
    cursor = start
    while cursor + step <= end and len(out) < 200:  # uma abertura não é uma agenda inteira
        if not_before <= cursor <= horizon:
            out.append(cursor)
        cursor += step
    return out


def free_slots(from_day: str, to_day: str, taken: set[str], overrides: Optional[list[dict]] = None) -> list[str]:
    """Os horários livres entre dois dias (inclusive), como instantes ISO.

    from_day, to_day: 'YYYY-MM-DD'
    taken: os inícios já marcados, em ISO
    overrides: os bloqueios e aberturas do dono; por omissão, os que
        estiverem activos neste momento (ver `availability_store.py`)
    """
    a, b = _DAY_RE.match(from_day), _DAY_RE.match(to_day)
    if not a or not b:
        return []
    now = datetime.now(timezone.utc)
    not_before = now + timedelta(hours=MEETINGS.notice_hours)
    horizon = now + timedelta(days=MEETINGS.horizon_days)

    overrides = active_overrides() if overrides is None else overrides
    blocks: list[tuple[datetime, datetime]] = []
    for o in overrides:
        if o["kind"] != "bloqueio":
            continue
        block_start, block_end = _parse_instant(o["start"]), _parse_instant(o["end"])
        if block_start is not None and block_end is not None:
            blocks.append((block_start, block_end))

    cursor = date(int(a.group(1)), int(a.group(2)), int(a.group(3)))
    last = date(int(b.group(1)), int(b.group(2)), int(b.group(3)))

    out: list[str] = []
    day_count = 0
    while cursor <= last and day_count < 70:
        day_count += 1
        if cursor.isoweekday() in _DAYS:
            for window_start, window_end in _WINDOWS:
                t = window_start
                while t + MEETINGS.minutes <= window_end:
                    hour, minute = divmod(t, 60)
                    start = datetime(cursor.year, cursor.month, cursor.day, hour, minute, tzinfo=_TZ)
                    if not_before <= start <= horizon and not _blocked_by(start, blocks):
                        iso = to_iso_millis(start)
                        if iso not in taken:
                            out.append(iso)
                    t += MEETINGS.minutes
        cursor += timedelta(days=1)

    # As aberturas do dono, dentro do intervalo pedido — um bloqueio
    # ganha sempre a uma abertura que caia por cima, de propósito: é
    # mais fácil de prever do que quem escreveu por último ganhar.
    first_day, last_day = date(int(a.group(1)), int(a.group(2)), int(a.group(3))), date(int(b.group(1)), int(b.group(2)), int(b.group(3)))
    for opening in overrides:
        if opening["kind"] != "abertura":
            continue
        for start in _opening_slots(opening, not_before, horizon):
            if not (first_day <= start.astimezone(_TZ).date() <= last_day):
                continue
            if _blocked_by(start, blocks):
                continue
            iso = to_iso_millis(start)
            if iso not in taken and iso not in out:
                out.append(iso)

    return sorted(out)


def is_free(start_iso: str, taken: set[str]) -> bool:
    """Este início é mesmo um horário nosso, e está livre?"""
    try:
        dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    except ValueError:
        return False
    local = dt.astimezone(_TZ)
    day = local.date().isoformat()
    return to_iso_millis(dt) in free_slots(day, day, taken)


def meeting_end(start_iso: str) -> str:
    dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    return to_iso_millis(dt + timedelta(minutes=MEETINGS.minutes))


_WEEKDAYS_PT = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
_MONTHS_PT = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]


def resolve_tz(tz: Optional[str]) -> ZoneInfo:
    """Um fuso IANA à escolha — o de Lisboa se não vier nenhum, ou se vier
    um que a base de fusos não conheça (nunca se lança por causa disto)."""
    if not tz:
        return _TZ
    try:
        return ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        return _TZ


def describe(start_iso: str, lang: str, tz: Optional[str] = None) -> str:
    """A hora, escrita para o email — no fuso de Lisboa por omissão, ou no
    fuso de quem marcou, se for esse o pedido (ver `resolve_tz`)."""
    dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00")).astimezone(resolve_tz(tz))
    if lang == "en":
        return dt.strftime("%A, %-d %B %Y, %H:%M %Z")
    weekday = _WEEKDAYS_PT[dt.isoweekday() - 1]
    month = _MONTHS_PT[dt.month - 1]
    return f"{weekday}, {dt.day} de {month} de {dt.year}, {dt.strftime('%H:%M %Z')}"
