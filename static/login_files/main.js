
(function ($) {
    "use strict";


    /*==================================================================
    [ Focus input ]*/
    $('.input100').each(function () {
        $(this).on('blur', function () {
            if ($(this).val().trim() != "") {
                $(this).addClass('has-val');
            }
            else {
                $(this).removeClass('has-val');
            }
        })
    })


    /*==================================================================
    [ Validate ]*/
    var input = $('.validate-input .input100');

    $('.validate-form').on('submit', function () {
        var check = true;

        for (var i = 0; i < input.length; i++) {
            if (validate(input[i]) == false) {
                showValidate(input[i]);
                check = false;
            }
        }

        return check;
    });


    $('.validate-form .input100').each(function () {
        $(this).focus(function () {
            hideValidate(this);
        });
    });

    function validate(input) {
        if ($(input).attr('type') == 'email' || $(input).attr('name') == 'email') {
            if ($(input).val().trim().match(/^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{1,5}|[0-9]{1,3})(\]?)$/) == null) {
                return false;
            }
        }
        else {
            if ($(input).val().trim() == '') {
                return false;
            }
        }
    }

    function showValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).addClass('alert-validate');
    }

    function hideValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).removeClass('alert-validate');
    }

    /*==================================================================
    [ Show pass ]*/
    var showPass = 0;
    $('.btn-show-pass').on('click', function () {
        if (showPass == 0) {
            $(this).next('input').attr('type', 'text');
            $(this).find('i').removeClass('zmdi-eye');
            $(this).find('i').addClass('zmdi-eye-off');
            showPass = 1;
        }
        else {
            $(this).next('input').attr('type', 'password');
            $(this).find('i').addClass('zmdi-eye');
            $(this).find('i').removeClass('zmdi-eye-off');
            showPass = 0;
        }

    });


})(jQuery);

// FUNCION PARA VALIDAR CONTRASEÑA
function validar_clave(contrasenna) {
    largo = "0";
    if (contrasenna.length >= 8) {
        largo = "1"
    }
    var mayuscula = "0";
    var minuscula = "0";
    var numero = "0";
    var caracter_raro = "0";

    for (var i = 0; i < contrasenna.length; i++) {
        if (contrasenna.charCodeAt(i) >= 65 && contrasenna.charCodeAt(i) <= 90) {
            mayuscula = "1";
        }
        else if (contrasenna.charCodeAt(i) >= 97 && contrasenna.charCodeAt(i) <= 122) {
            minuscula = "1";
        }
        else if (contrasenna.charCodeAt(i) >= 48 && contrasenna.charCodeAt(i) <= 57) {
            numero = "1";
        }
        else {
            caracter_raro = "1";
        }
    }
    return largo + mayuscula + minuscula + numero + caracter_raro;
}


// LINK ACTIVA MODAL RECUPERAR CONTRASENA
$('#link-recuperar-password').click(function (event) {
    $('#username_r').val($('#username').val()); // VISUALIZAR
    $('#lbl-recuperar-password-verificar').text(""); // RESET
    $('.collapseCorreo').collapse('hide');
    document.getElementById('check-ok-etga').hidden = true;
    document.getElementById('check-nok-etga').hidden = true;
    $('#modal-recuperar-password').modal('show');
});


// BOTON  MODAL RECUPERAR CONTRASENA
$('#btn-verificar-usuario').click(function (event) {
    $('#lbl-recuperar-password-verificar').text(""); // RESET
    $('.collapseCorreo').collapse('hide');
    document.getElementById('lbl-recuperar-password-verificar').className = "text-danger my-0";
    document.getElementById('check-ok-etga').hidden = true;
    document.getElementById('check-nok-etga').hidden = true;
    if ($("#username_r").val().length <= 2) {
        document.getElementById('check-nok-etga').hidden = false;
        $('#lbl-recuperar-password-verificar').text("Por favor ingrese un usuario válido."); // VISUALIZAR
    } else {
        $.post($SCRIPT_ROOT + '/crud_usuario', {
            formulario: 'crud_usuario', // VARIABLE QUE SIRVE PARA SALTARSE QUE TENGA SESSION EN LOGIN
            accion: 1, // verificar si usuario existe y trae la sugerencia de correo
            parametro: $("#username_r").val(),
            paramtro2: ''
        }, function (data) {
            if (data == '0') {
                document.getElementById('check-nok-etga').hidden = false;
                $('#lbl-recuperar-password-verificar').html("Usuario no encontrado. Por favor ingrese un usuario existente."); // VISUALIZAR
            } else {
                document.getElementById('check-ok-etga').hidden = false;
                document.getElementById('lbl-recuperar-password-verificar').className = "text-primary my-0";
                $('#lbl-recuperar-password-verificar').html("Usuario encontrado!");
                $('#lbl-recuperar-password-verificar2').html("Se le enviará un correo para poder recuperar su contraseña.<br>Por favor ingrese la dirección de correo electrónico registrado para este usuario y presione el botón Enviar.<br><br>" + data); // VISUALIZAR
                document.getElementById('collapseCorreo').hidden = false;
                $('.collapseCorreo').collapse('show');
            }
        });
    }
});

$("#username_r").keyup(function (e) {
    //$(document).on('keyup', '#username_r', function () {
    $('#lbl-recuperar-password-verificar').text(""); // RESET
    $('.collapseCorreo').collapse('hide');
    document.getElementById('lbl-recuperar-password-verificar').className = "text-danger my-0";
    document.getElementById('check-ok-etga').hidden = true;
    document.getElementById('check-nok-etga').hidden = true;
});

$('#btn-recuperar-password-correo').click(function (event) {
    if (!$('#correo_r').val().match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
        $('.collapseVerCorreo').collapse('show');
        $('#lbl-recuperar-password-verificar3').text("Por favor ingrese un correo válido."); // VISUALIZAR
    } else {
        $('#lbl-recuperar-password-verificar3').text("Por favor espere...");
        $.post($SCRIPT_ROOT + '/crud_usuario', {
            formulario: 'crud_usuario', // VARIABLE QUE SIRVE PARA SALTARSE QUE TENGA SESSION EN LOGIN
            accion: 2, // verificar si el correo coincide
            parametro: $("#username_r").val(),
            parametro2: $("#correo_r").val(),
        }, function (data) {
            if (data == 'OK') {
                document.getElementById('lbl-recuperar-password-verificar3').className = "text-primary my-0";
                $('#lbl-recuperar-password-verificar3').html("Correo verificado!<br>En unos minutos recibirá un correo con un enlace para recuperar su contraseña.");
                $('#lbl-recuperar-password-verificar').text(""); // RESET
                $('.collapseCorreo').collapse('hide');
                $('.collapseMain').collapse('hide');
                document.getElementById('collapseMain').hidden = true;
                document.getElementById('lbl-recuperar-password-verificar').className = "text-danger my-0";
                document.getElementById('check-ok-etga').hidden = true;
                document.getElementById('check-nok-etga').hidden = true;
                document.getElementById('modal-recuperar-password-label1').hidden = true;
                document.getElementById('username_r').hidden = true;
                document.getElementById('btn-verificar-usuario').hidden = true;
                document.getElementById('collapseDatos').hidden = false;
                $('.collapseDatos').collapse('show');
            } else {
                $('#lbl-recuperar-password-verificar3').html("El correo proporcionado no coincide con el registrado<br>Por favor intente de nuevo."); // VISUALIZAR
                document.getElementById('lbl-recuperar-password-verificar3').hidden = false;
            }
        });
    }
});


// Boton para comprobar codigo
$(document).on('click', '#dato-btn', function () {
    if ($("#dato-codigo").val().length == 0) {
        $('#lbl-recuperar-password-verificar4').text("Por favor ingrese el código que se envió a su correo."); // VISUALIZAR
    } else {
        $.post($SCRIPT_ROOT + '/crud_usuario', {
            formulario: 'crud_usuario', // VARIABLE QUE SIRVE PARA SALTARSE QUE TENGA SESSION EN LOGIN
            accion: 4, // Validar datos 
            parametro: $("#username_r").val(),
            parametro2: $("#dato-codigo").val(),
            parametro3: $(this).attr('value'),
        }, function (data) {
            if (data != '0') {
                var form = document.getElementById('redirect');
                var element1 = document.createElement("input");
                var element2 = document.createElement("input");
                var element3 = document.createElement("input");
                var element4 = document.createElement("input");

                element1.value = $("#dato-codigo").val();
                element1.name = "parametro";
                form.appendChild(element1);

                element2.value = data;
                element2.name = "parametro2";
                form.appendChild(element2);

                element3.value = 'crud_usuario';
                element3.name = "formulario";
                form.appendChild(element3);

                element4.value = 5;
                element4.name = "accion";
                form.appendChild(element4);

                form.submit();
            }
            else {
                document.getElementById('s1').hidden = true;
                $('#lbl-recuperar-password-verificar4').html("La información proporcionada es incorrecta.<br>Por favor, cierre este recuadro y vuelva a intentarlo.<br><br>Tome en cuenta que la información que se envió en el correo anterior quedó inválida.");
                document.getElementById('lbl-recuperar-password-verificar4').hidden = false;
            }
        });
    }
});



// Boton para crear nueva contraseña 
$(document).on('click', '#enviar-nuevo-password', function () {
    if ($("#nueva1").val() != $("#nueva2").val()) {
        $('#lbl-ingresar-password-nuevo').text("Las contraseñas no coinciden."); // VISUALIZAR
    } else {
        // $('#lbl-ingresar-password-nuevo').text("La nueva contraseña debe tener al menos 8 caracteres."); // VISUALIZAR
        resultado = validar_clave($("#nueva1").val())
        mensaje = "";
        if (resultado[0] == "0") {
            mensaje = "La nueva contraseña debe tener al menos 8 caracteres."
        }
        else if (resultado[1] == "0") {
            mensaje = "La nueva contraseña debe tener al menos una letra mayúscula."
        }
        else if (resultado[2] == "0") {
            mensaje = "La nueva contraseña debe tener al menos una letra minúscula."
        }
        else if (resultado[3] == "0") {
            mensaje = "La nueva contraseña debe tener al menos un número."
        }
        else if (resultado[4] == "0") {
            mensaje = "La nueva contraseña debe tener al menos un caracter especial"
        }
        $('#lbl-ingresar-password-nuevo').text(mensaje); // VISUALIZAR
        if (resultado == "11111") {
            $.post($SCRIPT_ROOT + '/crud_usuario', {
                formulario: 'crud_usuario', // VARIABLE QUE SIRVE PARA SALTARSE QUE TENGA SESSION EN LOGIN
                accion: 6, // Ingresar contraseña nueva 
                parametro: $("#parametro").val(),
                parametro2: $("#parametro2").val(),
                parametro3: $("#nueva1").val(),
            }, function (data) {
                $('#lbl-ingresar-password-nuevo').text(data);
                if (data == "OK") {
                    document.getElementById('lbl-ingresar-password-nuevo2').hidden = false;
                    document.getElementById('img-approve').hidden = false;
                    document.getElementById('p1').hidden = true;
                    document.getElementById('p2').hidden = false;
                }
                if (data == "ERROR-EXPIRED") {
                    document.getElementById('lbl-ingresar-password-nuevo2').hidden = false;
                    $('#lbl-ingresar-password-nuevo2').text("Este acceso ha expirado. Por favor vuelva a comenzar.");
                    document.getElementById('p1').hidden = true;
                    document.getElementById('p2').hidden = false;
                    document.getElementById('img-reprove').hidden = false;
                }
                if (data == "ERROR-USUARIO") {
                    document.getElementById('lbl-ingresar-password-nuevo2').hidden = false;
                    $('#lbl-ingresar-password-nuevo2').text("Ha ocurrido un error con el usuario. Por favor, vuelva a intentarlo o comuníquese con su administrador");
                    document.getElementById('p1').hidden = true;
                    document.getElementById('p2').hidden = false;
                    document.getElementById('img-reprove').hidden = false;
                }
                if (data == "ERROR-PASSWORDREPETIDO") {
                    $('#lbl-ingresar-password-nuevo').text("La contraseña ingresada ya fue utilizada antes. Por favor, digite una contraseña nueva."); // VISUALIZAR
                }
            });
        }
    }
});

$('#modal-recuperar-password').on('hidden.bs.modal', function (e) {
    window.location.replace("https://www.kapps.me/etga");
});