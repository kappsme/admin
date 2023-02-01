$(document).ready(function () {

  // BOTON PARA ENVIAR NUEVO ELEMENTO AL CATALOGO MARCAS / TIPO EQUIPO / ZONA / REPUESTO / PROVEEDOR
  $('#btn-ingreso-elemento-confirmacion').click(function (event) {
    $.post($SCRIPT_ROOT + '/ingreso_catalogo', {
      tipo_accion: $('#modal-ingreso-elemento-accion').val(),
      valor: $('#modal-ingreso-elemento-valor').val(),
    }, function (data) {
      // ERROR EN TOKEN O SESION
      if (data.substr(0, 15) == '<!DOCTYPE html>') {
        document.getElementById("out").submit();
      }
      if ($('#modal-ingreso-elemento-accion').val() == 'marca') {
        document.getElementById('guardar-boleta-alerta').className = "alert alert-success m-1 p-1";
        $('#guardar-boleta-alerta').text("La nueva Marca se agregó correctamente al catálogo.");
        document.getElementById('guardar-boleta-alerta').hidden = false;
        $('#modal-ingreso-elemento').modal('hide');
      }
      if ($('#modal-ingreso-elemento-accion').val() == 'tipo-equipo') {
        document.getElementById('guardar-boleta-alerta').className = "alert alert-success m-1 p-1";
        $('#guardar-boleta-alerta').text("El nuevo Tipo de Equipo se agregó correctamente al catálogo.");
        document.getElementById('guardar-boleta-alerta').hidden = false;
        $('#modal-ingreso-elemento').modal('hide');
      }
      // EN NUEVA BOLETA
      if ($('#modal-ingreso-elemento-accion').val() == 'zona') {
        document.getElementById('guardar-alerta').className = "alert alert-success m-1 p-1";
        $('#guardar-alerta').text("La nueva Zona se agregó correctamente al catálogo.");
        document.getElementById('guardar-alerta').hidden = false;
        $('#modal-ingreso-elemento').modal('hide');
      }
      // EN MODAL DE BOLETA
      if ($('#modal-ingreso-elemento-accion').val() == 'zona2') {
        document.getElementById('guardar-alerta2').className = "alert alert-success m-1 p-1";
        $('#guardar-alerta2').text("La nueva Zona se agregó correctamente al catálogo.");
        document.getElementById('guardar-alerta2').hidden = false;
        $('#modal-ingreso-elemento').modal('hide');
      }
      if ($('#modal-ingreso-elemento-accion').val() == 'repuesto') {
        document.getElementById('repuesto-alerta').className = "alert alert-success m-1 p-1";
        $('#repuesto-alerta').text("El nuevo Tipo de Repuesto se agregó correctamente al catálogo.");
        document.getElementById('repuesto-alerta').hidden = false;
        $('#modal-ingreso-elemento').modal('hide');
      }
      if ($('#modal-ingreso-elemento-accion').val() == 'proveedor' && data == "EOK") {
        $('#modal-ingreso-elemento').modal('hide');
        $('#btn-editar-lote').click();
      }
    });
  });


});