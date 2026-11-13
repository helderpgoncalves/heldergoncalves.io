---
name: verificar
description: Corre a porta de qualidade do site (typecheck, revisão dos textos, lixo, build) e opcionalmente a auditoria de SEO. Usa antes de publicar, depois de qualquer alteração ao código ou aos textos, ou quando o Hélder diz "verifica", "está tudo bem?" ou "testa isto".
allowed-tools: Read, Grep, Glob, Bash, Agent
---

# Verificar o site

Corre por esta ordem e pára no primeiro erro, corrigindo a causa (não o sintoma):

1. `npm ci --no-audit --no-fund` se não houver `node_modules`.
2. `npm run typecheck`
3. `npm run texto` (português de Portugal, travessões, marcadores por preencher, cabeçalhos)
4. `npm run lixo` (nada sem uso)
5. `npm run build` (apanha textos com cabeçalho mal escrito e ligações para textos inexistentes)
6. `npm audit --omit=dev --audit-level=high`

Se a alteração mexeu em rotas, metadados, imagens ou textos novos, pede também ao agente `auditor-site` que
corra `npm run verificar` e devolva os problemas. Se mexeu em `app/api` ou `lib/api.ts`, pede ao `guardiao-seguranca`.

No fim, apaga o que o build gerou e é ignorado (`.next`) se o Hélder não o quiser, e responde com uma linha por
passo: ✓ ou o erro, com ficheiro e linha.
