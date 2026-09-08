README.md


🔧 ServiFood Tracking · Panel de Mantenimiento
<p align="center"> <strong>Plataforma web full-stack para gestionar trabajos de mantenimiento, personal, costos, vehículos, planta y operación diaria.</strong> </p>

<p align="center"> Trabajos diarios · Personal · Grupos · Costos · Reportes · Vehículos · Planta · Auditoría </p>

<p align="center"> <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" /> <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" /> <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" /> <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /> <img src="https://img.shields.io/badge/Vitest-Testing-6E9F18?logo=vitest&logoColor=white" alt="Vitest" /> <img src="https://img.shields.io/badge/Locust-Load%20Testing-2A7D2E" alt="Locust" /> </p>

🚀 Vista general
ServiFood Tracking es un sistema de gestión operativa orientado al mantenimiento y seguimiento de trabajos realizados por equipos internos.

La aplicación centraliza en una sola plataforma:

trabajos diarios;

solicitudes de mantenimiento;

trabajadores y asignaciones;

grupos de trabajo;

costos y montos a cobrar;

panel mensual;

exportaciones a Excel;

seguimiento mediante WhatsApp;

vehículos y choferes;

cargas de combustible;

mantenimiento preventivo y correctivo;

recorridos y kilometraje;

vencimientos documentales;

sectores y activos de planta;

incidencias y revisiones;

auditoría y administración.

La plataforma está desarrollada como una SPA con React + Vite, utiliza Supabase para autenticación y persistencia de datos, y cuenta con control de acceso mediante rutas protegidas y roles.

🖥️ Interfaz
📋 Trabajos diarios
El panel principal resume la actividad de cada jornada y permite acceder rápidamente a las operaciones más frecuentes.

Incluye:

total de trabajos;

trabajos pendientes;

trabajos completados;

trabajadores involucrados;

lugares atendidos;

balance estimado;

filtros por fecha;

búsqueda por ubicación;

filtro de estado;

filtro por solicitante;

paginación;

creación de nuevas solicitudes;

exportación a Excel;

compartir información por WhatsApp.

<p align="center"> <img src="./docs/screenshots/dashboard-trabajos-diarios.png" alt="Panel de trabajos diarios" width="100%" /> </p>

📝 Nueva solicitud
El formulario de creación permite registrar un trabajo con toda la información operativa necesaria.

Entre los datos soportados se encuentran:

fecha;

título;

ubicación;

solicitante;

tipo de acción;

sector o equipo;

descripción;

hasta 3 imágenes de referencia;

título y descripción por imagen;

costo del trabajador;

monto a cobrar;

trabajador asignado;

grupo de trabajo;

configuración de edición por grupo.

<details> <summary><strong>Ver captura completa del formulario</strong></summary> <br> <p align="center"> <img src="./docs/screenshots/nueva-solicitud.png" alt="Formulario de nueva solicitud" width="100%" /> </p> </details>

🚚 Registro de equipo y planta
El módulo Libro registro de equipo amplía el sistema más allá de los trabajos diarios y centraliza información operativa de vehículos, choferes y sectores de planta.

El panel permite visualizar indicadores como:

vehículos activos;

recorridos del día;

cargas recientes;

mantenimientos pendientes;

vencimientos próximos;

novedades de planta.

También concentra distintas áreas de gestión para:

Vehículos
alta y edición de vehículos;

patente;

tipo;

marca y modelo;

año;

estado;

kilometraje;

chofer asignado;

observaciones.

Combustible
vehículo;

fecha y hora;

litros;

precio;

kilometraje;

observaciones.

Mantenimiento
mantenimiento preventivo;

mantenimiento correctivo;

fecha;

detalle;

kilometraje;

costo;

próximo control;

prioridad;

estado.

Recorridos
vehículo;

chofer;

kilometraje inicial;

kilometraje final;

lugares visitados;

observaciones.

Documentación
Seguimiento de vencimientos de:

seguro;

RTO / revisión técnica;

licencia;

otros documentos.

Planta y equipos
sectores y activos;

estado;

responsable;

novedades;

incidencias;

revisiones;

calibraciones y controles.

<p align="center"> <img src="./docs/screenshots/registro-equipo-planta.png" alt="Registro de equipo y planta" width="100%" /> </p>

✨ Funcionalidades principales
🔨 Gestión de trabajos
Creación de solicitudes.

Edición de trabajos existentes.

Detalle individual de cada trabajo.

Estados operativos.

Asignación de trabajadores.

Asignación por grupos.

Seguimiento de costos.

Registro del monto a cobrar.

Adjuntos visuales.

Búsqueda y filtros.

Panel diario.

Panel mensual.

👷 Trabajadores
Módulo dedicado a la gestión del personal operativo.

Permite mantener los trabajadores disponibles para asignarlos a trabajos y actividades dentro del sistema.

👥 Grupos de trabajo
Los administradores pueden organizar trabajadores en grupos y gestionar su composición.

Esto permite representar cuadrillas o equipos que trabajan juntos sobre una misma solicitud.

📊 Panel mensual
La vista mensual permite consolidar la actividad operativa en un período más amplio.

Puede utilizarse para analizar:

trabajos realizados;

estados;

personal;

costos;

facturación;

actividad por fechas;

información filtrada.

📤 Exportación a Excel
La plataforma genera archivos .xlsx mediante ExcelJS.

Las exportaciones se utilizan en distintas áreas del sistema, incluyendo:

trabajos diarios;

períodos;

historial;

panel mensual;

libro de equipos;

vehículos y mantenimiento.

💬 Compartir por WhatsApp
Los paneles operativos incorporan acciones para preparar y compartir información mediante WhatsApp, facilitando la comunicación diaria con responsables y equipos.

🚗 Gestión de vehículos y choferes
El libro de equipos permite administrar vehículos y vincularlos con choferes.

La plataforma contempla información relacionada con:

estado del vehículo;

kilometraje;

asignación;

combustible;

mantenimiento;

recorridos;

documentación.

🏭 Gestión de planta
Además del seguimiento vehicular, el sistema permite registrar activos y sectores operativos de planta.

Se pueden documentar:

novedades;

anomalías;

acciones correctivas;

tiempos fuera de servicio;

revisiones;

próximos controles;

responsables.

🎓 Tutorial integrado
La aplicación incorpora una sección de tutorial para facilitar el uso de los principales módulos.

🌐 Idioma y apariencia
La interfaz incorpora:

soporte de navegación en español e inglés;

modo claro y oscuro;

diseño responsive para escritorio, tablet y dispositivos móviles.

🔐 Roles y seguridad
Las rutas internas están protegidas mediante autenticación y control de acceso.

El sistema contempla distintos perfiles operativos, entre ellos:

admin;

chofer;

user;

solicitante;

trabajador.

Algunas funciones, como la administración general y la gestión de grupos, están restringidas a administradores.

La seguridad no depende únicamente de ocultar elementos de la interfaz: el backend utiliza Supabase como capa de autenticación y acceso a datos.

🏗️ Arquitectura
┌─────────────────────────────────────┐
│              Usuario                │
│      Desktop / Tablet / Mobile      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│          React 18 + Vite 5          │
│                                     │
│ UI · Routing · State · Formularios  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│              Supabase               │
│                                     │
│ Auth · PostgreSQL · API · Seguridad │
└──────────────┬──────────────┬───────┘
               │              │
               ▼              ▼
      ┌───────────────┐  ┌───────────────┐
      │ Datos         │  │ Exportaciones │
      │ operativos    │  │ Excel         │
      └───────────────┘  └───────────────┘
               │
               ▼
      ┌────────────────┐
      │ Operación      │
      │ Mantenimiento  │
      └────────────────┘
🧰 Stack tecnológico
Frontend
Tecnología	Uso
React 18	Interfaz de usuario
Vite 5	Build y desarrollo
React Router 6	Routing
Tailwind CSS 3	Estilos
Radix UI	Componentes accesibles
Framer Motion	Animaciones
Lucide React	Iconografía
date-fns	Fechas
React Day Picker	Selección de fechas
Driver.js	Tutoriales guiados
React Helmet	Metadatos
Backend y datos
Tecnología	Uso
Supabase	Plataforma backend
PostgreSQL	Persistencia
Supabase Auth	Autenticación
Supabase JS	Cliente de datos
Reportes
Tecnología	Uso
ExcelJS	Generación de archivos Excel
Calidad
Tecnología	Uso
Vitest	Tests automatizados
ESLint	Análisis estático
Locust	Pruebas de carga
🔄 Flujo de una solicitud
Usuario autenticado
        │
        ▼
Nueva solicitud
        │
        ├── Fecha
        ├── Ubicación
        ├── Solicitante
        ├── Tipo de acción
        ├── Sector / equipo
        ├── Imágenes
        ├── Costos
        └── Trabajador / grupo
        │
        ▼
Validación
        │
        ▼
Supabase
        │
        ├──► Trabajos diarios
        ├──► Panel mensual
        ├──► Trabajadores
        ├──► Grupos
        ├──► Excel
        └──► Auditoría / administración
🧪 Testing
Tests automatizados
npm test
Ejecuta la suite mediante Vitest.

Lint
npm run lint
Build de producción
npm run build
📈 Pruebas de carga con Locust
El repositorio incluye pruebas de carga independientes del frontend.

1. Crear entorno virtual
Linux / macOS:

python -m venv .venv
source .venv/bin/activate
Windows PowerShell:

python -m venv .venv
.venv\Scripts\Activate.ps1
2. Instalar dependencias
pip install -r load-tests/requirements.txt
3. Iniciar la aplicación
npm run dev
El entorno de desarrollo utiliza el puerto 3000.

4. Ejecutar Locust
locust -f load-tests/locustfile.py \
  --users 20 \
  --spawn-rate 2 \
  --host http://localhost:3000
Luego abrir:

http://localhost:8089
Para incluir llamadas de prueba contra Supabase REST pueden utilizarse variables específicas para Locust:

LOCUST_SUPABASE_URL=
LOCUST_SUPABASE_ANON_KEY=
💻 Instalación local
Requisitos
Node.js

npm

proyecto Supabase configurado

1. Clonar
git clone https://github.com/AgustinWojtyszyn/app_tracking_laboral_sf.git
cd app_tracking_laboral_sf
2. Instalar dependencias
npm install
3. Configurar variables de entorno
Crear un archivo .env local.

VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica
No incluir claves privadas ni service_role dentro de variables VITE_*, ya que estas variables forman parte del bundle del frontend.

En Vite, el cliente solo puede leer directamente variables expuestas mediante el prefijo VITE_.

4. Iniciar desarrollo
npm run dev
La aplicación queda disponible por defecto en:

http://localhost:3000
5. Build
npm run build
6. Preview
npm run preview
📜 Scripts disponibles
npm run dev
npm run build
npm run preview
npm run start
npm run lint
npm test
📁 Estructura general
app_tracking_laboral_sf/
│
├── src/
│   ├── components/        # Componentes de UI y layout
│   ├── contexts/          # Auth, estado y contextos
│   ├── pages/             # Pantallas principales
│   ├── services/          # Supabase, exportación y negocio
│   ├── utils/             # Utilidades
│   └── ...
│
├── docs/                  # Documentación y auditorías
├── load-tests/            # Pruebas Locust
├── tools/                 # Scripts auxiliares
├── public/                # Assets públicos
├── package.json
└── README.md
⚡ Diseño operativo
La interfaz está pensada para una aplicación utilizada durante la operación diaria.

Prioriza:

navegación lateral rápida;

paneles de resumen;

filtros visibles;

formularios estructurados;

búsqueda;

estados claros;

carga de imágenes;

acciones rápidas;

exportaciones;

experiencia responsive.

🔎 Auditoría y mantenimiento
El repositorio mantiene documentación técnica y auditorías separadas del README principal.

Esto permite que la portada del proyecto permanezca clara y orientada al producto, mientras que los detalles de implementación, riesgos y mantenimiento pueden conservarse en docs/.

🟢 Estado del proyecto
En desarrollo activo y uso operativo.

El sistema continúa evolucionando en áreas como:

mantenimiento;

vehículos;

planta;

experiencia de usuario;

seguridad;

rendimiento;

reportes;

automatización;

observabilidad.

🔒 Configuración segura
Aunque una clave anon / publishable de Supabase está diseñada para utilizarse desde el cliente, el README utiliza valores de ejemplo y no fija la configuración del entorno productivo.

Nunca deben publicarse:

service_role;

claves administrativas;

secretos de backend;

contraseñas;

credenciales de proveedores.

👨‍💻 Autor
Agustin Wojtyszyn
Full-Stack Developer

GitHub: @AgustinWojtyszyn

<p align="center"> <strong>ServiFood Tracking · Panel de Mantenimiento</strong> </p>

<p align="center"> Gestión de trabajos, equipos, vehículos, planta y operación diaria desde una única plataforma. </p>
