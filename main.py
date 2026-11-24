from flask import Flask, render_template, request, session, g, redirect, url_for, make_response, abort
from datetime import datetime, timedelta, timezone
import os
import secrets
from urllib.parse import urlsplit
import klogin
import nuevo_admin
import soporte_admin
from dotenv import load_dotenv
import mysql.connector
import esquemas
import json

# ENV Variables
load_dotenv()


kapps_admin = Flask(__name__)
kapps_admin.config["PDF_FOLDER"] = "templates/pdfs/"
kapps_admin.config["JSON_SORT_KEYS"] = False

kapps_admin.config["application_id"] ='0'

# SEGURIDAD: cookie de sesión
kapps_admin.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    # En producción (HTTPS) definir SESSION_COOKIE_SECURE=1 en .env
    SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "0") == "1",
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,
)

# CONEXION A BASE DE DATOS
def DBConn():
    # esquemas.conectar traduce kapps_db. al esquema del ambiente (MYSQL_DB_KAPPS); copia de tx/esquemas.py
    Conn = esquemas.conectar(
        user= os.getenv('MYSQL_USER'),
        password= os.getenv('MYSQL_PASSWORD'),
        host= os.getenv('MYSQL_HOST'),
        database= os.getenv('MYSQL_DB'),
        raise_on_warnings = False
    )
    return Conn


# Change this to your secret key (can be anything, it's for extra protection)
kapps_admin.secret_key = os.getenv('APP_SECRET_KEY')

# LOGINS

@kapps_admin.route("/login", methods=["GET", "POST"])
@kapps_admin.route("/", methods=["GET", "POST"])
def login():
    return klogin.klogin(kapps_admin.config["application_id"])


# ---------------------------------------------------------------------------------------------------------------
# EDAD Y PRIVACIDAD (igual que TX, ver tx/perfil.py). POLITICA_VERSION debe ser la MISMA de tx/perfil.py:
# la política se publica en TX (/privacidad) y la aceptación vale para las dos apps.
# ---------------------------------------------------------------------------------------------------------------
POLITICA_VERSION = "2026-11-19"
EDAD_MINIMA = 18
TX_PRIVACIDAD_URL = (os.getenv("TX_BASE_URL") or "https://kapps.me/tx").rstrip("/") + "/privacidad"
TEMAS = ("bosque", "arrecife", "manglar", "volcan", "paramo")


def _hoy():
    return datetime.now(timezone(timedelta(hours=-6))).date()  # Costa Rica, sin horario de verano


def _edad(nacimiento):
    hoy = _hoy()
    return hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))


def _leer_fecha(texto):
    try:
        f = datetime.strptime((texto or "").strip(), "%Y-%m-%d").date()
    except ValueError:
        return None
    return f if 1900 <= f.year and f <= _hoy() else None


def _correo_google_en_uso(cursor, email, excluir_id=0):
    """Clave de la KAPP donde OTRO usuario ya tiene ese correo con 'Puede entrar con Google', o None.
    Un correo de Google pertenece a un solo usuario de KAPPS (igual que tx/klogin.correo_google_en_uso)."""
    cursor.execute(
        """select k.clave from kapps_db.accounts a left join kapps_db.kapps k on k.id=a.kapp_id
            where lower(a.email)=lower(%s) and a.google_login=1 and a.kapp_id<>0 and a.id<>%s limit 1""",
        [(email or "").strip(), int(excluir_id or 0)],
    )
    fila = cursor.fetchone()
    return (fila["clave"] or "?") if fila else None


def _cargar_perfil(id_cuenta):
    conn = DBConn()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("select tema, fecha_nacimiento, politica_version from kapps_db.accounts where id=%s", [id_cuenta])
    fila = cursor.fetchone() or {}
    cursor.close()
    conn.close()
    nacimiento = fila.get("fecha_nacimiento")
    session["tema"] = fila.get("tema") if fila.get("tema") in TEMAS else "bosque"
    session["pendiente_legal"] = (nacimiento is None or _edad(nacimiento) < EDAD_MINIMA
                                  or fila.get("politica_version") != POLITICA_VERSION)


@kapps_admin.route("/bienvenida", methods=["GET", "POST"])
def bienvenida():
    conn = DBConn()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("select name, fecha_nacimiento, politica_version from kapps_db.accounts where id=%s", [session["id"]])
    cuenta = cursor.fetchone() or {}
    error = ""
    if request.method == "POST":
        nacimiento = cuenta.get("fecha_nacimiento") or _leer_fecha(request.form.get("fecha_nacimiento"))
        if nacimiento is None:
            error = "Escriba una fecha de nacimiento válida."
        elif _edad(nacimiento) < EDAD_MINIMA:
            cursor.close()
            conn.close()
            return klogin.klogout(msg="<b>No es posible ingresar.</b><br>KAPPS solo puede usarse por personas mayores de 18 años.")
        elif request.form.get("acepto") != "1":
            error = "Para continuar debe aceptar la política de privacidad."
        else:
            cursor.execute(
                "update kapps_db.accounts set fecha_nacimiento=%s, politica_version=%s, politica_fecha=%s where id=%s",
                [nacimiento, POLITICA_VERSION, datetime.now(timezone(timedelta(hours=-6))).replace(tzinfo=None), session["id"]],
            )
            conn.commit()
            cursor.close()
            conn.close()
            session["pendiente_legal"] = False
            return redirect(url_for("home"))
    cursor.close()
    conn.close()
    return render_template(
        "bienvenida.html", nombre=cuenta.get("name") or "", nacimiento=cuenta.get("fecha_nacimiento"),
        politica_anterior=cuenta.get("politica_version"), version=POLITICA_VERSION, error=error,
        fecha_maxima=_hoy().isoformat(), privacidad_url=TX_PRIVACIDAD_URL,
    )


@kapps_admin.route("/foto/<int:id_cuenta>")
def foto_usuario(id_cuenta):
    """Foto de perfil de cualquier usuario (la app Admin ve todas las KAPPS)."""
    conn = DBConn()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("select mime, datos from kapps_db.accounts_foto where id_account=%s", [id_cuenta])
    fila = cursor.fetchone()
    cursor.close()
    conn.close()
    if not fila:
        abort(404)
    resp = make_response(bytes(fila["datos"]))
    resp.headers["Content-Type"] = fila["mime"]
    resp.headers["Cache-Control"] = "private, max-age=2592000"
    return resp

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
    params = []
    if id_kapp:
       sql+="where k.id=%s "
       params.append(id_kapp)
    sql+=" group by k.id, k.clave, k.name, k.fecha_cobro, state, licencias, dias_vencimiento order by state asc"
    cursor.execute(sql, params)
    kapps_info, columnas  = cursor.fetchall(), cursor.column_names
    cursor.close()
    return kapps_info, columnas

def stats_usuarios(cursor, kapp_id=None):
    """Usuarios activos de las KAPPs activas (listón) y, con kapp_id, las cuentas activas de esa KAPP (su fila)."""
    cursor.execute("""select count(*) n from kapps_db.accounts a
                        join kapps_db.kapps k on k.id=a.kapp_id and k.state='ACTIVE' where a.estado=1""")
    datos = {"usuarios": cursor.fetchone()["n"]}
    if kapp_id is not None:
        cursor.execute("select count(*) n from kapps_db.accounts where estado=1 and kapp_id=%s", [kapp_id])
        datos.update(kapp_id=kapp_id, cuentas_kapp=cursor.fetchone()["n"])
    return datos


def licencias_libres(cursor, kapp_id):
    """Licencias de la KAPP menos sus usuarios activos (0 si la KAPP no existe)."""
    cursor.execute("""select ifnull(licencias,0) - (select count(*) from kapps_db.accounts where kapp_id=k.id and estado=1) libres
                        from kapps_db.kapps k where k.id=%s""", [kapp_id])
    fila = cursor.fetchone()
    return fila["libres"] if fila else 0


@kapps_admin.route("/home/", methods=["GET", "POST"])
def home():
    if "token" in session:
        mysqlConn = DBConn()
        cursor = mysqlConn.cursor(dictionary=True)
        cursor.execute('SET lc_time_names = "es_ES"')
        kapps_info, columnas = datos_kapp() 
        kapps_morosas = len(['x' for kapp in kapps_info if kapp['DIAS ATRASO']>=0])


        # ESTADÍSTICAS (listón de la lista de KAPPs)
        usuarios_activos = stats_usuarios(cursor)["usuarios"]
        stats = {
            "total": len(kapps_info),
            "activas": sum(1 for k in kapps_info if k["ESTADO"] == "ACTIVE"),
            "suspendidas": sum(1 for k in kapps_info if k["ESTADO"] == "BLOCKED"),
            "vencidas": sum(1 for k in kapps_info if k["ESTADO"] != "INACTIVE" and k["DIAS ATRASO"] >= 1),
            "usuarios": usuarios_activos,
        }

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
        
        # TICKETS DE SOPORTE: lo primero que se ve al entrar (los abiertos, los más antiguos primero)
        try:
            tickets = soporte_admin.lista(cursor, "abiertos", limite=50)
            tickets_resumen = soporte_admin.resumen(cursor)
        except mysql.connector.Error:  # falta correr el SQL de soporte: Admin sigue funcionando
            tickets, tickets_resumen = None, None

        return render_template(
            "home.html"
            , kapps_info=kapps_info
            , kapps_morosas=kapps_morosas
            , columnas = columnas
            , stats = stats
            , tickets = tickets
            , tickets_resumen = tickets_resumen
            , estados_ticket = soporte_admin.ESTADOS
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
            """SELECT ROUND(@rownum:=@rownum+1,0) numreg, kmc.id id_modulo, name, isnull(kapp_id) estado, description 
            FROM kapps_db.kapps_modules_cat kmc 
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
                        from ctz left join ctz_base 
                                        on ctz.id_ctz_base=ctz_base.id
                                    left join ctz_module_screens on ctz.id_module_screen=ctz_module_screens.id
                                    left join ctz_ft on ctz.id_field_type = ctz_ft.id 
                                    left join ctz_ft ctz_ft2 on ctz_base.id_field_type = ctz_ft2.id
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
                        from ctz_base ctz
                                    left join ctz_module_screens on ctz.id_module_screen=ctz_module_screens.id
                                    left join ctz_ft on ctz.id_field_type = ctz_ft.id
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
    [kapps_modules_screens.append({"module_name":parametro['module_name'], "screen_name":parametro['screen_name'],"id_module_screen":parametro['id_module_screen']}) for parametro in kapps_modules_fields if {"module_name":parametro['module_name'], "screen_name":parametro['screen_name'], "id_module_screen":parametro['id_module_screen']} not in kapps_modules_screens]
    
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
        result, reason, data = 'success', None, None
    elif accion == "5":  # Configuracion LOAD
        cursor.execute(
            """SELECT kmc.id id_modulo, name, isnull(kapp_id) estado, description FROM kapps_db.kapps_modules_cat kmc 
            left join kapps_db.kapps_modules km on km.module_id=kmc.id and km.kapp_id=%s
            where type='MAIN' and active=1 and kmc.id <> 0
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
    elif accion == "7":  # Agregar KAPP + usuario administrador (el correo se envía aparte: accion 10)
        datos_alta, error = nuevo_admin.validar_alta(json.loads(request.json["conf"]))
        if error:
            result, reason, data = 'error', error, None
        else:
            cursor.execute("select 1 from kapps_db.kapps where clave=%s", [datos_alta["clave"]])
            if cursor.fetchone():
                result, reason, data = 'error', 'Código de Clave ya existe', None
            else:
                try:
                    cursor.execute(
                        """insert into kapps_db.kapps (name, owner, created_date, state, clave, licencias, fecha_cobro, mensualidad, correo_factura, dias_vencimiento)
                           values (%s,%s,sysdate(),'ACTIVE',%s,%s,%s,%s,%s,%s)""",
                        (datos_alta["nombre"], datos_alta["propietario"], datos_alta["clave"], datos_alta["licencias"],
                         datos_alta["fechaCobro"], datos_alta["mensualidad"], datos_alta["email"], datos_alta["diasVencimiento"]))
                    new_id = cursor.lastrowid
                    cursor.execute("insert into kapps_db.kapps_modules (kapp_id, module_id) values (%s,%s)", (new_id, 0))
                    username = nuevo_admin.generar_username(cursor, datos_alta["usuario_nombre"], datos_alta["usuario_apellido"])
                    password = nuevo_admin.generar_password()
                    # misma cifrado que usa TX para los usuarios de cada KAPP; password_reset=1 obliga a cambiarla al ingresar
                    cursor.execute(
                        """insert into kapps_db.accounts (username, email, name, lastname, kapp_id, nivel, estado, bloqueo, vigencia, password_reset, password2)
                           values (%s,%s,%s,%s,%s,1,1,0,1200,1,aes_encrypt(%s,UNHEX(SHA2(%s,512))))""",
                        (username, datos_alta["usuario_email"], datos_alta["usuario_nombre"].lower(), datos_alta["usuario_apellido"].lower(),
                         new_id, password, os.getenv('MYSQL_PASSWORD_ENCRYPT_CHAIN')))
                    result, reason = 'success', None
                    data = {'kapp_id': new_id, 'clave': datos_alta["clave"], 'username': username, 'password': password,
                            'email': datos_alta["usuario_email"]}
                except mysql.connector.Error:
                    mysqlConn.rollback()  # no queda a medias: ni KAPP ni usuario
                    kapps_admin.logger.exception("Error creando KAPP")
                    result, reason, data = 'error', 'No se pudo crear la KAPP. Intente de nuevo.', None
    elif accion == "10":  # ENVIAR CORREO CON ACCESO AL ADMINISTRADOR DE LA KAPP NUEVA
        # El destinatario sale de la base (no del navegador) y solo se envía si usuario y contraseña temporal coinciden.
        cursor.execute(
            """select a.name, a.email, k.name kapp_nombre, k.clave
               from kapps_db.accounts a join kapps_db.kapps k on k.id=a.kapp_id
               where a.kapp_id=%s and a.username=%s and a.password_reset=1
                 and aes_decrypt(a.password2,UNHEX(SHA2(%s,512)))=%s""",
            (request.json.get("kapp_id"), request.json.get("username"), os.getenv('MYSQL_PASSWORD_ENCRYPT_CHAIN'),
             request.json.get("password")))
        admin = cursor.fetchone()
        if not admin:
            result, reason, data = 'error', 'No se encontró el usuario administrador de la KAPP', None
        else:
            try:
                nuevo_admin.enviar_correo_acceso(admin["email"], admin["name"].title(), admin["kapp_nombre"], admin["clave"],
                                                 request.json["username"], request.json["password"])
                result, reason, data = 'success', None, {'email': admin["email"]}
            except Exception:
                kapps_admin.logger.exception("Error enviando correo de acceso")
                result, reason, data = 'error', 'No se pudo enviar el correo', {'email': admin["email"]}
    elif accion == "8":  # DATOS USUARIOS
        cursor.execute(
            """SELECT a.id, username, name, lastname, email, ifnull(phone1,'') phone1, ifnull(phone2,'') phone2
                    , nivel, estado, bloqueo, round(vigencia/60) vigencia, date_format(fecha_creacion,'%Y-%m-%d') fecha_creacion
                    , ifnull(al.ultimo_request,'') ultimo_request
                    , google_login, google_sub is not null google_vinculado
                    , ifnull(date_format(fecha_nacimiento,'%Y-%m-%d'),'') fecha_nacimiento
                    , (fecha_nacimiento is not null and ifnull(politica_version,'')=%s) registro_completo
                    , ifnull(unix_timestamp(f.actualizado),0) foto_v
                FROM kapps_db.accounts a
                    LEFT JOIN kapps_db.accounts_log al on al.id_account=a.id
                    LEFT JOIN kapps_db.accounts_foto f on f.id_account=a.id
                where kapp_id =%s
                order by (estado=1) desc, estado desc, username""",
            (
                POLITICA_VERSION,
                request.json["kapp_id"],
            ),
        )
        response_usuarios = cursor.fetchall()
        result, reason, data = 'success', None, {'usuarios':response_usuarios}
    elif accion == "9":  # ANULAR SESION DE USUARIO
        cursor.execute("delete from kapps_db.accounts_log where id_account=%s", [request.json["usuarioId"]])
        result, reason, data = 'success', None, None
    elif accion == "11":  # ACTUALIZA USUARIO (usuario y contraseña no se editan aquí)
        u = request.json
        limites = {"name": 30, "lastname": 30, "email": 100, "phone1": 17, "phone2": 17}  # largo de cada columna
        textos = {c: str(u.get(c) or "").strip() for c in limites}
        try:
            nivel, estado, bloqueo, vigencia = int(u["nivel"]), int(u["estado"]), int(u["bloqueo"]), int(u["vigencia"])
            google_login = 0 if str(u.get("google_login", 1)) == "0" else 1  # puede ingresar a TX con Google
        except (KeyError, TypeError, ValueError):
            nivel = None
        cursor.execute("select estado from kapps_db.accounts where id=%s and kapp_id=%s", (u.get("usuarioId"), u.get("kapp_id")))
        actual = cursor.fetchone()
        # fecha de nacimiento: la registra el usuario; aquí solo se corrige. Vacía = se le volverá a pedir al entrar.
        texto_nac = str(u.get("fecha_nacimiento") or "").strip()
        nacimiento = _leer_fecha(texto_nac) if texto_nac else None
        if not actual:
            result, reason = 'error', 'Usuario no encontrado en esta KAPP'
        elif texto_nac and (nacimiento is None or _edad(nacimiento) < EDAD_MINIMA):
            result, reason = 'error', 'Fecha de nacimiento inválida: debe ser de una persona mayor de 18 años.'
        elif nivel is not None and google_login and _correo_google_en_uso(cursor, textos["email"], u.get("usuarioId")):
            result, reason = 'error', ('El correo ya entra con Google en otro usuario (KAPP %s). Un correo de Google solo puede '
                                       'pertenecer a un usuario: desmarque «Ingreso con Google» o use otro correo.'
                                       % _correo_google_en_uso(cursor, textos["email"], u.get("usuarioId")))
        elif (nivel not in (1, 2, 3) or estado not in (0, 1, 2) or bloqueo not in (0, 1) or not 1 <= vigencia <= 100000
                or not textos["name"] or not textos["lastname"] or "@" not in textos["email"]
                or any(len(textos[c]) > limites[c] for c in limites)):
            result, reason = 'error', 'Datos de usuario inválidos'
        elif estado == 1 and actual["estado"] != 1 and licencias_libres(cursor, u.get("kapp_id")) < 1:
            # solo al pasar a Activo: editar a quien ya estaba activo no se bloquea aunque la KAPP esté al tope
            result, reason = 'error', 'La KAPP ya usa todas sus licencias. Desactive otro usuario o aumente las licencias.'
        else:
            # al cambiar el correo o quitar el permiso se borra la cuenta de Google vinculada
            cursor.execute(
                """update kapps_db.accounts set google_sub=NULL
                    where id=%s and kapp_id=%s and (lower(email)<>lower(%s) or %s=0)""",
                (u.get("usuarioId"), u.get("kapp_id"), textos["email"], google_login),
            )
            cursor.execute(
                """update kapps_db.accounts set name=%s, lastname=%s, email=%s, phone1=%s, phone2=%s
                        , nivel=%s, estado=%s, bloqueo=%s, vigencia=%s, google_login=%s
                    where id=%s and kapp_id=%s""",
                (textos["name"], textos["lastname"], textos["email"], textos["phone1"] or None, textos["phone2"] or None,
                 nivel, estado, bloqueo, vigencia * 60, google_login, u.get("usuarioId"), u.get("kapp_id")),
            )
            if "fecha_nacimiento" in u:
                cursor.execute("update kapps_db.accounts set fecha_nacimiento=%s where id=%s and kapp_id=%s",
                               (nacimiento, u.get("usuarioId"), u.get("kapp_id")))
            result, reason, data = 'success', None, stats_usuarios(cursor, u.get("kapp_id"))
    elif accion == "12":  # AGREGAR USUARIO A UNA KAPP + correo de bienvenida con su acceso
        nuevo, error = nuevo_admin.validar_usuario(request.json)
        cursor.execute("select name, clave from kapps_db.kapps where id=%s", [request.json.get("kapp_id")])
        kapp = cursor.fetchone()
        if error or not kapp:
            result, reason = 'error', error or 'KAPP no encontrada'
        elif licencias_libres(cursor, request.json["kapp_id"]) < 1:
            result, reason = 'error', 'La KAPP ya usa todas sus licencias. Desactive otro usuario o aumente las licencias.'
        elif str(request.json.get("google_login", 1)) != "0" and _correo_google_en_uso(cursor, nuevo["email"]):
            result, reason = 'error', ('El correo ya entra con Google en otro usuario (KAPP %s). Desmarque «Puede entrar con Google» '
                                       'o use otro correo.' % _correo_google_en_uso(cursor, nuevo["email"]))
        else:
            username = nuevo_admin.generar_username(cursor, nuevo["name"], nuevo["lastname"])
            password = nuevo_admin.generar_password()
            # mismo cifrado que usa TX; password_reset=1 marca la contraseña como temporal
            cursor.execute(
                """insert into kapps_db.accounts (username, email, name, lastname, kapp_id, nivel, estado, bloqueo, vigencia, password_reset, google_login, password2)
                   values (%s,%s,%s,%s,%s,%s,1,0,1200,1,%s,aes_encrypt(%s,UNHEX(SHA2(%s,512))))""",
                (username, nuevo["email"], nuevo["name"].lower(), nuevo["lastname"].lower(), request.json["kapp_id"],
                 nuevo["nivel"], 0 if str(request.json.get("google_login", 1)) == "0" else 1, password, os.getenv('MYSQL_PASSWORD_ENCRYPT_CHAIN')))
            try:
                nuevo_admin.enviar_correo_acceso(nuevo["email"], nuevo["name"].title(), kapp["name"], kapp["clave"],
                                                 username, password, es_admin=False)
                result, reason = 'success', None
                data = dict(stats_usuarios(cursor, request.json["kapp_id"]), username=username, email=nuevo["email"])
            except Exception:
                mysqlConn.rollback()  # sin correo nadie conoce la contraseña: no se deja el usuario creado
                kapps_admin.logger.exception("Error enviando correo de bienvenida")
                result, reason = 'error', 'No se pudo enviar el correo; el usuario no fue creado. Intente de nuevo.'

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
        nombre, activo = request.json["field_name"], request.json["is_active"]
        sql = None
        if ids[0] == "0" and ids[1] != "0":
            sql = ("insert into ctz (id_kapp, id_module_screen, field_name, id_ctz_base, is_active) values (%s,%s,%s,%s,%s)",
                   (ids[3], ids[2], nombre, ids[1], activo))
        if ids[0] != "0":
            sql = ("update ctz set field_name=%s, is_active=%s where id=%s", (nombre, activo, ids[0]))
        if ids[0] == "0" and ids[1] == "0":  # campo nuevo
            sql = ("insert into ctz (id_kapp, id_module_screen, field_name, is_active, id_field_type) values (%s,%s,%s,%s,%s)",
                   (ids[3], ids[2], nombre, activo, request.json["selected_html_type"]))
        cursor.execute(*sql)
        result, reason = 'success', None
    elif accion == "1":  # LOAD OPCION A CAMPO 
        id_campo = request.json["id_campo"]
        cursor.execute("select * from ctz_fto where id_ctz=%s", [id_campo])
        opciones = cursor.fetchall()
        result, reason, data = 'success', None, opciones
    elif accion == "2":  # ADD OPCION A CAMPO 
        id_campo = request.json["id_campo"]
        new_option = request.json["new_option"]
        cursor.execute(
            "insert into ctz_fto (id_ctz, value, is_active) values (%s,%s,%s)",
            [id_campo, new_option, 1],
        )
        result, reason, data = 'success', None, None
    elif accion == "3":  # UPDATE OPCION A CAMPO 
        id_campo = request.json["id_campo"]
        option_new_value = request.json["option_new_value"]
        is_active = request.json["is_active"]
        cursor.execute(
            "update ctz_fto set value=%s, is_active=%s where id=%s",
            [option_new_value, is_active, id_campo],
        )
        result, reason, data = 'success', None, None
    mysqlConn.commit()
    cursor.close()
    return {'result' : result, 'reason' : reason, 'data' : data}



@kapps_admin.route("/crud_parametro", methods=["POST","GET"])
def crud_parameter():
    result, reason, data = 'failed','No Action Specified', None
    success = False
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
        cursor.execute("select 1 from kapps_db.tx_params where kapp_id=%s and tx_params_cat_id=%s", (id_kapp, id_parametro))
        if cursor.fetchone():
            cursor.execute("update kapps_db.tx_params set valor=%s where kapp_id=%s and tx_params_cat_id=%s",
                           (new_parameter_value, id_kapp, id_parametro))
        else:
            cursor.execute("insert into kapps_db.tx_params (kapp_id, tx_params_cat_id, valor) values (%s,%s,%s)",
                           (id_kapp, id_parametro, new_parameter_value))
        success, reason, data = True, 'Parametero Actualizado', None
    mysql.commit()
    cursor.close()
    return {'success' : success, 'reason' : reason, 'data' : data}



# ---------------------------------------------------------------------------------------------------------------
# TICKETS DE SOPORTE (soporte_admin.py): los crean los usuarios en TX; aquí se responden y se les cambia el estado.
# ---------------------------------------------------------------------------------------------------------------
@kapps_admin.context_processor
def tickets_por_recibir():
    """Globito del botón Tickets de la barra: los que nadie ha abierto todavía."""
    if "token" not in session or "id" not in session:
        return {"tickets_nuevos": 0}
    try:
        conn = DBConn()
        cur = conn.cursor()
        cur.execute("select count(*) from kapps_db.soporte_tickets where estado='enviado'")
        n = cur.fetchone()[0]
        cur.close()
        conn.close()
    except mysql.connector.Error:
        n = 0
    return {"tickets_nuevos": int(n or 0)}


@kapps_admin.route("/tickets")
def tickets():
    if "token" not in session:
        return klogin.klogout(msg="Sesión Caducada!")
    estado = request.args.get("estado", "abiertos")
    estado = estado if estado in soporte_admin.ESTADOS or estado in ("abiertos", "todos") else "abiertos"
    kapp_id = request.args.get("kapp", type=int)
    modulo_id = request.args.get("modulo", type=int)
    conn = DBConn()
    cur = conn.cursor(dictionary=True)
    lista = soporte_admin.lista(cur, estado, kapp_id=kapp_id, modulo_id=modulo_id)
    resumen = soporte_admin.resumen(cur)
    cur.execute("select distinct k.id, k.name, k.clave from kapps_db.kapps k join kapps_db.soporte_tickets t on t.kapp_id=k.id order by k.name")
    kapps = cur.fetchall()
    cur.close()
    conn.close()
    return render_template("tickets.html", tickets=lista, resumen=resumen, estados=soporte_admin.ESTADOS, f_estado=estado,
                           f_kapp=kapp_id, f_modulo=modulo_id, kapps=kapps, modulos=soporte_admin.NOMBRES_MODULO)


@kapps_admin.route("/tickets/<int:tid>", methods=["GET", "POST"])
def ticket(tid):
    if "token" not in session:
        return klogin.klogout(msg="Sesión Caducada!")
    conn = DBConn()
    cur = conn.cursor(dictionary=True)
    try:
        t = soporte_admin.ticket(cur, tid)
        if not t:
            return render_template("no_dato.html", mensaje="Ticket no encontrado"), 404
        error, aviso = "", ""
        if request.method == "POST":
            try:
                visible, mensaje = soporte_admin.atender(cur, t, session["id"], request.form.get("estado", t["estado"]),
                                                         request.form.get("texto"), bool(request.form.get("interno")))
                conn.commit()
            except ValueError as e:
                conn.rollback()
                error = str(e)
            else:
                if visible:
                    soporte_admin.avisar_usuario(t, request.form.get("estado", t["estado"]), mensaje)
                return redirect(url_for("ticket", tid=tid, ok=1))
        elif soporte_admin.marcar_recibido(cur, t, session["id"]):
            conn.commit()
            soporte_admin.avisar_usuario(t, "recibido", "")
            t = soporte_admin.ticket(cur, tid)
            aviso = "Ticket marcado como recibido: se le avisó al usuario."
        return render_template("ticket.html", t=t, estados=soporte_admin.ESTADOS, error=error,
                               aviso=aviso or ("Guardado." if request.args.get("ok") else ""))
    finally:
        cur.close()
        conn.close()


@kapps_admin.route("/tickets/<int:tid>/captura")
def ticket_captura(tid):
    if "token" not in session:
        abort(401)
    conn = DBConn()
    cur = conn.cursor(dictionary=True)
    fila = soporte_admin.captura(cur, tid)
    cur.close()
    conn.close()
    if not fila:
        abort(404)
    resp = make_response(fila[1])
    resp.headers["Content-Type"] = fila[0]
    resp.headers["Cache-Control"] = "private, max-age=86400"
    return resp


@kapps_admin.route("/logout")
def logout():
    return klogin.klogout(msg="")


# SEGURIDAD: rechaza POST originados en otro sitio (CSRF)
@kapps_admin.before_request
def check_origin():
    if request.method == "POST":
        origin = request.headers.get("Origin")
        if origin and urlsplit(origin).netloc != request.host:
            return "Origen no permitido", 403


@kapps_admin.before_request
def csp_nonce():
    g.csp_nonce = secrets.token_urlsafe(16)


@kapps_admin.context_processor
def inject_csp_nonce():
    return {"csp_nonce": getattr(g, "csp_nonce", "")}


@kapps_admin.context_processor
def tx_ambiente_actual():
    """Ambiente para la banda de aviso (_banda_ambiente.html, igual que en TX): pruebas si los esquemas no son tx y kapps_db."""
    return {"tx_es_produccion": esquemas.ES_PRODUCCION, "tx_ambiente": esquemas.AMBIENTE,
            "tx_esquema": esquemas.ESQUEMA_DATOS + " · " + esquemas.KAPPS_DB}


@kapps_admin.after_request
def security_headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    resp.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if request.endpoint != "static":
        resp.headers["Cache-Control"] = "no-store"
        # Scripts inline solo con nonce; estilos inline permitidos (atributos style en las plantillas)
        resp.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            f"script-src 'self' 'nonce-{getattr(g, 'csp_nonce', '')}'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:; connect-src 'self'; object-src 'none'; "
            "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        )
    return resp


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
                    # EDAD Y PRIVACIDAD: sin fecha de nacimiento (18+) o sin aceptar la política vigente, solo /bienvenida
                    if "pendiente_legal" not in session:
                        _cargar_perfil(session["id"])
                    if session.get("pendiente_legal") and request.endpoint not in ("bienvenida", "static", "logout"):
                        return redirect(url_for("bienvenida"))
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
        # Solo el login es público para POST; cualquier otro POST requiere sesión
        if request.method == "POST" and request.endpoint == "login":
            return None
        if (
            request.endpoint != "logout"
            and request.endpoint != "login"
            and request.endpoint != "static"
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
        elif request.endpoint == "static":
            return None
        else:
            kapps_admin.config["application_id"]="-"
            url_code = request.path.lstrip("/").upper()
            kapp_id = klogin.checkDomain(url_code)
            kapp_id = kapp_id if kapp_id else "-"
            return klogin.klogin(kapps_admin.config["application_id"], url_code=url_code, kapp_id=kapp_id)


# MAPEO DE PRODUCTOS PARLEVEL <-> KAPPS
# Los productos son elementos con id_module_cat = 3 (INVENTARIO); sus datos están en
# elementos_datos según ctz (pantalla 1 = PRODUCTO). El nombre es ctz.id_ctz_base = 1.
PARLEVEL_MODULO_INVENTARIO, PARLEVEL_PANTALLA_PRODUCTO, PARLEVEL_CAMPO_NOMBRE = 3, 1, 1

def _parlevel_productos(cursor, kapp_id):
    cursor.execute(
        """SELECT e.id,
                  MAX(IF(ctz.id_ctz_base=%s, ed.valor, NULL)) nombre,
                  GROUP_CONCAT(IF(ctz.id_ctz_base=%s, NULL,
                                  CONCAT(ctz.field_name, ': ', IF(ctz.id_field_type=6, fto.value, ed.valor)))
                               ORDER BY IFNULL(ctz.id_ctz_base,15000), ctz.id SEPARATOR ' | ') propiedades
           FROM elementos e
                JOIN elementos_datos ed ON ed.id_elemento=e.id
                JOIN ctz ON ctz.id=ed.id_ctz AND ctz.id_kapp=e.id_kapp
                            AND ctz.id_module_screen=%s AND ctz.is_active=1
                LEFT JOIN ctz_fto fto ON ctz.id_field_type=6 AND fto.id=ed.valor
           WHERE e.id_kapp=%s AND e.id_module_cat=%s
           GROUP BY e.id
           ORDER BY nombre""",
        [PARLEVEL_CAMPO_NOMBRE, PARLEVEL_CAMPO_NOMBRE, PARLEVEL_PANTALLA_PRODUCTO, kapp_id, PARLEVEL_MODULO_INVENTARIO],
    )
    return cursor.fetchall()


@kapps_admin.route("/parlevel", methods=["POST"])
def parlevel():
    try:
        kapp_id = int(request.form.get("kapp_id", ""))
    except ValueError:
        return render_template("no_dato.html", mensaje="KAPP no válida"), 400
    mysqlConn = DBConn()
    cursor = mysqlConn.cursor(dictionary=True)
    cursor.execute("select id, name, clave from kapps_db.kapps where id=%s", [kapp_id])
    kapp = cursor.fetchone()
    if not kapp:
        cursor.close(); mysqlConn.close()
        return render_template("no_dato.html", mensaje="KAPP no encontrada"), 404
    productos = _parlevel_productos(cursor, kapp_id)
    cursor.execute(
        "select id, producto_id, parlevel_nombre from parlevel_productos_map where kapp_id=%s and estado=1 order by parlevel_nombre",
        [kapp_id],
    )
    mapeos = {}
    for m in cursor.fetchall():
        mapeos.setdefault(m["producto_id"], []).append(m)
    cursor.close(); mysqlConn.close()
    return render_template("parlevel.html", kapp=kapp, productos=productos, mapeos=mapeos)


@kapps_admin.route("/crud_parlevel", methods=["POST"])
def crud_parlevel():
    datos = request.get_json(silent=True) or {}
    try:
        kapp_id = int(datos.get("kapp_id"))
        accion = datos.get("accion")
        mysqlConn = DBConn()
    except (TypeError, ValueError):
        return {"result": "error", "reason": "Datos inválidos"}, 400
    cursor = mysqlConn.cursor(dictionary=True)
    try:
        if accion == "add":
            producto_id = int(datos.get("producto_id"))
            nombre = str(datos.get("nombre", "")).strip()
            if not 1 <= len(nombre) <= 150:
                return {"result": "error", "reason": "El nombre debe tener entre 1 y 150 caracteres"}
            # el producto debe ser de esta KAPP y ser un producto (no un lote)
            cursor.execute(
                """select 1 from elementos e
                   where e.id=%s and e.id_kapp=%s and e.id_module_cat=%s
                     and exists (select 1 from elementos_datos ed join ctz on ctz.id=ed.id_ctz
                                 where ed.id_elemento=e.id and ctz.id_module_screen=%s)""",
                [producto_id, kapp_id, PARLEVEL_MODULO_INVENTARIO, PARLEVEL_PANTALLA_PRODUCTO],
            )
            if not cursor.fetchone():
                return {"result": "error", "reason": "El producto no pertenece a esta KAPP"}
            try:
                cursor.execute(
                    "insert into parlevel_productos_map (kapp_id, producto_id, parlevel_nombre, id_usuario) values (%s,%s,%s,%s)",
                    [kapp_id, producto_id, nombre, session.get("id")],
                )
            except mysql.connector.errors.IntegrityError:
                return {"result": "error", "reason": "Ese nombre de PARLEVEL ya está asignado a un producto de esta KAPP"}
            new_id = cursor.lastrowid
            mysqlConn.commit()
            return {"result": "success", "data": {"id": new_id, "producto_id": producto_id, "parlevel_nombre": nombre}}
        if accion == "delete":
            cursor.execute("delete from parlevel_productos_map where id=%s and kapp_id=%s", [int(datos.get("id")), kapp_id])
            mysqlConn.commit()
            return {"result": "success"}
        return {"result": "error", "reason": "Acción no válida"}, 400
    except (TypeError, ValueError):
        return {"result": "error", "reason": "Datos inválidos"}, 400
    finally:
        cursor.close()
        mysqlConn.close()


# ERRORES
@kapps_admin.errorhandler(404)
def page_not_found(e):
    # note that we set the 404 status explicitly
    return render_template("no_dato.html", mensaje="Página no encontrada"), 404


if __name__ == "__main__":
    kapps_admin.run(host="0.0.0.0", port=os.getenv('SERVER_PORT'), debug=os.getenv("FLASK_DEBUG") == "1")
