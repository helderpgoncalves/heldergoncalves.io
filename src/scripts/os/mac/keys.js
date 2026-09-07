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
    { key: 'w', needsWindow: true, run: () => desk.windows.close(ctx.active) },
    { key: 'm', needsWindow: true, run: () => desk.windows.minimize(ctx.active) },
  ];

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
    const key = ev.key.toLowerCase();
    const hit = COMMANDS.find((c) => c.key === key);
    if (!hit) return;
    if (hit.needsWindow && !ctx.active) return;
    ev.preventDefault();
    hit.run();
  });

  document.addEventListener('keyup', (ev) => {
    if (desk.switcher.isOpen() && (ev.key === 'Meta' || ev.key === 'Control')) desk.switcher.close(true);
  });
}
