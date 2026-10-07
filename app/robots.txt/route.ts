import { linguas, rotas } from '@/lib/copy';
import { SITE } from '@/lib/site';

// À mão (e não em app/robots.ts) porque o Next não sabe escrever `Content-Signal`.
// Política: quem procura e responde (pesquisa, assistentes a pedido do utilizador) é bem-vindo;
// quem recolhe para treinar modelos fica de fora. Os sinais dizem o mesmo por escrito (contentsignals.org).
export const dynamic = 'force-static';

const PESQUISA = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Applebot', 'DuckAssistBot', 'MistralAI-User'];
const TREINO = ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'Meta-ExternalAgent', 'Amazonbot', 'cohere-ai'];
const PRIVADO = ['/api/', '/md/', ...linguas.map((l) => rotas[l].confirmar)];

export const GET = () => {
  const bloco = (agentes: string[], linhas: string[]) => [...agentes.map((a) => `User-agent: ${a}`), ...linhas].join('\n');
  const corpo = [
    bloco(['*'], ['Content-Signal: search=yes, ai-input=yes, ai-train=no', 'Allow: /', ...PRIVADO.map((p) => `Disallow: ${p}`)]),
    bloco(PESQUISA, ['Allow: /', ...PRIVADO.map((p) => `Disallow: ${p}`)]),
    bloco(TREINO, ['Disallow: /']),
    `Sitemap: ${SITE.canonico}/sitemap.xml\nHost: ${SITE.canonico}`,
  ].join('\n\n');
  return new Response(`${corpo}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
