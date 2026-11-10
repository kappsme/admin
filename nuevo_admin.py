"""Alta de una KAPP: validación de datos, usuario administrador del tenant y correo de bienvenida."""
import os
import re
import secrets
import smtplib
import unicodedata
from datetime import datetime
from email.message import EmailMessage
from html import escape

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TX_URL = os.getenv("TX_BASE_URL", "https://kapps.me/tx")  # el tenant ingresa en TX_URL/<CLAVE>


def validar_alta(d):
    """Devuelve (datos_limpios, None) o (None, mensaje de error). Todo llega como texto desde el formulario."""
    def txt(k, maximo):
        v = str(d.get(k, "")).strip()
        if not v:
            raise ValueError("Falta completar: " + k)
        if any(ord(c) < 32 for c in v):  # saltos de línea irían a los encabezados del correo
            raise ValueError("%s contiene caracteres no permitidos" % k)
        if len(v) > maximo:
            raise ValueError("%s es demasiado largo (máximo %d caracteres)" % (k, maximo))
        return v

    def num(k, minimo=0):
        try:
            n = int(str(d.get(k, "")).strip())
        except ValueError:
            raise ValueError(k + " debe ser un número entero")
        if n < minimo:
            raise ValueError("%s no puede ser menor a %d" % (k, minimo))
        return n

    try:
        clave = txt("clave", 4)
        if len(clave) != 4 or not clave.isalnum() or not clave.isascii():
            raise ValueError("La clave debe tener 4 letras o números")
        if not any(c.isalpha() for c in clave):
            raise ValueError("La clave debe contener al menos una letra")
        email, usuario_email = txt("email", 45), txt("usuario_email", 100)
        for e in (email, usuario_email):
            if not EMAIL_RE.match(e):
                raise ValueError("Correo inválido: " + e)
        fecha = txt("fechaCobro", 10)
        try:
            datetime.strptime(fecha, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Fecha de cobro inválida")
        return {
            "clave": clave.upper(), "nombre": txt("nombre", 45), "propietario": txt("propietario", 60),
            "email": email, "fechaCobro": fecha, "licencias": num("licencias", 1),
            "diasVencimiento": num("diasVencimiento"), "mensualidad": num("mensualidad"),
            "usuario_nombre": txt("usuario_nombre", 45), "usuario_apellido": txt("usuario_apellido", 45),
            "usuario_email": usuario_email,
        }, None
    except ValueError as e:
        return None, str(e)


def generar_password():
    """10 caracteres: 2 mayúsculas, 4 minúsculas, 3 números y 1 símbolo, mezclados (sin letras ambiguas)."""
    g = secrets.SystemRandom()
    chars = ([secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(2)]
             + [secrets.choice("abcdefghijkmnopqrstuvwxyz") for _ in range(4)]
             + [secrets.choice("23456789") for _ in range(3)]
             + [secrets.choice("#$%&*+@")])
    g.shuffle(chars)
    return "".join(chars)


def _slug(t):
    t = unicodedata.normalize("NFD", t.lower())
    return "".join(c for c in t if c.isascii() and c.isalnum())


def generar_username(cursor, nombre, apellido):
    """Convención de TX: primer nombre + inicial del apellido + consecutivo (ej. juanp1)."""
    base = (_slug(nombre.split()[0]) + _slug(apellido.split()[0])[:1]) or "admin"
    cursor.execute("select username from kapps_db.accounts where username like %s",
                   [base.replace("_", "\\_") + "%"])
    usados = [int(m.group(1)) for r in cursor.fetchall()
              if (m := re.fullmatch(re.escape(base) + r"(\d+)", r["username"]))]
    return base + str(max(usados, default=0) + 1)


def validar_usuario(d):
    """Datos de un usuario nuevo de una KAPP. Devuelve (datos_limpios, None) o (None, mensaje de error)."""
    limpio = {}
    for k, etiqueta, maximo in (("name", "Nombres", 30), ("lastname", "Apellidos", 30), ("email", "Email", 100)):
        v = str(d.get(k) or "").strip()
        if not v or len(v) > maximo or any(ord(c) < 32 for c in v):  # saltos de línea irían a los encabezados del correo
            return None, "%s inválido (obligatorio, máximo %d caracteres)" % (etiqueta, maximo)
        limpio[k] = v
    if not EMAIL_RE.match(limpio["email"]):
        return None, "Correo inválido: " + limpio["email"]
    if str(d.get("nivel")) not in ("1", "2", "3"):
        return None, "Nivel inválido"
    limpio["nivel"] = int(d["nivel"])
    return limpio, None


def enviar_correo_acceso(destino, nombre_admin, kapp_nombre, clave, username, password, es_admin=True):
    """Correo de bienvenida con el acceso (link con la clave de la KAPP, usuario y contraseña temporal).
    es_admin=True: administrador de una KAPP nueva; False: usuario nuevo de una KAPP. Lanza excepción si falla."""
    servidor, puerto = os.getenv("MAIL_SERVER"), int(os.getenv("MAIL_PORT") or 587)
    usuario, clave_smtp = os.getenv("MAIL_USERNAME"), os.getenv("MAIL_PASSWORD")
    remitente = os.getenv("MAIL_SENDER") or usuario
    if not servidor or not remitente:
        raise RuntimeError("Correo no configurado (MAIL_SERVER / MAIL_SENDER)")
    url = "%s/%s" % (TX_URL.rstrip("/"), clave)
    e = escape
    intro = ("Se creó la KAPP %s y usted es su administrador." if es_admin else "Se creó su usuario en la KAPP %s.")
    # la misma plantilla vive en tx/main.py (envio_correo tipo 8): si cambia aquí, cambiar allá.
    # El logo es PNG servido por TX (static/logo.png): los clientes de correo no muestran SVG.
    html = """<div style="background:#f3f6fc;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1b2340">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#1a73e8;padding:22px 28px;text-align:center">
<img src="{logo}" width="56" height="56" alt="KAPPS.me" style="background:#ffffff;border-radius:12px;padding:6px">
<div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:10px">KAPPS.me</div></td></tr>
<tr><td style="padding:28px">
<h2 style="margin:0 0 12px;font-size:22px">¡Le damos la bienvenida, {nombre}!</h2>
<p style="margin:0 0 16px;line-height:1.5">{intro} Nos alegra tenerle a bordo: ya puede ingresar y empezar a trabajar.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
<tr><td style="padding:6px 16px 6px 0;color:#6b7694">Código de KAPP</td><td><b style="font-family:monospace;font-size:16px">{clave}</b></td></tr>
<tr><td style="padding:6px 16px 6px 0;color:#6b7694">Usuario</td><td><b>{user}</b></td></tr>
<tr><td style="padding:6px 16px 6px 0;color:#6b7694">Contraseña temporal</td><td><b style="font-family:monospace;font-size:16px">{pw}</b></td></tr>
</table>
<p style="text-align:center;margin:24px 0"><a href="{url}" style="background:#1a73e8;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block">Ingresar a KAPPS.me</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#6b7694">Si el botón no funciona, copie este enlace en su navegador: <a href="{url}">{url}</a></p>
<p style="margin:0;font-size:13px;color:#6b7694">Por seguridad, cambie la contraseña en su primer ingreso.</p></td></tr>
<tr><td style="background:#f3f6fc;padding:14px 28px;text-align:center;font-size:12px;color:#6b7694">KAPPS.me · Mensaje automático, no responda a este correo.</td></tr>
</table></div>""".format(
        logo=e(TX_URL.rstrip("/") + "/static/logo.png"), nombre=e(nombre_admin), intro=e(intro % kapp_nombre),
        clave=e(clave), url=e(url), user=e(username), pw=e(password))
    texto = ("Le damos la bienvenida a KAPPS.me\n\n%s\n\nAcceso: %s\nCódigo de KAPP: %s\nUsuario: %s\n"
             "Contraseña temporal: %s\n\nPor seguridad, cambie la contraseña en su primer ingreso.\n"
             % (intro % kapp_nombre, url, clave, username, password))
    msg = EmailMessage()
    asunto = "KAPPS.me - Acceso de administrador de %s" if es_admin else "KAPPS.me - Bienvenido a %s"
    msg["Subject"], msg["From"], msg["To"] = asunto % kapp_nombre, remitente, destino
    msg.set_content(texto)
    msg.add_alternative(html, subtype="html")
    smtp = smtplib.SMTP_SSL(servidor, puerto, timeout=20) if puerto == 465 else smtplib.SMTP(servidor, puerto, timeout=20)
    with smtp:
        smtp.ehlo()
        if puerto != 465 and smtp.has_extn("starttls"):
            smtp.starttls()
            smtp.ehlo()
        if usuario:
            smtp.login(usuario, clave_smtp or "")
        smtp.send_message(msg)
