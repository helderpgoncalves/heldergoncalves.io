// ─────────────────────────────────────────────────────────────────────
// O texto que o servidor mostra a quem o lê.
//
// São as poucas páginas e emails que não passam pelo Astro: a
// confirmação da subscrição e a saída da lista. Está tudo aqui para se
// poder mudar uma palavra sem abrir um ficheiro de lógica.
// ─────────────────────────────────────────────────────────────────────

export const NEWSLETTER_COPY = {
  pt: {
    lang: 'pt',
    confirmSubject: 'Confirma a subscrição do blog do Hélder',
    confirmBody: (link, cancel) =>
      [
        'Olá,',
        '',
        'Alguém — provavelmente tu — pediu para receber os escritos novos de heldergoncalves.io.',
        'Para começar a receber, confirma aqui:',
        '',
        link,
        '',
        'Se não foste tu, ignora este email. Sem esta confirmação não te é enviado mais nada.',
        'A ligação vale durante sete dias.',
        '',
        'Podes sair da lista quando quiseres:',
        cancel,
        '',
        'Hélder Gonçalves',
        'https://heldergoncalves.io',
      ].join('\n'),
    okTitle: 'Subscrição confirmada',
    okBody: 'Está feito. Recebes um email quando houver escrito novo — e mais nada.',
    goneTitle: 'Subscrição cancelada',
    goneBody: 'Saíste da lista. Não te é enviado mais nada.',
    badTitle: 'Ligação inválida',
    badBody: 'Esta ligação não é válida ou já expirou. Podes subscrever outra vez a partir do blog.',
    back: 'Voltar ao site',
  },
  en: {
    lang: 'en',
    confirmSubject: "Confirm your subscription to Hélder's blog",
    confirmBody: (link, cancel) =>
      [
        'Hello,',
        '',
        'Someone — probably you — asked to receive new writing from heldergoncalves.io.',
        'To start receiving it, confirm here:',
        '',
        link,
        '',
        'If this was not you, ignore this email. Without this confirmation nothing else is sent.',
        'The link is valid for seven days.',
        '',
        'You can leave the list whenever you want:',
        cancel,
        '',
        'Hélder Gonçalves',
        'https://heldergoncalves.io',
      ].join('\n'),
    okTitle: 'Subscription confirmed',
    okBody: 'Done. You will get an email when there is new writing — and nothing else.',
    goneTitle: 'Subscription cancelled',
    goneBody: 'You are off the list. Nothing else will be sent.',
    badTitle: 'Invalid link',
    badBody: 'This link is not valid or has expired. You can subscribe again from the blog.',
    back: 'Back to the site',
  },
};

export const pickLang = (value) => (value === 'en' ? 'en' : 'pt');
