export type Lang = 'pt' | 'en';

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
  navEscritos: string;
  escritos: {
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
    descricao: 'Software que pensa antes de falar. Escritos sobre tecnologia, inteligência artificial e ofício.',
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
    navEscritos: 'Escritos',
    escritos: {
      titulo: 'Escritos',
      descricao: 'Ensaios sobre tecnologia, inteligência artificial e ofício, e notas sobre o que leio. Com newsletter.',
      cabeca: 'Escritos',
      intro: 'Ensaios curtos sobre software, inteligência artificial e ofício — e o que ando a ler. Uma carta de vez em quando, sem spam.',
      vazio: 'Ainda não há escritos publicados.',
      min: 'min de leitura',
      voltar: 'Todos os escritos',
      feed: 'RSS',
      tradLabel: 'Also in English',
      fonteLabel: 'Fonte',
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
      voltar: 'Ir para os escritos',
    },
    mail: {
      assunto: 'Confirma a tua subscrição',
      titulo: 'Confirma a tua subscrição',
      texto: 'Pediste para receber os escritos do Hélder Gonçalves. Confirma que este e-mail é teu:',
      botao: 'Confirmar subscrição',
      ignora: 'Se não foste tu, ignora esta mensagem — não acontece nada.',
      rodape: 'A ligação vale 48 horas.',
    },
  },
  en: {
    titulo: 'Hélder Gonçalves',
    descricao: 'Software that thinks before it speaks. Writing on technology, artificial intelligence and craft.',
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
    navEscritos: 'Writing',
    escritos: {
      titulo: 'Writing',
      descricao: 'Essays on technology, artificial intelligence and craft, plus notes on what I read. With a newsletter.',
      cabeca: 'Writing',
      intro: 'Short essays on software, artificial intelligence and craft — and what I am reading. A letter now and then, no spam.',
      vazio: 'Nothing published yet.',
      min: 'min read',
      voltar: 'All writing',
      feed: 'RSS',
      tradLabel: 'Também em português',
      fonteLabel: 'Source',
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
      voltar: 'Go to the writing',
    },
    mail: {
      assunto: 'Confirm your subscription',
      titulo: 'Confirm your subscription',
      texto: 'You asked to receive Hélder Gonçalves’s writing. Please confirm this email address is yours:',
      botao: 'Confirm subscription',
      ignora: 'If this was not you, ignore this message — nothing will happen.',
      rodape: 'The link is valid for 48 hours.',
    },
  },
} satisfies Record<Lang, Copy>;

export const rotas = {
  pt: {
    inicio: '/',
    escritos: '/escritos',
    artigo: (slug: string) => `/escritos/${slug}`,
    feed: '/escritos/feed.xml',
    confirmar: '/escritos/confirmar',
  },
  en: {
    inicio: '/en',
    escritos: '/en/articles',
    artigo: (slug: string) => `/en/articles/${slug}`,
    feed: '/en/articles/feed.xml',
    confirmar: '/en/articles/confirm',
  },
} as const;

export const htmlLang: Record<Lang, string> = { pt: 'pt-PT', en: 'en' };
export const locale: Record<Lang, string> = { pt: 'pt_PT', en: 'en_GB' };
