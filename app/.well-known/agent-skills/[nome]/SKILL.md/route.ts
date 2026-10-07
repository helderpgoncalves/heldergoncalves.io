import { SKILL } from '@/lib/agentes';

export const dynamicParams = false;
export const generateStaticParams = () => [{ nome: SKILL.nome }];
export const GET = () => new Response(SKILL.corpo, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
