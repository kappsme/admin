from flask import Flask, render_template, request, redirect, url_for, session
#import MySQLdb
from random import randint, random
from datetime import datetime
import string
import os
import re
from main import DBConn
from dotenv import load_dotenv

# ENV Variables
load_dotenv()
#load_dotenv('../.env-admin')

# CADENA PARA ENCRYPTACION EN MYSQL
cadena_password = os.getenv('MYSQL_PASSWORD_ENCRYPT_CHAIN')
#cadena_password_admin = os.getenv('MYSQL_PASSWORD_ENCRYPT_CHAIN_ADMIN')

def checkDomain(code):
    mysql=DBConn()
    cursor = mysql.cursor(dictionary=True)
    cursor.execute(
            "SELECT id from kapps_db.kapps where clave=%s and state = 'ACTIVE'", [code]
        )
    result=cursor.fetchone()
    cursor.close()
    mysql.close()
    kapp_id = result["id"] if result is not None else "-"
    return kapp_id   
    

def klogout(msg,appId="",kapp_code="", url_code="", kapp_id=""):
    # Quita Token de Seguridad
    # print("QUITANDO TOKEN ....")
    mysql=DBConn()
    cursor = mysql.cursor(dictionary=True)
    if "id" in session:
        cursor.execute(
            "delete from kapps_db.accounts_log where id_account=%s", [session["id"]]
        )
    # Remove session data, this will log the user out
    session.pop("id", None)
    session.pop("token", None)
    session.pop("token_new", None)
    session.pop("kapp", None)
    session.pop("nivel", None)
    session.pop("clave", None)
    session.pop("impresiones", None)
    session.pop("ambiente", None)
    session.pop("username", None)
    cursor.close()
    mysql.close()
    # Redirect to login page
    return render_template("login.html", msg=msg, kapp_code=kapp_code, kapp_id=kapp_id, url_code=url_code)


def klogin(aplication_id, kapp_id="", url_code=""):
    print(">>> KLogin.klogin 1, aplication_id: "+str(aplication_id) + " / urlCode: "+url_code + " / kapp_id: "+str(kapp_id))
    ## ADMIN
    kapp_code=0
    kapp_id = 0
    aplication_id=0
    if aplication_id=="-" and not kapp_id:
        msg="Dominio No Encontrado"
        print("KLogin.klogin 2:" + msg)
        return klogout(msg)
    elif aplication_id=="-" and kapp_id:
        msg=""
        print("KLogin.klogin 3")
        return klogout(msg, url_code=url_code, kapp_id=kapp_id)
    else:
        if (
            request.method == "POST"
            and "username" in request.form
            and "password" in request.form
            # and "domain" in request.form
        ):
            # Create variables for easy access
            username = request.form["username"]
            password = request.form["password"]
            #domain = request.form["domain"]

            # print(">>> KLogin 1-2")
            mysql=DBConn()
            cursor = mysql.cursor(dictionary=True)
            #print (domain, username, cadena_password, password)
            cursor.execute("SET session time_zone = '-6:00'")
            sql="""SELECT a.id, nivel, estado, bloqueo 
                    FROM kapps_db.accounts a
                    WHERE username = '{}' and estado=1 and kapp_id=0
                            AND aes_decrypt(password2,UNHEX(SHA2('{}',512))) = '{}'
                """.format( username, cadena_password, password)
            #print("SQL KLOGIN: "+sql)
            cursor.execute(sql)
            account = cursor.fetchone()


            # If account exists in accounts table in out database
            if account:
                # Verifica si tiene Bloqueo
                if int(account['bloqueo']) == 1:
                    return klogout(
                        msg="<b>Usuario Bloqueado</b<br>Por favor, comuníquese con su Administrador",
                    )
                # Verifica LOGGED IN
                cursor.execute(
                    "select timestampdiff(second,ultimo_request,sysdate()) duracion_session, ac.vigencia, token \
                from kapps_db.accounts_log log left join kapps_db.accounts ac on ac.id=log.id_account \
                where id_account=%s",
                    [account['id']],
                )
                resultado=cursor.fetchone()
                # resultado = dict(zip(cursor.column_names, resultado)) if cursor.rowcount >= 0 else None
                # print(cursor.statement)
                # print(cursor.rowcount)
                

                if (
                    resultado is None
                    or resultado["duracion_session"] > resultado["vigencia"]
                ):
                    # CREA TOKEN
                    #print(resultado)
                    token = datetime.now().strftime("%d%H%M%S%f") + str(randint(0, 999))
                    # Create session data, we can access this data in other routes
                    session["token"] = token
                    # session['token_new'] = True
                    session["id"] = account['id']
                    session["nivel"] = account['nivel']
                    session["impresiones"] = 1
                    cursor.execute(
                        "delete from kapps_db.accounts_log where id_account=%s",
                        [session["id"]],
                    )
                    cursor.execute(
                        "insert into kapps_db.accounts_log (token,id_account,ultimo_request) values (%s,%s,sysdate())",
                        (session["token"], session["id"]),
                    )
                    mysql.commit()
                    cursor.close()
                    # Redirect to home page
                    print ("go HOME")
                    return redirect(url_for("home"))
                else:
                    print("USER GETTING IN")
                    if "token" in session:
                        if resultado["token"] == session["token"]:
                            cursor.close()
                            return redirect(url_for("home"))
                        else:
                            cursor.close()
                            session.pop("id", None)
                            return klogout(
                                msg="<b>Acceso Denegado 1</b><br>Solo es posible una sesión por Usuario.",
                            )
                    else:
                        cursor.close()
                        return klogout(
                            msg="<b>Acceso Denegado 2</b><br>Solo es posible una sesión por Usuario.",
                        )
            else:
                # Account doesnt exist or username/password incorrect
                msg = "Usuario o Contraseña incorrecto!"
                cursor.close()
                return klogout(msg, aplication_id)
        else:
            print(">>> KLogin 2")
            return klogout(msg="",kapp_code=kapp_code)
            # return render_template('login.html')


def kcrud_usuario(accion, parametro, parametro2, aplication_id, parametro3=0):
    mysql=DBConn()
    cursor = mysql.cursor(dictionary=True)
    # cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SET session time_zone = '-6:00'")
    if accion == 0:  # ANULA SESIONES
        print("KENNY")
        cursor.execute(
            "delete from kapps_db.accounts_log where id_account=%s", [int(parametro)]
        )
        mysql.connection.commit()
        cursor.close()
        return "OK"
    if accion == 1:  # CONSULTA DE USUARIO Y REGRESA SUGERENCIA DE CORREO
        cursor.execute(
            "select email from kapps_db.accounts where username=%s and ((kapp_id=%s and estado=1 and bloqueo=0) or kapp_id=0)",
            (parametro, aplication_id),
        )
        resultado = cursor.fetchone()
        cursor.close()
        if resultado is not None:
            correo = resultado["email"]
            return correo[0:3] + "****" + correo[correo.find("@") :]
        else:
            return "0"
    elif (
        accion == 2
    ):  # CONSULTA DE USUARIO Y CORREO Y, SI COINCIDE, ENVIA CORREO PARA RECUPERAR CONTRASEÑA
        cursor.execute(
            "select id, email from kapps_db.accounts where username=%s and (kapp_id=%s or kapp_id=0) and estado=1 and email=%s",
            (parametro, aplication_id, parametro2),
        )
        resultado = cursor.fetchone()
        if resultado is not None:
            # limpia claves anteriores
            cursor.execute(
                "update kapps_db.accounts_recovers set estado=0 where id_usuario = %s",
                [resultado["id"]],
            )
            clave_letras = "".join([chr(randint(65, 90)) for i in range(3)])
            clave_numeros = "".join([chr(randint(48, 57)) for i in range(2)])
            clave = clave_letras + clave_numeros
            boton = randint(1, 3)
            clave_link = "".join([chr(randint(65, 90)) for i in range(8)])
            cursor.execute(
                "insert into kapps_db.accounts_recovers (id_usuario, email, clave, estado, boton, clave_link ) values (%s,%s,%s,%s,%s,%s)",
                (resultado["id"], resultado["email"], clave, 1, boton, clave_link),
            )
            mysql.connection.commit()
            cursor.close()
            resultado = {"correo": resultado["email"], "clave": clave, "boton": boton}
            return resultado
        else:
            return "0"
    elif accion == 3:  # ACTUALIZA USUARIO
        usuario_split = parametro2.split(",")
        cursor.execute(
            "update kapps_db.accounts set email=%s, nivel=%s, estado=%s, bloqueo=%s, vigencia=%s where id=%s",
            (
                usuario_split[0],
                usuario_split[1],
                usuario_split[2],
                usuario_split[3],
                int(usuario_split[4]) * 60,
                parametro,
            ),
        )
        mysql.connection.commit()
        cursor.close()
        return "OK"
    elif accion == 4:  # CAMBIO DE CONTRASENA (verifica Codigo y Boton)
        username = parametro
        codigo = parametro2
        boton = parametro3
        cursor.execute(
            "select id from kapps_db.accounts where username=%s and (kapp_id=%s or kapp_id=0) and estado=1",
            (username, aplication_id),
        )
        resultado = cursor.fetchone()
        if resultado is None:
            return "0"
        id_usuario = str(resultado["id"])
        cursor.execute(
            "select clave_link from kapps_db.accounts_recovers where id_usuario=%s and clave=%s and boton=%s and timestampdiff(MINUTE, fecha_creacion,sysdate())<=60 and estado=1;",
            (id_usuario, codigo, boton),
        )
        mysql.connection.commit()
        resultado = cursor.fetchone()
        if resultado is not None:
            cursor.close()
            return resultado["clave_link"]
        else:
            cursor.execute(
                "update kapps_db.accounts_recovers set estado=0 where id_usuario=%s",
                (id_usuario),
            )
            mysql.connection.commit()
            return "02"
    elif accion == 5:  # CAMBIO DE CONTRASENA REDIRECT
        codigo = parametro
        codigo_link = parametro2
        cursor.execute(
            "select id_usuario from kapps_db.accounts_recovers where clave=%s and clave_link=%s and timestampdiff(MINUTE, fecha_creacion,sysdate())<=60 and estado=1;",
            (
                codigo,
                codigo_link,
            ),
        )
        resultado = cursor.fetchone()
        cursor.close()
        if resultado is not None:
            return "OK"
        else:
            return "01"
    elif accion == 6:  # CAMBIO DE CONTRASENA VERIFICAR Y EFECTIVO
        cadena_password = os.getenv('MYSQL_PASSWORD_ENCRYPT_CHAIN')
        codigo = parametro
        codigo_link = parametro2
        password_nuevo = parametro3
        cursor.execute(
            "select id_usuario from kapps_db.accounts_recovers where clave=%s and clave_link=%s and timestampdiff(MINUTE, fecha_creacion,sysdate())<=60 and estado=1;",
            (
                codigo,
                codigo_link,
            ),
        )

        resultado = cursor.fetchone()
        if resultado is None:
            cursor.close()
            return "ERROR-EXPIRED"
        else:
            id_usuario = resultado["id_usuario"]
            cursor.execute(
                "select case when kapp_id=0 then convert(aes_decrypt(password2,UNHEX(SHA2(%s,512))),char) else convert(aes_decrypt(password2,UNHEX(SHA2(%s,512))),char) end password_base \
                    , kapp_id from kapps_db.accounts where id=%s and estado=1",
                (cadena_password_admin,cadena_password, id_usuario),
            )
            resultado = cursor.fetchone()
            if resultado is None:
                cursor.close()
                return "ERROR-USUARIO"
            else:
                password_base = str(resultado["password_base"])
                if password_base == password_nuevo:
                    return "ERROR-PASSWORDREPETIDO"
                else:
                    if str(resultado["kapp_id"]) =='0':
                        cadena_password = cadena_password_admin
                    cursor.execute(
                        "update kapps_db.accounts set password2 = aes_encrypt(%s,UNHEX(SHA2(%s,512))) where id=%s and estado=1 and (kapp_id=%s or kapp_id=0)",
                        (password_nuevo, cadena_password, id_usuario, aplication_id),
                    )
                    cursor.execute(
                        "update kapps_db.accounts_recovers set estado=0 where id_usuario=%s",
                        [id_usuario],
                    )
                    mysql.connection.commit()
                    cursor.close()
                    return "OK"
    elif accion == 7:  # CREA USUARIO
        # CREA USERNAME
        cadena_password = os.getenv('MYSQL_PASSWORD_ENCRYPT_CHAIN')
        nombres = parametro.strip().lower()  # NOMBRES
        apellidos = parametro2.strip().lower()  # APELLIDOS
        apellido2 = ""
        # if len(apellidos.split(" ")) > 1:
        #     apellido2 = apellidos.split(" ")[1][0:1]
        new_username = nombres.split(" ")[0] + apellidos.split(" ")[0][0:1] + apellido2
        # VERIFICA SI YA EXISTE ESE USUARIO
        cursor.execute(
            "select username from kapps_db.accounts \
                where id = (select max(id) from kapps_db.accounts k2 where username regexp %s)",
            (new_username,),
        )
        resultado = cursor.fetchone()
        if resultado is None:
            new_username += str(1)
        else:
            w = resultado["username"]
            last_digits = re.match(".*?([0-9]+)$", w).group(1)
            new_username += str(int(last_digits) + 1)
        # CREA PASSWORD
        password = ""
        password_conf = {
            "alfa_chars_upper": 2,
            "alfa_chars_lower": 3,
            "special_chars": 1,
            "numeric_chars": 2,
        }
        for char_type in password_conf:
            if char_type == "alfa_chars_upper":
                password += "".join(
                    [chr(randint(65, 90)) for i in range(password_conf[char_type])]
                )
            if char_type == "alfa_chars_lower":
                password += "".join(
                    [chr(randint(97, 122)) for i in range(password_conf[char_type])]
                )
            if char_type == "special_chars":
                password += "".join(
                    [chr(randint(35, 43)) for i in range(password_conf[char_type])]
                )
            if char_type == "numeric_chars":
                password += "".join(
                    [chr(randint(48, 57)) for i in range(password_conf[char_type])]
                )
        # GUARDA EL NUEVO USUARIO
        correo_nuevo_usuario = parametro3["correo"]
        nivel_nuevo_usuario = parametro3["nivel"]
        sql = f"""insert into kapps_db.accounts (username, email, name, lastname, kapp_id, nivel, estado, bloqueo, vigencia, password_reset, password2) values('{new_username}','{correo_nuevo_usuario}','{nombres}','{apellidos}','{aplication_id}','{nivel_nuevo_usuario}',1,0,1200,1,aes_encrypt('{password}',UNHEX(SHA2('{cadena_password}',512))))"""
        print("SQL >>>>>>>>> " + sql)
        cursor.execute(sql)
        
        mysql.commit()
        cursor.close()
        datos_mail = [nombres, password]
        main.envio_correo(8, parametro3["correo"], 0, datos_mail)
        return {"estado": "OK", "nuevo_usuario": new_username}
    else:
        return "x"
