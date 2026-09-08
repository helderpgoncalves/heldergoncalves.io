// Texto simples para máquinas. Um agente que caia aqui deve conseguir
// perceber quem é o Hélder e ler tudo sem executar JavaScript nenhum.
import { SITE, COPY, ROUTES, APPS, type Lang } from '../siteConfig';
import { getPosts, postPath } from './posts';

const text = (body: string) =>
  new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });

const abs = (path: string) => new URL(path, SITE.url).href;

/** /llms.txt — o índice, na forma que a convenção pede. */
export async function llmsIndex(lang: Lang): Promise<Response> {
  const c = COPY[lang];
  const posts = await getPosts(lang);
  const other = lang === 'pt' ? 'en' : 'pt';

  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${c.description}`,
    '',
    c.intro,
    '',
    c.intro2,
    '',
    `- ${lang === 'pt' ? 'Função' : 'Role'}: ${c.role}`,
    `- ${lang === 'pt' ? 'Localização' : 'Location'}: ${c.place}`,
    `- Email: ${SITE.email}`,
    `- GitHub: ${SITE.github}`,
    `- LinkedIn: ${SITE.linkedin}`,
    `- X: ${SITE.twitter}`,
    '',
    `## ${c.escritos.heading}`,
    '',
    ...posts.map((p) => `- [${p.data.title}](${abs(postPath(p, lang))}): ${p.data.description}`),
    '',
    `## ${lang === 'pt' ? 'Aplicações do site' : 'Site applications'}`,
    '',
    `${
      lang === 'pt'
        ? 'O site é um sistema operativo: no telemóvel comporta-se como um iPhone, no computador como um Mac. Todo o conteúdo existe também como HTML simples, sem JavaScript.'
        : 'The site is an operating system: it behaves like an iPhone on mobile and like a Mac on desktop. All content also exists as plain HTML, with no JavaScript required.'
    }`,
    '',
    ...APPS.map((a) => `- ${c.apps[a.id].name}: ${c.apps[a.id].subtitle}`),
    '',
    `## ${lang === 'pt' ? 'Opcional' : 'Optional'}`,
    '',
    `- [${lang === 'pt' ? 'Tudo em texto' : 'Everything as text'}](${abs('/llms-full.txt')}): ${
      lang === 'pt' ? 'todos os escritos, em Markdown' : 'every piece of writing, in Markdown'
    }`,
    `- [posts.json](${abs('/posts.json')}): ${lang === 'pt' ? 'índice legível por máquina' : 'machine-readable index'}`,
    `- [MCP](${abs('/mcp')}): ${
      lang === 'pt'
        ? 'servidor MCP (JSON-RPC em POST) com as ferramentas procurar, escritos e contactar'
        : 'MCP server (JSON-RPC over POST) with the tools procurar, escritos and contactar'
    }`,
    `- [RSS](${abs(ROUTES[lang].feed)})`,
    `- [${other === 'en' ? 'English' : 'Português'}](${abs(ROUTES[other].home)})`,
    '',
  ];
  return text(lines.join('\n'));
}

/** /llms-full.txt — o site inteiro em Markdown, numa resposta só. */
export async function llmsFull(): Promise<Response> {
  const parts: string[] = [];
  for (const lang of ['pt', 'en'] as Lang[]) {
    const c = COPY[lang];
    const posts = await getPosts(lang);
    parts.push(`# ${SITE.name} — ${c.role} (${lang})`);
    parts.push('');
    parts.push(`> ${c.description}`);
    parts.push('');
    parts.push(c.intro, '', c.intro2, '', c.intro3, '');
    parts.push(`Email: ${SITE.email} · GitHub: ${SITE.github}`);
    parts.push('');
    parts.push(`## ${lang === 'pt' ? 'Projetos' : 'Projects'}`);
    parts.push('');
    for (const item of c.projetos.list) {
      parts.push(`### ${item.name} — ${item.tagline}`);
      parts.push('');
      parts.push(item.body);
      parts.push('');
      parts.push(`Tags: ${item.tags.join(', ')}`);
      parts.push('');
    }
    parts.push(`## ${c.escritos.heading}`);
    parts.push('');
    for (const post of posts) {
      parts.push(`### ${post.data.title}`);
      parts.push('');
      parts.push(`URL: ${abs(postPath(post, lang))}`);
      parts.push(`${lang === 'pt' ? 'Data' : 'Date'}: ${post.data.date.toISOString().slice(0, 10)}`);
      if (post.data.tags.length) parts.push(`Tags: ${post.data.tags.join(', ')}`);
      parts.push('');
      parts.push(post.body.trim());
      parts.push('');
      parts.push('---');
      parts.push('');
    }
  }
  return text(parts.join('\n'));
}

/** /posts.json — o índice, para quem prefere estrutura a prosa. */
export async function postsJson(): Promise<Response> {
  const out: Record<string, unknown> = {
    site: {
      name: SITE.name,
      url: SITE.url,
      email: SITE.email,
      role: COPY.pt.role,
      location: COPY.pt.place,
      github: SITE.github,
      linkedin: SITE.linkedin,
      x: SITE.twitter,
      languages: ['pt', 'en'],
      llms: abs('/llms.txt'),
    },
    posts: [] as unknown[],
  };
  for (const lang of ['pt', 'en'] as Lang[]) {
    const posts = await getPosts(lang);
    (out.posts as unknown[]).push(
      ...posts.map((p) => ({
        lang,
        slug: p.id.replace(/^(pt|en)\//, ''),
        title: p.data.title,
        description: p.data.description,
        date: p.data.date.toISOString().slice(0, 10),
        updated: p.data.updated ? p.data.updated.toISOString().slice(0, 10) : null,
        tags: p.data.tags,
        url: abs(postPath(p, lang)),
        words: p.body.trim().split(/\s+/).filter(Boolean).length,
      }))
    );
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
