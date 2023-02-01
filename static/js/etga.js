$(document).ready(function () {

    // $("#telefono").inputmask({ "mask": "9999-9999" });
    autocomplete(document.getElementById("marca"), marcas);
    autocomplete(document.getElementById("zona"), zonas);
    autocomplete(document.getElementById("zona2"), zonas);
    if ($("#repuesto").length) {
        autocomplete(document.getElementById("repuesto"), repuestos);
    }
    if ($("#tipo-equipo").length) {
        autocomplete(document.getElementById("tipo-equipo"), tipos_equipo);
    }

    function vis_telefono(string) {
        return string.substr(0, 4) + '-' + string.substr(4, 4);
    }

    function miles(string) {
        return string.substr(0, string.length - 3) + ',' + string.substr(string.length - 3);
    }
    function bd_telefono(string) {
        return string.substr(0, 4) + string.substr(5, 4);
    }

    function capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Busca por el campo maestro Cliente
    $("#nombres").keyup(function (e) {
        document.getElementById('boton-editar-cliente').disabled = true;
        document.getElementById('check-ok-padron').hidden = true;
        document.getElementById('check-nok-padron').hidden = true;
        document.getElementById('check-ok-etga').hidden = true;
        document.getElementById('check-nok-etga').hidden = true;
        document.getElementById('boton-guardar-cliente').disable = true;
        // BOTON EN MODAL DE VENTA
        if ($("#btn-confirmacion-venta-cliente").length) {
            document.getElementById('btn-confirmacion-venta-cliente').disabled = true;
        }
        $('.collapse1').collapse('hide');
        if ($("#nombres").val() == "") {
            $('#lista_sugerencias').html("");
            $('#codigo').val("");
            $('#nombres').val("");
            $('#apellidos').val("");
            $('#correo').val("");
            $('#telefono').val("");
            $('#telefono2').val("");
            $('#telefono3').val("");
            $('#provincia').val(1);
            $('#zona').val("ALAJUELA");
        }
        else {
            $.post($SCRIPT_ROOT + '/busqueda_cliente', {
                parametro: $('input[name="nombres"]').val(),
                tipo_busqueda: 0,
                tipo_documento: 0
            }, function (data) {
                var data2 = "<b>Sugerencias :</b><br>";
                $.each(data.resultado, function (index, texto) {
                    registro = (texto + '').split(',');
                    datos = registro[0] + "," + registro[1] + "," + registro[2] + "," + registro[3] + "," + registro[4] + "," + registro[5] + "," + registro[6] + "," + registro[7] + "," + registro[8] + "," + registro[9] + "," + registro[10] + "," + registro[11] + "," + registro[12] + "," + registro[13];
                    switch (registro[8]) {
                        case '1':
                            tipo_documentox = "Cédula";
                            break;
                        case '2':
                            tipo_documentox = "Residencia";
                            break;
                        case '3':
                            tipo_documentox = "Pasaporte";
                            break;
                        case '4':
                            tipo_documentox = "Cédula Jurídica";
                            break;
                        case '5':
                            tipo_documentox = "Otro";
                            break;
                        default:
                            tipo_documentox = "CERO";
                    }
                    data2 += '<a href="#" id="autocompleta" class="list-group-item list-group-item-action my-0 py-1 px-1" valores="' + datos + '" style="text-decoration:none"><div class="d-flex w-100 justify-content-between">'
                        + '<h3 class="text-primary my-0 px-1" style="font-size:0.9rem">[' + registro[0] + '] ' + registro[1] + ' ' + registro[2] + '</h3><small class="text-muted">  Tel. ' + registro[3] + '</small></div>'
                        + '<small class="text-muted style="font-size:0.80rem">' + tipo_documentox + ': ' + registro[7] + ' / Email: ' + registro[6] + '</small></a>';
                    return (index !== 10);
                });
                $('#lista_sugerencias_clientes').html(data2);
            });
            return false;
        }
    });

    // Al seleccionar un elemento en la lista de Clientes
    $(document).on('click', '#autocompleta', function () {
        document.getElementById('check-ok-padron').hidden = false;
        document.getElementById('check-ok-etga').hidden = false;
        var contenido = $(this).attr('valores').split(',');
        $('#codigo-cliente').val(contenido[0]);
        $('#nombres').val(contenido[1]);
        $('#apellidos').val(contenido[2]);
        $('#telefono').val(contenido[3]);
        $('#telefono2').val(contenido[4]);
        $('#telefono3').val(contenido[5]);
        $('#correo').val(contenido[6]);
        $('#documento').val(contenido[7]);
        $('#tipo-documento').val(contenido[8]);
        $('#tipo-cliente').val(contenido[9]);
        $('#provincia').val(contenido[12]);
        $('#zona').val(contenido[13]);
        document.getElementById("apellidos").disabled = true;
        document.getElementById("correo").disabled = true;
        document.getElementById("telefono").disabled = true;
        document.getElementById("telefono2").disabled = true;
        document.getElementById("telefono3").disabled = true;
        document.getElementById("provincia").disabled = true;
        document.getElementById("zona").disabled = true;
        document.getElementById("tipo-cliente").disabled = true;
        var data = ""
        $('#lista_sugerencias_clientes').html(data);
        document.getElementById("boton-editar-cliente").disabled = false;
        if ($("#collapseEquipo").length) {
            document.getElementById('collapseEquipo').hidden = false;
        }
        // BOTON EN MODAL DE VENTA
        if ($("#btn-confirmacion-venta-cliente").length) {
            document.getElementById('btn-confirmacion-venta-cliente').disabled = false;
        }
        $('.collapse1').collapse('show');
        document.getElementById('marca').focus();
    });

    // CAMBIO DE TIPO DE DOCUMENTO EN CLIENTE
    $(document).on('change', '#tipo-documento', function () {
        document.getElementById('boton-guardar-cliente').disabled = true;
        document.getElementById('boton-editar-cliente').disabled = true;
        if ($("#tipo-documento").val() == 1) {
            $('.collapse1').collapse('hide');
            document.getElementById('guardar-alerta').hidden = true;
            document.getElementById("apellidos").disabled = true;
            document.getElementById("tipo-cliente").disabled = true;
            document.getElementById("telefono").disabled = true;
            document.getElementById("telefono2").disabled = true;
            document.getElementById("telefono3").disabled = true;
            document.getElementById("correo").disabled = true;
            document.getElementById("provincia").disabled = true;
            document.getElementById("zona").disabled = true;
        }
        else {
            $('.collapse1').collapse('hide');
            document.getElementById('guardar-alerta').hidden = true;
        }
    });

    // CAMBIO DE DOCUMENTO EN CLIENTE
    $("#documento").keyup(function (e) {
        document.getElementById('nuevo-alerta').hidden = true;
        document.getElementById('check-ok-padron').hidden = true;
        document.getElementById('check-nok-padron').hidden = true;
        document.getElementById('check-ok-etga').hidden = true;
        document.getElementById('check-nok-etga').hidden = true;
        document.getElementById('boton-editar-cliente').disabled = true;
        document.getElementById('boton-guardar-cliente').disabled = true;
        $('.collapse1').collapse('hide');
        document.getElementById('guardar-alerta').hidden = true;
    });

    // Buscar por Cliente por campo DOCUMENTO
    $(document).on('click', "#boton-buscar-padron", function (e) {
        document.getElementById('check-ok-padron').hidden = true;
        document.getElementById('check-nok-padron').hidden = true;
        document.getElementById('check-ok-etga').hidden = true;
        document.getElementById('check-nok-etga').hidden = true;
        $('.collapse1').collapse('hide');
        document.getElementById('guardar-alerta').hidden = true;
        $('#lista_sugerencias_clientes').html("");
        var numeros = /^[0-9]+$/;
        if ($("#tipo-documento").val() == 1 && ($("#documento").val() == ""
            || $("#documento").val().length != 9
            || $("#documento").val() == "000000000"
            || !($("#documento").val().match(numeros)))) {
            document.getElementById('nuevo-alerta').hidden = false;
            $('#nuevo-alerta').text("*Ingresar un Código de Cédula Válido (9 Números)");
        }
        else {
            document.getElementById('nuevo-alerta').hidden = true;
            // VERIFICA SI SE ENCUENTRA EN EL PADRON ELECTORAL
            if ($("#tipo-documento").val() == 1) {
                $.post($SCRIPT_ROOT + '/busqueda_cedula', {
                    parametro: $('input[name="documento"]').val()
                }, function (data) {
                    registro = (data.resultado + '').split(',');
                    if (data.resultado != null) {
                        $('#nombres').val(registro[1]);
                        $('#apellidos').val(registro[2] + " " + registro[3]);
                        document.getElementById("apellidos").disabled = true;
                        document.getElementById('check-ok-padron').hidden = false;
                    } else {
                        $('#nombres').val("");
                        $('#apellidos').val("");
                        $('#correo').val("");
                        $('#codigo').val("");
                        $('#telefono').val("");
                        $('#telefono2').val("");
                        $('#telefono3').val("");
                        $('#tipo-cliente').val(1);
                        $('#provincia').val(1);
                        $('#zona').val("Alajuela");
                        document.getElementById("apellidos").disabled = false;
                        document.getElementById("tipo-cliente").disabled = false;
                        document.getElementById("telefono").disabled = false;
                        document.getElementById("telefono2").disabled = false;
                        document.getElementById("telefono3").disabled = false;
                        document.getElementById("provincia").disabled = false;
                        document.getElementById("zona").disabled = false;
                        document.getElementById("correo").disabled = false;
                        document.getElementById('check-nok-padron').hidden = false;
                        document.getElementById('nombres').focus();
                    }
                });
            }
            //any(x > 0 for x in list)
            // VERIFICA SI SE ENCUENTRA EN LA BASE DE ETGA
            $.post($SCRIPT_ROOT + '/busqueda_cliente', {
                parametro: $('input[name="documento"]').val(),
                tipo_busqueda: 1,
                tipo_documento: $('#tipo-documento').val()
            }, function (data, status) {
                if (data.resultado != null) {
                    registro = (data.resultado + '').split(',');
                    $('#nombres').val(registro[1]);
                    $('#apellidos').val(registro[2]);
                    $('#codigo-cliente').val(registro[0]);
                    $('#tipo-cliente').val(registro[9]);
                    $('#telefono').val(registro[3]);
                    $('#telefono2').val(registro[4]);
                    $('#telefono3').val(registro[5]);
                    $('#correo').val(registro[6]);
                    $('#provincia').val(registro[12]);
                    $('#zona').val(registro[13]);
                    document.getElementById("apellidos").disabled = true;
                    document.getElementById("correo").disabled = true;
                    document.getElementById("telefono").disabled = true;
                    document.getElementById("telefono2").disabled = true;
                    document.getElementById("telefono3").disabled = true;
                    document.getElementById("provincia").disabled = true;
                    document.getElementById("zona").disabled = true;
                    document.getElementById("tipo-cliente").disabled = true;
                    document.getElementById('check-nok-padron').hidden = true;
                    document.getElementById('check-ok-etga').hidden = false;
                    document.getElementById('boton-editar-cliente').disabled = false;
                    document.getElementById('boton-guardar-cliente').disabled = true;
                    if ($('#collapseEquipo').length) {
                        document.getElementById('collapseEquipo').hidden = false;
                        $('.collapse1').collapse('show');
                        document.getElementById('marca').focus();
                    }
                    $('#lista_sugerencias_clientes').html(data);
                    // BOTON EN MODAL DE VENTA
                    if ($("#btn-confirmacion-venta-cliente").length) {
                        document.getElementById('btn-confirmacion-venta-cliente').disabled = false;
                    }
                }
                // SI NO SE ENCUENTRA EN LA BASE DE ETGA
                else {
                    if ($('#tipo-documento').val() != 1) {
                        $('#nombres').val("");
                        $('#apellidos').val("");
                        document.getElementById("apellidos").disabled = false;
                        document.getElementById('nombres').focus();
                    } else {
                        document.getElementById('tipo-cliente').focus();
                    }
                    $('#codigo-cliente').val("");
                    $('#tipo-cliente').val(1);
                    $('#telefono').val("");
                    $('#telefono2').val("");
                    $('#telefono3').val("");
                    $('#correo').val("");
                    $('#provincia').val(1);
                    $('#zona').val("Alajuela");
                    document.getElementById("correo").disabled = false;
                    document.getElementById("telefono").disabled = false;
                    document.getElementById("telefono2").disabled = false;
                    document.getElementById("telefono3").disabled = false;
                    document.getElementById("provincia").disabled = false;
                    document.getElementById("zona").disabled = false;
                    document.getElementById("tipo-cliente").disabled = false;
                    document.getElementById('check-nok-etga').hidden = false;
                    document.getElementById('boton-editar-cliente').disabled = true;
                    document.getElementById('boton-guardar-cliente').disabled = false;

                }

            });
            // SI NO SE ENCUENTRA EN EL PADRON CR
        }

    });

    //Boton GUARDAR Cliente en la Base de Datos
    $(document).on('click', "#boton-guardar-cliente", function (e) {
        $('#guardar-alerta').text("");
        document.getElementById('guardar-alerta').hidden = false;
        document.getElementById('guardar-alerta').className = "alert alert-danger m-1 p-1";
        // BOTON EN MODAL DE VENTA
        if ($("#btn-confirmacion-venta-cliente").length) {
            document.getElementById('btn-confirmacion-venta-cliente').disabled = true;
        }

        //VALIDACIONES DE CAMPO
        if ($('#correo').val() == "" || $('#telefono').val() == "") {
            $('#guardar-alerta').text("El Teléfono 1 y el Correo Electrónico son obligatorios");
        }
        else if ($('#tipo-documento').val() != 1 && ($('#nombres').val() == "" || $('#apellidos').val() == "")) {
            $('#guardar-alerta').text("Los Nombres y Apellidos son obligatorios");
        }
        else if ($('#telefono').val() < 20000000 || $('#telefono').val() > 89999999) {
            $('#guardar-alerta').text("Teléfono Inválido");
        }
        else if ($('#telefono2').val() != "" && ($('#telefono2').val() < 20000000 || $('#telefono2').val() > 89999999)) {
            $('#guardar-alerta').text("Teléfono 2 Inválido");
        }
        else if ($('#telefono3').val() != "" && ($('#telefono3').val() < 20000000 || $('#telefono3').val() > 89999999)) {
            $('#guardar-alerta').text("Teléfono 3 Inválido");
        }
        else if (!$('#correo').val().match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
            $('#guardar-alerta').text("Formato de Correo Incorrecto");
        }
        else if ($('#zona').val() == "") {
            $('#guardar-alerta').text("Debe Ingresarse una Zona");
        }
        else {
            document.getElementById('guardar-alerta').hidden = true;
            telefono2 = $('#telefono2').val();
            if (telefono2 == "") {
                telefono2 = 0;
            }
            telefono3 = $('#telefono3').val();
            if (telefono3 == "") {
                telefono3 = 0;
            }
            $.post($SCRIPT_ROOT + '/crud_cliente', {
                tipo_documento: $('#tipo-documento').val(),
                documento: $('#documento').val(),
                nombres: $('#nombres').val(),
                apellidos: $('#apellidos').val(),
                tipo_cliente: $('#tipo-cliente').val(),
                telefono: $('#telefono').val(),
                telefono2: telefono2,
                telefono3: telefono3,
                correo: $('#correo').val(),
                id_provincia: $('#provincia').val(),
                zona: $('#zona').val(),
                tipo_accion: 1
            }, function (data) {
                // ERROR EN TOKEN O SESION
                if (data.substr(0, 15) == '<!DOCTYPE html>') {
                    document.getElementById("out").submit();
                }
                if (data == "NO-ZONA") {
                    $('#modal-ingreso-elemento-header').text("Nueva Zona detectada!").show();
                    $('#modal-ingreso-elemento-label').html("La Zona <b>" + $('#zona').val().toUpperCase() + "</b> no se encuentra en el Catálogo de Zonas de esta KAPP.<br><br>¿Desea agregarla?");
                    $('#modal-ingreso-elemento-accion').val('zona');
                    $('#modal-ingreso-elemento-valor').val($('#zona').val());
                    $('#modal-ingreso-elemento').modal('show');
                } else {
                    if (data == "EOK") {
                        mensaje += "El cliente ha sido actualizado!";
                        nuevo_elemento = '<div class="alert alert-success" role="alert" style="font-size:0.7rem">' + mensaje + '</div>';
                        document.getElementById('nuevo_cliente').disabled = true;
                        $('#guardar-alerta').html(nuevo_elemento);
                        $('#nombre').val($('#nombre2').val());
                        $('#correo').val($('#correo2').val());
                        $('#telefono').val($('#telefono2').val());
                        document.getElementById('nombre2').disabled = true;
                        document.getElementById('correo2').disabled = true;
                        document.getElementById('telefono2').disabled = true;
                        document.getElementById('boton-editar-cliente').disabled = false;
                        document.getElementById('boton-guardar-cliente').disabled = true;
                    }
                    else {
                        document.getElementById('guardar-alerta').className = "alert alert-success m-1 p-1";
                        document.getElementById('guardar-alerta').hidden = false;
                        $('#guardar-alerta').text("Cliente Registrado Satisfactoriamente!");
                        $('#codigo-cliente').val(data);
                        document.getElementById('apellidos').disabled = true;
                        document.getElementById('correo').disabled = true;
                        document.getElementById("tipo-cliente").disabled = true;
                        document.getElementById("telefono").disabled = true;
                        document.getElementById("telefono2").disabled = true;
                        document.getElementById("telefono3").disabled = true;
                        document.getElementById("provincia").disabled = true;
                        document.getElementById("zona").disabled = true;
                        document.getElementById('check-nok-etga').hidden = true;
                        document.getElementById('check-ok-etga').hidden = false;
                        document.getElementById('boton-editar-cliente').disabled = false;
                        document.getElementById('boton-guardar-cliente').disabled = true;
                        var data = ""
                        if ($('#collapseEquipo').length) {
                            document.getElementById('collapseEquipo').hidden = false;
                            $('.collapse1').collapse('show');
                        }
                        $('#lista_sugerencias_clientes').html(data);
                        // BOTON EN MODAL DE VENTA
                        if ($("#btn-confirmacion-venta-cliente").length) {
                            document.getElementById('btn-confirmacion-venta-cliente').disabled = false;
                        }
                    }
                }

            });
        }
    });

    //Boton GUARDAR ACTUALIZAR Cliente en la Base de Datos
    $(document).on('click', "#btn-actualizar-cliente", function (e) {
        $('#guardar-alerta2').text("");
        document.getElementById('guardar-alerta2').hidden = false;
        document.getElementById('guardar-alerta2').className = "alert alert-danger m-1 p-1";
        telefono2 = $('#telefono22').val();
        if (telefono2 == 0) {
            telefono2 = "";
        }
        telefono3 = $('#telefono32').val();
        if (telefono3 == 0) {
            telefono3 = "";
        }
        //VALIDACIONES DE CAMPO
        if ($('#correo2').val() == "" || $('#telefono12').val() == "") {
            $('#guardar-alerta2').text("El Teléfono 1 y el Correo Electrónico son obligatorios");
        }
        else if ($('#nombres2').val() == "" || $('#apellidos2').val() == "") {
            $('#guardar-alerta2').text("Los Nombres y Apellidos son obligatorios");
        }
        else if ($('#telefono12').val() < 20000000 || $('#telefono12').val() > 89999999) {
            $('#guardar-alerta2').text("Teléfono Inválido");
        }
        else if (telefono2 != "" && (telefono2 < 20000000 || telefono2 > 89999999)) {
            $('#guardar-alerta2').text("Teléfono 2 Inválido");
        }
        else if (telefono3 != "" && (telefono3 < 20000000 || telefono3 > 89999999)) {
            $('#guardar-alerta2').text("Teléfono 3 Inválido");
        }
        else if (!$('#correo2').val().match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
            $('#guardar-alerta2').text("Formato de Correo Incorrecto");
        }
        else if ($('#zona2').val() == "") {
            $('#guardar-alerta2').text("Debe Ingresarse una Zona");
        }
        else {
            document.getElementById('guardar-alerta2').hidden = true;
            if (telefono2 == "") {
                telefono2 = 0;
            }
            if (telefono3 == "") {
                telefono3 = 0;
            }
            espera_on();
            $.post($SCRIPT_ROOT + '/crud_cliente', {
                nombres: $('#nombres2').val(),
                apellidos: $('#apellidos2').val(),
                tipo_cliente: $('#tipo-cliente2').val(),
                telefono: $('#telefono12').val(),
                telefono2: telefono2,
                telefono3: telefono3,
                correo: $('#correo2').val(),
                id_provincia: $('#provincia2').val(),
                zona: $('#zona2').val(),
                id_cliente: $('#codigo-cliente').val(),
                tipo_accion: 2
            }, function (data) {
                // ERROR EN TOKEN O SESION
                if (data.substr(0, 15) == '<!DOCTYPE html>') {
                    document.getElementById("out").submit();
                }
                espera_off();
                if (data == "NO-ZONA") {
                    $('#modal-ingreso-elemento-header').text("Nueva Zona detectada!").show();
                    $('#modal-ingreso-elemento-label').html("La Zona <b>" + $('#zona2').val().toUpperCase() + "</b> no se encuentra en el Catálogo de Zonas de esta KAPP.<br><br>¿Desea agregarla?");
                    $('#modal-ingreso-elemento-accion').val('zona2');
                    $('#modal-ingreso-elemento-valor').val($('#zona2').val());
                    $('#modal-ingreso-elemento').modal('show');
                }
                if (data == "OK2") {
                    if ($('#id-tipo-display').val() == '6') {
                        $('#id-boleta-i').val($('#id-boleta-interna').val());
                        $('#tipo-display-i').val(6); // VISUALIZAR FACTURA
                        document.getElementById("form-buscar-boleta-i").submit();
                    } else {
                        document.getElementById('guardar-alerta').className = "alert alert-success m-1 p-1";
                        document.getElementById('guardar-alerta').hidden = false;
                        $('#guardar-alerta').text("Cliente Actualizado Satisfactoriamente!");
                        $('#nombres').val($('#nombres2').val());
                        $('#apellidos').val($('#apellidos2').val());
                        $('#tipo-cliente').val($('#tipo-cliente2').val());
                        $('#correo').val($('#correo2').val());
                        $('#telefono').val($('#telefono12').val());
                        $('#telefono2').val($('#telefono22').val());
                        $('#telefono3').val($('#telefono32').val());
                        $('#provincia').val($('#provincia2').val());
                        $('#zona').val($('#zona2').val().toUpperCase());
                        $('#modal_editar_cliente').modal('hide');
                        document.getElementById('link-whatsapp-boleta').setAttribute('href', "https://api.whatsapp.com/send?phone=506" + $('#telefono').val() + "&text=Buen%20d%C3%ADa.%20Le%20saludamos%20de%20Electr%C3%B3nica%20Torres.%20Anexo%20Boleta%20solicitada.");
                    }
                }
            });

        }
    });

    //Boton Editar Cliente
    $('#boton-editar-cliente').click(function (event) {
        $('#nombres2').val($('#nombres').val());
        $('#apellidos2').val($('#apellidos').val());
        $('#tipo-cliente2').val($('#tipo-cliente').val());
        $('#correo2').val($('#correo').val());
        $('#telefono12').val($('#telefono').val());
        $('#telefono22').val($('#telefono2').val());
        $('#telefono32').val($('#telefono3').val());
        $('#provincia2').val($('#provincia').val());
        $('#zona2').val($('#zona').val());
        $('#tipo_accion_cliente').val(2); //Se envía 2 para editar cliente en la f de Python 
        //document.getElementById('nombre2').disabled = false;
        $('#nuevo_cliente_alerta').html("");
        $('#titulo_modal').text("Editar Cliente con Código " + $('#codigo-cliente').val());
    });

    //Boton Editar Cliente2 (en la pantalla de Boleta)
    $('#btn-editar-cliente2').click(function (event) {
        $('#nombres2').val($('#nombres').val());
        $('#apellidos2').val($('#apellidos').val());
        $('#tipo-cliente2').val($('#tipo-cliente').val());
        $('#correo2').val($('#correo').val());
        $('#telefono12').val($('#telefono').val());
        $('#telefono22').val($('#telefono2').val());
        $('#telefono32').val($('#telefono3').val());
        $('#provincia2').val($('#provincia').val());
        $('#zona2').val($('#zona').val());
        $('#tipo_accion_cliente').val(2); //Se envía 2 para editar cliente en la f de Python 
        //document.getElementById('nombre2').disabled = false;
        $('#nuevo_cliente_alerta').html("");
        $('#titulo_modal').text("Editar Cliente con Código " + $('#codigo-cliente').val());
    });

    // BOTON CREAR BOLETA
    $(document).on('click', "#boton-ingresar-boleta", function (e) {
        if ($("#codigo-cliente").val() != null) {
            if ($("#marca").val() == ""
                || $("#tipo-equipo").val() == ""
                || $("#serie").val() == ""
                || $("#condicion").val() == ""
                || $("#motivo").val() == ""
                || $("#comentario").val() == ""
                || $("#dhabiles").val() == ""
                || $("#dhabiles").val() < 1
                || $("#dhabiles").val() > 20
            ) {
                var color_campo_faltante = "#FFCCCC"
                if ($("#marca").val() == "") {
                    document.getElementById("marca").style.backgroundColor = color_campo_faltante;
                }
                if ($("#tipo-equipo").val() == "") {
                    document.getElementById("tipo-equipo").style.backgroundColor = color_campo_faltante;
                }
                if ($("#serie").val() == "") {
                    document.getElementById("serie").style.backgroundColor = color_campo_faltante;
                }
                if ($("#modelo").val() == "") {
                    document.getElementById("modelo").style.backgroundColor = color_campo_faltante;
                }
                if ($("#condicion").val() == "") {
                    document.getElementById("condicion").style.backgroundColor = color_campo_faltante;
                }
                if ($("#motivo").val() == "") {
                    document.getElementById("motivo").style.backgroundColor = color_campo_faltante;
                }
                if ($("#comentario").val() == "") {
                    document.getElementById("comentario").style.backgroundColor = color_campo_faltante;
                }
                if ($("#dhabiles").val() == "") {
                    document.getElementById("dhabiles").style.backgroundColor = color_campo_faltante;
                }
                if ($("#dhabiles").val() < 1 || $("#dhabiles").val() > 20) {
                    document.getElementById("dhabiles").style.backgroundColor = color_campo_faltante;
                }
                document.getElementById('guardar-boleta-alerta').className = "alert alert-danger m-1 p-1";
                document.getElementById('guardar-boleta-alerta').hidden = false;
                $('#guardar-boleta-alerta').text("*Campos son requeridos!");
            } else {
                espera_on();
                $.post($SCRIPT_ROOT + '/boleta_ingreso', {
                    tipo_documento: $('#tipo-documento').val(),
                    marca: $('#marca').val(),
                    tipo_equipo: $('#tipo-equipo').val(),
                    modelo: $('#modelo').val(),
                    serie: $('#serie').val(),
                    condicion: $('#condicion').val(),
                    motivo: $('#motivo').val(),
                    comentario: $('#comentario').val(),
                    correo: $('#correo').val(),
                    codigo_cliente: $('#codigo-cliente').val(),
                    dias_habiles: $('#dhabiles').val()
                }, function (datos) {
                    // ERROR EN TOKEN O SESION
                    if (datos.substr(0, 15) == '<!DOCTYPE html>') {
                        document.getElementById("out").submit();
                    }
                    espera_off();
                    if (datos == "NO-MARCA") {
                        $('#modal-ingreso-elemento-header').text("Nueva marca detectada!").show();
                        $('#modal-ingreso-elemento-label').html("La marca <b>" + $('#marca').val().toUpperCase() + "</b> no se encuentra en el Catálogo de Marcas de esta KAPP.<br><br>¿Desea agregarla?");
                        $('#modal-ingreso-elemento-accion').val('marca');
                        $('#modal-ingreso-elemento-valor').val($('#marca').val());
                        $('#modal-ingreso-elemento').modal('show');
                        // $('#guardar-boleta-alerta').text("MARCA NUEVA");
                        //document.getElementById('guardar-boleta-alerta').hidden = false;
                    }
                    if (datos == "NO-TIPO-EQUIPO") {
                        $('#modal-ingreso-elemento-header').text("Nueva Tipo de Equipo detectado!").show();
                        $('#modal-ingreso-elemento-label').html("El tipo de equipo <b>" + $('#tipo-equipo').val().toUpperCase() + "</b> no se encuentra en el Catálogo de Tipos de Equipos de esta KAPP.<br><br>¿Desea agregarlo?");
                        $('#modal-ingreso-elemento-accion').val('tipo-equipo');
                        $('#modal-ingreso-elemento-valor').val($('#tipo-equipo').val());
                        $('#modal-ingreso-elemento').modal('show');
                    }
                    if (datos != "NO-MARCA" && datos != "NO-TIPO-EQUIPO") {
                        $('#id-boleta-i').val(datos);
                        $('#tipo-display-i').val(0);
                        document.getElementById("form-buscar-boleta-i").submit();
                    }
                }
                );

            }
        }
    });

    //BOTON ENVIAR BOLETA POR CORREO 
    $(document).on('click', '#btn-boleta-enviar-correo', function () {
        //  window.open('{{ url_for('pdfs', id_boleta=id_boleta, tipo=1) }}','ventana1','width=400,height=500')"
        $.post($SCRIPT_ROOT + '/pdfs_mail', {
            tipo_accion: 2,
            id_boleta: $('#id-boleta-interna').val(),
            id_cliente: $(this).attr('cliente')
        }, function (respuesta) {
            if (respuesta == 'Enviado') {

            }
        }
        );
    });

    // BOTON CREAR BOLETA - Regresa a color normal los campos que faltan
    $("#boton-ingresar-boleta").blur(function (e) {
        var color_campo_original = "#FFFFFF";
        document.getElementById("marca").style.backgroundColor = color_campo_original;
        document.getElementById("tipo-equipo").style.backgroundColor = color_campo_original;
        document.getElementById("modelo").style.backgroundColor = color_campo_original;
        document.getElementById("serie").style.backgroundColor = color_campo_original;
        document.getElementById("condicion").style.backgroundColor = color_campo_original;
        document.getElementById("motivo").style.backgroundColor = color_campo_original;
        document.getElementById("comentario").style.backgroundColor = color_campo_original;
        document.getElementById("dhabiles").style.backgroundColor = color_campo_original;
        document.getElementById('guardar-boleta-alerta').hidden = true;
    });

    // BOTON VER PAGOS
    $('#boton-ver-pagos').click(function (event) {
        $('#id-boleta-i').val($('#id-boleta-interna').val());
        $('#tipo-display-i').val(1); // VISUALIZAR PAGOS
        document.getElementById("form-buscar-boleta-i").submit();
    });

    // BOTON COLLAPSE CARGO
    $(document).on('click', "#boton-collapse-cargo", function (e) {
        document.getElementById('collapseCargo').hidden = false;
        $('.collapseP').collapse('hide');
    });

    // MODAL PAGO ACTUALIZAR
    $('#boton-pago-collapse').on('click', function (event) {
        tipo_pago = document.querySelector('input[name="tipo_pago"]:checked').value;
        if (tipo_pago == 1) { tipo_pago = "Efectivo" }
        if (tipo_pago == 2) { tipo_pago = "Tarjeta (Crédito/Débito)" }
        if (tipo_pago == 3) { tipo_pago = "Transferecia" }
        concepto = $('#concepto-p').val();
        if ($('#concepto-p').val().length == 0) { concepto = "Revisión/Reparación" }
        $('#modal-pago-confirmacion').text("Confimar PAGO de ₡" + miles($('#monto-p').val()) + " con " + tipo_pago + " en concepto de " + concepto
        ).show();

        event.preventDefault();

    });

    // MODAL CARGO ACTUALIZAR
    $('#boton-cargo-collapse').on('click', function (event) {
        document.getElementById('boton-confirmar-cargo').hidden = false;
        concepto = $('#concepto-c').val();
        if (concepto.length == 0) {
            $('#modal-cargo-confirmacion').text("Se debe especificar un concepto para este cargo");
            document.getElementById('boton-confirmar-cargo').hidden = true;
        } else {
            if (document.getElementById("tipo-cargo-otro").checked == true &&
                ($('#cargo-otro-impuesto').val() < 0 || $('#cargo-otro-impuesto').val() > 100)) {
                $('#modal-cargo-confirmacion').text("Se debe especificar un Impuesto Válido (entre 0 y 100%)");
                document.getElementById('boton-confirmar-cargo').hidden = true;
            } else {
                monto_c = $('#monto-c').val();
                if (monto_c <= 0) {
                    $('#modal-cargo-confirmacion').text("El monto del Cargo es inválido.");
                    document.getElementById('boton-confirmar-cargo').hidden = true;
                } else {
                    cadena = "Confimar CARGO de <b>₡" + miles($('#monto-c').val()) + "</b> en concepto de " + concepto;
                    if (document.getElementById("tipo-cargo-otro").checked == true) {
                        cadena += "<br>El porcentaje de impuesto es de: <b>" + $('#cargo-otro-impuesto').val() + "%</b>"
                    }
                    if (document.getElementById("tipo-cargo-revision").checked == true && document.getElementById("cargo-pago-revision").checked == true) {
                        cadena += "<br><br>Este movimiento también registrará el Pago indicado por parte del cliente";
                    }
                    $('#modal-cargo-confirmacion').html(cadena);
                }
            }
        }
    });


    // SELECCION CARGO REVISION
    $(document).on('click', "#tipo-cargo-revision", function (e) {
        if (document.getElementById("tipo-cargo-revision").checked == true) {
            $('#concepto-c').val('Revisión de Equipo');
            document.getElementById('cargo-pago').hidden = false;
            document.getElementById('cargo-otro').hidden = true;
        }
    });

    // SELECCION CARGO REVISION
    $(document).on('click', "#tipo-cargo-otro", function (e) {
        if (document.getElementById("tipo-cargo-otro").checked == true) {
            $('#concepto-c').val('');
            document.getElementById('cargo-pago').hidden = true;
            document.getElementById('cargo-otro').hidden = false;
        }
    });

    // BOTON COLLAPSE PAGO
    $(document).on('click', "#boton-collapse-pago", function (e) {
        document.getElementById('collapsePago').hidden = false;
        $('.collapseC').collapse('hide');
    });

    // BOTON REGISTRAR PAGO
    $(document).on('click', "#boton-confirmar-pago", function (e) {
        this.disabled = true;
        $(this).text("Espere...");
        concepto = $('#concepto-p').val();
        if ($('#concepto-p').val().length == 0) { concepto = "Revisión/Reparación" }
        $.post($SCRIPT_ROOT + '/proceso_movimientos', {
            monto: $('#monto-p').val(),
            id_boleta: $('#id-boleta-interna').val(),
            medio: document.querySelector('input[name="tipo_pago"]:checked').value,
            concepto: concepto,
            tipo: 1, // Pago
            accion: 1, // Ingresar
            id_movimiento: 0,
            impuesto: 0
        }, function (id_boleta) {
            $('#id-boleta-i').val($('#id-boleta-interna').val());
            $('#tipo-display-i').val(1); // VISUALIZAR MOVIMIENTOS
            document.getElementById("form-buscar-boleta-i").submit();
        });
    });

    // BOTON REGISTRAR CARGO
    $(document).on('click', "#boton-confirmar-cargo", function (e) {
        this.disabled = true;
        $(this).text("Espere...");
        if ($('#concepto-c').val().length == 0) { concepto = "Revisión/Reparación" }
        tipo = document.querySelector('input[name="tipo-cargo"]:checked').value;
        medio = 0;
        accion = 1;
        impuesto = $("#cargo-otro-impuesto").val();
        if (tipo == 5 && document.getElementById("cargo-pago-revision").checked == true) {
            medio = document.querySelector('input[name="cargo-tipo_pago"]:checked').value;
            accion = 3;
        }
        function ejecutarCargo() {
            return new Promise((resolve, reject) => {
                $.post($SCRIPT_ROOT + '/proceso_movimientos', {
                    monto: $('#monto-c').val(),
                    id_boleta: $('#id-boleta-interna').val(),
                    medio: medio,
                    concepto: concepto,
                    tipo: tipo, // Cargo  / adelanto-otrocargo / Cargo-Pago
                    accion: accion, // 1 o 3 (Cargo o Cargo-pago)
                    id_movimiento: 0,
                    impuesto: impuesto
                }, function (id_boleta) {
                    resolve(id_boleta)
                }
                )
            })
        };
        ejecutarCargo().then((id_boleta) => {
            $('#id-boleta-i').val($('#id-boleta-interna').val());
            $('#tipo-display-i').val(1); // VISUALIZAR MOVIMIENTOS
            document.getElementById("form-buscar-boleta-i").submit();
        })
    });


    //BOTON A ACTIVAR MODAL DE ANULACION
    $(document).on('click', '#anular-movimiento', function () {
        $('#modal-anularm-titulo').text("Anular " + $(this).attr('data-tipo')).show();
        $('#modal-anularm-body').html("¿Está seguro que quiere anular el " + $(this).attr('data-tipo') + " N° <b>" + $(this).attr('data-movimiento') + '</b>'
            + " por <b>₡" + miles(String(parseInt($(this).attr('data-monto')))) + "</b> en la Boleta " + $('#id-boleta-interna').val() + '?');
        $('#id-movimiento-anular').val($(this).attr('data-movimiento'));
        $('#tipo-movimiento-anular').val($(this).attr('data-tipo'));
    });


    // BOTON ANULAR MOVIMIENTO
    $(document).on('click', "#boton-anular-movimiento", function (e) {
        $.post($SCRIPT_ROOT + '/proceso_movimientos', {
            monto: 0,
            id_boleta: $('#id-boleta-interna').val(),
            medio: 0,
            id_movimiento: $('#id-movimiento-anular').val(),
            concepto: 0,
            tipo: $('#tipo-movimiento-anular').val(),
            accion: 2, // Anular
            impuesto: 0
        }, function (id_boleta) {
            $('#id-boleta-i').val($('#id-boleta-interna').val());
            $('#tipo-display-i').val(1); // VISUALIZAR MOVIMIENTOS
            document.getElementById("form-buscar-boleta-i").submit();
        }
        );
    });

    // BOTON ENVIAR WHASAPP MOVIMIENTO
    $(document).on('click', "#link-whatsapp-movimiento", function (e) {
        document.getElementById('link-whatsapp-movimiento').setAttribute('href', "https://api.whatsapp.com/send?phone=506" + $('#telefono').val() + "&text=Buen%20d%C3%ADa.%20Le%20saludamos%20de%20Electr%C3%B3nica%20Torres.%20Anexo%20Recibo%20solicitado.");
    });

    // BOTON ENVIAR WHASAPP COTIZACION
    $(document).on('click', "#link-whatsapp-cotizacion", function (e) {
        document.getElementById('link-whatsapp-cotizacion').setAttribute('href', "https://api.whatsapp.com/send?phone=506" + $('#telefono').val() + "&text=Buen%20d%C3%ADa.%20Le%20saludamos%20de%20Electr%C3%B3nica%20Torres.%20Anexo%20Cotización.");
    });

    //BOTON ENVIAR MOVIMIENTO POR CORREO 
    $(document).on('click', '#btn-movimiento-enviar-correo', function () {
        //  window.open('{{ url_for('pdfs', id_boleta=id_boleta, tipo=1) }}','ventana1','width=400,height=500')"
        $.post($SCRIPT_ROOT + '/pdfs_mail', {
            tipo_accion: 1,
            id_boleta: $('#id-boleta-interna').val(),
            id_movimiento: $(this).attr('movimiento'),
            id_cliente: $(this).attr('cliente')
        }, function (respuesta) {
            if (respuesta == 'Enviado') {

            }
        }
        );
    });

    // BOTON ENVIAR A DIAGOSTICO 
    //$('#boton-envio-diagnostico').click(function (event) {
    //    $.post($SCRIPT_ROOT + '/cambio_estado', {
    //        id_boleta: $('#id-boleta-interna').val(),
    //        tipo_accion: 1, // DIAGNOSITCO
    //        tipo_accion2: 0, // CAMBIAR DE ESTADO A DIAGNOSITCO
    //    }, function (data) {
    //        $('#id-boleta-i').val($('#id-boleta-interna').val());
    //        $('#tipo-display-i').val(3); // VISUALIZAR DIAGNOSTICO
    //         document.getElementById("form-buscar-boleta-i").submit();
    //     });
    // });

    // BOTON ACTIVA MODAL ENVIAR A NUEVA
    $('#btn-enviar-a-nueva').click(function (event) {
        $('#modal-cambio-estado-header').text("Enviar a Pila de Nuevas");
        $('#modal-cambio-estado-label').text('¿Está seguro que desea enviar el equipo de la boleta ' + $('#id-boleta-interna').val() + ' a la Pila de Nuevas?');
        $('#modal-cambio-estado-accion').val(0);
        $('#modal-cambio-estado-accion2').val(0);
        $('#modal-cambio-estado-display').val(1);
    });


    // BOTON EDITAR DIAGNOSTICO (SOLO VER)
    $(document).on('click', "#boton-editar-diagnostico-ver", function (e) {
        $('#id-boleta-i').val($('#id-boleta-interna').val());
        $('#tipo-display-i').val(3); // VISUALIZAR DIAGNOSTICOS
        document.getElementById("form-buscar-boleta-i").submit();
    });

    // BOTON EDITAR DIAGNOSTICO
    $(document).on('click', "#boton-editar-diagnostico", function (e) {
        if ($("#descripcion-diagnostico").val().length < 15) {
            $('#guardar-diagnostico-alerta').text("Por favor ingrese un detalle válido (15 caracteres mínimo)");
            document.getElementById('guardar-diagnostico-alerta').hidden = false;
        } else if ($("#d-minutos").val() < 0 || $("#d-minutos").val() > 59 || $("#d-horas").val() < 0 || $("#d-horas").val() > 23 || $("#d-horas").val() + $("#d-minutos").val() <= 0) {
            $('#guardar-diagnostico-alerta').text("Por favor ingrese un detalle de tiempo válido");
            document.getElementById('guardar-diagnostico-alerta').hidden = false;
        }
        else {
            $.post($SCRIPT_ROOT + '/cambio_estado', {
                id_boleta: $('#id-boleta-interna').val(),
                tipo_accion: 1, // DIAGNOSITCO
                tipo_accion2: $('#tipo-diagnostico').val(), // AGREGAR o EDITAR DIAGNOSITCO
                descripcion: $('#descripcion-diagnostico').val(),
                horas: $('#d-horas').val(),
                minutos: $('#d-minutos').val(),
            }, function (data) {
                $('#id-boleta-i').val($('#id-boleta-interna').val());
                $('#tipo-display-i').val(3); // VISUALIZAR DIAGNOSTICO
                document.getElementById("form-buscar-boleta-i").submit();
            });
        }
    });

    // BOTON ACTIVA MODAL ENVIAR DIAGNOSTICO
    $('#btn-enviar-a-diagnostico').click(function (event) {
        $('#modal-cambio-estado-header').text("Enviar a Pila de Diagnóstico");
        $('#modal-cambio-estado-label').text('¿Está seguro que desea enviar el equipo de la boleta ' + $('#id-boleta-interna').val() + ' a la Pila de Diagnóstico?');
        $('#modal-cambio-estado-accion').val(1);
        $('#modal-cambio-estado-accion2').val(0);
        $('#modal-cambio-estado-display').val(3);
    });


    // BOTON ACTIVA MODAL ENVIAR COTIZACION
    $('#btn-enviar-a-cotizacion').click(function (event) {
        $('#modal-cambio-estado-header').text("Enviar a Pila de Cotización").show();
        $.post($SCRIPT_ROOT + '/cambio_estado', {
            id_boleta: $('#id-boleta-interna').val(),
            tipo_accion: 2,
            tipo_accion2: 1
        }, function (data) {
            if (data == '0') {
                //document.getElementById('modal-cambio-estado-label').innerHTML='La Boleta ' + $('#id-boleta-interna').val() + ' no tiene diagnóstico aún.<br> No se puede pasar a la Pila de Cotización';
                $('#modal-cambio-estado-label').html('La Boleta ' + $('#id-boleta-interna').val() + ' no tiene diagnóstico aún.<br> No se puede pasar a la Pila de Cotización');
                document.getElementById("btn-envio-estado-confirmacion").hidden = true;
            } else {
                $('#modal-cambio-estado-label').text('¿Está seguro que desea enviar el equipo de la boleta ' + $('#id-boleta-interna').val() + ' a la Pila de Cotización?').show();
                $('#modal-cambio-estado-accion').val(2);
                $('#modal-cambio-estado-accion2').val(0);
                $('#modal-cambio-estado-display').val(4);
            }
        });
    });

    // BOTON ACTIVA MODAL ENVIAR A ESPERA DE CONFIRMACION DE CLIENTE
    $('#btn-enviar-a-espera-confirmacion').click(function (event) {
        $('#modal-cambio-estado-header').text("Enviar a Pila de Espera de Confirmación de Cliente").show();
        $.post($SCRIPT_ROOT + '/cambio_estado', {
            id_boleta: $('#id-boleta-interna').val(),
            tipo_accion: 3, // ESPERA CC
            tipo_accion2: 1 // VERFICACION SI TIENE COTIZACION ACTIVA
        }, function (data) {
            if (data == '0') {
                $('#modal-cambio-estado-label').html('La Boleta ' + $('#id-boleta-interna').val() + ' no tiene cotización activa.<br> No se puede pasar a la Pila de Espera Confirmación Cliente');
                document.getElementById("btn-envio-estado-confirmacion").hidden = true;
            } else {
                $('#modal-cambio-estado-label').text('¿Está seguro que desea enviar el equipo de la boleta ' + $('#id-boleta-interna').val() + ' a la Pila de Espera de Confirmación de Cliente?').show();
                $('#modal-cambio-estado-accion').val(3);
                $('#modal-cambio-estado-accion2').val(0);
                $('#modal-cambio-estado-display').val(4);
            }
        });
    });

    // BOTON ACTIVA MODAL ENVIAR REPARACION
    $('#btn-enviar-a-reparacion').click(function (event) {
        $('#modal-cambio-estado-header').text("Enviar a Pila de Reparación");
        $('#modal-cambio-estado-label').text('¿Está seguro que desea enviar el equipo de la boleta ' + $('#id-boleta-interna').val() + ' a la Pila de Reparación?');
        $('#modal-cambio-estado-accion').val(4);
        $('#modal-cambio-estado-accion2').val(0);
        $('#modal-cambio-estado-display').val(5);
    });

    // BOTON ACTIVA MODAL ENVIAR A LISTO PARA RETIRO
    $('#btn-enviar-a-retiro').click(function (event) {
        $('#modal-cambio-estado-header').text("Enviar a Pila de Listo para Retiro").show();
        $.post($SCRIPT_ROOT + '/cambio_estado', {
            id_boleta: $('#id-boleta-interna').val(),
            tipo_accion: 5, // ESPERA CC
            tipo_accion2: 1 // VERFICACION SI TIENE COTIZACION ACTIVA
        }, function (data) {
            if (data == '0') {
                $('#modal-cambio-estado-label').html('La Boleta ' + $('#id-boleta-interna').val() + ' no tiene registro de Repuestos Utilizados.<br> No se puede pasar a la Pila de Listo para Retiro');
                document.getElementById("btn-envio-estado-confirmacion").hidden = true;
            } else {
                $('#modal-cambio-estado-label').html('¿Está seguro que desea enviar el equipo de la boleta <b>' + $('#id-boleta-interna').val() + '</b> a la Pila de <b>Listo Para Retiro</b>?').show();
                $('#modal-cambio-estado-accion').val(5);
                $('#modal-cambio-estado-accion2').val(0);
                $('#modal-cambio-estado-display').val(5);
                document.getElementById("tiempo-reparacion").hidden = false;
            }
        });
    });

    // MODAL DE CAMBIO DE ESTADO - ESCONDER 
    $('#modal-cambio-estado').on('hidden.bs.modal', function (event) {
        document.getElementById("tiempo-reparacion").hidden = true;
    });

    // BOTON EDITAR COTIZACION (SOLO VER)
    $(document).on('click', "#boton-editar-cotizacion-ver", function (e) {
        $('#id-boleta-i').val($('#id-boleta-interna').val());
        $('#tipo-display-i').val(4); // VISUALIZAR COTIZACIONES
        document.getElementById("form-buscar-boleta-i").submit();
    });


    // BOTON PARA ENVIAR CAMBIO DE ESTADO 
    $('#btn-envio-estado-confirmacion').click(function (event) {
        document.getElementById("btn-envio-estado-confirmacion").disabled = true;
        $('#btn-envio-estado-confirmacion').text('Espere...');
        var ejecutar = 1;
        // Verfica si es rechazo con el comentario adecuado
        if ($('#modal-cambio-estado-accion').val() == 5 && ($("#r-minutos").val() < 0 || $("#r-minutos").val() > 59 || $("#r-horas").val() < 0 || $("#r-horas").val() > 23 || $("#r-horas").val() + $("#r-minutos").val() <= 0)) {
            $('#guardar-cambio-estado-alerta').text('Ingrese Tiempos Válidos');
            document.getElementById('guardar-cambio-estado-alerta').hidden = false;
            ejecutar = 0;
        }

        // Verfica si los tiempos de reparacion son correctos
        if ($('#modal-cambio-estado-accion').val() == 9 && $("#comentario-rechazo").val().length < 15) {
            $('#guardar-cambio-estado-alerta').text('Ingrese un Motivo válido (15 caracteres mínimo)');
            document.getElementById('guardar-cambio-estado-alerta').hidden = false;
            ejecutar = 0;
        }

        if (ejecutar == 1) {
            $.post($SCRIPT_ROOT + '/cambio_estado', {
                id_boleta: $('#id-boleta-interna').val(),
                tipo_accion: $('#modal-cambio-estado-accion').val(),
                tipo_accion2: $('#modal-cambio-estado-accion2').val(),
                comentario: $('#comentario-rechazo').val(),
                horas: $('#r-horas').val(),
                minutos: $('#r-minutos').val(),
            }, function (data) {
                $('#id-boleta-i').val($('#id-boleta-interna').val());
                $('#tipo-display-i').val($('#modal-cambio-estado-display').val());
                document.getElementById("form-buscar-boleta-i").submit();
            });

        }
        $('#btn-envio-estado-confirmacion').text('Confirmar');
        document.getElementById("btn-envio-estado-confirmacion").disabled = false;
    });

    // MODAL DE COMENTARIO - DESPLEGAR
    $('#comentario').on('focus', function (event) {
        $('#modal-comentario').modal('show');
    });

    // MODAL DE COMENTARIO - CHECK
    $('#verificacion-accesorios').on('click', function (event) {
        if (document.getElementById("verificacion-accesorios").checked) {
            document.getElementById("boton-comentario").disabled = false;
        } else {
            document.getElementById("boton-comentario").disabled = true;
        }
    });

    // MODAL DE COMENTARIO - CHECK
    $('#boton-comentario').on('click', function (event) {
        $('#comentario').val($('#comentario2').val());
        document.getElementById("boton-comentario").disabled = true;
        document.getElementById("verificacion-accesorios").checked = false;
        $('#modal-comentario').modal('hide');
        document.getElementById('boton-ingresar-boleta').focus();
    });

    // MODAL DE COMETARIO - ENFOCAR AL TEXTAREA CUANDO SE MUESTRA
    $('#modal-comentario').on('shown.bs.modal', function (event) {
        document.getElementById('comentario2').focus();
    });

    // BOTON IMPRIMIR TIQUETS 
    $('#linka-imprimir-ticket').click(function (event) {
        $.post($SCRIPT_ROOT + '/set_impresiones', {
            copias: $('#copias-ticket').val()
        }, function (data) {
            document.getElementById("myDropPrint").classList.toggle("show");
        });
    });


    // HOME Al seleccionar un elemento
    $(document).on('click', '#celda-boleta', function () {
        var id_boleta = $(this).attr('id_boleta');
        var id_estado = $(this).attr('id_estado');
        $('#id-boleta-i').val(id_boleta);
        $('#tipo-display-i').val(id_estado);
        document.getElementById("form-buscar-boleta-i").submit();
    });

    // HOME AL SELECCIONAR UNA ALERTA
    $(document).on('click', '#btn-alerta', function () {
        var id_boleta = $(this).attr('id-boleta');
        var id_alerta = $(this).attr('id-alerta');
        var mensaje = $(this).attr('mensaje');
        var estado = $(this).attr('estado');
        var tipo = $(this).attr('tipo');
        var telefono = $(this).attr('telefono');
        var fecha_envio = $(this).attr('fecha-envio');
        $('#id-boleta-interna').val(id_boleta);
        $('#id-alerta-modificar').val(id_alerta);
        $('#id-alerta-objeto').val($(this).attr('objeto'));
        $('#lbl-titulo-alerta').html("Alerta enviada a la Boleta " + id_boleta);
        if (estado == 'Pendiente' && (tipo == 'EMAIL' || tipo == 'WA')) {
            estado += '. Por favor comuníquese con el adminitrador'
        }
        $('#lbl-datos-alerta').html("Estado: <b>" + estado + '</b><br>'
            + 'Fecha Enviado: <b>' + fecha_envio);
        if (tipo == 'EMAIL') {
            $('#lbl-mensaje-alerta').html("Correo al cliente:");
        }
        $('#mensaje-alerta').val(mensaje);
        $('#link-whatsapp-alerta').attr('href', "https://api.whatsapp.com/send?phone=506" + telefono + "&text=" + mensaje);
        //$('#guardar-cotizacion-alerta').html("No es posible agregar una nueva cotización<br>Esta boleta ya tiene una cotización activa.");
        $('#modal-alerta').modal('show')
    });

    // AL GUARDAR UNA ALERTA
    $(document).on('click', '#btn-guardar-alerta', function () {
        espera_on();
        $.post($SCRIPT_ROOT + '/cambio_estado', {
            id_boleta: $('#id-boleta-interna').val(),
            tipo_accion: 10, // ALERTAS
            tipo_accion2: 0, // NOTIFICAR QUE YA SE ACEPTO
            id_alerta: $('#id-alerta-modificar').val(),
        }, function (data) {
        });
        espera_off();
        var objeto = '#' + $('#id-alerta-objeto').val();
        $('#modal-alerta').modal('hide');
        // objeto_ocultar=document.getElementById(objeto);
        $(objeto).toast('hide');
    });

    // BOTON PARA ACTIVAR MODAL DE COTIZACION
    $('#btn-activar-modal-cotizacion').click(function (event) {
        document.getElementById('guardar-cotizacion-alerta').hidden = true;
        document.getElementById('modal-cotizacion-cuerpo').hidden = false;
        document.getElementById('btn-ingresar-cotizacion').hidden = false;
        if ($('#saldo-cotizacion').val() > 0) {
            document.getElementById('guardar-cotizacion-alerta').hidden = false;
            $('#guardar-cotizacion-alerta').html("No es posible agregar una nueva cotización<br>Esta boleta ya tiene una cotización activa.");
            document.getElementById('modal-cotizacion-cuerpo').hidden = true;
            document.getElementById('btn-ingresar-cotizacion').hidden = true;
        }
    });

    // BOTON PARA INGRESAR COTIZACION DENTRO DEL MODAL
    $('#btn-ingresar-cotizacion').click(function (event) {
        document.getElementById('guardar-cotizacion-alerta').hidden = true;
        descripcion = $("#descripcion-cotizacion").val();
        descripcion_cliente = $("#descripcion-cotizacion-cliente").val();
        if (descripcion.length == 0) {
            descripcion = "Sin Comentarios";
        }
        if (descripcion_cliente.length == 0) {
            descripcion_cliente = " ";
        }
        if ($("#monto-cotizacion").val().length == 0 || $("#monto-cotizacion").val() == 0) {
            $('#guardar-cotizacion-alerta').text("Por favor ingrese un Monto válido");
            document.getElementById('guardar-cotizacion-alerta').hidden = false;
        }
        else {
            if ($('#saldo-repuestos').val() > $('#monto-cotizacion').val()) {
                $('#guardar-cotizacion-alerta').html("El monto de la cotización es menor al monto de facturación en repuestos.<br><b>Debe ingresar un monto de cotización mayor</b><br><br>Monto Repuestos: ₡ " + toThousandComma($('#saldo-repuestos').val()) + "<br>Monto Cotización: ₡ " + toThousandComma($('#monto-cotizacion').val()));
                document.getElementById('guardar-cotizacion-alerta').hidden = false;
            } else {
                if (document.getElementById("cotizacion-reparado").checked == true) {
                    reparado = 1;
                }
                else {
                    reparado = 0;
                }
                espera_on();
                $.post($SCRIPT_ROOT + '/cambio_estado', {
                    id_boleta: $('#id-boleta-interna').val(),
                    tipo_accion: 2, // COTIZACION
                    tipo_accion2: 2, // AGREGAR COTIZACION
                    reparado: reparado,
                    descripcion: descripcion,
                    descripcion_cliente: descripcion_cliente,
                    monto: $("#monto-cotizacion").val(),
                }, function (data) {
                    //espera_off();
                    $('#id-boleta-i').val($('#id-boleta-interna').val());
                    $('#tipo-display-i').val(4); // VISUALIZAR DIAGNOSTICO
                    document.getElementById("form-buscar-boleta-i").submit();
                });
            }
        }
    });


    // BOTON ANULAR COTIZACION
    $(document).on('click', "#btn-anular-cotizacion", function (e) {
        $.post($SCRIPT_ROOT + '/cambio_estado', {
            tipo_accion: 2, // COTIZACION
            tipo_accion2: 4, // ANULAR COTIZACION
            id_boleta: $('#id-boleta-interna').val(),
        }, function (id_boleta) {
            $('#id-boleta-i').val($('#id-boleta-interna').val());
            $('#tipo-display-i').val(4); // VISUALIZAR COTIZACION
            document.getElementById("form-buscar-boleta-i").submit();
        }
        );
    });

    // BOTON ACTIVA MODAL ENVIO CORREO COTIZACION
    $(document).on('click', "#btn-cotizacion-enviar-correo", function (e) {
        $('#modal-cotizacion-body').html('La cotización será enviada al correo ' + $('#correo').val())
    });

    // BOTON ENVIAR CORREO COTIZACION
    $(document).on('click', "#btn-cotizacion-enviar", function (e) {
        $.post($SCRIPT_ROOT + '/pdfs_mail', {
            tipo_accion: 3, // COTIZACION
            id_boleta: $('#id-boleta-interna').val(),
            id_cliente: $('#codigo-cliente').val()
        }, function (data) {
            $('#id-boleta-i').val($('#id-boleta-interna').val());
            $('#tipo-display-i').val(4); // VISUALIZAR COTIZACION
            document.getElementById("form-buscar-boleta-i").submit();
        }
        );
    });

    // BOTON VER INFO - EECC
    $(document).on('click', "#btn-ver-info-esperacc", function (e) {
        $('#id-boleta-i').val($('#id-boleta-interna').val());
        $('#tipo-display-i').val(4); // VISUALIZAR COTIZACION
        document.getElementById("form-buscar-boleta-i").submit();
    });

    // BOTON VER INFO - REPARACION
    $(document).on('click', "#btn-ver-info-reparacion", function (e) {
        $('#id-boleta-i').val($('#id-boleta-interna').val());
        $('#tipo-display-i').val(5); // VISUALIZAR 
        document.getElementById("form-buscar-boleta-i").submit();
    });

    // BOTON PASAR REPUESTO
    $(document).on('click', "#btn-pasar-a-repuestos-modal", function (e) {
        var color_campo_faltante = "#FFCCCC";
        document.getElementById('repuesto-alerta').className = "alert alert-danger m-1 p-1";
        if ($("#repuesto-unidades").val() == "") {
            $("#repuesto-unidades").val(1);
        }
        if ($("#repuesto-costo").val() == "") {
            $("#repuesto-costo").val(0);
        }
        if ($("#repuesto-costo-f").val() == "") {
            $("#repuesto-costo-f").val(0);
        }
        if ($("#repuesto").val() == "") {
            document.getElementById("repuesto").style.backgroundColor = color_campo_faltante;
        }
        if ($("#repuesto-unidades").val() < 1 || $("#repuesto-unidades").val() > 25) {
            document.getElementById("repuesto-unidades").style.backgroundColor = color_campo_faltante;
        }
        if ($("#repuesto-costo").val() < 0) {
            document.getElementById("repuesto-costo").style.backgroundColor = color_campo_faltante;
        }
        if ($("#repuesto-proveedor").val() == "") {
            document.getElementById("repuesto-proveedor").style.backgroundColor = color_campo_faltante;
        }

        if ($("#repuesto").val() == ""
            || $("#repuesto-unidades").val() < 1 || $("#repuesto-unidades").val() > 25
            || $("#repuesto-costo").val() < 0
            || $("#repuesto-proveedor").val() == ""
        ) {
            document.getElementById('repuesto-alerta').hidden = false;
            $('#repuesto-alerta').text("*Campos son requeridos o Inválidos!");
        } else {
            espera_on();
            $.post($SCRIPT_ROOT + '/cambio_estado', {
                id_boleta: $('#id-boleta-interna').val(),
                tipo_accion: 4, // REPARACION
                tipo_accion2: 1, // VERIFICA SI EXITE EL REPUESTO EN EL CATALOGO
                repuesto: $('#repuesto').val()
            }, function (datos) {
                if (datos.substr(0, 15) == '<!DOCTYPE html>') {
                    document.getElementById("out").submit();
                }
                espera_off();
                if (datos.substr(0,1) == "0") {
                    $('#modal-ingreso-elemento-header').text("Nuevo Tipo de Repuesto detectado!").show();
                    $('#modal-ingreso-elemento-label').html("El repuesto <b>" + $('#repuesto').val().toUpperCase() + "</b> no se encuentra en el Catálogo de Repuestos de esta KAPP.<br><br>¿Desea agregarlo?");
                    $('#modal-ingreso-elemento-accion').val('repuesto');
                    $('#modal-ingreso-elemento-valor').val($('#repuesto').val());
                    document.getElementById('btn-ingreso-elemento-confirmacion').hidden = false;
                    $('#modal-ingreso-elemento').modal('show');
                }
                else {
                    if ((datos.substr(1,1) == "0") && parseFloat($('#repuesto-unidades').val() * $('#repuesto-costo-f').val()) + parseFloat($('#saldo-repuestos').val()) > parseFloat($('#saldo-cotizacion').val())) {
                        $('#modal-ingreso-elemento-header').text("Este repuesto no puede ingresarse").show();
                        $('#modal-ingreso-elemento-label').html("El repuesto <b>" + $('#repuesto').val().toUpperCase() + "</b> no se puede ingresar.<br><br>El monto total de repuestos sobrepasa el monto de cotización entregada al cliente");
                        document.getElementById('btn-ingreso-elemento-confirmacion').hidden = true;
                        $('#modal-ingreso-elemento').modal('show');
                    } else {
                        document.getElementById('btn-ingreso-elemento-confirmacion').hidden = true;
                        document.getElementById('repuesto-alerta').hidden = true;
                        espera_on();
                        $.post($SCRIPT_ROOT + '/cambio_estado', {
                            id_boleta: $('#id-boleta-interna').val(),
                            tipo_accion: 4, // REPARACION
                            tipo_accion2: 2, // INGRESA REPUESTO 
                            repuesto: $('#repuesto').val(),
                            repuesto_unidades: $('#repuesto-unidades').val(),
                            repuesto_costo: $('#repuesto-costo').val(),
                            repuesto_costo_f: $('#repuesto-costo-f').val(),
                            tipo_repuesto: document.querySelector('input[name="tipo-repuesto"]:checked').value,
                            repuesto_proveedor: $('#repuesto-proveedor').val().toUpperCase(),
                        }, function (datos) {
                            espera_off();
                            document.getElementById('span-no-repuestos').hidden = true;
                            tipo_repuesto = document.querySelector('input[name="tipo-repuesto"]:checked').value;
                            switch (tipo_repuesto) {
                                case '1':
                                    tipo_repuesto = "Nuevo";
                                    break;
                                case '2':
                                    tipo_repuesto = "Usado";
                                    break;
                                case '3':
                                    tipo_repuesto = "Otro"
                                    break;
                            }
                            document.getElementById('repuesto-alerta').hidden = true;
                            document.getElementById('tbl-repuestos').insertRow(-1).innerHTML =
                                '<td class="th border p-1">' + $('#repuesto').val().toUpperCase() + '<br>/' + tipo_repuesto + '</td>'
                                + '<td class="th border p-1">' + $('#repuesto-unidades').val() + '</td>'
                                + '<td class="th border p-1">' + toThousandComma($('#repuesto-costo').val()) + '</td>'
                                + '<td class="th border p-1">' + toThousandComma($('#repuesto-costo-f').val()) + '</td>'
                                + '<td class="th border p-1">' + toThousandComma($('#repuesto-costo').val() * $('#repuesto-unidades').val()) + '</td>'
                                + '<td class="th border p-1">' + toThousandComma($('#repuesto-costo-f').val() * $('#repuesto-unidades').val()) + '</td>'
                                + '<td class="th border p-1"><button id="anular-repuesto-modal" class="btn btn-primary p-0 m-0"'
                                + 'style="width:1.8rem;height:1.8rem;" id_repuesto=' + datos + ' repuesto="' + $('#repuesto').val() + '">'
                                + '<b>-</b></button></td>';
                            $('#saldo-repuestos').val(parseFloat(parseFloat($('#saldo-repuestos').val()) + parseFloat($('#repuesto-costo-f').val() * $('#repuesto-unidades').val())));
                            $('#lbl-total-repuestos').html("(Facturar ₡ " + toThousandComma($('#saldo-repuestos').val()) + ")");
                            $('#repuesto-costo').val(0);
                            $('#repuesto-costo-f').val(0);
                            $('#repuesto').val("");
                            $('#repuesto-unidades').val(1);

                        }
                        )
                    }
                };
            });

        }
    });

    // BOTON INGRESAR REPUESTO - Regresa a color normal los campos que faltan
    $("#btn-pasar-a-repuestos-modal").blur(function (e) {
        var color_campo_original = "#FFFFFF";
        document.getElementById("repuesto").style.backgroundColor = color_campo_original;
        document.getElementById("repuesto-unidades").style.backgroundColor = color_campo_original;
        document.getElementById("repuesto-costo").style.backgroundColor = color_campo_original;
        document.getElementById("repuesto-proveedor").style.backgroundColor = color_campo_original;
        document.getElementById('repuesto-alerta').hidden = true;
    });

    //BOTON A ACTIVAR MODAL DE ANULACION DE REPUESTO
    $(document).on('click', '#anular-repuesto-modal', function () {
        $('#modal-repuesto-titulo').text("Anular Repuesto");
        $('#modal-repuesto-body').html("¿Está seguro que quiere anular el Repuesto <b>" + $(this).attr('repuesto') + '</b>'
            + " en la Boleta " + $('#id-boleta-interna').val() + '?');
        $('#modal-repuesto-valor').val($(this).attr('id_repuesto'));
        $('#modal-repuesto').modal('show');
    });


    //BOTON CONFIRMAR ANULACION DE REPUESTO
    $(document).on('click', '#btn-modal-repuesto-confirmacion', function () {
        $.post($SCRIPT_ROOT + '/cambio_estado', {
            id_boleta: $('#id-boleta-interna').val(),
            tipo_accion: 4, // REPARACION
            tipo_accion2: 3, // ANULA REPUESTO 
            id_repuesto: $('#modal-repuesto-valor').val(),
        }, function (datos) {
            $('#id-boleta-i').val($('#id-boleta-interna').val());
            $('#tipo-display-i').val(5); // VISUALIZAR
            document.getElementById("form-buscar-boleta-i").submit();
        })
    });

    // BOTON VER INFO - LISTO PARA RETIRAR
    $(document).on('click', "#btn-ver-info-retiro", function (e) {
        $('#id-boleta-i').val($('#id-boleta-interna').val());
        $('#tipo-display-i').val(5); // VISUALIZAR 
        document.getElementById("form-buscar-boleta-i").submit();
    });

    // BOTON ACTIVA MODAL ENVIAR A PILA DE FACTURAR
    $('#btn-enviar-a-facturar').click(function (event) {
        $('#modal-cambio-estado-header').text("Enviar a Pila de Facturar").show();
        $('#modal-cambio-estado-label').html('¿Está seguro que desea enviar el equipo de la boleta <b>' + $('#id-boleta-interna').val() + '</b> a la Pila de <b>Facturar</b>?').show();
        $('#modal-cambio-estado-accion').val(6);
        $('#modal-cambio-estado-accion2').val(0);
        $('#modal-cambio-estado-display').val(6);
    });

    // BOTON FACTURAR (SOLO VER)
    $(document).on('click', "#btn-ver-info-facturar", function (e) {
        $('#id-boleta-i').val($('#id-boleta-interna').val());
        $('#tipo-display-i').val(6); // VISUALIZAR FACTURAR
        document.getElementById("form-buscar-boleta-i").submit();
    });

    // BOTON ACTIVA MODAL CONFIRMAR ENTREGA A CLIENTE
    $('#boton-amodal-entrega').click(function (event) {
        document.getElementById("facturacion-info").hidden = true;
        document.getElementById("btn-entrega-factura-confirmar").hidden = false;
        $('#modal-entrega-factura-titulo').text("Entrega de Equipo al Cliente");
        $('#modal-entrega-factura-body').html('¿Desea registrar que el equipo fue ya retirado por el cliente?<br><br>Esta acción marcará como <b>cerrada</b> esta boleta');
        $('#tipo-modal-entrega-factura').val(1);
        $('#modal-entrega-factura').modal('show');
    });

    // BOTON ACTIVA MODAL CONFIRMAR ANULAR COMPROBANTE
    $('#anular-comprobante-modal').click(function (event) {
        $('#modal-entrega-factura-titulo').text("Anular Comprobante");
        document.getElementById("btn-entrega-factura-confirmar").hidden = false;
        $('#modal-entrega-factura-body').html('¿Desea anular el comprobante para esta Boleta?');
        $('#tipo-modal-entrega-factura').val(3);
        $('#modal-entrega-factura').modal('show');
    });

    // BOTON ACTIVA MODAL CONFIRMAR FACTURA
    $('#boton-amodal-factura').click(function (event) {
        $('#modal-entrega-factura-titulo').text("Registro de Factura para el Equipo");
        document.getElementById("facturacion-info").hidden = true;
        document.getElementById("factura-alerta").hidden = true;
        document.getElementById("btn-entrega-factura-confirmar").hidden = false;
        if ($('#verif-comprobante').val() == 0) {
            $('#modal-entrega-factura-body').html('No se puede registrar la Factura por reparación de este equipo si aún no se ha marcado como <b>Entregado</b>');
            document.getElementById("btn-entrega-factura-confirmar").hidden = true;
        } else {
            $('#modal-entrega-factura-body').html('¿Desea registrar la Factura para esta boleta?<br><br>');
            document.getElementById("facturacion-info").hidden = false;
            $('#tipo-modal-entrega-factura').val(5);
        }
        $('#modal-entrega-factura').modal('show');
    });

    // BOTON MODAL CONFIRMAR ENTREGA/FACTURA
    $('#btn-entrega-factura-confirmar').click(function (event) {
        if ($('#tipo-modal-entrega-factura').val() == 1) {
            $.post($SCRIPT_ROOT + '/cambio_estado', {
                id_boleta: $('#id-boleta-interna').val(),
                tipo_accion: 6, // FACTURA
                tipo_accion2: 2, // REGISTRA RETIRO 
            }, function (datos) {
                $('#id-boleta-i').val($('#id-boleta-interna').val());
                $('#tipo-display-i').val(6); // VISUALIZAR
                document.getElementById("form-buscar-boleta-i").submit();
            })
        }
        if ($('#tipo-modal-entrega-factura').val() == 3) {
            $.post($SCRIPT_ROOT + '/cambio_estado', {
                id_boleta: $('#id-boleta-interna').val(),
                tipo_accion: 6, // FACTURA
                tipo_accion2: 3, // ANULA COMPROBANTE 
            }, function (datos) {
                $('#id-boleta-i').val($('#id-boleta-interna').val());
                $('#tipo-display-i').val(6); // VISUALIZAR
                document.getElementById("form-buscar-boleta-i").submit();
            })
        }
        if ($('#tipo-modal-entrega-factura').val() == 4) {
            $.post($SCRIPT_ROOT + '/cambio_estado', {
                id_boleta: $('#id-boleta-interna').val(),
                tipo_accion: 6, // FACTURA
                tipo_accion2: 4, // CREA COMPROBANTE 
            }, function (datos) {
                $('#id-boleta-i').val($('#id-boleta-interna').val());
                $('#tipo-display-i').val(6); // VISUALIZAR
                document.getElementById("form-buscar-boleta-i").submit();
            })
        }
        if ($('#tipo-modal-entrega-factura').val() == 5) {
            if ($("#factura").val().length < 15) {
                $('#factura-alerta').html('Códido de Factura Inválido');
                document.getElementById("factura-alerta").hidden = false;
            } else {
                $.post($SCRIPT_ROOT + '/cambio_estado', {
                    id_boleta: $('#id-boleta-interna').val(),
                    tipo_accion: 6, // FACTURA
                    tipo_accion2: 5, // GUARDA FACTURA
                    factura: $('#factura').val()
                }, function (datos) {
                    $('#id-boleta-i').val($('#id-boleta-interna').val());
                    $('#tipo-display-i').val(6); // VISUALIZAR
                    document.getElementById("form-buscar-boleta-i").submit();
                })
            }
        }
    });

    // BOTON ACTIVA MODAL CONFIRMAR CORREO COMPROBANTE
    $('#btn-comprobante-correo-enviar').click(function (event) {
        $('#modal-comprobante-correo-body').html('El comprobante será enviado al correo <b>' + $('#correo').val());
    });

    // BOTON ENVIAR CORREO COTIZACION
    $(document).on('click', "#modal-comprobante-correo-confirmar", function (e) {
        $.post($SCRIPT_ROOT + '/pdfs_mail', {
            tipo_accion: 4, // COMPROBANTE
            id_boleta: $('#id-boleta-interna').val(),
            id_cliente: $('#codigo-cliente').val()
        }, function (data) {
        });
    });

    // BOTON ACTIVA MODAL CREAR COMPROBANTE
    $('#boton-amodal-crear-comprobante').click(function (event) {
        $('#modal-entrega-factura-titulo').text("Registro de Comprobante Provisional");
        document.getElementById("btn-entrega-factura-confirmar").hidden = false;
        $('#modal-entrega-factura-body').html('¿Desea Generar el comprobante Provisional para que el Cliente pueda retirar el Equipo?');
        $('#tipo-modal-entrega-factura').val(4);
        $('#modal-entrega-factura').modal('show');
    });

    // BOTON ACTIVA MODAL CERRAR BOLETA
    $('#btn-activa-modal-cerrar-boleta').click(function (event) {
        if ($('#saldo-i').val() != 0) {
            $('#label-modal-cerrar-boleta').html("No es posible Cerrar la Boleta " + $('#id-boleta-interna').val() + '.<br>Para poder cerrarla, el saldo debe ser ₡ 0.00');
            document.getElementById("btn-modal-cerrar-boleta-confirmar").hidden = true;
        }
        else {
            $.post($SCRIPT_ROOT + '/proceso_movimientos', {
                id_boleta: $('#id-boleta-interna').val(),
                monto: 0,
                tipo: 0,
                medio: 0,
                concepto: 0,
                accion: 4, // VERIFICA EL MONTO EN PAGOS
                id_movimiento: 0
            }, function (datos) {
                if (datos > 0) {
                    cadena = "Esta acción cerrará la boleta y no será posible modificarla después.<br>Además, si tiene cotización activa y/o repuestos utilizados <b><ins>serán anulados</ins></b>.";
                    cadena += "<br><br>Esta Boleta tiene <b>₡" + miles(datos) + "</b>, que se deben facturar.<br><br>¿Desea continuar?";
                    $('#label-modal-cerrar-boleta').html(cadena);
                } else {
                    $('#label-modal-cerrar-boleta').html("Esta acción cerrará la boleta y no será posible modificarla después.<br>Además, si tiene cotización activa y/o repuestos utilizados <b><ins>serán anulados</ins></b>.<br><br>Esta Boleta NO tiene pagos. <ins>No es necesario Facturar</ins>.<br><br>¿Desea continuar?");
                }
            })
            document.getElementById("btn-modal-cerrar-boleta-confirmar").hidden = false;
            document.getElementById("lbl-motivo-cierre").hidden = false;
            document.getElementById("motivo-cierre").hidden = false;
        }
        $('#modal-cerrar-boleta').modal('show');
    });

    // BOTON CONFIRMAR CERRAR BOLETA
    $('#btn-modal-cerrar-boleta-confirmar').click(function (event) {
        if ($('#motivo-cierre').val().length < 15) {
            //document.getElementById('lbl-motivo-cierre').className = "text-primary my-0";
            $('#lbl-motivo-cierre').html("Motivo<font color=red> (Debe ser mayor o igual a 15 caracteres)</font>");
        } else {
            $.post($SCRIPT_ROOT + '/cambio_estado', {
                id_boleta: $('#id-boleta-interna').val(),
                tipo_accion: 7, // CIERRE ANTICIPADO
                tipo_accion2: 0, // VACIO
                cierre_comentario: $('#motivo-cierre').val()
            }, function (datos) {
                $('#id-boleta-i').val($('#id-boleta-interna').val());
                $('#tipo-display-i').val(6); // VISUALIZAR
                document.getElementById("form-buscar-boleta-i").submit();
            })
        }
    });

    // BOTON CONFIRMAR CERRAR BOLETA - QUITAR AVISO
    $("#btn-modal-cerrar-boleta-confirmar").blur(function (e) {
        $('#lbl-motivo-cierre').html("Motivo");
    });

    // BOTON COLLAPSE PAGO 2 (FACTURACION)
    $(document).on('click', "#boton-collapse-pago2", function (e) {
        document.getElementById('collapsePago').hidden = false;
        $('.collapseC').collapse('hide');
        $('#monto-p').val($('#saldo-i').val() * -1)
        $('.collapseP').collapse('show');
    });


    // BOTON ACTIVA MODAL ENVIAR A PILA DE FACTURAR
    $('#btn-enviar-a-garantia').click(function (event) {
        $('#modal-cambio-estado-header').text("Aplicar Garantía").show();
        $('#modal-cambio-estado-label').html('¿Está seguro que desea aplicar garantía a la boleta <b>' + $('#id-boleta-interna').val() + '</b>?');
        $('#modal-cambio-estado-accion').val(8);
        $('#modal-cambio-estado-accion2').val(0);
        $('#modal-cambio-estado-display').val(1);
    });

    // BOTON ACTIVA MODAL ENVIAR A PILA DE RECHAZO
    $('#btn-enviar-a-rechazo').click(function (event) {
        $('#modal-cambio-estado').modal('show');
        document.getElementById("comentario-rechazo").hidden = false;
        $('#modal-cambio-estado-header').text("Enviar a Rechazo");
        $('#modal-cambio-estado-label').html('Esta acción enviará automáticamente un correo electrónico al cliente indicando que tiene 15 días para recoger el artículo. De lo contrario se empezará a cobrar tarifa por Bodegaje.<br>'
            + 'Por favor asegúrese de notificar vía telefónica o Whatsapp al cliente y de registrar un comentario al respecto en esta boleta.<br><br>'
            + '¿Está seguro que desea enviar a rechazo la boleta <b>' + $('#id-boleta-interna').val() + '</b>?');
        $('#modal-cambio-estado-accion').val(9);
        $('#modal-cambio-estado-accion2').val(0);
        $('#modal-cambio-estado-display').val(7);
    });

    // MODAL CAMBIO DE ESTADO - OCULTA OTROS CAMPOS
    $('#modal-cambio-estado').on('show.bs.modal', function (event) {
        document.getElementById('comentario-rechazo').hidden = true;
        document.getElementById("btn-envio-estado-confirmacion").disabled = false;
        document.getElementById("btn-envio-estado-confirmacion").hidden = false;
        document.getElementById('guardar-cambio-estado-alerta').hidden = true;
    });

    // BOTON ACTIVA MODAL HISTORIAL
    $('#btn-historial').click(function (event) {
        espera_on();
        $("#tbl-historial").empty();
        $.post($SCRIPT_ROOT + '/historial', {
            id_boleta: $('#id-boleta-interna').val(),
            tipo_accion: 1 // TODO EL HISTORIAL
        }, function (datos) {
            document.getElementById('tbl-historial').insertRow(-1).innerHTML =
                '<th class="th border p-1 alert-info">Fecha</th>'
                + '<th class="th border p-1 alert-info">Acción</th>'
                + '<th class="th border p-1 alert-info">Comentario</th>'
                + '<th class="th border p-1 alert-info">Usuario</th>';
            $.each(datos.resultado, function (index, registro) {
                document.getElementById('tbl-historial').insertRow(-1).innerHTML =
                    '<td class="td border p-1">' + registro[0] + '</td>'
                    + '<td class="td border p-1">' + registro[1] + '</td>'
                    + '<td class="td border p-1">' + registro[2] + '</td>'
                    + '<td class="td border p-1">' + registro[3] + '</td>';
            });
        }, "json")
            .fail(function () {
                document.getElementById('tbl-historial').insertRow(-1).innerHTML =
                    '<td class="td border p-1" colspan=4><div class="alert alert-danger m-3" role="alert">Error: Por favor ingrese de nuevo al Sistema</div></td>';
            });
        espera_off();
        $('#modal-historial-titulo').html(`Historial de boleta <b>${$('#id-boleta-interna').val()}</b>`);
        $('#modal-historial').modal('show');
    });

    // BOTON AGREGAR COMENTARIO
    $('#btn-guardar-comentario').click(function (event) {
        document.getElementById('guardar-comentario-alerta').hidden = true;
        if ($("#comentario2").val().length < 15) {
            document.getElementById('guardar-comentario-alerta').hidden = false;
        }
        else {
            $.post($SCRIPT_ROOT + '/comentario', {
                id_boleta: $('#id-boleta-interna').val(),
                comentario: $('#comentario2').val(),
            }, function (datos) {
            });
            $("#comentario2").val("");
            $('#modal-comentario-boleta').modal('hide');
        }
    });



    // BOTON COLLAPSE BODEGAJE
    $(document).on('click', "#link-lista-bodegaje", function (e) {
        document.getElementById('collapseBodegaje').hidden = false;
        $('.collapseBod').collapse('toggle');
    });

    // BOTON WHATSAPP RECHAZO
    $(document).on('focus', "#link-wa-rechazo", function (e) {
        $.post($SCRIPT_ROOT + '/cambio_estado', {
            id_boleta: 0,
            tipo_accion: 9, // RECHAZOS
            tipo_accion2: 1 // RECUPERAR MENSAJE
        }, function (datos) {
            document.getElementById('link-wa-rechazo').setAttribute('href', "https://api.whatsapp.com/send?phone=506" + $('#telefono').val() + "&text=" + datos);
        })
    });

    // MODAL COMENTARIO-BOLETA CARGAR ULTIMOS COMENTARIO
    $('#modal-comentario-boleta').on('show.bs.modal', function (event) {
        $("#tbl-historial-comentarios").empty();
        $.post($SCRIPT_ROOT + '/historial', {
            id_boleta: $('#id-boleta-interna').val(),
            tipo_accion: 2 // HISTORIAL DE COMENTARIOS
        }, function (datos) {
            //if (Object.keys(datos).length > 0) {
            if (datos.resultado.length > 0) {
                document.getElementById('tbl-historial-comentarios').insertRow(-1).innerHTML =
                    '<th class="th border p-1 alert-info">Fecha</th>'
                    + '<th class="th border p-1 alert-info">Comentario</th>'
                    + '<th class="th border p-1 alert-info">Usuario</th>';
                $.each(datos.resultado, function (index, registro) {
                    document.getElementById('tbl-historial-comentarios').insertRow(-1).innerHTML =
                        '<td class="td border p-1">' + registro[0] + '</td>'
                        + '<td class="td border p-1">' + registro[1] + '</td>'
                        + '<td class="td border p-1">' + registro[2] + '</td>';
                });
            }
            else {
                document.getElementById('tbl-historial-comentarios').insertRow(-1).innerHTML =
                    '<td class="td p-1" colspan=4><div class="alert alert-danger m-3" role="alert">Sin Comentarios</div></td>';
            }
        }, "json")
            .fail(function () {
                document.getElementById('tbl-historial-comentarios').insertRow(-1).innerHTML =
                    '<td class="td p-1" colspan=4><div class="alert alert-danger m-3" role="alert">Error: Por favor ingrese de nuevo al Sistema</div></td>';
            });
    });

    // BOTON ACTIVA MODAL ENVIAR A PILA DE FACTURAR
    $('#btn-cerrar-boleta-sin-pagos').click(function (event) {
        $('#modal-cambio-estado-header').text("Cerrar Boleta").show();
        $('#modal-cambio-estado-label').html('¿Está seguro que desea cerrar la boleta <b>' + $('#id-boleta-interna').val() + '</b>?<br><br>Esta acción anulará todos los cargos activos dado que no se facturarán').show();
        $('#modal-cambio-estado-accion').val(11);
        $('#modal-cambio-estado-accion2').val(0);
        $('#modal-cambio-estado-display').val(6);
        $('#modal-cambio-estado').modal('show');
    });

    // BOTON APLICAR DESCUENTO
    $(document).on('click', "#modal-descuento-btn-confirmar", function (e) {
        document.getElementById("modal-descuento-alerta").style.visibility = "hidden";
        if ($("#motivo-descuento").val().length <= 15) {
            $('#modal-descuento-alerta').html("El motivo debe contener 15 caracteres o más.<br>Por favor incluya más detalle.");
            document.getElementById("modal-descuento-alerta").style.visibility = "visible";
        } else if ($("#monto-descuento").val() <= 0) {
            $('#modal-descuento-alerta').html("El monto del descuento debe ser mayor a cero<br>Por favor revise.");
            document.getElementById("modal-descuento-alerta").style.visibility = "visible";
        } else {
            $.post($SCRIPT_ROOT + '/cambio_estado', {
                id_boleta: $('#id-boleta-interna').val(),
                tipo_accion: 12, // DESCUENTOS
                tipo_accion2: 0, // APLICAR DESCUENTO
                descuento_tipo: $('#tipo-descuento').val(), // TIPO DESCUENTO
                descuento_monto: $('#monto-descuento').val(), // MONTO DESCUENTO
                descuento_motivo: $('#motivo-descuento').val() // MONTO DESCUENTO
            }, function (datos) {
                if (datos == "E-valor-mayor") {
                    $('#modal-descuento-alerta').html("El monto del descuento es mayor al monto de Facturación.<br>Por favor revíselo.");
                    document.getElementById("modal-descuento-alerta").style.visibility = "visible";
                }
                else if (datos == "E-ya-existe") {
                    $('#modal-descuento-alerta').html("Ya existe un descuento para este concepto<br>Por favor revíselo.");
                    document.getElementById("modal-descuento-alerta").style.visibility = "visible";
                } else if (datos == "ok") {
                    $('#id-boleta-i').val($('#id-boleta-interna').val());
                    $('#tipo-display-i').val(6); // VISUALIZAR
                    document.getElementById("form-buscar-boleta-i").submit();
                }
            })
        }
    });

    // AL DEJAR EL BOTON DE DESCUENTO
    $(document).on('blur', "#modal-descuento-btn-confirmar", function (e) {
        document.getElementById("modal-descuento-alerta").style.visibility = "hidden";
    });

    // AL CERRAR EL MODAL DE NOTIFICACION GENERICO
    $(document).on('click', "#modalNotificacion-btnOk", function (e) {
        $("#modalNotificacion-mensaje").html("");
        document.getElementById("modalNotificacion-imagen1").hidden = true;
        document.getElementById("modalNotificacion-imagen2").hidden = true;
        document.getElementById("modalNotificacion-imagen3").hidden = true;
    });

});