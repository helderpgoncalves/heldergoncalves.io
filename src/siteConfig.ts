// ─────────────────────────────────────────────────────────────────────
// A porta de entrada da configuração.
//
// O conteúdo está em config/, repartido por assunto — quem é o site,
// o texto de cada língua, e o que se calcula a partir dos dois. Este
// ficheiro só volta a juntar tudo, para haver um sítio de onde importar
// e para não ser preciso mexer em cada página quando alguma coisa
// mudar de casa.
//
//   config/site.ts      quem é o site e que aplicações tem
//   config/copy.pt.ts   todo o texto em português
//   config/copy.en.ts   todo o texto em inglês
//   config/copy.ts      junta as duas e obriga-as a bater certo
//   config/routes.ts    rotas, datas e ligações
// ─────────────────────────────────────────────────────────────────────
export { SITE, APPS, appMeta } from './config/site';
export type { Lang, AppId, AppMeta } from './config/site';
export { COPY } from './config/copy';
export type { Copy } from './config/copy';
export { ROUTES, other, formatDate, readingMinutes, socialLinks } from './config/routes';
