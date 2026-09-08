# Licenças e atribuições

O código deste site é de Hélder Gonçalves. O que vem de fora está aqui,
com a licença respetiva.

## Tipos de letra

| O quê   | Onde                          | Licença                                    |
| ------- | ----------------------------- | ------------------------------------------ |
| Inter   | `public/fonts/*.woff2`        | SIL Open Font License 1.1 — `public/fonts/OFL-Inter.txt` |

Nos dispositivos da Apple o site usa a **San Francisco do próprio sistema**,
através de `-apple-system`. Isso é uso legítimo: a fonte é do sistema
operativo do visitante e não é distribuída por nós. A SF **não** está neste
repositório, e não pode estar — a licença da Apple só permite usá-la para
desenhar para plataformas Apple.

## Ícones

| O quê                                                        | Onde                                  | Origem / licença |
| ------------------------------------------------------------- | -------------------------------------- | ---------------- |
| Finder, Notas, Mail, Terminal, Ações (Bolsa), Mensagens, Calendário, Contactos | `src/assets/icons/`  | ícones da Apple, extraídos com `iconutil` dos `.icns` das aplicações correspondentes, do macOS do próprio Hélder |
| Simulador                                                    | `src/assets/icons/simulator.png`      | ícone da Apple, extraído do `.icns` do Simulator (dentro do Xcode) |
| Safari                                                       | `src/assets/icons/safari.png`         | ícone da Apple, distribuído com o componente `mac-os-dock` de 21st.dev, usado ao abrigo da licença desse componente |
| Definições do Sistema                                        | `src/assets/icons/settings.png`       | ícone da Apple, da Wikipédia (`System_Preferences_icon.png`) |
| Contactos, Notas e Mail do iOS                               | `src/assets/icons/ios/`               | ícones da Apple, do Wikimedia Commons (`Contacts_iOS.svg`, `Apple_Notes_(iOS).png`, `Mail_(iOS).svg`) |
| Safari 26                                                    | `src/assets/icons/safari26.png`       | ícone da Apple, da Wikipédia (`Safari_Liquid_Glass_icon.png`) |
| Glifos dos restantes ícones (Lucide)                         | `src/components/os/IconSprite.astro`  | ISC |
| Marcas GitHub, LinkedIn, X (Simple Icons)                    | idem                                   | CC0 1.0 |

Os ícones das aplicações da Apple são os da Apple. A maioria vem de uma
fonte tão directa quanto possível: o `.icns` de cada aplicação, dentro
do próprio `.app`, no Mac do Hélder — nenhum ficheiro da Apple é
distribuído por nós, e o que está no repositório é uma extracção local
de um sistema licenciado, tal como uma captura de ecrã. Servem aqui as
aplicações Sobre (Finder no Mac, Contactos no iPhone), Escritos
(Notas), Contacto (Mail), Projetos (Safari), Terminal, Definições,
Bolsa, Mensagens, Calendário e Pessoas (Contactos). No iPhone mostram-se
as versões do iOS onde existem; o Terminal e o Simulador não existem no
iOS, e as Definições do iOS não estão em fonte pública — nesses casos o
iPhone mostra o ícone do Mac sem a margem. O número do dia no ícone do
Calendário é desenhado por nós em tempo real (`state.js`), como a
Apple faz no seu próprio sistema — o `.icns` só traz a grelha vazia.
Os ficheiros de imagem são reduzidos no build a 256 px em WebP — o
maior tamanho que estes `.icns` trazem no macOS actual, por isso não
há perda. Os restantes ícones (Reciclagem, o disco e o documento do
ambiente de trabalho) são desenhados aqui, a partir dos glifos do
Lucide, na geometria dos ícones da Apple — o cesto de lixo real da Dock
vive num asset catalog compilado (`Assets.car`) sem `.icns` extraível,
por isso fica como excepção desenhada à mão.

## Saudação do arranque

| O quê            | Onde                               | Origem / licença |
| ---------------- | ---------------------------------- | ---------------- |
| Traçado «hello»  | `src/components/os/Saudacao.astro` | componente `apple-hello-effect` de 21st.dev, usado ao abrigo da licença desse componente |
| Traçado «Olá»    | idem                               | desenhado aqui |

O «hello» é a caligrafia que a Apple mostra ao ligar um Mac pela
primeira vez, tal como está publicada nesse componente; o «Olá» é nosso,
na mesma métrica. A animação (traço a traço, `stroke-dashoffset`) é
escrita aqui, sem a biblioteca `motion` — o site não usa frameworks.

## A Dock

A ampliação da Dock segue a matemática do componente `mac-os-dock` de
21st.dev (janela de cosseno, fila reposta com os tamanhos novos, Dock a
alargar), reescrita em JavaScript sem React — ver
`src/scripts/os/mac/dock.js`.

### Natureza deste site

**heldergoncalves.io não tem fins comerciais.** Não vende nada, não tem
publicidade, não tem patrocínios, não tem afiliação, não recolhe dados, não
tem trackers e não gera receita — nem direta nem indireta. É a página pessoal
de uma pessoa, e a interface é uma **homenagem** aos sistemas da Apple, do
mesmo género que qualquer paródia de interface.

**Não há qualquer ligação à Apple Inc.** Este site não é feito, patrocinado,
autorizado nem aprovado pela Apple. Apple, iPhone, iOS, macOS, Mac, San
Francisco e os nomes e ícones das aplicações da Apple são marcas registadas
da Apple Inc., registadas nos Estados Unidos e noutros países. Todas as
marcas mencionadas pertencem aos respetivos donos.

Se alguém da Apple achar que alguma coisa aqui passa da conta:
helder@heldergoncalves.io — sai no próprio dia.

### O que é da Apple e o que não é

Sendo honesto sobre o que essa declaração vale: **não ter receita não dá
licença para usar obra protegida.** O uso não comercial reduz o risco na
prática, não cria direitos. Por isso a regra aqui é simples e não depende de
interpretações:

**Não há um único ficheiro da Apple neste repositório.** Nenhum ícone,
nenhuma fonte, nenhuma imagem, nenhum SF Symbol.

O que se seguiu da Apple é aquilo que qualquer um pode seguir:

- **A geometria.** O canto dos ícones é um superelipse, não um
  `border-radius`. É matemática, não obra protegida.
- **As proporções.** Margem de cerca de 10%, motivo principal a ocupar
  perto de dois terços do lado, traço na ordem dos 6%. São convenções de
  desenho, medidas e publicadas por meia internet.
- **Os valores das cores de sistema do iOS** (`#007AFF`, `#34C759`,
  `#FFCC00`, …). São números. A Apple, aliás, nem os publica como
  especificação — recomenda os nomes semânticos — e estes são os valores
  medidos pela comunidade.
- **O comportamento.** Como uma janela se arrasta, como uma aplicação abre a
  partir do ícone, como um painel desce. Ideias não se registam; expressões
  sim.

O que **não** se fez, de propósito: copiar ou recriar os ícones das
aplicações da Apple. O desenho do Safari, do Mail, das Mensagens — a bússola,
o envelope, o balão exatos — é obra da Apple e marca registada. Existem
repositórios com recriações desses ícones, alguns a dizer "livre para uso
pessoal"; quem os publica não tem direitos para os dar, e um `LICENSE` que
nós escrevêssemos também não passaria a ter. Os glifos aqui são do Lucide,
que é software livre, montados sobre a geometria acima.

O mesmo vale para os SF Symbols e para a San Francisco: a licença da Apple
só permite usá-los a desenhar para plataformas Apple. Nos dispositivos Apple
o site usa a SF do sistema do visitante, o que é legítimo; noutros usa a
Inter.

A maçã da barra de menus é a única citação gráfica, e é reconhecidamente uma
marca da Apple. Tira-se numa linha se for preciso.

## Dependências

| O quê             | Licença |
| ----------------- | ------- |
| Astro             | MIT     |
| @astrojs/sitemap  | MIT     |
| FastAPI           | MIT     |
| Starlette         | BSD-3-Clause |
| Uvicorn           | BSD-3-Clause |
| httpx             | BSD-3-Clause |
| yfinance          | Apache-2.0 |

O Astro e o `@astrojs/sitemap` só correm no build — geram `dist/`, e não
entram na imagem que corre em produção. Em produção corre só a API
(`api/app/`), com dependências mínimas e todas justificadas: nenhuma delas
é especulativa, e a segurança (`hmac`, `hashlib`, `secrets`) e as datas
(`zoneinfo`) usam só a biblioteca padrão do Python.

## O resto

© Hélder Gonçalves. Todos os direitos reservados — o texto, os escritos, o
desenho e o código deste site. Se quiseres abri-lo, acrescenta aqui uma
licença (a MIT chega para o código; o texto costuma ficar de fora).
