# Partilhar conhecimento e novidades

Nem todos os textos nascem de uma experiência do Hélder. Muitos são «descobri isto, explico-to, e é isto que acho». Aqui o valor está em **explicar bem, com factos verificados e com um ponto de vista**, não em contar a vida dele. A voz continua a ser dele (direta, curiosa, sem folheto), mas **não se inventa experiência**: nada de «testei durante um mês» ou «falei com um amigo» se ele não o disse.

## O que se pode e não se pode dizer em primeira pessoa

- Pode: o que o Hélder pensa («Parece-me que», «O que me chamou a atenção», «Não concordo com»), o que se fez a escrever o texto («Fui ler o relatório original», «Comparei os dois números»), dúvidas e limites («Não encontrei o dado de 2024»).
- Não pode, sem ele o ter dito: testes que não fez, clientes, conversas, memórias, usos pessoais de um produto, opiniões que não são dele.

## Tipos de texto

- **Novidade**: aconteceu isto, eis o que importa e o que não importa. Abre com o facto e a data. Diz depressa porque interessa a quem lê. Curto (300 a 700 palavras).
- **Explicador**: como funciona X, porque é que Y acontece. Parte de uma pergunta concreta que o leitor tem. Ensina uma coisa de cada vez, com um exemplo à mão (números reais, um ecrã, um passo a passo).
- **Resumo comentado**: vi/li isto longo, fica o essencial e a minha leitura. Nunca um resumo seco: tem de haver uma opinião.
- **Economia e mundo**: números com fonte, data e unidade; o que significam; o que o Hélder acha; o que mudaria a sua opinião.

## Estrutura que funciona

1. Primeira frase: o facto, a pergunta ou a opinião. Nada de introdução.
2. Porque interessa, em duas ou três frases.
3. O corpo: uma ideia por secção, exemplo antes de teoria.
4. **O que ainda não sabemos** (quando é novidade ou tema em aberto): honestidade sobre o que falta.
5. A leitura do Hélder: o que acha e porquê, curta.
6. `## Fontes` no fim: lista de ligações com o nome da fonte e o ano. Nada de URLs soltos.

## Padrão de factos

- **Fonte primária primeiro**: o comunicado, o relatório, o artigo científico, a documentação, o diploma no Diário da República, o repositório. Só depois a notícia sobre isso.
- **Duas fontes independentes** para qualquer afirmação contestável, surpreendente ou que mexa com dinheiro, saúde ou pessoas.
- **Cada número** leva fonte, data e unidade. Em economia diz-se se é nominal ou real, a preços de que ano, e de onde vem (INE, Pordata, Eurostat, BCE, Banco de Portugal, FMI, OCDE, o relatório da empresa). Arredonda-se de forma honesta.
- **Software**: versão exata, data de lançamento, e só se afirma que algo funciona se foi lido na documentação oficial ou testado. Comandos testados antes de entrarem.
- **Separar sempre** facto, estimativa e opinião. «Segundo a empresa», «de acordo com o INE», «a minha estimativa é».
- **Datas**: a novidade tem a data do acontecimento no texto, por extenso. O que pode mudar leva «à data de escrita (7 de outubro de 2026)». Quando mudar, atualiza-se e usa-se `atualizado`.
- **Citações**: curtas (uma frase), entre «», com ligação. Nunca parágrafos copiados. Tradução de citações assinala-se.
- **Imagens e gráficos de terceiros**: só com permissão e crédito. Preferir um gráfico próprio feito com os dados e a fonte indicada.
- Não se repete rumor, não se amplifica pânico, não se faz clickbait. Se a fonte for fraca, diz-se que é fraca ou não se escreve.

## Cabeçalho

- Um só artigo de origem: pode usar `fonte` (fica «Achado»). Várias fontes: não usar `fonte`, usar a secção `## Fontes`.
- Etiquetas pelo tema (Economia, Software, Inteligência artificial, Ciência…), não pelo formato.
- `notificar: false` por omissão.

## Verificação

`npm run texto -- <slug> --saber` (não exige voz pessoal; exige fontes com ligação e a secção Fontes).
