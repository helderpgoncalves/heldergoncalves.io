from datetime import datetime, timedelta, timezone

import pytest

from app import availability_store
from app.availability import free_slots


@pytest.fixture(autouse=True)
async def _init():
    await availability_store.init_availability_store()


def _next_business_day(days_ahead_min: int = 5) -> str:
    day = datetime.now(timezone.utc).date() + timedelta(days=days_ahead_min)
    while day.isoweekday() > 5:
        day += timedelta(days=1)
    return day.isoformat()


async def test_add_and_list_override():
    row = await availability_store.add_override("bloqueio", "2030-01-07T09:00:00.000Z", "2030-01-07T12:00:00.000Z", "férias")
    assert row["kind"] == "bloqueio"
    assert row in availability_store.active_overrides()


async def test_remove_override_takes_it_out_of_the_active_list():
    row = await availability_store.add_override("abertura", "2030-01-07T09:00:00.000Z", "2030-01-07T12:00:00.000Z", "")
    assert await availability_store.remove_override(row["id"]) is not None
    assert row["id"] not in [o["id"] for o in availability_store.active_overrides()]


async def test_removing_an_unknown_override_fails():
    assert await availability_store.remove_override("nao-existe") is None


async def test_a_block_removes_an_otherwise_free_slot():
    day = _next_business_day()
    baseline = free_slots(day, day, set())
    assert baseline

    first = baseline[0]
    dt = datetime.fromisoformat(first.replace("Z", "+00:00"))
    block_end = (dt + timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    await availability_store.add_override("bloqueio", first, block_end, "indisponível")

    after = free_slots(day, day, set())
    assert first not in after
    assert len(after) == len(baseline) - 1


async def test_an_opening_adds_a_slot_outside_the_usual_windows():
    day = _next_business_day()
    # 04:00 UTC cai fora das janelas por omissão (10-12, 15-18 em Lisboa).
    outside_start = f"{day}T04:00:00.000Z"
    outside_end = f"{day}T04:30:00.000Z"
    baseline = free_slots(day, day, set())
    assert outside_start not in baseline

    await availability_store.add_override("abertura", outside_start, outside_end, "excepção")
    after = free_slots(day, day, set())
    assert outside_start in after


async def test_a_block_wins_over_an_opening_at_the_same_time():
    day = _next_business_day()
    start = f"{day}T04:00:00.000Z"
    end = f"{day}T04:30:00.000Z"
    await availability_store.add_override("abertura", start, end, "")
    await availability_store.add_override("bloqueio", start, end, "")
    assert start not in free_slots(day, day, set())
