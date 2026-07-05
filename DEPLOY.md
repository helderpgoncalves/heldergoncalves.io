# Deploy — heldergoncalves.io (Coolify)

Site estático Astro, servido na **porta 3000** por um container único (sem nginx).
Os posts do blog vêm do teu Substack e são gerados no build.

---

## 1. Criar a app no Coolify

1. **New Resource → Public/Private Repository**
   - Repo: `helderpgoncalves/heldergoncalves.io`
   - Branch: `main`
2. **Build Pack: `Dockerfile`** (o Coolify deteta o `EXPOSE 3000` sozinho).
   - Se pedir a porta: **Ports Exposes = `3000`**.
3. **Domínio:** `https://heldergoncalves.io`
   - O Coolify trata do SSL (Let's Encrypt) automaticamente.
4. **Deploy.**

O container publica `dist/` na porta 3000 via `serve`. Health check embutido no Dockerfile.

---

## 2. Auto-deploy a cada push (GitHub)

No Coolify, na app → **Webhooks / Git Source**:

- Ativa **"Automatic Deployment"** para a branch `main`.
- O Coolify configura um webhook no GitHub — cada `git push` à `main` refaz o site.

Se preferires configurar à mão, copia o **Deploy Webhook URL** que o Coolify mostra
(algo como `https://vps.heldergoncalves.io/api/v1/deploy?uuid=XXXX&force=false`) e
adiciona-o em GitHub → repo → Settings → Webhooks.

---

## 3. Automatizar a escrita: Substack → rebuild imediato

O site lê o feed do Substack **no build**. Escreves no Substack, o site refaz-se, o
post aparece em `heldergoncalves.io/blog`. Falta só disparar o rebuild quando publicas.

O Substack **não** dispara webhooks nativos de "novo post", por isso usa-se uma ponte.
Precisas do **Deploy Webhook URL** do Coolify (secção 2). Escolhe UMA das opções:

### Opção A — Zapier / Make (sem código, recomendado)

1. Trigger: **"New Post in Substack"** (por RSS: `https://helderpgoncalves.substack.com/feed`).
2. Action: **Webhooks → POST** para o Deploy Webhook URL do Coolify.

Assim que publicas no Substack, o Zap dispara e o Coolify refaz o site em segundos.
Latência típica: 1–15 min (depende do polling do RSS no Zapier/Make).

### Opção B — GitHub Action agendada (grátis, dentro do repo)

Já incluída em `.github/workflows/rebuild.yml`: corre de X em X tempo e, havendo
posts novos no feed, chama o Deploy Webhook do Coolify. Precisa de UM secret no repo:

- `COOLIFY_DEPLOY_HOOK` = o Deploy Webhook URL do Coolify.

Configura em: repo → Settings → Secrets and variables → Actions → New secret.

### Opção C — Cron no próprio Coolify

Na app do Coolify → **Scheduled Tasks**, cria uma tarefa que faz `curl` ao próprio
Deploy Webhook, ex. 1x por dia às 08:00:

```
0 8 * * *   curl -fsSL "$COOLIFY_DEPLOY_HOOK"
```

Mais simples, menos imediato (rebuild diário em vez de ao publicar).

---

## Notas

- **Feed vazio ou offline no build?** O site compila na mesma (o `substack.ts` é
  tolerante a falhas). Nunca quebra o deploy por causa do Substack.
- **Newsletter:** o formulário usa o embed oficial do Substack (`/embed`), estilizado
  para dark. Mantém a pessoa no site e trata de captcha/validação automaticamente.
- **Testar o build localmente:** `npm install && npm run build && npx serve -s dist -l 3000`.
