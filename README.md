# heldergoncalves.io

**A personal website that is an operating system.**

On a phone it behaves like an iPhone. On a computer it behaves like a Mac.
Not a skin over a webpage — windows you drag and resize, a Dock that
magnifies, gestures that follow your finger frame by frame, and a Control
Centre whose sliders actually change something.

**[heldergoncalves.io →](https://heldergoncalves.io)**

Astro renders static HTML. Everything else is hand-written JavaScript:
**no frameworks, no animation libraries, no tracking** — and in production,
**no third-party dependencies running at all**. The server is Node and
nothing else.

---

## What is actually in here

| | |
| --- | --- |
| **macOS** | Menu bar with real dropdowns and keyboard shortcuts, Dock with cursor magnification, windows that cascade, drag, resize, snap to edges, minimise into their Dock icon and stack by z-order, traffic lights, ⌘K search, ⌘Tab switcher, right-click menu |
| **iOS** | Lock screen you swipe away, home screen with pages and widgets, apps that open out of their own icon, the home-bar gesture with all three of its destinations, Control Centre, Notification Centre, app switcher with cards you flick away, edge-swipe back |
| **Apps** | Profile, Blog, Messages, Mail, Projects, Terminal, Settings — and a Simulator that runs this same site inside an iPhone, inside itself, two levels deep before it says enough |
| **Server** | Static files with Brotli, a contact form, double opt-in newsletter, an AI assistant with tools, and an MCP endpoint so other agents can query the site without parsing HTML |

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

### A server with no dependencies

`server/` imports nothing but Node built-ins, and it never compresses
anything: the build writes a Brotli and a gzip copy next to every file, at
maximum quality, so serving a page is reading bytes and sending them. Files
are hashed and cached in memory on first read, and the cache is warmed at
boot so the first visitor after a deploy waits for nothing.

Rate limits are sliding windows. Form tokens are HMACs that prove the form was
opened on this server, by this visitor, and how long ago — a bot posting
directly has none of the three. Visitor IPs are never stored in the clear,
only as an in-memory fingerprint that dies with the process.

→ [`server/`](server/)

---

## Layout

```
src/
  config/             the site, both languages, and what is derived from them
    site.ts             identity, app metadata, window sizes
    copy.pt.ts          every word of Portuguese
    copy.en.ts          every word of English
    copy.ts             joins them, and makes TypeScript keep them in step
  content/blog/{pt,en}/ the writing, one Markdown file each
  components/os/
    Shell.astro         the shell: menu bar, Dock, home screen, panels, lock
    IconSprite.astro    every icon, in one 100×100 sprite
    apps/*.astro        the contents of each app — plain HTML
  scripts/os/
    index.js            boot, routing, and which of the two worlds to show
    gesture.js          the gesture engine: capture, axis, velocity, rubber band
    state.js            preferences, theme, motion, clock
    mac/                windows · dock · menus · spotlight · switcher · snap · keys
    ios/                motion · views · panels · switcher · pages · lock · back
    apps/               one file per app
    lib/                the small pieces more than one app needs
  styles/
    os.css              the index — nothing but the order things load in
    os/*.css            tokens · mac · ios · apps · glass · apple · container
server/
  index.mjs           the route table, and nothing else
  routes/             one file per endpoint
  agent/              the assistant's prompt and its tools
  *.mjs               config · http · security · static · mail · knowledge · subscribers
knowledge/*.md        what the assistant knows — edit a file, deploy, done
```

**Adding things is meant to be boring.** A new app is a file in
`scripts/os/apps/` and a line in its index. A new endpoint is a file in
`server/routes/` and a line in the route table. A new thing the assistant
knows is a new Markdown file in `knowledge/` — no code at all.

No file in this repository is over 400 lines.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:4321
```

For the real thing — static build plus the Node server that fronts it:

```bash
npm run build
npm start            # http://localhost:3000
```

Deployment is a single `Dockerfile` (Astro in stage one, the server in stage
two) built for Coolify. Everything the container needs is in
[`DEPLOY.md`](DEPLOY.md), including the one volume it wants: `/app/data`, where
the newsletter list lives.

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
glyphs are Lucide (ISC), the brand marks are Simple Icons (CC0), the typeface
shipped is Inter (SIL OFL). On Apple devices the site uses the system's own San
Francisco through `-apple-system`; it is not, and cannot be, in this
repository.

Nothing here is Apple's. What follows Apple's rules is the *geometry* — which
is mathematics, and mathematics is not anybody's.

The code is © Hélder Gonçalves. Read it, learn from it, take the ideas. If you
want to use a chunk of it, [say hello](mailto:helder@heldergoncalves.io).
