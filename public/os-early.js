/* Corre antes de pintar: aplica o tema guardado (sem piscar), escolhe o
   modo (Mac ou telefone) e esconde o documento simples. Fica num
   ficheiro à parte para que a política de segurança possa proibir
   scripts embutidos — nada de 'unsafe-inline'. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  try {
    var p = JSON.parse(localStorage.getItem('helderos') || '{}');
    if (p.theme && p.theme !== 'auto') d.setAttribute('data-theme', p.theme);
    if (p.wallpaper) d.setAttribute('data-wallpaper', p.wallpaper);
    if (p.motion) d.setAttribute('data-motion', p.motion);
    if (p.brightness) d.style.setProperty('--brightness', String(p.brightness));
  } catch (e) {}
  var framed = location.search.indexOf('device') > -1;
  var phone =
    framed ||
    window.matchMedia('(max-width: 860px), (pointer: coarse) and (max-width: 1180px)').matches;
  d.setAttribute('data-mode', phone ? 'ios' : 'mac');
  if (framed) d.classList.add('in-frame');
  /* Rede de segurança: se o sistema não arrancar, devolvemos o documento. */
  setTimeout(function () {
    var os = document.getElementById('os');
    if (!os || !os.classList.contains('ready')) d.classList.remove('js');
  }, 8000);
})();
