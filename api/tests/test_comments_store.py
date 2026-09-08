from app import comments_store


async def test_add_and_list_a_comment():
    row = await comments_store.add_comment("um-escrito", "pt", "Ana", "ana@example.test", "Gostei muito disto.")
    listed = comments_store.for_post("um-escrito", 200)
    assert len(listed) == 1
    assert listed[0]["id"] == row["id"]
    assert listed[0]["name"] == "Ana"
    assert "email" not in listed[0]  # nunca sai por aqui


async def test_comments_are_scoped_to_their_post():
    await comments_store.add_comment("escrito-a", "pt", "Ana", "a@example.test", "Um comentário.")
    await comments_store.add_comment("escrito-b", "pt", "Bruno", "b@example.test", "Outro comentário.")
    assert len(comments_store.for_post("escrito-a", 200)) == 1
    assert len(comments_store.for_post("escrito-b", 200)) == 1


async def test_removing_a_comment_takes_it_off_the_public_list():
    row = await comments_store.add_comment("um-escrito", "pt", "Ana", "ana@example.test", "Gostei muito disto.")
    assert await comments_store.remove_comment(row["id"]) is not None
    assert comments_store.for_post("um-escrito", 200) == []


async def test_removing_twice_fails_the_second_time():
    row = await comments_store.add_comment("um-escrito", "pt", "Ana", "ana@example.test", "Gostei muito disto.")
    assert await comments_store.remove_comment(row["id"]) is not None
    assert await comments_store.remove_comment(row["id"]) is None


async def test_removing_an_unknown_comment_fails():
    assert await comments_store.remove_comment("nao-existe") is None


async def test_for_post_respects_the_limit():
    for i in range(5):
        await comments_store.add_comment("um-escrito", "pt", f"Pessoa {i}", f"p{i}@example.test", f"Comentário {i}")
    assert len(comments_store.for_post("um-escrito", 3)) == 3
