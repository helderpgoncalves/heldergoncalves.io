// ─────────────────────────────────────────────────────────────
// Identidade, estrutura do "sistema" e todos os textos das duas
// línguas. Português na raiz, inglês em /en/. Nada de copy solta
// dentro dos componentes: muda-se aqui, muda em todo o lado.
// ─────────────────────────────────────────────────────────────
export const SITE = {
  url: 'https://heldergoncalves.io',
  name: 'Hélder Gonçalves',
  shortName: 'Hélder',
  email: 'helder@heldergoncalves.io',
  ogImage: '/og.png',
  github: 'https://github.com/helderpgoncalves',
  githubHandle: 'helderpgoncalves',
  linkedin: 'https://www.linkedin.com/in/heldergoncalves16/',
  twitter: 'https://x.com/heldinhoshotgun',
  twitterHandle: '@heldinhoshotgun',
  company: { name: 'Bitsapiens', url: 'https://bitsapiens.io/' },
  machine: 'heldergoncalves.io',
};

export type Lang = 'pt' | 'en';
export type AppId =
  | 'sobre'
  | 'escritos'
  | 'mensagens'
  | 'contacto'
  | 'projetos'
  | 'terminal'
  | 'definicoes'
  | 'simulador';

/**
 * Estrutura de cada aplicação: onde vive, que tamanho tem a janela no
 * Mac e em que ordem aparece na Dock e no ecrã inicial do telefone.
 * Os nomes e descrições estão em COPY[lang].apps — isto é só a mecânica.
 */
export interface AppMeta {
  id: AppId;
  /** Tamanho e mínimo da janela no modo Mac, em píxeis. */
  win: { w: number; h: number; minW: number; minH: number };
  /** Posição inicial da janela (offset em cascata). */
  dock: boolean;
  /** Fica na dock do telefone (as quatro de baixo) em vez da grelha. */
  iosDock: boolean;
  /** Janela sem margens internas (Terminal, Simulador). */
  bare?: boolean;
  /** Abre no arranque do Mac. */
}

export const APPS: AppMeta[] = [
  { id: 'sobre', win: { w: 720, h: 520, minW: 420, minH: 360 }, dock: true, iosDock: false },
  { id: 'escritos', win: { w: 940, h: 620, minW: 560, minH: 380 }, dock: true, iosDock: true },
  { id: 'mensagens', win: { w: 700, h: 560, minW: 420, minH: 380 }, dock: true, iosDock: true },
  { id: 'contacto', win: { w: 660, h: 540, minW: 420, minH: 380 }, dock: true, iosDock: true },
  { id: 'projetos', win: { w: 860, h: 600, minW: 480, minH: 380 }, dock: true, iosDock: false },
  { id: 'terminal', win: { w: 720, h: 460, minW: 380, minH: 240 }, dock: true, iosDock: true, bare: true },
  { id: 'definicoes', win: { w: 760, h: 540, minW: 460, minH: 380 }, dock: true, iosDock: false },
  { id: 'simulador', win: { w: 420, h: 780, minW: 340, minH: 620 }, dock: true, iosDock: false, bare: true },
];

export const appMeta = (id: AppId): AppMeta => APPS.find((a) => a.id === id) as AppMeta;

export const COPY = {
  pt: {
    htmlLang: 'pt-PT',
    locale: 'pt_PT',
    intlLocale: 'pt-PT',
    title: 'Hélder Gonçalves — Engenheiro de software e IA',
    description:
      'Engenheiro de software em Barcelos, Portugal. Construo produtos e ferramentas com modelos de linguagem, agentes e automação — e escrevo sobre isso. O site é um sistema operativo: no telemóvel um iPhone, no computador um Mac.',
    keywords:
      'engenheiro de software, developer, inteligência artificial, agentes de IA, LLM, MCP, automação, TypeScript, Python, Portugal, Barcelos, blog',
    role: 'Engenheiro de software',
    place: 'Barcelos, Portugal',
    skip: 'Saltar para o conteúdo',
    switch: 'English',
    footer: 'Feito com Astro, sem frameworks e sem cookies.',

    intro:
      'Sou o Hélder. Construo software — e, cada vez mais, software com modelos de linguagem lá dentro: agentes, servidores MCP e automação que poupa trabalho a quem o faz.',
    intro2:
      'De dia trabalho na Bitsapiens, em sistemas que ligam pessoas, dados e IA. De noite ando pelos meus projetos: um servidor MCP que lê a app Stocks do macOS, uma ponte para pilotar o Claude Code a partir de um Garmin, um bot que transforma conversa de comunidade em backlog. Quase tudo em código aberto.',
    intro3:
      'Prefiro entregas pequenas e frequentes a planos grandes. Aqui escrevo o que aprendo pelo caminho — sem cerimónia, sem newsletter, sem cookies.',

    // ── O sistema ───────────────────────────────────────────
    os: {
      macName: 'helderOS',
      phoneName: 'iHelder',
      booting: 'A arrancar',
      unlock: 'Deslizar para abrir',
      unlockShort: 'Deslizar',
      lockHint: 'Toca ou desliza para cima',
      welcome: 'Bem-vindo',
      openApp: 'Abrir',
      close: 'Fechar',
      minimize: 'Minimizar',
      zoom: 'Ecrã inteiro',
      back: 'Voltar',
      done: 'Concluído',
      search: 'Pesquisar',
      searchHint: '↩ para abrir · esc para fechar',
      searchApps: 'Aplicações',
      searchPosts: 'Escritos',
      searchLinks: 'Ligações',
      searchEmpty: 'Sem resultados',
      noWindows: 'Nenhuma janela aberta. Escolhe uma aplicação na Dock.',
      trash: 'Reciclagem',
      trashEmpty: 'A Reciclagem está vazia. Como deve ser.',
      desktopHd: 'Disco de Hélder',
      desktopCv: 'Currículo.pdf',
      hintMac: 'Arrasta as janelas · ⌘K para pesquisar',
      hintPhone: 'Toca num ícone · desliza para cima para voltar',
      appSwitcher: 'Aplicações abertas',
      notifications: 'Notificações',
      wallpaperNames: { aurora: 'Aurora', sonoma: 'Serra', night: 'Noite', graphite: 'Grafite' },
      today: 'Hoje',
      menus: {
        apple: [
          { label: 'Sobre este Mac', action: 'open:sobre' },
          { label: 'Definições do Sistema…', action: 'open:definicoes' },
          { label: '—', action: '' },
          { label: 'Escrever ao Hélder…', action: 'mail' },
          { label: 'GitHub', action: 'link:github' },
          { label: '—', action: '' },
          { label: 'Reiniciar…', action: 'restart' },
        ],
        window: [
          { label: 'Minimizar', action: 'minimize' },
          { label: 'Ecrã inteiro', action: 'zoom' },
          { label: 'Fechar janela', action: 'close' },
          { label: '—', action: '' },
          { label: 'Aplicações abertas…', action: 'switcher' },
          { label: 'Arrumar janelas', action: 'tile' },
          { label: 'Fechar tudo', action: 'closeAll' },
        ],
        help: [
          { label: 'Pesquisar (⌘K)', action: 'spotlight' },
          { label: 'Mudar para inglês', action: 'lang' },
          { label: 'Mudar o tema', action: 'theme' },
          { label: '—', action: '' },
          { label: 'Como isto foi feito', action: 'open:sobre' },
        ],
      },
      menuLabels: { window: 'Janela', help: 'Ajuda' },
      control: {
        title: 'Central de Controlo',
        theme: 'Aparência',
        light: 'Claro',
        dark: 'Escuro',
        wallpaper: 'Fundo',
        lang: 'Idioma',
        brightness: 'Brilho',
        focus: 'Concentração',
        focusOn: 'Só o essencial',
        airplane: 'Modo avião',
        wifi: 'Wi‑Fi',
        offline: 'Sem rede — o site continua a funcionar.',
      },
      battery: 'Bateria',
      wifi: 'Wi‑Fi',
    },

    // ── Aplicações ──────────────────────────────────────────
    apps: {
      sobre: { name: 'Sobre Mim', subtitle: 'Quem escreve isto', window: 'Sobre Mim' },
      escritos: { name: 'Escritos', subtitle: 'Notas sobre o que construo', window: 'Escritos' },
      mensagens: { name: 'Mensagens', subtitle: 'Perguntas rápidas', window: 'Mensagens' },
      contacto: { name: 'Contacto', subtitle: 'Falar comigo', window: 'Nova mensagem' },
      projetos: { name: 'Projetos', subtitle: 'O que ando a construir', window: 'Projetos' },
      terminal: { name: 'Terminal', subtitle: 'Para quem gosta de teclado', window: 'helder — zsh' },
      definicoes: { name: 'Definições', subtitle: 'Tema, idioma e fundo', window: 'Definições' },
      simulador: { name: 'Simulador', subtitle: 'Um iPhone dentro do site', window: 'Simulador — iPhone' },
    },

    sobre: {
      lead: 'Engenheiro de software em Barcelos. Construo produtos com modelos de linguagem lá dentro.',
      specs: 'Especificações',
      specRole: 'Função',
      specPlace: 'Localização',
      specCompany: 'Empresa',
      specStack: 'Ferramentas',
      specStackValue: 'TypeScript · Python · Astro · Docker · Postgres · MCP',
      specSince: 'A programar desde',
      specSinceValue: 'sempre que houve teclado por perto',
      more: 'Mais sobre este site',
      colophon:
        'Este site é um sistema operativo. No telemóvel comporta-se como um iPhone, no computador como um Mac — janelas que se arrastam, uma Dock que aumenta, uma Central de Controlo que funciona a sério. Está feito em Astro, HTML e CSS, com JavaScript escrito à mão e zero frameworks. Todo o texto que aqui está é HTML normal por baixo: funciona sem JavaScript e o Google lê-o na mesma.',
      buttonWrite: 'Escrever-me',
      buttonProjects: 'Ver projetos',
    },

    escritos: {
      heading: 'Escritos',
      title: 'Escritos',
      description:
        'Notas de Hélder Gonçalves sobre engenharia de software, modelos de linguagem, agentes, MCP e automação.',
      lead: 'Notas sobre engenharia, modelos de linguagem e as ferramentas que construo. Sem calendário fixo — só quando há alguma coisa que valha a pena dizer.',
      empty: 'Ainda nada publicado. Está a caminho.',
      pick: 'Escolhe um escrito à esquerda.',
      feed: 'Assinar por RSS',
      all: 'Todos os escritos',
      count: 'escritos',
      readingTime: 'min de leitura',
      updated: 'Atualizado a',
      readOther: 'Read this in English',
      tags: 'Temas',
      talk: 'Discordas ou queres continuar a conversa?',
      talkLink: 'Escreve-me.',
      backToList: '← Escritos',
    },

    contacto: {
      lead: 'A forma mais rápida é o email. Respondo a tudo o que tenha contexto.',
      to: 'Para',
      from: 'De',
      subject: 'Assunto',
      subjectValue: 'Olá Hélder',
      body: 'Mensagem',
      placeholder: 'Escreve aqui. Ao enviar, isto abre o teu email com tudo já preenchido — não há servidor nenhum a guardar nada.',
      send: 'Enviar',
      sendHint: 'Abre a tua aplicação de email',
      elsewhere: 'Noutros sítios',
      copied: 'Email copiado',
      copy: 'Copiar email',
      sending: 'A enviar…',
      sent: 'Mensagem enviada. Obrigado — respondo em breve.',
      failed: 'Não consegui enviar daqui. Abri a tua aplicação de email.',
      limit: 'Já foram muitas mensagens deste sítio. Tenta daqui a pouco.',
      invalid: 'Falta um email válido para eu poder responder.',
      short: 'Escreve um pouco mais — dá-me contexto.',
      honeypot: 'Deixa este campo vazio',
    },

    projetos: {
      lead: 'Coisas que construí porque me faziam falta. Quase tudo em código aberto.',
      open: 'Abrir no GitHub',
      all: 'Ver tudo no GitHub',
      list: [
        {
          name: 'MCP para a app Stocks',
          tagline: 'O Claude a ler a minha carteira',
          body: 'Um servidor MCP que lê a base de dados local da aplicação Stocks do macOS e devolve as carteiras e cotações a qualquer modelo. Sem API paga, sem scraping: os dados já estavam no disco.',
          tags: ['MCP', 'Swift', 'macOS'],
        },
        {
          name: 'Garmin → Claude Code',
          tagline: 'Pilotar o portátil a partir da bicicleta',
          body: 'Uma ponte que transforma o ciclocomputador Garmin num controlo remoto do Claude Code: lanço tarefas, recebo o resultado no ecrã do guiador. Nasceu de uma piada e ficou a funcionar.',
          tags: ['Garmin', 'TypeScript', 'Agentes'],
        },
        {
          name: 'Conversa → backlog',
          tagline: 'Comunidade que se transforma em produto',
          body: 'Um bot que lê a conversa de uma comunidade, percebe o que são pedidos reais e escreve issues limpas com contexto e prioridade. Menos "alguém tinha dito isto no Discord".',
          tags: ['LLM', 'Python', 'Automação'],
        },
        {
          name: 'Este site',
          tagline: 'Um sistema operativo em 60 KB',
          body: 'O que estás a ver. Astro para o conteúdo, JavaScript à mão para as janelas, a Dock, os gestos e o telefone dentro do telefone. Sem React, sem bibliotecas de animação, sem tracking.',
          tags: ['Astro', 'CSS', 'Sem frameworks'],
        },
      ],
    },

    mensagens: {
      lead: 'Perguntas rápidas, respostas rápidas.',
      contactName: 'Hélder',
      status: 'normalmente responde no mesmo dia',
      placeholder: 'Escolhe uma pergunta…',
      typing: 'a escrever…',
      delivered: 'Entregue',
      restart: 'Recomeçar',
      opener: 'Olá! Isto sou eu em versão automática. Pergunta o que quiseres — ou escreve-me a sério pelo email.',
      chat: [
        {
          q: 'O que fazes exatamente?',
          a: 'Construo software com modelos de linguagem lá dentro: agentes que fazem trabalho a sério, servidores MCP que ligam modelos a dados que já existem, e automação que tira tarefas chatas das mãos das pessoas.',
        },
        {
          q: 'Estás disponível para trabalhar?',
          a: 'De dia estou na Bitsapiens. Fora disso ouço sempre projetos com prazo realista e problema interessante — sobretudo se envolver agentes, dados ou produto do zero.',
        },
        {
          q: 'Que ferramentas usas?',
          a: 'TypeScript e Python para quase tudo. Astro para sites, Docker e Coolify para pôr no ar, Postgres quando há dados a sério. E muito Claude Code — passei a escrever menos código à mão e a rever muito mais.',
        },
        {
          q: 'Como é que este site foi feito?',
          a: 'Astro gera HTML estático e o resto é JavaScript escrito à mão: janelas que se arrastam, Dock com ampliação, gestos do telefone. Zero frameworks. Abre o Terminal e escreve "sobre" se quiseres os detalhes.',
        },
        {
          q: 'Onde é que escreves?',
          a: 'Aqui mesmo, na aplicação Escritos. Há feed RSS e não há newsletter — prefiro que venhas quando te apetecer.',
        },
        {
          q: 'Posso mandar-te um email?',
          a: 'Claro. helder@heldergoncalves.io — respondo a tudo o que traga contexto. Abre a app Contacto que já vai preenchido.',
        },
      ],
    },

    definicoes: {
      appearance: 'Aparência',
      appearanceHint: 'Claro, escuro ou o que o teu sistema pedir.',
      auto: 'Automático',
      light: 'Claro',
      dark: 'Escuro',
      wallpaper: 'Fundo',
      wallpaperHint: 'Escolhe o ambiente. Fica guardado neste dispositivo.',
      language: 'Idioma',
      languageHint: 'Muda o site inteiro, incluindo os escritos.',
      motion: 'Animações',
      motionHint: 'Desliga as transições se preferires o site quieto.',
      motionOn: 'Ligadas',
      motionOff: 'Reduzidas',
      sound: 'Som',
      soundHint: 'Cliques discretos ao abrir e fechar aplicações.',
      reset: 'Repor tudo',
      resetHint: 'Volta ao estado de fábrica e recarrega.',
      about: 'Sobre este sistema',
      version: 'Versão',
      wallpapers: {
        aurora: 'Aurora',
        sonoma: 'Serra',
        night: 'Noite',
        graphite: 'Grafite',
      },
    },

    terminal: {
      welcome: 'Escreve "ajuda" para ver o que isto faz.',
      unknown: 'comando não encontrado:',
      hint: 'Sugestão:',
      help: [
        ['ajuda', 'esta lista'],
        ['sobre', 'quem sou eu'],
        ['escritos', 'listar os escritos'],
        ['ler <n>', 'abrir o escrito número n'],
        ['projetos', 'o que ando a construir'],
        ['contacto', 'como falar comigo'],
        ['abrir <app>', 'abrir uma aplicação'],
        ['tema claro|escuro', 'mudar a aparência'],
        ['idioma pt|en', 'mudar de língua'],
        ['data', 'que dia é hoje'],
        ['neofetch', 'as specs desta máquina'],
        ['limpar', 'limpar o ecrã'],
      ],
      sudo: 'Boa tentativa. Este utilizador não está na lista de sudoers — o incidente vai ser reportado.',
      openedApp: 'a abrir',
      noApp: 'não há aplicação com esse nome.',
      noPost: 'não há escrito com esse número.',
    },

    notFound: {
      title: 'Página não encontrada',
      lead: 'Este endereço não existe — ou já não existe.',
      home: 'Ir para o início',
      blog: 'Ver os escritos',
      code: 'Erro 404',
      dialog: 'A aplicação não pode ser aberta porque o ficheiro não foi encontrado.',
      ok: 'OK',
    },

    labels: { github: 'GitHub', linkedin: 'LinkedIn', twitter: 'X', email: 'Email', rss: 'RSS' },
  },

  en: {
    htmlLang: 'en',
    locale: 'en_GB',
    intlLocale: 'en-GB',
    title: 'Hélder Gonçalves — Software & AI engineer',
    description:
      'Software engineer based in Barcelos, Portugal. I build products and tools around language models, agents and automation — and I write about it. This site is an operating system: an iPhone on mobile, a Mac on desktop.',
    keywords:
      'software engineer, developer, artificial intelligence, AI agents, LLM, MCP, automation, TypeScript, Python, Portugal, blog',
    role: 'Software engineer',
    place: 'Barcelos, Portugal',
    skip: 'Skip to content',
    switch: 'Português',
    footer: 'Built with Astro, no frameworks and no cookies.',

    intro:
      "I'm Hélder. I build software — and, more and more, software with language models inside it: agents, MCP servers, and automation that saves real people real work.",
    intro2:
      'By day I work at Bitsapiens on systems that connect people, data and AI. The rest of the time I build my own things: an MCP server that reads the macOS Stocks app, a bridge to steer Claude Code from a Garmin bike computer, a bot that turns community chat into a product backlog. Almost all of it open source.',
    intro3:
      'I prefer small frequent deliveries to big plans. This is where I write down what I learn along the way — no ceremony, no newsletter, no cookies.',

    os: {
      macName: 'helderOS',
      phoneName: 'iHelder',
      booting: 'Starting up',
      unlock: 'Swipe up to open',
      unlockShort: 'Swipe up',
      lockHint: 'Tap or swipe up',
      welcome: 'Welcome',
      openApp: 'Open',
      close: 'Close',
      minimize: 'Minimise',
      zoom: 'Full screen',
      back: 'Back',
      done: 'Done',
      search: 'Search',
      searchHint: '↩ to open · esc to close',
      searchApps: 'Applications',
      searchPosts: 'Writing',
      searchLinks: 'Links',
      searchEmpty: 'No results',
      noWindows: 'No windows open. Pick something from the Dock.',
      trash: 'Trash',
      trashEmpty: 'The Trash is empty. As it should be.',
      desktopHd: "Hélder's Disk",
      desktopCv: 'Résumé.pdf',
      hintMac: 'Drag the windows · ⌘K to search',
      hintPhone: 'Tap an icon · swipe up to go home',
      appSwitcher: 'Open apps',
      notifications: 'Notifications',
      wallpaperNames: { aurora: 'Aurora', sonoma: 'Ridge', night: 'Night', graphite: 'Graphite' },
      today: 'Today',
      menus: {
        apple: [
          { label: 'About This Mac', action: 'open:sobre' },
          { label: 'System Settings…', action: 'open:definicoes' },
          { label: '—', action: '' },
          { label: 'Write to Hélder…', action: 'mail' },
          { label: 'GitHub', action: 'link:github' },
          { label: '—', action: '' },
          { label: 'Restart…', action: 'restart' },
        ],
        window: [
          { label: 'Minimise', action: 'minimize' },
          { label: 'Full screen', action: 'zoom' },
          { label: 'Close window', action: 'close' },
          { label: '—', action: '' },
          { label: 'Open apps…', action: 'switcher' },
          { label: 'Tile windows', action: 'tile' },
          { label: 'Close everything', action: 'closeAll' },
        ],
        help: [
          { label: 'Search (⌘K)', action: 'spotlight' },
          { label: 'Switch to Portuguese', action: 'lang' },
          { label: 'Switch theme', action: 'theme' },
          { label: '—', action: '' },
          { label: 'How this was built', action: 'open:sobre' },
        ],
      },
      menuLabels: { window: 'Window', help: 'Help' },
      control: {
        title: 'Control Centre',
        theme: 'Appearance',
        light: 'Light',
        dark: 'Dark',
        wallpaper: 'Wallpaper',
        lang: 'Language',
        brightness: 'Brightness',
        focus: 'Focus',
        focusOn: 'Essentials only',
        airplane: 'Aeroplane mode',
        wifi: 'Wi‑Fi',
        offline: 'Offline — the site still works.',
      },
      battery: 'Battery',
      wifi: 'Wi‑Fi',
    },

    apps: {
      sobre: { name: 'About Me', subtitle: 'Who writes this', window: 'About Me' },
      escritos: { name: 'Writing', subtitle: 'Notes on what I build', window: 'Writing' },
      mensagens: { name: 'Messages', subtitle: 'Quick questions', window: 'Messages' },
      contacto: { name: 'Contact', subtitle: 'Get in touch', window: 'New message' },
      projetos: { name: 'Projects', subtitle: 'What I am building', window: 'Projects' },
      terminal: { name: 'Terminal', subtitle: 'For keyboard people', window: 'helder — zsh' },
      definicoes: { name: 'Settings', subtitle: 'Theme, language, wallpaper', window: 'Settings' },
      simulador: { name: 'Simulator', subtitle: 'An iPhone inside the site', window: 'Simulator — iPhone' },
    },

    sobre: {
      lead: 'Software engineer in Barcelos. I build products with language models inside them.',
      specs: 'Specifications',
      specRole: 'Role',
      specPlace: 'Location',
      specCompany: 'Company',
      specStack: 'Tooling',
      specStackValue: 'TypeScript · Python · Astro · Docker · Postgres · MCP',
      specSince: 'Coding since',
      specSinceValue: 'whenever there was a keyboard nearby',
      more: 'More about this site',
      colophon:
        'This site is an operating system. On a phone it behaves like an iPhone, on a computer like a Mac — windows you can drag, a Dock that magnifies, a Control Centre that genuinely works. It is built with Astro, HTML and CSS, with hand-written JavaScript and zero frameworks. Everything you read is plain HTML underneath: it works without JavaScript and search engines read it just the same.',
      buttonWrite: 'Write to me',
      buttonProjects: 'See projects',
    },

    escritos: {
      heading: 'Writing',
      title: 'Writing',
      description:
        'Notes by Hélder Gonçalves on software engineering, language models, agents, MCP and automation.',
      lead: 'Notes on engineering, language models and the tools I build. No schedule — only when there is something worth saying.',
      empty: 'Nothing published yet. Soon.',
      pick: 'Pick something from the list.',
      feed: 'Subscribe via RSS',
      all: 'All writing',
      count: 'pieces',
      readingTime: 'min read',
      updated: 'Updated on',
      readOther: 'Ler em português',
      tags: 'Topics',
      talk: 'Disagree, or want to keep the conversation going?',
      talkLink: 'Write to me.',
      backToList: '← Writing',
    },

    contacto: {
      lead: 'Email is the fastest way. I answer anything that comes with context.',
      to: 'To',
      from: 'From',
      subject: 'Subject',
      subjectValue: 'Hello Hélder',
      body: 'Message',
      placeholder: 'Write here. Sending opens your own email app with everything filled in — there is no server storing anything.',
      send: 'Send',
      sendHint: 'Opens your email app',
      elsewhere: 'Elsewhere',
      copied: 'Email copied',
      copy: 'Copy email',
      sending: 'Sending…',
      sent: 'Message sent. Thank you — I will reply soon.',
      failed: 'I could not send it from here. I opened your email app instead.',
      limit: 'That is a lot of messages from here. Try again in a bit.',
      invalid: 'I need a valid email address to reply to.',
      short: 'Write a little more — give me some context.',
      honeypot: 'Leave this field empty',
    },

    projetos: {
      lead: 'Things I built because I needed them. Almost all of it open source.',
      open: 'Open on GitHub',
      all: 'Everything on GitHub',
      list: [
        {
          name: 'Stocks app MCP',
          tagline: 'Claude reading my portfolio',
          body: 'An MCP server that reads the local database of the macOS Stocks app and hands portfolios and quotes to any model. No paid API, no scraping: the data was already on disk.',
          tags: ['MCP', 'Swift', 'macOS'],
        },
        {
          name: 'Garmin → Claude Code',
          tagline: 'Driving the laptop from a bike',
          body: 'A bridge that turns a Garmin bike computer into a remote control for Claude Code: I fire off tasks and read the result on the handlebar screen. It started as a joke and kept working.',
          tags: ['Garmin', 'TypeScript', 'Agents'],
        },
        {
          name: 'Chat → backlog',
          tagline: 'Community turned into product',
          body: 'A bot that reads a community chat, works out which messages are real requests and writes clean issues with context and priority. Less "someone mentioned this on Discord once".',
          tags: ['LLM', 'Python', 'Automation'],
        },
        {
          name: 'This site',
          tagline: 'An operating system in 60 KB',
          body: 'What you are looking at. Astro for the content, hand-written JavaScript for the windows, the Dock, the gestures and the phone inside the phone. No React, no animation library, no tracking.',
          tags: ['Astro', 'CSS', 'No frameworks'],
        },
      ],
    },

    mensagens: {
      lead: 'Quick questions, quick answers.',
      contactName: 'Hélder',
      status: 'usually replies the same day',
      placeholder: 'Pick a question…',
      typing: 'typing…',
      delivered: 'Delivered',
      restart: 'Start over',
      opener: 'Hello! This is me in automatic mode. Ask away — or write to me properly by email.',
      chat: [
        {
          q: 'What do you actually do?',
          a: 'I build software with language models inside it: agents that do real work, MCP servers that connect models to data that already exists, and automation that takes dull tasks off people.',
        },
        {
          q: 'Are you available for work?',
          a: 'By day I am at Bitsapiens. Outside that I always listen to projects with a realistic deadline and an interesting problem — especially anything involving agents, data or building a product from zero.',
        },
        {
          q: 'What tools do you use?',
          a: 'TypeScript and Python for nearly everything. Astro for sites, Docker and Coolify to ship them, Postgres when there is serious data. And a lot of Claude Code — I now write less code by hand and review a great deal more.',
        },
        {
          q: 'How was this site built?',
          a: 'Astro generates static HTML and the rest is hand-written JavaScript: draggable windows, a magnifying Dock, phone gestures. Zero frameworks. Open the Terminal and type "about" if you want the details.',
        },
        {
          q: 'Where do you write?',
          a: 'Right here, in the Writing app. There is an RSS feed and no newsletter — I would rather you came when you felt like it.',
        },
        {
          q: 'Can I email you?',
          a: 'Of course. helder@heldergoncalves.io — I answer anything that comes with context. Open the Contact app and it is already filled in.',
        },
      ],
    },

    definicoes: {
      appearance: 'Appearance',
      appearanceHint: 'Light, dark, or whatever your system asks for.',
      auto: 'Automatic',
      light: 'Light',
      dark: 'Dark',
      wallpaper: 'Wallpaper',
      wallpaperHint: 'Pick the scenery. It is remembered on this device.',
      language: 'Language',
      languageHint: 'Changes the whole site, writing included.',
      motion: 'Motion',
      motionHint: 'Turn the transitions off if you prefer the site still.',
      motionOn: 'On',
      motionOff: 'Reduced',
      sound: 'Sound',
      soundHint: 'Quiet clicks when apps open and close.',
      reset: 'Reset everything',
      resetHint: 'Back to factory settings, then reload.',
      about: 'About this system',
      version: 'Version',
      wallpapers: {
        aurora: 'Aurora',
        sonoma: 'Ridge',
        night: 'Night',
        graphite: 'Graphite',
      },
    },

    terminal: {
      welcome: 'Type "help" to see what this does.',
      unknown: 'command not found:',
      hint: 'Try:',
      help: [
        ['help', 'this list'],
        ['about', 'who I am'],
        ['writing', 'list the writing'],
        ['read <n>', 'open piece number n'],
        ['projects', 'what I am building'],
        ['contact', 'how to reach me'],
        ['open <app>', 'open an application'],
        ['theme light|dark', 'change the appearance'],
        ['lang pt|en', 'change language'],
        ['date', 'what day it is'],
        ['neofetch', 'the specs of this machine'],
        ['clear', 'clear the screen'],
      ],
      sudo: 'Nice try. This user is not in the sudoers file — this incident will be reported.',
      openedApp: 'opening',
      noApp: 'no application by that name.',
      noPost: 'no piece with that number.',
    },

    notFound: {
      title: 'Page not found',
      lead: 'This address does not exist — or does not exist any more.',
      home: 'Go home',
      blog: 'Read the writing',
      code: 'Error 404',
      dialog: 'The application cannot be opened because the file was not found.',
      ok: 'OK',
    },

    labels: { github: 'GitHub', linkedin: 'LinkedIn', twitter: 'X', email: 'Email', rss: 'RSS' },
  },
} as const;

// Rotas por língua, num sítio só.
export const ROUTES = {
  pt: { home: '/', blog: '/blog/', feed: '/rss.xml' },
  en: { home: '/en/', blog: '/en/blog/', feed: '/en/rss.xml' },
} as const;

export const other = (lang: Lang): Lang => (lang === 'pt' ? 'en' : 'pt');

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(COPY[lang].intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Links externos, na ordem em que aparecem em todo o lado. */
export function socialLinks(lang: Lang) {
  const l = COPY[lang].labels;
  return [
    { id: 'email', label: l.email, value: SITE.email, href: `mailto:${SITE.email}` },
    { id: 'github', label: l.github, value: SITE.githubHandle, href: SITE.github },
    { id: 'linkedin', label: l.linkedin, value: 'heldergoncalves16', href: SITE.linkedin },
    { id: 'twitter', label: l.twitter, value: SITE.twitterHandle, href: SITE.twitter },
  ];
}
