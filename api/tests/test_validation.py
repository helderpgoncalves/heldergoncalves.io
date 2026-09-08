from app.validation import EMAIL_RE, clean, escape_html, one_line


def test_clean_strips_control_characters_and_trims():
    assert clean("  ol\x07á  ", 40) == "olá"


def test_clean_keeps_newlines_and_tabs():
    assert clean("uma\nlinha\tcom tab", 40) == "uma\nlinha\tcom tab"


def test_clean_enforces_max_length():
    assert clean("x" * 50, 10) == "x" * 10


def test_clean_rejects_non_strings():
    assert clean(None, 10) == ""
    assert clean(123, 10) == ""


def test_one_line_collapses_newlines():
    assert one_line("linha um\nlinha dois\r\ntrês", 100) == "linha um linha dois três"


def test_email_re_accepts_valid_addresses():
    for email in ("a@b.co", "helder@heldergoncalves.io", "a.b+c@sub.example.com"):
        assert EMAIL_RE.match(email), email


def test_email_re_rejects_invalid_addresses():
    for email in ("", "sem-arroba", "a@b", "a b@c.com", "a@@b.com"):
        assert not EMAIL_RE.match(email), email


def test_escape_html_escapes_the_five_characters():
    assert escape_html("<a href=\"x\">'&'</a>") == "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"
