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

export const AUTH_COPY = {
  pt: {
    subject: 'O teu código para entrar em heldergoncalves.io',
    body: (code) =>
      [
        'Olá,',
        '',
        'O teu código para entrar no Calendário é:',
        '',
        '    ' + code,
        '',
        'Vale dez minutos, e uma vez só. Se não foste tu a pedir, ignora este email — sem o código não entra ninguém.',
        '',
        'Hélder Gonçalves',
        'https://heldergoncalves.io',
      ].join('\n'),
  },
  en: {
    subject: 'Your code to sign in at heldergoncalves.io',
    body: (code) =>
      [
        'Hello,',
        '',
        'Your code to sign in to the Calendar is:',
        '',
        '    ' + code,
        '',
        'It is valid for ten minutes, once. If you did not ask for it, ignore this email — nobody gets in without the code.',
        '',
        'Hélder Gonçalves',
        'https://heldergoncalves.io',
      ].join('\n'),
  },
};

export const MEETING_COPY = {
  pt: {
    userSubject: (when) => 'Conversa marcada: ' + when,
    userBody: (when, title) =>
      [
        'Está marcado.',
        '',
        'Quando: ' + when,
        title ? 'Assunto: ' + title : '',
        '',
        'Vou enviar-te a ligação para a chamada um pouco antes. Se precisares de desmarcar, faz isso no Calendário do site — ou responde a este email.',
        '',
        'Hélder Gonçalves',
        'https://heldergoncalves.io',
      ].join('\n'),
    ownerSubject: (when) => '[agenda] Reunião marcada: ' + when,
    ownerBody: (when, email, title, note) =>
      ['Reunião nova marcada pelo site.', '', 'Quando: ' + when, 'Com: ' + email, 'Assunto: ' + (title || '—'), '', note || '(sem notas)', ''].join('\n'),
    cancelSubject: (when) => '[agenda] Reunião cancelada: ' + when,
    cancelBody: (when, email) => ['A reunião de ' + when + ' com ' + email + ' foi cancelada pela pessoa.', ''].join('\n'),
  },
  en: {
    userSubject: (when) => 'Meeting booked: ' + when,
    userBody: (when, title) =>
      [
        'It is booked.',
        '',
        'When: ' + when,
        title ? 'Subject: ' + title : '',
        '',
        'I will send you the call link shortly before. If you need to cancel, do it in the Calendar on the site — or reply to this email.',
        '',
        'Hélder Gonçalves',
        'https://heldergoncalves.io',
      ].join('\n'),
    ownerSubject: (when) => '[agenda] Meeting booked: ' + when,
    ownerBody: (when, email, title, note) =>
      ['New meeting booked from the site.', '', 'When: ' + when, 'With: ' + email, 'Subject: ' + (title || '—'), '', note || '(no notes)', ''].join('\n'),
    cancelSubject: (when) => '[agenda] Meeting cancelled: ' + when,
    cancelBody: (when, email) => ['The meeting on ' + when + ' with ' + email + ' was cancelled by the person.', ''].join('\n'),
  },
};

export const pickLang = (value) => (value === 'en' ? 'en' : 'pt');
