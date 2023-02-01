$(document).ready(function () {

    // GENERAR REPORTE PAGOS
    $('#btn-reporte-pagos').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 1;
        document.getElementById('tipo-accion').value = 1;
        tipo_accion2 = 0;
        if (document.getElementById("rep-pagos-taller").checked == true) {
            tipo_accion2 += 1;
        }
        if (document.getElementById("rep-pagos-tienda").checked == true) {
            tipo_accion2 += 2;
        }
        document.getElementById('tipo-accion2').value = tipo_accion2;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // DESCARGAR REPORTE PAGOS
    $('#reporte-descarga-excel').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 1;
        document.getElementById('tipo-accion').value = 2;
        tipo_accion2 = 0;
        if (document.getElementById("rep-pagos-taller").checked == true) {
            tipo_accion2 += 1;
        }
        if (document.getElementById("rep-pagos-tienda").checked == true) {
            tipo_accion2 += 2;
        }
        document.getElementById('tipo-accion2').value = tipo_accion2;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE liquidaciones
    $('#btn-reporte-liquidaciones').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 9;
        document.getElementById('tipo-accion').value = 1;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // DESCARGAR REPORTE LIQUIDACIONES EXCEL
    $('#reporte-descarga-excel-liquidaciones').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 9;
        document.getElementById('tipo-accion').value = 2;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE FACTURAS
    $('#btn-reporte-facturas').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 3;
        document.getElementById('tipo-accion').value = 1;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // DESCARGAR REPORTE FACTURAS
    $('#reporte-descarga-excel-facturas').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 3;
        document.getElementById('tipo-accion').value = 2;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE BOLETAS
    $('#btn-reporte-boletas').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 4;
        document.getElementById('tipo-accion').value = 1;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // DESCARGAR REPORTE BOLETAS
    $('#reporte-descarga-excel-boletas').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 4;
        document.getElementById('tipo-accion').value = 2;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE TIEMPOS
    $('#btn-reporte-tiempos').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 5;
        document.getElementById('tipo-accion').value = 1;
        document.getElementById("frm-reporte-inicio").submit();
    });


    // DESCARGAR REPORTE TIEMPOS
    $('#reporte-descarga-excel-tiempos').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 5;
        document.getElementById('tipo-accion').value = 2;
        document.getElementById("frm-reporte-inicio").submit();
    });


    // GENERAR REPORTE VENTAS
    $('#btn-reporte-ventas').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 6;
        document.getElementById('tipo-accion').value = 1;
        tipo_accion2 = 0;
        if (document.getElementById("rep-ventas-taller").checked == true) {
            tipo_accion2 += 1;
        }
        if (document.getElementById("rep-ventas-tienda").checked == true) {
            tipo_accion2 += 2;
        }
        document.getElementById('tipo-accion2').value = tipo_accion2;
        document.getElementById("frm-reporte-inicio").submit();
    });


    // DESCARGAR REPORTE VENTAS
    $('#reporte-descarga-excel-ventas').click(function (event) {
        document.getElementById('fecha-inicio').value = document.getElementById('fecha-inicio2').value;
        document.getElementById('fecha-fin').value = document.getElementById('fecha-fin2').value;
        document.getElementById('tipo-reporte').value = 6;
        document.getElementById('tipo-accion').value = 2;
        tipo_accion2 = 0;
        if (document.getElementById("rep-ventas-taller").checked == true) {
            tipo_accion2 += 1;
        }
        if (document.getElementById("rep-ventas-tienda").checked == true) {
            tipo_accion2 += 2;
        }
        document.getElementById('tipo-accion2').value = tipo_accion2;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE INICIO PAGOS
    $('#btn-reporte-inicio').click(function (event) {
        document.getElementById('tipo-reporte').value = 1;
        document.getElementById('tipo-accion').value = 1;
        var today = new Date();
        document.getElementById('fecha-inicio').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById('fecha-fin').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE INICIO FACTURAS
    $('#btn-reporte-iniciof').click(function (event) {
        document.getElementById('tipo-reporte').value = 3;
        document.getElementById('tipo-accion').value = 1;
        var today = new Date();
        document.getElementById('fecha-inicio').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById('fecha-fin').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE INICIO BOLETAS
    $('#btn-reporte-inicio-boletas').click(function (event) {
        document.getElementById('tipo-reporte').value = 4;
        document.getElementById('tipo-accion').value = 1;
        var today = new Date();
        document.getElementById('fecha-inicio').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById('fecha-fin').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE INICIO TIEMPOS
    $('#btn-reporte-inicio-tiempos').click(function (event) {
        document.getElementById('tipo-reporte').value = 5;
        document.getElementById('tipo-accion').value = 1;
        var today = new Date();
        document.getElementById('fecha-inicio').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById('fecha-fin').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE INICIO VENTAS
    $('#btn-reporte-inicio-ventas').click(function (event) {
        document.getElementById('tipo-reporte').value = 6;
        document.getElementById('tipo-accion').value = 1;
        document.getElementById('tipo-accion2').value = 0;
        var today = new Date();
        document.getElementById('fecha-inicio').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById('fecha-fin').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE INICIO LIQUIDACIONES
    $('#btn-reporte-inicio-liquidaciones-detalle').click(function (event) {
        document.getElementById('tipo-reporte').value = 9;
        document.getElementById('tipo-accion').value = 1;
        var today = new Date();
        document.getElementById('fecha-inicio').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById('fecha-fin').value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
        document.getElementById("frm-reporte-inicio").submit();
    });


    // GENERAR REPORTE INVENTARIO - EXISTENCIAS (INICIO)
    $('#btn-rep-inicio-inv-existencias').click(function (event) {
        document.getElementById('tipo-reporte').value = 7;
        document.getElementById('tipo-accion').value = 1;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // GENERAR REPORTE INVENTARIO - EXISTENCIAS
    $('#btn-rep-inv-existencias').click(function (event) {
        document.getElementById('tipo-reporte').value = 7;
        document.getElementById('tipo-accion').value = 1;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // DESCARGAR REPORTE INVENTARIO - EXISTENCIAS
    $('#reporte-descarga-excel-inv-existencias').click(function (event) {
        document.getElementById('tipo-reporte').value = 7;
        document.getElementById('tipo-accion').value = 2;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // PANTALLA LIQUIDACION  (INICIO)
    $('#btn-rep-inicio-inv-liquidacion').click(function (event) {
        document.getElementById('tipo-reporte').value = 8;
        document.getElementById('tipo-accion').value = 1;
        document.getElementById("frm-reporte-inicio").submit();
    });

    // BOTON PARA LIQUIDAR
    $(document).on('click', '#modalLiquidacion-btnOk', function (e) {
        var this2 = this;
        this2.disabled = true;
        $(this2).find(".spinner-border").css("visibility", "");
        $.post($SCRIPT_ROOT + '/reportes', {
            "tipo-reporte": 8, // Liquidacion
            "tipo-accion": 2, // Ejecutar
        }, function (datos, e) {
            if (datos == 'OK') {
                document.getElementById('tipo-reporte').value = 8;
                document.getElementById('tipo-accion').value = 1;
                document.getElementById("frm-reporte-inicio").submit();
            }
            if (datos == 'discrepancias') {
                $('#modalNotificacion-mensaje').html("Se encontraron boletas que ya habían sido liquidadas.<br>Por favor, genere de nuevo el reporte de liquidación.");
                this2.disabled = false;
                $("#modalLiquidacion-btnOk").text("Generar de Nuevo");
                $(this2).find(".spinner-border").css("visibility", "hidden");
                document.getElementById('modalLiquidacion-btnOk').addEventListener("click", function () {
                    document.getElementById('tipo-reporte').value = 8;
                    document.getElementById('tipo-accion').value = 1;
                    document.getElementById("frm-reporte-inicio").submit();
                }
                    , false);
            }
        });
    });


    // CATALOGO ZONAS
    $('#btn-catalogo-zonas').click(function (event) {
        document.getElementById('tipo-catalogo').value = 1;
        document.getElementById('tipo-accion-catalogo').value = 1;
        document.getElementById("frm-catalogo").submit();
    });

    // CATALOGO MARCAS
    $('#btn-catalogo-marcas').click(function (event) {
        document.getElementById('tipo-catalogo').value = 2;
        document.getElementById('tipo-accion-catalogo').value = 1;
        document.getElementById("frm-catalogo").submit();
    });

    // CATALOGO EQUIPOS
    $('#btn-catalogo-equipos').click(function (event) {
        document.getElementById('tipo-catalogo').value = 3;
        document.getElementById('tipo-accion-catalogo').value = 1;
        document.getElementById("frm-catalogo").submit();
    });

    // CATALOGO REPUESTOS
    $('#btn-catalogo-repuestos').click(function (event) {
        document.getElementById('tipo-catalogo').value = 4;
        document.getElementById('tipo-accion-catalogo').value = 1;
        document.getElementById("frm-catalogo").submit();
    });

    // CATALOGO PROVEEDORES
    $('#btn-catalogo-proveedores').click(function (event) {
        document.getElementById('tipo-catalogo').value = 5;
        document.getElementById('tipo-accion-catalogo').value = 1;
        document.getElementById("frm-catalogo").submit();
    });

    // ELEMENTOS DEL CATALOGO
    $(document).on('click', '#btn-editar-catalogo-modal', function () {
        var id = $(this).attr('cat-id');
        var nombre = $(this).attr('cat-nombre');
        $('#catalogo-nombre-viejo').val(nombre);
        $('#modal-editar-catalogo').modal('show');
    });

    // ELEMENTOS DEL CATALOGO
    $(document).on('click', '#btn-editar-catalogo-modal', function () {
        var id = $(this).attr('cat-id');
        var nombre = $(this).attr('cat-nombre');
        var estado = $(this).attr('cat-estado');
        $('#catalogo-nombre-viejo').val(nombre);
        $('#id-catalogo-elemento').val(id);
        if (estado == 1) {
            document.getElementById('catalogo-estado').checked = true;
        } else {

            document.getElementById('catalogo-estado').checked = false;
        }
        $('#modal-editar-catalogo').modal('show');
    });

    // CONFIRMAR CAMBIO DE ELEMENTO DEL CATALOGO
    $(document).on('click', '#btn-editar-catalogo-confirmar', function () {
        //VALIDACIONES DE CAMPO
        //if ($('#catalogo-nombre-nuevo').val() == "" || $('#catalogo-nombre-nuevo').val() == $('#catalogo-nombre-viejo').val()) {
        //    $('#alerta-ingreso-catalogo').text("Por favor ingrese un nombre válido");
        //    document.getElementById('alerta-ingreso-catalogo').hidden = false;
        //} else {
        if (document.getElementById('catalogo-estado').checked) {
            estado = 1
        } else {
            estado = 0
        }
        $.post($SCRIPT_ROOT + '/crud_catalogo', {
            'tipo-accion-catalogo': 2, //AGREGAR AL CATALOGO
            'tipo-catalogo': $('#tipo-catalogo2').val(),
            id_elemento: $('#id-catalogo-elemento').val(),
            'catalogo-nombre-nuevo': $('#catalogo-nombre-nuevo').val(),
            'catalogo-elemento-estado': estado
        }, function (data) {
            if (data == "OK") {
                document.getElementById('tipo-catalogo').value = document.getElementById('tipo-catalogo2').value;
                document.getElementById('tipo-accion-catalogo').value = 1;
                document.getElementById("frm-catalogo").submit();
            } else {
                $('#alerta-ingreso-catalogo').html("El nuevo nombre de elemento del catálogo ya existe.<br>Por favor ingrese otro nombre.");
                document.getElementById('alerta-ingreso-catalogo').hidden = false;

            }
        })
        // }
    });

    // QUITA ALERTE DE CONFIRMAR CAMBIO DE ELEMENTO DEL CATALOGO
    $(document).on('blur', '#btn-editar-catalogo-confirmar', function () {
        document.getElementById('alerta-ingreso-catalogo').hidden = true;
    });

});