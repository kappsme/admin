// Tickets de soporte: el tiempo abierto avanza en vivo y cambia de color después de 24 h y de 72 h.
(function () {
    function texto(seg) {
        var d = Math.floor(seg / 86400), h = Math.floor(seg % 86400 / 3600), m = Math.floor(seg % 3600 / 60);
        if (d) return d + ' d ' + h + ' h';
        if (h) return h + ' h ' + m + ' min';
        return m + ' min';
    }
    function pintar() {
        document.querySelectorAll('.tk-tiempo').forEach(function (el) {
            var seg = parseInt(el.getAttribute('data-seg'), 10) || 0;
            var desde = el.getAttribute('data-desde');
            if (desde) {
                seg = Math.max(0, Math.floor((Date.now() - Date.parse(desde)) / 1000));
                el.textContent = texto(seg);
            }
            el.classList.toggle('tk-24', seg >= 86400 && seg < 259200);
            el.classList.toggle('tk-72', seg >= 259200);
        });
    }
    pintar();
    setInterval(pintar, 30000);
})();
