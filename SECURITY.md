# Security

## Reporting a vulnerability

Email **helder@heldergoncalves.io**. Please don't open a public issue for
anything exploitable.

Tell me what you found, how to reproduce it, and what it lets someone do.
I'll acknowledge within 72 hours and tell you what I'm doing about it.

## What is worth looking at

The static site is not the interesting part. The server is
([`server/`](server/)): it takes form submissions, sends email, talks to
a language model, keeps a subscriber list, and exposes an MCP endpoint.

Things I'd want to know about:

- a way past the origin, token, honeypot or rate-limit gates on
  `/api/contact`, `/api/subscribe` or `/api/chat`;
- a way to read or enumerate the subscriber list, or to subscribe
  someone without their confirmation;
- a path traversal or a way to serve a file outside `dist/`;
- a prompt injection that makes the assistant send email, book a meeting,
  or reveal its instructions;
- anything that makes an unauthenticated request cost real money.

## What is already accounted for

Not bugs, by design:

- **No authentication anywhere.** There are no accounts. There is nothing
  to log into.
- **The site tells you what it is.** `/llms.txt`, `/posts.json` and `/mcp`
  publish the content on purpose.
- **Rate limits are per-IP-fingerprint and in memory.** A restart clears
  them, and a distributed source gets a limit each. Both are known
  trade-offs against storing anything about visitors.
- **The assistant can be asked to say things.** It is told to refuse, but
  it is a language model. What matters is what it can *do* — and its
  three tools are search, book, and send-a-message, each behind the same
  limits as the forms.

## Scope

This repository and `heldergoncalves.io`. Third-party infrastructure
(the host, the email provider, the model provider) belongs to them.

No bounty — this is a personal site. Credit in the fix commit if you want
it.
