---
name: atualizar-dependencias
description: Atualiza dependências do site com segurança (npm audit, minor e patch em bloco, majors uma a uma com leitura das notas de versão) e valida tudo antes de fechar. Usa quando o Hélder pede para atualizar, quando há alertas de vulnerabilidade ou para rever um PR do Dependabot.
argument-hint: "[pacote opcional]"
allowed-tools: Read, Edit, Bash, Grep, WebFetch, Agent
---

# Atualizar dependências

1. `npm audit --omit=dev` e `npm outdated`. O Dependabot já agrupa minor e patch à segunda-feira.
2. Minor e patch: `npm update`. Majors: um de cada vez, lendo as notas de versão (Next, React, Tailwind e TypeScript
   são os que partem coisas). Para Next, lê também o guia de atualização oficial.
3. `npm audit fix` só se não forçar majors (`--force` nunca sem perguntar).
4. O Node da imagem acompanha `.nvmrc`, o CI e o `Dockerfile`; muda-se à mão, de LTS em LTS, nos três.
5. Corre a skill `verificar` e pede ao agente `guardiao-seguranca` que confirme que nada ficou exposto.
6. Se uma dependência deixou de ser usada, remove-a (`npm uninstall`). Não acrescentes nenhuma sem motivo forte.
