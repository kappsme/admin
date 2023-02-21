$(document).ready(function () {

    function hoy() {
        var today = new Date();
        var day = today.getDate();
        var month = today.getMonth() + 1;
        var year = today.getFullYear();
        if (day < 10)
            day = '0' + day; //agrega cero si el menor de 10
        if (month < 10)
            month = '0' + month //agrega cero si el menor de 10
        return `${year}-${month}-${day}`;
    }



    // BOTON CONFIRMAR MODAL-CRUD-USER
    $('#modal-crud-kapp-btn').click(function (event) {
        var pl = $('#modal-crud-kapp-datos').val();
        $.post($SCRIPT_ROOT + '/crud_kapp', {
            parametro: pl
        }
            , function (rpl) {
                location.reload();
            }, "json");
    });

    // BOTON EDITAR KAPP
    $(document).on('click', '#btn-editar-kapp', function () {
        var id = $(this).attr('data-id-kapp')
        document.getElementById("kapp-" + id + "-nombre").disabled = false;
        document.getElementById("kapp-" + id + "-estado").disabled = false;
        document.getElementById("kapp-" + id + "-fecha-cobro").disabled = false;
        document.getElementById("kapp-" + id + "-licencias").disabled = false;
        document.getElementById("kapp-" + id + "-div-editar").hidden = true;
        document.getElementById("kapp-" + id + "-div-guardar").hidden = false;
        $("#kapp-" + id + "-estado").trigger("chosen:updated");
    });

    // BOTON GUARDAR KAPP
    $(document).on('click', '#btn-guardar-kapp', function () {
        var id = $(this).attr('data-id-kapp')
        $("#modal-crud-kapp-titulo").text("Guardar KAPP");
        document.getElementById("modal-crud-kapp-btn").hidden = false;

        if ($('#kapp-' + id + '-nombre').val().length <= 5) {
            document.getElementById("modal-crud-kapp-btn").hidden = true;
            $("#modal-crud-kapp-body").html('El nombre de Cliente para la KAPP debe ser mayor a 5 Caracteres');
            $('#modal-crud-kapp').modal('show');
        } else {
            var desactivacion = "", suspension = "";
            if ($('#kapp-' + id + '-estado').val() == "INACTIVE") {
                desactivacion = "<br><br>La KAPP se desactivará. Ningún usuario tendrá acceso.<br><br>¿Desea proceder?";
            }
            if ($('#kapp-' + id + '-estado').val() == "BLOCKED") {
                suspension = "<br><br>La KAPP se suspenderá. Ningún usuario tendrá acceso.<br><br>¿Desea proceder?";
            }
            var bloqueo = 0;
            var datos = JSON.stringify({ accion: '0', kapp_id: id, nombre: $('#kapp-' + id + '-nombre').val(), estado: $('#kapp-' + id + '-estado').val(), fecha_cobro: $('#kapp-' + id + '-fecha-cobro').val(), licencias: $('#kapp-' + id + '-licencias').val() });

            $("#modal-crud-kapp-body").html("La KAPP <em>" + $(this).attr('data-id-kapp') + "</em> será modificada." + desactivacion + "<br><br>¿Desea continuar?");
            // $('#modal-crud-kapp-id').val($(this).attr('data-id-kapp'));
            $("#modal-crud-kapp-accion").val(0); // GUARDAR KAPP
            $('#modal-crud-kapp-datos').val(datos);
            $('#modal-crud-kapp').modal('show');
        };
    });


    // BOTON REGISTRAR PAGO 
    $(document).on('click', '#modal-kapp-pago-btn-guardar', function () {
        this.disabled = true;
        $(this).text("Espere...");
        var pl = JSON.stringify({ accion: '2', kapp_id: id, nombre: $('#kapp-' + id + '-nombre').val(), estado: $('#kapp-' + id + '-estado').val(), fecha_cobro: $('#kapp-' + id + '-fecha-cobro').val(), licencias: $('#kapp-' + id + '-licencias').val() });

        $.post($SCRIPT_ROOT + '/crud_kapp', {
            parametro: pl
        }
            , function (rpl) {
                location.reload();
            }, "json");
        new Promise((resolve, reject) => {
            $.post($SCRIPT_ROOT + '/crud_kapp', {
                accion: 4, // ACTIVAR USUARIO
                id_usuario: $(this).attr('id-usuario'),
            }, function (datos) {
                resolve(datos)
            })
        }).then((datos) => {
            if (datos.substr(0, 15) == '<!DOCTYPE html>') {
                document.write(datos);
            }
            if (datos == "OK") {
                $("#btn-usuarios-admin").click();
            }
            if (datos == "NO-DISPONIBILIDAD") {
                this.disabled = false;
                $(this).text("Activar");
                $('#modal-notificacion-titulo').html("Notificación de Usuarios");
                $('#modal-notificacion-mensaje').html("<b>No es posible activar este usuario<br><br>Ya se está utilizando la cantidad de licencias contratadas</b>");
                $('#modal-notificacion').modal('show');
            }
        });
    });


    // BOTON CREAR USUARIO - CLICK
    $(document).on('click', '#btn-kapp-registrar-pago', function () {
        // VALIDA VALORES EN LOS CAMPOS
        $("#modal-kapp-pago-periodo").val("");
        $("#modal-kapp-pago-monto").val("");
        var fecha = document.querySelector("#modal-kapp-pago-fecha");
        fecha.value = "";
        $('#modal-kapp-pago').modal('show');
        var pl = JSON.stringify({ accion: '1', kapp_id: $(this).attr('data-kapp-id') });

        new Promise((resolve, reject) => {
            $.post($SCRIPT_ROOT + '/crud_kapp', {
                parametro: pl,
            }, function (rpl) {
                resolve(rpl);
            }, "json")
        }).then((rpl) => {
            if (rpl.result == "success") {
                $.each(rpl.data.pagos, function (index, registro) {
                    alert(registro.periodo + '....' + registro[1]);
                });

                $("#modal-kapp-pago-periodo").val(rpl.data.periodo_sugerido);

                fecha.value = hoy();
            }
        })
    });

    // BOTON RESTABLECER SESION
    $(document).on('click', '#btn-add-user-modal', function () {
        $.post($SCRIPT_ROOT + '/usuarios', {
            accion: 2,
        }, function (datos) {
            if (datos == 0) {
                $('#modal-notificacion-titulo').html("Notificación de Cantidad de Usuarios");
                $('#modal-notificacion-mensaje').html("<b>Ya no tiene usuarios disponibles en su cuenta</b><br><br>Si necesita más usuarios, por favor contáctese con el administrador");
                $('#modal-notificacion').modal('show');
            }
            else {
                $("#nuevo-usuario-nombres").val("");
                $("#nuevo-usuario-apellidos").val("");
                $("#nuevo-usuario-correo").val("");
                $("#datos-nuevo-usuario").html("");
                $("#datos-nuevo-usuario").collapse("hide");
                $("#modal-crud-user-btn-crear").css("display", "");
                $('#modal-crud-user-add').modal('show');
            }
        });

    });

    // BOTON CREAR USUARIO - BLUR
    $(document).on('blur', '#modal-crud-user-btn', function () {
        $("#usuario-guardar-alerta").html("");
        $("#usuario-guardar-alerta").css("display", "none");
    });


});