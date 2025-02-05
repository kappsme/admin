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
#import base64
#from collections import Counter
#import math
from dotenv import load_dotenv
import mysql.connector
import json
#import requests

# ENV Variables
load_dotenv()


kapps_admin = Flask(__name__)
kapps_admin.config["PDF_FOLDER"] = "templates/pdfs/"
kapps_admin.config["JSON_SORT_KEYS"] = False

kapps_admin.config["application_id"] ='0'

# CONEXION A BASE DE DATOS
def DBConn():
    Conn = mysql.connector.connect(
        user= os.getenv('MYSQL_USER'),
        password= os.getenv('MYSQL_PASSWORD'),
        host= os.getenv('MYSQL_HOST'),
        database= os.getenv('MYSQL_DB'),
        raise_on_warnings = False
    )
    return Conn


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

# LOGINS

@kapps_admin.route("/login", methods=["GET", "POST"])
@kapps_admin.route("/", methods=["GET", "POST"])
def login():
    return klogin.klogin(kapps_admin.config["application_id"])

def datos_kapp(id_kapp=None):
    mysql=DBConn()
    cursor = mysql.cursor(dictionary=True)
    cursor.execute('SET lc_time_names = "es_ES"')
    sql =  """select k.id "ID KAPP", k.clave "CLAVE", k.name "NOMBRE", state "ESTADO", date(k.fecha_cobro) "FECHA COBRO"
                , ifnull(datediff(now(),DATE_ADD(date_format(concat(ifnull(max(periodo), CAST(date_format(fecha_cobro,"%Y%m") AS CHAR CHARACTER SET utf8))
                        ,CAST(date_format(fecha_cobro,"%d") AS CHAR CHARACTER SET utf8)),"%Y%m%d"),INTERVAL 1 MONTH)),0) "DIAS ATRASO" 
                , licencias "LICENCIAS" 
                , dias_vencimiento "DIAS VENCIMIENTO"
                , count(distinct ka.username) "CUENTAS ACTIVAS" 
                , monthname(concat(SUBSTRING(max(periodo), 1, 4),"-",SUBSTRING(max(periodo), 5, 2),"-01")) ULTIMOPAGO_MES
                , SUBSTRING(max(periodo), 1, 4) ULTIMOPAGO_YEAR
                , IFNULL(GROUP_CONCAT(DISTINCT KMC.name SEPARATOR ' -\n') ,'') AS CONF
            from kapps_db.kapps k left join kapps_db.pagos kp on kp.kapp_id=k.id and kp.estado=1
            left join kapps_db.accounts ka on ka.kapp_id=k.id and ka.estado=1
            LEFT JOIN kapps_db.kapps_modules KM ON KM.kapp_id = k.id
            LEFT JOIN kapps_db.kapps_modules_cat KMC ON KMC.id = KM.module_id """
    if id_kapp:
       sql+="where k.id={} ".format(id_kapp) 
    sql+=" group by k.id, k.clave, k.name, k.fecha_cobro, state, licencias, dias_vencimiento"
    cursor.execute(sql)
    kapps_info, columnas  = cursor.fetchall(), cursor.column_names
    cursor.close()
    return kapps_info, columnas

@kapps_admin.route("/home/", methods=["GET", "POST"])
def home():
    if "token" in session:
        mysqlConn = DBConn()
        cursor = mysqlConn.cursor(dictionary=True)
        cursor.execute('SET lc_time_names = "es_ES"')
        kapps_info, columnas = datos_kapp() 
        kapps_morosas = len(['x' for kapp in kapps_info if kapp['DIAS ATRASO']>=0])

        cursor.execute(
            """select * from kapps_db.kapp_conf_cat """,
        )
        kapps_cat_info = cursor.fetchall()

        # KAPP INFO
        cursor.execute(
            """select a.name name, a.username 
            from kapps_db.accounts a where a.id = %s""",
            [session["id"]],
        )
        account = cursor.fetchone()
        session["ambiente"] = "PRODUCCION"
        session["clave"] = 'ADMIN' # CODIGO DISTINGUE LA KAPP
        session["username"] = account["username"]
        
        return render_template(
            "home.html"
            , kapps_info=kapps_info
            , kapps_morosas=kapps_morosas
            , columnas = columnas
        )
    else:
        return klogin.klogout(msg="Sesión Caducada!")

@kapps_admin.route("/kappconf", methods=["GET", "POST"])
def kappconf():
    id_kapp = request.form.get("kapp_id")
    kapps_info, columnas = datos_kapp(id_kapp)
    
    mysqlConn = DBConn()
    cursor = mysqlConn.cursor(dictionary=True)
    cursor.execute('SET lc_time_names = "es_ES"')
    cursor.execute("SET session time_zone = '-6:00'")
    
    cursor.execute(
            """SELECT ROUND(@rownum:=@rownum+1,0) numreg, kmc.id id_modulo, name, isnull(kapp_id) estado, description FROM kapps_db.kapps_modules_cat kmc 
            left join kapps_db.kapps_modules km on km.module_id=kmc.id and km.kapp_id=%s
            , (SELECT @rownum:=-1) r
            where type='MAIN' and active=1
            order by kmc.id asc""",
            (
                id_kapp,
            ),
        )
    kapps_modules = cursor.fetchall()
    
    cursor.execute("""SELECT txpc.id catalog_id, txp.id param_id, km.kapp_id, txpc.category, txpc.module_id id_modulo, txpc.nombre, txpc.descripcion, txpc.html_type, txpc.html_additional
	, IFNULL(txp.valor,txpc.default_value) valor
                    FROM kapps_db.kapps_modules_cat kmc 
                        inner join kapps_db.kapps_modules km on km.module_id=kmc.id and km.kapp_id=%s
                        left join kapps_db.tx_params_cat txpc on txpc.module_id= km.module_id
                        left join kapps_db.tx_params txp on txp.tx_params_cat_id=txpc.id and txp.kapp_id=%s
                    where type='MAIN' and active=1 and txpc.estado
                    order by txpc.id asc""",
            (
                id_kapp, id_kapp,
            ),
        )
    kapps_parameters = cursor.fetchall()
    kapps_parameters_cats = []
    [kapps_parameters_cats.append({"id_modulo":parametro['id_modulo'],"category":parametro['category']}) for parametro in kapps_parameters if {"id_modulo":parametro['id_modulo'],"category":parametro['category']} not in kapps_parameters_cats]
    
    cursor.execute("""
                select * from 
                   (SELECT ctz.id id, ctz_base.field_name system_field_name
                        , ctz.field_name field_name
                        , screen_name
                        , ctz.id_module_screen
                        , case when id_ctz_base is not null then ctz_ft2.tag else ctz_ft.tag end tag
                        , case when id_ctz_base is not null then ctz_ft2.id else ctz_ft.id end html_type_id
                        , name module_name
                        , 1 is_customizable
                        , ctz.is_active
                        , ifnull(ctz_base.id,Null) id_ctz_base
                        from tx.ctz left join tx.ctz_base 
                                        on ctz.id_ctz_base=ctz_base.id
                                    left join tx.ctz_module_screens on ctz.id_module_screen=ctz_module_screens.id
                                    left join tx.ctz_ft on ctz.id_field_type = ctz_ft.id 
                                    left join tx.ctz_ft ctz_ft2 on ctz_base.id_field_type = ctz_ft2.id
                                    left join kapps_db.kapps_modules km on km.kapp_id = id_kapp and km.module_id = ctz_module_screens.id_module_cat
                                    left join kapps_db.kapps_modules_cat kmc on  km.module_id=kmc.id
                        where ctz.id_kapp=%s
                    union all
                    SELECT 0 id, ctz.field_name system_field_name
                        , ctz.field_name
                        , screen_name
                        , ctz.id_module_screen
                        , ctz_ft.tag 
                        , ctz_ft.id
                        , name module_name
                        , is_customizable
                        , ctz.is_active
                        , ctz.id id_ctz_base 
                        from tx.ctz_base ctz
                                    left join tx.ctz_module_screens on ctz.id_module_screen=ctz_module_screens.id
                                    left join tx.ctz_ft on ctz.id_field_type = ctz_ft.id
                                    left join kapps_db.kapps_modules km on km.kapp_id=%s and km.module_id = ctz_module_screens.id_module_cat
                                    left join kapps_db.kapps_modules_cat kmc on  km.module_id=kmc.id
                        where ctz.id not in (select id_ctz_base from ctz where id_kapp=%s and id_ctz_base is not null)
                        ) t
                        order by screen_name, is_active desc, -id_ctz_base desc, id asc, system_field_name asc
                   """,
            (
                id_kapp, id_kapp,id_kapp
            ),
        )
    kapps_modules_fields = cursor.fetchall()
    kapps_modules_screens = []
    [kapps_modules_screens.append({"module_name":parametro['module_name'], "screen_name":parametro['screen_name'],"id_module_screen":parametro['id_module_screen']}) for parametro in kapps_modules_fields if {"module_name":parametro['module_name'], "screen_name":parametro['screen_name'], "screen_name":parametro['screen_name'], "id_module_screen":parametro['id_module_screen']} not in kapps_modules_screens]
    
    cursor.execute("""select id, html_type from ctz_ft where state=1""")
    html_types = cursor.fetchall()


    return render_template(
        "home.html"
        , kapps_info=kapps_info
        , columnas = columnas
        , kapps_morosas = 0
        , detalle = True
        , kapps_modules = kapps_modules
        , kapps_parameters = kapps_parameters
        , kapps_parameters_cats = kapps_parameters_cats
        , kapps_modules_fields = kapps_modules_fields
        , kapps_modules_screens = kapps_modules_screens
        , html_types=html_types
        )


@kapps_admin.route("/crud_kapp", methods=["POST","GET"])
def crud_kapp():
    result, reason, data = 'failed','No Action Specified', None
    mysqlConn = DBConn()
    cursor = mysqlConn.cursor(dictionary=True)
    cursor.execute('SET lc_time_names = "es_ES"')
    cursor.execute("SET session time_zone = '-6:00'")
      
    accion = request.json["accion"]

    if accion  == "0":  # ACTUALIZA KAPP
        cursor.execute(
            "update kapps_db.kapps set name=%s, state=%s, licencias=%s, fecha_cobro=%s, dias_vencimiento=%s where id=%s",
            (
                request.json["nombre"],
                request.json["estado"],
                request.json["licencias"],
                request.json["fecha_cobro"],
                request.json["vencimiento"],
                request.json["kapp_id"],
            ),
        )
        result, reason = 'success', None
    elif accion == "1":  # DATOS ULTIMO PAGO
        cursor.execute(
            """select date_format(date_add(date_format(concat(max(periodo),'01'),'%Y%m%d'),INTERVAL 1 MONTH),'%Y%m') periodo_sugerido
                from kapps_db.pagos where kapp_id=%s and estado=1;""",
            (
               request.json["kapp_id"],
            ),
        )
        response_periodo_sugerido = cursor.fetchone()
        result, reason, data = 'success', None, {'periodo_sugerido' : response_periodo_sugerido['periodo_sugerido']}
    elif accion == "2":  # REGISTRAR PAGO
        cursor.execute(
            """ insert into kapps_db.pagos (kapp_id, monto, periodo, fecha_registro, estado, userid) values (%s,%s,%s,%s,1,%s) """,
            (
                request.json["kapp_id"], request.json["monto"] , request.json["periodo"], request.json["fecha"],session["id"],
            ),
        )
        result, reason, data = 'success', None, None
    elif accion == "3":  # DATOS PAGOS
        cursor.execute(
            """select p.id, p.kapp_id, periodo, monto, date_format(fecha_registro,'%Y %M %d') fecha_registro, case when p.estado=0 then 'Desactivo' else 'Activo' end estado
                , userid, ka.username, ka2.username username_elimina, fecha_elimina 
                from kapps_db.pagos p left join kapps_db.accounts ka on ka.id=p.userid
                left join kapps_db.accounts ka2 on ka2.id=p.userid_elimina
                where p.kapp_id=%s order by periodo desc limit 12;""",
            (
                request.json["kapp_id"],
            ),
        )
        response_pagos = cursor.fetchall()
        result, reason, data = 'success', None, {'pagos':response_pagos}
    elif accion == "4":  # ANULAR PAGOS
        cursor.execute(
            """update kapps_db.pagos set estado=0, fecha_elimina=sysdate(), userid_elimina=%s
            where id=%s""",
            (
                session["id"],
                request.json["pagoId"]
            ),
        )
        print("> " + request.json["pagoId"])
        result, reason, data = 'success', None, None
    elif accion == "5":  # Configuracion LOAD
        cursor.execute(
            """SELECT kmc.id id_modulo, name, isnull(kapp_id) estado, description FROM kapps_db.kapps_modules_cat kmc 
            left join kapps_db.kapps_modules km on km.module_id=kmc.id and km.kapp_id=%s
            where type='MAIN' and active=1
            order by kmc.id asc""",
            (
                request.json["kapp_id"],
            ),
        )
        response_configuracion = cursor.fetchall()
        result, reason, data = 'success', None, {'configuracion':response_configuracion}
    elif accion == "6":  # Configuracion POST
        confJson = json.loads(request.json["conf"])
        for confcat in confJson:
            cursor.execute("delete from kapps_db.kapps_modules where kapp_id=%s and module_id=%s",
            (request.json["kappId"], confcat))
            if confJson[confcat]:
                cursor.execute("insert into kapps_db.kapps_modules (kapp_id, module_id) values (%s,%s)",
                (request.json["kappId"], confcat))
    elif accion == "7":  # Agregar KAPP
        confJson = json.loads(request.json["conf"])
        
        if len(confJson["clave"])!=4 or not confJson["clave"].isalnum():
            result, reason, data = 'error', 'Formato de clave inválido', None 
        else:
            cursor.execute(
            "select clave from kapps_db.kapps where clave= '{}'".format(confJson["clave"])
            )
            clave = cursor.fetchone()
            
            if clave:
                result, reason, data = 'error', 'Código de Clave ya existe', {'clave' : clave}
            else:
                cursor.execute(
                """ insert into kapps_db.kapps (name, owner, created_date, state, clave, licencias, fecha_cobro, mensualidad, correo_factura, dias_vencimiento) values 
                (%s,%s,sysdate(),'ACTIVE',%s,%s,%s,%s,%s,%s) """,
                (confJson["nombre"],confJson["propietario"],confJson["clave"].upper() ,confJson["licencias"],confJson["fechaCobro"],confJson["mensualidad"],confJson["email"],confJson["diasVencimiento"])
                )
                #print("last ID: " + str(cursor.lastrowid))
                # CREA USUARIO AMIND
                #newKappId= 6 # str(cursor.lastrowid)
                #datos_nuevo_usuario = {
                #    "correo": confJson["usuario_email"],
                #    "nivel": 1,
                #}
                #klogin.kcrud_usuario(7,confJson["usuario_nombre"],confJson["usuario_apellido"],newKappId,datos_nuevo_usuario)
                result, reason, data = 'success2', None, None
    
    mysqlConn.commit()
    cursor.close()
    return {'result' : result, 'reason' : reason, 'data' : data}


@kapps_admin.route("/crud_campo", methods=["POST","GET"])
def crud_campo():
    result, reason, data = 'failed','No Action Specified', None
    mysqlConn = DBConn()
    cursor = mysqlConn.cursor(dictionary=True)
    cursor.execute('SET lc_time_names = "es_ES"')
    cursor.execute("SET session time_zone = '-6:00'")
      
    accion = request.json["accion"]
    if accion  == "0":  # ACTUALIZA CAMPO
        ids = request.json["info"].split("-")  # id 0 = ctz_id, 1 = ctz_base, 2 = id_module_screen, 3 = id_kapp
        if ids[0] == "0" and ids[1] != "0": # ctz id
            sql = """insert into tx.ctz (id_kapp, id_module_screen, field_name, id_ctz_base, is_active) 
                values({0}, {1}, '{2}', {3}, {4})""".format(ids[3],ids[2], request.json["field_name"],ids[1],request.json["is_active"])
        if ids[0] != "0":
            sql = "update tx.ctz set field_name='{0}', is_active={1} where id={2}".format(request.json["field_name"],request.json["is_active"],ids[0])
        if ids[0] == "0" and ids[1] == "0": # New Field
            sql = """insert into tx.ctz (id_kapp, id_module_screen, field_name, is_active, id_field_type) 
                values({0}, {1}, '{2}', {3}, {4})""".format(ids[3],ids[2], request.json["field_name"],request.json["is_active"], request.json["selected_html_type"])  
        cursor.execute(sql)
        result, reason = 'success', None
    elif accion == "1":  # LOAD OPCION A CAMPO 
        id_campo = request.json["id_campo"]
        cursor.execute("select * from tx.ctz_fto where id_ctz= '{}'".format(id_campo))
        opciones = cursor.fetchall()
        result, reason, data = 'success', None, opciones
    elif accion == "2":  # ADD OPCION A CAMPO 
        id_campo = request.json["id_campo"]
        new_option = request.json["new_option"]
        cursor.execute(
            "insert into tx.ctz_fto (id_ctz, value, is_active) values (%s,%s,%s)",
            [id_campo, new_option, 1],
        )
        result, reason, data = 'success', None, None
    elif accion == "3":  # UPDATE OPCION A CAMPO 
        id_campo = request.json["id_campo"]
        option_new_value = request.json["option_new_value"]
        is_active = request.json["is_active"]
        cursor.execute(
            "update tx.ctz_fto set value=%s, is_active=%s where id=%s",
            [option_new_value, is_active, id_campo],
        )
        result, reason, data = 'success', None, None
    mysqlConn.commit()
    cursor.close()
    return {'result' : result, 'reason' : reason, 'data' : data}



@kapps_admin.route("/crud_parametro", methods=["POST","GET"])
def crud_parameter():
    result, reason, data = 'failed','No Action Specified', None
    mysql = DBConn()
    cursor = mysql.cursor(dictionary=True)
    cursor.execute('SET lc_time_names = "es_ES"')
    cursor.execute("SET session time_zone = '-6:00'")
    accion = request.json["accion"]
    if accion  == "0":  # ACTUALIZA PARAMETRO
        ids = request.json["id_parametro"].split("-")  # id 0 = id_kapp, id 1 = id_parametro
        id_kapp = ids[0]
        id_parametro = ids[1]
        new_parameter_value = request.json["new_parameter_value"]
        cursor.execute("""select 1 from kapps_db.tx_params where kapp_id={0} and tx_params_cat_id={1}""".format(id_kapp, id_parametro))
        is_parametro = cursor.fetchone()
        if is_parametro:
            sql = """update kapps_db.tx_params set valor='{0}' where kapp_id={1} and tx_params_cat_id={2}""".format(new_parameter_value, id_kapp, id_parametro)
        else:
            sql  = """insert into kapps_db.tx_params (kapp_id, tx_params_cat_id, valor) VALUES ({0},{1},'{2}')""".format(id_kapp, id_parametro, new_parameter_value)
        cursor.execute(sql)
        success, reason, data = True, 'Parametero Actualizado', None
    mysql.commit()
    cursor.close()
    return {'success' : success, 'reason' : reason, 'data' : data}



@kapps_admin.route("/nueva", methods=["POST"])
def nueva():
    # if 'loggedin' in session and request.method == 'POST':
    mysqlConn = DBConn()
    cursor = mysqlConn.cursor(dictionary=True)
    cursor.execute('SET lc_time_names = "es_ES"')
    cursor.execute("""select a.id, a.name, a.alt, a.html_initial_render_state, a.par1, a.par2, a.par3 ,at.tag, at.html_type 
        from kapps_db.tx_atts a left join kapps_db.tx_atts_types at on at.id=a.id_type
        where id_kapp=%s and a.state=1 order by a.rank asc;""",kapps_admin.config["KAPP_ID"])
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
            + "\\templates\\pdf_repository\\recibo_"
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
            + "\\templates\\pdf_repository\\boleta_"
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
            + "\\templates\\pdf_repository\\cotizacion_"
            + str(cotizacion[1])
            + ".pdf"
        )
        pdf.output(archivo, "F")
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
            + "\\templates\\pdf_repository\\comprobante_"
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
            + "\\templates\\pdf_repository\\comprobante_venta_"
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




@kapps_admin.route("/logout")
def logout():
    return klogin.klogout(msg="")


# CADA VEZ QUE SE LLAME A ALGUNA DEF
@kapps_admin.before_request
def before_request_func():
    #print(":::::-BEFORE REQUEST FUNC-:::::")
    #print("app_tx Kapp ID: '"+kapps_admin.config["application_id"] + "'")
    #print("root: " + request.path.lstrip("/"))
    #print(session,request,request.endpoint)
    #print(request.form)
    if "token" in session:
        #print("con token")
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
                return klogin.klogout(msg="Sesión Inválida")
    else:
        #print("sin token 2****")
        # print(request.method)
        # print(request.environ)
        # print("**"+str(request.routing_exception)+"**")
        # print(request.headers)
        # print(request.full_path)
        # print(request.host_url)
        # print(request.path)
        #print(request.endpoint)
        #print(request.form)
        if "username" not in request.form:
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
            elif request.endpoint == "static":
                None
            else:
                print("sin token 2b")
                kapps_admin.config["application_id"]="-"
                url_code = request.path.lstrip("/").upper()
                kapp_id = klogin.checkDomain(url_code)
                kapp_id = kapp_id if kapp_id else "-"
                #if kapp_id:
                #    app_tx.config["application_id"]=str(kapp_id)  
                #    print ("111kapp_id: " + str(kapp_id) + " / app_tx: "+ app_tx.config["application_id"] +" KappCOde: " +kapp_code )
                #print ("kapp_id: " + str(kapp_id) + " / app_tx: " + app_tx.config["application_id"]+" KappCOde: " +kapp_code)
                return klogin.klogin(kapps_admin.config["application_id"], url_code=url_code  , kapp_id=kapp_id)
                #return render_template("login.html", msg="", kapp_id=kapp_id, url_code=url_code)
        else:
            print('Going to validate Login!')
                


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
