// Cada subdomínio tem o seu robots.txt. Enquanto a mini-app não está pronta, ninguém a indexa.
export const dynamic = 'force-static';
export const GET = () => new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
