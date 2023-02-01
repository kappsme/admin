function vis_telefono(string) {
  return string.substr(0, 4) + '-' + string.substr(4, 4);
}
function bd_telefono(string) {
  return string.substr(0, 4) + string.substr(5, 4);
}

function miles(string) {
  return string.substr(0, string.length - 3) + ',' + string.substr(string.length - 3);
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// FUNCION PARA CAMPOS DE AUTOCOMPLETAR
function autocomplete(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function (e) {
    var a, b, i, val = this.value;
    /*close any already open lists of autocompleted values*/
    closeAllLists();
    if (!val) { return false; }
    currentFocus = -1;
    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    /*append the DIV element as a child of the autocomplete container:*/
    this.parentNode.appendChild(a);
    /*for each item in the array...*/
    for (i = 0; i < arr.length; i++) {
      /*check if the item starts with the same letters as the text field value:*/
      if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        /*create a DIV element for each matching element:*/
        b = document.createElement("DIV");
        /*make the matching letters bold:*/
        b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
        b.innerHTML += arr[i].substr(val.length);
        /*insert a input field that will hold the current array item's value:*/
        b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
        /*execute a function when someone clicks on the item value (DIV element):*/
        b.addEventListener("click", function (e) {
          /*insert the value for the autocomplete text field:*/
          inp.value = this.getElementsByTagName("input")[0].value;
          /*close the list of autocompleted values,
          (or any other open lists of autocompleted values:*/
          closeAllLists();
        });
        a.appendChild(b);
      }
    }
  });
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function (e) {
    var x = document.getElementById(this.id + "autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      /*If the arrow DOWN key is pressed,
      increase the currentFocus variable:*/
      currentFocus++;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 38) { //up
      /*If the arrow UP key is pressed,
      decrease the currentFocus variable:*/
      currentFocus--;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 13) {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (x) x[currentFocus].click();
      }
    }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
    closeAllLists(e.target);
  });

}

// SIDE OFF CANVAS MENU
/* Set the width of the side navigation to 250px and the left margin of the page content to 250px */
function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
  //document.getElementById("main").style.marginLeft = "250px";
}

/* Set the width of the side navigation to 0 and the left margin of the page content to 0 */
function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  //document.getElementById("main").style.marginLeft = "0";
}


// SIDE OFF PANEL CLIENTE
/* Set the width of the side navigation to 250px and the left margin of the page content to 250px */
function openPanelC() {
  document.getElementById("panel-cliente").style.width = "450px";
  //document.getElementById("main").style.marginLeft = "250px";
}

/* Set the width of the side navigation to 0 and the left margin of the page content to 0 */
function closePanelC() {
  document.getElementById("panel-cliente").style.width = "0";
  //document.getElementById("main").style.marginLeft = "0";
}



/* dropdown content */
function dropPrint() {
  document.getElementById("myDropPrint").classList.toggle("show");
}


function toThousandComma(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ENABLE POPOVERS
$(function () {
  $('[data-toggle="popover"]').popover()
})

function espera_on() {
  document.getElementById("espera").style.display = "block";
}

function espera_off() {
  document.getElementById("espera").style.display = "none";
}

//$(document).ajaxSuccess(function(data){
//  alert(data.resultado);
//});

// BOTON PARA ENVIAR COMPROBANTE DE VENTA
$(document).on('click', '#btn-comprobante-venta-correo', function () {
  $.post($SCRIPT_ROOT + '/pdfs_mail', {
    "tipo_accion": 5, // ENVIAR COMPROBANTE DE VENTA POR CORREO
    "id_boleta": $("#btn-comprobante-venta-correo").attr("id_venta"), // id_boleta = id_cliente
    "id_cliente": -1,
  }, function (datos) {
    $('#modal-movimiento-correo-enviado').modal('show');
  });
});

// BOTON PARA ACTIVA MODAL DE DEVOLUCION
$(document).on('click', '#id_devolucion_venta', function () {
  $("#lbl-venta-devolucion-producto").html($(this).attr("nombre"));
  $("#venta-devolucion-id-venta").val($(this).attr("id_venta"));
  $("#venta-devolucion-codigo-producto").val($(this).attr("codigo_producto"));
  $("#venta-devolucion-id-estado").val($(this).attr("estado_id"));
  $("#modal-venta-devolucion").modal("show");


  $('#venta-devolucion-unidades')
    .find('option')
    .remove()
    ;

  var x = document.getElementById("venta-devolucion-unidades");
  var option;
  for (var i = 1; i <= $(this).attr("unidades"); i++) {
    option = document.createElement("option");
    option.text = i;
    option.value = i;
    x.add(option);
  }

});

// BOTON PARA REALIZAR LA DEVOLUCION
$(document).on('click', '#venta-devolucion-confirmacion', function () {
  $.post($SCRIPT_ROOT + '/tnd', {
    "tienda-accion": 13, // DEVOLUCION
    id_venta: $("#venta-devolucion-id-venta").val(),
    codigo_producto: $("#venta-devolucion-codigo-producto").val(),
    id_estado: $("#venta-devolucion-id-estado").val(),
    unidades: $("#venta-devolucion-unidades").val(),
    devolucion_ajuste: $("#venta-devolucion-ajuste").val(),
    comentario: $("#venta-devolucion-justificacion").val(),
  }, function (datos) {
    if (datos=="OK") {
      $('#modal-notificacion-titulo').html("Notificación de Devolución de Venta");
      $('#modal-notificacion-mensaje').html("<b>La devolución se ha efectuado correctamente!");
      $('#modal-notificacion').modal('show');
      ver_venta($("#venta-devolucion-id-venta").val());
      $('#modal-venta-devolucion').modal('hide');
    }
    
  });

 
});