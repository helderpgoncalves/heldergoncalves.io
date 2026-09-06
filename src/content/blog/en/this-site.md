---
title: 'How this site is built'
description: 'Astro, zero JavaScript by default, two languages with real URLs, and projects pulled from GitHub at build time. An honest colophon — and the reasoning behind each choice.'
date: 2026-09-06
tags: ['Astro', 'Web', 'SEO']
translationKey: 'colophon'
---

A personal site is the one place where there is no excuse for bad code. Nobody is in charge, there is no deadline, and nobody will look underneath — which is exactly why it should be done properly.

## Astro, and almost nothing else

The site is static. There is no UI framework, no React bundle waiting to hydrate, no analytics following anyone around. The HTML comes out of the build ready, and the browser only has to paint it.

The little JavaScript that exists does three things: switch the theme, open the command palette with `⌘K`, and not much more. Everything else — navigation, content, language — works with JavaScript turned off.

## Two languages, two pages

The previous version swapped text in the browser using `data-pt` and `data-en` attributes. It looked clever and was useless: Google indexed a single version, and a shared link always opened in Portuguese.

Now Portuguese lives at the root and English at `/en/`. They are different pages, generated at build time, each with its own title, description, Open Graph tags and a `hreflang` pointing at its sibling. It is more work to write. It is the only thing that actually works.

## The projects come from GitHub

The work list is not hand-written. At build time the site asks GitHub which repositories exist, how many stars they have and when they were last touched. If the API does not answer, it falls back to the values committed in the repository and the build carries on.

That way the page ages in the right direction on its own: I push to a project, the next deploy shows it.

## What is left out

No cookies. No trackers. No third-party newsletter. No pop-up asking for an email before letting you read.

If you want to talk, my address is at the bottom of the page.
