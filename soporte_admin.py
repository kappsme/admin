"""Tickets de soporte en Admin: los crean los usuarios en TX (tx/soporte.py) y aquí se atienden.
Las mismas tablas y estados que TX (kapps_db.soporte_tickets, ver kappsdb/SQL_DDL_DML_UPDATES.sql 2026-11-26).
- Al abrir un ticket «enviado» pasa a «recibido» (le prende el globito al usuario en TX).
- Cada respuesta o cambio de estado visible avisa al usuario por correo; las notas internas no se muestran ni avisan.
Las funciones reciben un cursor (dictionary=True); quien llama hace commit. Fechas en UTC."""
import os
from datetime import datetime, timedelta, timezone

import correo

ESTADOS = {"enviado": "Enviado", "recibido": "Recibido", "en_proceso": "En proceso", "esperando": "Esperando al usuario",
           "resuelto": "Resuelto"}
ESTADOS_USUARIO = {"enviado": "Enviado", "recibido": "Recibido", "en_proceso": "En proceso", "esperando": "Esperando su respuesta",
                   "resuelto": "Resuelto"}  # como lo lee el usuario en TX
ABIERTOS = ("enviado", "recibido", "en_proceso", "esperando")
NOMBRES_MODULO = {0: "General", 1: "Taller", 2: "Tienda", 3: "Inventario", 4: "Credix", 5: "Despacho", 6: "General", 9: "Barberías"}
ZONA = timezone(timedelta(hours=-6), "CST")  # Costa Rica no cambia de hora; sin pytz en Admin


def ahora_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def numero(tid):
    return "TK-%06d" % int(tid)


def duracion(desde, hasta=None):
    seg = max(0, int(((hasta or ahora_utc()) - desde).total_seconds()))
    d, h, m = seg // 86400, seg % 86400 // 3600, seg % 3600 // 60
    if d:
        return "%d d %d h" % (d, h)
    if h:
        return "%d h %d min" % (h, m)
    return "%d min" % m


def _completar(t):
    t["numero"] = numero(t["id"])
    t["estado_txt"] = ESTADOS.get(t["estado"], t["estado"])
    t["modulo"] = NOMBRES_MODULO.get(t["modulo_id"], str(t["modulo_id"]))
    t["abierto"] = duracion(t["creado_utc"], t["resuelto_utc"])
    # segundos abiertos (para el contador en vivo de static/tickets.js) y desde cuándo, en UTC ISO
    t["segundos"] = int(((t["resuelto_utc"] or ahora_utc()) - t["creado_utc"]).total_seconds())
    t["creado_iso"] = t["creado_utc"].strftime("%Y-%m-%dT%H:%M:%SZ")
    t["creado"] = t["creado_utc"].replace(tzinfo=timezone.utc).astimezone(ZONA)
    return t


_SELECT = """select t.id, t.kapp_id, t.cuenta_id, t.modulo_id, t.titulo, t.estado, t.creado_utc, t.actualizado_utc, t.resuelto_utc,
                    k.name kapp, k.clave, trim(concat(ifnull(a.name,''),' ',ifnull(a.lastname,''))) usuario, a.username, a.email
             from kapps_db.soporte_tickets t join kapps_db.kapps k on k.id=t.kapp_id left join kapps_db.accounts a on a.id=t.cuenta_id """


def resumen(cur):
    """{estado: cantidad} de todos los tickets."""
    cur.execute("select estado, count(*) n from kapps_db.soporte_tickets group by estado")
    datos = {e: 0 for e in ESTADOS}
    for f in cur.fetchall():
        datos[f["estado"]] = f["n"]
    return datos


def lista(cur, estado="abiertos", kapp_id=None, modulo_id=None, limite=300):
    sql, par = "where 1=1", []
    if estado == "abiertos":
        sql += " and t.estado in ('enviado','recibido','en_proceso','esperando')"
    elif estado in ESTADOS:
        sql, par = sql + " and t.estado=%s", par + [estado]
    if kapp_id:
        sql, par = sql + " and t.kapp_id=%s", par + [kapp_id]
    if modulo_id is not None:
        sql, par = sql + " and t.modulo_id=%s", par + [modulo_id]
    orden = " order by t.creado_utc" if estado != "resuelto" else " order by t.resuelto_utc desc"
    cur.execute(_SELECT + sql + orden + " limit %s", par + [limite])
    return [_completar(t) for t in cur.fetchall()]


def ticket(cur, tid):
    cur.execute(_SELECT.replace("t.titulo,", "t.titulo, t.descripcion, t.pagina, t.navegador, t.correo_aviso,") + "where t.id=%s", [tid])
    t = cur.fetchone()
    if not t:
        return None
    cur.execute("""select e.*, trim(concat(ifnull(a.name,''),' ',ifnull(a.lastname,''))) nombre, a.username
                   from kapps_db.soporte_ticket_eventos e left join kapps_db.accounts a on a.id=e.cuenta_id
                   where e.ticket_id=%s order by e.id""", [tid])
    t["eventos"] = cur.fetchall()
    for e in t["eventos"]:
        e["fecha"] = e["fecha_utc"].replace(tzinfo=timezone.utc).astimezone(ZONA)
        e["estado_txt"] = ESTADOS.get(e["estado_nuevo"], e["estado_nuevo"])
    cur.execute("select id from kapps_db.soporte_ticket_adjuntos where ticket_id=%s order by id limit 1", [tid])
    t["captura"] = bool(cur.fetchone())
    return _completar(t)


def _evento(cur, tid, cuenta_id, tipo, *, estado=None, texto=None, interno=False, ahora=None):
    cur.execute("""insert into kapps_db.soporte_ticket_eventos (ticket_id, autor, cuenta_id, tipo, estado_nuevo, texto, interno, fecha_utc)
                   values (%s,'soporte',%s,%s,%s,%s,%s,%s)""", [tid, cuenta_id, tipo, estado, texto, int(bool(interno)), ahora or ahora_utc()])


def marcar_recibido(cur, t, cuenta_id):
    """Primera vez que soporte lo abre: «recibido». Devuelve True si cambió."""
    if t["estado"] != "enviado":
        return False
    ahora = ahora_utc()
    cur.execute("""update kapps_db.soporte_tickets set estado='recibido', actualizado_utc=%s, ultimo_soporte_utc=%s
                   where id=%s and estado='enviado'""", [ahora, ahora, t["id"]])
    if not cur.rowcount:
        return False
    _evento(cur, t["id"], cuenta_id, "estado", estado="recibido", texto="Soporte recibió su ticket", ahora=ahora)
    return True


def atender(cur, t, cuenta_id, estado, texto, interno):
    """Respuesta y/o cambio de estado de soporte. Devuelve (cambio_visible, mensaje_visible). Lanza ValueError."""
    texto = (texto or "").strip()
    if estado not in ESTADOS or estado == "enviado":
        raise ValueError("Estado no válido")
    if len(texto) > 4000:
        raise ValueError("El mensaje es muy largo (máximo 4000 caracteres)")
    cambia = estado != t["estado"]
    if not texto and not cambia:
        raise ValueError("Escriba un mensaje o cambie el estado")
    if interno and cambia:
        raise ValueError("Una nota interna no cambia el estado: guárdela sola")
    ahora = ahora_utc()
    if texto:
        _evento(cur, t["id"], cuenta_id, "mensaje", texto=texto, interno=interno, ahora=ahora)
    if cambia:
        _evento(cur, t["id"], cuenta_id, "estado", estado=estado, ahora=ahora)
        cur.execute("update kapps_db.soporte_tickets set estado=%s, resuelto_utc=%s where id=%s",
                    [estado, ahora if estado == "resuelto" else None, t["id"]])
    visible = cambia or not interno
    cur.execute("update kapps_db.soporte_tickets set actualizado_utc=%s" + (", ultimo_soporte_utc=%s" if visible else "") + " where id=%s",
                [ahora] + ([ahora] if visible else []) + [t["id"]])
    return visible, (texto if texto and not interno else "")


def avisar_usuario(t, estado, mensaje):
    """Correo al usuario que creó el ticket: qué cambió y, si hay, la respuesta de soporte."""
    if not t.get("email"):
        return False
    url = (os.getenv("TX_URL") or "").rstrip("/")
    cuerpo = ["Hola %s:" % (t["usuario"] or t["username"]), "",
              "Su ticket %s «%s» tiene novedades." % (t["numero"], t["titulo"]),
              "Estado: %s" % ESTADOS_USUARIO.get(estado, estado)]
    if mensaje:
        cuerpo += ["", "Soporte escribió:", mensaje]
    cuerpo += ["", ("Véalo en TX › Mi perfil: %s/soporte/%d" % (url, t["id"])) if url else "Véalo en TX, en Mi perfil.", "",
               "Este correo es automático."]
    return correo.enviar([t["email"]], "[%s] %s: %s" % (t["numero"], ESTADOS_USUARIO.get(estado, estado), t["titulo"]), "\n".join(cuerpo))


def captura(cur, tid):
    cur.execute("select mime, datos from kapps_db.soporte_ticket_adjuntos where ticket_id=%s order by id limit 1", [tid])
    f = cur.fetchone()
    return (f["mime"], bytes(f["datos"])) if f else None
