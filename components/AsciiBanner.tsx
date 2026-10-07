import { ASCII } from '@/lib/ascii';

// A imagem do blog desenhada com letras (gerada por `npm run ascii`). Ao passar o rato, a fotografia
// verdadeira aparece por baixo das letras. O tamanho da letra acompanha a largura da caixa.
export function AsciiBanner({ alt }: { alt: string }) {
  return (
    <figure role="img" aria-label={alt} className="ascii my-12 sm:my-14">
      <pre aria-hidden className="ascii-tinta ascii-largo">{ASCII.largo}</pre>
      <pre aria-hidden className="ascii-tinta ascii-estreito">{ASCII.estreito}</pre>
      <picture aria-hidden className="ascii-foto">
        <source type="image/avif" srcSet="/img/blog-hero-1280.avif 1280w, /img/blog-hero-2048.avif 2048w" sizes="(min-width: 900px) 832px, 100vw" />
        <source type="image/webp" srcSet="/img/blog-hero-1280.webp 1280w, /img/blog-hero-2048.webp 2048w" sizes="(min-width: 900px) 832px, 100vw" />
        <img src="/img/blog-hero-1280.jpg" srcSet="/img/blog-hero-1280.jpg 1280w, /img/blog-hero-2048.jpg 2048w" sizes="(min-width: 900px) 832px, 100vw" alt="" width={4096} height={2731} loading="lazy" decoding="async" />
      </picture>
    </figure>
  );
}
