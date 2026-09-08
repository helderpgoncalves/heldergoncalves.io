import asyncio

from app import chat_store


def test_conversation_id_prefers_the_email():
    assert chat_store.conversation_id("a@b.com", "fingerprint") == "email:a@b.com"
    assert chat_store.conversation_id(None, "fingerprint") == "visitante:fingerprint"


async def test_record_and_read_a_transcript():
    conv = chat_store.conversation_id("a@b.com", "x")
    await chat_store.record_turn(conv, "a@b.com", "user", "Olá", "pt")
    await chat_store.record_turn(conv, "a@b.com", "assistant", "Olá! Como posso ajudar?", "pt")

    turns = chat_store.transcript(conv)
    assert [t["role"] for t in turns] == ["user", "assistant"]
    assert turns[0]["text"] == "Olá"


async def test_conversations_groups_by_conversation_and_counts_turns():
    conv_a = chat_store.conversation_id("a@b.com", "x")
    conv_b = chat_store.conversation_id(None, "y")
    await chat_store.record_turn(conv_a, "a@b.com", "user", "1", "pt")
    await chat_store.record_turn(conv_a, "a@b.com", "assistant", "2", "pt")
    await chat_store.record_turn(conv_b, None, "user", "3", "pt")

    listed = {c["conversation"]: c for c in chat_store.conversations()}
    assert listed[conv_a]["turns"] == 2
    assert listed[conv_b]["turns"] == 1
    assert listed[conv_b]["email"] is None


async def test_conversations_are_sorted_most_recent_first():
    conv_a = chat_store.conversation_id("a@b.com", "x")
    conv_b = chat_store.conversation_id("b@b.com", "y")
    await chat_store.record_turn(conv_a, "a@b.com", "user", "primeiro", "pt")
    await asyncio.sleep(0.005)  # garante instantes diferentes, para a ordem não ser um empate
    await chat_store.record_turn(conv_b, "b@b.com", "user", "segundo", "pt")

    order = [c["conversation"] for c in chat_store.conversations()]
    assert order.index(conv_b) < order.index(conv_a)


def test_transcript_of_an_unknown_conversation_is_empty():
    assert chat_store.transcript("nao-existe") == []
