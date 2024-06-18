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
                    for (const column of ['periodo', 'fecha_registro', 'monto']) {
                        const cell = document.createElement("td");
                        const cellText = document.createTextNode(pago[column]);
                        cell.appendChild(cellText);
                        row.appendChild(cell);
                        }
                    tblBody.appendChild(row);
                });
            }
        }); 
    })
}

var kappId = -1

document.getElementById('btn-kapp-registrar-pago').onclick = function () {
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

    // new Promise((resolve, reject) => {
    //     fetch($SCRIPT_ROOT + '/crud_kapp', {
    //         method: "POST",
    //         body: JSON.stringify(
    //             { accion: '1', kapp_id: kappId }
    //         ),

    //         // Adding headers to the request 
    //         headers: {
    //             "Content-type": "application/json; charset=UTF-8"
    //         }
    //     })
    //         // .then(response => response.json())

    //     // $.post($SCRIPT_ROOT + '/crud_kapp', {
    //     //     parametro: pl,
    //     // }, function (rpl) {
    //     //     resolve(rpl);
    //     // }, "json")
    // }).then((rpl) => {
    //     alert("YYY");     
    //     if (rpl.result == "success") {
    //         // tablaDePagos(kappId)
    //         document.getElementById("#modal-kapp-pago-periodo").value = rpl.data.periodo_sugerido;
    //         fecha.value = hoy();
    //     }
    // })


