import { SKILL, resumoDigest } from '@/lib/agentes';
import { SITE } from '@/lib/site';

// Agent Skills Discovery (v0.2.0): o índice das skills que este site publica.
export const dynamic = 'force-static';
export const GET = () =>
  new Response(
    JSON.stringify({
      $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
      skills: [{ name: SKILL.nome, type: 'skill-md', description: SKILL.descricao, url: `${SITE.canonico}/.well-known/agent-skills/${SKILL.nome}/SKILL.md`, digest: resumoDigest() }],
    }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } },
  );
