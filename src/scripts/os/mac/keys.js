// ─────────────────────────────────────────────────────────────────────
// O teclado do Mac.
//
// Um sítio só para todos os atalhos, para não haver dois `keydown` a
// discutir a mesma tecla. Acrescentar um atalho é acrescentar uma linha
// à tabela — e é a mesma tabela que os menus mostram à direita dos
// nomes, por isso o que aparece lá é o que funciona mesmo.
// ─────────────────────────────────────────────────────────────────────

export function wireKeys(desk) {
  const { ctx } = desk;

  /** Atalhos com ⌘ (ou Ctrl fora do Mac), pela ordem em que se provam. */
  const COMMANDS = [
    { key: 'k', run: () => (desk.spotlight.visible() ? desk.spotlight.close() : desk.spotlight.open()) },
    { key: 'o', run: () => desk.spotlight.open() },
    { key: 'w', alt: true, run: () => desk.windows.closeAll() },
    { key: 'w', needsWindow: true, run: () => desk.windows.close(ctx.active) },
    { key: 'm', needsWindow: true, run: () => desk.windows.minimize(ctx.active) },
    { key: 'f', ctrl: true, needsWindow: true, run: () => desk.windows.zoom(ctx.active) },
    { key: 'c', shift: true, run: () => ctx.run('copy') },
    { key: ',', run: () => ctx.run('open:definicoes') },
  ];

  /** Os modificadores têm de bater certo: ⌥⌘W não é ⌘W. */
  const fits = (c, ev) =>
    c.key === ev.key.toLowerCase() &&
    Boolean(c.alt) === ev.altKey &&
    Boolean(c.shift) === ev.shiftKey &&
    // Fora do Mac o Ctrl faz de ⌘, por isso só conta como modificador
    // quando o ⌘ verdadeiro está em baixo.
    Boolean(c.ctrl) === (ev.ctrlKey && ev.metaKey);

  document.addEventListener('keydown', (ev) => {
    if (ctx.mode !== 'mac') return;
    const cmd = ev.metaKey || ev.ctrlKey;

    if (ev.key === 'Escape') {
      if (desk.spotlight.visible()) desk.spotlight.close();
      else desk.menus.closeAll();
      return;
    }

    // ⌘Tab anda pela lista enquanto o ⌘ estiver em baixo; larga-se e
    // activa-se. Por isso vive fora da tabela.
    if (cmd && ev.key === 'Tab') {
      ev.preventDefault();
      if (!desk.switcher.isOpen()) desk.switcher.open();
      else desk.switcher.step(ev.shiftKey);
      return;
    }

    if (!cmd) return;
    const hit = COMMANDS.find((c) => fits(c, ev));
    if (!hit) return;
    if (hit.needsWindow && !ctx.active) return;
    ev.preventDefault();
    hit.run();
  });

  document.addEventListener('keyup', (ev) => {
    if (desk.switcher.isOpen() && (ev.key === 'Meta' || ev.key === 'Control')) desk.switcher.close(true);
  });
}
