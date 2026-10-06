// Para o healthcheck do Docker e do Coolify. Não toca em nada externo, de propósito.
export const dynamic = 'force-dynamic';
export const GET = () => Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
