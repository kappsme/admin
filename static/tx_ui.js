/* Comportamientos visuales comunes de TX (lo carga base_layout.html y las páginas sueltas).
   1. Fotos de perfil: un botón .tx-avatar con data-ampliar="<url>" abre la foto grande.
   2. Campos dinámicos: el servidor arma descripciones como "Nombre:Coca Cola | Tamaño:600 ml | Precio:900".
      Aquí se muestran como pares etiqueta/valor (.tx-campos), en la página y en todo lo que llegue después por AJAX.
      En listas desplegables (<option>) solo se cambia el separador por " · ", porque no admiten formato. */
(function () {
    "use strict";

    // ---------- 1. FOTO AMPLIADA ----------
    var visor = null;
    function abrirFoto(url, nombre) {
        if (!visor) {
            visor = document.createElement("dialog");
            visor.className = "tx-lightbox";
            visor.innerHTML = '<button type="button" class="cerrar" aria-label="Cerrar">×</button><figure><img alt=""><figcaption></figcaption></figure>';
            document.body.appendChild(visor);
            visor.addEventListener("click", function (e) {
                if (e.target === visor || e.target.classList.contains("cerrar")) visor.close();
            });
        }
        visor.querySelector("img").src = url;
        visor.querySelector("img").alt = nombre ? "Foto de " + nombre : "Foto de perfil";
        visor.querySelector("figcaption").textContent = nombre || "";
        if (typeof visor.showModal === "function") visor.showModal();
        else window.open(url, "_blank");
    }
    document.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest(".tx-avatar[data-ampliar]") : null;
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        abrirFoto(b.getAttribute("data-ampliar"), b.getAttribute("data-nombre"));
    }, true);

    // ---------- 2. CAMPOS DINÁMICOS ----------
    var SEP = " | ";
    var NO_TOCAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, TITLE: 1, INPUT: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };

    function partir(segmento) {
        var i = segmento.indexOf(":");
        if (i > 0 && i <= 40) {
            var e = segmento.slice(0, i).trim(), v = segmento.slice(i + 1).trim();
            if (e && !/^\d+$/.test(e)) return { e: e, v: v };   // "10:30" no es etiqueta
        }
        return { e: "", v: segmento.trim() };
    }

    // separadores originales ocultos: el textContent del bloque queda igual al texto que mandó el servidor,
    // así cualquier script que lea .text() de la celda sigue recibiendo "Campo:valor | Campo:valor"
    function oculto(t) {
        var s = document.createElement("span");
        s.className = "tx-oculto";
        s.setAttribute("aria-hidden", "true");
        s.textContent = t;
        return s;
    }

    function armar(texto) {
        var piezas = texto.split(SEP);
        var caja = document.createElement("span");
        caja.className = "tx-campos";
        piezas.forEach(function (p, n) {
            var d = partir(p);
            if (n > 0) caja.appendChild(oculto(SEP));
            var campo = document.createElement("span");
            campo.className = "tx-campo" + (!d.e && n === 0 ? " principal" : "");
            if (d.e) {
                var et = document.createElement("span");
                et.className = "tx-campo-e";
                et.textContent = d.e;
                campo.appendChild(et);
                campo.appendChild(oculto(":"));
            }
            var va = document.createElement("span");
            va.className = "tx-campo-v";
            va.textContent = d.v;
            if (!d.v) va.setAttribute("data-vacio", "");
            campo.appendChild(va);
            caja.appendChild(campo);
        });
        return caja;
    }

    function revisarTexto(nodo) {
        var t = nodo.nodeValue;
        if (!t || t.indexOf(SEP) < 0 || t.length > 1500) return;
        var padre = nodo.parentNode;
        if (!padre || NO_TOCAR[padre.nodeName]) return;
        if (padre.nodeName === "OPTION" || padre.closest("select")) {      // listas: solo un separador más limpio
            nodo.nodeValue = t.split(SEP).join(" · ");
            return;
        }
        if (padre.closest(".tx-campos, [data-sin-campos], [contenteditable], .chosen-container")) return;
        var antes = "", resto = t;
        var lineas = t.split(/\r?\n/);
        if (lineas.length > 1) return;                                        // texto con saltos: no es una descripción
        // conserva un prefijo como "Id 15 - " fuera de los campos
        var m = /^(\s*Id\s+\d+\s*-\s*)/i.exec(resto);
        if (m) { antes = m[1]; resto = resto.slice(m[1].length); }
        var frag = document.createDocumentFragment();
        if (antes) frag.appendChild(document.createTextNode(antes));
        frag.appendChild(armar(resto));
        padre.replaceChild(frag, nodo);
    }

    function revisar(raiz) {
        if (!raiz) return;
        if (raiz.nodeType === 3) { revisarTexto(raiz); return; }
        if (raiz.nodeType !== 1 || NO_TOCAR[raiz.nodeName]) return;
        var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
            acceptNode: function (n) { return n.nodeValue.indexOf(SEP) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; }
        });
        var lista = [];
        while (w.nextNode()) lista.push(w.currentNode);
        lista.forEach(revisarTexto);
    }

    function iniciar() {
        revisar(document.body);
        new MutationObserver(function (cambios) {
            cambios.forEach(function (c) {
                if (c.type === "characterData") revisarTexto(c.target);
                else c.addedNodes.forEach(revisar);
            });
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();

    window.txCampos = armar;   // por si una pantalla quiere armar los campos a mano
})();
