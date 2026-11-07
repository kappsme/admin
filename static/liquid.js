// Efecto "líquido": distorsiona el elemento con un filtro SVG animado.
// data-liquid="idle": ondula suave todo el tiempo. data-liquid="hover": solo al pasar el cursor.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('[data-liquid]').forEach(function (el, i) {
    var id = 'liquid-' + i, idle = el.dataset.liquid === 'idle', max = +el.dataset.liquidScale || (idle ? 11 : 22);
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = '<filter id="' + id + '" x="-10%" y="-10%" width="120%" height="120%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves="1" seed="4" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
      '<feGaussianBlur in="d" stdDeviation="0.4"/></filter>'; // el desenfoque mínimo suaviza el escalonado del desplazamiento
    document.body.appendChild(svg);
    var turb = svg.querySelector('feTurbulence'), disp = svg.querySelector('feDisplacementMap');
    var scale = 0, target = idle ? max : 0, raf = 0;
    el.style.filter = 'url(#' + id + ')';

    function frame(t) {
      scale += (target - scale) * 0.08; // suavizado
      var wob = idle ? 1 + 0.35 * Math.sin(t / 1800) : 1;
      turb.setAttribute('baseFrequency', (0.004 + 0.0015 * Math.sin(t / 2600)) + ' ' + (0.006 + 0.0015 * Math.cos(t / 2100)));
      disp.setAttribute('scale', (scale * wob).toFixed(2));
      if (idle || Math.abs(scale - target) > 0.05) raf = requestAnimationFrame(frame); else raf = 0;
    }
    function go(v) { target = v; if (!raf) raf = requestAnimationFrame(frame); }

    if (idle) go(max);
    else {
      var host = el.closest('a, button, .navbar-brand') || el;
      host.addEventListener('mouseenter', function () { go(max); });
      host.addEventListener('mouseleave', function () { go(0); });
    }
  });
})();
