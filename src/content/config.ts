// ─────────────────────────────────────────────────────────────
// Coleção do blog. Cada nota é um ficheiro Markdown em
// src/content/blog/<idioma>/<slug>.md — o idioma vem da pasta.
// `translationKey` liga a versão PT à EN (usado no hreflang).
// ─────────────────────────────────────────────────────────────
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    translationKey: z.string(),
  }),
});

export const collections = { blog };
