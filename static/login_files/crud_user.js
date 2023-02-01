$(document).ready(function () {


    // BOTON RESTABLECER SESION
    $(document).on('click', '#btn-restablecer-sesion', function () {
        $("#modal-crud-user-titulo").text("Restablecer Sesión");
        $("#modal-crud-user-body").html('¿Esta seguro que desea restablecer la sesión del usuario <b>' + $(this).attr('data-username') + '?');
        $('#modal-crud-user-id').val($(this).attr('data-id-user'));
        $("#modal-crud-user-accion").val(0); // RESET SESSION
        $('#modal-crud-user').modal('show');
    });

    // BOTON CONFIRMAR MODAL-CRUD-USER
    $('#modal-crud-user-btn').click(function (event) {
        $.post($SCRIPT_ROOT + '/crud_usuario', {
            accion: $('#modal-crud-user-accion').val(),
            parametro: $('#modal-crud-user-id').val(),
            parametro2: $('#modal-crud-user-datos').val()
        }, function (datos) {
            document.getElementById("frm-usuarios").submit();
        });
    });

    // BOTON EDITAR USUARIO
    $(document).on('click', '#btn-editar-usuario', function () {
        var id = $(this).attr('data-id-user')
        document.getElementById("usuario" + id + "-correo").disabled = false;
        document.getElementById("usuario" + id + "-nivel").disabled = false;
        document.getElementById("usuario" + id + "-estado").disabled = false;
        document.getElementById("usuario" + id + "-bloqueo").disabled = false;
        document.getElementById("usuario" + id + "-vigencia").disabled = false;
        document.getElementById("usuario" + id + "-div-guardar").hidden = false;
        document.getElementById("usuario" + id + "-div-editar").hidden = true;
        $("#usuario" + id + "-nivel").trigger("chosen:updated");
        $("#usuario" + id + "-estado").trigger("chosen:updated");
    });

    // BOTON EDITAR USUARIO
    $(document).on('click', '#btn-guardar-usuario', function () {
        var id = $(this).attr('data-id-user')
        $("#modal-crud-user-titulo").text("Guardar Usuario");
        document.getElementById("modal-crud-user-btn").hidden = false;
        if (!$('#usuario' + id + '-correo').val().match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
            document.getElementById("modal-crud-user-btn").hidden = true;
            $("#modal-crud-user-body").html('Formato de Correo Electrónico Incorrecto. Por favor verifíquelo');
            $('#modal-crud-user').modal('show');
        } else if ($('#usuario' + id + '-vigencia').val() < 5 || $('#usuario' + id + '-vigencia').val() > 120) {
            document.getElementById("modal-crud-user-btn").hidden = true;
            $("#modal-crud-user-body").html('La duración de la vigencia de la sesión es inválida. <br>Debe ser entre 5 y 120 minutos.<br><br>Por favor verifique el valor.');
            $('#modal-crud-user').modal('show');
        } else {
            var desactivacion = "";
            if ($('#usuario' + id + '-estado').val() == "0") {
                desactivacion = "<br><br>El usuario se desactivará. Esta acción no se puede deshacer.";
            }
            var bloqueo = 0;
            if (document.getElementById("usuario" + id + "-bloqueo").checked) {
                bloqueo = 1;
            }
            $("#modal-crud-user-body").html("El usuario <em>" + $(this).attr('data-username') + "</em> será modificado." + desactivacion + "<br><br>¿Desea continuar?");
            $('#modal-crud-user-id').val($(this).attr('data-id-user'));
            $("#modal-crud-user-accion").val(3); // GUARDAR USUARIO
            $('#modal-crud-user-datos').val($('#usuario' + id + '-correo').val() + ',' + $('#usuario' + id + '-nivel').val() + ',' + $('#usuario' + id + '-estado').val() + ',' + bloqueo + ',' + $('#usuario' + id + '-vigencia').val());
            $('#modal-crud-user').modal('show');
        };
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

    // BOTON CREAR USUARIO - CLICK
    $(document).on('click', '#modal-crud-user-btn-crear', function () {
        // VALIDA VALORES EN LOS CAMPOS
        var mensaje = "";
        var elementos = [$("#nuevo-usuario-nombres"), $("#nuevo-usuario-apellidos"), $("#nuevo-usuario-correo")];
        for (var i = 0; i < elementos.length; i++) {
            elementos[i].css("border-color", "#3CB521");
            if (elementos[i].attr("type") == "text" && elementos[i].val().length < 3) {
                elementos[i].css("border-color", "#cd0200");
                mensaje += "Campo <b>" + elementos[i].attr("placeholder") + "</b> inválido<br>";
            }
        }
        if (!$('#nuevo-usuario-correo').val().match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
            mensaje += "<b>Correo Eléctronico</b> con formato inválido";
            $('#nuevo-usuario-correo').css("border-color", "#cd0200");
        }
        if (mensaje != "") {
            $("#usuario-guardar-alerta").html(mensaje);
            $("#usuario-guardar-alerta").css("display", "");
        } else {
            this.disabled = true;
            $(this).text("Espere...");
            $("#modal-crud-user-btn-cerrar").css("display", "none");
            new Promise((resolve, reject) => {
                $.post($SCRIPT_ROOT + '/usuarios', {
                    accion: 3,
                    nombres: $("#nuevo-usuario-nombres").val(),
                    apellidos: $("#nuevo-usuario-apellidos").val(),
                    correo: $("#nuevo-usuario-correo").val(),
                    nivel: $("#nuevo-usuario-nivel").val(),
                }, function (datos) {
                    resolve(datos);
                })
            }).then((datos) => {
                if (datos.estado == "OK") {
                    $("#modal-crud-user-btn-crear").css("display", "none");
                    mensaje = `<hr><p class='text-success' style='font-size: 1.1rem;'>El usuario creado para ${$("#nuevo-usuario-nombres").val()} ${$("#nuevo-usuario-apellidos").val()} es:<br><br><b> ${datos.nuevo_usuario}</b><br><br>Por favor, entréguelo al propietario del usuario.<br>La contraseña correspondiente fue enviada al correo indicado en este formulario.</p>`;
                    document.getElementById('modal-crud-user-btn-cerrar').addEventListener('click', () => { $("#btn-usuarios-admin").click(); }, false);
                } else {
                    mensaje = "<hr><p class='text-danger' style='font-size: 1.1rem;'>Error en la creación del usuario.<br><br>Por favor, verifique la disponibilidad de usuarios de su cuenta y vuelva a intentarlo.<br>Si el problema persiste, contacte al administrador</p>";
                }
                $("#datos-nuevo-usuario").html(mensaje);
                $("#datos-nuevo-usuario").collapse("show");
                $("#modal-crud-user-btn-cerrar").css("display", "");
                this.disabled = false;
                $(this).text("Crear");
            })
        };
    });

// BOTON CREAR USUARIO - BLUR
$(document).on('blur', '#modal-crud-user-btn', function () {
    $("#usuario-guardar-alerta").html("");
    $("#usuario-guardar-alerta").css("display", "none");
});

// BOTON CREAR USUARIO - BLUR
$(document).on('click', '#btn-activar-usuario', function () {
    this.disabled = true;
    $(this).text("Espere...");
    new Promise((resolve, reject) => {
        $.post($SCRIPT_ROOT + '/usuarios', {
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

});