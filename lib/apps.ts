// As mini-apps. Cada uma vive em <sub>.heldergoncalves.io e é uma pasta em app/(<sub>)/s/<sub>/.
// Uma só aplicação serve tudo: o proxy.ts lê o subdomínio e reescreve para a pasta certa,
// por isso não há um processo (nem RAM) por mini-app.
//
// `ativo: false` = só existe em desenvolvimento; em produção o subdomínio responde 404.
// Para criar uma nova:  npm run nova-app -- <nome>
type App = { sub: string; ativo: boolean };

const apps: readonly App[] = [
  { sub: 'lab', ativo: false },
  // NOVAS-APPS (o gerador acrescenta aqui — não apagar esta linha)
];

/** Domínios onde as mini-apps podem viver. */
const BASES = ['heldergoncalves.io', 'localhost'];
const RESERVADOS = new Set(['www']);

/** `lab.heldergoncalves.io` → `lab`. O apex, `www` e hosts desconhecidos → null. */
export function subDe(host: string): string | null {
  const h = host.split(':')[0].toLowerCase();
  for (const base of BASES) {
    const m = h.match(new RegExp(`^([a-z0-9-]+)\\.${base.replace(/\./g, '\\.')}$`));
    if (m && !RESERVADOS.has(m[1])) return m[1];
  }
  return null;
}

export const appDe = (sub: string) =>
  apps.find((a) => a.sub === sub && (a.ativo || process.env.NODE_ENV !== 'production')) ?? null;
