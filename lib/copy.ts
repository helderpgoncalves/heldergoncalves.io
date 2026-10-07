// As línguas do site. O sitemap, o hreflang e o feed percorrem esta lista: para acrescentar uma
// língua basta uma entrada em `copy` e em `rotas`, as pastas de rotas e `content/<lang>/`.
export const linguas = ['pt', 'en'] as const;
export type Lang = (typeof linguas)[number];
export const linguaPadrao: Lang = 'pt'; // a do x-default

// Uma frase do topo da landing: até 3 linhas (com 22 letras no máximo cada, para caberem no telemóvel) e, nas citações, o autor.
export type Frase = { linhas: readonly string[]; autor?: string };

// Um só tipo para as duas línguas: se faltar uma chave numa delas, o TypeScript recusa.
type Carta = { assunto: string; preheader: string; titulo: string; texto: string; botao: string; fallback: string };

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
    etiqueta: string;
    titulo: string;
    texto: string;
    botao: string;
    aConfirmar: string;
    ok: [string, string];
    invalido: [string, string];
    erro: [string, string];
    voltar: string;
  };
  mail: { subscrever: Carta; publicar: Carta; subscreverPublicar: Carta; ignora: string; rodape: string; assinatura: string; sobre: string };
  comentarios: {
    titulo: string;
    um: string;                 // «1 comentário»
    varios: string;             // «{n} comentários»
    vazio: string;
    soSubscritores: string;     // explica a regra
    entrarInvalido: string;
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
    email: string;               // rótulo do e-mail no formulário
    emailNota: string;           // explica porque se pede o e-mail
    pendenteEnviado: string;     // depois de escrever sem sessão
    publicadoOk: [string, string];  // página de confirmação: comentário publicado
    confirmarPublicar: { titulo: string; texto: string; botao: string };
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
      etiqueta: 'Quase lá',
      titulo: 'Só falta um clique.',
      texto: 'Carrega no botão para confirmares que o e-mail é teu e ficares a receber as cartas do blog. Prometo escrever só quando houver alguma coisa que valha a pena.',
      botao: 'Confirmar a minha subscrição',
      aConfirmar: 'A confirmar…',
      ok: ['Estás dentro. Obrigado.', 'A subscrição está confirmada. A próxima carta chega ao teu e-mail, e nunca te escrevo só por escrever.'],
      invalido: ['Esta ligação já não vale.', 'Pode ter expirado ou já ter sido usada. Subscreve outra vez e eu envio-te uma nova, sem problema nenhum.'],
      erro: ['Isto não correu bem.', 'Não consegui concluir agora, e a culpa não é tua. Tenta outra vez daqui a pouco.'],
      voltar: 'Ir para o blog',
    },
    mail: {
      subscrever: {
        assunto: 'Falta só um clique para entrares',
        preheader: 'Confirma o teu e-mail e as próximas cartas do blog chegam até ti.',
        titulo: 'Que bom ter-te por aqui.',
        texto: 'Pediste para receber as cartas do meu blog. Escrevo sobre dinheiro, vida, ideias e software, quando tenho alguma coisa que valha a pena dizer. Sem spam e sem rotinas forçadas.\n\nSó falta confirmar que este e-mail é mesmo teu. É um clique:',
        botao: 'Confirmar a minha subscrição',
        fallback: 'Se o botão não abrir, copia esta ligação para o navegador:',
      },
      publicar: {
        assunto: 'O teu comentário está quase a sair',
        preheader: 'Um clique para o teu comentário aparecer no texto.',
        titulo: 'O teu comentário está quase a sair.',
        texto: 'Obrigado por teres escrito. Ainda não o publiquei porque primeiro confirmo que o e-mail é teu, para a conversa continuar a ser entre pessoas de verdade.\n\nCarrega no botão e ele aparece logo no texto:',
        botao: 'Publicar o meu comentário',
        fallback: 'Se o botão não abrir, copia esta ligação para o navegador:',
      },
      subscreverPublicar: {
        assunto: 'Confirma e o teu comentário sai',
        preheader: 'Um clique: ficas nas cartas do blog e o teu comentário é publicado.',
        titulo: 'Obrigado por teres escrito.',
        texto: 'O teu comentário ficou guardado e está pronto a sair. Para comentar aqui basta subscreveres as cartas do blog, que é grátis, sem spam e podes sair com um clique, quando quiseres.\n\nAo confirmares, ficas subscrito e o comentário aparece no texto:',
        botao: 'Subscrever e publicar',
        fallback: 'Se o botão não abrir, copia esta ligação para o navegador:',
      },
      ignora: 'Se não foste tu, ignora esta mensagem: não acontece nada.',
      rodape: 'A ligação vale 48 horas.',
      assinatura: 'Um abraço,',
      sobre: 'Hélder Gonçalves · heldergoncalves.io',
    },
    comentarios: {
      titulo: 'Conversa',
      um: '1 comentário',
      varios: '{n} comentários',
      vazio: 'Ainda ninguém disse nada. Podes ser a primeira pessoa.',
      soSubscritores: 'Escreve já o que pensas. Para manter a conversa boa, o comentário só é publicado quando confirmas o e-mail, o que te subscreve às cartas do blog (grátis, sem spam, sais com um clique).',
      entrarInvalido: 'Esse e-mail não parece válido.',
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
      email: 'O teu e-mail',
      emailNota: 'Só para confirmar que és tu e te subscrever às cartas do blog. Não aparece junto ao comentário.',
      pendenteEnviado: 'Quase! Enviei-te um e-mail: abre a ligação e o comentário fica publicado (e ficas subscrito).',
      publicadoOk: ['Comentário publicado. Obrigado!', 'Ficas subscrito às cartas do blog e podes voltar a comentar neste navegador sem confirmar outra vez.'],
      confirmarPublicar: { titulo: 'O teu comentário está quase a sair.', texto: 'Carrega no botão para confirmares o e-mail, ficares nas cartas do blog e publicares o comentário. É um clique.', botao: 'Publicar o meu comentário' },
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
      etiqueta: 'Almost there',
      titulo: 'Just one click left.',
      texto: 'Press the button to confirm the email address is yours and start receiving the blog letters. I promise to write only when there is something worth saying.',
      botao: 'Confirm my subscription',
      aConfirmar: 'Confirming…',
      ok: ['You are in. Thank you.', 'Your subscription is confirmed. The next letter lands in your inbox, and I never write just for the sake of it.'],
      invalido: ['This link is no longer valid.', 'It may have expired or already been used. Subscribe again and I will send you a fresh one, no problem at all.'],
      erro: ['That did not go well.', 'I could not finish just now, and it is not your fault. Please try again shortly.'],
      voltar: 'Go to the blog',
    },
    mail: {
      subscrever: {
        assunto: 'One click and you are in',
        preheader: 'Confirm your email and the next letters from the blog will find you.',
        titulo: 'So good to have you here.',
        texto: 'You asked to receive letters from my blog. I write about money, life, ideas and software, whenever I have something worth saying. No spam and no forced routines.\n\nThe only thing left is confirming this email address is really yours. It takes one click:',
        botao: 'Confirm my subscription',
        fallback: 'If the button does not open, copy this link into your browser:',
      },
      publicar: {
        assunto: 'Your comment is almost live',
        preheader: 'One click and your comment appears under the post.',
        titulo: 'Your comment is almost live.',
        texto: 'Thank you for writing. I have not published it yet because I first confirm the email address is yours, so the conversation stays between real people.\n\nPress the button and it appears right under the post:',
        botao: 'Publish my comment',
        fallback: 'If the button does not open, copy this link into your browser:',
      },
      subscreverPublicar: {
        assunto: 'Confirm and your comment goes live',
        preheader: 'One click: you join the blog letters and your comment is published.',
        titulo: 'Thank you for writing.',
        texto: 'Your comment is saved and ready to go. To comment here you just subscribe to the blog letters, which is free, spam-free, and you can leave with one click whenever you like.\n\nWhen you confirm, you are subscribed and the comment appears under the post:',
        botao: 'Subscribe and publish',
        fallback: 'If the button does not open, copy this link into your browser:',
      },
      ignora: 'If this was not you, ignore this message: nothing will happen.',
      rodape: 'The link is valid for 48 hours.',
      assinatura: 'Warmly,',
      sobre: 'Hélder Gonçalves · heldergoncalves.io',
    },
    comentarios: {
      titulo: 'Conversation',
      um: '1 comment',
      varios: '{n} comments',
      vazio: 'Nobody has said anything yet. You could be the first.',
      soSubscritores: 'Write what you think right away. To keep the conversation good, the comment goes live once you confirm your email, which subscribes you to the blog letters (free, no spam, leave with one click).',
      entrarInvalido: 'That email does not look valid.',
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
      email: 'Your email',
      emailNota: 'Only to confirm it is you and subscribe you to the blog letters. It is not shown with the comment.',
      pendenteEnviado: 'Almost! I sent you an email: open the link and the comment goes live (and you are subscribed).',
      publicadoOk: ['Comment published. Thank you!', 'You are subscribed to the blog letters and can comment again in this browser without confirming.'],
      confirmarPublicar: { titulo: 'Your comment is almost live.', texto: 'Press the button to confirm your email, join the blog letters and publish the comment. It takes one click.', botao: 'Publish my comment' },
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
