// Avisa os subscritores dos artigos novos. Corre depois de cada deploy (Coolify: "Post-deployment command").
//
//   npm run notificar -- [--dry]
//
// Sem base de dados: o próprio Resend é o registo. Cada aviso é um broadcast com o nome
// `artigo:<lang>:<slug>`; se já existir um com esse nome, o artigo já foi avisado e salta-se.
//
// Salvaguardas, porque enviar e-mail não se desfaz:
//  - só envia com NOTIFICAR=1 (senão é sempre um ensaio);
//  - só avisa artigos com data na janela (NOTIFICAR_JANELA_DIAS, por omissão 7), para um deploy
//    antigo ou um clone novo não reenviar o arquivo todo;
//  - respeita `notificar: false` e `rascunho: true` no cabeçalho do artigo;
//  - se não conseguir ler o que já foi enviado, não envia nada;
//  - nunca falha o deploy: erros ficam no registo e o script sai com 0.
const env = process.env;
const dry = process.argv.includes('--dry') || env.NOTIFICAR !== '1';
const janela = Number(env.NOTIFICAR_JANELA_DIAS ?? 7);
const atraso = Number(env.NOTIFICAR_ATRASO_MIN ?? 15);
const API = env.RESEND_API_URL ?? 'https://api.resend.com';
const log = (m) => console.log(`[notificar] ${m}`);

async function main() {
  // Importados aqui dentro para que qualquer falha (até um pacote em falta) caia no catch final.
  const { artigos } = await import('../lib/md.mjs');
  const { emailArtigo } = await import('../lib/email.mjs');
  const hoje = new Date().toISOString().slice(0, 10);
  const dias = (iso) => Math.floor((Date.parse(hoje) - Date.parse(iso)) / 86_400_000);
  const candidatos = ['pt', 'en'].flatMap((lang) =>
    artigos(lang).filter((a) => a.notificar && a.data <= hoje && dias(a.data) <= janela),
  );
  if (candidatos.length === 0) return log(`nada para avisar (janela de ${janela} dias).`);
  log(`${candidatos.length} candidato(s): ${candidatos.map((a) => `${a.lang}/${a.slug}`).join(', ')}`);
  if (dry) log(env.NOTIFICAR === '1' ? 'modo --dry: não envio nada.' : 'NOTIFICAR não é 1: só ensaio, não envio nada.');

  const faltas = ['RESEND_API_KEY', 'RESEND_FROM', 'RESEND_SEGMENT_PT', 'RESEND_SEGMENT_EN'].filter((k) => !env[k]);
  if (faltas.length) return log(`faltam variáveis (${faltas.join(', ')}): nada a fazer.`);

  const cab = { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };

  // O que já foi avisado: os nomes de todos os broadcasts (paginado).
  const feitos = new Set();
  let depois;
  for (let pagina = 0; pagina < 50; pagina++) {
    const r = await fetch(`${API}/broadcasts?limit=100${depois ? `&after=${depois}` : ''}`, { headers: cab, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return log(`não consegui ler os broadcasts (${r.status}); por segurança não envio nada.`);
    const j = await r.json();
    for (const b of j.data ?? []) if (b.name) feitos.add(b.name);
    if (!j.has_more || !j.data?.length) break;
    depois = j.data.at(-1).id;
  }

  for (const a of candidatos) {
    const nome = `artigo:${a.lang}:${a.slug}`;
    if (feitos.has(nome)) { log(`já avisado: ${nome}`); continue; }
    if (dry) { log(`avisaria: ${nome} — "${a.titulo}"`); continue; }

    const { assunto, html, text } = emailArtigo(a, env.SITE_URL ?? 'https://heldergoncalves.io');
    const r = await fetch(`${API}/broadcasts`, {
      method: 'POST',
      headers: cab,
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        segment_id: a.lang === 'pt' ? env.RESEND_SEGMENT_PT : env.RESEND_SEGMENT_EN,
        from: env.RESEND_FROM, subject: assunto, name: nome, html, text,
        send: true, scheduled_at: `in ${atraso} minutes`,
      }),
    });
    log(r.ok ? `agendado (+${atraso} min): ${nome}` : `FALHOU ${nome}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
}

main().catch((e) => log(`erro inesperado: ${e?.message ?? e}`)).finally(() => process.exit(0));
