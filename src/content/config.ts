// Coleção de escritos. Um ficheiro Markdown por texto, dentro de
// src/content/blog/pt/ ou src/content/blog/en/. O campo `key` liga a
// versão portuguesa à inglesa (mesma chave = mesmo texto, outra língua).
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
    key: z.string().optional(),
  }),
});

export const collections = { blog };
