import os
import secrets
import time

import mysql.connector
from dotenv import load_dotenv
from flask import render_template, request, redirect, url_for, session
from werkzeug.security import check_password_hash, generate_password_hash

from main import DBConn

load_dotenv()

# Cadena de cifrado de las contraseñas antiguas (aes_encrypt). Solo se usa para validar y migrar a hash.
cadena_password = os.getenv('MYSQL_PASSWORD_ENCRYPT_CHAIN')

# pbkdf2 viene en toda compilación de Python (scrypt no siempre); 600k iteraciones (recomendación OWASP)
HASH_METODO = "pbkdf2:sha256:600000"

# LÍMITE DE INTENTOS: máx. fallos dentro de la ventana, por IP+usuario y por IP.
MAX_FALLOS_USUARIO, MAX_FALLOS_IP, VENTANA_SEG = 5, 20, 300
# Respaldo en memoria si la tabla kapps_db.login_intentos aún no existe (ver SQL_DDL_DML_UPDATES.sql)
_FALLOS_MEM = {}


def _intentos_bloqueado(cursor, ip, usuario):
    try:
        cursor.execute(
            """select sum(usuario=%s) n_usuario, count(*) n_ip from kapps_db.login_intentos
               where ip=%s and fecha > now() - interval %s second""",
            [usuario, ip, VENTANA_SEG],
        )
        r = cursor.fetchone()
        return (r["n_usuario"] or 0) >= MAX_FALLOS_USUARIO or (r["n_ip"] or 0) >= MAX_FALLOS_IP
    except mysql.connector.Error:
        ahora = time.time()
        _FALLOS_MEM[(ip, usuario)] = [t for t in _FALLOS_MEM.get((ip, usuario), []) if ahora - t < VENTANA_SEG]
        return len(_FALLOS_MEM[(ip, usuario)]) >= MAX_FALLOS_USUARIO


def _intentos_registrar_fallo(cursor, conn, ip, usuario):
    try:
        cursor.execute("insert into kapps_db.login_intentos (ip, usuario) values (%s,%s)", [ip, usuario])
        cursor.execute("delete from kapps_db.login_intentos where fecha < now() - interval 1 day")
        conn.commit()
    except mysql.connector.Error:
        _FALLOS_MEM.setdefault((ip, usuario), []).append(time.time())


def _intentos_limpiar(cursor, conn, ip, usuario):
    try:
        cursor.execute("delete from kapps_db.login_intentos where ip=%s and usuario=%s", [ip, usuario])
        conn.commit()
    except mysql.connector.Error:
        _FALLOS_MEM.pop((ip, usuario), None)


def _verificar_password(cursor, conn, username, password):
    """Devuelve la cuenta si usuario/contraseña son correctos, si no None.
    Usa password_hash (pbkdf2-sha256); si la cuenta aún tiene solo la clave antigua (aes), la valida y la migra a hash."""
    try:
        cursor.execute(
            """select id, nivel, estado, bloqueo, password_hash from kapps_db.accounts
               where username=%s and estado=1 and kapp_id=0""",
            [username],
        )
    except mysql.connector.ProgrammingError:  # columna password_hash aún no creada
        cursor.execute(
            """select id, nivel, estado, bloqueo, null password_hash from kapps_db.accounts
               where username=%s and estado=1 and kapp_id=0""",
            [username],
        )
    account = cursor.fetchone()
    if not account:
        return None
    if account["password_hash"]:
        return account if check_password_hash(account["password_hash"], password) else None
    cursor.execute(
        """select 1 from kapps_db.accounts
           where id=%s and aes_decrypt(password2,UNHEX(SHA2(%s,512))) = %s""",
        [account["id"], cadena_password, password],
    )
    if not cursor.fetchone():
        return None
    try:  # migración gradual: queda el hash para el próximo ingreso
        cursor.execute("update kapps_db.accounts set password_hash=%s where id=%s",
                       [generate_password_hash(password, method=HASH_METODO), account["id"]])
        conn.commit()
    except mysql.connector.Error:
        pass
    return account


def checkDomain(code):
    mysql_conn = DBConn()
    cursor = mysql_conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id from kapps_db.kapps where clave=%s and state = 'ACTIVE'", [code]
    )
    result = cursor.fetchone()
    cursor.close()
    mysql_conn.close()
    return result["id"] if result is not None else "-"


def klogout(msg, appId="", kapp_code="", url_code="", kapp_id=""):
    # Quita token de seguridad y datos de sesión
    mysql_conn = DBConn()
    cursor = mysql_conn.cursor(dictionary=True)
    if "id" in session:
        cursor.execute("delete from kapps_db.accounts_log where id_account=%s", [session["id"]])
        mysql_conn.commit()
    for k in ("id", "token", "token_new", "kapp", "nivel", "clave", "impresiones", "ambiente", "username"):
        session.pop(k, None)
    cursor.close()
    mysql_conn.close()
    return render_template("login.html", msg=msg, kapp_code=kapp_code, kapp_id=kapp_id, url_code=url_code)


def klogin(aplication_id, kapp_id="", url_code=""):
    # App de administración: no depende del dominio/KAPP de la URL (el original forzaba estos valores a 0).
    if not (request.method == "POST" and "username" in request.form and "password" in request.form):
        return klogout(msg="")

    username = request.form["username"]
    password = request.form["password"]
    ip = request.remote_addr or "-"

    mysql_conn = DBConn()
    cursor = mysql_conn.cursor(dictionary=True)
    cursor.execute("SET session time_zone = '-6:00'")
    try:
        if _intentos_bloqueado(cursor, ip, username.lower()):
            return klogout(msg="Demasiados intentos. Espere unos minutos e intente de nuevo.")

        account = _verificar_password(cursor, mysql_conn, username, password)
        if not account:
            _intentos_registrar_fallo(cursor, mysql_conn, ip, username.lower())
            return klogout("Usuario o Contraseña incorrecto!", aplication_id)
        _intentos_limpiar(cursor, mysql_conn, ip, username.lower())

        if int(account["bloqueo"]) == 1:
            return klogout(msg="<b>Usuario Bloqueado</b><br>Por favor, comuníquese con su Administrador")

        # ¿Ya hay una sesión vigente para este usuario?
        cursor.execute(
            """select timestampdiff(second,ultimo_request,sysdate()) duracion_session, ac.vigencia, token
               from kapps_db.accounts_log log left join kapps_db.accounts ac on ac.id=log.id_account
               where id_account=%s""",
            [account["id"]],
        )
        resultado = cursor.fetchone()

        if resultado is None or resultado["duracion_session"] > resultado["vigencia"]:
            # token corto (16 caracteres): es el largo que admite accounts_log.token
            token = secrets.token_hex(8)
            session.clear()  # evita fijación de sesión
            session["token"] = token
            session["id"] = account["id"]
            session["nivel"] = account["nivel"]
            session["impresiones"] = 1
            cursor.execute("delete from kapps_db.accounts_log where id_account=%s", [account["id"]])
            cursor.execute(
                "insert into kapps_db.accounts_log (token,id_account,ultimo_request) values (%s,%s,sysdate())",
                (token, account["id"]),
            )
            mysql_conn.commit()
            return redirect(url_for("home"))

        if "token" in session and resultado["token"] == session["token"]:
            return redirect(url_for("home"))
        session.pop("id", None)
        return klogout(msg="<b>Acceso Denegado</b><br>Solo es posible una sesión por Usuario.")
    finally:
        cursor.close()
        mysql_conn.close()
