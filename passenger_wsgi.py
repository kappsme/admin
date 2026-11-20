import importlib.util
import os
import sys

base = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base)

# Se carga main.py como 'wsgi' (no 'main') a propósito: klogin hace `from main import DBConn`
# y eso carga una segunda copia. Un `from main import` directo aquí rompe esa importación circular.
# (Antes se usaba imp.load_source, que no existe desde Python 3.12.)
spec = importlib.util.spec_from_file_location("wsgi", os.path.join(base, "main.py"))
wsgi = importlib.util.module_from_spec(spec)
sys.modules["wsgi"] = wsgi
spec.loader.exec_module(wsgi)
application = wsgi.kapps_admin
