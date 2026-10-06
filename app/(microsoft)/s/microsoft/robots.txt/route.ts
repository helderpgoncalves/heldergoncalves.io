// Uma brincadeira pessoal com comentários de desconhecidos: não é para os motores de busca.
export const dynamic = 'force-static';
export const GET = () => new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
