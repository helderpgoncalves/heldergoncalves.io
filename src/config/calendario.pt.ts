// ─────────────────────────────────────────────────────────────────────
// O texto do Calendário, em português.
//
// Saiu de apps.pt.ts pelo mesmo motivo que os Ficheiros já tinham saído:
// a app cresceu (mês, dia, detalhe de reunião, e a agenda do dono) e o
// ficheiro dos textos de todas as apps estava a chegar ao tecto das 400
// linhas. As duas línguas têm exactamente as mesmas chaves; ver copy.ts.
// ─────────────────────────────────────────────────────────────────────

export const CALENDARIO_PT = {
  lead: 'Marca uma conversa de 30 minutos comigo. Entra com o teu email — recebes um código, sem palavra-passe — e escolhe uma hora livre. As horas mostram-se no teu fuso.',
  month: 'Mês',
  day: 'Dia',
  today: 'Hoje',
  prev: 'Mês anterior',
  next: 'Mês seguinte',
  free: 'livre',
  frees: 'livres',
  nothing: 'Nada marcado neste dia.',
  now: 'Agora',
  signIn: 'Iniciar sessão',
  signInHint: 'Só quem entra vê a disponibilidade. A ligação vai para o teu email; não há palavra-passe.',
  signInGoogle: 'Continuar com a Google',
  signInOr: 'ou',
  email: 'Email',
  sendLink: 'Enviar ligação',
  linkSent: 'Enviámos uma ligação para',
  linkHint: 'Abre-a no teu email para entrar. Vale dez minutos, e fecha-se sozinho quando entrares.',
  resend: 'Enviar outra vez',
  signedAs: 'Sessão iniciada como',
  signOut: 'Sair',
  bookTitle: 'Nova reunião',
  titleLabel: 'Assunto',
  titlePlaceholder: 'Sobre o que queres falar',
  noteLabel: 'Notas',
  notePlaceholder: 'Contexto, ligações, o que ajudar.',
  confirm: 'Marcar',
  cancel: 'Cancelar',
  close: 'Fechar',
  mine: 'As tuas reuniões',
  none: 'Ainda não marcaste nada.',
  cancelMeeting: 'Desmarcar',
  cancelled: 'Reunião desmarcada.',
  booked: 'Marcado. Enviei-te a confirmação por email.',
  sending: 'A enviar…',
  tz: 'Horário local',
  minutes: 'min',
  busy: 'Ocupado',
  meeting: 'Reunião',
  meetings: 'reuniões',
  meetingOne: 'reunião',
  who: 'Com',
  details: 'Detalhes da reunião',

  // ── Só o dono vê isto ────────────────────────────────────────────
  block: 'Bloqueio',
  opening: 'Abertura',
  newBlock: 'Novo bloqueio ou abertura',
  kindLabel: 'Tipo',
  startLabel: 'Início',
  endLabel: 'Fim',
  blockNote: 'Motivo',
  blockNotePlaceholder: 'Férias, viagem, uma manhã ocupada.',
  create: 'Criar',
  remove: 'Remover',
  blockCreated: 'Disponibilidade actualizada.',
  blockRemoved: 'Alteração removida.',

  errors: {
    email: 'Esse email não parece certo.',
    link: 'Essa ligação já não é válida. Pede uma nova.',
    limit: 'Demasiadas tentativas. Espera um pouco.',
    taken: 'Essa hora já não está livre.',
    off: 'As marcações estão desligadas neste momento. Escreve-me por email.',
    owner: 'Isto é só para o dono do calendário.',
    interval: 'O fim tem de vir depois do início.',
    generic: 'Não deu. Tenta outra vez.',
  },
};
