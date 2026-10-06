# heldergoncalves.io

Landing page, escritos e newsletter de Hélder Gonçalves — e a casa das mini-apps em subdomínios.
Next.js 16 (App Router) + Tailwind 4, em português e inglês. Sem base de dados.

**Domínios:** `heldergoncalves.io` (canónico) e `helder.si` (redireciona, 308). Mini-apps em `<nome>.heldergoncalves.io`.

## Correr

```bash
npm install
cp .env.example .env.local     # só preciso dele para testar a newsletter
npm run dev                    # http://127.0.0.1:3100
```

| | |
| --- | --- |
| `npm run build` | compila (modo `standalone`; em produção corre-se a imagem do `Dockerfile`) |
| `npm run typecheck` | TypeScript |
| `npm run imagens` | regenera as versões AVIF/WebP/JPEG a partir de `fonte/hero.png` |
| `npm run nova-app -- <nome> ["<descrição>"]` | cria uma mini-app em `<nome>.heldergoncalves.io` |
| `npm run enviar -- <slug> --lang pt` | cria o rascunho de um artigo como newsletter no Resend |
| `npm run notificar -- --dry` | ensaio do aviso automático de artigos novos |

## Onde está cada coisa

```
app/(pt)/ app/(en)/en/   landing, escritos e confirmação, uma pasta por língua
app/(<mini-app>)/s/<sub>/ cada mini-app, com layout próprio (ver docs/deploy.md §5)
app/api/                 subscribe, confirm, health
proxy.ts                 subdomínio → pasta da mini-app
content/pt|en/*.md       os artigos, em Markdown com cabeçalho YAML
lib/copy.ts              todos os textos, nas duas línguas (o TypeScript exige as mesmas chaves)
lib/apps.ts              registo das mini-apps
scripts/                 imagens, enviar, notificar, nova-app
Dockerfile               imagem de produção (~280 MB, ~40 MB de RAM)
```

## Como funciona (em curto)

- **Imagem:** a original (4096 px) gera AVIF 4:4:4, WebP e JPEG em 4 tamanhos; o HTML serve a certa por `<picture>`.
- **SEO:** `canonical` + `hreflang` em todas as páginas, sitemap com alternativas, `robots`, RSS por língua, JSON-LD
  (`Person`, `WebSite`, `Blog`, `BlogPosting`, `BreadcrumbList`), Open Graph, `manifest`, `security.txt`.
- **Newsletter:** dupla confirmação sem base de dados (token assinado com HMAC + botão `POST`, para os antivírus que
  abrem links não subscreverem ninguém). Os contactos ficam no Resend, num segmento por língua.
- **Artigos novos:** depois de cada deploy, `scripts/notificar.mjs` agenda o e-mail dos artigos que ainda não foram
  avisados (o Resend é o registo). Só com `NOTIFICAR=1`.
- **Segurança:** CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`; markdown sem HTML cru nem `javascript:`;
  origem verificada, limites de tamanho e de pedidos, isco para robôs; contentor `read_only`, sem privilégios.

**Deploy:** [`docs/deploy.md`](docs/deploy.md).
