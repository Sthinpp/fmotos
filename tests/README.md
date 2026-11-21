# Pruebas del sistema

- [`test_backend.py`](test_backend.py) comprueba la autenticación local, los cuatro apartados de Inteligencia IA, la validación de stock y el control de revisiones al guardar o restaurar.
- [`supabase.test.mjs`](supabase.test.mjs) ejecuta la migración en PostgreSQL con PGlite y comprueba las reglas para acceso anónimo, usuarios autorizados y guardados en conflicto.

Tras instalar las dependencias, ejecuta `npm run test:sql` y `python -m unittest discover -s tests -v` con el Python del entorno virtual. GitHub Actions ejecuta ambos comandos en cada cambio.
