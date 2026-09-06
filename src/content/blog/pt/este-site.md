---
title: 'Como este site é feito'
description: 'Astro, zero JavaScript por omissão, duas línguas com URLs próprios e os projetos puxados do GitHub no build. Um colofão honesto — e as razões de cada escolha.'
date: 2026-09-06
tags: ['Astro', 'Web', 'SEO']
translationKey: 'colophon'
---

Um site pessoal é o sítio onde não há desculpa para código mau. Ninguém manda, não há prazo, e ninguém vai ver o que está por baixo — o que é precisamente a razão para o fazer bem.

## Astro, e quase nada mais

O site é estático. Não há framework de interface, não há bundle de React à espera para hidratar, não há analytics a seguir ninguém. O HTML sai pronto do build e o browser só tem de o desenhar.

O pouco JavaScript que existe é para três coisas: mudar o tema, abrir a paleta de comandos com `⌘K` e pouco mais. Tudo o resto — navegação, conteúdo, língua — funciona com o JavaScript desligado.

## Duas línguas, duas páginas

A versão anterior trocava o texto no browser com `data-pt` e `data-en`. Ficava bonito e era inútil: o Google indexava uma versão só, e uma ligação partilhada abria sempre em português.

Agora o português vive na raiz e o inglês em `/en/`. São páginas diferentes, geradas no build, cada uma com o seu `title`, a sua descrição, o seu Open Graph e um `hreflang` a apontar para a irmã. É mais trabalho a escrever. É a única forma que funciona.

## Os projetos vêm do GitHub

A lista de trabalho não está escrita à mão. No build, o site pergunta ao GitHub quais são os repositórios, quantas estrelas têm e quando foram tocados pela última vez. Se a API não responder, usa os valores guardados no repositório e o build passa na mesma.

Assim a página envelhece sozinha na direção certa: faço commit num projeto, o próximo deploy mostra-o.

## O que fica de fora

Sem cookies. Sem trackers. Sem newsletter alojada por terceiros. Sem pop-ups a pedir o email antes de deixar ler.

Se quiseres falar comigo, o email está no fim da página.
