
export const dynamic = 'force-static';
export const GET = () => new Response("User-agent: *\nAllow: /\n", { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
