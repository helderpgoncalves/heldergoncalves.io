from datetime import datetime, timedelta, timezone

from app.availability import describe, free_slots, is_free, meeting_end, resolve_tz

# A configuração por omissão (sem MEETINGS_* no ambiente): segunda a
# sexta, 10:00-12:00 e 15:00-18:00 em Lisboa, reuniões de 30 minutos.
SLOTS_PER_DAY = 4 + 6  # duas janelas: 2h/30min + 3h/30min


def _next_business_day(days_ahead_min: int = 5) -> str:
    """Um dia útil bem para lá do aviso mínimo, para o teste não
    depender de que horas são agora."""
    day = datetime.now(timezone.utc).date() + timedelta(days=days_ahead_min)
    while day.isoweekday() > 5:
        day += timedelta(days=1)
    return day.isoformat()


def test_free_slots_returns_the_expected_count_for_a_business_day():
    day = _next_business_day()
    slots = free_slots(day, day, set())
    assert len(slots) == SLOTS_PER_DAY


def test_free_slots_is_empty_on_a_weekend():
    day = datetime.now(timezone.utc).date() + timedelta(days=5)
    while day.isoweekday() <= 5:
        day += timedelta(days=1)
    slots = free_slots(day.isoformat(), day.isoformat(), set())
    assert slots == []


def test_free_slots_excludes_taken_times():
    day = _next_business_day()
    all_slots = free_slots(day, day, set())
    taken = {all_slots[0]}
    remaining = free_slots(day, day, taken)
    assert all_slots[0] not in remaining
    assert len(remaining) == len(all_slots) - 1


def test_free_slots_respects_the_notice_window():
    tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
    today = datetime.now(timezone.utc).date().isoformat()
    # Um horário daqui a poucas horas nunca aparece — é a regra das 12h de aviso.
    slots = free_slots(today, tomorrow, set())
    now_plus_notice = datetime.now(timezone.utc) + timedelta(hours=12)
    for iso in slots:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        assert dt >= now_plus_notice


def test_is_free_matches_free_slots():
    day = _next_business_day()
    slots = free_slots(day, day, set())
    assert slots
    assert is_free(slots[0], set()) is True
    assert is_free(slots[0], {slots[0]}) is False


def test_is_free_rejects_a_time_outside_any_window():
    day = _next_business_day()
    outside = f"{day}T04:00:00.000Z"
    assert is_free(outside, set()) is False


def test_meeting_end_adds_the_configured_duration():
    start = "2030-01-07T10:00:00.000Z"  # segunda-feira
    assert meeting_end(start) == "2030-01-07T10:30:00.000Z"


def test_describe_is_readable_in_both_languages():
    start = "2030-01-07T10:00:00.000Z"
    pt = describe(start, "pt")
    en = describe(start, "en")
    assert "janeiro" in pt
    assert "January" in en


def test_describe_defaults_to_lisbon_time():
    # 10:00 UTC em Janeiro (sem horário de Verão) são 10:00 em Lisboa.
    assert "10:00" in describe("2030-01-07T10:00:00.000Z", "en")


def test_describe_uses_the_given_timezone_for_the_visitor():
    # 10:00 UTC são 05:00 em Nova Iorque (UTC-5, em Janeiro).
    assert "05:00" in describe("2030-01-07T10:00:00.000Z", "en", tz="America/New_York")


def test_describe_falls_back_to_lisbon_for_an_unknown_timezone():
    lisbon = describe("2030-01-07T10:00:00.000Z", "en")
    unknown = describe("2030-01-07T10:00:00.000Z", "en", tz="Not/A_Real_Zone")
    assert lisbon == unknown


def test_resolve_tz_accepts_a_valid_iana_name():
    assert str(resolve_tz("America/New_York")) == "America/New_York"


def test_resolve_tz_falls_back_without_raising():
    assert str(resolve_tz(None)) == "Europe/Lisbon"
    assert str(resolve_tz("")) == "Europe/Lisbon"
    assert str(resolve_tz("nao-e-um-fuso")) == "Europe/Lisbon"
