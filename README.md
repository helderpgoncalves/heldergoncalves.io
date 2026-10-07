# heldergoncalves.io

[![CI](https://github.com/helderpgoncalves/heldergoncalves.io/actions/workflows/ci.yml/badge.svg)](https://github.com/helderpgoncalves/heldergoncalves.io/actions/workflows/ci.yml)

O site de Hélder Gonçalves: landing, blog, newsletter, comentários e a casa das mini-apps em subdomínios.
Next.js 16 (App Router) e Tailwind 4, em português e inglês, **sem base de dados**.

| | |
| --- | --- |
| [heldergoncalves.io](https://heldergoncalves.io) | o site e o blog (domínio canónico) |
| [bio.heldergoncalves.io](https://bio.heldergoncalves.io) | a página de ligações, leve e pensada para o telemóvel |
| `helder.si` | redireciona (308) para o canónico; as mini-apps vivem em `<nome>.helder.si` |

## Começar

Precisas de Node 22 (`.nvmrc`).

```bash
npm install
cp .env.example .env.local   # só é preciso para testar newsletter e comentários
npm run dev                  # http://127.0.0.1:3100
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run rascunhos` | o mesmo, mas mostra os textos com `rascunho: true` (nunca indexáveis, só em local) |
| `npm run build` | compila em modo `standalone` (em produção corre-se a imagem do `Dockerfile`) |
| `npm run typecheck` | TypeScript |
| `npm run texto [-- <slug>]` | revê os textos: português de Portugal, travessões, tiques de máquina, marcadores por preencher |
| `npm run verificar [-- <url>]` | verifica o SEO de ponta a ponta a partir do sitemap (contra o dev ou contra produção) |
| `npm run imagens` | gera as versões do hero a partir de `fonte/hero.png` |
| `npm run imagem-bio` | gera o fundo leve da bio para telemóvel |
| `npm run imagens-blog` | prepara as imagens dos textos a partir de `fonte/blog/` |
| `npm run ascii` | gera as versões da imagem do blog a partir de `fonte/blog-ascii.png` |
| `npm run icone` | gera os ícones |
| `npm run nova-app -- <nome> ["<descrição>"]` | cria uma mini-app em `<nome>.helder.si` |
| `npm run enviar -- <slug> --lang pt` | cria o rascunho de um texto como newsletter no Resend |
| `npm run notificar -- --dry` | ensaio do aviso automático de textos novos |

Antes de publicar: `npm run typecheck && npm run texto && npm run build`. O CI faz o mesmo e ainda corre `npm audit`.

## Estrutura

```
app/(pt)/  app/(en)/en/      landing, blog e confirmação, uma pasta por língua
app/(bio)/s/bio/             a página de bio
app/(<mini-app>)/s/<sub>/    cada mini-app, com layout próprio
app/api/                     subscribe, confirm, comentarios, health
components/  lib/            interface e lógica; lib/copy.ts tem todos os textos nas duas línguas
content/pt|en/*.md           os textos do blog, em Markdown com cabeçalho YAML
scripts/                     imagens, verificações, newsletter, nova-app
proxy.ts                     subdomínio → pasta da mini-app
docs/                        blog.md (escrever) e deploy.md (publicar)
```

## Como funciona

- **Blog:** Markdown com cabeçalho YAML, séries, rascunhos, etiquetas, índice, código com realce e imagens responsivas
  (AVIF, WebP e JPEG em vários tamanhos). Um texto que ligue a outro inexistente ou em rascunho faz o build falhar,
  em vez de publicar um 404. Formato completo em [`docs/blog.md`](docs/blog.md).
- **SEO:** `canonical` e `hreflang` em todas as páginas, sitemap com `lastmod` verdadeiro, RSS por língua, JSON-LD
  (`Person`, `WebSite`, `Blog`, `BlogPosting`, `BreadcrumbList`), Open Graph, `manifest` e `security.txt`.
- **Newsletter:** dupla confirmação sem base de dados (token assinado com HMAC e botão `POST`, para que os antivírus que
  abrem ligações não subscrevam ninguém). Os contactos ficam no Resend, num segmento por língua.
- **Comentários:** qualquer pessoa escreve, mas o comentário só é publicado quando confirma o e-mail, o que também a
  subscreve. Depois fica com uma sessão de 60 dias neste navegador e comenta direto. Vivem num ficheiro no volume
  `/data`; o e-mail nunca é guardado, só um identificador anónimo.
- **Textos novos:** depois de cada deploy, `scripts/notificar.mjs` agenda o e-mail dos textos ainda não avisados
  (o Resend é o registo). Só com `NOTIFICAR=1`.
- **Segurança:** CSP, HSTS, `X-Frame-Options` e `Permissions-Policy`; Markdown sem HTML cru nem `javascript:`;
  origem verificada, limites de tamanho e de pedidos, isco para robôs; contentor `read_only` e sem privilégios.
- **Dependências:** o Dependabot propõe as atualizações à segunda-feira, agrupadas (`.github/dependabot.yml`).

## Publicar

A imagem do `Dockerfile` corre num só contentor (cerca de 40 MB de RAM em repouso) no Coolify. DNS, Resend, variáveis
de ambiente e verificação pós-deploy estão em [`docs/deploy.md`](docs/deploy.md); as variáveis, comentadas, em
[`.env.example`](.env.example).

## Escrever

O fluxo de escrita usa uma skill local do Claude Code (`/novo-post`) e agentes de redação, revisão e tradução.
Ficam fora do repositório; o que interessa para quem escreve à mão está em [`docs/blog.md`](docs/blog.md).
