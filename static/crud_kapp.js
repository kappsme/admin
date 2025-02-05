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

// Funcion para crear tabla de pagos
function tablaDePagos(kappIDX) {
    let myPromise = new Promise((resolve, reject) => {
        fetch($SCRIPT_ROOT + '/crud_kapp', {
            method: "POST",
            body: JSON.stringify(
                { accion: '3', kapp_id: kappIDX }
            ),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(response => response.json())
            .then(json => {
                if (json.result == "success") {
                    const tblBody = document.getElementById("modal-kapp-pagos-tabla-body");
                    tblBody.innerHTML = '';
                    // creating all cells
                    json.data.pagos.forEach((pago) => {
                        const row = document.createElement("tr");
                        if (pago['estado'] == 'Desactivo')
                            row.classList.add('text-decoration-line-through')
                        for (const column of ['periodo', 'fecha_registro', 'monto', 'id']) {
                            const cell = document.createElement("td");
                            if (column == 'id' && pago['estado'] == 'Activo') {
                                var cellText = "<button id='btn-kapp-anular-pago' type='button' class='btnAnularPagos p-0 m-0' data-pago-id='" + pago[column] + "' data-bs-toggle='modal' data-bs-target='#modal-crud-pago'>-</button>"
                                cell.innerHTML = cellText
                            }
                            else if (column != 'id') {
                                var cellText = document.createTextNode(pago[column]);
                                cell.appendChild(cellText);
                            }
                            row.appendChild(cell);
                        }
                        tblBody.appendChild(row);
                    })

                    // Anular PAGOS
                    var btnsAnularPagos = document.getElementsByClassName('btnAnularPagos');
                    for (let btn of btnsAnularPagos) {
                        btn.onclick = function () {
                            document.getElementById('modal-crud-pago-pago-id').value = btn.getAttributeNode('data-pago-id').value;
                        }
                    }
                }
            });
    });
}

var kappId = -1;

// VER PAGOS
var btnsVerPagos = document.getElementsByClassName('btnVerPagos');
for (let btn of btnsVerPagos) {
    btn.onclick = function () {
        kappId = this.getAttributeNode('data-kapp-id').value;
        document.getElementById('modal-kapp-pago-btn-guardar').getAttributeNode('data-kapp-id').value = kappId;
        document.getElementById('modal-kapp-pago-periodo').value = "";
        document.getElementById('modal-kapp-pago-monto').value = "";
        var fecha = document.querySelector("#modal-kapp-pago-fecha");
        fecha.value = "";

        let myPromise = new Promise((resolve, reject) => {
            fetch($SCRIPT_ROOT + '/crud_kapp', {
                method: "POST",
                body: JSON.stringify(
                    { accion: '1', kapp_id: kappId }
                ),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }).then(response => response.json())
                .then(json => {
                    if (json.result == "success") {
                        tablaDePagos(kappId)
                        document.getElementById("modal-kapp-pago-periodo").value = json.data.periodo_sugerido;
                        fecha.value = hoy();
                    }
                });
        })
    };
}



// BOTON EDITAR KAPP
var btnsEditarKapp = document.getElementsByClassName('btnEditarKapp');
for (let btn of btnsEditarKapp) {
    btn.onclick = function () {
        kappId = this.getAttributeNode('data-kapp-id').value;
        document.getElementById("kapp-" + kappId + "-nombre").disabled = false;
        document.getElementById("kapp-" + kappId + "-estado").disabled = false;
        document.getElementById("kapp-" + kappId + "-fecha-cobro").disabled = false;
        document.getElementById("kapp-" + kappId + "-licencias").disabled = false;
        document.getElementById("kapp-" + kappId + "-div-editar").hidden = true;
        document.getElementById("kapp-" + kappId + "-div-guardar").hidden = false;
        document.getElementById("kapp-" + kappId + "-vencimiento").disabled = false;
        //$("#kapp-" + kappId + "-estado").trigger("chosen:updated");
    }
};


// BOTON GUARDAR KAPP
var modalCrudKapp = new bootstrap.Modal(document.getElementById('modal-crud-kapp'));
var btnsGuardarKapp = document.getElementsByClassName('btnGuardarKapp');
for (let btn of btnsGuardarKapp) {
    btn.onclick = function () {
        kappId = this.getAttributeNode('data-kapp-id').value;

        document.getElementById("modal-crud-kapp-titulo").textContent = "Guardar KAPP";
        document.getElementById("modal-crud-kapp-btn").hidden = false;

        if (document.getElementById("kapp-" + kappId + "-nombre").value.length <= 5) {
            document.getElementById("modal-crud-kapp-btn").hidden = true;
            document.getElementById("modal-crud-kapp-body").innerHTML = 'El nombre de Cliente para la KAPP debe ser mayor a 5 Caracteres'
            modalCrudKapp.show()
        } else {
            var desactivacion = "", suspension = "";
            if (document.getElementById('kapp-' + kappId + '-estado').value == "INACTIVE") {
                desactivacion = "<br><br>La KAPP se desactivará. Ningún usuario tendrá acceso.<br><br>";
            }
            if (document.getElementById('kapp-' + kappId + '-estado').value == "BLOCKED") {
                suspension = "<br><br>La KAPP se suspenderá. Ningún usuario tendrá acceso.<br><br>";
            }
            var bloqueo = 0;
            var datos = JSON.stringify({
                accion: '0', kapp_id: kappId, nombre: document.getElementById('kapp-' + kappId + '-nombre').value
                , estado: document.getElementById('kapp-' + kappId + '-estado').value
                , fecha_cobro: document.getElementById('kapp-' + kappId + '-fecha-cobro').value
                , licencias: document.getElementById('kapp-' + kappId + '-licencias').value
                , vencimiento: document.getElementById('kapp-' + kappId + '-vencimiento').value
            });

            document.getElementById("modal-crud-kapp-accion").value = 0 // GUARDAR KAPP
            document.getElementById('modal-crud-kapp-datos').value = datos
            document.getElementById("modal-crud-kapp-body").innerHTML = "La KAPP <em>" + kappId + "</em> será modificada." + desactivacion + "<br><br>¿Desea continuar?<br><br>" + document.getElementById('modal-crud-kapp-datos').value;
            modalCrudKapp.show()
        };
    }
}

// BOTON CONFIRMAR MODAL-CRUD-USER
document.getElementById('modal-crud-kapp-btn').onclick = function () {
    var pl = document.getElementById('modal-crud-kapp-datos').value
    let myPromise = new Promise((resolve, reject) => {
        fetch($SCRIPT_ROOT + '/crud_kapp', {
            method: "POST",
            body: pl,
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(response => response.json())
            .then(json => {
                if (json.result == "success") {
                    location.reload();
                }
            });
    })
};


// BOTON REGISTRAR PAGO - GUARDAR
document.getElementById('modal-kapp-pago-btn-guardar').onclick = function () {
    this.disabled = true;
    kappId = this.getAttributeNode('data-kapp-id').value;
    this.textContent = "Espere..."
    var pl = JSON.stringify({ accion: '2', kapp_id: kappId, fecha: document.getElementById('modal-kapp-pago-fecha').value, periodo: document.getElementById('modal-kapp-pago-periodo').value, monto: document.getElementById('modal-kapp-pago-monto').value });
    let myPromise = new Promise((resolve, reject) => {
        fetch($SCRIPT_ROOT + '/crud_kapp', {
            method: "POST",
            body: pl,
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(response => response.json())
            .then(json => {
                document.getElementById('modal-kapp-pago-btn-guardar').disabled = false;
                if (json.result == "success") {
                    tablaDePagos(kappId)
                    location.reload();

                }
            });
    })
    this.textContent = "Registrar Pago"
};


// BOTON ANULAR PAGO - CONFIRMAR
document.getElementById('modal-crud-pago-confirmacion').onclick = function () {
    pagoId = document.getElementById('modal-crud-pago-pago-id').value
    var pl = JSON.stringify({ accion: '4', pagoId: pagoId });
    let myPromise = new Promise((resolve, reject) => {
        fetch($SCRIPT_ROOT + '/crud_kapp', {
            method: "POST",
            body: pl,
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(response => response.json())
            .then(json => {
                location.reload();
            });
    })
};


// BOTON CONFIGURACION KAPP
var modalCrudKappConfiguracion = new bootstrap.Modal(document.getElementById('modal-crud-conf'));
var btnsGuardarKapp = document.getElementsByClassName('btnEditarKappConfiguracion');
for (let btn of btnsGuardarKapp) {
    btn.onclick = function () {
        kappId = this.getAttributeNode('data-kapp-id').value;
        document.getElementById('modal-crud-conf-confirmacion').getAttributeNode('data-kapp-id').value = kappId;

        var pl = JSON.stringify({ accion: '5', kapp_id: kappId });
        let myPromise = new Promise((resolve, reject) => {
            fetch($SCRIPT_ROOT + '/crud_kapp', {
                method: "POST",
                body: pl,
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }).then(response => response.json())
                .then(json => {
                    const tblBody = document.getElementById("modal-kapp-conf-tabla-body");
                    tblBody.innerHTML = '';
                    json.data.configuracion.forEach((conf) => {
                        const row = document.createElement("tr");
                        for (const column of ['name', 'estado']) {
                            const cell = document.createElement("td");
                            if (column == 'estado') {
                                if (conf[column] == 0) {
                                    var cellText = "<input type='checkbox' class='modulocat' modulecatid=" + conf["id_modulo"] + " checked />"
                                }
                                else {
                                    var cellText = "<input type='checkbox' class='modulocat' modulecatid=" + conf["id_modulo"] + " />"

                                }
                                cell.innerHTML = cellText
                            } else {
                                var cellText = document.createTextNode(conf[column]);
                                cell.appendChild(cellText);
                            }
                            row.appendChild(cell);
                        }
                        tblBody.appendChild(row);
                    })
                });
        })
        modalCrudKappConfiguracion.show()
    };
}

// BOTON GUARDAR CONFIGURACION KAPP
document.getElementById('modal-crud-conf-confirmacion').onclick = function () {
    var configuracionKapp = document.getElementsByClassName('modulocat');
    var newconf = {}
    for (let conf of configuracionKapp) {
        newconf[conf.getAttributeNode('modulecatid').value] = conf.checked
    }
    kappId = this.getAttributeNode('data-kapp-id').value;

    var pl = JSON.stringify({ accion: '6', kappId: kappId, conf: JSON.stringify(newconf) });
    let myPromise = new Promise((resolve, reject) => {
        fetch($SCRIPT_ROOT + '/crud_kapp', {
            method: "POST",
            body: pl,
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(response => response.json())
            .then(json => {
                location.reload();
            });
    })
};

// BOTON CREAR KAPP
document.getElementById('btn-modal-crear-kapp').onclick = function () {
    var configuracionKapp = document.getElementsByClassName('crear-kapp');
    var newconf = {}
    var form_completed = true
    const footerflag = document.getElementById("modal-kapp-crud-footer-flag");
    footerflag.innerHTML = '';


    for (let conf of configuracionKapp) {
        newconf[conf.id] = conf.value
        if (conf.value == '') {
            form_completed = false
        }
    }
    if (!form_completed) {
        footerflag.innerHTML = 'Información de KAPP incompleta';
    }
    else {

        var pl = JSON.stringify({ accion: '7', conf: JSON.stringify(newconf) });
        let myPromise = new Promise((resolve, reject) => {
            fetch($SCRIPT_ROOT + '/crud_kapp', {
                method: "POST",
                body: pl,
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }).then(response => response.json())
                .then(json => {
                    if (json.result == "success") {
                        location.reload();
                    }
                    else {
                        footerflag.innerHTML = json.reason;
                    }
                });
        })
    }
};

// BOTON KAPP PARAMETROS
var modalCrudKappParametros = new bootstrap.Modal(document.getElementById('modal-crud-parametros'));
var btnsGuardarKappParametros = document.getElementsByClassName('btnEditarKappParametros');
for (let btn of btnsGuardarKappParametros) {
    btn.onclick = function () {
        kappId = this.getAttributeNode('data-kapp-id').value;
        document.getElementById('modal-crud-parametros-confirmacion').getAttributeNode('data-kapp-id').value = kappId;
        var pl = JSON.stringify({ accion: '5', kapp_id: kappId });
        let myPromise = new Promise((resolve, reject) => {
            fetch($SCRIPT_ROOT + '/crud_kapp', {
                method: "POST",
                body: pl,
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }).then(response => response.json())
                .then(json => {
                    const accBody = document.getElementById("modal-kapp-modules-accordionFlush");
                    accBody.innerHTML = '';
                    json.data.configuracion.forEach((conf) => {
                        if (conf['estado'] == 0) {
                            const accItem = document.createElement("div");
                            accItem.className = "accordion-item"
                            const headerItem = document.createElement("h2")
                            headerItem.className = "accordion-header"
                            headerItem.innerHTML = '<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseThree" aria-expanded="false" aria-controls="flush-collapseThree">' + conf['name'] + '</button>'
                            accItem.appendChild(headerItem)
                            accBody.appendChild(accItem);
                        }
                    })
                })
        })
        modalCrudKappParametros.show()
    }
}


// BOTON GUARDAR CAMPO
var btnsGuardarCampo = document.getElementsByClassName('btnGuardarCampo');
for (let btn of btnsGuardarCampo) {
    btn.onclick = function () {
        campoId = this.getAttributeNode('data-campo-id').value;
        info = this.getAttributeNode('info').value;
        if (document.getElementById("field_name-" + campoId).value.length <= 2) {
        } else {
            is_active = false
            if (document.getElementById('is_active-' + campoId).checked) is_active = true
            var pl = JSON.stringify({
                accion: '0'
                , info: info
                , field_name: document.getElementById('field_name-' + campoId).value
                , is_active: is_active

            });
            let myPromise = new Promise((resolve, reject) => {
                fetch($SCRIPT_ROOT + '/crud_campo', {
                    method: "POST",
                    body: pl,
                    headers: {
                        "Content-type": "application/json; charset=UTF-8"
                    }
                }).then(response => response.json())
                    .then(json => {
                        if (json.result == 'success') {
                            document.getElementById('div-campo-guardar-' + campoId).hidden = true;
                        }

                    })
            })

        };
    }
}

var fieldsCampo = document.getElementsByClassName('input-campo');
for (let fieldCampo of fieldsCampo) {
    fieldCampo.addEventListener("change", (event) => {
        campoId = fieldCampo.getAttributeNode('data-campo-id').value;
        document.getElementById('div-campo-guardar-' + campoId).hidden = false
    });
}


function loadFieldOptions(id_campo) {
    var pl = JSON.stringify({
        accion: '1',
        id_campo: id_campo
    });
    let myPromise = new Promise((resolve, reject) => {
        fetch($SCRIPT_ROOT + '/crud_campo', {
            method: "POST",
            body: pl,
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(response => response.json())
            .then(json => {
                document.getElementById('btn-add-opcion').getAttributeNode('data-campo-id').value = id_campo;
                const tblBody = document.getElementById("modal-agregar-opciones-tabla-body");
                tblBody.innerHTML = '';

                // let tabla = document.getElementById('modal-agregar-opciones-tabla');
                // while (tabla.rows.length > 0) {
                //     tabla.rows[0].remove();
                // }

                json.data.forEach((opt) => {
                    const row = document.createElement("tr");
                    for (const column of ['value', 'is_active', 'options']) {
                        const cell = document.createElement("td");
                        if (column == 'is_active') {
                            var cellText = "<input type='checkbox' id='is_active-" + opt["id"] + "' class='fieldOption' data-option-id=" + opt["id"]
                            if (opt[column] == 1) {
                                cellText += " checked />"
                            }
                            else {
                                cellText += " />"
                            }
                        } else if (column == 'options') {
                            var cellText = '<button id="btn-add-option-' + opt["id"] + '" type="button" class="btn btn-success p-0 m-0 btn-add-option" style = "width:2.2rem;height:2.2rem;" data-field-id="' + opt["id"] + '" hidden>'
                            cellText += '<img src="/static/icons_svg/save1.svg" alt="Agregar Campo" class="img inline p-0 m-0" style="width:1.9rem;height:1.5rem;" title="Agregar Campo"></button>'
                        } else {
                            var cellText = "<input type='text' id='value-" + opt["id"] + "' class='fieldOption' data-option-id=" + opt["id"] + " value='" + opt["value"] + "'/>"
                        }
                        cell.innerHTML = cellText

                        row.appendChild(cell);
                    }
                    tblBody.appendChild(row);
                })

                let fieldOptions = document.getElementsByClassName('fieldOption');
                for (let field of fieldOptions) {
                    field.addEventListener('change', function () {
                        document.getElementById('btn-add-option-' + field.getAttributeNode('data-option-id').value).hidden = false
                    });
                }

                let btnsAddOption = document.getElementsByClassName('btn-add-option');
                for (let btn of btnsAddOption) {
                    btn.addEventListener('click', function () {
                        id_campo = btn.getAttributeNode('data-field-id').value;
                        is_active = document.getElementById('is_active-' + id_campo).checked
                        option_new_value = document.getElementById('value-' + id_campo).value
                        var pl = JSON.stringify({
                            accion: '3',
                            id_campo: id_campo,
                            option_new_value: option_new_value,
                            is_active: is_active
                        });
                        let myPromise = new Promise((resolve, reject) => {
                            fetch($SCRIPT_ROOT + '/crud_campo', {
                                method: "POST",
                                body: pl,
                                headers: {
                                    "Content-type": "application/json; charset=UTF-8"
                                }
                            }).then(response => response.json())
                                .then(json => {
                                    if (json.result == 'success') {
                                        document.getElementById('btn-add-option-' + id_campo).hidden = true;
                                    }
                                })
                        })
                    })
                }
            });
    })
}


// BOTON GUARDAR CAMPO
var btnsAgregarOpcion = document.getElementsByClassName('btnAgregarOpcion');
for (let btn of btnsAgregarOpcion) {
    btn.onclick = function () {
        id_campo = this.getAttributeNode('data-campo-id').value;
        document.getElementById("modal-agregar-opcion").value = ""
        loadFieldOptions(id_campo);
    }
}



// BOTON AGREGAR OPCION A CAMPO
document.getElementById('btn-add-opcion').onclick = function () {
    var new_option = document.getElementById("modal-agregar-opcion").value;
    var id_campo = this.getAttributeNode('data-campo-id').value;
    if (new_option.length > 0 && id_campo.length > 0) {
        var pl = JSON.stringify({ accion: '2', id_campo: id_campo, new_option: new_option });
        let myPromise = new Promise((resolve, reject) => {
            fetch($SCRIPT_ROOT + '/crud_campo', {
                method: "POST",
                body: pl,
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }).then(response => response.json())
                .then(json => {
                    if (json.result == "success") {
                        loadFieldOptions(id_campo);
                    }
                });
        })
    }
};



// BOTON GUARDAR PARAMETRO
var btnsGuardarParametro = document.getElementsByClassName('btnGuardarParametro');
for (let btn of btnsGuardarParametro) {
    btn.onclick = function () {
        parametroId = this.getAttributeNode('data-parametro-id').value;
        element=document.getElementById('parametro-' + parametroId)
        if (element.type == 'checkbox') {
            if (document.getElementById('parametro-' + parametroId).checked) {
            new_parameter_value = '1'
            } else {
                new_parameter_value = '0'
            }
        } else {
            new_parameter_value = element.value
        }
 
        var pl = JSON.stringify({
            accion: '0',
            id_parametro: parametroId,
            new_parameter_value: new_parameter_value
        });
        let myPromise = new Promise((resolve, reject) => {
            fetch($SCRIPT_ROOT + '/crud_parametro', {
                method: "POST",
                body: pl,
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }).then(response => response.json())
                .then(json => {
                    if (json.success) {
                        document.getElementById('div-parametro-guardar-' + parametroId).hidden = true;
                    }

                })
        })

    }
}

var fieldsParametro = document.getElementsByClassName('confparam');
for (let fieldParametro of fieldsParametro) {
    fieldParametro.addEventListener("change", (event) => {
        campoId = fieldParametro.getAttributeNode('data-parametro-id').value;
        document.getElementById('div-parametro-guardar-' + campoId).hidden = false
    });
}
