// As línguas do site. O sitemap, o hreflang e o feed percorrem esta lista: para acrescentar uma
// língua basta uma entrada em `copy` e em `rotas`, as pastas de rotas e `content/<lang>/`.
export const linguas = ['pt', 'en'] as const;
export type Lang = (typeof linguas)[number];
export const linguaPadrao: Lang = 'pt'; // a do x-default

// Um só tipo para as duas línguas: se faltar uma chave numa delas, o TypeScript recusa.
export type Copy = {
  titulo: string;
  descricao: string;
  nome: string;
  frases: readonly (readonly [string, string])[];
  contacto: string;
  imagem: string;
  trocar: string;
  trocarRotulo: string;
  navBlog: string;
  blog: {
    titulo: string;
    descricao: string;
    cabeca: string;
    intro: string;
    vazio: string;
    min: string;
    voltar: string;
    feed: string;
    tradLabel: string;
    fonteLabel: string;
    achado: string;          // etiqueta dos textos sobre algo que encontrei (têm `fonte`)
    achadoEm: string;        // "Encontrei isto em"
    indice: string;          // "Neste texto"
    atualizado: string;
    partilhar: string;
    copiarLigacao: string;
    ligacaoCopiada: string;
    copiarCodigo: string;
    codigoCopiado: string;
    relacionados: string;
    antes: string;
    depois: string;
    etiquetas: string;       // "Temas"
    etiquetaTitulo: (nome: string) => string;
    etiquetaDescricao: (nome: string, n: number) => string;
    etiquetaCabeca: string;
    textos: (n: number) => string;
  };
  form: {
    rotulo: string;
    placeholder: string;
    botao: string;
    aEnviar: string;
    enviado: string;
    invalido: string;
    erro: string;
    limite: string;
    nota: string;
  };
  confirmar: {
    titulo: string;
    texto: string;
    botao: string;
    aConfirmar: string;
    ok: [string, string];
    invalido: [string, string];
    erro: [string, string];
    voltar: string;
  };
  mail: { assunto: string; titulo: string; texto: string; botao: string; ignora: string; rodape: string };
};

export const copy = {
  pt: {
    titulo: 'Hélder Gonçalves',
    descricao: 'Software que pensa antes de falar. Um blog sobre tecnologia, inteligência artificial e ofício — e sobre o que me vai na cabeça.',
    nome: 'Hélder Gonçalves',
    frases: [
      ['Software que pensa', 'antes de falar.'],
      ['Máquinas que sabem', 'quando parar.'],
      ['Inteligência com', 'bom senso.'],
      ['Construo o que', 'ainda não existe.'],
      ['Menos ruído,', 'mais sinal.'],
      ['Escrevo código', 'para durar.'],
    ],
    contacto: 'Contacto',
    imagem: 'Uma figura sentada numa colina florida, a olhar o vale ao pôr do sol.',
    trocar: 'EN',
    trocarRotulo: 'Read in English',
    navBlog: 'Blog',
    blog: {
      titulo: 'Blog',
      descricao: 'Um espaço onde partilho ideias, falo de coisas e, às vezes, desabafo: tecnologia, inteligência artificial, ofício — e o que me vai na cabeça.',
      cabeca: 'Blog',
      intro: 'Um espaço onde partilho ideias, falo de coisas e, às vezes, desabafo. Tecnologia, inteligência artificial, ofício — e o que me vai na cabeça. Uma carta de vez em quando, sem spam.',
      vazio: 'Ainda não há nada publicado.',
      min: 'min de leitura',
      voltar: 'Todo o blog',
      feed: 'RSS',
      tradLabel: 'Also in English',
      fonteLabel: 'Fonte',
      achado: 'Achado',
      achadoEm: 'Encontrei isto em',
      indice: 'Neste texto',
      atualizado: 'Atualizado a',
      partilhar: 'Partilhar',
      copiarLigacao: 'Copiar ligação',
      ligacaoCopiada: 'Ligação copiada',
      copiarCodigo: 'Copiar',
      codigoCopiado: 'Copiado',
      relacionados: 'Para continuar',
      antes: 'Antes deste',
      depois: 'Depois deste',
      etiquetas: 'Temas',
      etiquetaTitulo: (nome) => `${nome} · Blog`,
      etiquetaDescricao: (nome, n) => `${n === 1 ? 'O texto' : `Os ${n} textos`} do blog de Hélder Gonçalves no tema «${nome}».`,
      etiquetaCabeca: 'Tema',
      textos: (n) => (n === 1 ? '1 texto' : `${n} textos`),
    },
    form: {
      rotulo: 'Recebe os próximos por e-mail',
      placeholder: 'o.teu@email.com',
      botao: 'Subscrever',
      aEnviar: 'A enviar…',
      enviado: 'Quase! Enviei-te um e-mail para confirmares a subscrição.',
      invalido: 'Esse e-mail não parece válido.',
      erro: 'Não consegui subscrever agora. Tenta daqui a pouco.',
      limite: 'Demasiadas tentativas. Tenta mais tarde.',
      nota: 'Sem spam e sem tracking. Sais com um clique.',
    },
    confirmar: {
      titulo: 'Confirma a tua subscrição',
      texto: 'Um último passo: carrega no botão para ficares subscrito.',
      botao: 'Confirmar subscrição',
      aConfirmar: 'A confirmar…',
      ok: ['Subscrição confirmada.', 'Obrigado. A próxima carta chega ao teu e-mail.'],
      invalido: ['Esta ligação já não é válida.', 'Pode ter expirado. Subscreve outra vez e eu envio uma nova.'],
      erro: ['Algo correu mal.', 'Não consegui concluir a subscrição. Tenta outra vez daqui a pouco.'],
      voltar: 'Ir para o blog',
    },
    mail: {
      assunto: 'Confirma a tua subscrição',
      titulo: 'Confirma a tua subscrição',
      texto: 'Pediste para receber as cartas do blog do Hélder Gonçalves. Confirma que este e-mail é teu:',
      botao: 'Confirmar subscrição',
      ignora: 'Se não foste tu, ignora esta mensagem — não acontece nada.',
      rodape: 'A ligação vale 48 horas.',
    },
  },
  en: {
    titulo: 'Hélder Gonçalves',
    descricao: 'Software that thinks before it speaks. A blog about technology, artificial intelligence and craft — and whatever is on my mind.',
    nome: 'Hélder Gonçalves',
    frases: [
      ['Software that thinks', 'before it speaks.'],
      ['Machines that know', 'when to stop.'],
      ['Intelligence with', 'good judgment.'],
      ['I build what', 'does not exist yet.'],
      ['Less noise,', 'more signal.'],
      ['Code written', 'to last.'],
    ],
    contacto: 'Contact',
    imagem: 'A figure sitting on a flower-covered hill, looking over the valley at sunset.',
    trocar: 'PT',
    trocarRotulo: 'Ler em português',
    navBlog: 'Blog',
    blog: {
      titulo: 'Blog',
      descricao: 'A place where I share ideas, think out loud and, now and then, vent: technology, artificial intelligence, craft — and whatever is on my mind.',
      cabeca: 'Blog',
      intro: 'A place where I share ideas, think out loud and, now and then, vent. Technology, artificial intelligence, craft — and whatever is on my mind. A letter now and then, no spam.',
      vazio: 'Nothing published yet.',
      min: 'min read',
      voltar: 'The whole blog',
      feed: 'RSS',
      tradLabel: 'Também em português',
      fonteLabel: 'Source',
      achado: 'Find',
      achadoEm: 'I found this at',
      indice: 'In this piece',
      atualizado: 'Updated',
      partilhar: 'Share',
      copiarLigacao: 'Copy link',
      ligacaoCopiada: 'Link copied',
      copiarCodigo: 'Copy',
      codigoCopiado: 'Copied',
      relacionados: 'Keep reading',
      antes: 'Before this one',
      depois: 'After this one',
      etiquetas: 'Topics',
      etiquetaTitulo: (nome) => `${nome} · Blog`,
      etiquetaDescricao: (nome, n) => `${n === 1 ? 'The piece' : `All ${n} pieces`} on Hélder Gonçalves’s blog under “${nome}”.`,
      etiquetaCabeca: 'Topic',
      textos: (n) => (n === 1 ? '1 piece' : `${n} pieces`),
    },
    form: {
      rotulo: 'Get the next ones by email',
      placeholder: 'you@email.com',
      botao: 'Subscribe',
      aEnviar: 'Sending…',
      enviado: 'Almost! I sent you an email to confirm your subscription.',
      invalido: 'That email does not look valid.',
      erro: 'I could not subscribe you right now. Please try again shortly.',
      limite: 'Too many attempts. Please try again later.',
      nota: 'No spam, no tracking. One click to leave.',
    },
    confirmar: {
      titulo: 'Confirm your subscription',
      texto: 'One last step: press the button to complete your subscription.',
      botao: 'Confirm subscription',
      aConfirmar: 'Confirming…',
      ok: ['Subscription confirmed.', 'Thank you. The next letter will land in your inbox.'],
      invalido: ['This link is no longer valid.', 'It may have expired. Subscribe again and I will send a fresh one.'],
      erro: ['Something went wrong.', 'I could not complete your subscription. Please try again shortly.'],
      voltar: 'Go to the blog',
    },
    mail: {
      assunto: 'Confirm your subscription',
      titulo: 'Confirm your subscription',
      texto: 'You asked to receive letters from Hélder Gonçalves’s blog. Please confirm this email address is yours:',
      botao: 'Confirm subscription',
      ignora: 'If this was not you, ignore this message — nothing will happen.',
      rodape: 'The link is valid for 48 hours.',
    },
  },
} satisfies Record<Lang, Copy>;

export const rotas = {
  pt: {
    inicio: '/',
    blog: '/blog',
    artigo: (slug: string) => `/blog/${slug}`,
    feed: '/blog/feed.xml',
    etiqueta: (slug: string) => `/blog/etiqueta/${slug}`,
    confirmar: '/blog/confirmar',
  },
  en: {
    inicio: '/en',
    blog: '/en/blog',
    artigo: (slug: string) => `/en/blog/${slug}`,
    feed: '/en/blog/feed.xml',
    etiqueta: (slug: string) => `/en/blog/tag/${slug}`,
    confirmar: '/en/blog/confirm',
  },
} as const;

export const htmlLang: Record<Lang, string> = { pt: 'pt-PT', en: 'en' };
export const locale: Record<Lang, string> = { pt: 'pt_PT', en: 'en_GB' };
