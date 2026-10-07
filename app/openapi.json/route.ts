import { OPENAPI } from '@/lib/agentes';

export const dynamic = 'force-static';
export const GET = () => new Response(JSON.stringify(OPENAPI), { headers: { 'Content-Type': 'application/vnd.oai.openapi+json', 'Cache-Control': 'public, max-age=3600' } });
