"""Envío de correos desde Admin con smtplib (librería estándar; sin dependencias nuevas).
Usa las mismas variables que TX en el .env: MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD y MAIL_SENDER.
Puerto 465 = SSL; en los demás se usa STARTTLS si el servidor lo ofrece. Un error nunca interrumpe la acción: se registra y
se devuelve False."""
import logging
import os
import smtplib
from email.message import EmailMessage

log = logging.getLogger(__name__)


def enviar(destinos, asunto, cuerpo):
    destinos = [d for d in (destinos or []) if d]
    servidor = os.getenv("MAIL_SERVER")
    if not destinos or not servidor:
        return False
    msg = EmailMessage()
    msg["Subject"] = asunto
    msg["From"] = os.getenv("MAIL_SENDER") or os.getenv("MAIL_USERNAME")
    msg["To"] = ", ".join(destinos)
    msg.set_content(cuerpo)
    try:
        puerto = int(os.getenv("MAIL_PORT") or 25)
        clase = smtplib.SMTP_SSL if puerto == 465 else smtplib.SMTP
        with clase(servidor, puerto, timeout=15) as smtp:
            if puerto != 465:
                smtp.ehlo()
                if smtp.has_extn("starttls"):
                    smtp.starttls()
                    smtp.ehlo()
            if os.getenv("MAIL_USERNAME"):
                smtp.login(os.getenv("MAIL_USERNAME"), os.getenv("MAIL_PASSWORD") or "")
            smtp.send_message(msg)
        return True
    except Exception:
        log.exception("No se pudo enviar el correo «%s»", asunto)
        return False
