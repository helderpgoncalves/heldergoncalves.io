// ─────────────────────────────────────────────────────────────────────
// A Mail — a caixa de entrada do dono. Em português. As duas línguas
// têm exactamente as mesmas chaves; ver copy.ts, que as junta e faz o
// TypeScript garanti-lo.
//
// Ficheiro próprio, como o dos Ficheiros e o do Calendário: `apps.pt.ts`
// já vai perto do tecto das 400 linhas, e o texto da caixa de entrada
// cabe bem sozinho. A folha de escrever — o que um visitante vê — ficou
// onde estava, em `apps.*.ts`, chave `contacto`: são duas caras da
// mesma app, mas são dois textos diferentes.
// ─────────────────────────────────────────────────────────────────────

export const MAIL_PT = {
  inbox: 'Recebido',
  unread: '{n} por ler',
  allRead: 'Está tudo lido',
  empty: 'Ainda ninguém te escreveu.',
  pick: 'Escolhe uma mensagem para a ler.',
  loadFailed: 'Não consegui carregar o que está por ler.',
  noSubject: 'Sem assunto',
  yesterday: 'Ontem',
  to: 'Para',
  me: 'Eu',

  // O compositor de resposta.
  replyPlaceholder: 'Escreve a resposta…',
  draft: 'Redigir',
  drafting: 'A escrever…',
  draftDone: 'Rascunho pronto. Lê e corrige antes de enviar.',
  draftFailed: 'Não consegui redigir. Escreve tu.',
  draftOff: 'Sem modelo ligado — a resposta escreve-se à mão.',
  send: 'Enviar',
  sending: 'A enviar…',
  sent: 'Resposta enviada.',
  failed: 'Não consegui enviar. Tenta outra vez.',
  short: 'Escreve um pouco mais.',
};
