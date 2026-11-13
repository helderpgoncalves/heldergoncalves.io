---
name: lancar
description: Verifica, faz commit e push das alterações para a main (o Coolify faz deploy a cada push). Usa só quando o Hélder pede para publicar, lançar, fazer commit ou push.
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob, Agent
---

# Lançar

1. `git status` e `git diff`: percebe o que vai sair. Nunca incluas `.env*`, `data/` nem ficheiros gerados.
2. Corre a skill `verificar`. Se falhar, para e diz porquê.
3. `git pull --ff-only` antes do commit; se houver conflitos, resolve-os lendo os dois lados.
4. Commit em português, no estilo do histórico (`git log --oneline -10`): `tipo(âmbito): o que mudou e porquê`.
   Sem linhas de atribuição. Um commit por assunto.
5. `git push`. Cada push na `main` faz deploy, por isso confirma com o Hélder se a alteração mexe em API, domínios,
   variáveis de ambiente ou no `Dockerfile`.
6. Depois do deploy: `curl -s https://heldergoncalves.io/api/health` deve dar `{"ok":true}`.
