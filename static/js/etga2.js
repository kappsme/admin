$(document).ready(function () {

    // $("#telefono").inputmask({ "mask": "9999-9999" });
    autocomplete(document.getElementById("zona"), zonas);
    autocomplete(document.getElementById("zona2"), zonas);

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

    // BUSCAR Y DESPLEGAR BOLETAS
    function boletas_cliente() {
        $('#lista_sugerencias').html("");
        document.getElementById("boton-editar-cliente").disabled = false;
        $('#tbl-boletas tr').not(':first').remove();
        $('#tbl-ventas tr').not(':first').remove();
        // LISTA DE BOLETAS DEL CLIENTE
        $.post($SCRIPT_ROOT + '/busqueda', {
            id_cliente: $('#codigo-cliente').val(),
            tipo_busqueda: 2
        }, function (datos) {
           if (datos.boletas_conteo > 0) {
                $.each(datos.boletas_resultado, function (index, texto) {
                    registro = (texto + '').split(',');
                    //datos = registro[0] + "," + registro[1] + "," + registro[2] + "," + registro[3] + "," + registro[4] + "," + registro[5] + "," + registro[6] + "," + registro[7];
                    switch (registro[3]) {
                        case '0':
                            estado = "Nueva";
                            break;
                        case '1':
                            estado = "Diagóstico";
                            break;
                        case '2':
                            estado = "Cotización";
                            break;
                        case '3':
                            estado = "Confirmación Cliente";
                            break;
                        case '4':
                            estado = "Reparación";
                            break;
                        case '5':
                            estado = "Listo para Retiro";
                            break;
                        case '6':
                            estado = "Facturación";
                            break;
                        case '10':
                            estado = "Cerrada";
                            break;
                        default:
                            estado = "Desconocido!";
                    }
                    document.getElementById('tbl-boletas').insertRow(-1).innerHTML =
                        '<td class="th border p-1" style="font-size:1.2rem;"><b><a href="#" id="n_boleta" valor="' + registro[0] + '">' + registro[0] + '</b></td>'
                        + '<td class="th border p-1">' + registro[1] + '</td>'
                        + '<td class="th border p-1">' + registro[2] + '</td>'
                        + '<td class="th border p-1">' + estado + '</td>'
                        + '<td class="th border p-1">' + registro[4] + '</td>'
                        + '<td class="th border p-1">' + registro[5] + '</td>'
                        + '<td class="th border p-1">' + registro[6] + '</td>'
                        + '<td class="th border p-1">' + registro[7] + '</td>';
                });
            }
           if (datos.ventas_conteo > 0) {
                $.each(datos.ventas_resultado, function (index, texto) {
                    registro = (texto + '').split(',');
                     document.getElementById('tbl-ventas').insertRow(-1).innerHTML =
                        '<td class="th border p-1">' + registro[1] + '</td>'
                        + '<td class="th border p-1" style="font-size:1.2rem;"><b><a href="#" onclick="ver_venta(' + registro[0] + ');">' + registro[0] + '</b></td>'
                        + '<td class="th border p-1"><p style="float:right;">₡ ' + toThousandComma(registro[2]) + '</p></td>'
                        + '<td class="th border p-1">' + registro[3] + '</td>';
                });

            }
            document.getElementById('collapseBoletas').hidden = false;
            $('.collapse1').collapse('show');
        });
    };

    // Al seleccionar una Boleta de la lista del Cliente
    $(document).on('click', '#n_boleta', function () {
        $('#id-boleta-i').val($(this).attr('valor'));
        $('#tipo-display-i').val(10); // VISUALIZAR TODO HASTA DONDE EXISTA
        document.getElementById("form-buscar-boleta-i").submit();
    });

    // Busca por el campo maestro Cliente
    $("#nombres").keyup(function (e) {
        document.getElementById('boton-editar-cliente').disabled = true;
        document.getElementById('check-ok-padron').hidden = true;
        document.getElementById('check-nok-padron').hidden = true;
        document.getElementById('check-ok-etga').hidden = true;
        document.getElementById('check-nok-etga').hidden = true;
        document.getElementById('boton-guardar-cliente').disable = true;
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
                    data2 += '<a href="#" id="autocompleta" class="list-group-item list-group-item-action my-0 py-1 px-1" valores="' + datos + '"><div class="d-flex w-100 justify-content-between">'
                        + '<h3 class="text-primary my-0 px-1" style="font-size:1.1rem">[' + registro[0] + '] ' + registro[1] + ' ' + registro[2] + '</h3><small class="text-muted">  Tel. ' + registro[3] + '</small></div>'
                        + '<small class="text-muted style="font-size:0.80rem">' + tipo_documentox + ': ' + registro[7] + ' / Email: ' + registro[6] + '</small></a>';
                    return (index !== 10);
                });
                $('#lista_sugerencias').html(data2);
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
        boletas_cliente();
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
        $('#lista_sugerencias').html("");
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
                    boletas_cliente();
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
                        $('#lista_sugerencias').html(data);
                        $('.collapse1').collapse('show');
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

    // BOTON PARA ENVIAR NUEVO ELEMENTO AL CATALOGO MARCAS / TIPO EQUIPO / ZONA / REPUESTO
    $('#btn-ingreso-elemento-confirmacion').click(function (event) {
        $.post($SCRIPT_ROOT + '/ingreso_catalogo', {
            tipo_accion: $('#modal-ingreso-elemento-accion').val(),
            valor: $('#modal-ingreso-elemento-valor').val(),
        }, function (data) {
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
        });
    });


});