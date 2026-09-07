---
name: verificar
description: Corre as verificações estáticas deste repositório — tamanho dos ficheiros, se os imports batem certo com os exports, se o CSS está equilibrado, se as duas línguas têm as mesmas chaves, e se não entrou nenhum segredo. Usa isto sempre que acabares de mexer no código, e antes de qualquer commit. Substitui a suite de testes, que não existe.
allowed-tools: Bash(python3 .claude/skills/verificar/verificar.py)
---

## Resultado

!`python3 .claude/skills/verificar/verificar.py`

## O que fazer com isto

Se disse **Tudo certo**, está feito. Diz numa linha que passou e segue.

Se houver problemas, corrige-os antes de continuar — não são avisos, são
invariantes do projecto:

| Verificação | O que quer dizer |
| --- | --- |
| `tamanho` | um ficheiro passou das 400 linhas. Parte-o **por assunto**, não ao meio, e põe cada parte num ficheiro com nome próprio. |
| `imports do cliente` / `imports do servidor` | um `import` pede um nome que o outro ficheiro não exporta, ou aponta para um ficheiro que não existe. Quase sempre é um refactor a meio. |
| `css` | uma regra ficou partida — chavetas a menos ou a mais, ou um ficheiro que começa a meio de uma declaração. |
| `línguas` | acrescentaste texto num dos ficheiros de língua e não no outro. As duas andam a par, sempre. |
| `segredos` | há algo com forma de chave num ficheiro rastreado, ou `data/` entrou no repositório. **Pára tudo e resolve isto primeiro** — o repositório é público. |
| `órfãos` | um `import` aponta para um ficheiro que já não existe. |

Isto não corre o site, não constrói nada e não instala nada. É de
propósito: a máquina onde costuma correr está a servir produção.
