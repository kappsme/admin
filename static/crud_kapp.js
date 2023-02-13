$(document).ready(function () {


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

    // BOTON EDITAR USUARIO
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

    // BOTON EDITAR USUARIO
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
            var datos = JSON.stringify({ accion: '0', kapp_id: id, nombre: $('#kapp-' + id + '-nombre').val() , estado: $('#kapp-' + id + '-estado').val(), fecha_cobro: $('#kapp-' + id + '-fecha-cobro').val(), licencias: $('#kapp-' + id + '-licencias').val()});

            $("#modal-crud-kapp-body").html("La KAPP <em>" + $(this).attr('data-id-kapp') + "</em> será modificada." + desactivacion + "<br><br>¿Desea continuar?");
            // $('#modal-crud-kapp-id').val($(this).attr('data-id-kapp'));
            $("#modal-crud-kapp-accion").val(0); // GUARDAR KAPP
            $('#modal-crud-kapp-datos').val(datos);
            $('#modal-crud-kapp').modal('show');
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