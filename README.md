
# Panel de Mantenimiento - Sistema de Gestión de Trabajos

Aplicación web para la gestión de trabajos diarios, control de horas, costos y facturación, con soporte para grupos de trabajo y roles de usuario.

## Características Principales

- **Gestión de Trabajos**: Registro diario con fecha, ubicación, descripción, horas, costo y monto.
- **Grupos de Trabajo**: Creación de grupos, gestión de miembros y roles (admin/miembro).
- **Reportes**: Exportación a Excel por día, rango de fechas o filtros personalizados.
- **Dashboard**: Panel con métricas en tiempo real.
- **Seguridad**: Autenticación completa, validación de email y roles de usuario.
- **Responsive**: Diseño adaptado a dispositivos móviles y escritorio.
- **Auditoría**: Registro de acciones críticas para administradores.

## Configuración del Entorno

1.  Clonar el repositorio.
2.  Copiar `.env.example` a `.env` (si existe) o configurar las siguientes variables en su entorno de despliegue:

## Pruebas de carga con Locust

1. Crea un entorno virtual de Python y activa: `python -m venv .venv && source .venv/bin/activate`
2. Instala las dependencias de pruebas: `pip install -r load-tests/requirements.txt`
3. Levanta el frontend local: `npm run dev` (usa el puerto 3000 por defecto).
4. En otra terminal, ejecuta Locust: `locust -f load-tests/locustfile.py --users 20 --spawn-rate 2 --host http://localhost:3000`
5. Abre `http://localhost:8089` para ajustar la cantidad de usuarios y lanzar la prueba.
6. Si quieres incluir llamadas a Supabase REST, exporta antes las variables `LOCUST_SUPABASE_URL` y `LOCUST_SUPABASE_ANON_KEY`; de lo contrario, se omiten esos pasos.
