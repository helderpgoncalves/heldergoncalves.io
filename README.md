# heldergoncalves.io

**A personal website that is an operating system.**

On a phone it behaves like an iPhone. On a computer it behaves like a Mac.
Not a skin over a webpage — windows you drag and resize, a Dock that
magnifies the way the real one does, gestures that follow your finger frame
by frame and settle with a spring, widgets you add and remove, and a Control
Centre whose sliders actually change something. It boots with the same
"hello" a Mac does.

**[heldergoncalves.io →](https://heldergoncalves.io)**

Astro renders static HTML. The frontend is hand-written JavaScript: **no
frameworks, no animation libraries, no tracking**. The API is a small
FastAPI service — one process, minimal and justified dependencies, nothing
speculative.

---

## What is actually in here

| | |
| --- | --- |
| **macOS** | The full menu bar — Apple, File, Edit, View, Window, Help, Wi‑Fi, battery, Control Centre — with real dropdowns and every shortcut they promise; a Dock with the real magnification maths (cosine window, the row re-laid with the new sizes, the Dock widening to fit) and right-click menus; windows that cascade, drag, resize, snap to edges, minimise into their Dock icon and stack by z-order; desktop icons you select with one click and open with two; desktop widgets; ⌘K search; ⌘Tab |
| **iOS** | Lock screen you swipe away, home screen with pages you flick between, widgets you edit by touching and holding (the icons jiggle), pull down to search, apps that open out of their own icon, the home-bar gesture with all three of its destinations, Control Centre, Notification Centre with notifications you swipe away, tap the status bar to scroll to top, app switcher with cards you flick away, edge-swipe back — every settle is a spring that starts with the finger's velocity |
| **Apps** | Profile, Blog (shaped like Notes, with search and month groups), Messages, Mail, Projects, Terminal, Settings, **Stocks** with live quotes, **Calendar** where you sign in with an emailed code and book a conversation in a free slot — and a Simulator that runs this same site inside an iPhone, inside itself, two levels deep before it says enough |
| **API** | Static files with Brotli, a contact form, double opt-in newsletter, passwordless sign-in (a six-digit code by email), availability and bookings, live quotes via `yfinance` with a one-minute cache, an AI assistant with tools, and an MCP endpoint so other agents can query the site without parsing HTML |

It works without JavaScript. Every word on the screen is ordinary HTML
underneath — search engines and screen readers get the document, the
JavaScript only turns that document into a system.

---

## Three things worth reading the code for

### The Apple corner is not a rounded rectangle

An Apple corner is not a circular arc. The arc covers only 36° in the middle
of the corner; on either side of it two Bézier curves hand it off to the
straight edge with no jump in curvature. That is what *continuous* means, and
it has two consequences the whole design system hangs on: the corner occupies
**1.6× the radius** along each edge, and it cuts **exactly as deep** as a
circular corner of the same radius (0.2929 × r, in both cases).

So the icons carry the real path — radius 22.37% of the side, corner running
to 35.79, straight edge only between 35.79 and 64.21 — and everything drawn
in CSS uses `corner-shape: superellipse(1.777)`, the exponent whose
superellipse passes through both of those points.

→ [`src/styles/os/apple.css`](src/styles/os/apple.css) ·
[`src/components/os/IconSprite.astro`](src/components/os/IconSprite.astro)

### One motion model for opening, closing and dragging

The reason app transitions on the phone feel wrong on most sites is that the
drag and the release use different maths — the drag shrinks the app from its
centre, the release animates from the corner, and you see the seam.

Here a single value `p` runs from 0 (app filling the screen) to 1 (inside its
icon), and opening, closing, and the finger all agree on the path. The home
bar hands the animation the exact `p` where the finger let go.

→ [`src/scripts/os/ios/motion.js`](src/scripts/os/ios/motion.js) ·
[`src/scripts/os/ios/views.js`](src/scripts/os/ios/views.js)

### The Dock does the whole sum

Most Dock imitations grow the icon under the cursor and stop there, so the
magnified icons run into their neighbours. The real one does three things:
each icon's scale comes from a cosine window over its distance to the
cursor; the icons are then laid side by side **at their new sizes**, which is
what opens room for the neighbours — nothing is pushed, the row is simply
longer; and the Dock widens to fit, both ways, because it is centred. Between
frames each icon moves a fraction of the way to its target, measured in time
rather than frames, so it is the same on a 60 Hz and a 120 Hz screen.

→ [`src/scripts/os/mac/dock.js`](src/scripts/os/mac/dock.js)

### An API with nothing speculative in it

`api/app/` never compresses anything at request time: the Astro build writes
a Brotli and a gzip copy next to every file, at maximum quality, so serving a
page is reading bytes and sending them. Files are hashed and cached in memory
on first read, and the cache is warmed at boot so the first visitor after a
deploy waits for nothing.

Rate limits are sliding windows. Form tokens are HMACs that prove the form was
opened on this server, by this visitor, and how long ago — a bot posting
directly has none of the three. Visitor IPs are never stored in the clear,
only as an in-memory fingerprint that dies with the process. All of it is
built on the Python standard library (`hmac`, `hashlib`, `secrets`,
`zoneinfo`) — FastAPI, `uvicorn`, `httpx` and `yfinance` are the only
third-party dependencies, and each earns its place.

→ [`api/app/`](api/app/)

---

## Layout

```
src/
  assets/icons/       Apple's app icons, from public sources (see NOTICE.md)
  config/             the site, both languages, and what is derived from them
    site.ts             identity, app metadata, window sizes
    copy.{pt,en}.ts     every word of each language
    os.{pt,en}.ts       the system's words — menus, widgets, lock screen
    copy.ts             joins them, and makes TypeScript keep them in step
  content/blog/{pt,en}/ the writing, one Markdown file each
  components/os/
    Shell.astro         the shell: menu bar, Dock, home screen, panels, lock
    Saudacao.astro      the boot "hello", one path per letter, timed at build
    Widgets.astro       one template per widget type, and the gallery
    IconSprite.astro    every icon, in one 100×100 sprite — Mac and iOS variants
    apps/*.astro        the contents of each app — plain HTML
  scripts/os/
    index.js            boot, routing, and which of the two worlds to show
    gesture.js          the gesture engine: capture, axis, velocity, rubber band, spring
    state.js            preferences, theme, motion, clock
    widgets.js          adding, removing and editing widgets, in both worlds
    mac/                windows · dock · menus · spotlight · switcher · snap · keys
    ios/                motion · views · panels · switcher · pages · lock · back · search
    apps/               one file per app (Stocks and Calendar have two)
    lib/                the small pieces more than one app needs
  styles/
    os.css              the index — nothing but the order things load in
    os/*.css            tokens · mac · ios · apps · notes · widgets · stocks · calendar · glass · apple · access
api/
  app/
    main.py           the FastAPI app: includes the routers, nothing else
    routers/          one file per endpoint family: contact · subscribe · chat · mcp · bolsa · auth · reunioes
    agent/            the assistant's prompt and its tools
    bolsa/            the Yahoo Finance client (`yfinance`) and its cache
    *.py              config · http · validation · security · static_files · mail · knowledge · subscribers · sessions · meetings · availability · copy
  tests/              pytest — unit tests for the pure logic, integration tests against the app
knowledge/*.md        what the assistant knows — edit a file, deploy, done
```

**Adding things is meant to be boring.** A new app is a file in
`scripts/os/apps/` and a line in its index. A new endpoint is a file in
`api/app/routers/` included from `main.py`. A new thing the assistant
knows is a new Markdown file in `knowledge/` — no code at all.

No file in this repository is over 400 lines.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:4321 — the frontend alone
```

For the real thing — static build plus the FastAPI service that fronts it —
see `docker-compose.yml`:

```bash
cp .env.example .env    # optional: fill in only what you need
docker compose up --build   # http://localhost:3000
```

The API's own tests run separately, with Python installed:

```bash
cd api
pip install -r requirements-dev.txt
pytest
```

Deployment is a single `Dockerfile` (Astro in stage one, the API in stage
two) built for Coolify. Everything the container needs is in
[`DEPLOY.md`](DEPLOY.md), including the one volume it wants: `/app/data`, where
the newsletter list, the bookings and the session secret live.

---

## The newsletter

Double opt-in, because it is the only honest way to do it. Asking to subscribe
puts nobody on the list — it sends an email with a signed link, and the link is
what subscribes you. Someone typing your address does not sign you up. The
unsubscribe link never expires, because a person has to be able to leave a list
using an email from two years ago.

The list is an append-only NDJSON file: one line per event, never rewritten. A
crash mid-write cannot corrupt what was already there, the history of who
joined and left is kept, and you can read the whole thing with `cat`. It is
never served over HTTP — there is no endpoint that returns it, not even one
that counts.

---

## The Calendar

There are no passwords. You type your email, a six-digit code arrives, you
type it back — whoever controls the inbox is whoever signs in. The session
is a signed cookie, not a table: the server keeps nothing but a secret that
survives restarts. Only signed-in people see availability, which is computed
in Lisbon time from configurable days and windows, minus what is booked,
minus what is too soon. Booking emails both sides; cancelling tells the owner.
Bookings are the same append-only NDJSON as the newsletter.

## The Stocks

Quotes come from Yahoo Finance through the API, never from the browser
(the content-security policy would not allow it, and should not). Each answer
is cached for a minute, so a hundred people watching the same ticker are one
request out, not a hundred. The watchlist is yours and stays on your device.

## The site as an API

Because sites are read by agents now, not only by people.

| | |
| --- | --- |
| `/llms.txt`, `/llms-full.txt` | the site as text, for language models |
| `/posts.json` | every post, structured |
| `/rss.xml`, `/en/rss.xml` | feeds, one per language |
| `/mcp` | a Model Context Protocol server: `procurar`, `escritos`, `contactar` |

---

## Notes

The code comments are in Portuguese. That is deliberate — it is a Portuguese
site, and the comments explain *why*, not *what*, so they are worth the
translation if you are reading closely.

Third-party licences and attributions are in [`NOTICE.md`](NOTICE.md). The
app icons are Apple's, taken from public sources — the `mac-os-dock`
component on 21st.dev, Wikipedia and Wikimedia Commons — with the iOS
versions shown on the phone and the macOS versions on the Mac; the boot
"hello" is the stroke from the `apple-hello-effect` component, animated
here without its library. The remaining glyphs are Lucide (ISC), the brand
marks are Simple Icons (CC0), the typeface shipped is Inter (SIL OFL). On
Apple devices the site uses the system's own San Francisco through
`-apple-system`; it is not, and cannot be, in this repository.

This is a personal, non-commercial site, and a homage. It is not affiliated
with Apple Inc. What follows Apple's rules is the *geometry* — which is
mathematics, and mathematics is not anybody's.

The code is © Hélder Gonçalves. Read it, learn from it, take the ideas. If you
want to use a chunk of it, [say hello](mailto:helder@heldergoncalves.io).
