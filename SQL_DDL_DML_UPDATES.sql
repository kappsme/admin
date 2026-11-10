-- =====================================================================
-- SQL_DDL_DML_UPDATES.sql
-- Bitácora de cambios (DDL/DML) a la base de datos de KAPPS.
-- Convención:
--   * Una sección por cambio, con fecha (AAAA-MM-DD) y motivo.
--   * Scripts idempotentes: se pueden correr más de una vez sin duplicar datos.
--   * Los cambios nuevos se agregan al FINAL del archivo, nunca se editan los anteriores.
--   * Esquemas: kapps_db (administración), tx (datos de los tenants).
-- =====================================================================



-- ---------------------------------------------------------------------
-- 2026-11-06  Mapeo de productos KAPP <-> PARLEVEL (por tenant)
--   PARLEVEL entrega un archivo con movimientos de inventario, pero sus
--   identificadores no coinciden con los de KAPPS. Esta tabla guarda, para
--   cada KAPP (tenant), a qué producto de KAPPS corresponde cada nombre de
--   producto de PARLEVEL.
--
--   Los productos NO están en una tabla propia: son registros de tx.elementos
--   con id_module_cat = 3 (INVENTARIO) cuyos datos (nombre, marca, categoría...)
--   están en tx.elementos_datos, definidos por tx.ctz (pantalla 1 = PRODUCTO).
--   El nombre del producto es el campo ctz.id_ctz_base = 1 ('PRODUCTO').
--
--   Reglas:
--     * kapp_id identifica al tenant (= tx.elementos.id_kapp).
--     * producto_id = tx.elementos.id (con FK; elementos es InnoDB).
--     * Un nombre de PARLEVEL se asigna a UN solo producto por KAPP
--       (UNIQUE kapp_id + parlevel_nombre).
--     * Un producto de KAPPS puede tener varios nombres en PARLEVEL (alias).
--     * Que el elemento pertenezca realmente a kapp_id y sea un producto
--       (no un lote) lo valida la aplicación.
--   NOTA: si una versión anterior de esta tabla (producto_id VARCHAR(6)) ya se
--   creó, está vacía: ejecutar antes  DROP TABLE tx.parlevel_productos_map;
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tx.parlevel_productos_map (
    id                 INT NOT NULL AUTO_INCREMENT,
    kapp_id            INT NOT NULL                                   COMMENT 'ID de la KAPP (tenant): kapps_db.kapps.id = tx.elementos.id_kapp',
    producto_id        INT NOT NULL                                   COMMENT 'ID del producto en KAPPS: tx.elementos.id (id_module_cat = 3)',
    parlevel_nombre    VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
                                                                      COMMENT 'Nombre del producto en PARLEVEL',
    estado             TINYINT(1) NOT NULL DEFAULT 1                  COMMENT '1 = activo, 0 = inactivo',
    id_usuario         INT NULL                                       COMMENT 'kapps_db.accounts.id de quien creó el mapeo',
    fecha_creacion     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_parlevel_kapp_nombre (kapp_id, parlevel_nombre),
    KEY ix_parlevel_kapp_producto (kapp_id, producto_id),
    CONSTRAINT fk_parlevel_map_elemento FOREIGN KEY (producto_id) REFERENCES tx.elementos (id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT = 'Mapeo de productos KAPPS <-> PARLEVEL por KAPP';


-- ---------------------------------------------------------------------
-- 2026-11-06  Contraseñas con hash (migración gradual)
--   Hasta ahora las contraseñas se guardaban con aes_encrypt (reversible).
--   La aplicación ahora valida con password_hash (pbkdf2-sha256). Si la cuenta aún
--   no tiene hash, valida con la clave antigua (password2) y, si es correcta,
--   guarda el hash en ese mismo ingreso. password2 NO se borra aquí porque
--   otras aplicaciones del ecosistema (tx) podrían seguir leyéndola.
--   La app funciona aunque esta columna aún no exista (usa solo password2).
-- ---------------------------------------------------------------------
-- Ejecutar UNA vez (da error 1060 si la columna ya existe; es inofensivo):
ALTER TABLE kapps_db.accounts ADD COLUMN password_hash VARCHAR(255) NULL AFTER password2;

-- OPCIONAL, cuando TODOS los administradores (kapp_id = 0) ya tengan hash y
-- se confirme que ninguna otra aplicación lee su password2:
-- UPDATE kapps_db.accounts SET password2 = NULL WHERE kapp_id = 0 AND password_hash IS NOT NULL;


-- ---------------------------------------------------------------------
-- 2026-11-06  Límite de intentos de login en base de datos
--   Antes el contador vivía en memoria de cada proceso (no se compartía
--   entre workers). Ahora se guarda aquí: 5 fallos por IP+usuario o 20 por IP
--   en 5 minutos bloquean el ingreso temporalmente. Si la tabla no existe, la
--   app usa el contador en memoria.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kapps_db.login_intentos (
    id      BIGINT NOT NULL AUTO_INCREMENT,
    ip      VARCHAR(45) NOT NULL,
    usuario VARCHAR(60) NOT NULL,
    fecha   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_login_intentos_ip_usuario_fecha (ip, usuario, fecha),
    KEY ix_login_intentos_fecha (fecha)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


-- ---------------------------------------------------------------------
-- 2026-11-09  Parámetro por kapp: mostrar errores 500 en pantalla (TX)
--   Para diagnosticar a un solo cliente sin afectar a los demás. Apagado
--   por defecto. Se enciende y apaga en Admin > kapp > módulo
--   CONFIGURACION (la kapp debe tener ese módulo activo). TX lo lee por
--   nombre: no cambiar el nombre.
-- ---------------------------------------------------------------------
INSERT INTO kapps_db.tx_params_cat
    (module_id, nombre, descripcion, estado, html_type, category, customizable, required, `system`, default_value)
SELECT 6, 'Mostrar Errores en Pantalla', 'Muestra el detalle del error 500 (temporal)', 1, 'CHECKBOX', 'PARAMETERS', 1, 1, 1, '0'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM kapps_db.tx_params_cat WHERE module_id = 6 AND nombre = 'Mostrar Errores en Pantalla');


-- ---------------------------------------------------------------------
-- 2026-11-10  Módulo BARBERÍAS (administración multi-barbería y reservas)
--   Módulo nuevo de TX (código 'brb'). Se habilita por KAPP desde Admin
--   (Configuración de módulos), igual que los demás. La KAPP es la
--   organización: un propietario (cuenta nivel 1) administra todas sus
--   barberías; los demás roles se asignan en brb_roles o vinculando una
--   cuenta a un barbero (brb_barberos.cuenta_id).
--
--   Convenciones de estas tablas:
--     * Todas llevan prefijo brb_ y viven en el esquema de datos (tx).
--       Ejecutar esta sección con ese esquema seleccionado (USE tx;).
--     * Fechas/horas de citas y bloqueos se guardan en UTC (columnas *_utc);
--       la app las muestra en la zona horaria de cada barbería.
--     * Horarios semanales: dia_semana 0 = lunes ... 6 = domingo.
--     * No toca ninguna tabla de los otros módulos.
--   Documentación: tx/docs/modules/barberias/
-- ---------------------------------------------------------------------
INSERT INTO kapps_db.kapps_modules_cat (type, name, description, active, code)
SELECT 'MAIN', 'BARBERIA', 'Administración de barberías y reservas de clientes', 1, 'brb'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM kapps_db.kapps_modules_cat WHERE code = 'brb');

CREATE TABLE IF NOT EXISTS brb_barberias (
    id                    INT NOT NULL AUTO_INCREMENT,
    kapp_id               INT NOT NULL COMMENT 'Organización dueña: kapps_db.kapps.id',
    nombre                VARCHAR(80) NOT NULL,
    slug                  VARCHAR(60) NOT NULL COMMENT 'URL pública: /reservar/<slug>',
    descripcion           VARCHAR(400) NULL,
    logo                  VARCHAR(120) NULL COMMENT 'Archivo en static/brb/uploads',
    direccion             VARCHAR(200) NULL,
    telefono              VARCHAR(20) NULL,
    correo                VARCHAR(100) NULL,
    zona_horaria          VARCHAR(40) NOT NULL DEFAULT 'America/Costa_Rica',
    activo                TINYINT(1) NOT NULL DEFAULT 1,
    multi_servicio        TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = el cliente puede elegir varios servicios',
    requiere_aprobacion   TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = las reservas nacen pendientes',
    intervalo_min         SMALLINT NOT NULL DEFAULT 15 COMMENT 'Cada cuántos minutos se ofrece un horario',
    buffer_min            SMALLINT NOT NULL DEFAULT 0 COMMENT 'Minutos libres entre citas',
    anticipacion_min      SMALLINT NOT NULL DEFAULT 60 COMMENT 'Minutos mínimos de anticipación para reservar',
    anticipacion_max_dias SMALLINT NOT NULL DEFAULT 30,
    limite_cambios_horas  SMALLINT NOT NULL DEFAULT 2 COMMENT 'Horas antes de la cita hasta las que el cliente puede cancelar o reprogramar',
    politica_cancelacion  VARCHAR(500) NULL,
    politica_menores      VARCHAR(15) NOT NULL DEFAULT 'responsable' COMMENT 'responsable | no | libre',
    edad_mayoria          TINYINT NOT NULL DEFAULT 18,
    telefono_obligatorio  TINYINT(1) NOT NULL DEFAULT 0,
    notif_email           TINYINT(1) NOT NULL DEFAULT 1,
    notif_sms             TINYINT(1) NOT NULL DEFAULT 0,
    recordatorio_horas    SMALLINT NOT NULL DEFAULT 24 COMMENT '0 = sin recordatorio',
    fecha_creacion        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_brb_barberias_slug (slug),
    KEY ix_brb_barberias_kapp (kapp_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_barberos (
    id           INT NOT NULL AUTO_INCREMENT,
    kapp_id      INT NOT NULL,
    cuenta_id    INT NULL COMMENT 'kapps_db.accounts.id si el barbero ingresa a TX a ver su agenda',
    nombre       VARCHAR(80) NOT NULL,
    foto         VARCHAR(120) NULL,
    descripcion  VARCHAR(300) NULL,
    especialidad VARCHAR(80) NULL,
    telefono     VARCHAR(20) NULL,
    correo       VARCHAR(100) NULL,
    activo       TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    KEY ix_brb_barberos_kapp (kapp_id),
    KEY ix_brb_barberos_cuenta (cuenta_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_barbero_barberia (
    barbero_id  INT NOT NULL,
    barberia_id INT NOT NULL,
    PRIMARY KEY (barbero_id, barberia_id),
    KEY ix_brb_bb_barberia (barberia_id),
    CONSTRAINT fk_brb_bb_barbero FOREIGN KEY (barbero_id) REFERENCES brb_barberos (id) ON DELETE CASCADE,
    CONSTRAINT fk_brb_bb_barberia FOREIGN KEY (barberia_id) REFERENCES brb_barberias (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_servicios (
    id           INT NOT NULL AUTO_INCREMENT,
    barberia_id  INT NOT NULL,
    categoria    VARCHAR(60) NULL,
    nombre       VARCHAR(80) NOT NULL,
    descripcion  VARCHAR(300) NULL,
    precio       DECIMAL(10,2) NOT NULL DEFAULT 0,
    duracion_min SMALLINT NOT NULL,
    imagen       VARCHAR(120) NULL,
    activo       TINYINT(1) NOT NULL DEFAULT 1,
    orden        SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY ix_brb_servicios_barberia (barberia_id),
    CONSTRAINT fk_brb_servicios_barberia FOREIGN KEY (barberia_id) REFERENCES brb_barberias (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_barbero_servicio (
    barbero_id   INT NOT NULL,
    servicio_id  INT NOT NULL,
    precio       DECIMAL(10,2) NULL COMMENT 'NULL = precio del servicio',
    duracion_min SMALLINT NULL COMMENT 'NULL = duración del servicio',
    PRIMARY KEY (barbero_id, servicio_id),
    KEY ix_brb_bs_servicio (servicio_id),
    CONSTRAINT fk_brb_bs_barbero FOREIGN KEY (barbero_id) REFERENCES brb_barberos (id) ON DELETE CASCADE,
    CONSTRAINT fk_brb_bs_servicio FOREIGN KEY (servicio_id) REFERENCES brb_servicios (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_horarios (
    id          INT NOT NULL AUTO_INCREMENT,
    barberia_id INT NOT NULL,
    barbero_id  INT NULL COMMENT 'NULL = horario de apertura de la barbería',
    tipo        VARCHAR(10) NOT NULL DEFAULT 'trabajo' COMMENT 'trabajo | descanso (descanso solo aplica a barberos)',
    dia_semana  TINYINT NOT NULL COMMENT '0 = lunes ... 6 = domingo',
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    PRIMARY KEY (id),
    KEY ix_brb_horarios (barberia_id, barbero_id, dia_semana),
    CONSTRAINT fk_brb_horarios_barberia FOREIGN KEY (barberia_id) REFERENCES brb_barberias (id) ON DELETE CASCADE,
    CONSTRAINT fk_brb_horarios_barbero FOREIGN KEY (barbero_id) REFERENCES brb_barberos (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_bloqueos (
    id          INT NOT NULL AUTO_INCREMENT,
    kapp_id     INT NOT NULL,
    barberia_id INT NULL COMMENT 'Con barbero_id NULL: cierre de toda la barbería (feriado)',
    barbero_id  INT NULL COMMENT 'Con valor: tiempo no disponible del barbero (en todas sus barberías)',
    tipo        VARCHAR(12) NOT NULL DEFAULT 'bloqueo' COMMENT 'feriado | vacaciones | libre | bloqueo',
    estado      VARCHAR(12) NOT NULL DEFAULT 'aprobado' COMMENT 'aprobado | solicitado (solo aprobado afecta la disponibilidad)',
    inicio_utc  DATETIME NOT NULL,
    fin_utc     DATETIME NOT NULL,
    motivo      VARCHAR(200) NULL,
    creado_por  INT NULL COMMENT 'kapps_db.accounts.id',
    PRIMARY KEY (id),
    KEY ix_brb_bloqueos_barberia (barberia_id, inicio_utc),
    KEY ix_brb_bloqueos_barbero (barbero_id, inicio_utc),
    CONSTRAINT fk_brb_bloqueos_barberia FOREIGN KEY (barberia_id) REFERENCES brb_barberias (id) ON DELETE CASCADE,
    CONSTRAINT fk_brb_bloqueos_barbero FOREIGN KEY (barbero_id) REFERENCES brb_barberos (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_roles (
    id          INT NOT NULL AUTO_INCREMENT,
    cuenta_id   INT NOT NULL COMMENT 'kapps_db.accounts.id',
    barberia_id INT NOT NULL,
    rol         VARCHAR(10) NOT NULL DEFAULT 'admin' COMMENT 'admin = administrador de esa barbería',
    PRIMARY KEY (id),
    UNIQUE KEY uq_brb_roles (cuenta_id, barberia_id, rol),
    CONSTRAINT fk_brb_roles_barberia FOREIGN KEY (barberia_id) REFERENCES brb_barberias (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_clientes (
    id               INT NOT NULL AUTO_INCREMENT,
    kapp_id          INT NOT NULL,
    nombre           VARCHAR(80) NOT NULL,
    correo           VARCHAR(100) NULL,
    telefono         VARCHAR(20) NULL,
    google_sub       VARCHAR(64) NULL COMMENT 'Identificador estable de Google (claim sub)',
    acepta_marketing TINYINT(1) NOT NULL DEFAULT 0,
    notif_email      TINYINT(1) NOT NULL DEFAULT 1,
    notif_sms        TINYINT(1) NOT NULL DEFAULT 1,
    anonimizado      TINYINT(1) NOT NULL DEFAULT 0,
    fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_brb_clientes_google (kapp_id, google_sub),
    KEY ix_brb_clientes_correo (kapp_id, correo),
    KEY ix_brb_clientes_telefono (kapp_id, telefono)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_citas (
    id                  INT NOT NULL AUTO_INCREMENT,
    kapp_id             INT NOT NULL,
    barberia_id         INT NOT NULL,
    barbero_id          INT NOT NULL,
    cliente_id          INT NOT NULL,
    codigo              VARCHAR(10) NOT NULL COMMENT 'Identificador que ve el cliente',
    token               CHAR(32) NOT NULL COMMENT 'Secreto del enlace para ver/cancelar la reserva',
    idem_key            CHAR(32) NULL COMMENT 'Evita duplicar la reserva si el formulario se envía dos veces',
    inicio_utc          DATETIME NOT NULL,
    fin_utc             DATETIME NOT NULL,
    duracion_min        SMALLINT NOT NULL,
    precio_total        DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado              VARCHAR(12) NOT NULL DEFAULT 'confirmada' COMMENT 'pendiente | confirmada | completada | cancelada | ausente',
    origen              VARCHAR(8) NOT NULL DEFAULT 'web' COMMENT 'web | admin',
    es_menor            TINYINT(1) NOT NULL DEFAULT 0,
    nombre_menor        VARCHAR(80) NULL,
    notas               VARCHAR(300) NULL,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_brb_citas_codigo (codigo),
    UNIQUE KEY uq_brb_citas_token (token),
    UNIQUE KEY uq_brb_citas_idem (idem_key),
    KEY ix_brb_citas_barbero (barbero_id, inicio_utc),
    KEY ix_brb_citas_barberia (barberia_id, inicio_utc),
    KEY ix_brb_citas_cliente (cliente_id),
    CONSTRAINT fk_brb_citas_barberia FOREIGN KEY (barberia_id) REFERENCES brb_barberias (id),
    CONSTRAINT fk_brb_citas_barbero FOREIGN KEY (barbero_id) REFERENCES brb_barberos (id),
    CONSTRAINT fk_brb_citas_cliente FOREIGN KEY (cliente_id) REFERENCES brb_clientes (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_cita_servicios (
    id           INT NOT NULL AUTO_INCREMENT,
    cita_id      INT NOT NULL,
    servicio_id  INT NULL,
    nombre       VARCHAR(80) NOT NULL COMMENT 'Copia al momento de reservar',
    precio       DECIMAL(10,2) NOT NULL,
    duracion_min SMALLINT NOT NULL,
    PRIMARY KEY (id),
    KEY ix_brb_cs_cita (cita_id),
    CONSTRAINT fk_brb_cs_cita FOREIGN KEY (cita_id) REFERENCES brb_citas (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_consentimientos (
    id         INT NOT NULL AUTO_INCREMENT,
    kapp_id    INT NOT NULL,
    cliente_id INT NOT NULL,
    cita_id    INT NULL,
    tipo       VARCHAR(20) NOT NULL COMMENT 'privacidad | terminos | marketing | mayoria_edad | responsable_menor',
    version    VARCHAR(20) NOT NULL COMMENT 'Versión del texto aceptado',
    aceptado   TINYINT(1) NOT NULL,
    ip         VARCHAR(45) NULL,
    fecha_utc  DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY ix_brb_consent_cliente (cliente_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_notificaciones (
    id            INT NOT NULL AUTO_INCREMENT,
    kapp_id       INT NOT NULL,
    cita_id       INT NOT NULL,
    canal         VARCHAR(6) NOT NULL COMMENT 'email | sms',
    tipo          VARCHAR(14) NOT NULL COMMENT 'confirmacion | recordatorio | modificacion | cancelacion',
    destino       VARCHAR(100) NOT NULL,
    estado        VARCHAR(10) NOT NULL DEFAULT 'pendiente' COMMENT 'pendiente | enviado | fallido',
    error         VARCHAR(300) NULL,
    intentos      TINYINT NOT NULL DEFAULT 0,
    fecha_utc     DATETIME NOT NULL,
    fecha_envio_utc DATETIME NULL,
    PRIMARY KEY (id),
    KEY ix_brb_notif_cita (cita_id),
    KEY ix_brb_notif_estado (kapp_id, estado)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_auditoria (
    id          INT NOT NULL AUTO_INCREMENT,
    kapp_id     INT NOT NULL,
    barberia_id INT NULL,
    cita_id     INT NULL,
    actor       VARCHAR(10) NOT NULL COMMENT 'cliente | staff | sistema',
    cuenta_id   INT NULL COMMENT 'kapps_db.accounts.id cuando actor = staff',
    accion      VARCHAR(30) NOT NULL,
    detalle     VARCHAR(400) NULL,
    fecha_utc   DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY ix_brb_auditoria_cita (cita_id),
    KEY ix_brb_auditoria_barberia (barberia_id, fecha_utc)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS brb_solicitudes_datos (
    id            INT NOT NULL AUTO_INCREMENT,
    kapp_id       INT NOT NULL,
    cliente_id    INT NOT NULL,
    tipo          VARCHAR(14) NOT NULL COMMENT 'acceso | rectificacion | eliminacion',
    detalle       VARCHAR(400) NULL,
    estado        VARCHAR(10) NOT NULL DEFAULT 'pendiente' COMMENT 'pendiente | atendida',
    fecha_utc     DATETIME NOT NULL,
    atendida_por  INT NULL,
    fecha_atencion_utc DATETIME NULL,
    PRIMARY KEY (id),
    KEY ix_brb_solicitudes (kapp_id, estado)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


-- ---------------------------------------------------------------------
-- 2026-11-10  Tabla inv_favoritos (productos favoritos de Tienda/Inventario)
--   El código la usa desde que existen los favoritos (crud_elementos.get_favoritos
--   y save_favoritos) pero nunca quedó en ningún script: en una base nueva la
--   Tienda fallaba con "Table inv_favoritos doesn't exist".
--   Guarda QUÉ productos son favoritos de cada KAPP y en qué orden.
--   No confundir con ctz_inv_favoritos, que guarda qué CAMPOS del producto se
--   muestran en el botón de cada favorito.
--   Ejecutar con el esquema de datos seleccionado (USE tx;). Si la tabla ya
--   existe (producción), no hace nada.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inv_favoritos (
    id          INT NOT NULL AUTO_INCREMENT,
    kapp_id     INT NOT NULL,
    screen_id   INT NOT NULL COMMENT 'ctz_module_screens.id (1 = PRODUCTO)',
    elemento_id INT NOT NULL COMMENT 'elementos.id del producto',
    ranking     INT NOT NULL COMMENT 'Posición en la lista: 1 = primero',
    PRIMARY KEY (id),
    UNIQUE KEY uq_inv_favoritos (kapp_id, screen_id, elemento_id),
    KEY ix_inv_favoritos_orden (kapp_id, screen_id, ranking)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
