// Utilidades de interfaz compartidas: avisos (toast), confirmación y paginador. Requiere Bootstrap 5.
window.ui = (function () {
  function contenedor() {
    var c = document.getElementById('ui-toasts');
    if (!c) {
      c = document.createElement('div');
      c.id = 'ui-toasts'; c.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      c.setAttribute('aria-live', 'polite');
      document.body.appendChild(c);
    }
    return c;
  }

  // tipo: 'ok' | 'error' | 'info'
  function toast(texto, tipo) {
    var t = document.createElement('div');
    t.className = 'toast ui-toast ui-toast-' + (tipo || 'info');
    t.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    var cuerpo = document.createElement('div'); cuerpo.className = 'd-flex';
    var msg = document.createElement('div'); msg.className = 'toast-body'; msg.textContent = texto;
    var x = document.createElement('button'); x.type = 'button'; x.className = 'btn-close me-2 m-auto';
    x.setAttribute('data-bs-dismiss', 'toast'); x.setAttribute('aria-label', 'Cerrar');
    cuerpo.appendChild(msg); cuerpo.appendChild(x); t.appendChild(cuerpo);
    contenedor().appendChild(t);
    var inst = new bootstrap.Toast(t, { delay: tipo === 'error' ? 7000 : 3500 });
    t.addEventListener('hidden.bs.toast', function () { t.remove(); });
    inst.show();
  }

  var modalConfirm;
  // Devuelve una promesa: true si el usuario confirma.
  function confirmar(texto, opciones) {
    opciones = opciones || {};
    if (!modalConfirm) {
      modalConfirm = document.createElement('div');
      modalConfirm.className = 'modal fade'; modalConfirm.tabIndex = -1;
      modalConfirm.innerHTML = '<div class="modal-dialog modal-dialog-centered modal-sm"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>' +
        '<div class="modal-body"></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>' +
        '<button type="button" class="btn btn-primary" data-ok="1"></button></div></div></div>';
      document.body.appendChild(modalConfirm);
    }
    modalConfirm.querySelector('.modal-title').textContent = opciones.titulo || 'Confirmar';
    modalConfirm.querySelector('.modal-body').textContent = texto;
    var ok = modalConfirm.querySelector('[data-ok]');
    ok.textContent = opciones.ok || 'Aceptar';
    return new Promise(function (resolve) {
      var inst = bootstrap.Modal.getOrCreateInstance(modalConfirm), confirmado = false;
      function alAceptar() { confirmado = true; inst.hide(); }
      function alCerrar() { ok.removeEventListener('click', alAceptar); modalConfirm.removeEventListener('hidden.bs.modal', alCerrar); resolve(confirmado); }
      ok.addEventListener('click', alAceptar);
      modalConfirm.addEventListener('hidden.bs.modal', alCerrar);
      inst.show();
    });
  }

  // Paginador: crea los controles dentro de `el` y llama onChange() al cambiar de página o tamaño.
  function pager(el, onChange) {
    var st = { page: 1, size: 25, total: 0 };
    el.className = 'pager';
    el.innerHTML = '<label class="pager-size">Filas <select class="form-select form-select-sm" aria-label="Filas por página">' +
      '<option>25</option><option>50</option><option>100</option></select></label>' +
      '<span class="pager-info" aria-live="polite"></span>' +
      '<div class="btn-group btn-group-sm"><button type="button" class="btn btn-secondary" data-p="-1" aria-label="Página anterior">&lsaquo;</button>' +
      '<button type="button" class="btn btn-secondary" data-p="1" aria-label="Página siguiente">&rsaquo;</button></div>';
    var sel = el.querySelector('select'), info = el.querySelector('.pager-info'), btns = el.querySelectorAll('button');
    function paginas() { return Math.max(1, Math.ceil(st.total / st.size)); }
    function pintar() {
      info.textContent = 'Página ' + st.page + ' de ' + paginas();
      btns[0].disabled = st.page <= 1; btns[1].disabled = st.page >= paginas();
      el.hidden = st.total <= 25;
    }
    sel.addEventListener('change', function () { st.size = +sel.value; st.page = 1; onChange(); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]');
      if (!b) return;
      st.page = Math.min(paginas(), Math.max(1, st.page + +b.dataset.p)); onChange();
    });
    return {
      reset: function () { st.page = 1; },
      update: function (total) { st.total = total; if (st.page > paginas()) st.page = paginas(); pintar(); },
      range: function () { return [(st.page - 1) * st.size, st.page * st.size]; }
    };
  }

  return { toast: toast, confirm: confirmar, pager: pager };
})();
