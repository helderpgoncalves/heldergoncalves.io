import { createHash } from 'node:crypto';
import { SITE } from './site';

// O que os agentes de IA precisam para usar este site sem adivinhar: um resumo (llms.txt),
// uma skill (formato Agent Skills) e o catálogo das APIs. Tudo gerado daqui, nada à mão em dois sítios.

export const SKILL = {
  nome: 'ler-o-blog-de-helder-goncalves',
  descricao: 'Como ler o blog e o site de Hélder Gonçalves (heldergoncalves.io): onde estão os textos, em que formatos, e como citá-los.',
  corpo: `---
name: ler-o-blog-de-helder-goncalves
description: Como ler o blog e o site de Hélder Gonçalves (heldergoncalves.io): onde estão os textos, em que formatos, e como citá-los.
---

# Ler o blog de Hélder Gonçalves

O site é ${SITE.canonico}. Autor: ${SITE.nome} (engenheiro de software, Portugal). Línguas: português de Portugal (por omissão) e inglês.

## Onde está cada coisa

- Início: ${SITE.canonico}/ (PT) e ${SITE.canonico}/en (EN).
- Lista de textos: ${SITE.canonico}/blog e ${SITE.canonico}/en/blog.
- Um texto: ${SITE.canonico}/blog/<slug> e ${SITE.canonico}/en/blog/<slug>.
- Todos os endereços: ${SITE.canonico}/sitemap.xml.
- Novidades: ${SITE.canonico}/blog/feed.xml e ${SITE.canonico}/en/blog/feed.xml (RSS com o texto inteiro).
- Resumo para modelos: ${SITE.canonico}/llms.txt.

## Como pedir em Markdown

Qualquer página de texto responde em Markdown se enviares o cabeçalho \`Accept: text/markdown\`. É a forma mais leve e fiável de ler um texto.

## Como citar

Cita o título, o autor (${SITE.nome}), a data de publicação e o endereço canónico da página. Os textos que citam fontes têm uma secção «Fontes»: prefere citar a fonte original quando for ela a afirmar o facto.

## Política de uso

Podes ler, resumir e responder com base nos textos. Não é permitido usá-los para treinar modelos (ver ${SITE.canonico}/robots.txt, Content-Signal).
`,
};

export const resumoDigest = () => `sha256:${createHash('sha256').update(SKILL.corpo).digest('hex')}`;

export const OPENAPI = {
  openapi: '3.1.0',
  info: { title: 'API do site de Hélder Gonçalves', version: '1.0.0', description: 'Subscrição da newsletter do blog e estado do serviço.', contact: { name: SITE.nome, email: SITE.email, url: SITE.canonico } },
  servers: [{ url: SITE.canonico }],
  paths: {
    '/api/subscribe': {
      post: {
        summary: 'Pede a subscrição da newsletter; envia um e-mail de confirmação',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' }, lang: { type: 'string', enum: ['pt', 'en'], default: 'pt' } } } } } },
        responses: { '200': { description: 'E-mail de confirmação enviado (a resposta é sempre a mesma, exista ou não a subscrição)' }, '400': { description: 'E-mail inválido' }, '429': { description: 'Demasiados pedidos' }, '503': { description: 'Newsletter indisponível' } },
      },
    },
    '/api/health': { get: { summary: 'Estado do serviço', responses: { '200': { description: '{"ok":true}' } } } },
  },
} as const;

