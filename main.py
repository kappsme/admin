# ESTO SOLO PARA MAC
# import pymysql
# pymysql.install_as_MySQLdb()
#######
from flask import (
    Flask,
    render_template,
    render_template_string,
    request,
    redirect,
    url_for,
    session,
    jsonify,
    make_response,
    Response,
    send_from_directory,
    request,
)
#from flask_mysqldb import MySQL
from datetime import datetime
from flask_mail import Mail, Message
import re
import os
#import MySQLdb
#import xlwt
#import io
#import urllib.parse
import klogin
#import datos_base
#import inventario
#import tienda
#import base64
#from collections import Counter
#import math
from dotenv import load_dotenv
import mysql.connector
import json
#import requests

# ENV Variables
load_dotenv()

aplication_id = os.getenv('KAPP_ID')



kapps_admin = Flask(__name__)
kapps_admin.config["PDF_FOLDER"] = "templates/pdfs/"
kapps_admin.config["JSON_SORT_KEYS"] = False


# CONEXION A BASE DE DATOS
def DBConn():
    Conn = mysql.connector.connect(
        user= os.getenv('MYSQL_USER'),
        password= os.getenv('MYSQL_PASSWORD'),
        host= os.getenv('MYSQL_HOST'),
        database= os.getenv('MYSQL_DB'),
        raise_on_warnings = True
    )
    return Conn

# mysqlConn=DBConn()



# kapps_admin.config["MYSQL_HOST"] = os.getenv('MYSQL_HOST')
# kapps_admin.config["MYSQL_CURSORCLASS"] = ""

# Change this to your secret key (can be anything, it's for extra protection)
kapps_admin.secret_key = os.getenv('APP_SECRET_KEY')

# CONFIGURACION CORREO ELECTRONICO
kapps_admin.config["MAIL_SERVER"] = os.getenv('MAIL_SERVER')
kapps_admin.config["MAIL_PORT"] = os.getenv('MAIL_PORT')
kapps_admin.config["MAIL_USERNAME"] = os.getenv('MAIL_USERNAME')
kapps_admin.config["MAIL_PASSWORD"] = os.getenv('MAIL_PASSWORD')
remitente = os.getenv('MAIL_SENDER')

kapps_admin.config["MAIL_USE_TLS"] = False
kapps_admin.config["MAIL_USE_SSL"] = False
mail = Mail(kapps_admin)

# BASE DE DATOS tx
# mysql = pymysql.connect("localhost","tx_usuario1","tx_usuario1xqi","tx")

# LOGINS

@kapps_admin.route("/login", methods=["GET", "POST"])
@kapps_admin.route("/", methods=["GET", "POST"])
def login():
    return klogin.klogin(aplication_id)


@kapps_admin.route("/home/", methods=["GET", "POST"])
def home():
    if "token" in session:
        mysqlConn = DBConn()
        cursor = mysqlConn.cursor(dictionary=True)
        cursor.execute('SET lc_time_names = "es_ES"')
        # VERIFICA PAGO DE USO DE KAPP!
        cursor.execute(
            """select k.id "ID KAPP", k.name "NOMBRE", state "ESTADO", date(k.fecha_cobro) "FECHA COBRO"
                , ifnull(datediff(now(),DATE_ADD(date_format(concat(ifnull(max(periodo), CAST(date_format(fecha_cobro,"%Y%m") AS CHAR CHARACTER SET utf8))
                        ,CAST(date_format(fecha_cobro,"%d") AS CHAR CHARACTER SET utf8)),"%Y%m%d"),INTERVAL 1 MONTH)),0) "DIAS ATRASO" 
                , licencias "LICENCIAS" 
                , dias_vencimiento "DIAS VENCIMIENTO"
                , count(distinct ka.username) "CUENTAS ACTIVAS" 
                , monthname(concat(SUBSTRING(max(periodo), 1, 4),"-",SUBSTRING(max(periodo), 5, 2),"-01")) ULTIMOPAGO_MES
                , SUBSTRING(max(periodo), 1, 4) ULTIMOPAGO_YEAR
                , configuracion CONF
            from kapps_db.kapps k left join kapps_db.pagos kp on kp.kapp_id=k.id 
            left join kapps_db.accounts ka on ka.kapp_id=k.id and ka.estado=1 
        group by k.id, k.name, k.fecha_cobro, state, licencias, dias_vencimiento, configuracion""",
        )
        kapps_info, columnas = cursor.fetchall(), cursor.column_names
        kapps_morosas = len(['x' for kapp in kapps_info if kapp['DIAS ATRASO']>=0])

        cursor.execute(
            """select * from kapps_db.kapp_conf_cat """,
        )
        kapps_cat_info = cursor.fetchall()
        cursor.close()

        for reg in kapps_info:
            reg['CONF'] = [[cat['descripcion'] for cat in kapps_cat_info if cat['id']==int(x)] for x in reg['CONF'].split(",")]
                #= [cat['descripcion'] for cat in kapps_cat_info if cat['id']==int(x)]
             

        return render_template(
            "home.html"
            , kapps_info=kapps_info
            , kapps_morosas=kapps_morosas
            , columnas = columnas
        )
    else:
        return klogin.klogout(msg="Sesión Caducada!")



@kapps_admin.route("/crud_kapp", methods=["POST","GET"])
def crud_kapp():
    result, reason, data = 'failed','No Action Specified', None
    mysqlConn = DBConn()
    cursor = mysqlConn.cursor(dictionary=True)
    cursor.execute('SET lc_time_names = "es_ES"')
    pl = json.loads(request.form.get("parametro"))
    if  pl["accion"] == "0":  # ACTUALIZA KAPP
        cursor.execute(
            "update kapps_db.kapps set name=%s, state=%s, licencias=%s, fecha_cobro=%s, dias_vencimiento=%s where id=%s",
            (
                pl["nombre"],
                pl["estado"],
                pl["licencias"],
                pl["fecha_cobro"],
                pl["vencimiento"],
                pl["kapp_id"],
            ),
        )
        result, reason = 'success', None
    elif pl["accion"] == "1":  # DATOS ULTIMO PAGO
        cursor.execute(
            """select date_format(date_add(date_format(concat(max(periodo),'01'),'%Y%m%d'),INTERVAL 1 MONTH),'%Y%m') periodo_sugerido
                from kapps_db.pagos where kapp_id=%s;""",
            (
                pl["kapp_id"],
            ),
        )
        response_periodo_sugerido = cursor.fetchone()
        result, reason, data = 'success', None, {'periodo_sugerido' : response_periodo_sugerido['periodo_sugerido']}
    elif pl["accion"] == "2":  # REGISTRAR PAGO
        cursor.execute(
            """ insert into kapps_db.pagos (kapp_id, monto, periodo, fecha_registro, estado, userid) values (%s,%s,%s,%s,1,%s) """,
            (
                pl["kapp_id"], pl["monto"] , pl["periodo"], pl["fecha"],session["id"],
            ),
        )
        result, reason, data = 'success', None, None
    elif pl["accion"] == "3":  # DATOS PAGOS
        cursor.execute(
            """select p.id, p.kapp_id, periodo, monto, date_format(fecha_registro,'%Y %M %d') fecha_registro, case when p.estado=0 then 'Desactivo' else 'Activo' end estado
                , userid, ka.username, ka2.username username_elimina, fecha_elimina 
                from kapps_db.pagos p left join kapps_db.accounts ka on ka.id=p.userid
                left join kapps_db.accounts ka2 on ka2.id=p.userid_elimina
                where p.kapp_id=%s order by periodo desc limit 12;""",
            (
                pl["kapp_id"],
            ),
        )
        response_pagos = cursor.fetchall()
        result, reason, data = 'success', None, {'pagos':response_pagos}
    
    mysqlConn.commit()
    cursor.close()
    return {'result' : result, 'reason' : reason, 'data' : data}



@kapps_admin.route("/nueva", methods=["POST"])
def nueva():
    # if 'loggedin' in session and request.method == 'POST':
    mysqlConn = DBConn()
    cursor = mysqlConn.cursor(dictionary=True)
    cursor.execute('SET lc_time_names = "es_ES"')
    cursor.execute("""select a.id, a.name, a.alt, a.html_initial_render_state, a.par1, a.par2, a.par3 ,at.tag, at.html_type 
        from kapps_db.tx_atts a left join kapps_db.tx_atts_types at on at.id=a.id_type
        where id_kapp=%s and a.state=1 order by a.rank asc;""",aplication_id)
    atts = cursor.fetchall()
    cursor.execute("SELECT nombre FROM marcas where estado=1")
    marcas = cursor.fetchall()
    cursor.execute("SELECT nombre FROM tipos_equipo where estado=1")
    tipos_equipo = cursor.fetchall()
    cursor.execute("SELECT nombre FROM zonas")
    zonas = cursor.fetchall()
    cursor.close()
    return render_template(
        "nueva.html", atts=atts, marcas=marcas, tipos_equipo=tipos_equipo, zonas=zonas
    )





@kapps_admin.route("/busqueda_cliente", methods=["POST"])
def busqueda_cliente():
    parametro = request.form.get("parametro")
    tipo_busqueda = int(request.form.get("tipo_busqueda"))
    tipo_documento = request.form.get("tipo_documento")
    cursor = mysql.connection.cursor()
    if tipo_busqueda == 0:
        cursor.execute(
            'select c.id, nombres, apellidos, telefono,telefono2, telefono3, ifnull(correo, "-") correo \
        , ifnull(n_documento, "-") n_documento, ifnull(tipo_documento, "-") tipo_documento, tipo_cliente, c.fecha_ingreso, id_provincia, z.nombre \
            FROM tx_clientes c left join zonas z on z.id=c.id_zona WHERE c.id = %s \
                union all \
                select c2.id, nombres, apellidos,telefono,  telefono2, telefono3, ifnull(correo, "-") correo \
                    , ifnull(n_documento, "-") n_documento, ifnull(tipo_documento, "-") tipo_documento, tipo_cliente, c2.fecha_ingreso, id_provincia, z2.nombre \
            FROM tx_clientes c2 left join zonas z2 on z2.id=c2.id_zona\
            WHERE nombres LIKE %s \
                        OR apellidos like %s \
                        OR n_documento like %s \
                        OR telefono like %s \
            LIMIT 10',
            [
                parametro,
                "%" + parametro + "%",
                "%" + parametro + "%",
                parametro + "%",
                parametro + "%",
            ],
        )
        resultado = cursor.fetchall()
    else:
        cursor.execute(
            'select c.id, nombres, apellidos, telefono, telefono2, telefono3, ifnull(correo, "-") correo \
            , ifnull(n_documento, "-") n_documento, ifnull(tipo_documento, "-") tipo_documento, tipo_cliente, c.fecha_ingreso, id_provincia, z.nombre \
            FROM tx_clientes c left join zonas z on z.id=c.id_zona WHERE n_documento = %s \
                        and tipo_documento = %s',
            [parametro, tipo_documento],
        )
        resultado = cursor.fetchone()
    cursor.close()
    return jsonify(resultado=resultado)


@kapps_admin.route("/busqueda_cedula", methods=["POST"])
def busqueda_cedula():
    parametro = request.form.get("parametro")
    cursor = mysql.connection.cursor()
    cursor.execute("select * from kapps_db.padron_cr where cedula = %s", [parametro])
    resultado = cursor.fetchone()
    cursor.close()
    return jsonify(resultado=resultado)


@kapps_admin.route("/crud_cliente", methods=["POST"])
def verificar_cliente():
    nombres = request.form.get("nombres").upper().strip()
    apellidos = request.form.get("apellidos").upper().strip()
    tipo_cliente = int(request.form.get("tipo_cliente"))
    telefono = request.form.get("telefono")
    telefono2 = request.form.get("telefono2")
    telefono3 = request.form.get("telefono3")
    correo = request.form.get("correo")
    id_provincia = request.form.get("id_provincia")
    ZONA = request.form.get("zona").upper().strip()
    tipo_accion = int(request.form.get("tipo_accion"))
    USUARIO = session["id"]
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT id id_zona FROM zonas WHERE nombre = %s", [ZONA])
    datos = cursor.fetchone()
    if datos is None:
        cursor.close()
        return "NO-ZONA"
    else:
        id_zona = datos["id_zona"]
        if tipo_accion == 1:
            tipo_documento = request.form.get("tipo_documento")
            documento = request.form.get("documento")
            cursor.execute(
                "INSERT INTO tx_clientes (nombres, apellidos, tipo_documento, n_documento, correo, telefono, telefono2, telefono3, tipo_cliente, id_provincia, id_zona, id_usuario) \
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                [
                    nombres,
                    apellidos,
                    tipo_documento,
                    documento,
                    correo,
                    telefono,
                    telefono2,
                    telefono3,
                    tipo_cliente,
                    id_provincia,
                    id_zona,
                    USUARIO,
                ],
            )
            mysql.connection.commit()
            cursor.execute(
                "SELECT max(id) codigo from tx_clientes where id_usuario = %s",
                [USUARIO],
            )
            datos = cursor.fetchone()
            cursor.close()
            return str(datos["codigo"])
        if tipo_accion == 2:
            id_cliente = int(request.form.get("id_cliente"))
            cursor.execute(
                "insert into tx_clientes_log  (id, nombres, apellidos , correo, telefono, telefono2, telefono3, tipo_cliente, id_provincia, id_zona, id_usuario_modificacion) \
                select id, nombres, apellidos , correo, telefono, telefono2, telefono3, tipo_cliente, id_provincia, id_zona, %s \
                from tx_clientes where id=%s",
                [USUARIO, id_cliente],
            )
            cursor.execute(
                "UPDATE tx_clientes set nombres=%s, apellidos=%s, correo=%s, telefono=%s, telefono2=%s, telefono3=%s, tipo_cliente=%s, id_provincia=%s, id_zona=%s \
                 where id=%s",
                [
                    nombres,
                    apellidos,
                    correo,
                    telefono,
                    telefono2,
                    telefono3,
                    tipo_cliente,
                    id_provincia,
                    id_zona,
                    id_cliente,
                ],
            )
            mysql.connection.commit()
            cursor.close()
            return "OK2"
        else:
            # cursor.execute('UPDATE lcsv_clientes set nombre=%s, telefono=%s, id_usuario_update=%s \
            #    ,fecha_update=sysdate() where correo=%s', [nombre, telefono, USUARIO, correo])
            mysql.connection.commit()
            cursor.close()
            return "EOK"


@kapps_admin.route("/boleta_ingreso", methods=["POST"])
def boleta_ingreso():
    MARCA = request.form["marca"].upper().strip()
    TIPO_EQUIPO = request.form["tipo_equipo"].upper().strip()
    MODELO = request.form["modelo"]
    SERIE = request.form["serie"]
    CONDICION = request.form["condicion"]
    MOTIVO = request.form["motivo"]
    COMENTARIO = request.form["comentario"]
    dias_habiles = request.form["dias_habiles"]
    id_cliente = request.form["codigo_cliente"]
    USUARIO = session["id"]
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT id id_marca FROM marcas WHERE nombre = %s", [MARCA])
    datos = cursor.fetchone()
    if datos is None:
        cursor.close()
        return "NO-MARCA"
    else:
        id_marca = datos["id_marca"]
        cursor.execute(
            "SELECT id id_tipo_equipo FROM tipos_equipo WHERE nombre = %s",
            [TIPO_EQUIPO],
        )
        datos = cursor.fetchone()
        if datos is None:
            cursor.close()
            return "NO-TIPO-EQUIPO"
        else:
            id_tipo_equipo = datos["id_tipo_equipo"]
            cursor.execute("SET session time_zone = '-6:00'")
            cursor.execute(
                "INSERT INTO boletas (id_cliente, id_marca, id_tipo_equipo, modelo, serie, id_condicion, motivo_cliente, comentario, dias_habiles, id_usuario ) \
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    id_cliente,
                    id_marca,
                    id_tipo_equipo,
                    MODELO,
                    SERIE,
                    CONDICION,
                    MOTIVO,
                    COMENTARIO,
                    dias_habiles,
                    USUARIO,
                ),
            )
            mysql.connection.commit()
            cursor.execute(
                "SELECT MAX(id_boleta) id_boleta FROM boletas WHERE id_usuario = %s",
                [USUARIO],
            )
            datos = cursor.fetchone()
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
            VALUES (%s,0,%s)",
                (datos["id_boleta"], USUARIO),
            )
            mysql.connection.commit()
            cursor.close()
            return str(datos["id_boleta"])


@kapps_admin.route("/crud_catalogo", methods=["POST"])
def crud_catalogo():
    tipo_accion = int(request.form.get("tipo-accion-catalogo"))
    tipo_catalogo = int(request.form.get("tipo-catalogo"))
    # USUARIO = session['id']
    NIVEL = session["nivel"]
    if tipo_catalogo == 1:
        tabla = "zonas"
    elif tipo_catalogo == 2:
        tabla = "marcas"
    elif tipo_catalogo == 3:
        tabla = "tipos_equipo"
    elif tipo_catalogo == 4:
        tabla = "repuestos"
    elif tipo_catalogo == 5:
        tabla = "proveedores"
    else:
        return "NOK"
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    if tipo_accion == 1:  # EXTRAER CATALOGO
        cursor.execute(
            "select t.*, ac.username from "
            + tabla
            + " t left join kapps_db.accounts ac on ac.id=t.id_usuario order by t.estado desc, t.nombre asc"
        )
        datos = cursor.fetchall()
        cursor.close()
        return render_template(
            "crud_catalogo.html", datos=datos, nivel=NIVEL, tipo_catalogo=tipo_catalogo
        )
    if tipo_accion == 2:  # AGREGAR/ACTUALIZAR AL CATALOGO
        id_elemento = int(request.form["id_elemento"])
        estado = int(request.form["catalogo-elemento-estado"])
        nombre = request.form["catalogo-nombre-nuevo"].upper().strip()
        if len(nombre) == 0:
            cursor.execute(
                "select id, estado, nombre from " + tabla + " where id = %s",
                [id_elemento],
            )
            datos = cursor.fetchone()
            nombre = datos["nombre"]
        else:
            cursor.execute(
                "select id, estado from " + tabla + " where nombre = %s", [nombre]
            )
            datos = cursor.fetchone()
        if datos is None or (
            int(datos["id"]) == id_elemento and int(datos["estado"]) != estado
        ):
            cursor.execute(
                "UPDATE " + tabla + " SET nombre = %s, estado=%s where id=%s",
                [nombre, estado, id_elemento],
            )
            mysql.connection.commit()
            cursor.close()
            return "OK"
        else:
            return "DUPLICADO"


@kapps_admin.route("/ingreso_catalogo", methods=["POST"])
def ingreso_catalogo():
    tipo_ingreso = request.form["tipo_accion"]
    valor = request.form["valor"].upper().strip()
    USUARIO = session["id"]
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SET session time_zone = '-6:00'")
    if tipo_ingreso == "marca":
        cursor.execute(
            "INSERT INTO marcas (nombre,id_usuario) \
                    VALUES (%s,%s)",
            (valor, USUARIO),
        )
    if tipo_ingreso == "tipo-equipo":
        cursor.execute(
            "INSERT INTO tipos_equipo (nombre,id_usuario) \
                    VALUES (%s,%s)",
            (valor, USUARIO),
        )
    if tipo_ingreso == "zona" or tipo_ingreso == "zona2":
        cursor.execute(
            "INSERT INTO zonas (nombre,id_usuario) \
                    VALUES (%s,%s)",
            (valor, USUARIO),
        )
    if tipo_ingreso == "repuesto":
        cursor.execute(
            "INSERT INTO repuestos (nombre,id_usuario) \
                    VALUES (%s,%s)",
            (valor, USUARIO),
        )
    if tipo_ingreso == "proveedor":
        cursor.execute(
            "INSERT INTO proveedores (nombre,id_usuario) \
                    VALUES (%s,%s)",
            (valor, USUARIO),
        )
    mysql.connection.commit()
    return "EOK"


@kapps_admin.route("/boleta1", methods=["POST"])
def boleta1():
    tipo_display = int(request.form["tipo-display"])
    ID_BOLETA = request.form["id-boleta"]
    return boleta(tipo_display, ID_BOLETA)


@kapps_admin.route("/boleta2", methods=["POST"])
def boleta2():
    tipo_display = int(request.form["tipo-display-i"])
    ID_BOLETA = request.form["id-boleta-i"]
    return boleta(tipo_display, ID_BOLETA)


def boleta(tipo_display, ID_BOLETA):
    datos_boleta = datos_base.datos_boleta(mysql, ID_BOLETA)
    if datos_boleta is None:
        return render_template(
            "no_dato.html", mensaje="La Boleta " + ID_BOLETA + " no fue encontrada!"
        )
    else:
        # [MOVIMENTOS, DIAGNOSTICO,COTIZACION,REPARACION, MOVIMIENTOS-RESUMEN, DESCUENTO, FACTURA, FACTURA-ManoDeObra
        # , COMPROBANTE, DETALLE COMPROBANTE, DETALLE COTIZACION, RECHAZO]
        boleta_msg = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        datos_estado = datos_base.datos_estado(mysql, ID_BOLETA)
        datos_cliente = datos_base.datos_cliente(mysql, ID_BOLETA)
        datos_saldo = datos_base.datos_saldo(mysql, ID_BOLETA)
        # DATOS DE SALDOS
        # CUANDO LA BOLETA YA ESTA EN FACTURACION
        if (
            int(datos_estado["id_estado"]) == 6
            or int(datos_estado["id_estado"]) >= 10
            or datos_estado["id_estado"] == 7
        ):
            tipo_display = 6
            cursor.execute(
                'SELECT bc.id, date_format(fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha, a1.username usuario, a2.username usuario_anula, monto, descuentos, impuestos, tipo_cliente FROM boletas_comprobantes bc left join kapps_db.accounts a1 on bc.id_usuario=a1.id \
                    left join kapps_db.accounts a2 on bc.id_usuario_anula=a2.id \
                WHERE id_boleta = %s and bc.estado=1',
                [ID_BOLETA],
            )
            datos_comprobante = cursor.fetchone()
            if datos_comprobante is not None:
                boleta_msg[8] = datos_comprobante
                cursor.execute(
                    "SELECT concepto, monto, descuento, impuestos from boletas_comprobantes_detalle \
                WHERE id_comprobante = %s",
                    [datos_comprobante["id"]],
                )
                boleta_msg[9] = cursor.fetchall()
        # DATOS PARA LA INFORMACION DE LA COTIZACION
        boleta_msg[10] = [
            datos_saldo["monto_cotizacion"],
            datos_saldo["monto_otros_cargos"],
            datos_saldo["monto_pagos"],
        ]
        # VERIFICACION DE REPUESTOS
        cursor.execute(
            "select count(1) conteo, ifnull(sum(case when estado=1 then costo_factura*cantidad else 0 end),0) monto from boletas_repuestos br where br.id_boleta=%s",
            [ID_BOLETA],
        )
        datos_repuestos = cursor.fetchone()
        saldo_repuestos = float(datos_repuestos["monto"])

        if tipo_display >= 3:  # Visualizar Diagnostico
            cursor.execute(
                'select date_format(fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha, descripcion, username, truncate(tiempo/60,0) horas, tiempo-truncate(tiempo/60,0)*60 minutos from boletas_diagnosticos \
                    be left join kapps_db.accounts a on be.id_usuario=a.id where id_boleta= %s',
                [ID_BOLETA],
            )
            datos = cursor.fetchone()
            if datos is not None:
                boleta_msg[1] = datos
        if tipo_display >= 4:  # Visualizar Cotizacion
            cursor.execute(
                'select co.id, date_format(fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha, monto, comentario, mensaje_cliente, a1.username, co.estado, ifnull(correo_envio,"-") correo_envio \
                , date_format(fecha_cambia_estado,"%%Y-%%b-%%d %%h:%%i%%p") fecha_cambia_estado, a2.username username_cambia_estado, reparado \
                from boletas_cotizaciones co left join kapps_db.accounts a1 on co.id_usuario=a1.id \
                left join kapps_db.accounts a2 on co.id_usuario_cambia_estado=a2.id \
                where id_boleta=%s order by co.fecha desc',
                [ID_BOLETA],
            )
            datos = cursor.fetchall()
            if datos is not None:
                boleta_msg[2] = datos
        if tipo_display >= 5:  # Visualizar Reparacion / Repuestos
            if datos_repuestos["conteo"] > 0:
                cursor.execute(
                    'select br.id, case when br.id_repuesto=0 then concat(ip.id," - ",ip.nombre) else r.nombre end nombre, costo, costo_factura,  br.cantidad, case when br.tipo_repuesto=1 then "Nuevo" when br.tipo_repuesto=2 then "Usado" when br.tipo_repuesto=3 then "Otro" end tipo_repuesto \
                            , cantidad*costo costo_total, cantidad*costo_factura costo_total_factura, date_format(br.fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha, a.username, br.estado \
                            , a2.username username_modifica, date_format(br.fecha_modifica,"%%Y-%%b-%%d %%h:%%i%%p") fecha_modifica \
                                from boletas_repuestos br left join repuestos r on r.id=br.id_repuesto \
                                left join kapps_db.accounts a on a.id=br.id_usuario left join kapps_db.accounts a2 on a2.id=br.id_usuario_modifica \
                                left join inv_productos ip on br.info=ip.id \
                            where br.id_boleta=%s order by br.id asc',
                    [ID_BOLETA],
                )
                datos = cursor.fetchall()
                boleta_msg[3] = datos

        # SI LA BOLETA ESTA COMO RECHAZADA
        if datos_boleta["rechazada"] == 1:
            cursor.execute(
                'select date_format(bc1.fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha, comentario, username \
                from boletas_comentarios bc1 \
                    left join kapps_db.accounts a on a.id=bc1.id_usuario \
                    where id_boleta=%s \
                        and bc1.id= (select max(id) from boletas_comentarios bc2 where bc2.id_boleta=bc1.id_boleta and bc2.tipo=4)',
                [ID_BOLETA],
            )
            datos = cursor.fetchone()
            boleta_msg[11] = datos
        cursor.execute("SELECT nombre FROM zonas")
        zonas = cursor.fetchall()
        cursor.execute("SELECT nombre FROM repuestos where estado=1")
        repuestos = cursor.fetchall()
        cursor.close()
        formulario = []  # PARA CARGAR EL INVENTARIO EN LA FASE DE REPARACION
        context = {
            "tipo_display": tipo_display,
            "id_boleta": ID_BOLETA,
            "datos_boleta": datos_boleta,
            "datos_estado": datos_estado,
            "saldo": math.trunc(datos_saldo["saldo"]),
            "saldo_cotizacion": datos_saldo["monto_cotizacion"],
            "saldo_repuestos": float(saldo_repuestos),
            "datos_cliente": datos_cliente,
            "boleta_msg": boleta_msg,
            "zonas": zonas,
            "repuestos": repuestos,
            "datos_saldo": datos_saldo,
            "formulario": formulario,
        }
        return render_template("boleta.html", **context)


# CRUD MOVIMIENTOS
@kapps_admin.route("/proceso_movimientos", methods=["POST"])
def proceso_movimiento():
    monto = request.form["monto"]
    tipo = request.form["tipo"]
    medio = request.form["medio"]
    id_boleta = request.form["id_boleta"]
    concepto = request.form["concepto"]
    accion = int(request.form["accion"])  # 1 = Ingresar , 2 = Anular
    id_movimiento = request.form["id_movimiento"]
    USUARIO = session["id"]
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SET session time_zone = '-6:00'")
    if accion == 1:  # CREA MOVIMIENTO
        impuesto = request.form["impuesto"]
        cursor.execute(
            "INSERT INTO movimientos (monto, tipo, medio, id_boleta, id_usuario, concepto, estado, impuesto)  VALUES (%s,%s,%s,%s,%s,%s,1,%s)",
            (monto, tipo, medio, id_boleta, USUARIO, concepto, impuesto),
        )
    elif accion == 2:  # ANULAR MOVIMIENTO
        if tipo=="Descuento":
            cursor.execute(
                "UPDATE boletas_descuentos set estado=0, id_usuario_anula=%s, fecha_anula=sysdate()  where id=%s",
                [USUARIO, id_movimiento],
            )
        if tipo=="Cargo" or tipo=="Pago":
            cursor.execute(
                "UPDATE movimientos set estado=0, id_usuario_anula=%s, fecha_anula=sysdate() where id=%s",
                (USUARIO, id_movimiento),
            )
    elif accion == 3:  # INSERTA CARGO y PAGO (SOLO PARA REVISION)
        cursor.execute(
            "INSERT INTO movimientos (monto, tipo, medio, id_boleta, id_usuario, concepto, estado)  VALUES (%s,%s,%s,%s,%s,%s,1)",
            (monto, 5, 0, id_boleta, USUARIO, concepto),
        )
        cursor.execute(
            "INSERT INTO movimientos (monto, tipo, medio, id_boleta, id_usuario, concepto, estado)  VALUES (%s,%s,%s,%s,%s,%s,1)",
            (monto, 1, medio, id_boleta, USUARIO, concepto),
        )
    elif accion == 4:  # VERIFICAR SI HAY PAGOS
        cursor.execute(
            "select ifnull(sum(monto),0) monto from movimientos where id_boleta=%s and estado=1 and tipo=1",
            [id_boleta],
        )
        datos = cursor.fetchone()
        monto_pagos = 0
        if datos is not None:
            monto_pagos = datos["monto"]
        cursor.close()
        return str(monto_pagos)
    mysql.connection.commit()
    cursor.close()
    return "OK"


@kapps_admin.route("/cambio_estado", methods=["POST"])
def cambio_estado():
    id_boleta = int(request.form["id_boleta"])
    tipo_accion = int(request.form["tipo_accion"])
    tipo_accion2 = int(request.form["tipo_accion2"])
    USUARIO = session["id"]
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SET session time_zone = '-6:00'")
    cursor.execute("SELECT username FROM kapps_db.accounts WHERE id = %s", [USUARIO])
    datos = cursor.fetchone()
    if tipo_accion == 0:  # NUEVA
        if tipo_accion2 == 0:  # PASAR BOLETA A PILA DE NUEVAS
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                (id_boleta, 0, USUARIO),
            )
    if tipo_accion == 1:  # DIAGNOSTICO
        if tipo_accion2 == 0:  # PASAR BOLETA A PILA DE DIAGNOSTICO
            # SI LA BOLETA VIENE DE RECHAZOS
            cursor.execute(
                "select id_estado from boletas_estados be1 where id_boleta=%s \
                and id=(select max(id) from boletas_estados be2 where be2.id_boleta=be1.id_boleta);",
                [id_boleta],
            )
            datos = cursor.fetchone()
            if datos["id_estado"] == 7:
                # ACTUALIZA BOLETA ACTUAL - LA MARCA COMO NO RECHAZADA
                cursor.execute(
                    "update boletas set rechazada=0 where id_boleta=%s", [id_boleta]
                )
                # ELIMINA LAS ALERTAS PENDIENTES DE EJECUTAR
                cursor.execute(
                    "update alertas set estado=0 where id_boleta=%s and estado=1",
                    [id_boleta],
                )
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                (id_boleta, 1, USUARIO),
            )
        if tipo_accion2 == 1:  # AGREGAR DIAGNOSTICO
            horas = int(request.form["horas"])
            minutos = int(request.form["minutos"])
            tiempo = horas * 60 + minutos
            descripcion = request.form["descripcion"]
            cursor.execute(
                "INSERT INTO boletas_diagnosticos (id_boleta, descripcion, tiempo, id_usuario) VALUES (%s,%s,%s,%s)",
                [id_boleta, descripcion, tiempo, USUARIO],
            )
        if tipo_accion2 == 2:  # EDITAR DIAGNOSTICO
            fecha = datetime.now().strftime("%Y-%m-%d %I:%M%p")
            descripcion = request.form["descripcion"]
            nuevo_valor = (
                "\n\n" + fecha + " (" + datos["username"] + "): " + descripcion
            )
            cursor.execute(
                "UPDATE boletas_diagnosticos SET descripcion = concat(descripcion,%s) \
                where id_boleta=%s",
                (nuevo_valor, id_boleta),
            )
            cursor.execute(
                "insert into boletas_comentarios (id_boleta, comentario, id_usuario, tipo) values (%s,%s,%s,2)",
                [id_boleta, descripcion, USUARIO],
            )
    if tipo_accion == 2:  # COTIZACION
        if tipo_accion2 == 0:  # PASAR BOLETA A PILA DE COTIZACION
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                (id_boleta, 2, USUARIO),
            )
        if tipo_accion2 == 1:  # VERIFICAR SI TIENE DIAGNOSTICOS
            cursor.execute(
                "select id_boleta from boletas_diagnosticos where id_boleta=%s",
                [id_boleta],
            )
            dato = cursor.fetchone()
            if dato is None:
                return "0"
            else:
                return "1"
        if tipo_accion2 == 2:  # INGRESAR COTIZACION
            comentario = request.form["descripcion"]
            mensaje_cliente = request.form["descripcion_cliente"]
            reparado = request.form["reparado"]
            monto = request.form["monto"]
            cursor.execute(
                "INSERT INTO boletas_cotizaciones (id_boleta, monto, comentario, mensaje_cliente, id_usuario, estado, reparado) \
                    VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (id_boleta, monto, comentario, mensaje_cliente, USUARIO, 1, reparado),
            )
        if tipo_accion2 == 3:  # REVISAR SI EXISTE COTIZACION ACTIVA
            cursor.execute(
                "SELECT * from boletas_cotizaciones where id_boleta=%s and estado=1",
                [id_boleta],
            )
            dato = cursor.fetchone()
            if dato is None:
                return "0"
            else:
                return "1"
        # ANULAR TODAS LAS COTIZACIONES ACTIVAS (SOLO DEBERIA HABER UNA ACTIVA)
        if tipo_accion2 == 4:
            cursor.execute(
                "UPDATE boletas_cotizaciones set estado=0, id_usuario_cambia_estado=%s, fecha_cambia_estado=sysdate() \
                where id_boleta=%s and estado=1",
                [USUARIO, id_boleta],
            )
        # if tipo_accion2 == 5:  # ENVIAR COTIZACION POR CORREO ELECTRONICO
    if tipo_accion == 3:  # ESPERA CC
        if tipo_accion2 == 0:  # PASAR BOLETA A PILA DE ESPERA CC
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                (id_boleta, 3, USUARIO),
            )
        if tipo_accion2 == 1:  # VERIFICAR SI TIENE COTIZACIONES
            cursor.execute(
                "select id_boleta from boletas_cotizaciones where id_boleta=%s and estado=1",
                [id_boleta],
            )
            dato = cursor.fetchone()
            if dato is None:
                return "0"
            else:
                return "1"
    if tipo_accion == 4:  # REPARACION
        if tipo_accion2 == 0:  # PASAR BOLETA A PILA DE REPARACION
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                (id_boleta, 4, USUARIO),
            )
        if tipo_accion2 == 1:  # VERIFICAR SI EL REPUESTO EXISTE EN EL CATALOGO
            REPUESTO = request.form["repuesto"].upper().strip()
            cursor.execute("select id from repuestos where nombre=%s", [REPUESTO])
            dato = cursor.fetchone()
            cursor.execute("select if(boleta_original<>0,1,0) garantia from boletas where id_boleta = %s", [id_boleta])
            dgarantia = cursor.fetchone()
            cursor.close()
            if dato is None:
                return "0" + str(dgarantia["garantia"])
            else:
                return "1" + str(dgarantia["garantia"])
        if tipo_accion2 == 2:  # INGRESA REPUESTO A LA BOLETA
            REPUESTO = request.form["repuesto"].upper().strip()
            TIPO_REPUESTO = request.form["tipo_repuesto"]
            UNIDADES = request.form["repuesto_unidades"]
            COSTO = int(request.form["repuesto_costo"])
            COSTO_F = int(request.form["repuesto_costo_f"])
            UNIDADES = int(request.form["repuesto_unidades"])
            PROVEEDOR = request.form["repuesto_proveedor"]
            cursor.execute("SELECT id FROM repuestos WHERE nombre = %s", [REPUESTO])
            datos = cursor.fetchone()
            cursor.execute(
                "insert into boletas_repuestos (id_boleta,id_repuesto, costo, costo_factura, cantidad,tipo_repuesto,id_usuario,estado, proveedor) \
                    values (%s,%s,%s,%s,%s,%s,%s,1,%s)",
                [
                    id_boleta,
                    datos["id"],
                    COSTO,
                    COSTO_F,
                    UNIDADES,
                    TIPO_REPUESTO,
                    USUARIO,
                    PROVEEDOR,
                ],
            )
            cursor.execute(
                "select max(id) id from boletas_repuestos where id_boleta=%s",
                [id_boleta],
            )
            dato = cursor.fetchone()
            mysql.connection.commit()
            cursor.close()
            if dato is None:
                return "0"
            else:
                return str(dato["id"])
        if tipo_accion2 == 3:  # ANULA REPUESTO A LA BOLETA
            ID_REPUESTO = request.form["id_repuesto"]
            cursor.execute(
                "insert into inv_lotes_log (id_lote, tipo, unidades, id_usuario, parametro, comentario,monto_sin_impuestos, impuestos) \
                 select id_lote, 4 , unidades, %s, parametro, comentario,monto_sin_impuestos, impuestos from inv_lotes_log WHERE tipo=3 and parametro=%s and comentario = %s",
                [USUARIO, id_boleta, ID_REPUESTO],
            )
            cursor.execute(
                "select id_lote, unidades from inv_lotes_log WHERE tipo=3 and parametro=%s and comentario = %s",
                [id_boleta, ID_REPUESTO],
            )
            datos = cursor.fetchall()
            for row in datos:
                cursor.execute(
                    "update inv_lotes set disponibilidad = disponibilidad + %s, disponible=1 WHERE id=%s",
                    [row["unidades"], row["id_lote"]],
                )
            cursor.execute(
                "update boletas_repuestos set estado=0,fecha_modifica=sysdate(),id_usuario_modifica=%s \
                    WHERE id_boleta=%s and id = %s",
                [USUARIO, id_boleta, ID_REPUESTO],
            )
    if tipo_accion == 5:  # LISTO PARA RETIRO
        if tipo_accion2 == 0:  # PASAR BOLETA A PILA DE LISTO PARA RETIRO
            tiempo = int(request.form["horas"]) * 60 + int(request.form["minutos"])
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario, tiempo ) \
                    VALUES (%s,%s,%s,%s)",
                (id_boleta, 5, USUARIO, tiempo),
            )
        if tipo_accion2 == 1:  # VERIFICAR SI TIENE COSTOS DE REPUESTOS
            cursor.execute(
                "select id_boleta from boletas_repuestos where id_boleta=%s and estado=1",
                [id_boleta],
            )
            dato = cursor.fetchone()
            if dato is None:
                return "0"
            else:
                return "1"
    if tipo_accion == 6:  # FACTURAR
        if tipo_accion2 == 0:  # PASAR BOLETA A PILA DE FACTURAR
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                (id_boleta, 6, USUARIO),
            )
        if tipo_accion2 == 1:  # VERIFICAR SI TIENE COSTOS DE REPUESTOS
            cursor.execute(
                "select id_boleta from boletas_repuestos where id_boleta=%s and estado=1",
                [id_boleta],
            )
            dato = cursor.fetchone()
            if dato is None:
                return "0"
            else:
                return "1"
        if tipo_accion2 == 2:  # REGISTRAR RETIRO DEL EQUIPO
            cursor.execute(
                "UPDATE boletas set equipo_retirado=1, equipo_retirado_fecha=sysdate(), equipo_retirado_id_usuario=%s \
                    where id_boleta=%s",
                (USUARIO, id_boleta),
            )
            # SI LA BOLETA VIENE DE RECHAZOS, ACTUALIZA ESTADO A FACTURAR (RETIRADO SIN FACTURAR)
            cursor.execute(
                "select id_estado from boletas_estados be1 where id_boleta=%s \
                and id=(select max(id) from boletas_estados be2 where be2.id_boleta=be1.id_boleta);",
                [id_boleta],
            )
            datos = cursor.fetchone()
            if datos["id_estado"] == 7:
                # ACTUALIZA ESTADO DE BOLETA A "FACTURAR"
                cursor.execute(
                    "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                    (id_boleta, 6, USUARIO),
                )
                # ELIMINA LAS ALERTAS PENDIENTES DE EJECUTAR, SI EXISTIESEN
                cursor.execute(
                    "update alertas set estado=0 where id_boleta=%s and estado=1",
                    [id_boleta],
                )
        if tipo_accion2 == 3:  # ANULAR COMPROBANTE
            sql = (
                "select id from boletas_comprobantes where id_boleta="
                + str(id_boleta)
                + " and estado=1"
            )
            cursor.execute(sql)
            datos = cursor.fetchone()
            id_comprobante = datos["id"]
            cursor.execute(
                "UPDATE boletas_comprobantes set estado=0, fecha_anula=sysdate(),id_usuario_anula=%s where id=%s",
                [USUARIO, id_comprobante],
            )
            # ANULA LOS DESCUENTOS
            cursor.execute(
                "update boletas_descuentos set estado=0 where id_comprobante=%s",
                [id_comprobante],
            )
        if tipo_accion2 == 4:  # CREAR COMPROBANTE
            crea_comprobante(id_boleta)
        if (
            tipo_accion2 == 5
        ):  # GUARDA DETALLE FACTURA, MARCA COMPROBANTE,  MARCA BOLETA y CIERRA LA BOLETA
            factura = request.form["factura"]
            sql = (
                "select id from boletas_comprobantes where id_boleta="
                + str(id_boleta)
                + " and estado=1"
            )
            cursor.execute(sql)
            datos = cursor.fetchone()
            id_comprobante = datos["id"]
            # GUARDA DETALLE FACTURA
            cursor.execute(
                "insert into boletas_facturas (id_boleta, factura, id_comprobante, concepto, monto, impuestos) \
                    select %s, %s , id_comprobante, concepto, monto-descuento, impuestos from boletas_comprobantes_detalle where id_comprobante=%s",
                [id_boleta, factura, id_comprobante],
            )
            # MARCA COMPROBANTE
            cursor.execute(
                "update boletas_comprobantes set facturado=1 where id=%s",
                [id_comprobante],
            )
            # MARCA BOLETA Y CIERRA LA BOLETA
            cursor.execute(
                "update boletas set facturada=1, factura_id_usuario=%s, factura_fecha=sysdate(), cerrada=1,cierre_id_usuario=%s,cierre_fecha=sysdate() where id_boleta=%s",
                [USUARIO, USUARIO, id_boleta],
            )
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                (id_boleta, 10, USUARIO),
            )
    if tipo_accion == 7:  # CIERRE ANTICIPADO
        cierre_comentario = request.form["cierre_comentario"]
        # ANULA COTIZACION ACTIVA
        cursor.execute(
            "update boletas_cotizaciones set estado=0, id_usuario_cambia_estado=%s, fecha_cambia_estado=sysdate() where id_boleta=%s",
            [USUARIO, id_boleta],
        )
        # ANULA REPUESTOS ACTIVOS
        cursor.execute(
            "update boletas_repuestos set estado=0, id_usuario_modifica=%s, fecha_modifica=sysdate() where id_boleta=%s",
            [USUARIO, id_boleta],
        )
        # VERIFICA SI TIENE PAGOS (SI APLICA PARA FACTURAR O NO)
        cursor.execute(
            "select ifnull(sum(monto),0) monto from movimientos where id_boleta=%s and estado=1 and tipo=1",
            [id_boleta],
        )
        datos = cursor.fetchone()
        monto_pagos = 0
        if datos is not None:
            monto_pagos = datos["monto"]
        # MARCA BOLETA (SI APLICA PARA FACTURA O SI NO)
        if monto_pagos > 0:
            cursor.execute(
                "update boletas set equipo_retirado=1, equipo_retirado_fecha=sysdate(), cierre_anticipado=1, equipo_retirado_id_usuario = %s \
                , cierre_comentario=%s where id_boleta = %s",
                (USUARIO, cierre_comentario, id_boleta),
            )
            crea_comprobante(id_boleta)
            # CAMBIA ESTADO A FACTURACION
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                (id_boleta, 6, USUARIO),
            )
        else:
            cursor.execute(
                "update boletas set equipo_retirado=1, equipo_retirado_fecha=sysdate(), cierre_anticipado=1, equipo_retirado_id_usuario = %s \
                , cierre_comentario=%s, sin_pagos=1, cierre_fecha=sysdate(), cerrada=1, cierre_id_usuario=%s where id_boleta = %s",
                (USUARIO, cierre_comentario, USUARIO, id_boleta),
            )
            # CAMBIA ESTADO A CERRADA
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
                (id_boleta, 10, USUARIO),
            )
    if tipo_accion == 8:  # APLICAR GARANTIA
        # INGRESO DE INFORMACION ANTERIOR EN NUEVA BOLETA
        cursor.execute(
            "insert into boletas (id_cliente, id_marca , id_tipo_equipo, motivo_cliente, comentario, id_condicion, boleta_tipo , boleta_original ,modelo, serie, id_usuario ) \
                select id_cliente, id_marca , id_tipo_equipo, motivo_cliente, comentario, id_condicion,1,id_boleta, modelo, serie, %s from boletas \
                where id_boleta=%s;",
            [USUARIO, id_boleta],
        )
        # SACA EL MAXIMO DE LA BOLETA CREADA
        cursor.execute(
            "select max(id_boleta) id_boleta from boletas where id_usuario = %s",
            [USUARIO],
        )
        datos = cursor.fetchone()
        id_nueva_boleta = datos["id_boleta"]
        # ACTUALIZA BOLETA ACTUAL CON LOS DATOS DE LA GARANTIA
        cursor.execute(
            "update boletas set boleta_tipo=1, boleta_garantia=%s where id_boleta=%s",
            (id_nueva_boleta, id_boleta),
        )
        # INSERTA EL CAMBIO DE ESTADO A "NUEVO" PARA LA BOLETA NUEVA
        cursor.execute(
            "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
            (id_nueva_boleta, 0, USUARIO),
        )
    if tipo_accion == 9:  # RECHAZO
        if tipo_accion2 == 0:
            cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
            # INSERTA EL CAMBIO DE ESTADO A "RECHAZADA"
            cursor.execute(
                "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                        VALUES (%s,%s,%s)",
                (id_boleta, 7, USUARIO),
            )
            # PROGRAMA LAS ALERTAS (ENVIO DEL CORREO al septimo y catorceavo dia, y alerta al usuario cuando debe desecharse)
            cursor.execute(
                "INSERT INTO alertas (id_boleta, id_alerta_conf, estado ) \
                        VALUES (%s,%s,%s)",
                (id_boleta, 1, 1),
            )
            cursor.execute(
                "INSERT INTO alertas (id_boleta, id_alerta_conf, estado ) \
                        VALUES (%s,%s,%s)",
                (id_boleta, 2, 1),
            )
            cursor.execute(
                "INSERT INTO alertas (id_boleta, id_alerta_conf, estado ) \
                        VALUES (%s,%s,%s)",
                (id_boleta, 3, 1),
            )
            comentario = request.form["comentario"]
            # SACA EL EMAIL PARA ENVIAR Y NOTIFICAR AL CLIENTE
            cursor.execute(
                "SELECT correo from tx_clientes where id = (select id_cliente from boletas where id_boleta=%s)",
                [id_boleta],
            )
            datos = cursor.fetchone()
            if datos is None:
                return "NO-CORREO"
            else:
                destinatario = str(datos["correo"])
                envio_correo(5, destinatario, adjunto="", extra="")
            cursor.execute(
                "insert into boletas_comentarios (id_boleta, comentario, id_usuario, tipo) values (%s,%s,%s,4)",
                [
                    id_boleta,
                    "Motivo: " + comentario + "  [Enviada a " + destinatario + " ]",
                    USUARIO,
                ],
            )
            # ACTUALIZA BOLETA ACTUAL Y LA MARCA COMO RECHAZADA
            cursor.execute(
                "update boletas set rechazada=1, fecha_rechazada=sysdate(), usuario_rechaza=%s where id_boleta=%s",
                (USUARIO, id_boleta),
            )
        if tipo_accion2 == 1:  # CONSULTA DE MENSAJE
            cursor.execute(
                "select contenido from datos where id=10",
            )
            resultado = cursor.fetchone()
            cursor.close()
            # mensaje = urllib.parse.quote(resultado["contenido"])
            mensaje = resultado["contenido"]
            print(mensaje)
            return mensaje
    if tipo_accion == 10:  # ALERTAS
        if tipo_accion2 == 0:
            id_alerta = int(request.form["id_alerta"])
            cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(
                "update alertas set fecha_aceptada=sysdate(), id_usuario_aceptada=%s where id=%s",
                (USUARIO, id_alerta),
            )
    if tipo_accion == 11:  # CIERRE SIN PAGOS
        # ANULA COTIZACION ACTIVA
        cursor.execute(
            "update boletas_cotizaciones set estado=0, id_usuario_cambia_estado=%s, fecha_cambia_estado=sysdate() where id_boleta=%s",
            [USUARIO, id_boleta],
        )
        # ANULA REPUESTOS ACTIVOS
        cursor.execute(
            "update boletas_repuestos set estado=0, id_usuario_modifica=%s, fecha_modifica=sysdate() where id_boleta=%s",
            [USUARIO, id_boleta],
        )
        cursor.execute(
            "update boletas set sin_pagos=1, cierre_fecha=sysdate(), cerrada=1, cierre_id_usuario=%s where id_boleta = %s",
            (USUARIO, id_boleta),
        )
        # ANULA CARGOS ACTIVOS
        cursor.execute(
            "update movimientos set estado=0, id_usuario_anula=%s, fecha_anula=sysdate() where id_boleta=%s and tipo in (2,5)",
            [USUARIO, id_boleta],
        )
        # ELIMINA LAS ALERTAS PENDIENTES DE EJECUTAR
        cursor.execute(
            "update alertas set estado=0 where id_boleta=%s and estado=1",
            [id_boleta],
        )
        # CAMBIA ESTADO A CERRADA
        cursor.execute(
            "INSERT INTO boletas_estados (id_boleta, id_estado, id_usuario ) \
                    VALUES (%s,%s,%s)",
            (id_boleta, 10, USUARIO),
        )
    if tipo_accion == 12:  # DESCUENTOS
        datos_saldo = datos_base.datos_saldo(mysql, id_boleta)
        monto_factura = (
            0  # Monto del Rubro en la Factura donde se requiere aplicar el descuento
        )
        if tipo_accion2 == 0:  # AGREGAR DESCUENTO
            descuento_monto = float(request.form["descuento_monto"])
            descuento_tipo = int(request.form["descuento_tipo"])
            descuento_motivo = request.form["descuento_motivo"]
            if descuento_tipo == 1:  ## MANO DE OBRA
                monto_factura = datos_saldo["mano_de_obra"]
            if descuento_tipo == 2:  ## REPUESTOS NUEVOS
                monto_factura = datos_saldo["total_repuestos_nuevos"]
            if descuento_tipo == 3:  ## REPUESTOS USADOS
                monto_factura = datos_saldo["total_repuestos_usados"]
            if descuento_tipo == 4:  ## BODEGAJE
                monto_factura = datos_saldo["bodegaje_monto"]
            if descuento_monto > float(
                monto_factura
            ):  # VERIFICA QUE EL DESCUENTO A APLICAR SEA CONGRUENTE
                cursor.close()
                return "E-valor-mayor"
            else:
                cursor.execute(
                    "select monto from boletas_descuentos where id_boleta=%s and id_tipo_descuento=%s and estado=1",
                    (id_boleta, descuento_tipo),
                )
                datos = cursor.fetchone()
                if datos is not None:
                    cursor.close()
                    return "E-ya-existe"
                else:
                    cursor.execute(
                        "INSERT INTO boletas_descuentos (id_tipo_descuento, id_boleta, monto, fecha_creacion, id_usuario, estado, motivo) \
                        VALUES (%s,%s,%s, sysdate(),%s,1,%s)",
                        (
                            descuento_tipo,
                            id_boleta,
                            descuento_monto,
                            USUARIO,
                            descuento_motivo,
                        ),
                    )
    mysql.connection.commit()
    cursor.close()
    return "ok"


@kapps_admin.route("/set_impresiones", methods=["POST"])
def set_impresiones():
    session["impresiones"] = request.form["copias"]
    return "OK"


def crea_comprobante(id_boleta):
    USUARIO = session["id"]
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    datos_comprobante = datos_base.datos_saldo(mysql, id_boleta)
    # CREA EL COMPROBANTE
    cursor.execute(
        "insert into boletas_comprobantes (id_boleta, id_usuario, monto, descuentos, impuestos, estado, tipo_cliente) values (%s,%s,%s,%s,%s,1,%s)",
        [
            id_boleta,
            USUARIO,
            datos_comprobante["total_monto_factura"],
            datos_comprobante["total_descuentos"],
            datos_comprobante["total_monto_factura_impuesto"],
            datos_comprobante["tipo_cliente"],
        ],
    )
    sql = (
        "select max(id) id from boletas_comprobantes where id_boleta="
        + str(id_boleta)
        + " and estado=1"
    )
    cursor.execute(sql)
    datos = cursor.fetchone()
    id_comprobante = datos["id"]
    # COMPROBANTE DETALLE: AGREGA MANO DE OBRA y OTROS SERVICIOS
    cursor.execute(
        "insert into boletas_comprobantes_detalle (id_comprobante, concepto, monto, descuento, impuestos) \
                values(%s,%s,%s,%s,%s)",
        [
            id_comprobante,
            "Mano de Obra",
            datos_comprobante["mano_de_obra"],
            datos_comprobante["mano_de_obra_descuento"],
            datos_comprobante["mano_de_obra_impuesto"],
        ],
    )
    for row in datos_comprobante["tabla_factura"]:
        if row["monto"] > 0:
            cursor.execute(
                "insert into boletas_comprobantes_detalle (id_comprobante, concepto, monto, descuento, impuestos) \
                    values(%s,%s,%s,%s,%s)",
                [
                    id_comprobante,
                    row["concepto"],
                    row["monto"],
                    row["descuento"],
                    row["impuesto"],
                ],
            )
    # COMPROBANTE DETALLE: AGREGA BODEGAJE
    if datos_comprobante["bodegaje_monto"] > 0:
        cursor.execute(
            "insert into boletas_comprobantes_detalle (id_comprobante, concepto, monto, descuento, impuestos) \
                    values(%s,%s,%s,%s,%s)",
            [
                id_comprobante,
                datos_comprobante["bodegaje_concepto"],
                datos_comprobante["bodegaje_monto"],
                datos_comprobante["bodegaje_descuento"],
                datos_comprobante["bodegaje_monto_impuesto"],
            ],
        )
    mysql.connection.commit()
    cursor.close()
    return "Ok"


@kapps_admin.route("/impresion_boleta/<string:id_boleta>/<int:tipo>")
def impresion_boleta(id_boleta, tipo):
    if tipo == 1:
        copias = int(session["impresiones"])
        return render_template(
            "pdfs/pdf_boleta_numero.html", id_boleta=id_boleta, copias=copias
        )


# PDFS Y DESCARGA


@kapps_admin.route(
    "/pdfs_online/<string:id_boleta>/<int:tipo_accion>/<int:extra>",
    methods=["GET", "POST"],
)
def pdfs_online(id_boleta, tipo_accion, extra):
    if tipo_accion == 1:  # DESCARGAR MOVIMIENTO PDF
        pdf = MyFPDF(unit="mm", format=(73, 200))
        pdf.set_margins(6, 1, 4)
        pdf.add_page()
        pdf.set_x(1)
        pdf.set_y(3)
        pdf.set_font("arial", size=10)
        mov = datos_base.datos_movimiento_unico(mysql, extra)  # extra=id_movimiento
        html_source = render_template(
            "pdfs/movimiento.html", id_boleta=id_boleta, mov=mov, empresa=session["kapp"], representante =session["Representante"], representante_id =session["Representante_Id"], contacto =session["Contacto"]
        )
        pdf.write_html(html_source)
        response = make_response(pdf.output(dest="S").encode("latin-1"))
        response.headers.set(
            "Content-Disposition",
            "attachment",
            filename="recibo_" + str(extra) + "_boleta_" + id_boleta + ".pdf",
        )
        response.headers.set("Content-Type", "application/pdf")
        return response
    if tipo_accion == 2:  # DESCARGAR BOLETA PDF
        pdf = boleta_pdf(id_boleta)
        response = make_response(pdf.output(dest="S").encode("latin-1"))
        response.headers.set(
            "Content-Disposition",
            "attachment",
            filename="boleta_" + str(id_boleta) + ".pdf",
        )
        response.headers.set("Content-Type", "application/pdf")
        return response
    if tipo_accion == 3:  # PARA IMPRIMIR EL NUMERO DE BOLETA
        boleta = datos_base.datos_boleta_impresion(mysql, id_boleta)
        return render_template("pdfs/boleta.html", id_boleta=id_boleta, boleta=boleta)
        # return kapps_admin.root_path
    if tipo_accion == 4:  # DESCARGAR COTIZACION PDF
        cotizacion = cotizacion_pdf(id_boleta)
        pdf = cotizacion[0]
        response = make_response(pdf.output(dest="S").encode("latin-1"))
        response.headers.set(
            "Content-Disposition",
            "attachment",
            filename="cotizacion_"
            + str(cotizacion[1])
            + "_boleta_"
            + id_boleta
            + ".pdf",
        )
        response.headers.set("Content-Type", "application/pdf")
        return response
    if tipo_accion == 5:  # DESCARGAR COMPROBANTE PROVISIONAL
        factura = comprobante_pdf(id_boleta)
        pdf = factura[0]
        response = make_response(pdf.output(dest="S").encode("latin-1"))
        response.headers.set(
            "Content-Disposition",
            "attachment",
            filename="comprobante_" + str(factura[1]) + "_boleta_" + id_boleta + ".pdf",
        )
        response.headers.set("Content-Type", "application/pdf")
        return response
    if tipo_accion == 6:  # DESCARGAR COMPROBANTE VENTA PROVISIONAL
        id_venta = id_boleta
        factura = comprobante_venta_pdf(id_venta)
        pdf = factura
        response = make_response(pdf.output(dest="S").encode("latin-1"))
        response.headers.set(
            "Content-Disposition",
            "attachment",
            filename="comprobante_" + str(id_venta) + "_venta.pdf",
        )
        response.headers.set("Content-Type", "application/pdf")
        return response


# PDFS Y ENVIO POR CORREO


@kapps_admin.route("/pdfs_mail", methods=["POST"])
def pdfs_mail():
    tipo_accion = int(request.form["tipo_accion"])
    id_boleta = int(request.form["id_boleta"])
    id_cliente = int(request.form["id_cliente"])
    pdf = MyFPDF()
    pdf.add_page()
    pdf.set_font("arial", size=10)
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute('SET lc_time_names = "es_ES"')
    cursor.execute("SELECT correo from tx_clientes where id = %s", [id_cliente])
    datos = cursor.fetchone()
    cursor.close()
    if datos is None:
        return "NO-CORREO"
    else:
        destinatario = str(datos["correo"])
    if tipo_accion == 1:  # ENVIAR MOVIMIENTO PDF POR CORREO
        id_movimiento = int(request.form["id_movimiento"])
        mov = datos_base.datos_movimiento_unico(mysql, id_movimiento)
        html_source = render_template(
            "pdfs/movimiento.html", id_boleta=id_boleta, mov=mov
        )
        pdf.write_html(html_source)
        archivo = (
            kapps_admin.root_path
            + "\\templates\pdf_repository\\recibo_"
            + str(id_movimiento)
            + ".pdf"
        )
        pdf.output(archivo, "F")
        mysql.connection.commit()
        envio_correo(1, destinatario, archivo, str(id_movimiento))
        return "Enviado"
    if tipo_accion == 2:  # ENVIAR BOLETA PDF POR CORREO
        pdf = boleta_pdf(id_boleta)
        archivo = (
            kapps_admin.root_path
            + "\\templates\pdf_repository\\boleta_"
            + str(id_boleta)
            + ".pdf"
        )
        pdf.output(archivo, "F")
        mysql.connection.commit()
        envio_correo(2, destinatario, archivo, str(id_boleta))
        return "Enviado"
    if tipo_accion == 3:  # ENVIAR COTIZACION PDF POR CORREO
        cotizacion = cotizacion_pdf(id_boleta)
        pdf = cotizacion[0]
        archivo = (
            kapps_admin.root_path
            + "\\templates\pdf_repository\\cotizacion_"
            + str(cotizacion[1])
            + ".pdf"
        )
        pdf.output(archivo, "F")
        print("ANTES DE ENVIAR EL CORREO")
        envio_correo(3, destinatario, archivo, str(cotizacion[1]))
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute(
            'select concat("Por ¢",FORMAT(monto,"Currency")) monto from boletas_cotizaciones where id_boleta=%s and estado=1',
            [id_boleta],
        )
        datos = cursor.fetchone()
        monto = datos["monto"]
        cursor.execute(
            "select username from kapps_db.accounts where id=%s", str(session["id"])
        )
        datos = cursor.fetchone()
        username = datos["username"]
        dato_nuevo = (
            datetime.now().strftime("%Y-%m-%d %I:%M%p")
            + " "
            + destinatario
            + " ("
            + username
            + ");"
        )
        sql = (
            'UPDATE boletas_cotizaciones set correo_envio = concat(ifnull(correo_envio,""),"'
            + dato_nuevo
            + '") where id_boleta='
            + str(id_boleta)
            + " and estado=1"
        )
        cursor.execute(sql)
        print(monto + " Enviada a " + destinatario)
        cursor.execute(
            "insert into boletas_comentarios (id_boleta, comentario, id_usuario, tipo) values (%s,%s,%s,3)",
            [id_boleta, monto + " Enviada a " + destinatario, session["id"]],
        )
        mysql.connection.commit()
        cursor.close()
        return "Enviado"
    if tipo_accion == 4:  # ENVIAR COMPROBANTE PDF POR CORREO
        comprobante = comprobante_pdf(id_boleta)
        pdf = comprobante[0]
        archivo = (
            kapps_admin.root_path
            + "\\templates\pdf_repository\\comprobante_"
            + str(comprobante[1])
            + ".pdf"
        )
        pdf.output(archivo, "F")
        envio_correo(4, destinatario, archivo, str(comprobante[1]))
        return "Enviado"
    if tipo_accion == 5:  # ENVIAR COMPROBANTE DE VENTA PDF POR CORREO
        id_venta = id_boleta
        comprobante = comprobante_venta_pdf(id_venta)
        pdf = comprobante
        archivo = (
            kapps_admin.root_path
            + "\\templates\pdf_repository\\comprobante_venta_"
            + str(id_venta)
            + ".pdf"
        )
        pdf.output(archivo, "F")
        envio_correo(7, destinatario, archivo, id_venta)
        return "Enviado"


# CREA PDF BOLETA


def boleta_pdf(id_boleta):
    pdf = MyFPDF(unit="mm", format=(73, 275))
    pdf.add_page()
    pdf.set_font("arial", size=10)
    boleta = datos_base.datos_boleta_impresion(mysql, id_boleta)
    fecha_split = boleta["fecha"].split(" ")
    fecha = fecha_split[0]
    hora = fecha_split[1]
    # CREACION DEL PDF
    pdf.set_margins(6, 1, 4)
    pdf.set_x(1)
    pdf.set_y(3)
    pdf.set_font_size(13)
    pdf.multi_cell(w=0, h=4, txt=session["kapp"], align="C")
    pdf.set_font_size(11)
    pdf.multi_cell(w=0, h=4, txt=session["Representante"] +' CED:' + session["Representante_Id"], align="C")
    pdf.set_font_size(9)
    pdf.multi_cell(w=0, h=4, txt=session["Contacto"], align="C")
    pdf.line(1, pdf.get_y(), 71, pdf.get_y())
    pdf.set_font_size(12)
    pdf.multi_cell(w=0, h=5, txt="Boleta N° " + str(id_boleta), align="C")
    if boleta["boleta_tipo"] == 1 and boleta["boleta_original"] != 0:
        pdf.multi_cell(w=0, h=5, txt="GARANTIA", align="C")
    pdf.set_font_size(10)
    pdf.multi_cell(w=0, h=5, txt="Fecha: " + fecha, align="C")
    pdf.line(1, pdf.get_y(), 71, pdf.get_y())
    pdf.set_x(1)
    pdf.set_font_size(9)
    pdf.multi_cell(
        w=0, h=5, txt=boleta["nombres"] + " " + boleta["apellidos"], align="C"
    )
    pdf.multi_cell(w=0, h=5, txt="Cliente: " + str(boleta["id_cliente"]), align="C")
    pdf.line(1, pdf.get_y(), 71, pdf.get_y())
    pdf.multi_cell(w=0, h=5, txt="EQUIPO: " + boleta["tipo_equipo"], align="L")
    pdf.multi_cell(w=0, h=4, txt="MARCA: " + boleta["marca"], align="L")
    pdf.multi_cell(w=0, h=4, txt="MODELO: " + boleta["modelo"], align="L")
    pdf.multi_cell(w=0, h=4, txt="SERIE: " + boleta["serie"], align="L")
    pdf.multi_cell(w=0, h=4, txt="CONDICION: " + boleta["condicion"], align="L")
    pdf.line(1, pdf.get_y(), 71, pdf.get_y())
    pdf.multi_cell(w=0, h=4, txt="MOTIVO: " + boleta["motivo_cliente"], align="L")
    pdf.multi_cell(w=0, h=4, txt="COMENTARIO: " + boleta["comentario"], align="L")
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Dias hábiles estimados para entrega de Cotización: "
        + str(boleta["dias_habiles"]),
        align="L",
    )
    pdf.line(1, pdf.get_y(), 71, pdf.get_y())
    # EXTRACCION DEL TEXTO PARA CONTRATO EN BOLETA
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT contenido from datos where id = 1")
    datos = cursor.fetchone()
    cursor.close()
    contrato = datos["contenido"]
    contrato = contrato.replace("Ddia", fecha)
    contrato = contrato.replace("Hhora", hora)
    contrato = contrato.replace(
        "Ccliente", boleta["nombres"] + " " + boleta["apellidos"], 1
    )
    pdf.set_font_size(9)
    pdf.multi_cell(w=0, h=4, txt=contrato, align="J")
    pdf.multi_cell(w=0, h=4, txt="", align="C")
    pdf.line(11, pdf.get_y() + 6, 61, pdf.get_y() + 6)
    pdf.ln(h=7)
    pdf.multi_cell(w=0, h=4, txt="Firma Cliente", align="C")
    pdf.ln(h=1)
    pdf.multi_cell(w=0, h=4, txt="Emitida por: " + boleta["username"], align="L")
    return pdf


# CREA PDF COTIZACION


def cotizacion_pdf(id_boleta):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    # MENSAJE DE CUENTAS U OTROS
    cursor.execute("SELECT contenido from datos where id = 12")
    datos = cursor.fetchone()
    mensaje_cuentas = datos["contenido"]
    # INFO COTIZACION
    cursor.execute(
        'select co.id, date_format(fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha, monto, comentario, mensaje_cliente, a1.username, co.estado, ifnull(correo_envio,"-") correo_envio \
                        , date_format(fecha_cambia_estado,"%%Y-%%b-%%d %%h:%%i%%p") fecha_cambia_estado, a2.username username_cambia_estado \
                        from boletas_cotizaciones co left join kapps_db.accounts a1 on co.id_usuario=a1.id \
                        left join kapps_db.accounts a2 on co.id_usuario_cambia_estado=a2.id \
                        where id_boleta=%s and co.estado=1',
        [id_boleta],
    )
    datos = cursor.fetchone()
    id_cotizacion = datos["id"]
    pdf = MyFPDF(unit="mm", format=(100, 220))
    pdf.add_page()
    pdf.set_font("arial", size=10)
    boleta = datos_base.datos_boleta_impresion(mysql, id_boleta)
    fecha_split = datos["fecha"].split(" ")
    fecha = fecha_split[0]
    # hora = fecha_split[1]
    # CREACION DEL PDF
    pdf.set_margins(6, 1, 4)
    pdf.set_x(1)
    pdf.set_y(3)
    pdf.set_font_size(13)
    pdf.multi_cell(w=0, h=4, txt="ELECTRONICA TORRES", align="C")
    pdf.set_font_size(11)
    pdf.multi_cell(w=0, h=4, txt="GERARDO TORRES. CED:5-0293-0031", align="C")
    pdf.set_font_size(9)
    pdf.multi_cell(w=0, h=4, txt="TELs. 2101-2389 / 6022-6611", align="C")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.set_font_size(12)
    pdf.multi_cell(w=0, h=5, txt="Cotización N° " + str(id_cotizacion), align="C")
    pdf.multi_cell(w=0, h=5, txt="Para Boleta " + str(id_boleta), align="C")
    pdf.set_font_size(10)
    pdf.multi_cell(w=0, h=5, txt="Fecha: " + fecha, align="C")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.set_x(1)
    pdf.set_font_size(9)
    pdf.multi_cell(
        w=0, h=5, txt=boleta["nombres"] + " " + boleta["apellidos"], align="C"
    )
    pdf.multi_cell(w=0, h=5, txt="Cliente: " + str(boleta["id_cliente"]), align="C")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.multi_cell(w=0, h=5, txt="EQUIPO: " + boleta["tipo_equipo"], align="L")
    pdf.multi_cell(w=0, h=4, txt="MARCA: " + boleta["marca"], align="L")
    pdf.multi_cell(w=0, h=4, txt="MOTIVO: " + boleta["motivo_cliente"], align="L")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.multi_cell(
        w=0, h=4, txt="Cotización por: " + datos["mensaje_cliente"], align="L"
    )
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Monto Cotización:            ¢ " + str("{:0,.2f}".format(datos["monto"])),
        align="L",
    )
    # EXTRAE INFORMACION DE LA COTIZACION
    datos_cotizacion = datos_base.datos_saldo(mysql, id_boleta)
    monto_cargos = datos_cotizacion["monto_otros_cargos"]
    monto_pagos = datos_cotizacion["monto_pagos"]
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Otros Cargos:                  ¢ " + str("{:0,.2f}".format(monto_cargos)),
        align="L",
    )
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Adelanto Revisión/Otros: ¢ " + str("{:0,.2f}".format(monto_pagos)),
        align="L",
    )
    pdf.ln(h=5)
    pdf.set_font_size(13)
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Total a Pagar: ¢ "
        + str("{:0,.2f}".format(datos["monto"] - monto_pagos + monto_cargos)),
        align="L",
    )
    # datos_saldo = datos_saldo - saldo_cotizacion_monto + monto_revision
    pdf.multi_cell(w=0, h=4, txt="", align="C")
    pdf.set_font_size(10)
    pdf.multi_cell(
        w=0,
        h=4,
        txt=mensaje_cuentas,
        align="L",
    )
    return pdf, id_cotizacion


# CREA PDF COMPROBANTE


def comprobante_pdf(id_boleta):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute('SET lc_time_names = "es_ES"')
    cursor.execute(
        'select co.id, date_format(fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha, monto, descuentos, impuestos, a1.username \
                        from boletas_comprobantes co left join kapps_db.accounts a1 on co.id_usuario=a1.id \
                        where id_boleta=%s and co.estado=1',
        [id_boleta],
    )
    datos = cursor.fetchone()
    id_comprobante = datos["id"]
    pdf = MyFPDF(unit="mm", format=(100, 190))
    pdf.add_page()
    pdf.set_font("arial", size=10)
    boleta = datos_base.datos_boleta_impresion(mysql, id_boleta)
    fecha_split = datos["fecha"].split(" ")
    fecha = fecha_split[0]
    # hora = fecha_split[1]
    # CREACION DEL PDF
    pdf.set_margins(6, 1, 4)
    pdf.set_x(1)
    pdf.set_y(3)
    pdf.set_font_size(13)
    pdf.multi_cell(w=0, h=4, txt="ELECTRONICA TORRES", align="C")
    pdf.set_font_size(11)
    pdf.multi_cell(w=0, h=4, txt="GERARDO TORRES. CED:5-0293-0031", align="C")
    pdf.set_font_size(9)
    pdf.multi_cell(w=0, h=4, txt="TELS. 2101-2389 / 6022-6611", align="C")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.set_font_size(12)
    pdf.multi_cell(
        w=0, h=5, txt="Comprobante Provisional N° " + str(id_comprobante), align="C"
    )
    pdf.multi_cell(w=0, h=5, txt="Para Boleta " + str(id_boleta), align="C")
    pdf.set_font_size(10)
    pdf.multi_cell(w=0, h=5, txt="Fecha: " + fecha, align="C")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.set_x(1)
    pdf.set_font_size(9)
    pdf.multi_cell(
        w=0, h=5, txt=boleta["nombres"] + " " + boleta["apellidos"], align="C"
    )
    pdf.multi_cell(w=0, h=5, txt="Cliente: " + str(boleta["id_cliente"]), align="C")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.multi_cell(w=0, h=5, txt="EQUIPO: " + boleta["tipo_equipo"], align="L")
    pdf.multi_cell(w=0, h=4, txt="MARCA: " + boleta["marca"], align="L")
    pdf.multi_cell(w=0, h=4, txt="MODELO: " + boleta["modelo"], align="L")
    pdf.multi_cell(w=0, h=4, txt="SERIE: " + boleta["serie"], align="L")
    pdf.multi_cell(w=0, h=4, txt="CONDICION: " + boleta["condicion"], align="L")
    pdf.multi_cell(w=0, h=4, txt="MOTIVO: " + boleta["motivo_cliente"], align="L")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.multi_cell(w=0, h=4, txt="Cobro", align="L")
    pdf.ln(h=2)
    # pos_y = pdf.get_y()
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Costo Reparación: ¢ " + str("{:0,.2f}".format(datos["monto"])),
        align="L",
    )
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Descuentos:         ¢ " + str("{:0,.2f}".format(datos["descuentos"])),
        align="L",
    )
    # pdf.set_y(pos_y)
    # pdf.multi_cell(w=0, h=4, txt=str('{:0,.2f}'.format(datos['impuestos'])), align='R')
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Total Impuestos:    ¢ " + str("{:0,.2f}".format(datos["impuestos"])),
        align="L",
    )
    pdf.line(5, pdf.get_y(), 45, pdf.get_y())
    pdf.set_font_size(12)
    pdf.ln(h=2)
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Total a Pagar:  ¢ "
        + str("{:0,.2f}".format(datos["monto"] + datos["impuestos"])),
        align="L",
    )
    pdf.ln(h=4)
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    # EXTRACCION DEL TEXTO PARA COMPROBANTE
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT contenido from datos where id = 2")
    datos_cuerpo = cursor.fetchone()
    cursor.close()
    pdf.ln(h=5)
    notificacion = datos_cuerpo["contenido"]
    pdf.set_font_size(9)
    pdf.multi_cell(w=0, h=4, txt=notificacion, align="J")
    pdf.multi_cell(w=0, h=4, txt="", align="C")
    pdf.multi_cell(w=0, h=4, txt="Por ELECTRONICA TORRES", align="C")
    pdf.ln(h=1)
    pdf.multi_cell(w=0, h=4, txt="Emitida por: " + datos["username"], align="L")
    return pdf, id_comprobante


# CREA PDF COMPROBANTE VENTA


def comprobante_venta_pdf(id_venta):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute('SET lc_time_names = "es_ES"')
    # VENTA
    cursor.execute(
        'select date_format(fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha, concat(c.nombres," ", c.apellidos) cliente, v.id_cliente, monto_sin_impuestos, impuestos, username \
            from venta_ventas v left join tx_clientes c on c.id=v.id_cliente \
            left join kapps_db.accounts a on a.id=v.id_usuario \
        where v.id=%s',
        [id_venta],
    )
    venta = cursor.fetchone()
    # DATOS VENTA
    cursor.execute(
        "select l.codigo_producto, p.nombre, p.modelo, pe.descripcion estado, sum(ll.unidades) unidades \
            , sum(ll.monto_sin_impuestos) monto_sin_impuestos, sum(ll.impuestos) impuestos \
            from inv_lotes_log ll left join inv_lotes l on l.id=ll.id_lote \
	            left join inv_productos p on p.id=l.codigo_producto \
                    left join inv_productos_estados pe on pe.id=l.id_estado \
            where tipo=2 and parametro=%s \
        group by l.codigo_producto, pe.descripcion, l.codigo_producto, p.nombre, p.modelo",
        [id_venta],
    )
    venta_contenido = cursor.fetchall()
    pdf = MyFPDF(unit="mm", format=(100, 180))
    pdf.add_page()
    pdf.set_font("arial", size=10)
    fecha_split = venta["fecha"].split(" ")
    fecha = fecha_split[0]
    # hora = fecha_split[1]
    # CREACION DEL PDF
    pdf.set_margins(6, 1, 4)
    pdf.set_x(1)
    pdf.set_y(3)
    pdf.set_font_size(13)
    pdf.multi_cell(w=0, h=4, txt="ELECTRONICA TORRES", align="C")
    pdf.set_font_size(11)
    pdf.multi_cell(w=0, h=4, txt="GERARDO TORRES. CED:5-0293-0031", align="C")
    pdf.set_font_size(9)
    pdf.multi_cell(w=0, h=4, txt="TELS. 2101-2389 / 6022-6611", align="C")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.set_font_size(12)
    pdf.multi_cell(
        w=0, h=5, txt="Comprobante Venta Provisional N° " + str(id_venta), align="C"
    )
    pdf.multi_cell(w=0, h=5, txt="Fecha: " + fecha, align="C")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.set_x(1)
    pdf.set_font_size(9)
    pdf.multi_cell(w=0, h=5, txt=venta["cliente"], align="C")
    pdf.multi_cell(w=0, h=5, txt="Id Cliente: " + str(venta["id_cliente"]), align="C")
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    pdf.ln(h=2)
    for row in venta_contenido:
        pdf.multi_cell(
            w=0,
            h=4,
            txt=row["codigo_producto"]
            + " "
            + row["nombre"]
            + " "
            + row["modelo"]
            + " "
            + row["estado"],
            align="L",
        )
        pdf.multi_cell(
            w=0,
            h=4,
            txt="x"
            + str(row["unidades"])
            + " Precio: ¢"
            + str("{:0,.0f}".format(row["monto_sin_impuestos"]))
            + " Imp: ¢"
            + str("{:0,.0f}".format(row["impuestos"])),
            align="L",
        )
        pdf.multi_cell(
            w=0,
            h=4,
            txt="¢"
            + str("{:0,.0f}".format(row["monto_sin_impuestos"] + row["impuestos"])),
            align="R",
        )
    pdf.line(70, pdf.get_y(), 98, pdf.get_y())
    pdf.set_font_size(11)
    pdf.ln(h=4)
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Total:  ¢ " + str("{:0,.0f}".format(venta["monto_sin_impuestos"])),
        align="R",
    )
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Impuestos:  ¢ " + str("{:0,.0f}".format(venta["impuestos"])),
        align="R",
    )
    pdf.ln(h=3)
    pdf.set_font_size(13)
    pdf.multi_cell(
        w=0,
        h=4,
        txt="Total a Pagar:  ¢ "
        + str("{:0,.2f}".format(venta["monto_sin_impuestos"] + venta["impuestos"])),
        align="R",
    )
    pdf.ln(h=4)
    pdf.line(1, pdf.get_y(), 98, pdf.get_y())
    # EXTRACCION DEL TEXTO PARA COMPROBANTE
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT contenido from datos where id = 13")
    datos_cuerpo = cursor.fetchone()
    cursor.close()
    pdf.ln(h=5)
    notificacion = datos_cuerpo["contenido"]
    pdf.set_font_size(9)
    pdf.multi_cell(w=0, h=4, txt=notificacion, align="J")
    pdf.multi_cell(w=0, h=4, txt="", align="C")
    pdf.ln(h=1)
    pdf.multi_cell(w=0, h=4, txt="Venta por: " + venta["username"], align="L")
    return pdf


# ENVIO CORREO
def envio_correo(tipo_mensaje, destinatario, adjunto=0, extra=0):
    if tipo_mensaje == 1:  # ENVIO DE RECIBO
        mensaje = Message(
            "Recibo Electrónica Torres", sender=remitente, recipients=[destinatario]
        )
        mensaje.body = "Buen día. Adjunto encontrará el recibo solicitado por su pago en Electrónica Torres"
        with kapps_admin.open_resource(adjunto) as fp:
            mensaje.attach("Recibo_" + extra + ".pdf", "application/pdf", fp.read())
        mail.send(mensaje)
    if tipo_mensaje == 2:  # ENVIO DE BOLETA
        mensaje = Message(
            "Boleta Electrónica Torres", sender=remitente, recipients=[destinatario]
        )
        mensaje.body = "Buen día. Adjunto encontrará la Boleta generada en su visita a Electrónica Torres"
        with kapps_admin.open_resource(adjunto) as fp:
            mensaje.attach("Boleta_" + extra + ".pdf", "application/pdf", fp.read())
        mail.send(mensaje)
    if tipo_mensaje == 3:  # ENVIO DE COTIZACION
        mensaje = Message(
            "Cotización de Electrónica Torres",
            sender=remitente,
            recipients=[destinatario],
        )
        mensaje.body = "Buen día.\nAdjunto encontrará la Cotización para la Reparación de su equipo en Electrónica Torres"
        with kapps_admin.open_resource(adjunto) as fp:
            mensaje.attach("cotizacion_" + extra + ".pdf", "application/pdf", fp.read())
        mail.send(mensaje)
    if tipo_mensaje == 4:  # ENVIO DE COMPROBANTE
        mensaje = Message(
            "Comprobante de Electrónica Torres",
            sender=remitente,
            recipients=[destinatario],
        )
        mensaje.body = "Buen día.\nAdjunto encontrará el comprobante de Pago para la Reparación de su equipo en Electrónica Torres"
        with kapps_admin.open_resource(adjunto) as fp:
            mensaje.attach("comprobante" + extra + ".pdf", "application/pdf", fp.read())
        mail.send(mensaje)
    if tipo_mensaje == 5:  # ENVIO DE NOTIFICACION DE RECHAZO
        mensaje = Message(
            "Notificación de Electrónica Torres",
            sender=remitente,
            recipients=[destinatario],
        )
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute(
            "select contenido from datos where id=10",
        )
        resultado = cursor.fetchone()
        cursor.close()
        mensaje.body = urllib.parse.unquote(resultado["contenido"])
        mail.send(mensaje)
    if tipo_mensaje == 6:  # INTERNO: ENVIO DE CODIGOS PARA RESTABLECER CONTRASEÑA
        mensaje = Message(
            "Restablecer Contraseña de KAPPS.me",
            sender=remitente,
            recipients=[destinatario],
        )
        if extra["boton"] == 1:
            bgc = "#426A96"
        if extra["boton"] == 2:
            bgc = "#3AB020"
        if extra["boton"] == 3:
            bgc = "#CD7102"
        # mensaje.body =  urllib.parse.unquote(resultado["contenido"]+"recuperar_password/")
        mensaje.html = (
            "<h3>Para configurar una nueva contraseña, ponga esta información en la pantalla donde se le solicitan.<br><br><h2>Código: "
            + extra["clave"]
            + "<br>Presiona el Botón: <code style='color:white;background-color:"
            + bgc
            + ";'>&nbsp;"
            + str(extra["boton"])
            + "&nbsp;</code>&nbsp;</h2><br><br><small class='text-muted' style='font-size:0.9rem'>Datos válidos por 60 minutos</small>"
        )
        mail.send(mensaje)
        return "enviado"
    if tipo_mensaje == 7:  # ENVIO DE COMPROBANTE VENTA
        mensaje = Message(
            "Comprobante de Venta de Electrónica Torres",
            sender=remitente,
            recipients=[destinatario],
        )
        mensaje.body = "Buen día.\nAdjunto encontrará el comprobante de Pago por su compra en Electrónica Torres"
        with kapps_admin.open_resource(adjunto) as fp:
            mensaje.attach(
                "comprobante" + str(extra) + ".pdf", "application/pdf", fp.read()
            )
        mail.send(mensaje)
    if tipo_mensaje == 8:  # INTERNO: ENVIO DE CONTRASEÑA A USUARIO NUEVO
        mensaje = Message(
            "Contraseña para KAPPS.me",
            sender=remitente,
            recipients=[destinatario],
        )
        mensaje.html = (
            "<h3>Buen día " + extra[0] + "<br><br>Esta es la contraseña para ingresar a Kapps.me. El usuario se lo entregará su administrador.<br><br><br>" \
                "<h2>"+extra[1]+"</h2>")
        mail.send(mensaje)
        return "enviado"
    return "OK"


@kapps_admin.route("/busqueda", methods=["POST"])
def busqueda():
    tipo_busqueda = int(request.form.get("tipo_busqueda"))
    cursor = mysql.connection.cursor()
    if tipo_busqueda == 1:  # BUSQUEDA CLIENTE
        cursor.execute("SELECT nombre FROM zonas")
        zonas = cursor.fetchall()
        cursor.close()
        return render_template("boleta_busqueda.html", zonas=zonas)
    if tipo_busqueda == 2:  # BOLETAS POR CLIENTE
        id_cliente = int(request.form.get("id_cliente"))
        # Boletas
        cursor.execute(
            'select b.id_boleta, date_format(b.fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha_ingreso, date_format(b.equipo_retirado_fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha_retiro \
            , be.id_estado, e.nombre equipo, m.nombre marca, b.modelo , b.serie from boletas b \
            left join boletas_estados be on be.id_boleta=b.id_boleta \
            left join marcas m on m.id=b.id_marca \
            left join tipos_equipo e on e.id=b.id_tipo_equipo \
        where b.id_cliente = %s \
            and be.id = (select max(id) from boletas_estados be2 where be2.id_boleta=be.id_boleta)\
        order by b.fecha desc',
            [id_cliente],
        )
        boletas_resultado = cursor.fetchall()
        boletas_conteo = cursor.rowcount
        # Ventas
        cursor.execute(
            'select vv.id, date_format(vv.fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha,  convert(monto_sin_impuestos+impuestos,CHAR) monto, a.username \
                from venta_ventas vv left join kapps_db.accounts a on a.id=vv.id_usuario \
                    where vv.id_cliente=%s order by vv.fecha desc',
            [id_cliente],
        )
        ventas_resultado = cursor.fetchall()
        ventas_conteo = cursor.rowcount
        print(ventas_conteo)
        return jsonify(
            boletas_resultado=boletas_resultado,
            boletas_conteo=boletas_conteo,
            ventas_resultado=ventas_resultado,
            ventas_conteo=ventas_conteo,
        )


# REPORTERIA


@kapps_admin.route("/reportes", methods=["POST"])
def reportes():
    tipo_reporte = int(request.form.get("tipo-reporte"))
    tipo_accion = int(request.form.get("tipo-accion"))
    NIVEL = session["nivel"]
    cursor = mysql.connection.cursor()
    datos = [0, 0]
    if tipo_reporte == 1:  # REPORTE DE PAGOS
        fecha_inicio = request.form.get("fecha-inicio")
        fecha_fin = request.form.get("fecha-fin")
        tipo_accion2 = int(request.form.get("tipo-accion2"))
        if NIVEL > 1:
            fecha_inicio = datetime.now().strftime("%Y-%m-%d")
            fecha_fin = datetime.now().strftime("%Y-%m-%d")
        # EXTRAE DATOS
        datos, campos, sql, filtro = datos_base.datos_reportes(
            mysql, 1, fecha_inicio, fecha_fin, tipo_accion2
        )
        if tipo_accion == 1:  # DESPLEGAR
            return render_template(
                "reportes.html",
                datos=datos,
                nivel=NIVEL,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                tipo_reporte=tipo_reporte,
                filtro=filtro,
            )
        if tipo_accion == 2:  # DESCARGAR EXCEL
            # output in bytes
            output = io.BytesIO()
            # create WorkBook object
            workbook = xlwt.Workbook()
            # add a sheet
            sh = workbook.add_sheet("Reporte de Pagos")
            # add headers
            sh.write(0, 0, "Fecha")
            sh.write(0, 1, "Origen")
            sh.write(0, 2, "Documento")
            sh.write(0, 3, "Medio")
            sh.write(0, 4, "Monto")
            sh.write(0, 5, "Boleta/Venta")
            sh.write(0, 6, "Usuario Crea")
            sh.write(0, 7, "Estado")
            sh.write(0, 8, "Usuario Anula")
            sh.write(0, 9, "Fecha Anula")
            idx = 0
            for row in datos[2]:
                sh.write(idx + 1, 0, row["fecha"])
                sh.write(idx + 1, 1, str(row["origen"]))
                sh.write(idx + 1, 2, str(row["id"]))
                sh.write(idx + 1, 3, row["medio"])
                sh.write(idx + 1, 4, row["monto"])
                sh.write(idx + 1, 5, row["id_boleta"])
                sh.write(idx + 1, 6, row["username"])
                if row["estado"] == 0:
                    sh.write(idx + 1, 7, "Anulado")
                else:
                    sh.write(idx + 1, 7, "Activo")
                sh.write(idx + 1, 8, row["usuario_anula"])
                sh.write(idx + 1, 9, row["fecha_anula"])
                idx += 1
            workbook.save(output)
            output.seek(0)
            return Response(
                output,
                mimetype="application/ms-excel",
                headers={
                    "Content-Disposition": "attachment;filename=reporte_pagos.xls"
                },
            )
    if tipo_reporte == 2:  # BOLETAS POR CLIENTE
        id_cliente = int(request.form.get("id_cliente"))
        cursor.execute(
            'select b.id_boleta, date_format(b.fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha_ingreso, date_format(b.equipo_retirado_fecha,"%%Y-%%b-%%d %%h:%%i%%p") fecha_retiro \
            , be.id_estado, e.nombre equipo, m.nombre marca, b.modelo , b.serie from boletas b \
            left join boletas_estados be on be.id_boleta=b.id_boleta \
            left join marcas m on m.id=b.id_marca \
            left join tipos_equipo e on e.id=b.id_tipo_equipo \
        where b.id_cliente = %s \
            and be.id = (select max(id) from boletas_estados be2 where be2.id_boleta=be.id_boleta)\
        order by b.fecha desc',
            [id_cliente],
        )
        resultado = cursor.fetchall()
        cursor.close()
        if resultado is None:
            resultado = "SIN-BOLETAS"
            return resultado
        else:
            return jsonify(resultado=resultado)
    if tipo_reporte == 3:  # FACTURAS
        fecha_inicio = request.form.get("fecha-inicio")
        fecha_fin = request.form.get("fecha-fin")
        if NIVEL > 1:
            fecha_inicio = datetime.now().strftime("%Y-%m-%d")
            fecha_fin = datetime.now().strftime("%Y-%m-%d")
        # EXTRAE DATOS
        datos, campos, sql, filtro = datos_base.datos_reportes(
            mysql, 3, fecha_inicio, fecha_fin
        )
        if tipo_accion == 1:  # DESPLEGAR
            return render_template(
                "reportes.html",
                datos=datos,
                nivel=NIVEL,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                tipo_reporte=tipo_reporte,
                sql=sql,
            )
        if tipo_accion == 2:  # DESCARGAR EXCEL
            # output in bytes
            output = io.BytesIO()
            # create WorkBook object
            workbook = xlwt.Workbook()
            # add a sheet
            sh = workbook.add_sheet("Reporte de Facturación")
            # add headers
            sh.write(0, 0, "Fecha Ingreso")
            sh.write(0, 1, "Comprobante")
            sh.write(0, 2, "Monto")
            sh.write(0, 3, "Impuestos")
            sh.write(0, 4, "Total Factura")
            sh.write(0, 5, "Estado")
            sh.write(0, 6, "Boleta")
            sh.write(0, 7, "Factura")
            idx = 0
            for row in datos[1]:
                sh.write(idx + 1, 0, row["fecha_ingreso"])
                sh.write(idx + 1, 1, str(row["comprobante"]))
                sh.write(idx + 1, 2, "{:0,.2f}".format(row["monto"]))
                sh.write(idx + 1, 3, "{:0,.2f}".format(row["impuestos"]))
                sh.write(idx + 1, 4, "{:0,.2f}".format(row["monto"] + row["impuestos"]))
                if row["estado"] == 0:
                    sh.write(idx + 1, 5, "Anulada")
                else:
                    sh.write(idx + 1, 5, "Activa")
                sh.write(idx + 1, 6, row["id_boleta"])
                sh.write(idx + 1, 7, row["factura"])
                idx += 1
            workbook.save(output)
            output.seek(0)
            return Response(
                output,
                mimetype="application/ms-excel",
                headers={
                    "Content-Disposition": "attachment;filename=reporte_facturacion.xls"
                },
            )
    if tipo_reporte == 4:  # BOLETAS
        fecha_inicio = request.form.get("fecha-inicio")
        fecha_fin = request.form.get("fecha-fin")
        # EXTRAE DATOS
        datos, campos, sql, filtro = datos_base.datos_reportes(
            mysql, 4, fecha_inicio, fecha_fin
        )
        if tipo_accion == 1:  # DESPLEGAR
            return render_template(
                "reportes.html",
                datos=datos,
                nivel=NIVEL,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                tipo_reporte=tipo_reporte,
                campos=campos,
                sql=sql,
            )
        if tipo_accion == 2:  # DESCARGAR EXCEL
            # output in bytes
            output = io.BytesIO()
            # create WorkBook object
            workbook = xlwt.Workbook()
            # add a sheet
            sh = workbook.add_sheet("Reporte de Boletas")
            # ENCABEZADOS
            for row, val in enumerate(campos):
                sh.write(0, row, val)
            # CONTENIDO
            for fila, row in enumerate(datos[1]):
                for columna, campo in enumerate(campos):
                    sh.write(fila + 1, columna, row[campo])
            workbook.save(output)
            output.seek(0)
            return Response(
                output,
                mimetype="application/ms-excel",
                headers={
                    "Content-Disposition": "attachment;filename=reporte_boletas.xls"
                },
            )
    if tipo_reporte == 5:  # TIEMPOS
        fecha_inicio = request.form.get("fecha-inicio")
        fecha_fin = request.form.get("fecha-fin")
        # EXTRAE DATOS
        datos, campos, sql, filtro = datos_base.datos_reportes(
            mysql, 5, fecha_inicio, fecha_fin
        )
        if tipo_accion == 1:  # DESPLEGAR
            return render_template(
                "reportes.html",
                datos=datos,
                nivel=NIVEL,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                tipo_reporte=tipo_reporte,
                campos=campos,
                sql=sql,
            )
        if tipo_accion == 2:  # DESCARGAR EXCEL
            # output in bytes
            output = io.BytesIO()
            # create WorkBook object
            workbook = xlwt.Workbook()
            # add a sheet
            sh = workbook.add_sheet("Reporte de Tiempos")
            # ENCABEZADOS
            for row, val in enumerate(campos):
                sh.write(0, row, val)
            # CONTENIDO
            for fila, row in enumerate(datos[1]):
                for columna, campo in enumerate(campos):
                    sh.write(fila + 1, columna, row[campo])
            workbook.save(output)
            output.seek(0)
            return Response(
                output,
                mimetype="application/ms-excel",
                headers={
                    "Content-Disposition": "attachment;filename=reporte_tiempos.xls"
                },
            )
    if tipo_reporte == 6:  # VENTAS
        fecha_inicio = request.form.get("fecha-inicio")
        fecha_fin = request.form.get("fecha-fin")
        tipo_accion2 = int(request.form.get("tipo-accion2"))
        # EXTRAE DATOS
        datos, campos, sql, filtro = datos_base.datos_reportes(
            mysql, 6, fecha_inicio, fecha_fin, tipo_accion2
        )
        if tipo_accion == 1:  # DESPLEGAR
            return render_template(
                "reportes.html",
                datos=datos,
                nivel=NIVEL,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                tipo_reporte=tipo_reporte,
                campos=campos,
                sql=sql,
                filtro=filtro,
            )
        if tipo_accion == 2:  # DESCARGAR EXCEL
            # output in bytes
            output = io.BytesIO()
            # create WorkBook object
            workbook = xlwt.Workbook()
            # add a sheet
            sh = workbook.add_sheet("Reporte de Ventas")
            # ENCABEZADOS
            for row, val in enumerate(campos):
                sh.write(0, row, val)
            # CONTENIDO
            for fila, row in enumerate(datos[2]):
                for columna, campo in enumerate(campos):
                    sh.write(fila + 1, columna, row[campo])
            workbook.save(output)
            output.seek(0)
            return Response(
                output,
                mimetype="application/ms-excel",
                headers={
                    "Content-Disposition": "attachment;filename=reporte_ventas.xls"
                },
            )
    if tipo_reporte == 7:  # INVENTARIO - EXISTENCIAS
        fecha_inicio = ""
        fecha_fin =""
        # EXTRAE DATOS
        datos, campos, sql, filtro = datos_base.datos_reportes(
            mysql, 7, fecha_inicio, fecha_fin
        )
        if tipo_accion == 1:  # DESPLEGAR
            cursor.close()
            return render_template(
                "reportes.html",
                datos=datos,
                nivel=NIVEL,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                tipo_reporte=tipo_reporte,
                campos=campos,
                sql=sql,
            )
        if tipo_accion == 2:  # DESCARGAR EXCEL
            # output in bytes
            output = io.BytesIO()
            # create WorkBook object
            workbook = xlwt.Workbook()
            # add a sheet
            sh = workbook.add_sheet("Existencias")
            # ENCABEZADOS
            for row, val in enumerate(campos):
                sh.write(0, row, val)
            # CONTENIDO
            for fila, row in enumerate(datos[0]):
                for columna, campo in enumerate(campos):
                    sh.write(fila + 1, columna, row[campo])
            workbook.save(output)
            output.seek(0)
            return Response(
                output,
                mimetype="application/ms-excel",
                headers={
                    "Content-Disposition": "attachment;filename=inventario_existencias.xls"
                },
            )
    if tipo_reporte == 8:  # INVENTARIO - LIQUIDACION
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        if tipo_accion == 1: # PAGINA PRINCIPAL
            # EXTRAE DATOS
            cursor.execute(
            "select br.id, br.fecha, br.id_boleta boleta, costo*cantidad 'costo', costo_factura*cantidad 'factura', cantidad cant \
                , concat(case when br.estado=1 then 'NUEVO' when br.estado=2 then 'USADO' end \
                  ,' ', br.info, ' ' ,p.nombre,' - ', m.nombre,' ', p.modelo) producto \
            from boletas_repuestos br \
                left join boletas b on b.id_boleta=br.id_boleta \
                left join inv_productos p on p.id=br.info \
                left join marcas m on m.id=p.id_marca \
            where id_repuesto=0 and cerrada=1 and br.estado=1 and br.liquidacion is null",
                [],
            )
            datos = cursor.fetchall()
            campos = [i for i in cursor.description]
            # LLENA TABLA TEMPORAL PARA LOS REPUESTOS DEL REPORTE
            cursor.execute(
            "delete from liquidacion_repuestos where id_usuario = %s"
                ,[session["id"]]
            )
            ids = [[row["id"],session["id"]] for row in datos]
            cursor.executemany(
            "insert into liquidacion_repuestos (id_repuesto, id_usuario) values (%s,%s)"
                ,ids
            )
            mysql.connection.commit()
            # ULTIMAS LIQUIDACIONES
            cursor.execute("select liquidacion fecha, a.username usuario, sum(costo*cantidad) monto \
                from boletas_repuestos br left join kapps_db.accounts a on a.id=br.liquidacion_usuario \
	            where br.liquidacion is not null \
                group by liquidacion, a.username \
                order by liquidacion desc \
                limit 5")
            ultimas_liquidaciones = cursor.fetchall()
            cursor.close()
            return render_template(
                "liquidacion.html",
                datos=datos,
                nivel=NIVEL,
                tipo=tipo_accion,
                campos = campos,
                monto = sum([row["costo"] for row in datos]),
                boletas = len(Counter([row["boleta"] for row in datos]).keys()),
                total_repuestos = sum([row["cant"] for row in datos]),
                ultimas_liquidaciones = ultimas_liquidaciones
                )
        if tipo_accion == 2:  # EJECUTAR LIQUIDACION
            # VERIFICA INTEGRIDAD DE LA TABLA TEMPORAL (POR SI COLISIONA CON ALGUNA OTRA LIQUIDACION)
            cursor.execute("select count(1) eventos_liquidados from liquidacion_repuestos lr \
                    left join boletas_repuestos br  on br.id = lr.id_repuesto \
                    where lr.id_usuario=%s and br.liquidacion is not null",[session["id"]])
            discrepancias = cursor.fetchone()
            if discrepancias["eventos_liquidados"]>0:
                cursor.close()
                return "discrepancias"
            else:
                # SE PRODECE A ACTUALIZAR LA FECHA DE LIQUIDACION DEL REPUESTO
                cursor.execute(
                "update boletas_repuestos br set liquidacion = sysdate(), liquidacion_usuario=%s \
                    where br.id in (select id_repuesto from liquidacion_repuestos where id_usuario = %s)",
                    [session["id"],session["id"]],
                )
                mysql.connection.commit()
                cursor.close()
                return "OK"
    if tipo_reporte == 9:  # DETALLE LIQUIDACIONES
        fecha_inicio = request.form.get("fecha-inicio")
        fecha_fin = request.form.get("fecha-fin")
        if NIVEL > 1:
            fecha_inicio = datetime.now().strftime("%Y-%m-%d")
            fecha_fin = datetime.now().strftime("%Y-%m-%d")
        # EXTRAE DATOS
        datos, campos, sql, filtro = datos_base.datos_reportes(
            mysql, 9, fecha_inicio, fecha_fin
        )
        if tipo_accion == 1:  # DESPLEGAR
            return render_template(
                "reportes.html",
                datos=datos,
                nivel=NIVEL,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                tipo_reporte=tipo_reporte,
                sql=sql,
                campos=campos
            )
        if tipo_accion == 2:  # DESCARGAR EXCEL
            # output in bytes
            output = io.BytesIO()
            # create WorkBook object
            workbook = xlwt.Workbook()
            # add a sheet
            sh = workbook.add_sheet("Reporte de Facturación")
            # add headers
            for idx, rheader in enumerate(campos):
                sh.write(0,idx,rheader.upper())
            # CONTENIDO
            for fila, row in enumerate(datos[0]):
                for columna, campo in enumerate(campos):
                    sh.write(fila + 1, columna, row[campo])
            workbook.save(output)
            output.seek(0)
            return Response(
                output,
                mimetype="application/ms-excel",
                headers={
                    "Content-Disposition": "attachment;filename=reporte_liquidaciones.xls"
                },
            )
    
@kapps_admin.route("/historial", methods=["POST"])
def historial():
    id_boleta = request.form.get("id_boleta")
    tipo_accion = int(request.form.get("tipo_accion"))
    resultado = datos_base.datos_historial(mysql, id_boleta, tipo_accion)
    return jsonify(resultado=resultado)


@kapps_admin.route("/comentario", methods=["POST"])
def comentario():
    USUARIO = session["id"]
    id_boleta = request.form.get("id_boleta")
    comentario = request.form.get("comentario")
    # ESTADO ACTUAL
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute(
        "SELECT case    when be.id_estado=0 then 'NUEVA' \
                        when be.id_estado=1 then 'DIAGNOSTICO' \
                        when be.id_estado=2 then 'COTIZACION' \
                        when be.id_estado=3 then 'ESPERA C.C.' \
                        when be.id_estado=4 then 'REPARACION' \
                        when be.id_estado=5 then 'LISTO PARA ENTREGA' \
                        when be.id_estado=6 then 'FACTURACION' \
                        when be.id_estado=7 then 'RECHAZADA' \
                        when be.id_estado=10 then 'CERRADA' \
                            else 'N/A' end estado \
                FROM boletas_estados be \
                WHERE be.id = (SELECT MAX(be2.id) FROM boletas_estados be2 \
                    WHERE be2.id_boleta = %s)",
        [id_boleta],
    )
    datos = cursor.fetchone()
    estado = datos["estado"]
    cursor.execute(
        "insert into boletas_comentarios (id_boleta, comentario, id_usuario, tipo) values (%s,%s,%s,1)",
        [id_boleta, "En " + estado + ": " + comentario, USUARIO],
    )
    mysql.connection.commit()
    cursor.close()
    return "Ok"


@kapps_admin.route("/logout")
def logout():
    return klogin.klogout(msg="")


# CADA VEZ QUE SE LLAME A ALGUNA DEF
@kapps_admin.before_request
def before_request_func():
    print("")
    #print(":::::----------------------------------------------------------------------:::::")
    #print(session)
    #print(request)
    print(request.endpoint)
    print(request.form)
    if "token" in session:
        # print("con token")
        if request.endpoint != "logout" and request.endpoint != "login":
            mysqlConn=DBConn()
            cursor = mysqlConn.cursor()
            cursor.execute("SET session time_zone = '-6:00'")
            cursor.execute(
                "select timestampdiff(second,ultimo_request,sysdate()) duracion_session, ac.vigencia, token \
                from kapps_db.accounts_log log left join kapps_db.accounts ac on ac.id=log.id_account \
                where id_account=%s and ac.bloqueo=0",
                [session["id"]],
            )
            resultado=cursor.fetchone()
            resultado = dict(zip(cursor.column_names, resultado)) if cursor.rowcount >= 0 else None
            if resultado is not None:
                if (
                    session["token"] == resultado["token"]
                    and resultado["duracion_session"] <= resultado["vigencia"]
                ):
                    # print("SESION Y TOKEN OK")
                    cursor.execute(
                        "update kapps_db.accounts_log set ultimo_request=sysdate() where id_account=%s",
                        [session["id"]],
                    )
                    mysqlConn.commit()
                    cursor.close()
                elif (
                    session["token"] == resultado["token"]
                    and resultado["duracion_session"] > resultado["vigencia"]
                ):
                    # print("SESION CADUCADA")
                    cursor.close()
                    return klogin.klogout(msg="Sesión Caducada!")
                elif (
                    session["token"] != resultado["token"]
                    and resultado["duracion_session"] <= resultado["vigencia"]
                ):
                    # print("Acceso Denegado. Solo es posible una sesión por Usuario.")
                    session.pop("id", None)
                    cursor.close()
                    return klogin.klogout(
                        mysql,
                        msg="Acceso Denegado. Solo es posible una sesión por Usuario.",
                    )
                elif (
                    session["token"] != resultado["token"]
                    and resultado["duracion_session"] > resultado["vigencia"]
                ):
                    # print("SESION ANTERIOR INVALIDA. INGRESO AUTORIZADO CON NUEVO TOKEN")
                    cursor.execute(
                        "delete from kapps_db.accounts_log where id_account=%s",
                        [session["id"]],
                    )
                    cursor.execute(
                        "insert into kapps_db.accounts_log (token,id_account,ultimo_request) values (%s,%s,sysdate())",
                        (session["token"], session["id"]),
                    )
                    mysql.connection.commit()
                    cursor.close()
            else:  # USUARIO NO EN LA BASE DE LOGS
                # print("sin token 1")
                cursor.close()
                return klogin.klogout(msg="")
    else:
        print("sin token 2")
        # print(request.method)
        # print(request.environ)
        # print("**"+str(request.routing_exception)+"**")
        # print(request.headers)
        # print(request.full_path)
        # print(request.host_url)
        # print(request.path)
        if "formulario" not in request.form:
            if (
                request.endpoint != "logout"
                and request.endpoint != "login"
                and request.endpoint != "static"
                and request.endpoint != "recuperar_password"
                and request.method != "GET"
            ):
                return render_template(
                    "no_dato.html", mensaje="Sesión Caducada. Vuela a iniciar Sesión."
                )
            elif (
                str(request.routing_exception)
                == "405 Method Not Allowed: The method is not allowed for the requested URL."
            ):
                return render_template("login.html", msg="")
            elif request.endpoint == "imagenes":
                return "No access"
            else:
                klogin.klogin(aplication_id)


@kapps_admin.route("/crud_usuario", methods=["POST"])
def crud_usuario():
    accion = int(request.form.get("accion"))
    parametro = request.form.get("parametro")
    parametro2 = request.form.get("parametro2")
    if (
        accion == 4 or accion == 6
    ):  # ACCION QUE NECESITA EL PARAMETRO 3 = NUMERO DE BOTON, O VERIFICAR CONTRASEÑA NUEVA
        parametro3 = request.form.get("parametro3")
        resultado = klogin.kcrud_usuario(
            mysql=mysql,
            accion=accion,
            parametro=parametro,
            parametro2=parametro2,
            aplication_id=aplication_id,
            parametro3=parametro3,
        )
    else:
        resultado = klogin.kcrud_usuario(
            accion=accion,
            parametro=parametro,
            parametro2=parametro2,
            aplication_id=aplication_id,
        )
    if (
        accion == 2 and resultado != "0"
    ):  # Envia correo con datos para restaurar la clave
        envio_correo(6, resultado["correo"], extra=resultado)
        return "OK"
    if accion == 5 and resultado != "0":  # Redirije a la pagina para recuperar
        return render_template(
            "login_recovery.html", clave=parametro, clave_link=parametro2
        )
    # if accion == 6 and resultado == "OK":  # Redirije a la pagina de inicio
    # return render_template(
    #    "login.html",
    # )
    return resultado


@kapps_admin.route("/usuarios", methods=["POST"])
def usuarios():
    mysqlConn = DBConn()
    cursor = mysqlConn.cursor(dictionary=True)
    cursor.execute('SET lc_time_names = "es_ES"')
    # VERIFICAR SI ES ADMINISTRADOR (NIVEL 1)
    cursor.execute("select nivel from kapps_db.accounts where id=%s", [session["id"]])
    resultado = cursor.fetchone()
    formulario = request.form
    if resultado["nivel"] == 1:
        if formulario["accion"] == "1":  # PAGINA INICIAL
            # VERIFICA DATOS DE LA APP
            cursor.execute(
                "select name, clave, licencias, owner responsable from kapps_db.kapps where id=%s",
                [aplication_id],
            )
            datos_aplicacion = cursor.fetchone()
            # CANTIDAD DE USUARIOS ACTIVOS EN LA APLICACION
            cursor.execute(
                "select count(1) usuarios_activos  \
                from kapps_db.accounts where id<>3 and estado=1",
                [],
            )
            datos = cursor.fetchone()
            usuarios_activos = datos["usuarios_activos"]
            # INFORMACION DE USUARIOS DE LA APLICACION
            cursor.execute(
                """select k.name empresa, a.id, a.name, lastname, username, email, ifnull(phone1,"") telefono, nivel, estado, bloqueo, vigencia 
                        from kapps_db.accounts a left join kapps_db.kapps k on k.id=a.kapp_id 
                    where a.id<>3 order by kapp_id asc, estado desc,nivel asc, a.id""")
            datos_usuarios = cursor.fetchall()
            cursor.close()

            # prueba=os.listdir(kapps_admin.config["APPLICATION_ROOT"])
            # prueba=kapps_admin.root_path
            prueba = ""
            return render_template(
                "usuarios.html",
                datos_aplicacion=datos_aplicacion,
                datos_usuarios=datos_usuarios,
                usuarios_activos=usuarios_activos,
                prueba=prueba,
            )
        if formulario["accion"] == "2":  # CONSULTA USUARIO
            # CONSULTA SI HAY LICENCIAS DISPONIBLES
            return str(datos_base.kapp_usuarios_disponibles(mysql, aplication_id))
        if formulario["accion"] == "3":  # CREAR USUARIO
            usuarios_disponibles = klogin.kapp_usuarios_disponibles(
                    aplication_id
            )
            if usuarios_disponibles > 0:
                datos_nuevo_usuario = {
                    "correo": formulario["correo"],
                    "nivel": formulario["nivel"],
                }
                return klogin.kcrud_usuario(
                    mysql,
                    7,
                    formulario["nombres"],
                    formulario["apellidos"],
                    aplication_id,
                    datos_nuevo_usuario,
                )
            else:
                return "NO-DISPONIBILIDAD"
        if formulario["accion"] == "4":  # ACTIVAR USUARIO
            usuarios_disponibles = klogin.kapp_usuarios_disponibles(
               aplication_id
            )
            if usuarios_disponibles > 0:
                cursor.execute("update kapps_db.accounts set estado = 1 where id=%s", [formulario["id_usuario"]])
                mysqlConn.commit()
                cursor.close()
                return "OK"
            else:
                return "NO-DISPONIBILIDAD"
    else:
        return resultado


# INVENTARIO PRINCIPAL
@kapps_admin.route("/inv", methods=["POST"])
def inv():
    inv_accion = int(request.form.get("inv-accion"))
    inv_accion2 = 0
    formulario = request.form
    archivos = 0
    if request.form.get("inv-accion2"):
        inv_accion2 = int(request.form.get("inv-accion2"))
    # if request.files.getlist("files"):
    # archivos = request.files.getlist("files")
    archivos = request.files
    context = {
        "inv_accion": inv_accion,
        "inv_accion2": inv_accion2,
        "formulario": formulario,
        "archivos": archivos,
        "mysql": mysql,
    }
    return inventario.principal(**context)


# TIENDA
@kapps_admin.route("/tnd", methods=["POST"])
def tnd():
    tienda_accion = int(request.form.get("tienda-accion"))
    tienda_accion2 = 0
    formulario = request.form
    if request.form.get("tienda-accion2"):
        tienda_accion2 = int(request.form.get("tienda-accion2"))
    context = {
        "tienda_accion": tienda_accion,
        "tienda_accion2": tienda_accion2,
        "formulario": formulario,
        "mysql": mysql,
    }
    return tienda.principal(**context)


# INVENTARIO IMAGENES (desuso)
@kapps_admin.route("/imagenes/<codigo>/<imagen>", methods=["GET"])
def imagenes(codigo, imagen):
    with open(
        os.path.join(
            kapps_admin.root_path, "inv_imagenes", codigo + "_" + imagen + ".jpg"
        ),
        "rb",
    ) as f:
        image_binary = f.read()
        response = make_response(base64.b64encode(image_binary))
        response.headers.set("Content-Type", "image/jpg")
        response.headers.set("Content-Disposition", "attachment", filename="image.jpg")
    return response


# INVENTARIO IMAGENES (desuso)
@kapps_admin.route("/imagenes_inventario2", methods=["POST"])
def imagenes_inventario2():
    formulario = request.form
    if formulario["tipo"] == "1":  # inventario
        archivo = formulario["codigo_producto"] + "_" + formulario["n_imagen"] + ".jpg"
        html_image = (
            "<img src='{{ url_for('static', filename='inv_imagenes/"
            + archivo
            + "') }}'>"
        )
        return render_template_string(html_image)


# TIENDA
@kapps_admin.route("/imagenes_inventario", methods=["POST"])
def imagenes_inventario():
    formulario = request.form
    if formulario["tipo"] == "1":  # inventario mostrar
        archivo = (
            formulario["codigo_producto"]
            + "_"
            + formulario["n_imagen"]
            + "."
            + formulario["extension"]
        )
        html_image = (
            "<img src='{{ url_for('static', filename='inv_imagenes/"
            + archivo
            + "') }}'>"
        )
        # html_image = "<div class='image-zoomer'><div class='image_inv' style=' background-image: url('{{ url_for('static', filename='/inv_imagenes/" + archivo + "') }}'></div></div>"
        return render_template_string(html_image)
    if formulario["tipo"] == "2":  # inventario guardar
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        codigo_producto = formulario["codigo_producto"]
        n_imagen = formulario["n_imagen"]
        archivos = request.files
        if "imagen" in archivos:
            archivos["imagen"].save(
                os.path.join(
                    FOLDER_INV_IMAGENES,
                    codigo_producto
                    + "_"
                    + n_imagen
                    + archivos["imagen"].filename[
                        archivos["imagen"].filename.rfind(".") :
                    ],
                )
            )
            cursor.execute(
                "update inv_productos set img%s = %s where id = %s",
                (
                    int(n_imagen),
                    archivos["imagen"].filename[
                        archivos["imagen"].filename.rfind(".") + 1 :
                    ],
                    codigo_producto,
                ),
            )
            mysql.connection.commit()
            cursor.close()
        return "OK"
    if formulario["tipo"] == "3":  # ELIMINAR IMAGENES DE UN PRODUCTO YA CREADO
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        codigo_producto = formulario["codigo_producto"]
        n_imagen = formulario["n_imagen"]
        cursor.execute(
            "update inv_productos set img%s = 0 where id = %s",
            (int(n_imagen), codigo_producto),
        )
        mysql.connection.commit()
        cursor.close()
        return "OK"


# ERRORES
@kapps_admin.errorhandler(404)
def page_not_found(e):
    # note that we set the 404 status explicitly
    return klogin.klogout(mysql, msg="")


if __name__ == "__main__":
    kapps_admin.run(host="0.0.0.0", port=os.getenv('SERVER_PORT'), debug=True)
