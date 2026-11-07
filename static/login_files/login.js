// Login: etiquetas flotantes, validación, ver contraseña y efecto 3D de la tarjeta (sin librerías).
(function () {
  var form = document.getElementById('ingreso');
  var inputs = form.querySelectorAll('.input100');

  inputs.forEach(function (input) {
    input.addEventListener('blur', function () { input.classList.toggle('has-val', input.value.trim() !== ''); });
    input.addEventListener('focus', function () { input.parentNode.classList.remove('alert-validate'); });
  });

  form.addEventListener('submit', function (e) {
    var ok = true;
    inputs.forEach(function (input) {
      if (input.value.trim() === '') { input.parentNode.classList.add('alert-validate'); ok = false; }
    });
    if (!ok) e.preventDefault();
  });

  var toggle = form.querySelector('.btn-show-pass');
  toggle.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); } });
  toggle.addEventListener('click', function () {
    var pass = document.getElementById('password'), show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    toggle.querySelector('.ojo').hidden = show;
    toggle.querySelector('.ojo-off').hidden = !show;
    toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  // Efecto 3D: la tarjeta se inclina y la escena se mueve con el mouse (solo puntero fino y sin reduced-motion)
  if (!matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)').matches) return;
  var card = document.getElementById('tilt'), root = document.documentElement;
  addEventListener('mousemove', function (e) {
    var nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
    root.style.setProperty('--rx', nx * 10); root.style.setProperty('--ry', ny * 8);
    var r = card.getBoundingClientRect();
    var cx = (e.clientX - r.left) / r.width - .5, cy = (e.clientY - r.top) / r.height - .5;
    var near = Math.abs(cx) < 1.2 && Math.abs(cy) < 1.2;
    card.style.setProperty('--tx', near ? cx * 8 : 0);
    card.style.setProperty('--ty', near ? -cy * 8 : 0);
    card.style.setProperty('--gx', (cx + .5) * 100 + '%');
    card.style.setProperty('--gy', (cy + .5) * 100 + '%');
  });
})();
