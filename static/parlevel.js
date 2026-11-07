// Pantalla de mapeo PARLEVEL: agrega/quita nombres, sugiere productos, filtra y pagina (todo contra /crud_parlevel).
(function () {
  var root = document.getElementById('parlevel-root');
  if (!root) return;
  var kappId = root.dataset.kappId;
  var buscar = document.getElementById('pl-buscar');
  var soloSin = document.getElementById('pl-solo-sin-mapear');
  var contador = document.getElementById('pl-contador');
  var filas = Array.prototype.slice.call(root.querySelectorAll('tbody tr'));
  var pager = ui.pager(document.getElementById('pl-pager'), function () { filtrar(false); });

  function post(payload) {
    payload.kapp_id = kappId;
    return fetch($SCRIPT_ROOT + '/crud_parlevel', {
      method: 'POST',
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  }

  function chip(id, nombre) {
    var c = document.createElement('span'); c.className = 'pl-chip'; c.dataset.mapId = id;
    var t = document.createElement('span'); t.className = 'pl-chip-texto'; t.textContent = nombre;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pl-del';
    b.setAttribute('aria-label', 'Quitar ' + nombre); b.innerHTML = '&times;';
    c.appendChild(t); c.appendChild(b);
    return c;
  }

  // Agrega un nombre de PARLEVEL a un producto (fila tr). Devuelve la promesa para poder encadenar.
  function agregar(tr, nombre) {
    return post({ accion: 'add', producto_id: tr.dataset.productoId, nombre: nombre }).then(function (j) {
      if (j.result === 'success') {
        tr.querySelector('.pl-chips').appendChild(chip(j.data.id, j.data.parlevel_nombre));
        ui.toast('Mapeo guardado', 'ok');
        filtrar(false);
        return true;
      }
      ui.toast(j.reason || 'No se pudo guardar', 'error');
      return false;
    }).catch(function () { ui.toast('Error de conexión', 'error'); return false; });
  }

  // ---------- filtros + paginación ----------
  function filtrar(reiniciar) {
    if (reiniciar !== false) pager.reset();
    var q = buscar.value.trim().toLowerCase(), mapeados = 0;
    var ok = filas.filter(function (tr) {
      var chips = tr.querySelectorAll('.pl-chip');
      if (chips.length) mapeados++;
      var nombres = Array.prototype.map.call(chips, function (c) { return c.textContent; }).join(' ').toLowerCase();
      // solo dígitos = ID exacto; si no, descripción (nombre y propiedades) o nombre PARLEVEL
      var coincide = !q || (/^\d+$/.test(q) ? tr.dataset.productoId === q : (tr.dataset.texto + ' ' + nombres).indexOf(q) !== -1);
      return coincide && (!soloSin.checked || chips.length === 0);
    });
    pager.update(ok.length);
    var r = pager.range();
    filas.forEach(function (tr) { tr.hidden = true; });
    ok.slice(r[0], r[1]).forEach(function (tr) { tr.hidden = false; });
    contador.textContent = ok.length + ' de ' + filas.length + ' productos · ' + mapeados + ' mapeados';
  }

  // ---------- asistente de sugerencias ----------
  function tokens(t) {
    // separa letras de números ("12u" -> "12", "u") para que 12u y 12 se parezcan
    return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ')
      .replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2').trim().split(' ').filter(Boolean);
  }
  function puntaje(qt, tt) {
    if (!qt.length || !tt.length) return 0;
    var suma = 0;
    qt.forEach(function (a) {
      var mejor = 0;
      tt.forEach(function (b) {
        var v = a === b ? 1 : (a.length >= 3 && b.length >= 3 && (b.indexOf(a) === 0 || a.indexOf(b) === 0)) ? 0.8 : 0;
        if (v > mejor) mejor = v;
      });
      suma += mejor;
    });
    var comunes = qt.filter(function (a) { return tt.indexOf(a) !== -1; }).length;
    return 0.75 * (suma / qt.length) + 0.25 * (comunes / (qt.length + tt.length - comunes));
  }
  var catalogo = filas.map(function (tr) {
    var nombre = tr.querySelector('.pl-nombre').textContent, props = tr.querySelector('.pl-props').textContent;
    return { tr: tr, id: tr.dataset.productoId, nombre: nombre, props: props, tn: tokens(nombre), tt: tokens(nombre + ' ' + props) };
  });
  var sugInput = document.getElementById('pl-sug-input'), sugLista = document.getElementById('pl-sug-lista');

  function sugerir() {
    var texto = sugInput.value.trim(), qt = tokens(texto);
    sugLista.innerHTML = '';
    if (!qt.length) return;
    var res = catalogo.map(function (c) {
      return { c: c, s: Math.max(puntaje(qt, c.tn), 0.85 * puntaje(qt, c.tt)) };
    }).filter(function (r) { return r.s >= 0.3; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 5);
    if (!res.length) { var vacio = document.createElement('li'); vacio.className = 'pl-sug-vacio'; vacio.textContent = 'Sin coincidencias parecidas.'; sugLista.appendChild(vacio); return; }
    res.forEach(function (r) {
      var li = document.createElement('li');
      var pct = document.createElement('span'); pct.className = 'pl-sug-score'; pct.textContent = Math.round(r.s * 100) + '%';
      var info = document.createElement('span'); info.className = 'pl-sug-info';
      var n = document.createElement('strong'); n.textContent = r.c.nombre;
      var d = document.createElement('small'); d.textContent = 'ID ' + r.c.id + (r.c.props ? ' · ' + r.c.props : '');
      info.appendChild(n); info.appendChild(d);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-primary btn-sm'; b.textContent = 'Asignar';
      b.addEventListener('click', function () {
        agregar(r.c.tr, texto).then(function (ok) { if (ok) { sugInput.value = ''; sugLista.innerHTML = ''; } });
      });
      li.appendChild(pct); li.appendChild(info); li.appendChild(b);
      sugLista.appendChild(li);
    });
  }
  sugInput.addEventListener('input', sugerir);

  // ---------- agregar / quitar en la tabla ----------
  root.addEventListener('submit', function (e) {
    var form = e.target.closest('.pl-add');
    if (!form) return;
    e.preventDefault();
    var input = form.querySelector('input'), nombre = input.value.trim();
    if (!nombre) return;
    agregar(form.closest('tr'), nombre).then(function (ok) { if (ok) input.value = ''; });
  });

  root.addEventListener('click', function (e) {
    var b = e.target.closest('.pl-del');
    if (!b) return;
    var c = b.closest('.pl-chip');
    ui.confirm('¿Quitar "' + c.querySelector('.pl-chip-texto').textContent + '" de este producto?', { titulo: 'Quitar mapeo', ok: 'Quitar' }).then(function (si) {
      if (!si) return;
      post({ accion: 'delete', id: c.dataset.mapId }).then(function (j) {
        if (j.result === 'success') { c.remove(); ui.toast('Mapeo quitado', 'ok'); filtrar(false); }
        else ui.toast(j.reason || 'No se pudo quitar', 'error');
      }).catch(function () { ui.toast('Error de conexión', 'error'); });
    });
  });

  buscar.addEventListener('input', filtrar);
  soloSin.addEventListener('change', filtrar);
  filtrar();
})();
