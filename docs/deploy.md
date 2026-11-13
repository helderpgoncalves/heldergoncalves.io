# Deploy no Coolify

Uma só aplicação serve tudo: a landing, o blog, a API da newsletter e a página de bio
(`bio.heldergoncalves.io`). Um contentor, ~40 MB de RAM em repouso (medido: 37 MB parado, 47 MB
depois de 300 pedidos em paralelo), imagem de ~280 MB.

## 1. DNS

Para **cada** domínio (`heldergoncalves.io` e `helder.si`), aponta para o IP do servidor do Coolify:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `@` | IP do servidor |
| A | `www` | IP do servidor |
| A | `bio` (só em `heldergoncalves.io`) | IP do servidor |

Se usas Cloudflare, deixa as linhas em **DNS only** (nuvem cinzenta): o Traefik do Coolify pede os
certificados por HTTP-01 e precisa de chegar ao servidor directamente.

## 2. Resend (newsletter)

1. Cria conta em <https://resend.com> e **verifica o domínio** `heldergoncalves.io` (acrescenta os registos
   SPF e DKIM que ele indica). Sem isto, o Resend não envia a partir de `@heldergoncalves.io`.
2. **Audience → Segments**: cria dois segmentos, `escritos-pt` e `escritos-en`. Copia o ID de cada um.
3. **API Keys**: cria uma chave. Copia-a (só aparece uma vez).
4. Gera o segredo dos links de confirmação: `openssl rand -base64 36`.

## 3. Aplicação no Coolify

1. **New Resource → Application** → o repositório (de preferência por GitHub App, para o auto-deploy).
2. **Build Pack: Dockerfile**. Porta: **3000**.
3. **Domains** (separados por vírgulas, com `https://`):

   ```
   https://heldergoncalves.io,https://www.heldergoncalves.io,https://bio.heldergoncalves.io,https://helder.si,https://www.helder.si
   ```

   O próprio site redireciona `helder.si` e `www.*` para `heldergoncalves.io` (308), por isso
   o Google vê um só domínio. Em *Direction*, deixa **Allow www & non-www**: a decisão é do Next.
4. **Environment Variables** — todas de `.env.example`:

   | Variável | Valor |
   | --- | --- |
   | `SITE_URL` | `https://heldergoncalves.io` |
   | `RESEND_API_KEY` | a chave |
   | `RESEND_SEGMENT_PT` / `RESEND_SEGMENT_EN` | os IDs dos segmentos |
   | `RESEND_FROM` | `Hélder Gonçalves <newsletter@heldergoncalves.io>` |
   | `NEWSLETTER_SECRET` | o segredo (≥ 32 caracteres) |
   | `NOTIFICAR` | `0` até testares; depois `1` |

   Marca-as como **Runtime only** (não precisam de existir no build).
5. **Health check**: não configures nada. O `Dockerfile` já tem um `HEALTHCHECK` (`/api/health`) e o Coolify usa-o;
   a imagem tem `wget`. Se falhar, o Coolify não troca de versão.
6. **Resources → Limits**: memória `256M`, CPU `0.5`. Chega e sobra.
7. **Post-deployment command**: `node scripts/notificar.mjs`
   (avisa os subscritores dos artigos novos — ver abaixo).
8. **Advanced → Auto Deploy**: ligado. Cada `git push` na `main` faz deploy.

## 4. Publicar um texto e avisar os subscritores

1. Cria o ficheiro em `content/pt/<slug>.md` (e, se quiseres, `content/en/<slug>.md`):

   ```yaml
   ---
   titulo: "O título"
   resumo: "Uma ou duas frases. Aparece na lista, no Google e no e-mail."
   data: 2026-10-20          # AAAA-MM-DD
   etiquetas: [Inteligência artificial, Ofício]
   par: slug-do-mesmo-texto-noutra-lingua   # opcional: liga as traduções (hreflang)
   fonte:                                   # opcional: para notas de leitura
     nome: "Nome do texto — Autor, ano"
     url: https://…
   # rascunho: true      → não aparece em lado nenhum
   # notificar: false    → publica, mas não avisa os subscritores
   ---

   O corpo em Markdown…
   ```

   Aspas à volta do título e do resumo, sempre: um `:` sem aspas parte o cabeçalho (o build avisa).
2. `git push`. O Coolify constrói e troca de versão.
3. No fim do deploy, `scripts/notificar.mjs` corre sozinho. Para cada texto novo **agenda** um e-mail para
   daqui a 15 minutos (o artigo já está no ar quando a carta chega), para o segmento da língua do artigo.

**Sem base de dados:** o Resend é o registo. Cada aviso é um broadcast chamado `artigo:<lang>:<slug>`; se já
existir, o artigo salta-se. Um segundo deploy nunca repete um envio.

**Salvaguardas** (enviar e-mail não se desfaz):
- só envia com `NOTIFICAR=1`; com qualquer outro valor é sempre um ensaio;
- só avisa artigos com `data` nos últimos 7 dias (`NOTIFICAR_JANELA_DIAS`), para um deploy antigo não reenviar o arquivo;
- se não conseguir ler o que já foi enviado, não envia nada;
- nunca falha o deploy: o resultado fica nos logs do *Post-deployment command*.

Primeiro uso: deixa `NOTIFICAR=0`, publica um artigo e lê nos logs `avisaria: artigo:pt:…`. Quando estiver certo, `NOTIFICAR=1`.

À mão: `npm run notificar -- --dry` (ensaio local) e `npm run enviar -- <slug> --lang pt [--ver | --agora]`
(sem opção, cria um rascunho no Resend para reveres no painel).

## 5. Página de bio (`bio.heldergoncalves.io`)

`proxy.ts` lê o `Host` e `bio.heldergoncalves.io/x` passa a `/s/bio/x` (a pasta `app/(bio)/s/bio/`). O domínio
principal nunca serve `/s/*`. Basta o registo DNS `bio` e acrescentar `https://bio.heldergoncalves.io` aos
**Domains** do Coolify. Em desenvolvimento vê-se em `http://bio.localhost:3100`.

## 6. Verificar depois do deploy

```bash
curl -s https://heldergoncalves.io/api/health                   # {"ok":true}
curl -sI https://helder.si/blog | grep -i -E "^HTTP|^location"   # 308 → heldergoncalves.io/blog
curl -sI https://heldergoncalves.io | grep -i -E "strict-transport|content-security"
npm run verificar -- https://heldergoncalves.io                 # sitemap, hreflang, canonical, feeds e redirects, URL a URL
curl -s https://heldergoncalves.io/blog/feed.xml | head
```

O `npm run verificar` percorre o sitemap inteiro e confirma, em cada página, que o `canonical`, o `hreflang` (nos dois sentidos),
o `<html lang>`, o `noindex`, o título, a descrição, o Open Graph e o JSON-LD batem certo com o sitemap. Falha (código 1) se alguma coisa não bater.

Google Search Console: acrescenta `heldergoncalves.io` como **propriedade de domínio** e submete `/sitemap.xml`.
`helder.si` só redireciona; podes juntá-lo como propriedade para acompanhares, sem sitemap.
Partilha de teste: <https://developers.facebook.com/tools/debug/> e o validador de dados estruturados do Google.

## 7. O que ainda é teu

- **Testar com o Resend a sério.** O fluxo todo foi testado de ponta a ponta contra um servidor-falso que imita a API
  (subscrever → e-mail de confirmação → botão → contacto no segmento; 409 → reactivar; aviso de artigos), mas não
  contra o Resend verdadeiro: não há chave nesta máquina. Faz uma subscrição com o teu e-mail antes de divulgar.
- **Limites de pedidos em memória.** Servem para travar abusos óbvios (6 pedidos/10 min por IP, 3/hora por e-mail) e
  contam por instância; com uma só, como aqui, chegam. Com várias réplicas, passa para o Resend/Redis.
- **CSP com `'unsafe-inline'`** nos scripts: o Next precisa dele para arrancar sem *nonces*. O resto está preso a `'self'`.
- Um link de confirmação válido pode ser usado mais do que uma vez durante 48 horas (é idempotente). Quem cancela a
  subscrição e abre o e-mail antigo nesse prazo volta a subscrever-se.
- Rollback: no Coolify, *Deployments → Redeploy* da versão anterior. E-mails já enviados não se desfazem.

## 8. Blog: URLs e línguas

O blog vive em `/blog` (PT) e `/en/blog` (EN). Os URLs antigos (`/escritos/*`, `/en/articles/*`) redirecionam (308) para os novos.
Para acrescentar uma língua: uma entrada em `linguas`, `copy` e `rotas` (`lib/copy.ts`), as pastas de rotas dessa língua e `content/<lang>/`.
O sitemap, o `hreflang`, o RSS e o `robots` percorrem `linguas`, por isso já a incluem, e `npm run verificar` confirma.
