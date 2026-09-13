// ─────────────────────────────────────────────────────────────────────
// Ficheiros — o estado, e a conversa com o servidor.
//
// O dono cria pastas e atribui cada uma ao email de um cliente; o
// cliente vê só as dele. Quem decide isso é a API a cada pedido — aqui
// não há filtro nenhum a fingir de segurança: o que o servidor manda é
// o que existe para quem está a olhar.
//
// Tudo o que desenha está em ficheiros-vista.js. Entrar não tem ecrã
// próprio: usa o painel do sistema (lib/entrar.js), e `ctx.ficheiros
// .refresh` é o que `ctx.onSessionChange` chama depois de uma sessão
// nova — quer se tenha entrado pelo painel, quer se tenha voltado de um
// magic link (lib/retomar.js).
//
// Os ficheiros sobem em base64 dentro do JSON de sempre, como as
// imagens do editor dos escritos: é o que evita mais uma dependência no
// servidor só para receber um upload.
// ─────────────────────────────────────────────────────────────────────
import { whoAmI, postJson } from '../lib/session.js';
import { capturar } from '../lib/retomar.js';
import { criarVista } from './ficheiros-vista.js';

export function initFicheiros(ctx) {
  const el = ctx.contentNode('ficheiros');
  if (!el) return;
  const t = ctx.data.strings.ficheiros;

  const convite = el.querySelector('[data-fic-sessao]');
  const lado = el.querySelector('[data-fic-lado]');
  const main = el.querySelector('[data-fic-main]');
  const corpo = el.querySelector('[data-fic-corpo]');
  const form = el.querySelector('[data-fic-form]');
  const campoNome = el.querySelector('[data-fic-nome]');
  const campoCliente = el.querySelector('[data-fic-cliente]');
  const entrada = el.querySelector('[data-fic-input]');
  const nota = el.querySelector('[data-fic-nota]');

  const estado = {
    email: null,
    dono: false,
    pastas: [],
    pasta: null,
    ficheiros: [],
    ocupado: 0,
    tipos: [],
    tecto: 0,
    aberto: null,
    ocupada: false,
  };

  const vista = criarVista(el, t, ctx, estado);

  /** A mensagem certa para o que o servidor recusou. */
  const porque = (erro) => (erro && t.errors[erro]) || t.errors.generic;

  /** Sem sessão não há nada para ver: guarda-se o sítio e abre-se o
   *  painel de entrar, como as outras apps fazem. */
  function pedirSessao() {
    convite.hidden = false;
    lado.hidden = true;
    main.hidden = true;
    capturar(ctx);
    ctx.entrar.open();
  }

  async function pedir(url, body) {
    const res = body === undefined
      ? await fetch(url, { headers: { Accept: 'application/json' } })
      : await postJson(url, body);
    if (res.status === 401) {
      pedirSessao();
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      vista.avisar(porque(data.error));
      return null;
    }
    return data;
  }

  // ── Ler ────────────────────────────────────────────────────────────
  /** `convidar` só na primeira abertura da app: abrir o painel de
   *  entrar é o que se quer de quem veio ver os ficheiros sem sessão —
   *  mas não de quem acabou de sair, que ficaria com o painel na cara
   *  logo a seguir a ter fechado a sessão de propósito. */
  async function carregar(convidar) {
    estado.email = await whoAmI();
    if (!estado.email) {
      convite.hidden = false;
      lado.hidden = true;
      main.hidden = true;
      if (convidar) {
        capturar(ctx);
        ctx.entrar.open();
      }
      return;
    }
    const data = await pedir('/api/ficheiros');
    if (!data) return;
    convite.hidden = true;
    lado.hidden = false;
    main.hidden = false;
    estado.dono = data.dono === true;
    estado.pastas = data.pastas || [];
    estado.tipos = data.tipos || [];
    estado.tecto = data.tecto || 0;
    nota.textContent = t.accepted;
    // A pasta aberta pode ter sido removida entretanto — se já não está
    // na lista, volta-se à vista das pastas em vez de mostrar o vazio.
    if (estado.pasta && !estado.pastas.some((p) => p.id === estado.pasta.id)) fecharPasta();
    else if (estado.pasta) await abrirPasta(estado.pasta.id);
    else vista.render();
    // Largar ou tirar um ficheiro muda o que está por ver — o badge do
    // ícone refaz-se com o que acabou de chegar, sem outra ida ao
    // servidor (scripts/os/badges.js).
    if (ctx.badges) ctx.badges.recount();
  }

  async function abrirPasta(id) {
    const data = await pedir('/api/ficheiros/pasta/' + encodeURIComponent(id));
    if (!data) return;
    estado.pasta = data.pasta;
    estado.ficheiros = data.ficheiros || [];
    estado.ocupado = data.ocupado || 0;
    vista.render();
  }

  function fecharPasta() {
    estado.pasta = null;
    estado.ficheiros = [];
    vista.fechar();
    vista.render();
  }

  // ── Escrever ───────────────────────────────────────────────────────
  async function criarPasta(nome, cliente) {
    const data = await pedir('/api/ficheiros/pastas', { nome, cliente });
    if (!data) return;
    form.hidden = true;
    campoNome.value = '';
    campoCliente.value = '';
    await carregar();
    await abrirPasta(data.pasta.id);
  }

  /** O ficheiro em base64, tal como o `<input type="file">` o dá. O
   *  `data:` à cabeça vai junto — o servidor sabe tirá-lo. */
  const lerComoBase64 = (ficheiro) =>
    new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsDataURL(ficheiro);
    });

  const extensaoDe = (nome) => (nome.includes('.') ? nome.split('.').pop().toLowerCase() : '');

  async function enviar(ficheiros) {
    if (!estado.pasta || estado.ocupada) return;
    estado.ocupada = true;
    nota.textContent = t.sending;
    try {
      for (const ficheiro of ficheiros) {
        // As duas recusas que se podem dar sem incomodar o servidor: o
        // tipo e o tamanho. A decisão a sério continua a ser dele.
        if (estado.tipos.length && !estado.tipos.includes(extensaoDe(ficheiro.name))) {
          vista.avisar(t.errors.formato);
          continue;
        }
        if (estado.tecto && ficheiro.size > estado.tecto) {
          vista.avisar(t.errors.tamanho);
          continue;
        }
        const dados = await lerComoBase64(ficheiro).catch(() => null);
        if (!dados) {
          vista.avisar(t.errors.generic);
          continue;
        }
        await pedir('/api/ficheiros/carregar', {
          pasta: estado.pasta.id,
          nome: ficheiro.name,
          dados,
          lang: ctx.data.lang,
        });
      }
    } finally {
      estado.ocupada = false;
      nota.textContent = t.accepted;
      if (estado.pasta) await abrirPasta(estado.pasta.id);
    }
  }

  async function removerFicheiro(id) {
    if (!window.confirm(t.confirmFile)) return;
    const data = await pedir('/api/ficheiros/remover', { id });
    if (!data) return;
    vista.fechar();
    await abrirPasta(estado.pasta.id);
  }

  async function removerPasta() {
    if (!estado.pasta || !window.confirm(t.confirmFolder)) return;
    const data = await pedir('/api/ficheiros/pastas/remover', { id: estado.pasta.id });
    if (!data) return;
    estado.pasta = null;
    await carregar();
  }

  // ── Os gestos ──────────────────────────────────────────────────────
  el.querySelector('[data-action="entrar"]')?.addEventListener('click', () => {
    capturar(ctx);
    ctx.entrar.open();
  });

  el.querySelector('[data-fic-pastas]').addEventListener('click', (ev) => {
    const alvo = ev.target.closest('[data-fic-pasta]');
    if (alvo) abrirPasta(alvo.dataset.ficPasta);
  });

  el.querySelector('[data-fic-lista]').addEventListener('click', (ev) => {
    const alvo = ev.target.closest('[data-fic-item]');
    if (!alvo) return;
    const ficheiro = estado.ficheiros.find((f) => f.id === alvo.dataset.ficItem);
    if (ficheiro) vista.mostrar(ficheiro);
  });

  el.querySelector('[data-fic-voltar]').addEventListener('click', fecharPasta);
  el.querySelector('[data-fic-fechar]').addEventListener('click', () => vista.fechar());
  el.querySelector('[data-fic-vista-remover]').addEventListener('click', () => {
    if (estado.aberto) removerFicheiro(estado.aberto.id);
  });
  el.querySelector('[data-fic-remover-pasta]').addEventListener('click', removerPasta);

  el.querySelector('[data-fic-nova]').addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden) campoNome.focus();
  });
  el.querySelector('[data-fic-cancelar]').addEventListener('click', () => {
    form.hidden = true;
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nome = campoNome.value.trim();
    // O cliente é opcional: sem ele a pasta é privada. É o caso normal
    // — guarda-se primeiro, mostra-se ao cliente quando estiver pronta.
    const cliente = campoCliente.value.trim().toLowerCase();
    if (!nome) {
      vista.avisar(t.errors.dados);
      return;
    }
    criarPasta(nome, cliente);
  });

  /** Passa uma pasta a partilhada com um email, ou tira-lhe a partilha
      com o campo vazio. Tirar não mexe em ficheiro nenhum: quem vê o
      quê decide-se a cada pedido, não é uma permissão guardada. */
  async function partilhar(cliente) {
    if (!estado.pasta) return;
    const data = await pedir('/api/ficheiros/pastas/partilhar', { id: estado.pasta.id, cliente });
    if (!data) return;
    ctx.notify(cliente ? t.sharedWith.replace('{quem}', cliente) : t.unshared);
    await carregar(false);
  }

  el.querySelector('[data-fic-partilhar]').addEventListener('click', () => {
    const actual = (estado.pasta && estado.pasta.cliente) || '';
    const resposta = window.prompt(t.shareAsk, actual);
    if (resposta === null) return;  // carregou em cancelar
    partilhar(resposta.trim().toLowerCase());
  });

  el.querySelector('[data-fic-add]').addEventListener('click', () => entrada.click());
  entrada.addEventListener('change', () => {
    if (entrada.files && entrada.files.length) enviar([...entrada.files]);
    entrada.value = '';
  });

  // Largar um ficheiro em cima da pasta aberta. `dragover` tem de ser
  // travado, senão o browser abre o ficheiro numa aba e leva o sistema
  // inteiro com ele.
  let dentro = 0;
  const pinta = (ligado) => corpo.classList.toggle('largar', ligado && Boolean(estado.pasta));
  corpo.addEventListener('dragenter', (ev) => {
    ev.preventDefault();
    dentro += 1;
    pinta(true);
  });
  corpo.addEventListener('dragover', (ev) => ev.preventDefault());
  corpo.addEventListener('dragleave', () => {
    dentro = Math.max(0, dentro - 1);
    if (!dentro) pinta(false);
  });
  corpo.addEventListener('drop', (ev) => {
    ev.preventDefault();
    dentro = 0;
    pinta(false);
    const largados = ev.dataTransfer && ev.dataTransfer.files;
    if (largados && largados.length) enviar([...largados]);
  });

  // `pastas()` é para os badges (scripts/os/badges.js) saberem se há
  // coisa nova sem repetirem o pedido: o `fetch` é desta app, o número
  // é de lá.
  ctx.ficheiros = { refresh: () => carregar(false), pastas: () => estado.pastas };
  let pronta = false;
  ctx.prepareFicheiros = () => {
    if (pronta) return;
    pronta = true;
    carregar(true);
  };
}
