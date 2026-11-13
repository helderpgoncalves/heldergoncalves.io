---
name: limpar-repo
description: Limpa o repositório de tudo o que não é usado em produção (ficheiros, imagens, exports, scripts, dependências, docs e variáveis de ambiente órfãs) e mantém README, docs e CLAUDE.md coerentes. Usa quando o Hélder diz "limpa", "remove o lixo", "o que não é usado" ou depois de remover uma funcionalidade.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, Agent
---

# Limpar o repositório

1. `npm run lixo` para os candidatos. Delega a análise e a remoção ao agente `faxineiro`, ou faz tu.
2. Confirma cada achado com `git grep` (pelo nome e pelo prefixo: há nomes montados por template).
3. Remove com `git rm`; depois procura referências órfãs em README, `docs/`, `CLAUDE.md`, `.env.example`,
   `Dockerfile`, `.github/`, `next.config.ts` e `proxy.ts`.
4. Variáveis de ambiente: cada entrada de `.env.example` tem de ser lida por `git grep process.env`, e vice-versa.
5. Corre a skill `verificar`. Só no fim mostra o resumo do que saiu.

Nunca apagues `content/`, `fonte/` nem `.claude/`. Não faças commit sem o Hélder pedir (usa `lancar`).
