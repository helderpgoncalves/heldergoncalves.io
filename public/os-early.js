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
  /* O boot decide-se aqui, antes do 1º paint — senão a Desktop aparece
     um instante por baixo antes de index.js (módulo, sempre adiado)
     conseguir tapá-la. Não se pode tocar em #boot: este script corre
     no <head>, antes de o <body> (onde #boot vive, em Shell.astro) ser
     sequer parseado — document.getElementById devolvia sempre null, e
     o ecrã de arranque nunca chegava a aparecer a tempo. Em vez disso,
     marca-se um atributo no <html>, que já existe agora, e é o CSS
     (mac.css) que esconde a Desktop por baixo enquanto ele lá estiver.
     Só lê a sessão, nunca marca: quem marca 'helderos-booted' continua
     a ser o próprio arranque em index.js, ao fim da saudação. */
  try {
    if (!framed && !sessionStorage.getItem('helderos-booted')) {
      d.setAttribute('data-boot', '1');
    }
  } catch (e) {}
  /* Rede de segurança: se o sistema não arrancar, devolvemos o documento
     — e tiramos [data-boot], senão o CSS ficava a esconder tudo para
     sempre por baixo de um #boot que ninguém vai mostrar. */
  setTimeout(function () {
    var os = document.getElementById('os');
    if (!os || !os.classList.contains('ready')) {
      d.classList.remove('js');
      d.removeAttribute('data-boot');
    }
  }, 8000);
})();
