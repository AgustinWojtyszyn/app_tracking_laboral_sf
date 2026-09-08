# 🔧 ServiFood Tracking · Panel de Mantenimiento

<p align="center">
  <strong>Plataforma web full-stack para la gestión de trabajos de mantenimiento, personal, costos, vehículos, planta y operación diaria.</strong>
</p>

<p align="center">
  Trabajos diarios · Personal · Grupos · Costos · Reportes · Vehículos · Planta · Auditoría
</p>

---

## 🚀 Vista general

**ServiFood Tracking** es una plataforma web desarrollada para centralizar la gestión operativa y de mantenimiento de ServiFood.

El sistema reúne dentro de una única aplicación:

- trabajos diarios;
- solicitudes de mantenimiento;
- trabajadores;
- grupos de trabajo;
- costos y montos a cobrar;
- paneles diarios y mensuales;
- exportaciones a Excel;
- comunicación mediante WhatsApp;
- vehículos;
- choferes;
- cargas de combustible;
- kilometraje y recorridos;
- mantenimiento preventivo y correctivo;
- vencimientos documentales;
- activos y sectores de planta;
- incidencias;
- controles;
- administración.

La aplicación está desarrollada como una SPA con **React + Vite** y utiliza **Supabase** para autenticación, base de datos PostgreSQL y acceso a datos.

---

# 🖥️ Vista del sistema

La interfaz está orientada al trabajo diario de personal operativo y administrativo, combinando métricas, filtros, formularios, reportes y herramientas de mantenimiento.

<p align="center">
  <img
    src="https://github.com/user-attachments/assets/f192af5e-347d-457d-8baa-27d52ff100fa"
    alt="ServiFood Tracking - Panel de Mantenimiento"
    width="100%"
  />
</p>

---

# ✨ Funcionalidades principales

## 🔨 Gestión de trabajos

El núcleo de la plataforma permite registrar y administrar trabajos diarios.

Cada trabajo puede contener información como:

- fecha;
- título;
- ubicación;
- solicitante;
- tipo de acción;
- sector o equipo;
- descripción;
- estado;
- trabajador asignado;
- grupo;
- costo;
- monto a cobrar;
- imágenes de referencia.

El sistema permite crear, editar, consultar y organizar trabajos según las necesidades de la operación.

---

# 📋 Trabajos diarios

El panel diario concentra la actividad correspondiente a una jornada.

Incluye indicadores como:

- total de trabajos;
- trabajos pendientes;
- trabajos completados;
- trabajadores involucrados;
- lugares atendidos;
- balance estimado.

También incorpora herramientas para:

- filtrar por fecha;
- buscar por ubicación;
- filtrar por estado;
- buscar por solicitante;
- modificar cantidad de registros;
- crear nuevos trabajos;
- exportar información;
- compartir información.

---

# 💰 Control de costos

Cada trabajo puede almacenar información económica asociada a la operación.

Entre los valores soportados se encuentran:

- costo del trabajador;
- monto a cobrar;
- diferencia estimada.

Esto permite tener una referencia rápida del balance económico de cada jornada.

---

# 📝 Solicitudes de trabajo

El formulario de creación permite registrar toda la información necesaria para iniciar una tarea.

## Datos principales

- Fecha.
- Título.
- Ubicación.
- Solicitante.

## Detalle del trabajo

- Tipo de acción.
- Sector o equipo.
- Descripción.

## Referencias visuales

Una solicitud puede contener hasta **3 imágenes**, cada una con:

- archivo;
- título;
- descripción.

## Asignación

También puede definirse:

- trabajador;
- grupo;
- costo;
- importe;
- permisos de edición por grupo.

---

# 👷 Gestión de trabajadores

La plataforma dispone de un módulo específico para administrar el personal operativo.

Los trabajadores registrados pueden utilizarse posteriormente en:

- trabajos;
- solicitudes;
- asignaciones;
- grupos;
- tareas de mantenimiento.

---

# 👥 Grupos de trabajo

El sistema permite organizar trabajadores dentro de grupos.

Los grupos pueden utilizarse para representar:

- cuadrillas;
- equipos de mantenimiento;
- grupos operativos;
- personal que trabaja de forma conjunta.

La administración de grupos está restringida según los permisos del usuario.

---

# 📅 Panel mensual

El panel mensual permite analizar la operación durante períodos más amplios.

Entre sus funciones se encuentran:

- consulta por rango de fechas;
- búsqueda;
- filtrado;
- trabajos completados;
- trabajos pendientes;
- análisis económico;
- exportación de información;
- acciones masivas.

Esto facilita la revisión de actividad y resultados más allá de la jornada actual.

---

# 📊 Reportes

La aplicación permite generar información consolidada para analizar la actividad.

Los reportes pueden utilizar datos relacionados con:

- trabajos;
- fechas;
- trabajadores;
- lugares;
- costos;
- estados;
- importes;
- vehículos;
- mantenimiento.

---

# 📤 Exportación a Excel

ServiFood Tracking utiliza **ExcelJS** para generar archivos `.xlsx`.

La exportación está integrada en distintos módulos de la plataforma.

Puede utilizarse para información relacionada con:

- trabajos diarios;
- panel mensual;
- historial;
- vehículos;
- combustible;
- mantenimiento;
- recorridos;
- equipos;
- planta.

---

# 💬 Compartir por WhatsApp

Los paneles operativos incluyen herramientas para preparar información y compartirla mediante **WhatsApp**.

Esto facilita la distribución de resúmenes a responsables, supervisores y equipos de trabajo.

---

# 🚚 Libro registro de equipo

Uno de los módulos principales del sistema es el **Libro registro de equipo y planta**.

Este módulo centraliza el control de:

- vehículos;
- choferes;
- recorridos;
- combustible;
- mantenimiento;
- documentación;
- equipos;
- planta.

---

# 🚗 Gestión de vehículos

La plataforma permite registrar los vehículos utilizados dentro de la operación.

Cada vehículo puede almacenar información como:

- patente;
- nombre;
- tipo;
- marca;
- modelo;
- año;
- chofer;
- kilometraje;
- estado;
- observaciones.

Los estados permiten identificar rápidamente vehículos disponibles o que requieren atención.

---

# 👨‍✈️ Choferes

Los vehículos pueden vincularse con choferes registrados dentro del sistema.

Esto permite asociar:

- vehículo;
- conductor;
- recorridos;
- kilometraje;
- solicitudes de mantenimiento;
- documentación.

---

# ⛽ Cargas de combustible

El sistema permite registrar cargas de combustible.

Cada carga puede contener:

- vehículo;
- fecha;
- hora;
- litros;
- precio;
- kilometraje;
- observaciones.

Esto permite mantener un historial operativo por vehículo.

---

# 🛣️ Recorridos

También pueden registrarse recorridos realizados por los vehículos.

Cada registro puede incluir:

- fecha;
- vehículo;
- chofer;
- kilometraje inicial;
- kilometraje final;
- lugares visitados;
- observaciones.

De esta manera es posible mantener trazabilidad sobre la utilización de cada unidad.

---

# 🔧 Mantenimiento

El sistema contempla dos grandes tipos de mantenimiento.

## Preventivo

Tareas planificadas para reducir la posibilidad de fallas.

Ejemplos:

- controles;
- service;
- cambios;
- inspecciones;
- revisiones periódicas.

## Correctivo

Intervenciones realizadas después de detectar una falla o inconveniente.

Los registros pueden almacenar:

- vehículo;
- fecha;
- detalle;
- kilometraje;
- costo;
- próximo control;
- observaciones.

---

# 🛠️ Solicitudes de mantenimiento

La plataforma también permite registrar solicitudes específicas de mantenimiento.

Estas pueden incluir:

- vehículo;
- chofer;
- fecha;
- tipo de problema;
- descripción;
- kilometraje;
- prioridad;
- estado;
- observaciones administrativas.

## Prioridades

```text
Baja
Media
Alta
```

## Estados

```text
Pendiente
En revisión
Programado
Realizado
Cancelado
```

---

# 📄 Documentación y vencimientos

ServiFood Tracking permite controlar documentación relacionada con vehículos y personal.

Entre los documentos contemplados se encuentran:

- seguro;
- RTO / revisión técnica;
- licencia de conducir;
- otros documentos.

Los vencimientos pueden clasificarse como:

```text
Vigente
Próximo a vencer
Vencido
```

Esto permite detectar documentación que requiere renovación.

---

# 🏭 Planta y equipos

El Libro de Equipo no está limitado al seguimiento vehicular.

También permite registrar sectores y activos operativos de planta.

Cada elemento puede almacenar:

- nombre;
- categoría;
- ubicación;
- estado;
- responsable;
- notas.

---

# ⚠️ Incidencias

La plataforma permite registrar anomalías o problemas detectados durante la operación.

Un registro puede incluir:

- equipo;
- fecha;
- hora;
- descripción de la anomalía;
- acción correctiva;
- tiempo fuera de servicio;
- responsable;
- observaciones.

---

# 🔍 Revisiones y controles

Los activos pueden disponer de controles periódicos.

Por ejemplo:

- inspecciones preventivas;
- componentes revisados;
- estado general;
- observaciones;
- próxima fecha de revisión.

Esto ayuda a mantener un historial técnico del equipamiento.

---

# 📈 Dashboard del libro de equipos

El módulo de equipos dispone de indicadores rápidos para visualizar el estado general de la operación.

Entre ellos:

```text
Vehículos activos
Recorridos del día
Cargas recientes
Mantenimientos pendientes
Vencimientos próximos
Novedades de planta
```

Esto permite detectar rápidamente elementos que requieren atención.

---

# 🎓 Tutorial integrado

La aplicación cuenta con un módulo de tutorial para facilitar el uso de las principales funciones.

El objetivo es que los usuarios puedan aprender los flujos del sistema directamente desde la propia plataforma.

---

# 🌐 Idiomas

La interfaz contempla soporte para:

- 🇦🇷 Español
- 🇬🇧 Inglés

El idioma puede cambiarse desde la aplicación.

---

# 🌙 Apariencia

ServiFood Tracking incluye soporte para:

- modo claro;
- modo oscuro.

Esto permite adaptar la interfaz a las preferencias del usuario y al entorno de trabajo.

---

# 📱 Responsive design

La plataforma está preparada para utilizarse en:

- computadoras de escritorio;
- notebooks;
- tablets;
- smartphones.

La interfaz prioriza:

- navegación clara;
- formularios estructurados;
- paneles de resumen;
- filtros accesibles;
- estados visibles;
- acciones rápidas.

---

# 🔐 Roles y permisos

La aplicación utiliza autenticación y rutas protegidas.

Entre los perfiles contemplados por el sistema se encuentran:

```text
admin
chofer
user
solicitante
trabajador
```

Existen operaciones restringidas según el rol.

Por ejemplo:

- administración general → `admin`;
- gestión de grupos → `admin`;
- libro de equipo → usuarios autorizados;
- módulos operativos → usuarios autenticados según permisos.

Las rutas principales están protegidas dentro de la aplicación. 

---

# 🏗️ Arquitectura

```text
┌─────────────────────────────────────┐
│              Usuario                │
│      Desktop / Tablet / Mobile      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│          React 18 + Vite 5          │
│                                     │
│ UI · Routing · Formularios · Estado │
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
      │ Datos         │  │ Reportes      │
      │ operativos    │  │ Excel         │
      └───────────────┘  └───────────────┘
               │
               ▼
      ┌─────────────────────┐
      │ Operación diaria    │
      │ y mantenimiento     │
      └─────────────────────┘
```

---

# 🧰 Stack tecnológico

## Frontend

| Tecnología | Uso |
|---|---|
| React 18 | Interfaz de usuario |
| Vite 5 | Desarrollo y build |
| React Router 6 | Navegación |
| Tailwind CSS 3 | Estilos |
| Radix UI | Componentes |
| Framer Motion | Animaciones |
| Lucide React | Iconografía |
| date-fns | Gestión de fechas |
| React Day Picker | Selección de fechas |
| Driver.js | Tutoriales |
| React Helmet | Metadatos |

## Backend

| Tecnología | Uso |
|---|---|
| Supabase | Plataforma backend |
| PostgreSQL | Base de datos |
| Supabase Auth | Autenticación |
| Supabase JS | Cliente de datos |

## Reportes

| Tecnología | Uso |
|---|---|
| ExcelJS | Generación de Excel |

## Testing

| Tecnología | Uso |
|---|---|
| Vitest | Tests automatizados |
| ESLint | Análisis estático |
| Locust | Pruebas de carga |

El stack corresponde a las dependencias actuales del proyecto. 

---

# 🔄 Flujo de una solicitud

```text
Usuario autenticado
        │
        ▼
Nueva solicitud
        │
        ├── Fecha
        ├── Título
        ├── Ubicación
        ├── Solicitante
        ├── Tipo de acción
        ├── Sector / equipo
        ├── Descripción
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
        └──► Administración
```

---

# 🚚 Flujo del libro de equipo

```text
Libro de equipo
      │
      ├──► Vehículos
      │     ├── Kilometraje
      │     ├── Chofer
      │     └── Estado
      │
      ├──► Combustible
      │
      ├──► Recorridos
      │
      ├──► Mantenimiento
      │     ├── Preventivo
      │     └── Correctivo
      │
      ├──► Documentación
      │
      ├──► Incidencias
      │
      └──► Planta
            ├── Sectores
            ├── Equipos
            ├── Revisiones
            └── Novedades
```

---

# 🧪 Testing

## Tests automatizados

```bash
npm test
```

Ejecuta la suite de pruebas mediante **Vitest**.

## Lint

```bash
npm run lint
```

## Build

```bash
npm run build
```

Los scripts `dev`, `build`, `preview`, `start`, `lint` y `test` están definidos actualmente en el proyecto. 

---

# 📈 Pruebas de carga con Locust

El repositorio incorpora pruebas de carga mediante **Locust**.

## 1. Crear entorno virtual

### Linux / macOS

```bash
python -m venv .venv
source .venv/bin/activate
```

### Windows PowerShell

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

## 2. Instalar dependencias

```bash
pip install -r load-tests/requirements.txt
```

## 3. Iniciar la aplicación

```bash
npm run dev
```

El entorno local utiliza el puerto:

```text
3000
```

## 4. Ejecutar Locust

```bash
locust -f load-tests/locustfile.py \
  --users 20 \
  --spawn-rate 2 \
  --host http://localhost:3000
```

Luego abrir:

```text
http://localhost:8089
```

También pueden configurarse variables específicas para probar llamadas a Supabase:

```env
LOCUST_SUPABASE_URL=
LOCUST_SUPABASE_ANON_KEY=
```

---

# 💻 Instalación local

## Requisitos

- Node.js
- npm
- proyecto Supabase configurado

## 1. Clonar

```bash
git clone https://github.com/AgustinWojtyszyn/app_tracking_laboral_sf.git
cd app_tracking_laboral_sf
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Configurar entorno

Crear un archivo `.env`.

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica
```

> Nunca colocar `service_role`, contraseñas o secretos privados dentro de variables `VITE_*`.

## 4. Desarrollo

```bash
npm run dev
```

## 5. Build

```bash
npm run build
```

## 6. Preview

```bash
npm run preview
```

---

# 📜 Scripts disponibles

```bash
npm run dev
npm run build
npm run preview
npm run start
npm run lint
npm test
```

---

# 📁 Estructura general

```text
app_tracking_laboral_sf/
│
├── public/
│
├── src/
│   ├── components/
│   ├── contexts/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   └── ...
│
├── docs/
├── load-tests/
├── tools/
├── package.json
└── README.md
```

---

# 🔒 Seguridad

El proyecto separa las credenciales públicas del frontend de los secretos administrativos.

Nunca deben publicarse:

```text
SUPABASE_SERVICE_ROLE_KEY
Contraseñas
Tokens privados
Secretos de backend
Credenciales administrativas
API keys privadas
```

Las variables expuestas mediante `VITE_*` forman parte del bundle del frontend y deben contener únicamente información apta para cliente.

---

# ⚡ Diseño orientado a operación

La interfaz está diseñada para utilizarse durante la operación diaria.

Prioriza:

- navegación lateral;
- paneles de resumen;
- búsqueda;
- filtros;
- formularios organizados;
- indicadores;
- imágenes de referencia;
- exportaciones;
- acciones rápidas;
- estados claros;
- diseño responsive.

---

# 🔎 Auditoría y mantenimiento

El repositorio mantiene documentación técnica y auditorías adicionales separadas del README.

De esta forma, esta página funciona principalmente como presentación general del sistema, mientras los detalles técnicos pueden mantenerse dentro de:

```text
docs/
```

---

# 🟢 Estado del proyecto

**En desarrollo activo y uso operativo.**

Actualmente la plataforma incluye funcionalidades relacionadas con:

- trabajos;
- mantenimiento;
- trabajadores;
- grupos;
- costos;
- vehículos;
- choferes;
- combustible;
- recorridos;
- documentación;
- planta;
- reportes;
- administración.

El proyecto continúa evolucionando especialmente en:

- estabilidad;
- rendimiento;
- experiencia de usuario;
- seguridad;
- reportes;
- mantenimiento;
- automatización;
- observabilidad.

---

# 👨‍💻 Autor

**Agustin Wojtyszyn**

Full-Stack Developer

GitHub: [@AgustinWojtyszyn](https://github.com/AgustinWojtyszyn)

---

<p align="center">
  <strong>ServiFood Tracking · Panel de Mantenimiento</strong>
</p>

<p align="center">
  Gestión de trabajos, personal, equipos, vehículos y planta desde una única plataforma.
</p>
