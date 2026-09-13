import asyncio

from app import chat_store


def test_conversation_id_is_the_email_of_the_session():
    assert chat_store.conversation_id("a@b.com") == "email:a@b.com"


async def test_record_and_read_a_transcript():
    conv = chat_store.conversation_id("a@b.com")
    await chat_store.record_turn(conv, "a@b.com", "user", "Olá", "pt")
    await chat_store.record_turn(conv, "a@b.com", "assistant", "Olá! Como posso ajudar?", "pt")

    turns = chat_store.transcript(conv)
    assert [t["role"] for t in turns] == ["user", "assistant"]
    assert turns[0]["text"] == "Olá"

    # A lista leva o princípio da última mensagem — é o que a app mostra
    # por baixo do nome, sem ter de ir buscar a conversa toda.
    listed = {c["conversation"]: c for c in chat_store.conversations()}
    assert listed[conv]["preview"] == "Olá! Como posso ajudar?"


async def test_conversations_groups_by_conversation_and_counts_turns():
    conv_a = chat_store.conversation_id("a@b.com")
    conv_b = chat_store.conversation_id("c@b.com")
    await chat_store.record_turn(conv_a, "a@b.com", "user", "1", "pt")
    await chat_store.record_turn(conv_a, "a@b.com", "assistant", "2", "pt")
    await chat_store.record_turn(conv_b, "c@b.com", "user", "3", "pt")

    listed = {c["conversation"]: c for c in chat_store.conversations()}
    assert listed[conv_a]["turns"] == 2
    assert listed[conv_b]["turns"] == 1
    assert listed[conv_b]["email"] == "c@b.com"


async def test_conversations_are_sorted_most_recent_first():
    conv_a = chat_store.conversation_id("a@b.com")
    conv_b = chat_store.conversation_id("b@b.com")
    await chat_store.record_turn(conv_a, "a@b.com", "user", "primeiro", "pt")
    await asyncio.sleep(0.005)  # garante instantes diferentes, para a ordem não ser um empate
    await chat_store.record_turn(conv_b, "b@b.com", "user", "segundo", "pt")

    order = [c["conversation"] for c in chat_store.conversations()]
    assert order.index(conv_b) < order.index(conv_a)


def test_transcript_of_an_unknown_conversation_is_empty():
    assert chat_store.transcript("nao-existe") == []
