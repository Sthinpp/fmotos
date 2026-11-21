# Interfaz de FMotos

[`main.jsx`](main.jsx) inicia React, controla la sesión y conecta las secciones con la API. [`conexion.js`](conexion.js) concentra el acceso a Supabase Auth y las solicitudes a `/api`.

| Pantalla | Archivo |
| --- | --- |
| Dashboard con filtros y comparación por mes | [`Dashboard.jsx`](Dashboard.jsx) |
| Ventas, clientes y pagos | [`Ventas.jsx`](Ventas.jsx) |
| Prospectos y seguimiento | [`CRM.jsx`](CRM.jsx) |
| Motos, repuestos, movimientos y mínimos | [`Inventario.jsx`](Inventario.jsx) |
| Pronósticos, reposición y agrupaciones | [`Inteligencia.jsx`](Inteligencia.jsx) |
| Exportación y respaldos | [`Reportes.jsx`](Reportes.jsx) |

Para iniciar la interfaz, sigue la [guía de instalación](../README.md#ejecutar-en-tu-computadora). Durante el desarrollo, Vite envía `/api` a FastAPI en el puerto 8000.
