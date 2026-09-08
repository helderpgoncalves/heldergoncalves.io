from app import reactions_store


async def test_toggle_turns_a_reaction_on_then_off():
    assert await reactions_store.toggle("um-escrito", "gosto", "fp1") is True
    assert await reactions_store.toggle("um-escrito", "gosto", "fp1") is False


async def test_counts_only_include_active_reactions():
    await reactions_store.toggle("um-escrito", "gosto", "fp1")
    await reactions_store.toggle("um-escrito", "gosto", "fp2")
    await reactions_store.toggle("um-escrito", "gosto", "fp1")  # desliga outra vez

    counts = reactions_store.counts_for("um-escrito")
    assert counts["gosto"] == 1


async def test_counts_are_scoped_per_post_and_include_all_kinds():
    await reactions_store.toggle("escrito-a", "gosto", "fp1")
    counts_a = reactions_store.counts_for("escrito-a")
    counts_b = reactions_store.counts_for("escrito-b")
    assert counts_a["gosto"] == 1
    assert counts_b["gosto"] == 0
    assert set(counts_a.keys()) == set(reactions_store.KINDS)


async def test_mine_for_lists_only_this_fingerprints_active_kinds():
    await reactions_store.toggle("um-escrito", "gosto", "fp1")
    await reactions_store.toggle("um-escrito", "ideia", "fp1")
    await reactions_store.toggle("um-escrito", "gosto", "fp2")

    assert sorted(reactions_store.mine_for("um-escrito", "fp1")) == ["gosto", "ideia"]
    assert reactions_store.mine_for("um-escrito", "fp2") == ["gosto"]
    assert reactions_store.mine_for("um-escrito", "fp3") == []
