$(document).ready(function () {

    if ($("#marca").length) {
        autocomplete(document.getElementById("marca"), marcas);
    }

    if ($("#proveedor").length) {
        autocomplete(document.getElementById("proveedor"), proveedores);
    }

    if ($("#fm_proveedor").length) {
        autocomplete(document.getElementById("fm_proveedor"), proveedores);
    }

    function tienda_saldo_pagos(x) {
        let tabla_pagos = "";
        let saldo = 0;
        $.post($SCRIPT_ROOT + '/tnd', {
            "tienda-accion": 9, // Pagos y Saldo
        }, function (datos) {
            saldo = datos.saldo;
            if (datos.pagos.length > 0) {
                tabla_pagos += "<table><thead><tr>";
                Object.keys(datos.pagos[0]).forEach(function (val, idx, array) {
                    if (val == "medio" || val == "monto") {
                        tabla_pagos += "<th>" + capitalize(val) + "</th>";
                    }
                });
                tabla_pagos += "</tr></thead>";
                tabla_pagos += "<tbody>";
                $.each(datos.pagos, function (index, info) {
                    tabla_pagos += "<tr class='border'>";
                    id_pago = 0;
                    Object.keys(info).forEach(function (val, idx, array) {
                        if (val == "monto") {
                            tabla_pagos += "<td>₡ " + toThousandComma(info[val]) + "</td>";
                        } else if (val == "medio") {
                            tabla_pagos += '<td>' + info[val] + '</td>';
                        } else if (val == "id") {
                            tabla_pagos += '<td>&nbsp;&nbsp;<a href="#" id="id-pago-venta" dato-id=' + info[val] + '><span class="badge badge-danger">Anular</span></td>'
                        }
                    });
                    tabla_pagos += "</tr>";
                    return (index !== 15);
                }, JSON);
                tabla_pagos += "</tbody></table>";
            }
            $("#saldo_recibo_tienda").html("Saldo<br>₡ " + toThousandComma(saldo));
            $("#monto-p").val(saldo);
            $("#tabla_pagos_tienda").html(tabla_pagos);
            if (saldo == 0) {
                $("#collapsePago").collapse('hide');
                $("#confirmar-venta-boton").collapse('show');
                document.getElementById('boton-pago-tienda').disabled = true;
            } else {
                $("#collapsePago").collapse('show');
                $("#confirmar-venta-boton").collapse('hide');
                document.getElementById('boton-pago-tienda').disabled = false;
            }
        });
    };

    //  Calculo de la utilidad
    function inv_utilidad(monto_factura, unidades, tipo, costo_adicional1, costo_adicional2, precio_venta) {
        $("#alerta-lote").html("");
        //    validaciones
        let flete = costo_adicional1;
        let aduana = costo_adicional2;
        if (flete < 0 || flete == "") {
            flete = 0;
        }
        if (aduana < 0 || aduana == "") {
            aduana = 0;
        }

        if (unidades >= 1 && unidades <= 10000 && monto_factura > 0) {

            // Impuesto
            var impuesto;
            if (tipo == 1) {
                impuesto = 13; // NUEVO 13%
            } else if (tipo == 2) {
                impuesto = 5.8; // USADO 5.8%
            } else {
                impuesto = 0;
            }

            // Costo unitario
            var costo_unitario = (parseInt(monto_factura) + parseInt(flete) + parseInt(aduana)) / unidades;
            var lbl_costo = `Costo Unitario <br><b> ₡ ${toThousandComma(Math.round(costo_unitario))}</b><br>`;

            // Costo Unitario(+imp)
            if (document.getElementById("f_impuestos_incluidos").checked == false) {
                costo_unitario = costo_unitario * (1 + impuesto / 100);
            }

            lbl_costo += `Costo Unitario (+imp)<br><b> ₡ ${toThousandComma(Math.round(costo_unitario))}</b>`;

            $("#costo_unitario_lbl").html(lbl_costo);
            $("#costo_unitario").val(Math.round(costo_unitario));

            //Utilidad
            var utilidad_bruta = precio_venta - costo_unitario;
            var utilidad_neta_pct = ((precio_venta / (1 + impuesto / 100)) / costo_unitario) - 1;
            var utilidad_neta = (precio_venta / (1 + impuesto / 100)) - costo_unitario;
            var lbl_utilidad = `Bruta <b>₡${toThousandComma(Math.round(utilidad_bruta))}</b><br>`;
            lbl_utilidad += `Neta <b>₡${toThousandComma(Math.round(utilidad_neta))}</b> (${Math.round(utilidad_neta_pct * 10000) / 100}%)`;
            $("#utilidad").html(lbl_utilidad);
        } else {
            $("#costo_unitario_lbl").html(`Costo Unitario <br><b>₡ -</b>`);
            $("#utilidad").html(`<b>₡ -</b> (-%)`);
            $("#costo_unitario").val(0);
        }
        return "ok";
    };

    // BLUR DE VALIDACION PRODUCTO
    $(document).on('blur', "#crear-producto", function (e) {
        var elementos = document.getElementById("form-producto").elements;
        for (var i = 0; i <= elementos.length - 1; i++) {
            if ((elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'number')) {
                elementos[i].style.backgroundColor = "#eff6fa";
                $("#alerta-producto").css("display", "none");
            }
        }
    });


    function crud_producto(tipo) {
        // VALIDACIONES DE CAMPOS
        var campos_nulos = "";
        var campos_numericos_falla = "";
        mensaje = "";
        $("#alerta-producto").css("display", "none");
        var elementos = document.getElementById("form-producto").elements;
        for (var i = 0; i <= elementos.length - 1; i++) {
            if ((elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'number' || elementos[i].type == 'select-one') &&
                ((tipo == 2 && elementos[i].name != "codigo") || (tipo == 1))) {
                elementos[i].style.backgroundColor = "#EFF6FA";
            }
        }
        for (var i = 0; i <= elementos.length - 1; i++) {
            if ((elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'date' || elementos[i].type == 'number') && elementos[i].value == "") {
                elementos[i].style.backgroundColor = "#FFCCCC";
                campos_nulos = campos_nulos + " " + elementos[i].name;
            }

            if ((elementos[i].type == 'number') && elementos[i].value < 0) {
                elementos[i].style.backgroundColor = "#FFCCCC";
                campos_numericos_falla = campos_numericos_falla + " " + elementos[i].name;
            }

        }
        if (campos_nulos != "") {
            mensaje = "Los campos < <b>" + campos_nulos + "</b> > son obligatorios<br>";
        }
        if (campos_numericos_falla != "") {
            mensaje = mensaje + "Valores inválidos para < <b>" + campos_numericos_falla + " ></b>";
        }

        if (mensaje != "") {
            $("#alerta-producto").html(mensaje);
            $("#alerta-producto").css("display", "block");
        } else {
            if (tipo == 1) {
                codigo = "";
            } else if (tipo == 2) {
                codigo = $("#codigo").val();
            }
            $.post($SCRIPT_ROOT + '/inv', {
                "inv-accion": 3, // Producto
                "inv-accion2": 2, // Comsulta
                "tipo": tipo, // SI ES VERIFICACION DE DUPLICADOS (MODIFICACION DE ATRIBUTOS DE UN PRODUCTO)
                "codigo_producto": codigo,
                nombre: $("#nombre").val(),
                marca: $("#marca").val(),
                modelo: $("#modelo").val()
            }, function (data) {
                if (data == 1) {
                    $("#alerta-producto").html("Ya existe un producto <b>" + $("#nombre").val().toUpperCase() + " [" + $("#marca").val().toUpperCase() + " / " + $("#modelo").val().toUpperCase() + "]</b> en el inventario con otro código.");
                    $("#alerta-producto").css("display", "block");
                } else if (data == "NO-MARCA") {
                    $('#modal-ingreso-elemento-header').text("Nueva marca detectada!").show();
                    $('#modal-ingreso-elemento-label').html("La marca <b>" + $('#marca').val().toUpperCase() + "</b> no se encuentra en el Catálogo de Marcas de esta KAPP.<br><br>¿Desea agregarla?");
                    $('#modal-ingreso-elemento-accion').val('marca');
                    $('#modal-ingreso-elemento-valor').val($('#marca').val());
                    $('#modal-ingreso-elemento').modal('show');
                } else {
                    if (tipo == 1) {
                        mensaje_producto = "El producto <b>" + $("#nombre").val().toUpperCase() + "</b> se agregará en el inventario.<br>¿Desea continuar?";
                        titulo_modal = "Creación de nuevo Producto";
                        current_inv_accion = 3;
                        inv_accion = 3;
                        inv_accion2 = 1;
                    } else if (tipo == 2) {
                        mensaje_producto = "El producto <b>" + $("#codigo").val() + "</b> se actualizará en el inventario.<br>¿Desea continuar?";
                        titulo_modal = "Actualización de Producto";
                        inv_accion = 3;
                        inv_accion2 = 4;
                    }
                    $('#modal-mensaje-producto').html(mensaje_producto);
                    $('#titulo_modal2').html(titulo_modal);
                    $('#current_inv_accion').val(current_inv_accion);
                    $('#inv-accion').val(inv_accion);
                    $('#inv-accion2').val(inv_accion2);
                    $('#modal-confirmacion-producto').modal('show');

                }
            });
        }
    }

    // VALIDA NUEVO PRODUCTO
    $(document).on('click', "#crear-producto", function (e) {
        crud_producto(1);
    });

    // ENVIA A CREACION NUEVO PRODUCTO / LOTE
    $(document).on('click', "#btn-modal-producto-confirmacion", function (e) {
        if ($('#current_inv_accion').val() == 2) {
            $.post($SCRIPT_ROOT + '/inv', {
                "inv-accion": 2, // Lote
                "inv-accion2": 1, // Ingreso
                codigo_producto: $('#codigo').val(),
                factura: $('#factura').val(),
                monto_factura: $('#monto_factura').val(),
                fecha_factura: $('#fecha_factura').val(),
                unidades: $('#unidades').val(),
                estado: $('#estado').val(),
                proveedor: $('#proveedor').val(),
                ubicacion: $('#ubicacion').val(),
                flete: $('#flete').val(),
                aduana: $('#aduana').val(),
                costo_unitario: $('#costo_unitario').val(),
                precio_venta: $('#precio').val(),
                precio_a_taller: $('#precio_a_taller').val(),
            }, function (data) {
                if (data == "OK") {
                    document.getElementById('alerta-lote').className = "text-success p-3";
                    $("#alerta-lote").html("El lote fue agregado satisfactoriamente para el producto <b>" + $('#nombre').val());
                    var elementos = document.getElementById("form-lote").elements;
                    for (var i = 0; i <= elementos.length - 1; i++) {
                        if (elementos[i].type == 'textarea' || elementos[i].type == 'number' || elementos[i].type == 'text' || elementos[i].type == 'date') {
                            if (elementos[i].id != "proveedor" && elementos[i].id != "factura") {
                                elementos[i].value = 0;
                            }
                        }
                    }
                    $("#utilidad").html('');
                    $("#costo_unitario_lbl").html('');
                    display_lotes($("#codigo").val());
                }
                else if (data == "NO-PROVEEDOR") {
                    $('#modal-ingreso-elemento-header').text("Nuevo Proveedor detectado!");
                    $('#modal-ingreso-elemento-label').html("La proveedor <b>" + $('#proveedor').val().toUpperCase() + "</b> no se encuentra en el Catálogo de Proveedores de esta KAPP.<br><br>¿Desea agregarlo?");
                    $('#modal-ingreso-elemento-accion').val('proveedor');
                    $('#modal-ingreso-elemento-valor').val($('#proveedor').val());
                    $('#modal-ingreso-elemento').modal('show');

                } else {
                    document.getElementById('alerta-lote').className = "text-danger p-3";
                    $("#alerta-lote").html("Ocurrió un error al intentar agregar el Lote. Por favor repórtelo al administrador.<br>Producto <b>" + $('#nombre').val());
                }
                $("#alerta-lote").css("display", "block");
                $('#modal-confirmacion-producto').modal('hide');
            });
        };
        if ($('#inv-accion').val() == 3 && $('#inv-accion2').val() == 1) { // INGRESO NUEVO PRODUCTO
            /*  $.post($SCRIPT_ROOT + '/inv', {
                 "inv-accion": 3, //Producto
                 "inv-accion2": 1,  // CREAR
                 nombre: $('#nombre').val(),
                 marca: $('#marca').val(),
                 modelo: $('#modelo').val(),
                 categoria: $('#categoria').val(),
                 descripcion: $('#descripcion').val(),
                 garantia: $('#garantia').val(),
                 disponibilidad: $('#disponibilidad').val(),
                 cabys: $('#cabys').val(),
             },
                 func/* tion (data) { */
            // --alert(data);
            /*    } */
            document.getElementById("form-producto").submit();
            // );
        }
        if ($('#inv-accion').val() == 3 && $('#inv-accion2').val() == 4) {
            $.post($SCRIPT_ROOT + '/inv', {
                "inv-accion": $('#inv-accion').val(),
                "inv-accion2": $('#inv-accion2').val(),
                codigo: $('#codigo').val(),
                nombre: $('#nombre').val(),
                marca: $('#marca').val(),
                modelo: $('#modelo').val(),
                categoria: $('#categoria').val(),
                descripcion: $('#descripcion').val(),
                garantia: $('#garantia').val(),
                disponibilidad: $('#disponibilidad').val(),
                cabys: $('#cabys').val(),
            },
                function (data) {
                    if (data == "OK") {
                        mensaje = "Este producto fue actualizado satisfactoriamente!";
                    } else {
                        mensaje = "Error de actualización. Por favor, comuníquese con el administrador";
                    }
                    var elementos = document.getElementById("form-producto").elements;
                    for (var i = 0; i <= elementos.length - 1; i++) {
                        if ((elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'number' || elementos[i].type == 'select-one') && elementos[i].name != 'codigo') {
                            elementos[i].disabled = true;
                            elementos[i].style.backgroundColor = "#EEEEEE";
                        }
                    }
                    $("#boton-activar-editar-producto").text("Editar");
                    $("#alerta-producto").html(mensaje);
                    $("#alerta-producto").css("display", "block");
                    $('#modal-confirmacion-producto').modal('hide');
                    $("#inv_img_clear_file1").css("display", "none");
                    $("#inv_img_clear_file2").css("display", "none");
                    $("#inv_img_clear_file3").css("display", "none");
                    $("#inv_img_file1").css("display", "none");
                    $("#inv_img_file2").css("display", "none");
                    $("#inv_img_file3").css("display", "none");
                });
        }
    });

    var gl_tipo_precio = 1; // 1 = TIENDA / 2 = TALLER
    // Busca por el super campo el producto
    $("#cadena").keyup(function (e) {
        var data2 = "";
        // RESET DE LOS BOTONES PARA EL TALLER
        if ($("#botonNuevo").length) {
            document.getElementById('botonNuevo').disabled = false;
            document.getElementById('botonUsado').disabled = false;
        };
        // CUANDO HAY QUE OCULTAR EL MODULO DE CARGA DEL CARRITO
        if ($("#espacio_carrito_carga").length) {
            $('#espacio_carrito_carga').attr("hidden", true);
        }
        $('#collapseProducto').collapse('hide');
        $('#lista_sugerencias').html(data2);
        var elementos = document.getElementById("form-producto").elements;
        for (var i = 0; i <= elementos.length - 1; i++) {
            if (elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'number' || elementos[i].type == 'select-one') {
                elementos[i].disabled = true;
            }
        }
        $('#boton-activar-editar-producto').text("Editar");
        if ($("#cadena").val().trim() != "") {
            $.post($SCRIPT_ROOT + '/inv', {
                "inv-accion": 3, // Producto
                "inv-accion2": 3, // Busqueda
                cadena: $("#cadena").val().trim()
            }, function (data) {
                $.each(data.resultado, function (index, info) {
                    var valores = "";
                    Object.getOwnPropertyNames(info).forEach(function (val, idx, array) {
                        valores += val + ":::" + info[val].toString().replace(/ /gi, "%%%").replace(/\n/gi, "-") + "&&&";
                    });
                    /* valores =  JSON.stringify(info);*/
                    data2 += '<a href="#" id="autocompletaProd" class="list-group-item list-group-item-action my-0 py-1 px-1" valores=' + valores + ' style="text-decoration:none"><div class="d-flex w-100 justify-content-between">' +
                        '<h3 class="text-primary" style="font-size:0.9rem"><b>' + info["producto"] + ' - ' + info["marca"] + ' - ' + info["modelo"] + '</b></h3><small class="text-muted"><b>' + info["id"] + '</b></small></div>' +
                        '<small class="text-muted style="font-size:0.95rem">' + info["descripcion"] + '</small></a>';
                    return (index !== 15);
                }, JSON);
                $('#lista_sugerencias').html(data2);
            });

        }
        return false;
    });

    // Al seleccionar un elemento en la lista de Lotes para ajustar
    $(document).on('click', '#id_lote_ajustar', function () {
        $('#modal-ajustar-lote-titulo').html('Ajustar Lote # ' + $(this).attr('dato-id'));
        $('#modal_id_lote_ajustar').val($(this).attr('dato-id'));
        document.getElementById('alerta-ajuste-lote').className = "text-danger p-3";
        document.getElementById("ajustar_unidades").style.backgroundColor = "#FFFFFF";
        document.getElementById("ajuste-justificacion").style.backgroundColor = "#FFFFFF";
        $("#alerta-ajuste-lote").css("display", "none");
        document.getElementById('ajustar_unidades').disabled = false;
        document.getElementById('ajuste_tipo').disabled = false;
        document.getElementById('ajuste-justificacion').disabled = false;
        document.getElementById('modal-ajustar-lote-confirmacion').hidden = false;
        $("#ajustar_unidades").val(1);
        $("#ajuste-justificacion").val("");
        $('#modal-ajustar-lote').modal('show');
    });

    // Al seleccionar un elemento en la lista de Productos
    $(document).on('click', '#autocompletaProd', function () {
        $("#alerta-producto").html("");
        $("#alerta-producto").css("display", "None");
        var elementos = document.getElementById("form-producto").elements;
        for (var i = 0; i <= elementos.length - 1; i++) {
            if (elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'number' || elementos[i].type == 'select-one') {
                elementos[i].disabled = true;
            }
        }
        $('#boton-activar-editar-producto').text("Editar");
        $("#tabla_lotes").html("");
        var contenido = ('{"' + $(this).attr('valores').replace(/%%%/gi, " ").replace(/&&&/gi, '","').replace(/:::/gi, '":"') + '}').replace('","}', '"}');
        var registro = JSON.parse(contenido);
        $('#lista_sugerencias').html("");
        $('#inv_img_thumb1').html("");
        $('#inv_img_thumb2').html("");
        $('#inv_img_thumb3').html("");
        $("#inv_img_clear_file1").css("display", "none");
        $("#inv_img_clear_file2").css("display", "none");
        $("#inv_img_clear_file3").css("display", "none");
        $('#codigo').val(registro["id"]);
        $('#nombre').val(registro["NOMBRE"]);
        $('#marca').val(registro["marca"]);
        $('#modelo').val(registro["modelo"]);
        $('#categoria').val(registro["id_categoria"]);
        $('#descripcion').val(registro["descripcion"]);
        $('#garantia').val(registro["garantia"]);
        $('#disponibilidad').val(registro["dias_estimados"]);
        $('#cabys').val(registro["cabys"]);
        // IMAGEN 1
        if (registro["img1"] != "0") {
            $.post($SCRIPT_ROOT + '/imagenes_inventario', {
                "tipo": 1, //
                "codigo_producto": registro["id"], //
                "n_imagen": 1,
                "extension": registro["img1"]
            }, function (datos) {
                var span = document.createElement('span');
                span.className = "imagen_inventario";
                span.innerHTML = datos;
                document.getElementById('inv_img_thumb1').appendChild(span);
            });
        }
        // IMAGEN 2
        if (registro["img2"] != "0") {
            $.post($SCRIPT_ROOT + '/imagenes_inventario', {
                "tipo": 1, //
                "codigo_producto": registro["id"], //
                "n_imagen": 2,
                "extension": registro["img2"]
            }, function (datos) {
                var span = document.createElement('span');
                span.className = "imagen_inventario";
                span.innerHTML = datos;
                document.getElementById('inv_img_thumb2').appendChild(span);
            });
        }
        // IMAGEN 3
        if (registro["img3"] != "0") {
            $.post($SCRIPT_ROOT + '/imagenes_inventario', {
                "tipo": 1, //
                "codigo_producto": registro["id"], //
                "n_imagen": 3,
                "extension": registro["img3"]
            }, function (datos) {
                var span = document.createElement('span');
                span.className = "imagen_inventario";
                span.innerHTML = datos;
                document.getElementById('inv_img_thumb3').appendChild(span);
            });
        }
        // CUANDO HAY QUE DESPLEGAR INFO DE LOTES
        if ($("#tabla_lotes").length) {
            display_lotes($("#codigo").val());
        }
        // LIMPIA DATOS DEL LOTE
        $("#lote_registrar").click();

        // CUANDO HAY QUE DESPLEGAR EL MODULO DE CARGA DEL CARRITO
        if ($("#espacio_carrito_carga").length) {
            // Para carga del estado del producto
            $.post($SCRIPT_ROOT + '/tnd', {
                "tienda-accion": 3, // consulta
                "codigo_producto": $("#codigo").val(), // Codigo
            }, function (data) {
                $('#lblDisponibilidadNueva').html('<b>' + data['unidades_nuevas'] + '</b>');
                $('#valorUnidadesNuevas').val(data['unidades_nuevas']);
                if (gl_tipo_precio==1) precioNuevo=data['precio_nuevo'];
                // if (gl_tipo_precio==2) precioNuevo=data['precio_nuevo_taller'];
                if (gl_tipo_precio==2) precioNuevo=data['precio_nuevo'];
                $('#lblPrecioNuevo').html("₡ " + toThousandComma(precioNuevo));
                $("#alertaNuevos").text("");
                $("#ubicacionNuevos").text(data['ubicacion_nuevos']);
                $("#ubicacionNuevos").css("visibility", "");
                if (data['precio_nuevo_taller']==0 && data['unidades_nuevas']>0) {
                    $("#alertaNuevos").html("Debe agregar el <b>Precio a Taller</b> en el lote más reciente de este producto.");
                    document.getElementById('botonNuevo').disabled = true;
                    $("#alertaNuevos").css("visibility", "");
                }
                $('#compraNuevos').val(1);
                
                $('#lblDisponibilidadUsada').html('<b>' + data['unidades_usadas'] + '</b>');
                $('#valorUnidadesUsadas').val(data['unidades_usadas']);
                if (gl_tipo_precio==1) precioUsado=data['precio_usado'];
                if (gl_tipo_precio==2) precioUsado=data['precio_usado'];
                $('#lblPrecioUsado').html("₡ " + toThousandComma(precioUsado));
                $('#compraUsados').val(1);
                $("#alertaUsados").text("");
                $("#ubicacionUsados").text(data['ubicacion_usados']);
                $("#ubicacionUsados").css("visibility", "");
                if (data['precio_usado_taller']==0 && data['unidades_usadas']>0) {
                    $("#alertaUsados").html("Debe agregar el <b>Precio a Taller</b> en el lote más reciente de este producto.");
                    document.getElementById('botonUsado').disabled = true;
                    $("#alertaUsados").css("visibility", "");
                }

            });
            $('#espacio_carrito_carga').removeAttr('hidden');
        }
        // CUANDO HAY QUE DESPLEGAR INFO DEL PRODUCTO (SOLO EN MODULO DE INVENTARIO O VENTA)
        if ($("#collapseProducto").length) {
            $('#collapseProducto').collapse('show');
        }

    });

    // Al dar click en las imagenes de Productos
    $(document).on('click', '.imagen_inventario', function () {
        // $('.inv_imagen_zoomer').remove();
        //var box = document.createElement("div"); // Create a <div> element
        //box.className = "inv_imagen_zoomer";
        //document.body.appendChild(box);
        $('.inv_imagen_zoomer').html($(this).html());
        $("#modal-inv-imagen").modal('show');
    });

    // Al dar click en el zoomer
    $(document).on('click', '.inv_imagen_zoomer', function () {
        $("#modal-inv-imagen").modal('hide');
        // $(this).remove();
    });

    function display_lotes(producto) {
        // EXTRAE LOS LOTES
        $.post($SCRIPT_ROOT + '/inv', {
            "inv-accion": 2, // Lote
            "inv-accion2": 2, // consulta de lotes para in producto
            codigo_producto: producto
        }, function (data) {
            if (data.resultado.length == 0) {
                valores = "Sin Lotes";
            } else {
                var valores = "<table><thead><tr>";
                Object.keys(data.resultado[0]).forEach(function (val, idx, array) {
                    if (val == "unidades") {
                        var extra = '<br><p style="font-size:.8rem">Disponibles / Lote</p>'
                        valores += "<th>" + capitalize(val) + extra + "</th>";
                    } else {
                        valores += "<th>" + capitalize(val) + "</th>";
                    }

                });
                valores += "</tr></thead>";
                valores += "<tbody>";
                $.each(data.resultado, function (index, info) {
                    valores += "<tr>";
                    lote = 0;
                    Object.keys(info).forEach(function (val, idx, array) {
                        if (val == "precio") {
                            valores += "<td>₡ " + toThousandComma(info[val]) + "</td>";
                        } else if (val == "lote") {
                            valores += "<td><b>" + info[val] + '</b><br><button type="button" class="btn btn-success btn-sm" id="id_lote_ver" dato-id=' + info[val] + '>VER</button>';
                            valores += '<button type="button" class="btn btn-danger btn-sm" id="id_lote_ajustar" dato-id=' + info[val] + '>AJUSTAR</button></td>';
                        } else {
                            valores += "<td>" + info[val] + "</td>";
                        }

                    });
                    valores += "</tr>";
                    return (index !== 15);
                }, JSON);
                valores += "</tbody></table";
            }
            $("#tabla_lotes").html(valores);
        });
    };



    // INPUT DE MONTO (CALCULAR COSTO UNITARIO y UTILIDAD)
    $("#monto_factura").on('input', function () {
        var utilidad = inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
    });

    // INPUT DE UNIDADES (CALCULAR COSTO UNITARIO y UTILIDAD)
    $("#unidades").on('input', function () {
        var utilidad = inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
    });

    // INPUT DE PRECIO (CALCULAR UTILIDAD)
    $("#precio").on('input', function () {
        var utilidad = inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
    });

    // INPUT DE FLETE (CALCULAR UTILIDAD)
    $("#flete").on('input', function () {
        var utilidad = inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
    });

    // INPUT DE ADUANA (CALCULAR UTILIDAD)
    $("#aduana").on('input', function () {
        var utilidad = inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
    });

    // estado del TIPO (CALCULAR UTILIDAD)
    $("#estado").on('input', function () {
        var utilidad = inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
    });

    // CHECK DE IMPUESTOSO INCLUIDOS (CALCULAR UTILIDAD)
    $(document).on('click', "#f_impuestos_incluidos", function (e) {
        var utilidad = inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
    });

    // validar ingreso del lote
    function lote_validar_ingreso() {
        // VALIDACIONES DE CAMPOS
        var campos_nulos = "";
        var campos_numericos_falla = "";
        var mensaje = "";
        $("#alerta-lote").css("display", "none");
        var elementos = document.getElementById("form-lote").elements;
        for (var i = 0; i <= elementos.length - 1; i++) {
            elementos[i].style.backgroundColor = "#FFFFFF";
        }
        for (var i = 0; i <= elementos.length - 1; i++) {
            if ((elementos[i].name == 'aduana' || elementos[i].name == 'flete') && (elementos[i].value == "" || elementos[i].value < 0)) {
                elementos[i].value = 0;
            }
            if ((elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'date' || elementos[i].type == 'number') && elementos[i].value == "" && elementos[i].id != 'fecha_ingreso' && elementos[i].id != 'username' && elementos[i].id != 'unidades_disponibles') {
                elementos[i].style.backgroundColor = "#FFCCCC";
                campos_nulos = campos_nulos + " " + elementos[i].name;
            }

            if ((elementos[i].type == 'number') && elementos[i].value <= 0 && !(elementos[i].name == 'aduana' || elementos[i].name == 'flete')) {
                elementos[i].style.backgroundColor = "#FFCCCC";
                campos_numericos_falla = campos_numericos_falla + " " + elementos[i].name;
            }

        }
        if (campos_nulos != "") {
            mensaje = "Los campos < <b>" + campos_nulos + "</b> > son obligatorios<br>";
        }
        if (campos_numericos_falla != "") {
            mensaje = mensaje + "Valores inválidos para < <b>" + campos_numericos_falla + " ></b>";
        }
        if (mensaje == "") {
            for (var i = 0; i <= elementos.length - 1; i++) {
                elementos[i].style.backgroundColor = "";
            }
        }
        return mensaje;
    }

    // VALIDA NUEVO LOTE
    $(document).on('click', "#crear-lote", function (e) {
        var mensaje = lote_validar_ingreso();
        if (mensaje != "") {
            $("#alerta-lote").html(mensaje);
            document.getElementById('alerta-lote').className = "text-danger p-3";
            $("#alerta-lote").css("display", "block");
        } else {
            $('#modal-mensaje-producto').html("Un nuevo lote pare el producto <b>" + $("#nombre").val().toUpperCase() + "</b> se agregará en el inventario.<br>¿Desea continuar?");
            $('#titulo_modal2').html("Creación de nuevo Lote");
            $('#current_inv_accion').val(2);
            $('#modal-confirmacion-producto').modal('show');
        }
    });


    // VALIDA AJUSTE
    $(document).on('click', "#modal-ajustar-lote-confirmacion", function (e) {
        // VALIDACIONES DE CAMPOS
        mensaje = "";
        document.getElementById('alerta-ajuste-lote').className = "text-danger p-3";
        document.getElementById("ajustar_unidades").style.backgroundColor = "#FFFFFF";
        document.getElementById("ajuste-justificacion").style.backgroundColor = "#FFFFFF";
        $("#alerta-ajuste-lote").css("display", "none");
        if ($('#ajustar_unidades').val() < 1) {
            document.getElementById("ajustar_unidades").style.backgroundColor = "#FFCCCC";
            mensaje = "Valor Inválido";
        }
        if ($('#ajuste-justificacion').val().length < 15) {
            document.getElementById("ajuste-justificacion").style.backgroundColor = "#FFCCCC";
            mensaje = mensaje + "<br>La justificación debe tener 15 o más caracteres.";
        }
        if (mensaje != "") {
            $("#alerta-ajuste-lote").html(mensaje);
            $("#alerta-ajuste-lote").css("display", "block");
        } else {
            $.post($SCRIPT_ROOT + '/inv', {
                "inv-accion": 2, // Lote
                "inv-accion2": 4, // Ajuste (incluyendo validacion)
                codigo_lote: $("#modal_id_lote_ajustar").val(),
                unidades: $("#ajustar_unidades").val(),
                tipo_ajuste: $("#ajuste_tipo").val(),
                comentario: $("#ajuste-justificacion").val(),
            }, function (data) {
                if (data == "NOT-ENOUGH") {
                    $("#alerta-ajuste-lote").html("La cantidad de Unidades a Ajustar es mayor a la cantidad de unidades disponibles en el lote<br>Por favor, revíselo.");
                    $("#alerta-ajuste-lote").css("display", "block");
                } else if (data == "TOO-MUCH") {
                    $("#alerta-ajuste-lote").html("La cantidad de Unidades a Ajustar es mayor a la cantidad de unidades originales en el lote<br>Por favor, revíselo.");
                    $("#alerta-ajuste-lote").css("display", "block");
                } else if (data == "OK") {
                    document.getElementById('alerta-ajuste-lote').className = "text-success p-3";
                    document.getElementById('ajustar_unidades').disabled = true;
                    document.getElementById('ajuste_tipo').disabled = true;
                    document.getElementById('ajuste-justificacion').disabled = true;
                    $("#alerta-ajuste-lote").html("El lote #" + $("#modal_id_lote_ajustar").val() + " fue ajustado satisfactoriamente en " + $("#ajustar_unidades").val() + " unidades.");
                    $("#alerta-ajuste-lote").css("display", "block");
                    document.getElementById('modal-ajustar-lote-confirmacion').hidden = true;
                    display_lotes($("#codigo").val());
                } else {
                    $("#alerta-ajuste-lote").html("Hubo un error en el ajuste. Por favor repórtelo al administrador.");
                    $("#alerta-ajuste-lote").css("display", "block");
                }
            });
        }
    });

    // BLUR DE VALIDACION AJUSTE LOTE
    $(document).on('blur', "#modal-ajustar-lote-confirmacion", function (e) {
        document.getElementById("ajustar_unidades").style.backgroundColor = "#FFFFFF";
        document.getElementById("ajuste-justificacion").style.backgroundColor = "#FFFFFF";
    });

    var gl_id_lote = 0;  // 
    function lote_ver(id_lote) {
        $.post($SCRIPT_ROOT + '/inv', {
            "inv-accion": 2, // Lote
            "inv-accion2": 5, // Consulta
            "id_lote": id_lote, //Codigo de lote
        }, function (datos) {
            var elementos = document.getElementById("form-lote").elements;
            for (var i = 0; i <= elementos.length - 1; i++) {
                if (elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'date' || elementos[i].type == 'number' || elementos[i].type == 'select-one' || elementos[i].type == 'checkbox') {
                    elementos[i].disabled = true;
                    elementos[i].value = datos.resultado[elementos[i].id]
                    elementos[i].style.backgroundColor = "";
                }
            }
            if (datos.resultado["f_impuestos_incluidos"] == '1') {
                $("#f_impuestos_incluidos").prop("checked", true);

            } else {
                $("#f_impuestos_incluidos").prop("checked", false);
            }
            document.getElementById('btn-buscarFacturaMaestra').hidden = true;
            gl_pct_descuento = datos.resultado["pct_descuento"];
            $("#lbl-inv-descuento").html("Desc <b>" + Math.round(gl_pct_descuento * 10000) / 100 + "%</b>");
            inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
            document.getElementById('inv_editar_lote_campos').hidden = false;
            $("#lbl-principal-lote").html("Código de Lote: " + id_lote);
            gl_id_lote = id_lote;
        });

    };

    // link Registrar LOTE 
    $(document).on('click', '#lote_registrar', function () {
        var elementos = document.getElementById("form-lote").elements;
        for (var i = 0; i <= elementos.length - 1; i++) {
            if (elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'date' || elementos[i].type == 'number' || elementos[i].type == 'select-one' || elementos[i].type == 'checkbox') {
                if (elementos[i].id != "monto_factura") {
                    elementos[i].disabled = false;
                }
                elementos[i].value = "";
            }
        }
        document.getElementById('btn-buscarFacturaMaestra').hidden = false;
        inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
        document.getElementById('inv_editar_lote_campos').hidden = true;
        $("#lbl-principal-lote").html("Registrar Nuevo de Lote");
        if ($('#collapseRegLote').attr("aria-expanded") == "False") {
            $('#collapseRegLote').collapse('toggle');
            $('#collapseRegLote').attr("aria-expanded", "True");
        }
        // DATOS DEL ULTIMO LOTE INGRESADO POR EL USUARIO
        $.post($SCRIPT_ROOT + '/inv', {
            "inv-accion": 2, // Lote
            "inv-accion2": 9, // Ultimo lote ingresado
        }, function (datos) {
            if (datos.estado == "OK") {
                gl_pct_descuento = datos.resultado["pct_descuento"];
                $("#lbl-inv-descuento").html("Desc <b>" + Math.round(gl_pct_descuento * 100000) / 1000 + "%</b>");
                $("#factura").val(datos.resultado["factura"]);
                $("#proveedor").val(datos.resultado["proveedor"]);
                inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
            }
        });
        document.getElementById('btn-editar-lote').hidden = true;
        document.getElementById('crear-lote').hidden = false;
    });


    // BOTON VER LOTE 
    $(document).on('click', '#id_lote_ver', function () {
        lote_ver($(this).attr('dato-id'));
        if ($('#collapseRegLote').attr("aria-expanded") == "False") {
            $('#collapseRegLote').collapse('toggle');
            $('#collapseRegLote').attr("aria-expanded", "True");
        }
        document.getElementById('btn-editar-lote').hidden = false;
        document.getElementById('crear-lote').hidden = true;
        document.getElementById('btn-buscarFacturaMaestra').hidden = true;
        $('#btn-editar-lote').attr('class', 'btn btn-primary');
        $('#btn-editar-lote').text('Editar Lote');
        $('#btn-editar-lote').attr('estado', 0);
    });

    // BOTON EDITAR LOTE 
    $(document).on('click', '#btn-editar-lote', function () {
        // Activa edicion
        if ($(this).attr('estado') == 0) {
            $(this).attr('class', 'btn btn-success');
            $(this).text('Guardar Lote');
            $(this).attr('estado', 1);
            var elementos = document.getElementById("form-lote").elements;
            for (var i = 0; i <= elementos.length - 1; i++) {
                if ((elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'date' || elementos[i].type == 'number' || elementos[i].type == 'select-one' || elementos[i].type == 'checkbox')
                    && !(elementos[i].id == "fecha_ingreso" || elementos[i].id == "username" || elementos[i].id == "unidades_disponibles" || elementos[i].id == "unidades" || elementos[i].id == "estado" || elementos[i].id == "monto_factura")) {
                    elementos[i].disabled = false;
                }
            }
            document.getElementById('btn-buscarFacturaMaestra').hidden = false;
        }
        else if ($(this).attr('estado') == 1) { // Guardar cambios
            var mensaje = lote_validar_ingreso();
            if (mensaje != "") {
                $("#alerta-lote").html(mensaje);
                document.getElementById('alerta-lote').className = "text-danger p-3";
                $("#alerta-lote").css("display", "block");
            } else {
                var f_impuestos_incluidos = 0;
                if (document.getElementById("f_impuestos_incluidos").checked == true) {
                    f_impuestos_incluidos = 1;
                }
                $.post($SCRIPT_ROOT + '/inv', {
                    "inv-accion": 2, // Lote
                    "inv-accion2": 6, // Actualizar
                    factura: $('#factura').val(),
                    monto_factura: $('#monto_factura').val(),
                    fecha_factura: $('#fecha_factura').val(),
                    proveedor: $('#proveedor').val(),
                    ubicacion: $('#ubicacion').val(),
                    flete: $('#flete').val(),
                    aduana: $('#aduana').val(),
                    costo_unitario: $('#costo_unitario').val(),
                    precio_venta: $('#precio').val(),
                    id_lote: gl_id_lote,
                    "f_impuestos_incluidos": f_impuestos_incluidos,
                    precio_a_taller: $('#precio_a_taller').val(),
                }, function (data) {
                    if (data == "OK") {
                        document.getElementById('alerta-lote').className = "text-success p-3";
                        $("#alerta-lote").html("El lote fue actualizado satisfactoriamente para el producto <b>" + $('#nombre').val());
                        $("#alerta-lote").css("display", "block");
                        var elementos = document.getElementById("form-lote").elements;
                        for (var i = 0; i <= elementos.length - 1; i++) {
                            if (elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'date' || elementos[i].type == 'number' || elementos[i].type == 'select-one' || elementos[i].type == 'checkbox') {
                                elementos[i].disabled = true;
                            }
                        }
                        $('#btn-editar-lote').attr('class', 'btn btn-primary');
                        $('#btn-editar-lote').text('Editar Lote');
                        $('#btn-editar-lote').attr('estado', 0);
                        display_lotes($("#codigo").val());
                    }
                    else if (data == "NO-PROVEEDOR") {
                        $('#modal-ingreso-elemento-header').text("Nuevo Proveedor detectado!");
                        $('#modal-ingreso-elemento-label').html("La proveedor <b>" + $('#proveedor').val().toUpperCase() + "</b> no se encuentra en el Catálogo de Proveedores de esta KAPP.<br><br>¿Desea agregarlo?");
                        $('#modal-ingreso-elemento-accion').val('proveedor');
                        $('#modal-ingreso-elemento-valor').val($('#proveedor').val());
                        $('#modal-ingreso-elemento').modal('show');
                    }
                })
            }
        }
    });

    // CUANDO SE PRESIONA EL BOTON DE ENVIAR AL CARRITO / BOLETA UN PRODUCTO NUEVO 
    $(document).on('click', '#botonNuevo', function () {
        var mensaje = "";
        $("#alertaNuevos").css("visibility", "hidden");
        if ($("#compraNuevos").val() - $("#valorUnidadesNuevas").val() >= 1) {
            mensaje = "Disponibilidad Insuficiente";
        }
        if ($("#compraNuevos").val() > 300) {
            mensaje = "Máximo 300";
        }
        if ($("#compraNuevos").val() < 1) {
            mensaje = "Mínimo 1";
        }

        if (mensaje != "") {
            $("#alertaNuevos").text(mensaje);
            $("#alertaNuevos").css("visibility", "visible");
        } else {
            // Para carga del carrito
            if ($('#botonNuevoIimg').length) {
                repuesto_boleta = 0;
                id_boleta = 0;
                $('#espacio_carrito').html("");
            } else {
                repuesto_boleta = 1;
                id_boleta = $('#id-boleta-interna').val();
            }
            $.post($SCRIPT_ROOT + '/tnd', {
                "tienda-accion": 5, // Ingreso al carrito / o Boleta
                "codigo_producto": $('#codigo').val(),
                "unidades": $('#compraNuevos').val(),
                "estado": 1, // Estado Producto (1=NUEVO,2=USADO)
                "repuesto_boleta": repuesto_boleta, // Adiciona repuesto a boleta
                "id_boleta": id_boleta //Codigo de boleta (cuando aplica)
            }, function (datos) {
                if ($('#botonNuevoIimg').length) {
                    $('#espacio_carrito').html(datos);
                } else {
                    if (datos == "OK") {
                        $('#modal-repuesto-inventario').modal('hide');
                        $('#id-boleta-i').val($('#id-boleta-interna').val());
                        $('#tipo-display-i').val(5); // VISUALIZAR 
                        document.getElementById("form-buscar-boleta-i").submit();
                    }
                    if (datos.resultado == 'NOT-ENOUGH') {
                        $('#modal-notificacion-titulo').html("Notificación de disponibilidad en el Inventario para el producto seleccionado");
                        $('#modal-notificacion-mensaje').html("<b>No es posible agregar este producto a la boleta</b><br><br>No hay disponibilidad suficiente para su solicitud.<br>Por favor revíselo.");
                        $('#modal-notificacion').modal('show');
                    }
                }
            });
        }
    });


    // CUANDO SE PRESIONA EL BOTON DE ENVIAR AL CARRITO / BOLETA UN PRODUCTO USADO 
    $(document).on('click', '#botonUsado', function () {
        var mensaje = "";
        $("#alertaUsados").css("visibility", "hidden");
        if ($("#compraUsados").val() - $("#valorUnidadesUsadas").val() >= 1) {
            mensaje = "Disponibilidad Insuficiente";
        }
        if ($("#compraUsados").val() > 300) {
            mensaje = "Máximo 300";
        }
        if ($("#compraUsados").val() < 1) {
            mensaje = "Mínimo 1";
        }

        if (mensaje != "") {
            $("#alertaUsados").text(mensaje);
            $("#alertaUsados").css("visibility", "visible");
        } else {
            // Para carga del carrito
            if ($('#botonUsadoIimg').length) {
                repuesto_boleta = 0;
                id_boleta = 0;
                $('#espacio_carrito').html("");
            } else {
                repuesto_boleta = 1;
                id_boleta = $('#id-boleta-interna').val();
            }
            $.post($SCRIPT_ROOT + '/tnd', {
                "tienda-accion": 5, // Ingreso al carrito / o Boleta
                "codigo_producto": $('#codigo').val(),
                "unidades": $('#compraUsados').val(),
                "estado": 2, // Estado Producto (1=NUEVO,2=USADO)
                "repuesto_boleta": repuesto_boleta, // Adiciona repuesto a boleta
                "id_boleta": id_boleta //Codigo de boleta (cuando aplica)
            }, function (datos) {
                if ($('#botonUsadoIimg').length) {
                    $('#espacio_carrito').html(datos);
                } else {
                    if (datos == "OK") {
                        $('#modal-repuesto-inventario').modal('hide');
                        $('#id-boleta-i').val($('#id-boleta-interna').val());
                        $('#tipo-display-i').val(5); // VISUALIZAR 
                        document.getElementById("form-buscar-boleta-i").submit();
                    }
                    if (datos.resultado == 'NOT-ENOUGH') {
                        $('#modal-notificacion-titulo').html("Notificación de disponibilidad en el Inventario para el producto seleccionado");
                        $('#modal-notificacion-mensaje').html("<b>No es posible agregar este producto a la boleta</b><br><br>No hay disponibilidad suficiente para su solicitud.<br>Por favor revíselo.");
                        $('#modal-notificacion').modal('show');
                    }
                }
            });
        }
    });


    // CONFIRMAR VACIAR CARRITO
    $(document).on('click', '#btn-limpiarCarritoConfirmacion', function () {

        $.post($SCRIPT_ROOT + '/tnd', {
            "tienda-accion": 6, // Limpiar al carrito
        }, function (datos) {
            $('#modal-limpiarCarrito').modal('hide');
            $('#espacio_carrito').html(datos);
        });

    });

    // Al seleccionar un elemento en la lista del carrito para Borrar
    $(document).on('click', '#elementoCarrito', function () {
        $('#modal-eliminarECarrito-mensaje').html('¿Desea eliminar el producto ' + $(this).attr('elemento_nombre') + ' ' + $(this).attr('elemento_estado') + "?");
        $('#eliminar-producto-id').val($(this).attr('elemento_codigo'));
        $('#eliminar-producto-estado').val($(this).attr('elemento_estado'));
        $('#modal-eliminarECarrito').modal('show');
    });

    // BOTON PARA CONFIRMAR ELIMINAR 
    $(document).on('click', '#btn-eliminarECarrito-Confirmacion', function () {
        $.post($SCRIPT_ROOT + '/tnd', {
            "tienda-accion": 7, // Limpiar al carrito
            "codigo_producto": $('#eliminar-producto-id').val(),
            "estado_producto": $('#eliminar-producto-estado').val(),
        }, function (datos) {
            $('#espacio_carrito').html(datos);
            $('#modal-eliminarECarrito').modal('hide');
        });
    });

    // BOTON PARA CONFIRMAR CLIENTE EN VENTA
    $(document).on('click', '#btn-confirmacion-venta-cliente', function () {
        $("#collapseOpcionesRecibo").collapse('hide');
        tienda_saldo_pagos(1);
        $.post($SCRIPT_ROOT + '/tnd', {
            "tienda-accion": 8, // Mostrar Recibo
        }, function (datos) {
            $('#espacio_carrito_recibo').html(datos);
            $('#info_cliente_recibo_tienda').html("A nombre de: <b>" + $("#nombres").val() + " " + $("#apellidos").val() + " [" + $("#documento").val() + "]");
        });
        $('#modal-generar-recibo').modal('show');
    });



    // BOTON PARA CONFIRMAR VENTA 
    $(document).on('click', '#btn-modal-confirmacion-venta', function () {
        $.post($SCRIPT_ROOT + '/tnd', {
            "tienda-accion": 4, // GENERAR RECIBO
            "id_cliente": $("#codigo-cliente").val(),
        }, function (datos) {
            if (datos.resultado == "OK") {
                tienda_saldo_pagos(1);
                $('#espacio_carrito').html(datos.carrito);
                $('#collapseOpcionesRecibo').html(datos.botones);
                $('#alerta-ok-venta').html("Venta Registrada!");
                $('#modal-confirmacion-venta-cliente').modal('hide');
                $("#collapsePago").collapse('hide');
                $("#confirmar-venta-boton").collapse('hide');
                document.getElementById('boton-pago-tienda').disabled = true;
                $("#collapseOpcionesRecibo").collapse('show');
            }
        });
    });



    // BOTON EDITAR PRODUCTO - ACTIVA CAMBIOS
    $(document).on('click', '#boton-activar-editar-producto', function () {
        if ($(this).text() == "Editar") {
            var elementos = document.getElementById("form-producto").elements;
            for (var i = 0; i <= elementos.length - 1; i++) {
                if ((elementos[i].type == 'text' || elementos[i].type == 'textarea' || elementos[i].type == 'number' || elementos[i].type == 'select-one') && elementos[i].name != 'codigo') {
                    elementos[i].disabled = false;
                    elementos[i].style.backgroundColor = "#EFF6FA";
                }
                $("#nombre").focus();
            }
            if ($("#inv_img_thumb1").html() != "") {
                $("#inv_img_clear_file1").css("display", "");
            } else {
                $("#inv_img_file1").css("display", "");
            }
            if ($("#inv_img_thumb2").html() != "") {
                $("#inv_img_clear_file2").css("display", "");
            } else {
                $("#inv_img_file2").css("display", "");
            }
            if ($("#inv_img_thumb3").html() != "") {
                $("#inv_img_clear_file3").css("display", "");
            } else {
                $("#inv_img_file3").css("display", "");
            }
            $(this).text("Guardar");
        } else if ($(this).text() == "Guardar") {
            crud_producto(2);
        }
    });

    // BOTON PARA CONFIRMAR PAGO 
    $(document).on('click', '#boton-pago-tienda', function () {
        tipo_pago = document.querySelector('input[name="tipo_pago"]:checked').value;
        if (tipo_pago == 1) { tipo_pago = "Efectivo" }
        if (tipo_pago == 2) { tipo_pago = "Tarjeta (Crédito/Débito)" }
        if (tipo_pago == 3) { tipo_pago = "Transferecia" }
        $("#modal-tienda-pago-confirmacion").html("¿Desea confirmar el pago con <b>" + tipo_pago + "</b> de <b>₡" + toThousandComma($("#monto-p").val()) + "</b>?");
        $('#pagoTiendaModal').modal('show');
    });

    // BOTON REGISTRAR PAGO TIENDA
    $(document).on('click', "#boton-confirmar-tienda-pago", function (e) {
        $.post($SCRIPT_ROOT + '/tnd', {
            "tienda-accion": 10, // PAGO
            monto: $('#monto-p').val(),
            medio: document.querySelector('input[name="tipo_pago"]:checked').value // MEDIO
        }, function () {
            tienda_saldo_pagos(1);
            $('#pagoTiendaModal').modal('hide');
        });
    });

    // BOTON ACTIVA MODAL ANULAR PAGO 
    $(document).on('click', '#id-pago-venta', function () {
        $("#id-pago-anular").val($(this).attr('dato-id'));
        $('#pagoTiendaModal-anular').modal('show');
    });

    // BOTON CONFIRMAR MODAL ANULAR PAGO 
    $(document).on('click', '#boton-confirmar-tienda-pago-anular', function () {
        $.post($SCRIPT_ROOT + '/tnd', {
            "tienda-accion": 11, // ANULAR PAGO
            id_pago: $("#id-pago-anular").val()
        }, function () {
            tienda_saldo_pagos(1);
            $('#pagoTiendaModal-anular').modal('hide');
        });
    });

    var gl_id_factura_maestra = 0;
    // FACTURA MAESTRA
    $("#btn-buscarFacturaMaestra").click(function () {
        if (gl_id_factura_maestra == 0) {
            $('#modal-facturaMaestra').modal('show');
        }

    });

    var gl_pct_descuento = 0;
    // fm_monto
    $("#fm_monto_factura").keyup(function () {
        if ($("#fm_monto_factura").val() > 0 && $("#fm_descuento_factura").val() > 0) {
            gl_pct_descuento = $("#fm_descuento_factura").val() / $("#fm_monto_factura").val();
        } else {
            gl_pct_descuento = 0;
        }
        $("#fm_calculos").html("Pocentaje de descuento: " + Math.round(gl_pct_descuento * 100000) / 1000 + "%");
    });
    // fmd_descuento
    $("#fm_descuento_factura").keyup(function () {
        if ($("#fm_monto_factura").val() > 0 && $("#fm_descuento_factura").val() > 0) {
            gl_pct_descuento = $("#fm_descuento_factura").val() / $("#fm_monto_factura").val();
        } else {
            gl_pct_descuento = 0;
        }
        document.getElementById('fm_calculos').className = "text-primary";
        $("#fm_calculos").html("Pocentaje de descuento: <b>" + Math.round(gl_pct_descuento * 100000) / 1000 + "%</b>");
    });

    // FACTURA MAESTRA
    $("#boton-confirmar-factura-maestra").click(function () {
        var mensaje = "";
        if ($("#fm_descuento_factura").val() < 0) {
            mensaje = "El Monto del descuento es inválido";
        }
        if ($("#fm_monto_factura").val() <= 0) {
            mensaje = "El Monto de la factura es inválido";
        }
        if ($("#fm_factura").val().length == 0 || $("#fm_factura").val() <= 0) {
            mensaje = "El número de factura es inválido";
        }
        if ($("#fm_proveedor").val().length == 0) {
            mensaje = "Debe ingresar un proveedor para Guarda/Actualizar la Factura Maestra";
        }
        if (mensaje != "") {
            document.getElementById('fm_calculos').className = "text-danger ";
            $("#fm_calculos").html(mensaje);
        }
        else {
            fm_guardar_actualizar();
            fn_calculo_factura_descuento();
            inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
        }
    });

    // PROCESO BUSCA FACTURA MAESTRA
    function fm_busqueda() {
        if ($("#factura").val() != "" && $("#proveedor").val() != "") {
            $.post($SCRIPT_ROOT + '/inv', {
                "inv-accion": 2, // LOTE
                "inv-accion2": 7, // CONSULTA FACTURA MAESTRA
                factura: $("#factura").val(),
                proveedor: $("#proveedor").val()
            }, function (respuesta) {
                if (respuesta.resultado == "OK") {
                    gl_pct_descuento = respuesta.datos.descuento / respuesta.datos.monto;
                    $("#lbl-inv-descuento").html("Desc <b>" + Math.round(gl_pct_descuento * 100000) / 1000 + "%</b>");
                    $("#fm_proveedor").val($("#proveedor").val());
                    $("#fm_factura").val($("#factura").val());
                    $("#fm_monto_factura").val(respuesta.datos.monto);
                    $("#fm_descuento_factura").val(respuesta.datos.descuento);
                    $("#fm_calculos").html("Pocentaje de descuento: <b>" + Math.round(gl_pct_descuento * 100000) / 1000 + "%</b>");

                } else {
                    gl_pct_descuento = 0;
                    $("#lbl-inv-descuento").html("Desc <b>0%</b>");
                    $("#fm_proveedor").val($("#proveedor").val());
                    $("#fm_factura").val($("#factura").val());
                    $("#fm_monto_factura").val(0);
                    $("#fm_descuento_factura").val(0);
                    $("#fm_calculos").html("Pocentaje de descuento: <b>0%</b>");
                }
                fn_calculo_factura_descuento();
                inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
            });

        }
    }

    // PROCESO BUSCA FACTURA MAESTRA
    function fm_guardar_actualizar() {
        $.post($SCRIPT_ROOT + '/inv', {
            "inv-accion": 2, // LOTE
            "inv-accion2": 8, // GUARDAR/ACTUALIZAR FACTURA MAESTRA
            factura: $("#fm_factura").val(),
            proveedor: $("#fm_proveedor").val(),
            monto: $("#fm_monto_factura").val(),
            descuento: $("#fm_descuento_factura").val()
        }, function (respuesta) {
            if (respuesta == "FACTURA-INGRESADA" || respuesta == "FACTURA-ACTUALIZADA") {
                if (respuesta == "FACTURA-ACTUALIZADA") {
                    $("#modalNotificacion-mensaje").html("La factura ha sido actualizada!");
                }
                else {
                    $("#modalNotificacion-mensaje").html("La factura ha sido ingresada!");
                }
                $("#modalNotificacion").modal("show");
                document.getElementById("modalNotificacion-imagen1").hidden = false;
                gl_pct_descuento = $("#fm_descuento_factura").val() / $("#fm_monto_factura").val();
                $("#lbl-inv-descuento").html("Desc <b>" + Math.round(gl_pct_descuento * 100000) / 1000 + "%</b>");
                $("#fm_calculos").html("Pocentaje de descuento: <b>" + Math.round(gl_pct_descuento * 100000) / 1000 + "%</b>");
                $("#proveedor").val($("#fm_proveedor").val());
                $("#factura").val($("#fm_factura").val());
                $("#modal-facturaMaestra").modal("hide");
            } else if (respuesta == "NO-PROVEEDOR") {
                $('#modal-ingreso-elemento-header').text("Nuevo Proveedor detectado!");
                $('#modal-ingreso-elemento-label').html("La proveedor <b>" + $('#fm_proveedor').val().toUpperCase() + "</b> no se encuentra en el Catálogo de Proveedores de esta KAPP.<br><br>¿Desea agregarlo?");
                $('#modal-ingreso-elemento-accion').val('proveedor');
                $('#modal-ingreso-elemento-valor').val($('#fm_proveedor').val());
                $('#modal-ingreso-elemento').modal('show');
            }
        });

    }


    // BLUR DE INPUT FACTURA - FACTURA MAESTRA
    $(document).on('blur', "#factura", function (e) {
        fm_busqueda();
    });

    // BLUR DE INPUT PROVEEDOR - FACTURA MAESTRA
    $(document).on('blur', "#proveedor", function (e) {
        fm_busqueda();
    });

    // CAMBIO EN EL MONTO DE LA FACTURA PARA APLICAR DESCUENTO
    $("#monto_factura_sin_descuento").keyup(function (e) {
        fn_calculo_factura_descuento();
        inv_utilidad($("#monto_factura").val(), $("#unidades").val(), $('#estado').val(), $('#flete').val(), $('#aduana').val(), $("#precio").val());
    });

    function fn_calculo_factura_descuento() {
        var monto = $("#monto_factura_sin_descuento").val() - $("#monto_factura_sin_descuento").val() * gl_pct_descuento;
        monto = Math.round(monto * 1000) / 1000;
        $("#monto_factura").val(monto);
    }

    // FUNCION PARA CARGAR LA IMAGEN AL SERVIDOR
    function inv_cargar_imagen(n_imagen) {
        var datos = new FormData();
        datos.append("codigo_producto", $("#codigo").val());
        datos.append("tipo", 2);
        datos.append("n_imagen", n_imagen);
        datos.append('imagen', $('#inv_file' + n_imagen)[0].files[0]);
        $.ajax({
            type: "POST",
            enctype: 'multipart/form-data',
            url: $SCRIPT_ROOT + '/imagenes_inventario',
            data: datos,
            processData: false,
            contentType: false,
            cache: false,
            success: function (respuesta) {
            },
        });
    };



    // MANEJO DE ARCHIVOS 2
    function inv_img_show(event, n_img) {
        inv_cargar_imagen(n_img);
        var files = event.target.files; // FileList object
        if (files[0].type.match('image.*')) {
            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function (theFile) {
                return function (e) {

                    // Render thumbnail.
                    var span = document.createElement('span');
                    span.innerHTML = ['<img class="thumb" src="', e.target.result,
                        '" title="', escape(theFile.name), '"/>'
                    ].join('');
                    //$("#inv_file" + n_img).html("");
                    $("#inv_img_file" + n_img).css("display", "none");
                    $("#inv_img_clear_file" + n_img).css("display", "");
                    document.getElementById("inv_img_thumb" + n_img).insertBefore(span, null);

                };
            })
                (files[0]);

            // Read in the image file as a data URL.
            reader.readAsDataURL(files[0]);
        }
    };

    // Limpiar Archivos 
    function inv_img_clear_file(n_img) {
        $("#inv_file" + n_img).val("");
        $("#inv_img_thumb" + n_img).html("");
        $("#inv_img_file" + n_img).css("display", "");
        $("#inv_img_clear_file" + n_img).css("display", "none");
        // QUITANDO IMAGEN EN LA BASE
        $.post($SCRIPT_ROOT + '/imagenes_inventario', {
            "tipo": 3, // ELIMINAR IMAGEN DE LA BASE
            "codigo_producto": $("#codigo").val(),
            "n_imagen": n_img,
        }, function (respuesta) {

        })
    };

    document.getElementById('inv_file1').addEventListener('change', function () { inv_img_show(event, 1) }, false);
    document.getElementById('inv_file2').addEventListener('change', function () { inv_img_show(event, 2) }, false);
    document.getElementById('inv_file3').addEventListener('change', function () { inv_img_show(event, 3) }, false);

    document.getElementById('inv_img_clear_file1').addEventListener('click', function () { inv_img_clear_file(1) }, false);
    document.getElementById('inv_img_clear_file2').addEventListener('click', function () { inv_img_clear_file(2) }, false);
    document.getElementById('inv_img_clear_file3').addEventListener('click', function () { inv_img_clear_file(3) }, false);

    // TIPO DE PRECIO A MOSTRAR
    $("#btn-repuestos-inventario-modal").click((e) => {
        gl_tipo_precio = 2;
    });


});