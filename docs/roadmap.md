# AgromaxApp — Roadmap y Estado del Proyecto

> **Actualizado:** 2026-06-18  
> **Estado general:** MVP funcional en producción. Nómina colombiana completa, producción de banano implementada, inventario parcial, pruebas pendientes.

---

## Resumen ejecutivo

El sistema reemplaza Excel para la gestión operativa de fincas bananeras: nómina quincenal colombiana, registro de labores, contratos, adelantos, PILA, prestaciones, inventario de insumos y control de producción de banano. Está desplegado en Render (backend Django) + Vercel (frontend React).

| Rol | Descripción |
|-----|-------------|
| Administrador | Nómina, configuración, reportes, usuarios |
| Supervisor | Registro diario de labores, producción |
| Consulta | Solo lectura |

---

## Estado actual de módulos

| Módulo | Estado | Notas |
|--------|--------|-------|
| Gestión de personal y contratos | ✅ Completo | Falta liquidación y alerta vencimiento |
| Registro diario de labores | ✅ Completo | Falta registro masivo por lote |
| Cálculo y pago de nómina | ✅ Completo | Falta archivo bancario y WhatsApp |
| Adelantos de nómina | ✅ Completo | — |
| Obligaciones laborales (PILA + Prestaciones) | ✅ Completo | Falta exportación formato UNE |
| Producción de banano (Matas Caídas + Embarques) | ✅ Completo | Implementado en jun-2026 |
| Reportes de producción | ✅ Completo | Gráficos históricos por finca/lote |
| Inventario por finca | ⚠️ Parcial | Modelo y API listos, UI incompleta |
| Dashboard e indicadores | ✅ Completo | KPIs reales, filtrado por finca según rol |
| Auditoría de cambios | ⚠️ Parcial | Modelo existe, sin UI |
| Sugerencias agronómicas | ❌ Pendiente | Fase futura |

---

## Lo que se hizo en la última sesión (jun-2026)

- ✅ Módulo completo de Matas Caídas y Embarques (modelos, API, UI)
- ✅ Selector de semana ISO con color de cinta auto-sugerido (ciclo 10 colores)
- ✅ Reporte de producción con gráficos (ratio, cajas, cintas por semana)
- ✅ Umbrales de alerta de producción configurables en ConfiguracionEmpresa
- ✅ Sidebar con grupos colapsables y navegación móvil (drawer)
- ✅ Rutas corregidas (structure flat en App.jsx)
- ✅ Fixes responsive: scroll horizontal en tablas, botones nómina flex-wrap
- ✅ Bug "Enviar Correos" corregido: finca_ids como array, filtro `__in`
- ✅ Navbar muestra nombre completo en lugar de username
- ✅ Dashboard con KPIs reales (endpoint `/api/dashboard/resumen/`)
- ✅ Dashboard filtra por fincas asignadas al usuario (SUPERVISOR ve solo sus fincas)
- ✅ Tarjeta de contratos con scroll limitado (max-h) para no empujar accesos rápidos
- ✅ Modelo Lote extendido con campos técnicos topográficos (canales, cables, áreas)
- ✅ SQL de migración de lotes para Supabase (`docs/supabase_migration_0026_lotes.sql`)
- ✅ Embolse multi-fila con validación color+lote por día
- ✅ Horas Trabajadas libre sobre cualquier labor del día
- ✅ Número de cuenta visible para Supervisor (antes solo Admin)
- ✅ Botón Enviar Correos masivo habilitado correctamente (nominasFiltradas.length)
- ✅ Estado inicial correos masivos: APROBADA + CALCULADA

---

## Pendientes ordenados por prioridad

### 🔴 Alta prioridad — Antes de pruebas formales

#### ~~P1 — Dashboard con indicadores reales (HU-7.1)~~ ✅ Completo

---

#### P2 — Completar UI de inventario (HU-6.2, HU-6.3, HU-6.6)
**Qué falta:** El modelo `Stock`, `MovimientoInventario` y la API ya existen. Falta la interfaz para:
- Registrar entradas de insumos a una finca
- Registrar salidas por lote (con validación de stock suficiente)
- Ver historial de movimientos con filtros

**Estado actual del backend:** `POST /api/inventario/stocks/` y `GET /api/inventario/movimientos/` funcionan.  
**Cómo implementarlo:** Agregar formulario de entrada/salida en `ProductoDetail.jsx` o una nueva página `MovimientosPage.jsx`.

---

#### P3 — Alerta de stock bajo en dashboard (HU-6.4)
**Qué falta:** El campo `stock_minimo` existe en el modelo. Falta un endpoint que retorne los productos con `stock_actual <= stock_minimo` y mostrarlos en el dashboard.

**Cómo implementarlo:** Filtro en `StockViewSet` → `GET /api/inventario/stocks/?stock_bajo=true`. Card en dashboard.

---

#### P4 — Alerta de contratos por vencer (HU-1.6)
**Qué falta:** Endpoint que retorne contratos a término fijo con `fecha_fin` dentro de los próximos 30 días.  
**Cómo implementarlo:** Action en `ContratoViewSet` → `GET /api/contratos/por_vencer/`. Card en dashboard.

---

### 🟡 Media prioridad — Después de pruebas básicas

#### P5 — Liquidación de contrato (HU-1.7 / DT-9 🔴)
**Qué falta:** Cálculo de liquidación al momento del retiro:
- Cesantías acumuladas (no pagadas al fondo)
- Intereses sobre cesantías (12% anual del valor de cesantías)
- Prima proporcional al tiempo transcurrido desde el último pago
- Vacaciones pendientes (días no disfrutados)
- PDF de liquidación

**Cómo implementarlo:** Service `calcular_liquidacion(trabajador, fecha_retiro)` que consulta el historial de nóminas. Endpoint `POST /api/trabajadores/{id}/liquidacion/`. PDF con ReportLab.  
**Nota:** Consultar con contador la fórmula exacta de intereses (12% anual vs 1% mensual).

---

#### P6 — Registro masivo de labores por lote (HU-2.5 / DT-8)
**Qué falta:** Seleccionar lote + fecha + labor → listar todos los trabajadores activos de ese lote → marcar/desmarcar → registrar en bloque.  
**Cómo implementarlo:** Nueva sección en `RegistroLabores.jsx` con modo "masivo por lote". Reutiliza el endpoint `crear_multiples` ya existente.

---

#### P7 — Archivo plano bancario (HU-3.6 / DT-2 🔴)
**Qué falta:** Exportar la nómina aprobada en formato CSV/TXT compatible con Bancolombia o Davivienda para pago masivo.  
**Cómo implementarlo:** Action en `NominaViewSet` → `GET /api/nominas/exportar_archivo_plano/?quincena_id=X`. El formato varía por banco — necesita configurarse en `ConfiguracionEmpresa` (campo `banco` + `formato_plano`).

---

#### P8 — Reporte de gasto de insumos por lote/quincena (HU-6.5)
**Qué falta:** Vista de cuánto de cada insumo se usó por lote en un período dado, con costo estimado.  
**Cómo implementarlo:** Agregación sobre `MovimientoInventario` por `lote` y `fecha`. Nueva página `/reportes/inventario` o pestaña en `/inventario`.

---

### 🟢 Baja prioridad — Cuando el MVP esté estable

#### P9 — Exportación PILA formato UNE (HU-5.3 / DT-3)
Exportar la planilla PILA en el formato XML/CSV aceptado por los operadores (SOI, Mi Planilla, Aportes en Línea).

#### P10 — UI de auditoría (HU-7.2)
El modelo `AuditoriaLog` ya existe y registra cambios. Solo falta una página de consulta con filtros por usuario, módulo y fecha. Ruta sugerida: `/configuracion/auditoria` (solo admin).

#### P11 — Envío comprobante por WhatsApp (HU-3.7 / DT-4)
El email masivo ya funciona. WhatsApp requiere integración con Twilio o Meta Business API (costo mensual).

#### P12 — Validación explícita ajuste manual nómina sin descripción (DT-1)
Hoy el ajuste se ignora silenciosamente si no tiene descripción. Agregar validación en el frontend antes de guardar.

---

## Fase 4 — Pruebas (desglose)

La fase de pruebas se divide en cuatro partes que pueden ejecutarse en paralelo o en orden:

### F4.1 — Pruebas unitarias (backend Python)
**Herramienta:** `pytest` + `Django TestCase`  
**Cobertura objetivo:**

| Módulo | Qué probar |
|--------|-----------|
| `nomina_calculator.py` | Cálculo con festivos, dominicales, auxilio de transporte, SIN_CONTRATO vs CON_CONTRATO |
| Intereses cesantías | Fórmula correcta (12% anual prorateado, no 1% plano) |
| Cuotas de adelanto | Descuento correcto, estado "pagado" al terminar |
| Cálculo PILA | Porcentajes correctos por tipo de aportante |
| Color de cinta | `color_para_semana(24)` == NARANJA, ciclo de 10 correcto |
| Permisos por rol | Admin puede hacer X, Supervisor no puede hacer Y |

**Archivos a crear:**
- `backend/core/tests/test_nomina_calculator.py`
- `backend/core/tests/test_pila.py`
- `backend/core/tests/test_produccion.py`
- `backend/core/tests/test_permissions.py`

---

### F4.2 — Pruebas de integración (API REST)
**Herramienta:** `pytest` + `APIClient` de DRF  
**Escenarios prioritarios:**

| Escenario | Endpoint |
|-----------|----------|
| Registrar trabajador → aparece en nómina | `POST /api/trabajadores/` |
| Labor en domingo rechazada | `POST /api/registros-labor/` |
| Labor en festivo colombiano aceptada | `POST /api/registros-labor/` |
| Calcular nómina con adelanto activo → cuota descontada | `POST /api/nominas/calcular/` |
| Embarque: matas sin reportar disparan alerta | `GET /api/produccion/embarques/{id}/validacion/` |
| Stock insuficiente rechaza salida | `POST /api/inventario/movimientos/` |
| ConfiguracionEmpresa singleton (GET siempre 200) | `GET /api/configuracion-empresa/` |
| Enviar correos masivo: sin correos → 200 con ceros | `POST /api/nominas/enviar_recibos_masivo/` |

---

### F4.3 — Pruebas de aceptación E2E (Karate)
**Herramienta:** Karate DSL (carpeta `backend/test-karate/`)  
**Estado actual:** Solo hay escenarios de correo en `PruebasAceptacion.feature`. Hay que expandir.  

**Flujos completos a cubrir:**

1. **Flujo nómina completo:**  
   Login → crear quincena → registrar labores → calcular nómina → aprobar → exportar Excel

2. **Flujo adelanto:**  
   Crear adelanto 2 cuotas → calcular nómina quincena 1 → verificar cuota descontada → calcular quincena 2 → verificar estado "pagado"

3. **Flujo producción:**  
   Registrar embolse (RegistroLabor) → registrar matas caídas → registrar embarque → llamar `/validacion/` → verificar alertas

4. **Flujo inventario:**  
   Registrar entrada 50 unidades → registrar salida 60 unidades → verificar rechazo por stock insuficiente

5. **Flujo acceso por rol:**  
   Supervisor intenta acceder a nómina → debe ser redirigido  
   Consulta intenta crear registro → debe obtener 403

**Cómo ejecutar Karate:** Requiere Java + Maven o Gradle. Alternativa más simple: migrar los escenarios a `pytest` con `requests` si no hay entorno Java disponible.

---

### F4.4 — Pruebas manuales de UI (checklist)
Recorrer los flujos principales en el navegador antes de dar por cerrado el MVP:

- [ ] Login y logout en todos los roles
- [ ] Crear trabajador → asignar a finca → generar contrato PDF
- [ ] Registrar labores de 14 días → calcular nómina → ver desglose → aprobar → exportar Excel
- [ ] Crear adelanto → verificar descuento en nómina siguiente
- [ ] Calcular PILA de un mes → descargar PDF
- [ ] Registrar matas caídas → registrar embarque → ver reporte de producción
- [ ] Agregar insumo → registrar entrada → registrar salida → verificar stock
- [ ] Cambiar umbral de desviación en Configuración → verificar que alerta cambia
- [ ] Enviar correos masivos a nómina aprobada → verificar respuesta
- [ ] Verificar responsive en pantallas 768px y 1280px

---

## Deuda técnica pendiente

| ID | Descripción | Prioridad | Bloquea |
|----|-------------|-----------|---------|
| DT-1 | Validación en UI al guardar ajuste manual sin descripción | 🟡 Media | Nada |
| DT-2 | Archivo plano bancario para pagos masivos | 🔴 Alta | Adopción real |
| DT-3 | Exportación PILA en formato UNE | 🟡 Media | Ahorro de tiempo |
| DT-5 | Entorno staging (rama develop + deploy separado en Render) | 🟡 Media | Pruebas seguras |
| DT-6 | `.env.example` documentado | 🟢 Baja | Onboarding devs |
| DT-7 | Firma digital en contratos | 🟢 Baja | Nada |
| DT-8 | Registro masivo de labores por lote | 🟡 Media | Eficiencia supervisores |
| DT-9 | Liquidación de contrato con cálculo de prestaciones | 🔴 Alta | Proceso de retiro |
| DT-10 | Límite configurable de adelantos por trabajador | 🟢 Baja | Nada |
| DT-11 | Fórmula intereses cesantías: verificar 12% anual prorateado vs 1% mensual | 🔴 Alta | Corrección legal |
| DT-12 | JWT access token reducir de 1 día a 15 minutos | 🟡 Media | Seguridad |
| DT-13 | `recalcular` en NominaViewSet llama `calcular_trabajador()` dos veces | 🔴 Alta | Nómina incorrecta |

---

## Hoja de ruta sugerida

```
Hoy
 │
 ├── P1  Dashboard con indicadores reales        ✅ Completo
 ├── P2  UI inventario (entradas/salidas)
 ├── P3  Alerta stock bajo (dashboard)
 ├── P4  Alerta contratos por vencer (dashboard)
 │
 ├── F4.1  Pruebas unitarias backend             ← Fase 4 (puede ir en paralelo)
 ├── F4.2  Pruebas integración API
 ├── F4.3  Pruebas E2E Karate / pytest
 ├── F4.4  Checklist manual UI
 │
 ├── P5  Liquidación de contrato (DT-9)          ← después de pruebas básicas
 ├── P6  Registro masivo labores por lote
 ├── P7  Archivo plano bancario
 ├── P8  Reporte gastos inventario
 │
 └── P9-P12  Mejoras menores y deuda técnica
```

---

## Notas de contexto técnico

- **Encoding `ñ` en Python:** Usar variable `SEMANA_FIELD = 'semana_año'` en vez de string literal al escribir archivos por terminal (PowerShell/Bash corrompen el carácter).
- **ConfiguracionEmpresa:** Patrón singleton — siempre usar `get_config()`, nunca `objects.get(pk=1)`.
- **Migración en producción:** `build.sh` corre `python manage.py migrate` en cada deploy en Render. No usar `--fake`.
- **Email:** Se usa Resend API (SMTP bloqueado en Render). La clave `RESEND_API_KEY` debe estar en variables de entorno de Render, nunca en el repo.
- **Color de cinta:** Ciclo de 10 colores: Morada→Café→Negra→Naranja→Verde→Amarillo→Blanca→Azul→Habano→Gris. Fórmula: `(semana_iso - 1) % 10`.
- **Intereses cesantías:** Pendiente verificar con contador — el código actual aplica 1%, la ley dice 12% anual prorateado.

---

*Documento actualizado el 2026-06-14. Actualizar al iniciar cada sesión de trabajo.*
