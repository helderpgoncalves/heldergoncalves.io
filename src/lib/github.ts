// ─────────────────────────────────────────────────────────────
// Vai buscar ao GitHub os números atuais dos repositórios (estrelas,
// linguagem, última atualização) no momento do build. Se a API falhar
// — offline, rate limit, o que for — devolve os valores guardados em
// src/data/projects.ts e o build segue na mesma.
// ─────────────────────────────────────────────────────────────
import { SITE } from '../siteConfig';
import { projects, type Project } from '../data/projects';

interface GhRepo {
  full_name: string;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
}

let cache: Project[] | null = null;

export async function getProjects(): Promise<Project[]> {
  if (cache) return cache;

  try {
    const res = await fetch(
      `https://api.github.com/users/${SITE.githubUser}/repos?per_page=100&sort=pushed`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'heldergoncalves.io',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`);

    const data = (await res.json()) as GhRepo[];
    const byName = new Map(data.map((r) => [r.full_name.toLowerCase(), r]));

    cache = projects.map((p) => {
      const live = byName.get(p.repo.toLowerCase());
      if (!live) return p;
      return {
        ...p,
        language: live.language ?? p.language,
        stars: live.stargazers_count,
        pushedAt: live.pushed_at,
      };
    });
  } catch (err) {
    console.warn('[github] a usar os dados guardados:', (err as Error).message);
    cache = projects;
  }

  return cache;
}
