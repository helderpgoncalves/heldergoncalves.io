// ─────────────────────────────────────────────────────────────────────
// Ficheiros — o que se desenha: a lista de pastas, a grelha de dentro
// de uma pasta, e a pré-visualização.
//
// Tudo o que fala com o servidor está em ficheiros.js, ao lado. Aqui só
// se lê o estado e se escreve no ecrã — e escreve-se com `textContent`,
// porque o nome de um ficheiro é texto de outra pessoa: nunca entra em
// marcação.
// ─────────────────────────────────────────────────────────────────────

// Uma miniatura é o ficheiro inteiro a descer pelo fio — não há
// versão pequena de nada, e fabricá-la no servidor seria calcular por
// pedido o que ninguém pediu. Acima deste tamanho fica o ícone com a
// extensão, e a imagem só se vê ao abrir. Meio megabyte é o ponto onde
// uma fotografia de telemóvel já deixa de valer a pena.
const MINIATURA_MAX = 512 * 1024;
// O que se mostra de um texto na pré-visualização. O resto continua no
// ficheiro; para o ler todo, descarrega-se.
const TEXTO_MAX = 200 * 1024;

const KB = 1024;

export function criarVista(el, t, ctx, estado) {
  const pastas = el.querySelector('[data-fic-pastas]');
  const semPastas = el.querySelector('[data-fic-sem-pastas]');
  const titulo = el.querySelector('[data-fic-titulo]');
  const sub = el.querySelector('[data-fic-sub]');
  const lista = el.querySelector('[data-fic-lista]');
  const vazio = el.querySelector('[data-fic-vazio]');
  const vazioTexto = el.querySelector('[data-fic-vazio-texto]');
  const botaoAdd = el.querySelector('[data-fic-add]');
  const botaoRemoverPasta = el.querySelector('[data-fic-remover-pasta]');
  const botaoPartilhar = el.querySelector('[data-fic-partilhar]');
  const botaoNova = el.querySelector('[data-fic-nova]');
  const vista = el.querySelector('[data-fic-vista]');
  const vistaNome = el.querySelector('[data-fic-vista-nome]');
  const vistaSub = el.querySelector('[data-fic-vista-sub]');
  const vistaCorpo = el.querySelector('[data-fic-vista-corpo]');
  const vistaBaixar = el.querySelector('[data-fic-vista-baixar]');
  const vistaRemover = el.querySelector('[data-fic-vista-remover]');
  const erro = el.querySelector('[data-fic-erro]');

  const dataFmt = new Intl.DateTimeFormat(ctx.data.intlLocale, { dateStyle: 'medium', timeStyle: 'short' });
  const quando = (iso) => {
    try {
      return dataFmt.format(new Date(iso));
    } catch (_) {
      return iso;
    }
  };

  function tamanho(bytes) {
    if (bytes < KB) return bytes + ' B';
    if (bytes < KB * KB) return Math.round(bytes / KB) + ' KB';
    return (bytes / (KB * KB)).toFixed(1) + ' MB';
  }

  const extensao = (nome) => (nome.includes('.') ? nome.split('.').pop().slice(0, 5) : '—');
  const url = (id, baixar) => '/api/ficheiros/abrir/' + encodeURIComponent(id) + (baixar ? '?descarregar=1' : '');

  function no(tag, cls, texto) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  // ── As pastas ──────────────────────────────────────────────────────
  function desenharPastas() {
    pastas.textContent = '';
    for (const p of estado.pastas) {
      const item = no('button', 'fic-pasta' + (p.id === (estado.pasta && estado.pasta.id) ? ' on' : ''));
      item.type = 'button';
      item.dataset.ficPasta = p.id;

      const icone = no('span', 'fic-pasta-icone');
      icone.innerHTML = '<svg viewBox="0 0 100 100" width="19" height="19" aria-hidden="true"><use href="#ui-folder"/></svg>';
      const corpo = no('span', 'fic-pasta-corpo');
      corpo.appendChild(no('p', 'fic-pasta-nome', p.nome));
      // Ao dono interessa a quem a pasta pertence; ao cliente, o que lá
      // tem — o email dele não lhe diz nada que já não saiba.
      corpo.appendChild(no('p', 'fic-pasta-meta', estado.dono ? p.cliente : p.ficheiros + ' ' + t.files));

      item.append(icone, corpo);
      const linha = document.createElement('li');
      linha.appendChild(item);
      pastas.appendChild(linha);
    }
    const nenhuma = estado.pastas.length === 0;
    semPastas.hidden = !nenhuma;
    semPastas.textContent = estado.dono ? t.noFoldersOwner : t.noFolders;
    botaoNova.hidden = !estado.dono;
  }

  // ── O que está na pasta ────────────────────────────────────────────
  function cara(f) {
    const face = no('span', 'fic-item-face');
    if (f.tipo.indexOf('image/') === 0 && f.tamanho <= MINIATURA_MAX) {
      const img = document.createElement('img');
      img.src = url(f.id);
      img.alt = '';
      img.loading = 'lazy';
      face.appendChild(img);
      return face;
    }
    face.appendChild(no('span', 'fic-item-ext', extensao(f.nome)));
    return face;
  }

  function desenharFicheiros() {
    const aberta = Boolean(estado.pasta);
    titulo.textContent = aberta ? estado.pasta.nome : t.pick;
    sub.textContent = aberta
      ? (estado.dono ? estado.pasta.cliente + ' · ' : '') + tamanho(estado.ocupado) + ' ' + t.used
      : '';
    botaoAdd.hidden = !aberta;
    botaoRemoverPasta.hidden = !aberta || !estado.dono;
    // Só o dono partilha. O rótulo diz o que a pasta é agora — privada
    // ou já de alguém — para não ser preciso abrir o campo só para ver.
    botaoPartilhar.hidden = !aberta || !estado.dono;
    if (aberta && estado.dono) {
      const com = estado.pasta.cliente;
      botaoPartilhar.textContent = com ? t.sharedWith.replace('{quem}', com) : t.share;
    }

    lista.textContent = '';
    for (const f of estado.ficheiros) {
      const item = no('button', 'fic-item');
      item.type = 'button';
      item.dataset.ficItem = f.id;
      item.append(cara(f), no('p', 'fic-item-nome', f.nome), no('span', 'fic-item-meta', tamanho(f.tamanho)));
      const linha = document.createElement('li');
      linha.appendChild(item);
      lista.appendChild(linha);
    }

    const nenhum = estado.ficheiros.length === 0;
    lista.hidden = nenhum;
    vazio.hidden = !nenhum;
    vazioTexto.textContent = aberta ? t.empty : t.pick;
  }

  // ── A pré-visualização ─────────────────────────────────────────────
  // Mostra-se o que dá para mostrar, e mais nada: imagem, PDF num
  // `<iframe>` do próprio endpoint, e texto como texto. O que não entra
  // nestas três leva ícone, tamanho, data e o botão de descarregar.
  async function corpoDaVista(f) {
    vistaCorpo.textContent = '';
    if (f.tipo.indexOf('image/') === 0) {
      const img = document.createElement('img');
      img.src = url(f.id);
      img.alt = f.nome;
      vistaCorpo.appendChild(img);
      return;
    }
    if (f.tipo === 'application/pdf') {
      const frame = document.createElement('iframe');
      frame.src = url(f.id);
      frame.title = f.nome;
      vistaCorpo.appendChild(frame);
      return;
    }
    if (f.tipo.indexOf('text/') === 0) {
      const bloco = no('pre', null, '');
      vistaCorpo.appendChild(bloco);
      try {
        const res = await fetch(url(f.id), { headers: { Accept: 'text/plain' } });
        const texto = await res.text();
        // `textContent`: o ficheiro é de outra pessoa, e um `<script>`
        // lá dentro é só texto até alguém decidir o contrário.
        bloco.textContent = texto.slice(0, TEXTO_MAX);
      } catch (_) {
        bloco.textContent = t.errors.generic;
      }
      return;
    }
    const sem = no('div', 'fic-vista-sem');
    sem.innerHTML = '<span class="fic-vazio-icone" aria-hidden="true"><svg viewBox="0 0 100 100" width="26" height="26"><use href="#ui-note"/></svg></span>';
    sem.appendChild(no('p', 'm-0', t.noPreview));
    vistaCorpo.appendChild(sem);
  }

  function mostrar(f) {
    estado.aberto = f;
    vistaNome.textContent = f.nome;
    vistaSub.textContent = tamanho(f.tamanho) + ' · ' + quando(f.at) + ' · ' + t.by + ' ' + f.por;
    vistaBaixar.href = url(f.id, true);
    vistaBaixar.setAttribute('download', f.nome);
    vistaRemover.hidden = !(estado.dono || f.por === estado.email);
    vista.hidden = false;
    corpoDaVista(f);
  }

  function fechar() {
    estado.aberto = null;
    vista.hidden = true;
    // Largar o `<iframe>` e a `<img>` ao fechar: senão um PDF de vinte
    // megabytes continuava em memória atrás de uma vista escondida.
    vistaCorpo.textContent = '';
  }

  let temporizador = 0;
  function avisar(texto) {
    erro.textContent = texto;
    erro.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      erro.hidden = true;
    }, 4000);
  }

  function render() {
    desenharPastas();
    desenharFicheiros();
    el.classList.toggle('pasta-aberta', Boolean(estado.pasta));
  }

  return { render, mostrar, fechar, avisar };
}
