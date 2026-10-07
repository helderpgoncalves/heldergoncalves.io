import { Cabecalho } from './Cabecalho';
import { Confirmar } from './Confirmar';
import { Rodape } from './Rodape';
import { copy, rotas, type Lang } from '@/lib/copy';
import { meta } from '@/lib/seo';

// Página privada: o token vem no endereço, por isso nunca se indexa nem se envia por referrer.
export const metaConfirmar = (lang: Lang) => ({
  ...meta({ lang, titulo: copy[lang].confirmar.titulo, descricao: copy[lang].confirmar.texto, caminho: rotas[lang].confirmar, privado: true }),
  referrer: 'no-referrer' as const,
});

// Só para escolher o texto da página: a assinatura e a validade verificam-se no servidor, ao confirmar.
const tipoDe = (token: string) => {
  try { return (JSON.parse(Buffer.from(token.split('.')[0] ?? '', 'base64url').toString()) as { k?: string }).k; } catch { return undefined; }
};

export function PaginaConfirmar({ lang, token }: { lang: Lang; token?: string }) {
  const c = copy[lang].comentarios;
  const publicar = typeof token === 'string' && tipoDe(token) === 'p' ? { pre: c.confirmarPublicar, ok: c.publicadoOk } : undefined;
  return (
    <div className="papel">
      <Cabecalho lang={lang} alt={rotas[lang === 'pt' ? 'en' : 'pt'].blog} />
      <main className="mx-auto w-full max-w-[44rem] px-6 pt-16 sm:pt-24">
        <Confirmar token={typeof token === 'string' ? token.slice(0, 1024) : ''} t={copy[lang].confirmar} comentarios={copy[lang].comentarios.sessaoOk} destino={rotas[lang].blog} publicar={publicar} />
      </main>
      <Rodape lang={lang} />
    </div>
  );
}
