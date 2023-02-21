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

    var kappId = -1


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
        kappId = $(this).attr('data-kapp-id')
        document.getElementById("kapp-" + kappId + "-nombre").disabled = false;
        document.getElementById("kapp-" + kappId + "-estado").disabled = false;
        document.getElementById("kapp-" + kappId + "-fecha-cobro").disabled = false;
        document.getElementById("kapp-" + kappId + "-licencias").disabled = false;
        document.getElementById("kapp-" + kappId + "-div-editar").hidden = true;
        document.getElementById("kapp-" + kappId + "-div-guardar").hidden = false;
        $("#kapp-" + kappId + "-estado").trigger("chosen:updated");
    });

    // BOTON GUARDAR KAPP
    $(document).on('click', '#btn-guardar-kapp', function () {
        kappId = $(this).attr('data-kapp-id')
        $("#modal-crud-kapp-titulo").text("Guardar KAPP");
        document.getElementById("modal-crud-kapp-btn").hidden = false;

        if ($('#kapp-' + kappId + '-nombre').val().length <= 5) {
            document.getElementById("modal-crud-kapp-btn").hidden = true;
            $("#modal-crud-kapp-body").html('El nombre de Cliente para la KAPP debe ser mayor a 5 Caracteres');
            $('#modal-crud-kapp').modal('show');
        } else {
            var desactivacion = "", suspension = "";
            if ($('#kapp-' + kappId + '-estado').val() == "INACTIVE") {
                desactivacion = "<br><br>La KAPP se desactivará. Ningún usuario tendrá acceso.<br><br>";
            }
            if ($('#kapp-' + kappId + '-estado').val() == "BLOCKED") {
                suspension = "<br><br>La KAPP se suspenderá. Ningún usuario tendrá acceso.<br><br>";
            }
            var bloqueo = 0;
            var datos = JSON.stringify({ accion: '0', kapp_id: kappId, nombre: $('#kapp-' + kappId + '-nombre').val(), estado: $('#kapp-' + kappId + '-estado').val(), fecha_cobro: $('#kapp-' + kappId + '-fecha-cobro').val(), licencias: $('#kapp-' + kappId + '-licencias').val() });

            $("#modal-crud-kapp-body").html("La KAPP <em>" + kappId + "</em> será modificada." + desactivacion + "<br><br>¿Desea continuar?");
            $("#modal-crud-kapp-accion").val(0); // GUARDAR KAPP
            $('#modal-crud-kapp-datos').val(datos);
            $('#modal-crud-kapp').modal('show');
        };
    });


    // Funcion para crear tabla de pagos
    function tablaDePagos(kappIDX) {
        var pl = JSON.stringify({ accion: '3', kapp_id: kappIDX });
        new Promise((resolve, reject) => {
            $.post($SCRIPT_ROOT + '/crud_kapp', {
                parametro: pl,
            }, function (rpl) {
                resolve(rpl);
            }, "json")
        }).then((rpl) => {
            if (rpl.result == "success") {
                // creates a <table> element and a <tbody> element
                const tblBody = document.getElementById("modal-kapp-pagos-tabla-body");
                tblBody.innerHTML = '';
                // creating all cells
                $.each(rpl.data.pagos, function (index, pago) {
                    const row = document.createElement("tr");
                    for (const column of ['periodo', 'fecha_registro', 'monto']) {
                        const cell = document.createElement("td");
                        const cellText = document.createTextNode(pago[column]);
                        cell.appendChild(cellText);
                        row.appendChild(cell);
                    }
                    tblBody.appendChild(row);
                });
                //     //alert(registro.periodo + '....' + rpl.data.periodo_sugerido);
                //     alert(registro["periodo"]);
            }
        })

    }



    // BOTON REGISTRAR PAGO - MODAL
    $(document).on('click', '#btn-kapp-registrar-pago', function () {
        kappId = $(this).attr('data-kapp-id')
        $('#modal-kapp-pago-btn-guardar').attr('data-kapp-id', kappId)
        $("#modal-kapp-pago-periodo").val("");
        $("#modal-kapp-pago-monto").val("");
        var fecha = document.querySelector("#modal-kapp-pago-fecha");
        fecha.value = "";
        $('#modal-kapp-pago').modal('show');
        var pl = JSON.stringify({ accion: '1', kapp_id: kappId });
        new Promise((resolve, reject) => {
            $.post($SCRIPT_ROOT + '/crud_kapp', {
                parametro: pl,
            }, function (rpl) {
                resolve(rpl);
            }, "json")
        }).then((rpl) => {
            if (rpl.result == "success") {
                tablaDePagos(kappId)
                $("#modal-kapp-pago-periodo").val(rpl.data.periodo_sugerido);
                fecha.value = hoy();
            }
        })

    });


    // BOTON REGISTRAR PAGO - GUARDAR
    $(document).on('click', '#modal-kapp-pago-btn-guardar', function () {
        this.disabled = true;
        kappId = $('#modal-kapp-pago-btn-guardar').attr('data-kapp-id')
        $(this).text("Espere...");
        var pl = JSON.stringify({ accion: '2', kapp_id: kappId, fecha: $('#modal-kapp-pago-fecha').val(), periodo: $('#modal-kapp-pago-periodo').val(), monto: $('#modal-kapp-pago-monto').val() });
        new Promise((resolve, reject) => {
            $.post($SCRIPT_ROOT + '/crud_kapp', {
                parametro: pl,
            }, function (rpl) {
                resolve(rpl);
            }, "json")
        }).then((rpl) => {
            this.disabled = false;
            if (rpl.result == "success") {
                tablaDePagos(kappId)
            }
        })
        $(this).text("Registrar Pago");
    });

    $("#modal-kapp-pago").on('hidden.bs.modal', function(){
        location.reload();
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