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

export function PaginaConfirmar({ lang, token }: { lang: Lang; token?: string }) {
  return (
    <div className="papel">
      <Cabecalho lang={lang} alt={rotas[lang === 'pt' ? 'en' : 'pt'].escritos} />
      <main className="mx-auto w-full max-w-[44rem] px-6 pt-16 sm:pt-24">
        <Confirmar token={typeof token === 'string' ? token.slice(0, 1024) : ''} t={copy[lang].confirmar} destino={rotas[lang].escritos} />
      </main>
      <Rodape lang={lang} />
    </div>
  );
}
