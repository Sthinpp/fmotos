# Base de datos y autenticación

La [migración SQL](migrations/202611200001_fmotos.sql) crea el esquema privado de FMotos. La tabla `espacios` almacena el estado operativo y su revisión. La tabla `miembros` vincula cada espacio con los usuarios habilitados en Supabase Auth.

Las funciones públicas `fmotos_leer`, `fmotos_guardar` y `fmotos_restaurar` requieren una sesión autenticada y verifican la membresía. Los cambios se guardan contra la revisión vigente para que dos usuarios no sobrescriban sus ediciones por accidente.

Después de aplicar la migración y cargar una base autorizada, usa [`autorizar-usuario.sql`](autorizar-usuario.sql) para vincular una cuenta existente. La [guía principal](../README.md#1-elige-cómo-guardar-los-datos) describe las variables de entorno necesarias.
