// A imagem do blog já é ASCII (fonte/blog-ascii.png): mostra-se tal como é, em AVIF/WebP/JPEG.
// É a maior imagem da página, por isso carrega logo (fetchPriority) e reserva o espaço (3:2).
const sizes = '(min-width: 900px) 832px, calc(100vw - 3rem)';

export function CapaBlog({ alt }: { alt: string }) {
  return (
    <figure className="capa-blog">
      <picture>
        <source type="image/avif" srcSet="/img/blog-hero-1280.avif 1280w, /img/blog-hero-2048.avif 2048w" sizes={sizes} />
        <source type="image/webp" srcSet="/img/blog-hero-1280.webp 1280w, /img/blog-hero-2048.webp 2048w" sizes={sizes} />
        <img src="/img/blog-hero-1280.jpg" srcSet="/img/blog-hero-1280.jpg 1280w, /img/blog-hero-2048.jpg 2048w" sizes={sizes} alt={alt} width={2048} height={1366} fetchPriority="high" decoding="async" />
      </picture>
    </figure>
  );
}
