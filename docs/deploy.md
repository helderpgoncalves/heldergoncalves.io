# Deploy no Coolify

Uma só aplicação serve tudo: a landing, os escritos, a API da newsletter e todas as mini-apps
(`<nome>.heldergoncalves.io`). Um contentor, ~40 MB de RAM em repouso (medido: 37 MB parado, 47 MB
depois de 300 pedidos em paralelo), imagem de ~280 MB.

## 1. DNS

Para **cada** domínio (`heldergoncalves.io` e `helder.si`), aponta para o IP do servidor do Coolify:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `@` | IP do servidor |
| A | `www` | IP do servidor |
| A | `lab` (e uma por mini-app) | IP do servidor |

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
   https://heldergoncalves.io,https://www.heldergoncalves.io,https://helder.si,https://www.helder.si
   ```

   O próprio site redireciona `helder.si`, `www.*` e `*.helder.si` para `heldergoncalves.io` (308), por isso
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

## 4. Publicar um artigo e avisar os subscritores

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
3. No fim do deploy, `scripts/notificar.mjs` corre sozinho. Para cada artigo novo **agenda** um e-mail para
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

## 5. Mini-apps em subdomínios

```bash
npm run nova-app -- lab "Experiências e mini-apps."
```

Cria `app/(lab)/s/lab/` (layout próprio, página, `robots.txt`) e regista-a em `lib/apps.ts` como **inactiva**.
Em desenvolvimento vê-se em `http://lab.localhost:3100`. Para a pôr no ar:

1. escreve a app; em `lib/apps.ts` põe `ativo: true`; em `layout.tsx` põe `robots: { index: true }`;
2. no Coolify acrescenta aos **Domains** `https://lab.heldergoncalves.io,https://lab.helder.si` e cria o registo DNS `lab`;
3. `git push`.

Como funciona: `proxy.ts` lê o `Host`, e `lab.heldergoncalves.io/x` passa a `/s/lab/x`. O apex nunca serve `/s/*`.
Um subdomínio inactivo ou desconhecido responde 404 a tudo. Cada mini-app tem o seu próprio layout de raiz
(outro aspecto, outra língua, o que quiseres) e partilha o mesmo processo — por isso não custa RAM.

**Wildcard (opcional):** só vale a pena com muitas mini-apps. Exige certificado por **DNS-01** (HTTP-01 não emite
wildcards): configura o resolver `letsencrypt` do Traefik com o teu fornecedor de DNS e acrescenta em
*Servers → Proxy → Dynamic Configurations* um router `HostRegexp(`[a-z0-9-]+\.heldergoncalves.io`)` com
`tls.domains: [{ main: heldergoncalves.io, sans: ['*.heldergoncalves.io'] }]`
(ver <https://coolify.io/docs/knowledge-base/proxy/traefik/wildcard-certs>). Depois basta pôr
`https://lab.heldergoncalves.io` em cada app.

## 6. Verificar depois do deploy

```bash
curl -s https://heldergoncalves.io/api/health                   # {"ok":true}
curl -sI https://helder.si/escritos | grep -i -E "^HTTP|^location"   # 308 → heldergoncalves.io/escritos
curl -sI https://heldergoncalves.io | grep -i -E "strict-transport|content-security"
curl -s https://heldergoncalves.io/sitemap.xml | head
curl -s https://heldergoncalves.io/escritos/feed.xml | head
```

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
