# AgromaxApp - Arquitectura del Sistema

## Descripción General

AgromaxApp es un sistema de gestión de nómina para trabajadores agrícolas (específicamente para plantaciones de banano). El sistema maneja el registro de labores, cálculo de nómina, préstamos, y administración de trabajadores.

## Stack Tecnológico

### Backend
- **Framework**: Django 5.1.4 + Django REST Framework
- **Base de datos**: PostgreSQL (producción) / SQLite (desarrollo)
- **Autenticación**: JWT (django-rest-framework-simplejwt)
- **Despliegue**: Render (Free Tier)

### Frontend
- **Framework**: React 19.2 con Vite
- **Estilos**: Tailwind CSS
- **Enrutamiento**: React Router DOM
- **HTTP Client**: Axios
- **Notificaciones**: React Hot Toast
- **Despliegue**: Vercel (planeado)

## Estructura del Proyecto

```
AgromaxApp/
├── backend/
│   ├── config/              # Configuración Django
│   ├── core/                # Aplicación principal
│   │   ├── models/          # Modelos organizados por dominio
│   │   │   ├── __init__.py
│   │   │   ├── hr.py        # Recursos humanos
│   │   │   ├── farm.py      # Fincas y lotes
│   │   │   ├── labor.py     # Labores y registros
│   │   │   ├── payroll.py   # Nómina
│   │   │   ├── loans.py     # Préstamos
│   │   │   └── audit.py     # Auditoría
│   │   ├── services/        # Lógica de negocio
│   │   ├── views.py         # API endpoints
│   │   ├── serializers.py   # Serialización DRF
│   │   ├── admin.py         # Admin Django
│   │   └── urls.py          # Rutas
│   └── manage.py
└── frontend/
    ├── src/
    │   ├── pages/           # Componentes de página
    │   ├── components/      # Componentes reutilizables
    │   ├── contexts/        # Context API (Auth)
    │   ├── services/        # API clients
    │   └── App.jsx
    └── package.json
```

## Arquitectura de Modelos

### Reorganización Reciente (Diciembre 2024)

El archivo monolítico `models.py` fue reorganizado en módulos por dominio para mejorar mantenibilidad. Esta reorganización es **puramente estructural** - no requiere migraciones de base de datos.

### Dominios del Sistema

#### 1. **HR (Recursos Humanos)** - `models/hr.py`
- `Rol`: Roles del sistema (Super Admin, Digitador, Solo Lectura)
- `Usuario`: Usuario personalizado que extiende AbstractUser
- `TipoContrato`: Tipo de contrato (Con Contrato / Sin Contrato)
- `Trabajador`: Información completa de trabajadores

**Relaciones clave:**
- Usuario → Rol (ForeignKey)
- Trabajador → TipoContrato (ForeignKey)
- Trabajador → Finca (ForeignKey)

#### 2. **Farm (Fincas)** - `models/farm.py`
- `Finca`: Fincas donde trabajan los empleados
- `Lote`: Lotes que pertenecen a cada finca

**Relaciones clave:**
- Lote → Finca (ForeignKey, CASCADE)

#### 3. **Labor (Labores)** - `models/labor.py`
- `UnidadMedida`: Unidades para medir labores (Día, Unidad, Hectárea, Metro)
- `Labor`: Catálogo de labores (84+ tipos de labores agrícolas)
- `ListaPrecios`: Histórico de precios de labores con vigencias
- `Quincena`: Períodos de nómina (1-15, 16-fin de mes)
- `RegistroLabor`: Registro diario de labores por trabajador

**Relaciones clave:**
- Labor → UnidadMedida (ForeignKey)
- ListaPrecios → Labor (ForeignKey)
- RegistroLabor → Trabajador, Labor, Quincena (ForeignKeys)

**Validaciones especiales:**
- No se pueden registrar labores en domingo
- Solo puede haber una labor por día por trabajador (excepción: "Control" puede coexistir)

#### 4. **Payroll (Nómina)** - `models/payroll.py`
- `VariablesNomina`: Valores que cambian anualmente (salario mínimo, auxilio transporte, porcentajes)
- `Nomina`: Cálculo de nómina por trabajador por quincena
- `DetalleNomina`: Desglose de conceptos (devengos y deducciones)

**Relaciones clave:**
- Nomina → Trabajador, Quincena (ForeignKeys)
- DetalleNomina → Nomina, Labor (ForeignKeys)

**Estados de nómina:**
- BORRADOR → CALCULADA → APROBADA → PAGADA

#### 5. **Loans (Préstamos)** - `models/loans.py`
- `Prestamo`: Préstamos otorgados a trabajadores
- `CuotaPrestamo`: Cuotas de cada préstamo

**Relaciones clave:**
- Prestamo → Trabajador (ForeignKey)
- CuotaPrestamo → Prestamo, Quincena, Nomina (ForeignKeys)

**Tipos de pago:**
- UNICO: Pago único
- CUOTAS: Pago en cuotas

#### 6. **Audit (Auditoría)** - `models/audit.py`
- `AuditoriaLog`: Registro de todas las acciones importantes

**Acciones registradas:**
- CREATE, UPDATE, DELETE, VIEW_SENSITIVE

## Flujo de Trabajo Principal

### 1. Gestión de Trabajadores
1. Crear trabajador con tipo de contrato
2. Asignar a una finca
3. Puede ser administrativo (salario fijo) o por labores

### 2. Registro de Labores
1. Crear/abrir quincena
2. Registrar labores diarias por trabajador
3. Validaciones automáticas (no domingos, fechas dentro de quincena)

### 3. Cálculo de Nómina
1. Calcular nómina para quincena (servicio `NominaCalculator`)
2. Devengos: labores + dominicales + festivos + auxilio transporte + administrativos
3. Deducciones: salud + pensión + préstamos + ajustes manuales
4. Estados: Borrador → Calculada → Aprobada → Pagada

### 4. Gestión de Préstamos
1. Crear préstamo (único o cuotas)
2. Descuento automático en nómina
3. Actualización de saldo pendiente

## Servicios de Negocio

### `NominaCalculator`
Servicio central para cálculo de nómina con las siguientes responsabilidades:
- Obtener variables vigentes (salario mínimo, auxilio, porcentajes)
- Calcular devengos por labores
- Calcular devengos para administrativos
- Calcular dominicales y festivos
- Calcular deducciones (salud, pensión)
- Descontar préstamos
- Generar detalles de nómina

## Seguridad

### Autenticación
- JWT tokens (access + refresh)
- Tokens almacenados en localStorage
- Auto-refresh en interceptor de Axios
- Logout automático si refresh falla

### Autorización
- Sistema de roles: Super Admin, Digitador, Solo Lectura
- Permisos configurables vía JSON en modelo Rol
- Protección de rutas en frontend (ProtectedRoute)

### Auditoría
- Log de todas las operaciones importantes
- Registro de IP, usuario, acción, datos anteriores/nuevos
- Índices para consultas eficientes

## CORS y CSRF

### Configuración Actual
- **CORS**: Configurado para permitir frontend en localhost y Vercel
- **CSRF**: Deshabilitado para API JWT (JWT maneja autenticación)
- **Cookies**: Seguras en producción, SameSite=None

### Variables de Entorno Necesarias
```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://tu-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=http://localhost:5173,https://tu-frontend.vercel.app
```

## Optimizaciones

### Backend
- **Cold Start Detection**: Mensaje al usuario en primera request (Render Free Tier)
- **Timeout**: 60 segundos para acomodar cold starts
- **Índices**: En AuditoriaLog para mejorar consultas

### Frontend
- **Lazy Loading**: Componentes cargados bajo demanda
- **React.memo**: Prevenir re-renders innecesarios
- **Debouncing**: En búsquedas y filtros

## Planes Futuros

### Fase 1: Reorganización Interna (COMPLETADO ✅)
- ✅ Reorganizar `core/models/` por dominio
- ⏳ Reorganizar `core/views.py` (pendiente)
- ⏳ Reorganizar `core/serializers.py` (pendiente)

### Fase 2: Nuevos Módulos (Futuro)
Cuando el sistema crezca, se crearán apps Django separadas para:

#### App: `contracts` (Contratos)
- Gestión formal de contratos laborales
- Renovaciones y terminaciones
- Historial de contratos por trabajador

#### App: `benefits` (Prestaciones Sociales)
- Cesantías
- Primas
- Vacaciones
- Cálculos de liquidación

#### App: `inventory` (Inventario)
- Herramientas
- Insumos agrícolas
- Control de stock
- Asignación a trabajadores/fincas

#### App: `production` (Control de Producción)
- Seguimiento de cosechas
- Rendimiento por lote
- Métricas de producción
- Reportes de productividad

## Estrategia de Modularización

### Cuándo crear nueva app Django:
- ✅ Dominio completamente diferente (ej: inventory, production)
- ✅ Tablas independientes con pocas relaciones al core
- ✅ Funcionalidad que podría ser un producto separado

### Cuándo mantener en core:
- ✅ Fuertemente acoplado a nómina/trabajadores
- ✅ Requiere muchas ForeignKeys a modelos core
- ✅ Parte esencial del flujo de nómina

## Deployment

### Backend (Render)
- Auto-deploy desde GitHub (branch: main)
- Build command: `./build.sh`
- Start command: `gunicorn config.wsgi:application`
- Environment: Python 3.12+

### Frontend (Vercel - Planeado)
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing: Configurado en `vercel.json`

## Convenciones de Código

### Python (Backend)
- PEP 8
- Docstrings en español para modelos y servicios
- Type hints donde sea posible

### JavaScript (Frontend)
- ESLint + Prettier
- Functional components con hooks
- PropTypes o TypeScript (futuro)

## Base de Datos

### Tablas Existentes
- `usuarios` (Usuario via AbstractUser)
- `trabajadores`
- `fincas`
- `lotes`
- `registros_labor`
- Otros modelos usan nombres auto-generados por Django

### Migraciones
- **IMPORTANTE**: La reorganización de modelos NO requiere migraciones
- Todas las migraciones existentes permanecen válidas
- `models_backup.py` preservado por seguridad

## Notas Importantes

1. **NO hay cambios en base de datos** por reorganización de modelos
2. **Todos los imports existentes funcionan** gracias a `models/__init__.py`
3. **Backup disponible** en `core/models_backup.py`
4. **Cold starts en Render** pueden tomar 20-30 segundos (free tier)
5. **Filtros de finca** funcionan tanto para visualización como para exports

## Mantenimiento

### Agregar nuevo modelo
1. Determinar dominio apropiado (hr, farm, labor, payroll, loans, audit)
2. Agregar modelo en archivo correspondiente
3. Exportar en `models/__init__.py`
4. Crear migración: `python manage.py makemigrations`
5. Aplicar: `python manage.py migrate`

### Crear nueva funcionalidad
1. Modelo en `models/`
2. Serializer en `serializers.py`
3. View en `views.py`
4. URL en `urls.py`
5. Componente React en `frontend/src/pages/`
6. Ruta en `frontend/src/App.jsx`

---

**Última actualización**: Diciembre 23, 2024
**Versión**: 1.0
