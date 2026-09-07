---
paths:
  - "src/config/copy.*.ts"
  - "src/config/os.*.ts"
  - "src/content/blog/**/*.md"
  - "knowledge/**/*.md"
---

# O texto

## As duas línguas andam a par

`copy.pt.ts` e `copy.en.ts` têm **exactamente** as mesmas chaves. O
`copy.ts` junta-as com `const EN_TYPED: Copy = EN`, e é o TypeScript que
recusa se uma faltar de um dos lados.

Acrescentar texto é acrescentá-lo **nos dois ficheiros**, na mesma
posição. Nunca só num.

## Português de Portugal

Não é a mesma língua que o do Brasil, e o site é de Barcelos.

- **Ecrã**, não tela. **Ficheiro**, não arquivo. **Rato**, não mouse.
  **Carregar**, não clicar. **Telemóvel**, não celular.
- Gerúndio quase nunca: «está a correr», não «está correndo».
- Os nomes das aplicações seguem os do sistema em português — a Apple
  diz *Definições*, *Mensagens*, *Mail*, *Acerca de*.

## O tom

Curto, directo, sem entusiasmo a fingir. Nada de «excelente pergunta»,
nada de emojis, nada de exclamações a mais. Uma frase que não acrescenta
nada apaga-se.

Isto vale para o texto do site, para os comentários no código, e para as
mensagens de commit.

## Os escritos

Um ficheiro Markdown por texto, em `src/content/blog/pt/` ou `/en/`.
Ver `/novo-escrito` para o frontmatter e o que é obrigatório.

Um texto em português **não precisa** de gémeo em inglês. Quando tem,
os dois ficheiros usam o mesmo nome, e o site liga-os sozinho.

## O que o assistente sabe

`knowledge/*.md`. Um assunto por ficheiro, com um `# Título` na primeira
linha — é esse título que o agente vê no índice.

Ensinar-lhe uma coisa nova é criar um ficheiro. **Não há código a
mexer**, e não há prompt escondido no meio do JavaScript. O tecto é de
48 KB no total; passando disso, os ficheiros do fim são ignorados sem
aviso, por ordem alfabética.
