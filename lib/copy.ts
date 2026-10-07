// As línguas do site. O sitemap, o hreflang e o feed percorrem esta lista: para acrescentar uma
// língua basta uma entrada em `copy` e em `rotas`, as pastas de rotas e `content/<lang>/`.
export const linguas = ['pt', 'en'] as const;
export type Lang = (typeof linguas)[number];
export const linguaPadrao: Lang = 'pt'; // a do x-default

// Uma frase do topo da landing: até 3 linhas (com 22 letras no máximo cada, para caberem no telemóvel) e, nas citações, o autor.
export type Frase = { linhas: readonly string[]; autor?: string };

// Um só tipo para as duas línguas: se faltar uma chave numa delas, o TypeScript recusa.
export type Copy = {
  titulo: string;
  descricao: string;
  nome: string;
  frases: readonly Frase[];
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
    banner: string;          // descrição da imagem do blog
    prompt: string;          // a linha de terminal por cima do título
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
    serie: string;           // "Série"
    parte: string;           // "Parte"
    serieAnterior: string;
    serieSeguinte: string;
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
  mail: { assunto: string; titulo: string; texto: string; botao: string; ignora: string; rodape: string; comentar: { assunto: string; titulo: string; texto: string; botao: string } };
  comentarios: {
    titulo: string;
    um: string;                 // «1 comentário»
    varios: string;             // «{n} comentários»
    vazio: string;
    soSubscritores: string;     // explica a regra
    jaSubscrevi: string;        // abre o formulário de entrada
    entrarBotao: string;
    entrarAEnviar: string;
    entrarEnviado: string;
    entrarInvalido: string;
    entrarLimite: string;
    nome: string;
    texto: string;
    placeholder: string;
    publicar: string;
    aPublicar: string;
    responder: string;
    cancelar: string;
    apagar: string;
    apagarConfirma: string;
    sair: string;
    erro: string;
    limite: string;
    ligacoes: string;
    regras: string;
    respostaA: string;
    sessaoOk: [string, string];  // título e texto da página de confirmação
  };
};

export const copy = {
  pt: {
    titulo: 'Hélder Gonçalves',
    descricao: 'Software que pensa antes de falar. Um blog sobre tecnologia, inteligência artificial e ofício, e sobre o que me vai na cabeça.',
    nome: 'Hélder Gonçalves',
    frases: [
      { linhas: ['Software que pensa', 'antes de falar.'] },
      { linhas: ['O essencial é', 'invisível aos olhos.'], autor: 'Antoine de Saint-Exupéry, O Principezinho' },
      { linhas: ['Código que se explica', 'sozinho.'] },
      { linhas: ['A simplicidade é', 'pré-requisito', 'da fiabilidade.'], autor: 'Edsger Dijkstra, tradução minha' },
      { linhas: ['Menos ruído,', 'mais sinal.'] },
      { linhas: ['Procura riqueza,', 'não dinheiro', 'nem estatuto.'], autor: 'Naval Ravikant, tradução minha' },
      { linhas: ['Primeiro perceber.', 'Depois construir.'] },
      { linhas: ['Tudo vale a pena', 'se a alma', 'não é pequena.'], autor: 'Fernando Pessoa, Mensagem' },
      { linhas: ['Feito à mão,', 'pensado a fundo.'] },
      { linhas: ['O melhor modo de', 'prever o futuro', 'é inventá-lo.'], autor: 'Alan Kay, tradução minha' },
      { linhas: ['Poucas coisas,', 'muito bem feitas.'] },
      { linhas: ['Não temos pouco tempo,', 'perdemos muito.'], autor: 'Séneca, Sobre a brevidade da vida' },
    ],
    contacto: 'Contacto',
    imagem: 'Uma figura sentada numa colina florida, a olhar o vale ao pôr do sol.',
    trocar: 'EN',
    trocarRotulo: 'Read in English',
    navBlog: 'Blog',
    blog: {
      titulo: 'Blog',
      descricao: 'Um espaço onde partilho ideias, falo de coisas e, às vezes, desabafo: tecnologia, inteligência artificial, ofício, e o que me vai na cabeça.',
      cabeca: 'Blog',
      intro: 'Um espaço onde partilho ideias, falo de coisas e, às vezes, desabafo. Tecnologia, inteligência artificial, ofício, e o que me vai na cabeça. Uma carta de vez em quando, sem spam.',
      vazio: 'Ainda nada por aqui. A primeira carta vem a caminho.',
      banner: 'Uma figura sentada numa rocha, a ver os raios do sol atravessarem um vale de montanhas.',
      prompt: '~/blog',
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
      serie: 'Série',
      parte: 'Parte',
      serieAnterior: 'Parte anterior',
      serieSeguinte: 'Continua na parte seguinte',
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
      ignora: 'Se não foste tu, ignora esta mensagem. Não acontece nada.',
      rodape: 'A ligação vale 48 horas.',
      comentar: { assunto: 'A tua ligação para comentar', titulo: 'Entra para comentar', texto: 'Carrega no botão para abrires a sessão e comentares no blog. A ligação vale 30 minutos.', botao: 'Entrar e comentar' },
    },
    comentarios: {
      titulo: 'Conversa',
      um: '1 comentário',
      varios: '{n} comentários',
      vazio: 'Ainda ninguém disse nada. Podes ser a primeira pessoa.',
      soSubscritores: 'Para manter a conversa boa, só comenta quem subscreve a newsletter. É grátis, sem spam, e sais com um clique.',
      jaSubscrevi: 'Já subscrevi, quero comentar',
      entrarBotao: 'Enviar ligação',
      entrarAEnviar: 'A enviar…',
      entrarEnviado: 'Se esse e-mail estiver subscrito, enviei-te uma ligação. Abre-a para comentares.',
      entrarInvalido: 'Esse e-mail não parece válido.',
      entrarLimite: 'Demasiadas tentativas. Tenta mais tarde.',
      nome: 'O teu nome',
      texto: 'O teu comentário',
      placeholder: 'Diz o que pensas, com educação. Discordar é bem-vindo.',
      publicar: 'Publicar',
      aPublicar: 'A publicar…',
      responder: 'Responder',
      cancelar: 'Cancelar',
      apagar: 'Apagar',
      apagarConfirma: 'Apagar este comentário?',
      sair: 'Sair',
      erro: 'Não consegui publicar agora. Tenta daqui a pouco.',
      limite: 'Calma: espera um pouco antes de comentares outra vez.',
      ligacoes: 'Demasiadas ligações no comentário.',
      regras: 'Sê simpático. Comentários ofensivos ou spam são apagados.',
      respostaA: 'Em resposta a',
      sessaoOk: ['Já podes comentar.', 'A sessão está aberta neste navegador. Volta ao texto e deixa o teu comentário.'],
    },
  },
  en: {
    titulo: 'Hélder Gonçalves',
    descricao: 'Software that thinks before it speaks. A blog about technology, artificial intelligence and craft, and whatever is on my mind.',
    nome: 'Hélder Gonçalves',
    frases: [
      { linhas: ['Software that thinks', 'before it speaks.'] },
      { linhas: ['What is essential', 'is invisible', 'to the eye.'], autor: 'Antoine de Saint-Exupéry, The Little Prince' },
      { linhas: ['Code that explains', 'itself.'] },
      { linhas: ['Simplicity is', 'prerequisite', 'for reliability.'], autor: 'Edsger Dijkstra' },
      { linhas: ['Less noise,', 'more signal.'] },
      { linhas: ['Seek wealth,', 'not money', 'or status.'], autor: 'Naval Ravikant' },
      { linhas: ['First understand.', 'Then build.'] },
      { linhas: ['It is all worth it', 'if the soul', 'is not small.'], autor: 'Fernando Pessoa, Mensagem, my translation' },
      { linhas: ['Made by hand,', 'thought through.'] },
      { linhas: ['The best way to', 'predict the future', 'is to invent it.'], autor: 'Alan Kay' },
      { linhas: ['Few things,', 'done properly.'] },
      { linhas: ['We do not have', 'too little time,', 'we waste too much.'], autor: 'Seneca, On the Shortness of Life, my translation' },
    ],
    contacto: 'Contact',
    imagem: 'A figure sitting on a flower-covered hill, looking over the valley at sunset.',
    trocar: 'PT',
    trocarRotulo: 'Ler em português',
    navBlog: 'Blog',
    blog: {
      titulo: 'Blog',
      descricao: 'A place where I share ideas, think out loud and, now and then, vent: technology, artificial intelligence, craft, and whatever is on my mind.',
      cabeca: 'Blog',
      intro: 'A place where I share ideas, think out loud and, now and then, vent. Technology, artificial intelligence, craft, and whatever is on my mind. A letter now and then, no spam.',
      vazio: 'Nothing here yet. The first letter is on its way.',
      banner: 'A figure sitting on a rock, watching sunbeams cross a mountain valley.',
      prompt: '~/blog',
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
      serie: 'Series',
      parte: 'Part',
      serieAnterior: 'Previous part',
      serieSeguinte: 'Continues in the next part',
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
      ignora: 'If this was not you, ignore this message. Nothing will happen.',
      rodape: 'The link is valid for 48 hours.',
      comentar: { assunto: 'Your link to comment', titulo: 'Sign in to comment', texto: 'Press the button to open your session and comment on the blog. The link is valid for 30 minutes.', botao: 'Sign in and comment' },
    },
    comentarios: {
      titulo: 'Conversation',
      um: '1 comment',
      varios: '{n} comments',
      vazio: 'Nobody has said anything yet. You could be the first.',
      soSubscritores: 'To keep the conversation good, only newsletter subscribers can comment. It is free, no spam, and you can leave with one click.',
      jaSubscrevi: 'I already subscribed, I want to comment',
      entrarBotao: 'Send link',
      entrarAEnviar: 'Sending…',
      entrarEnviado: 'If that email is subscribed, I sent you a link. Open it to comment.',
      entrarInvalido: 'That email does not look valid.',
      entrarLimite: 'Too many attempts. Try again later.',
      nome: 'Your name',
      texto: 'Your comment',
      placeholder: 'Say what you think, politely. Disagreeing is welcome.',
      publicar: 'Post',
      aPublicar: 'Posting…',
      responder: 'Reply',
      cancelar: 'Cancel',
      apagar: 'Delete',
      apagarConfirma: 'Delete this comment?',
      sair: 'Sign out',
      erro: 'I could not post right now. Try again soon.',
      limite: 'Easy: wait a little before commenting again.',
      ligacoes: 'Too many links in the comment.',
      regras: 'Be kind. Offensive comments and spam are deleted.',
      respostaA: 'In reply to',
      sessaoOk: ['You can comment now.', 'Your session is open in this browser. Go back to the post and leave your comment.'],
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
