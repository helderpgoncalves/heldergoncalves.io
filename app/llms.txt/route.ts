import { artigos } from '@/lib/blog';
import { copy, linguas, rotas } from '@/lib/copy';
import { abs } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { PROJETOS } from '@/lib/site';

// llms.txt (llmstxt.org): o resumo do site para modelos, com ligações para tudo o que importa.
export const dynamic = 'force-static';

export const GET = () => {
  const textos = linguas.map((l) => {
    const lista = artigos(l);
    return `## ${l === 'pt' ? 'Textos (português)' : 'Posts (English)'}\n\n${lista.length ? lista.map((a) => `- [${a.titulo}](${abs(rotas[l].artigo(a.slug))}): ${a.resumo}`).join('\n') : '- (ainda sem textos)'}`;
  });
  const corpo = `# ${SITE.nome}

> ${copy.pt.descricao} ${copy.en.descricao}

${SITE.nome} é engenheiro de software, em Portugal. Este site é o seu blog pessoal (português de Portugal e inglês). Qualquer página de texto responde em Markdown com o cabeçalho \`Accept: text/markdown\`.

## Páginas

- [Início](${abs(rotas.pt.inicio)}): quem sou e como falar comigo
- [Blog](${abs(rotas.pt.blog)}): todos os textos
- [Blog (English)](${abs(rotas.en.blog)}): all posts
- [RSS](${abs(rotas.pt.feed)}): feed com o texto inteiro
- [Bio](${SITE.bio}): todas as ligações num só sítio

${textos.join('\n\n')}

${PROJETOS.length ? `## Projetos\n\n${PROJETOS.map((p) => `- [${p.nome}](${p.url}): ${p.descricao.pt}`).join('\n')}\n\n` : ''}## Perfis

- [GitHub](${SITE.github})
- [Instagram](${SITE.instagram}): @${SITE.instagramNome}
- E-mail: ${SITE.email}

## Máquinas

- [sitemap.xml](${SITE.canonico}/sitemap.xml)
- [API (OpenAPI)](${SITE.canonico}/openapi.json)
- [Skills para agentes](${SITE.canonico}/.well-known/agent-skills/index.json)

## Uso

Podes ler, resumir e citar (com título, autor, data e ligação). Não é permitido usar os textos para treinar modelos.
`;
  return new Response(corpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
