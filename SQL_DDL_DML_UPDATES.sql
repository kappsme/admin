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
