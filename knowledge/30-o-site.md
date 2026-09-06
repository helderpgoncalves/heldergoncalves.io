# Como este site foi feito

Não é uma página: é um sistema operativo. No telemóvel comporta-se como um
iPhone — ecrã bloqueado, ecrã inicial com páginas e widgets, gestos,
Central de Controlo, comutador de aplicações. No computador comporta-se como
um Mac — barra de menus, Dock com ampliação, janelas que se arrastam,
redimensionam e encaixam nas margens, pesquisa em ⌘K.

Dentro dele há um Simulador que corre o próprio site num iPhone — e dentro
desse iPhone há outro. Até dois níveis.

## A decisão que segura tudo

O conteúdo das aplicações é HTML normal, gerado pelo Astro. O JavaScript não
desenha conteúdo: apenas move esses blocos para dentro de uma janela do Mac
ou de uma vista do telefone. Por isso o site continua legível sem
JavaScript, o Google lê cada escrito no seu URL, e mudar de modo não perde
estado.

## Números

- Zero frameworks, zero bibliotecas de animação, zero tracking.
- Zero dependências a correr em produção: o servidor usa só módulos internos
  do Node.
- Astro para gerar, um container só para servir.

## Ícones e fontes

Nenhum ficheiro da Apple. Os glifos são do Lucide (licença ISC), as marcas
do Simple Icons (CC0). Nos dispositivos Apple a fonte é a San Francisco do
próprio sistema; nos outros é a Inter. Ver o ficheiro NOTICE.md.
