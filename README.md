# 🔧 ServiFood Tracking · Panel de Mantenimiento

<p align="center">
  <strong>Plataforma web full-stack para la gestión de trabajos de mantenimiento, personal, costos, vehículos, planta y operación diaria.</strong>
</p>

<p align="center">
  Trabajos diarios · Personal · Grupos · Costos · Reportes · Vehículos · Planta · Auditoría
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vitest-Testing-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Locust-Load%20Testing-2A7D2E" alt="Locust" />
</p>

---

## 🚀 Vista general

**ServiFood Tracking** es una plataforma web desarrollada para centralizar la operación de mantenimiento, seguimiento de trabajos y control de recursos.

El sistema permite gestionar desde una única aplicación:

- trabajos diarios;
- solicitudes de mantenimiento;
- trabajadores;
- grupos de trabajo;
- costos internos;
- montos a cobrar;
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
- controles y revisiones;
- administración y auditoría.

La plataforma está construida como una SPA con **React + Vite** y utiliza **Supabase** como backend para autenticación, PostgreSQL y acceso a datos.

---

# 🖥️ Interfaz

## 📋 Trabajos diarios

El panel principal concentra la operación diaria y permite visualizar rápidamente el estado de los trabajos.

Incluye:

- total de trabajos;
- pendientes;
- completados;
- trabajadores involucrados;
- lugares atendidos;
- balance estimado;
- costos;
- montos a cobrar;
- filtros por fecha;
- búsqueda por ubicación;
- filtro de estado;
- filtro por solicitante;
- paginación;
- creación de nuevos trabajos;
- exportación a Excel;
- compartir por WhatsApp.

<p align="center">
  <img
    src="./docs/screenshots/dashboard-trabajos-diarios.png"
    alt="Panel de trabajos diarios de ServiFood Tracking"
    width="100%"
  />
</p>

---

## 📝 Nueva solicitud

El formulario de creación permite registrar un trabajo con toda la información operativa necesaria.

### Datos principales

- Fecha.
- Título.
- Ubicación.
- Solicitante.
- Tipo de acción.
- Sector o equipo.
- Descripción.

### Imágenes

Cada solicitud puede incluir hasta **3 imágenes de referencia**, con:

- archivo;
- título;
- descripción.

### Asignación y costos

También permite registrar:

- costo del trabajador;
- monto a cobrar;
- trabajador asignado;
- grupo de trabajo;
- configuración de edición por grupo.

<details>
  <summary><strong>📸 Ver formulario completo de nueva solicitud</strong></summary>

  <br>

  <p align="center">
    <img
      src="./docs/screenshots/nueva-solicitud.png"
      alt="Formulario completo de nueva solicitud"
      width="100%"
    />
  </p>

</details>

---

## 🚚 Registro de equipo y planta

El módulo **Libro registro de equipo** extiende la plataforma al seguimiento de vehículos, choferes, mantenimiento y activos operativos.

El dashboard presenta indicadores como:

- vehículos activos;
- kilómetros recorridos durante el día;
- cargas de combustible recientes;
- mantenimientos pendientes;
- vencimientos próximos;
- novedades de planta.

<p align="center">
  <img
    src="./docs/screenshots/registro-equipo-planta.png"
    alt="Libro registro de equipo y planta"
    width="100%"
  />
</p>

---

# ✨ Funcionalidades principales

## 🔨 Gestión de trabajos

El núcleo del sistema permite administrar trabajos y solicitudes de mantenimiento.

Incluye:

- creación de trabajos;
- edición;
- detalle individual;
- fechas;
- ubicaciones;
- solicitantes;
- descripción;
- estado;
- trabajador asignado;
- grupos;
- costos;
- importes;
- imágenes;
- búsqueda;
- filtros;
- seguimiento operativo.

---

## 📊 Dashboard diario

La vista diaria resume automáticamente el estado de la jornada.

Entre las métricas disponibles:

```text
Total de trabajos
Pendientes
Completados
Trabajadores involucrados
Lugares atendidos
Balance estimado
```

El balance permite comparar el monto a cobrar con los costos asociados al trabajo.

---

## 📅 Panel mensual

El sistema incorpora un panel dedicado al análisis mensual.

Permite consolidar información relacionada con:

- trabajos realizados;
- trabajadores;
- estados;
- costos;
- facturación;
- períodos;
- filtros;
- exportaciones.

---

# 👷 Gestión de trabajadores

Existe un módulo específico para administrar el personal disponible.

Los trabajadores pueden ser utilizados posteriormente en:

- asignaciones;
- solicitudes;
- trabajos;
- grupos;
- operaciones de mantenimiento.

---

# 👥 Grupos de trabajo

Los administradores pueden organizar trabajadores dentro de grupos.

Esto permite representar:

- cuadrillas;
- equipos;
- grupos de mantenimiento;
- personal que trabaja conjuntamente.

La gestión de grupos está protegida mediante permisos administrativos.

---

# 🚗 Gestión de vehículos

El **Libro registro de equipo** permite registrar y administrar vehículos utilizados en la operación.

Cada vehículo puede almacenar información como:

- patente;
- nombre;
- tipo;
- marca;
- modelo;
- año;
- chofer asignado;
- vencimiento de documentación;
- kilometraje inicial;
- kilometraje actual;
- estado;
- observaciones.

---

# ⛽ Combustible

La plataforma permite registrar cargas de combustible.

Cada carga puede incluir:

- vehículo;
- fecha;
- hora estimada;
- litros;
- importe;
- kilometraje;
- observaciones.

Esto permite mantener historial operativo por vehículo.

---

# 🔧 Mantenimiento de vehículos

El sistema diferencia entre:

### Mantenimiento preventivo

Trabajos programados para evitar fallas y mantener el vehículo en condiciones.

Ejemplos:

- controles;
- service;
- cambios;
- revisiones periódicas.

### Mantenimiento correctivo

Intervenciones realizadas luego de detectar una falla o inconveniente.

Los registros pueden incluir:

- vehículo;
- fecha;
- detalle;
- kilometraje;
- valor;
- próximo control;
- observaciones.

---

# 🛠️ Solicitudes de mantenimiento

También pueden generarse solicitudes independientes de mantenimiento.

Estas contemplan:

- vehículo;
- chofer;
- fecha;
- tipo de problema;
- descripción;
- kilometraje;
- prioridad;
- estado;
- observaciones administrativas;
- resolución.

### Prioridades

```text
Baja
Media
Alta
```

### Estados

```text
Pendiente
En revisión
Programado
Realizado
Cancelado
```

---

# 🛣️ Recorridos

La plataforma permite registrar recorridos de vehículos.

Cada recorrido puede almacenar:

- fecha;
- vehículo;
- chofer;
- kilometraje inicial;
- kilometraje final;
- lugares visitados;
- observaciones.

Esto permite calcular y mantener historial de uso.

---

# 📄 Documentación y vencimientos

ServiFood Tracking permite controlar vencimientos relacionados con:

- seguro;
- RTO / revisión técnica;
- licencia de conducir;
- otros documentos.

Los documentos pueden clasificarse como:

```text
Vigente
Próximo a vencer
Vencido
```

---

# 🏭 Planta y equipos

El módulo no está limitado a vehículos.

También permite administrar sectores y activos de planta.

Cada registro puede incluir:

- nombre;
- categoría;
- ubicación;
- estado;
- responsable;
- notas.

---

# ⚠️ Incidencias

Los operadores pueden registrar novedades o anomalías relacionadas con equipos o sectores.

Los registros contemplan:

- equipo;
- fecha;
- hora;
- anomalía;
- acción correctiva;
- tiempo fuera de servicio;
- responsable del mantenimiento;
- observaciones.

---

# 🔍 Revisiones y controles

La aplicación permite registrar controles periódicos.

Por ejemplo:

- inspecciones preventivas;
- componentes revisados;
- estado general;
- observaciones;
- próxima fecha de revisión.

---

# 📤 Exportaciones a Excel

El sistema utiliza **ExcelJS** para generar archivos `.xlsx`.

Las exportaciones se utilizan en diferentes módulos, incluyendo:

- trabajos diarios;
- panel mensual;
- historial;
- equipos;
- vehículos;
- combustible;
- mantenimiento;
- recorridos;
- información de planta.

---

# 💬 Integración operativa con WhatsApp

Los paneles diarios y mensuales incorporan acciones para preparar información y compartirla mediante **WhatsApp**.

Esto permite distribuir rápidamente resúmenes operativos a responsables y equipos.

---

# 🎓 Tutorial integrado

La aplicación incorpora un módulo de tutorial para explicar las funciones principales.

Esto facilita la incorporación de usuarios sin necesidad de documentación externa para cada operación.

---

# 🌐 Idiomas

La interfaz contempla navegación en:

- 🇦🇷 Español
- 🇬🇧 Inglés

El idioma puede cambiarse directamente desde la aplicación.

---

# 🌙 Apariencia

La plataforma soporta:

- modo claro;
- modo oscuro.

La interfaz adapta sus componentes y paneles al tema seleccionado.

---

# 📱 Responsive design

ServiFood Tracking está diseñado para funcionar en:

- desktop;
- notebooks;
- tablets;
- smartphones.

Los principales flujos priorizan:

- navegación clara;
- formularios estructurados;
- filtros visibles;
- estados comprensibles;
- acciones rápidas;
- adaptación a pantallas pequeñas.

---

# 🔐 Roles y seguridad

La aplicación utiliza autenticación y rutas protegidas.

Entre los perfiles contemplados se encuentran:

```text
admin
chofer
user
solicitante
trabajador
```

Algunas operaciones poseen restricciones adicionales.

Por ejemplo:

- gestión de grupos → administrador;
- panel administrativo → administrador;
- módulos operativos → usuarios autorizados;
- libro de equipo → roles habilitados.

La protección no depende únicamente de ocultar botones en la interfaz.

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
      │ Datos         │  │ Exportaciones │
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
| React Router 6 | Routing |
| Tailwind CSS 3 | Estilos |
| Radix UI | Componentes accesibles |
| Framer Motion | Animaciones |
| Lucide React | Iconografía |
| date-fns | Gestión de fechas |
| React Day Picker | Selectores de fecha |
| Driver.js | Tutoriales |
| React Helmet | Metadatos |

---

## Backend

| Tecnología | Uso |
|---|---|
| Supabase | Plataforma backend |
| PostgreSQL | Base de datos |
| Supabase Auth | Autenticación |
| Supabase JS | Acceso a datos |

---

## Reportes

| Tecnología | Uso |
|---|---|
| ExcelJS | Generación de Excel |

---

## Testing

| Tecnología | Uso |
|---|---|
| Vitest | Tests automatizados |
| ESLint | Análisis estático |
| Locust | Pruebas de carga |

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
        ├──► Exportación Excel
        └──► Administración
```

---

# 🚚 Flujo del libro de equipo

```text
Libro de equipo
      │
      ├──► Vehículos
      │     ├─ Kilometraje
      │     ├─ Chofer
      │     └─ Estado
      │
      ├──► Combustible
      │
      ├──► Recorridos
      │
      ├──► Mantenimiento
      │     ├─ Preventivo
      │     └─ Correctivo
      │
      ├──► Documentación
      │
      ├──► Incidencias
      │
      └──► Planta
            ├─ Sectores
            ├─ Equipos
            ├─ Revisiones
            └─ Novedades
```

---

# 🧪 Testing

## Tests automatizados

```bash
npm test
```

Ejecuta la suite mediante **Vitest**.

---

## Lint

```bash
npm run lint
```

---

## Build

```bash
npm run build
```

---

# 📈 Pruebas de carga con Locust

El proyecto incluye pruebas de carga mediante **Locust**.

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

---

## 2. Instalar dependencias

```bash
pip install -r load-tests/requirements.txt
```

---

## 3. Ejecutar la aplicación

```bash
npm run dev
```

El servidor de desarrollo utiliza por defecto:

```text
http://localhost:3000
```

---

## 4. Ejecutar Locust

```bash
locust -f load-tests/locustfile.py \
  --users 20 \
  --spawn-rate 2 \
  --host http://localhost:3000
```

La interfaz de Locust estará disponible en:

```text
http://localhost:8089
```

Para incluir llamadas contra Supabase REST pueden definirse:

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

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/AgustinWojtyszyn/app_tracking_laboral_sf.git

cd app_tracking_laboral_sf
```

---

## 2. Instalar dependencias

```bash
npm install
```

---

## 3. Variables de entorno

Crear un archivo `.env`.

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica
```

> Las variables `VITE_*` forman parte del bundle del frontend. Nunca utilizar `service_role`, contraseñas, secretos administrativos o credenciales privadas dentro de ellas.

---

## 4. Iniciar desarrollo

```bash
npm run dev
```

---

## 5. Build de producción

```bash
npm run build
```

---

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
│   └── screenshots/
│       ├── dashboard-trabajos-diarios.png
│       ├── nueva-solicitud.png
│       └── registro-equipo-planta.png
│
├── load-tests/
├── tools/
├── package.json
└── README.md
```

---

# ⚡ Diseño orientado a operación

La interfaz está pensada para una aplicación utilizada diariamente por personal operativo y administrativo.

Prioriza:

- navegación lateral rápida;
- paneles de resumen;
- búsqueda;
- filtros;
- formularios organizados;
- indicadores;
- carga de imágenes;
- exportaciones;
- acciones rápidas;
- estados visibles;
- responsive design.

---

# 🔎 Auditoría y mantenimiento

El repositorio mantiene documentación técnica y auditorías separadas de la portada principal.

Esto permite mantener el README enfocado en explicar el producto mientras que los detalles técnicos pueden permanecer dentro de:

```text
docs/
```

---

# 🔒 Seguridad de configuración

Las credenciales de producción no deben escribirse directamente en el README.

Nunca publicar:

```text
SUPABASE_SERVICE_ROLE_KEY
Secretos de backend
Contraseñas
Tokens privados
Credenciales administrativas
API keys privadas
```

La clave `anon` / publishable utilizada por un cliente Supabase es distinta de una clave administrativa, pero la documentación pública utiliza valores genéricos para evitar acoplar el repositorio a un entorno concreto.

---

# 🟢 Estado del proyecto

**En desarrollo activo y uso operativo.**

Actualmente la plataforma cubre distintas áreas de operación:

- trabajos;
- mantenimiento;
- trabajadores;
- grupos;
- vehículos;
- choferes;
- combustible;
- recorridos;
- planta;
- reportes;
- costos;
- administración.

El proyecto continúa evolucionando principalmente en:

- estabilidad;
- rendimiento;
- experiencia de usuario;
- seguridad;
- reportes;
- automatización;
- mantenimiento;
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
