# heldergoncalves.io

Uma página. Diz quem sou e como me contactar, em português e inglês.

- **Astro**, saída estática, **sem JavaScript no cliente**.
- CSS inline no HTML: uma página, um pedido.
- Português na raiz (`/`), inglês em `/en/` — páginas reais, com `hreflang`,
  canonical, Open Graph e JSON-LD `Person`.
- Tema claro e escuro conforme o sistema. Sem cookies, sem analytics.

## Correr

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # gera dist/
```

## Editar

Está tudo em dois ficheiros:

| O quê | Onde |
| --- | --- |
| Texto (PT e EN), email, links | `src/siteConfig.ts` |
| Estilos | `src/styles/app.css` |

A estrutura da página vive em `src/layouts/Page.astro`; `src/pages/index.astro`
e `src/pages/en/index.astro` só escolhem o idioma.
