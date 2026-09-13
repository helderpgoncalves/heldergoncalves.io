// ─────────────────────────────────────────────────────────────────────
// Os badges dos ícones: o círculo vermelho com um número, no canto
// superior direito. Ecrã inicial e Dock do telefone, Dock do Mac.
//
// Pôr um badge numa aplicação é uma linha, de qualquer peça que tenha
// o `ctx` — não é preciso tocar neste ficheiro nem no HTML:
//
//     ctx.badges.set('ficheiros', 3);   // 0 apaga o badge
//     ctx.badges.get('ficheiros');      // o número que lá está
//
// O registo é genérico: o número fica guardado pelo id da aplicação e
// aparece em todos os ícones dela, em qualquer dos dois mundos. O que
// este ficheiro traz de origem são só as contas das apps que já têm
// fonte de dados — ver `contar()`.
//
// O nó do badge nasce aqui e não em `ios/` e `mac/`: o ícone é o mesmo
// botão `[data-open]` nos dois lados, e partir isto em duas peças dava
// o mesmo código escrito duas vezes, com o risco de uma das metades
// ficar para trás. A diferença entre os dois mundos é só o tamanho do
// ícone por baixo, e essa é uma linha de CSS (styles/os/badges.css).
//
// Abrir uma aplicação limpa o que nela era «por ler» (`seen`, chamado
// pelo index.js). Esse «até quando já vi» é por pessoa e por app e
// vive no `localStorage`: é uma conveniência de quem está a ver deste
// dispositivo, não estado partilhado, e por isso nunca vai ao
// servidor. Como em retomar.js, a chave é desta peça e o acesso é
// sempre dentro de um try — em modo privado o `localStorage` lança, e
// nada pode partir por causa disso.
//
// Recalcula-se no arranque, ao entrar ou sair, e quando o separador
// volta à frente. Não há intervalo nenhum a bater no servidor: isto
// corre numa máquina que está a servir produção.
// ─────────────────────────────────────────────────────────────────────
import { reducedMotion } from './state.js';
import { amIOwner, whoAmI } from './lib/session.js';

const KEY = 'helderos-vistos';

/** Acima disto a Apple não conta mais: mostra-se `99+`. */
const TECTO = 99;

/** O horizonte de marcação (`MEETINGS_HORIZON_DAYS`, 60) com folga, sem
 *  passar do vão de 62 dias que /api/reunioes/todas aceita. */
const DIAS_AGENDA = 61;

export function createBadges(ctx) {
  const nomes = ctx.data.strings.badge;
  /** O número em vigor por aplicação. */
  const contas = new Map();
  /** Quem está sentado ao teclado, e se é o dono. As marcas são dele. */
  let quem = '-';
  let dono = false;
  /** O que se soube das fontes na última ida ao servidor. */
  let conversas = [];
  let reunioes = [];

  // ── As marcas: até quando cada pessoa já viu cada app ──────────────
  const todas = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  };

  const guardar = (valor) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(valor));
    } catch (_) {
      /* modo privado: as marcas valem só para esta sessão */
    }
  };

  /**
   * O instante até ao qual esta pessoa já viu esta app. Quem chega pela
   * primeira vez fica marcado com o agora — senão o primeiro badge do
   * Blog seria o arquivo inteiro, que não é novidade nenhuma.
   */
  function marca(id) {
    const registo = todas();
    const meu = registo[quem] || (registo[quem] = {});
    if (!meu[id]) {
      meu[id] = Date.now();
      guardar(registo);
    }
    return meu[id];
  }

  // Comparar ISO como texto parte-se sozinho: o servidor manda
  // milissegundos e o Astro também, mas basta uma fonte sem eles para
  // `...:00Z` ficar «maior» que `...:00.000Z`. Compara-se em instantes.
  const instante = (iso) => {
    const v = Date.parse(iso || '');
    return Number.isNaN(v) ? 0 : v;
  };

  // ── Desenhar ───────────────────────────────────────────────────────
  // Só o ecrã inicial e as duas Docks levam badge. O resto do sistema
  // também tem `[data-open]` (a Reciclagem, o Spotlight, as
  // notificações) e aí um círculo vermelho não diria nada.
  const iconesDe = (id) =>
    [...document.querySelectorAll('.sb-app[data-open], .dock-item[data-open]')].filter(
      (el) => el.dataset.open === id
    );

  const nomeDe = (id) => {
    const app = ctx.data.apps.find((a) => a.id === id);
    return (app && app.name) || '';
  };

  /**
   * Quem não vê o círculo tem de ouvir o número. O rótulo fica no
   * próprio ícone, e não num `<span class="sr">` lá dentro: na Dock do
   * telefone o nome da app é um `.label` em `display: none`, que nem
   * conta para o nome acessível — um filho escondido não o salvava.
   */
  function rotular(el, id, n) {
    const nome = nomeDe(id);
    if (!nome) return;
    el.setAttribute('aria-label', n ? nome + ', ' + nomes.unread.replace('{n}', String(n)) : nome);
  }

  function pintar(id) {
    const n = contas.get(id) || 0;
    iconesDe(id).forEach((el) => {
      let bolha = el.querySelector('.badge');
      if (!n) {
        if (bolha) bolha.remove();
        rotular(el, id, 0);
        return;
      }
      if (!bolha) {
        bolha = document.createElement('span');
        bolha.className = 'badge';
        // Decorativo: o número já vai no rótulo do ícone, e lido duas
        // vezes seria pior do que não ser lido nenhuma.
        bolha.setAttribute('aria-hidden', 'true');
        if (!reducedMotion()) bolha.classList.add('nova');
        el.appendChild(bolha);
      }
      bolha.textContent = n > TECTO ? TECTO + '+' : String(n);
      rotular(el, id, n);
    });
  }

  function set(id, n) {
    const valor = Math.max(0, Math.floor(Number(n) || 0));
    if (contas.get(id) === valor) return;
    contas.set(id, valor);
    pintar(id);
  }

  // ── As contas ──────────────────────────────────────────────────────
  /**
   * Sem rede: só o que já está em mão. É isto que corre quando se abre
   * uma app — marcar como visto não tem de pedir nada a ninguém.
   */
  function contar() {
    // Blog. Para toda a gente, com sessão ou sem ela: os escritos
    // publicados depois da última visita — a lista já veio no arranque,
    // em `osData.posts`. Para o dono soma-se o que está por publicar.
    const desdeBlog = marca('escritos');
    const novos = (ctx.data.posts || []).filter((p) => instante(p.at) > desdeBlog).length;
    const rascunhos =
      dono && ctx.escritosEditor
        ? ctx.escritosEditor.drafts().filter((d) => d.estado === 'rascunho').length
        : 0;
    set('escritos', novos + rascunhos);

    // Ficheiros. Este vale para os dois lados, e é a diferença em
    // relação aos de baixo: o cliente tem de saber que o Hélder lhe
    // deixou alguma coisa, e o Hélder que o cliente lhe largou. Conta
    // pastas mexidas, não ficheiros — o que interessa é onde ir ver.
    const desdeFich = marca('ficheiros');
    const pastas = ctx.ficheiros ? ctx.ficheiros.pastas() : [];
    set('ficheiros', pastas.filter((p) => instante(p.ultimo) > desdeFich).length);

    // Mensagens e Calendário são do dono e mais ninguém: quem não tem
    // sessão de dono não tem estas listas, e o badge desaparece com ela.
    const desdeMsg = marca('mensagens');
    set('mensagens', conversas.filter((c) => instante(c.last) > desdeMsg).length);
    const desdeCal = marca('calendario');
    set('calendario', reunioes.filter((r) => instante(r.at) > desdeCal).length);
  }

  /** As conversas vêm da caixa de entrada — o `fetch` é dela, não daqui. */
  async function lerConversas() {
    if (!ctx.inbox) return;
    await ctx.inbox.load();
    conversas = ctx.inbox.conversations();
  }

  /**
   * As reuniões marcadas. `at` é o instante em que alguém marcou, e é
   * o que diz se já foi vista — não o dia da reunião. A janela é o
   * horizonte de marcação inteiro: uma marcada hoje para daqui a dois
   * meses é tão nova como uma para amanhã.
   */
  async function lerReunioes() {
    const dia = (d) => d.toISOString().slice(0, 10);
    const fim = new Date();
    fim.setDate(fim.getDate() + DIAS_AGENDA);
    try {
      const res = await fetch('/api/reunioes/todas?from=' + dia(new Date()) + '&to=' + dia(fim), {
        headers: { Accept: 'application/json' },
      });
      const data = res.ok ? await res.json() : null;
      reunioes = data && data.ok ? data.meetings || [] : [];
    } catch (_) {
      /* sem rede: fica o que se sabia da última vez */
    }
  }

  /** `whoAmI` e `amIOwner` guardam a resposta — isto não é um pedido novo. */
  async function identificar() {
    quem = (await whoAmI()) || '-';
    dono = await amIOwner();
  }

  async function fontes() {
    await identificar();
    // As pastas partilhadas são de quem tiver sessão — o cliente vê as
    // dele, o dono vê todas. As outras duas listas são só do dono.
    const trabalhos = [];
    if (quem !== '-' && ctx.ficheiros) trabalhos.push(ctx.ficheiros.refresh());
    if (dono) trabalhos.push(lerConversas(), lerReunioes());
    else {
      conversas = [];
      reunioes = [];
    }
    await Promise.all(trabalhos);
    contar();
  }

  // Um só apuramento de cada vez: o arranque e o editor de escritos
  // pedem-no quase ao mesmo tempo, e não vale a pena ir duas vezes.
  let aDecorrer = null;
  function refresh() {
    if (!aDecorrer) aDecorrer = fontes().finally(() => (aDecorrer = null));
    return aDecorrer;
  }

  async function seen(id) {
    await identificar();
    const registo = todas();
    const meu = registo[quem] || (registo[quem] = {});
    meu[id] = Date.now();
    guardar(registo);
    contar();
  }

  // Voltar ao separador é a única deixa para recontar sem ser por acção
  // de quem está a ver. Um `setInterval` a pedir ao servidor de minuto
  // a minuto era o que esta máquina não pode dar.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });

  refresh();

  // `refresh` vai às fontes (rede); `recount` só refaz as contas com o
  // que já está em mão — é o que o editor de escritos precisa a cada
  // gravação, e ir ao servidor por causa disso seria caro e inútil.
  return { set, get: (id) => contas.get(id) || 0, seen, refresh, recount: contar };
}
