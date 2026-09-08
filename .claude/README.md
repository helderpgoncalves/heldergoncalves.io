# `.claude/`

A configuração do Claude Code para este repositório. Este ficheiro é
para humanos — não é carregado para contexto nenhum.

O princípio é um só: **cada coisa carrega quando é precisa, e não
antes.** O contexto de uma sessão é finito, e instruções que estão lá
sem serem precisas roubam espaço às que são.

```
CLAUDE.md               sempre em contexto        ~130 linhas
.claude/
  rules/                quando se toca nos ficheiros que o `paths:` nomeia
    apple.md              src/styles/**, src/components/os/**
    api.md                api/app/**, api/tests/**
    cliente.md            src/scripts/**
    texto.md              copy.*.ts, os.*.ts, content/blog/**, knowledge/**
  skills/               quando se invocam com /
    verificar/            as verificações estáticas — faz de suite de testes
    nova-app/             acrescentar uma aplicação
    nova-rota/            acrescentar um endpoint
    novo-escrito/         publicar um texto
    auditar-apple/        conferir o visual contra os valores da Apple
  settings.json         permissões partilhadas — vai para o repositório
  settings.local.json   permissões desta máquina — não vai
```

## Porque está repartido assim

**`CLAUDE.md`** só tem o que não se descobre a ler o código: as
invariantes, os porquês, e as armadilhas que já morderam. Árvores de
pastas, listas de dependências e descrições de arquitectura ficam de
fora de propósito — deduzem-se, e ocupavam contexto em todas as sessões
para dizer o que um `ls` diz melhor.

**`rules/`** tem o que só interessa a uma parte do código. Cada ficheiro
declara os caminhos a que se aplica no `paths:` do frontmatter, e só
entra em contexto quando se abre um ficheiro que bate certo. Quem está a
mexer no servidor não precisa das regras dos cantos da Apple na cabeça.

**`skills/`** tem os procedimentos — as coisas com passos. Carregam
quando se invocam. A `verificar` traz um script Python porque uma skill
pode trazer ficheiros a reboque; as `commands/` antigas não podiam, e é
por isso que não se usam aqui.

## Os dois ficheiros de permissões

`settings.json` vai para o repositório e vale para quem clonar: nega ler
`data/` e ficheiros de segredos, nega `push --force` e `reset --hard`, e
pede confirmação antes de qualquer `push`.

`settings.local.json` **não** vai, e é isso que interessa: a máquina onde
isto costuma correr está a servir produção, e lá não se constrói nem se
instala nada. Essa proibição é da máquina, não do projecto — pô-la no
ficheiro partilhado tornaria o repositório impossível de trabalhar para
quem o clonasse.

## Não há hooks

Um hook é um processo lançado a cada chamada de ferramenta que lhe bata
certo. Numa máquina que está a servir produção, isso é custo a mais para
o que se ganha. O que aqui seria um hook está feito com
`permissions.deny`, que o cliente aplica sem lançar nada.
