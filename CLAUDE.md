# heldergoncalves.io

Site pessoal de Hélder Gonçalves: landing, blog bilingue (PT/EN), newsletter e a página de bio
(`bio.heldergoncalves.io`). Next.js 16 (App Router), Tailwind 4, TypeScript, **sem base de dados**. Um só
contentor Docker no Coolify. Visão geral em `README.md`, deploy em `docs/deploy.md`, escrita em `docs/blog.md`.

## Comandos

- `npm run dev` (http://127.0.0.1:3100) · `npm run rascunhos` mostra textos com `rascunho: true`
- Porta de qualidade, por esta ordem: `npm run typecheck && npm run texto && npm run lixo && npm run build`
- `npm run verificar [-- <url>]` valida SEO de ponta a ponta (precisa do servidor a correr)
- Imagens: `imagens`, `imagem-bio`, `imagens-blog`, `ascii`, `icone` (geram `public/img` a partir de `fonte/`)
- Newsletter: `enviar`, `notificar` (ver `docs/deploy.md`)

## Regras que não se discutem

- **Português de Portugal** em tudo o que o leitor vê e nos comentários de código; acentos sempre. Sem travessões
  (— e –), sem brasileirismos, sem tiques de texto de máquina. `npm run texto` barra estas falhas nos textos.
- Todos os textos da interface estão em `lib/copy.ts`, nas duas línguas. Nunca texto solto em componentes.
- Sem base de dados e sem dependências novas sem motivo forte: cada uma pesa no contentor (~40 MB de RAM).
- Segurança: CSP e cabeçalhos em `next.config.ts`; Markdown sem HTML cru; `origemPermitida` em todos os POST.
- Segredos só em `.env.local`/Coolify; nunca no repositório. `.env.example` documenta todas as variáveis.
- Um texto que ligue a outro inexistente ou em rascunho faz o build falhar: é de propósito.
- Não deixes lixo: ficheiros, exports, imagens ou dependências sem uso saem no mesmo commit (`npm run lixo`).

## Mapa

- `app/(pt)`, `app/(en)/en`: landing e blog por língua · `app/(bio)/s/bio`: bio (servida por `proxy.ts` no host `bio.*`)
- `app/api/*`: subscribe, confirm, health · `app/md`, `llms.txt`, `openapi.json`, `.well-known`: descoberta para agentes
- `components/`, `lib/`: interface e lógica · `content/pt|en/*.md`: os textos · `content/imagens.json`: imagens dos textos
- `scripts/`: ferramentas de linha de comandos · `fonte/`: originais das imagens (fora da imagem Docker)

## Agentes e skills (`.claude/`)

Skills: `novo-post` (escrever), `verificar` (porta de qualidade), `limpar-repo` (lixo), `atualizar-dependencias`,
`lancar` (commit e push). Agentes: `redator-blog`, `revisor-blog`, `tradutor-blog`, `pesquisador-blog`,
`auditor-site` (SEO e acessibilidade), `guardiao-seguranca` (segurança e dependências), `faxineiro` (lixo).
