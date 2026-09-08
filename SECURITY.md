# Security

## Reporting a vulnerability

Email **helder@heldergoncalves.io**. Please don't open a public issue for
anything exploitable.

Tell me what you found, how to reproduce it, and what it lets someone do.
I'll acknowledge within 72 hours and tell you what I'm doing about it.

## What is worth looking at

The static site is not the interesting part. The API is
([`api/app/`](api/app/), FastAPI): it takes form submissions, sends email,
talks to a language model, keeps a subscriber list, signs people into the
Calendar (by email code or Google), stores conversations and comments, and
exposes an MCP endpoint.

Things I'd want to know about:

- a way past the origin, token, honeypot or rate-limit gates on
  `/api/contact`, `/api/subscribe`, `/api/chat` or `/api/comentarios`;
- a way to read or enumerate the subscriber list, or to subscribe
  someone without their confirmation;
- a way to sign into the Calendar as someone else, forge or replay a
  session cookie or an OAuth `state`, or see another person's bookings;
- a way to reach `/api/reunioes/todas`, `/api/mensagens`, or any other
  owner-only endpoint without being signed in as `OWNER_EMAIL`;
- a way to see another person's email through the comments API — it is
  stored, but every response is checked to make sure it never goes out;
- a path traversal or a way to serve a file outside `dist/`;
- a prompt injection that makes the assistant send email, book a meeting,
  or reveal its instructions;
- anything that makes an unauthenticated request cost real money.

## What is already accounted for

Not bugs, by design:

- **No passwords, anywhere.** Signing into the Calendar is a one-time
  code sent by email — whoever controls the inbox is who signs in. There
  is no account to compromise beyond the inbox itself.
- **The site tells you what it is.** `/llms.txt`, `/posts.json` and `/mcp`
  publish the content on purpose.
- **Rate limits are per-IP-fingerprint and in memory.** A restart clears
  them, and a distributed source gets a limit each. Both are known
  trade-offs against storing anything about visitors.
- **The assistant can be asked to say things.** It is told to refuse, but
  it is a language model. What matters is what it can *do* — and its
  three tools are search, book, and send-a-message, each behind the same
  limits as the forms.
- **Messages conversations are stored — on purpose, and it says so.**
  This is the one deliberate exception to "nothing is logged" elsewhere
  on the site; see [`privacidade`](https://heldergoncalves.io/privacidade/) /
  [`privacy`](https://heldergoncalves.io/en/privacy/). Only the owner
  (`OWNER_EMAIL`) can read the inbox.
- **Comments go live immediately — there is no moderation queue.** A
  small site doesn't need one; the owner can remove a comment after the
  fact instead. The commenter's email is stored but never returned by
  any endpoint.
- **Google sign-in only ever sees `openid email`.** No profile scope is
  requested, and nothing beyond the verified email is stored — the
  session that comes out of it is identical to the one from an email
  code.

## Scope

This repository and `heldergoncalves.io`. Third-party infrastructure
(the host, the email provider, the model provider) belongs to them.

No bounty — this is a personal site. Credit in the fix commit if you want
it.
