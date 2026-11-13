import { Cabecalho } from './Cabecalho';
import { Confirmar } from './Confirmar';
import { Rodape } from './Rodape';
import { artigos } from '@/lib/blog';
import { copy, rotas, type Lang } from '@/lib/copy';
import { meta } from '@/lib/seo';

// Página privada: o token vem no endereço, por isso nunca se indexa nem se envia por referrer.
export const metaConfirmar = (lang: Lang) => ({
  ...meta({ lang, titulo: copy[lang].confirmar.titulo, descricao: copy[lang].confirmar.texto, caminho: rotas[lang].confirmar, privado: true }),
  referrer: 'no-referrer' as const,
});

export function PaginaConfirmar({ lang, token }: { lang: Lang; token?: string }) {
  const ultimo = artigos(lang)[0];
  const sugestao = ultimo ? { rotulo: lang === 'pt' ? 'Para ler enquanto esperas' : 'To read while you wait', titulo: ultimo.titulo, href: rotas[lang].artigo(ultimo.slug) } : undefined;
  return (
    <div className="papel">
      <Cabecalho lang={lang} alt={rotas[lang === 'pt' ? 'en' : 'pt'].blog} />
      <main className="mx-auto w-full max-w-[44rem] px-6 pt-14 pb-20 sm:pt-24">
        <Confirmar token={typeof token === 'string' ? token.slice(0, 1024) : ''} t={copy[lang].confirmar} destino={rotas[lang].blog} sugestao={sugestao} />
      </main>
      <Rodape lang={lang} />
    </div>
  );
}
