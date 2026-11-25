"""Esquemas de base de datos según el ambiente (producción o pruebas).

TX y Admin usan dos esquemas en el mismo servidor MySQL:
  * datos de los tenants: MYSQL_DB        -> tx en producción, tx_pre en pruebas
  * administración:       MYSQL_DB_KAPPS  -> kapps_db en producción, kapps_db_pre en pruebas

Las consultas siguen escribiendo `kapps_db.tabla` (o `` `kapps_db`.`tabla` ``). conectar() devuelve una
conexión cuyos cursores cambian ese prefijo por MYSQL_DB_KAPPS justo antes de ejecutar, así no hay que
tocar cada consulta ni armar SQL con el nombre. Un nombre de esquema no puede ir como parámetro (%s); por
eso se valida contra _NOMBRE_VALIDO al arrancar y nunca viene del usuario.

Copia idéntica en ../admin/esquemas.py: mantener iguales. No importa main (sirve también en scripts sueltos).
"""
import os
import re

import mysql.connector
from dotenv import load_dotenv

load_dotenv()

_NOMBRE_VALIDO = re.compile(r"^[A-Za-z0-9_]{1,64}$")


def _esquema(variable, defecto):
    nombre = (os.getenv(variable) or defecto).strip()
    if not _NOMBRE_VALIDO.match(nombre):
        raise RuntimeError(f"{variable} no es un nombre de esquema válido: {nombre!r}")
    return nombre


ESQUEMA_DATOS = _esquema("MYSQL_DB", "tx")
KAPPS_DB = _esquema("MYSQL_DB_KAPPS", "kapps_db")
# Solo los nombres de producción cuentan como producción; cualquier otra combinación es ambiente de pruebas
ES_PRODUCCION = ESQUEMA_DATOS == "tx" and KAPPS_DB == "kapps_db"
AMBIENTE = "PRODUCCION" if ES_PRODUCCION else "PRUEBAS"

# kapps_db. o `kapps_db`. que no sea parte de otro nombre (kapps_db_pre. no coincide: le sigue "_", no ".")
_PREFIJO_KAPPS = re.compile(r"(?<![\w$])(`?)kapps_db\1(?=\.)")


def sql_kapps(sql):
    """El SQL con el esquema kapps_db del ambiente."""
    if KAPPS_DB == "kapps_db" or not isinstance(sql, str):
        return sql
    return _PREFIJO_KAPPS.sub(lambda m: m.group(1) + KAPPS_DB + m.group(1), sql)


class _Cursor:
    """Cursor de mysql.connector que traduce kapps_db antes de execute/executemany; lo demás pasa directo."""
    __slots__ = ("_c",)

    def __init__(self, cursor):
        object.__setattr__(self, "_c", cursor)

    def execute(self, operation, *args, **kwargs):
        return self._c.execute(sql_kapps(operation), *args, **kwargs)

    def executemany(self, operation, *args, **kwargs):
        return self._c.executemany(sql_kapps(operation), *args, **kwargs)

    def __getattr__(self, nombre):
        return getattr(self._c, nombre)

    def __setattr__(self, nombre, valor):
        setattr(self._c, nombre, valor)

    def __iter__(self):
        return iter(self._c)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self._c.close()
        return False


class _Conexion:
    """Conexión de mysql.connector cuyos cursores son _Cursor; lo demás (commit, close...) pasa directo."""
    __slots__ = ("_c",)

    def __init__(self, conexion):
        object.__setattr__(self, "_c", conexion)

    def cursor(self, *args, **kwargs):
        return _Cursor(self._c.cursor(*args, **kwargs))

    def __getattr__(self, nombre):
        return getattr(self._c, nombre)

    def __setattr__(self, nombre, valor):
        setattr(self._c, nombre, valor)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self._c.close()
        return False


# Zona horaria de toda conexión: la hora del negocio (-6:00), la misma que ponían a mano los SET session time_zone.
# Sin esto, NOW()/CURRENT_TIMESTAMP de una conexión que no lo pusiera quedaba en la hora del servidor (UTC).
# Las fechas *_utc (Barberías, soporte) se calculan en Python y no dependen de esto.
ZONA_HORARIA = "-06:00"


def conectar(**kwargs):
    """mysql.connector.connect(**kwargs) con la traducción de kapps_db del ambiente y la sesión en ZONA_HORARIA."""
    kwargs.setdefault("time_zone", ZONA_HORARIA)
    return _Conexion(mysql.connector.connect(**kwargs))
