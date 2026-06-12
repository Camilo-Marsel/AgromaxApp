# AgromaxApp — Backlog Formal

> **Versión:** 1.0  
> **Fecha:** 2026-06-12  
> **Producto:** AgromaxApp — Sistema de gestión operativa para fincas bananeras/ganaderas colombianas  
> **Stack:** Django REST Framework · React · PostgreSQL (Supabase) · Render · Vercel  
> **Modelo de negocio:** Licencia de uso por empresa. Infraestructura en plan free (Render + Vercel + Supabase).

---

## Contexto del negocio

La empresa opera múltiples fincas con cultivos de banano/plátano y actividades ganaderas. Paga a sus trabajadores por quincena según las labores realizadas cada día, siguiendo la ley laboral colombiana. El sistema reemplaza registros manuales en Excel y garantiza el cálculo correcto de nómina, PILA y prestaciones sociales.

**Usuarios del sistema:**

| Rol | Responsabilidad |
|-----|----------------|
| Administrador | Configuración, nómina, contratos, reportes, inventario |
| Supervisor | Registro diario de labores por finca |
| Consulta | Solo lectura de reportes |

---

## Estado de módulos

| Módulo | Estado | Epic |
|--------|--------|------|
| Gestión de personal y contratos | ✅ Completo | E1 |
| Registro diario de labores | ✅ Completo | E2 |
| Cálculo y pago de nómina | ✅ Completo | E3 |
| Adelantos de nómina | ✅ Completo | E4 |
| Obligaciones laborales (PILA + Prestaciones) | ✅ Completo | E5 |
| Inventario por finca | ⚠️ En desarrollo | E6 |
| Dashboard e indicadores | ⚠️ Parcial | E7 |
| Estimados de producción de banano | ❌ Pendiente | E8 |
| Sugerencias agronómicas | ❌ Pendiente | E9 |

---

## EPIC 1 — Gestión de Personal y Contratos

> **Objetivo:** Mantener el registro completo de cada trabajador, su vínculo laboral y los documentos asociados.

### HU-1.1 — Registrar trabajador
**Como** administrador  
**Quiero** registrar un nuevo trabajador con su información personal, tipo de contrato y finca asignada  
**Para** tenerlo disponible en el sistema de registro de labores y nómina

**Criterios de aceptación:**
- Se registran: nombre, apellidos, documento, fecha nacimiento, teléfono, correo, EPS, ARL, tipo contrato, finca, fecha ingreso
- El número de documento es único en el sistema
- El trabajador queda en estado `activo` al crearse
- Se puede asignar a una finca específica o dejarlo sin finca

**Estado:** ✅ Implementado

---

### HU-1.2 — Generar contrato en PDF
**Como** administrador  
**Quiero** generar el contrato de trabajo en PDF con los datos del trabajador y la empresa  
**Para** tener el documento legal para firma

**Criterios de aceptación:**
- El PDF incluye: razón social, NIT, datos del trabajador, tipo de contrato, cargo, salario, fecha inicio/fin
- Los datos de empresa se toman de `ConfiguracionEmpresa`
- El contrato generado puede descargarse directamente

**Estado:** ✅ Implementado  
**Pendiente:** Firma digital del trabajador

---

### HU-1.3 — Retirar trabajador
**Como** administrador  
**Quiero** registrar el retiro de un trabajador con fecha y causal  
**Para** que no aparezca en futuros cálculos de nómina

**Criterios de aceptación:**
- Se registra: fecha de retiro y motivo (renuncia / despido / mutuo acuerdo / terminación contrato)
- El trabajador pasa a estado `retirado`
- Sus registros históricos se conservan
- No aparece en listado activo por defecto

**Estado:** ✅ Implementado

---

### HU-1.4 — Ver historial completo del trabajador
**Como** administrador  
**Quiero** ver el historial laboral de un trabajador (nóminas, labores, adelantos, contratos)  
**Para** tener trazabilidad completa de su paso por la empresa

**Estado:** ✅ Implementado (vista de detalle)

---

### HU-1.5 — Gestionar documentos de contrato
**Como** administrador  
**Quiero** adjuntar documentos al contrato (otrosíes, anexos, actas)  
**Para** centralizar toda la documentación legal del trabajador

**Estado:** ✅ Implementado

---

### HU-1.6 — Alerta de contratos por vencer *(pendiente)*
**Como** administrador  
**Quiero** recibir una alerta cuando un contrato a término fijo esté próximo a vencer (30 días antes)  
**Para** tomar acción a tiempo (renovar, terminar o convertir a indefinido)

**Criterios de aceptación:**
- La alerta aparece en el dashboard
- Se muestra el nombre del trabajador, fecha de vencimiento y días restantes
- Se puede marcar como "atendida"

**Estado:** ❌ Pendiente

---

### HU-1.7 — Liquidación de contrato *(pendiente)*
**Como** administrador  
**Quiero** calcular la liquidación de un trabajador al momento de su retiro  
**Para** saber exactamente qué pagarle por cesantías, prima y vacaciones pendientes

**Criterios de aceptación:**
- Calcula: cesantías acumuladas, intereses, prima proporcional, vacaciones pendientes
- Toma como base el historial de nóminas del trabajador
- Genera PDF de liquidación

**Estado:** ❌ Pendiente

---

### Escenarios de prueba — Epic 1

```gherkin
Feature: Gestión de trabajadores

  Scenario: Registrar trabajador nuevo exitosamente
    Given el administrador está autenticado
    When envía POST /api/trabajadores/ con datos válidos
    Then responde 201 Created
    And el trabajador aparece en GET /api/trabajadores/ con estado "activo"

  Scenario: Documento duplicado es rechazado
    Given existe un trabajador con cedula "12345678"
    When se intenta crear otro trabajador con la misma cedula
    Then responde 400 Bad Request
    And el mensaje indica que el documento ya existe

  Scenario: Retirar trabajador
    Given existe un trabajador activo con id=1
    When se envía POST /api/trabajadores/1/retirar/ con fecha y motivo
    Then responde 200 OK
    And el trabajador tiene estado "retirado"
    And no aparece en GET /api/trabajadores/ sin filtro de retirados
```

---

## EPIC 2 — Registro Diario de Labores

> **Objetivo:** Registrar qué hizo cada trabajador cada día para poder calcular su pago quincenalmente.

### HU-2.1 — Registrar labor en un día
**Como** supervisor  
**Quiero** registrar la labor realizada por un trabajador en una fecha específica  
**Para** que quede contabilizado en su nómina

**Criterios de aceptación:**
- Se registra: trabajador, labor, fecha, quincena, cantidad
- La fecha debe estar dentro del rango de la quincena
- No se pueden registrar labores en domingo
- Máximo 1 labor "normal" por día; las labores adicionales (Control, Resiembra, Siembra Nueva, Amarre) se pueden agregar libremente
- Se pueden registrar labores en festivos colombianos

**Estado:** ✅ Implementado

---

### HU-2.2 — Registrar múltiples fechas a la vez
**Como** supervisor  
**Quiero** seleccionar varias fechas y registrar la misma labor para un trabajador en todas  
**Para** ahorrar tiempo cuando el trabajador hizo lo mismo varios días seguidos

**Criterios de aceptación:**
- El selector de fechas muestra el calendario de la quincena
- Los días festivos aparecen en morado (★) y son seleccionables
- Los domingos aparecen en rojo y no son seleccionables
- Los días con registro existente muestran un indicador (✓)
- Se pueden seleccionar hasta 13 días laborables

**Estado:** ✅ Implementado

---

### HU-2.3 — Ver y corregir historial de registros
**Como** supervisor  
**Quiero** ver todos los registros de labores de una quincena con filtros  
**Para** verificar y corregir errores antes del cierre

**Criterios de aceptación:**
- Se puede filtrar por: trabajador, finca, fecha, labor
- Se puede editar o eliminar un registro existente
- Los cambios quedan en auditoría

**Estado:** ✅ Implementado

---

### HU-2.4 — Registrar incapacidad o ausencia
**Como** supervisor  
**Quiero** registrar que un trabajador estuvo incapacitado o ausente un día  
**Para** que se refleje correctamente en la nómina

**Criterios de aceptación:**
- Se distingue entre: incapacidad médica, ausencia justificada, ausencia injustificada
- La incapacidad médica genera un devengo especial en nómina
- La ausencia injustificada genera una deducción

**Estado:** ✅ Implementado

---

### HU-2.5 — Registro masivo por lote *(pendiente)*
**Como** supervisor  
**Quiero** registrar la misma labor para todos los trabajadores de un lote en un día  
**Para** no tener que seleccionarlos uno a uno cuando trabajaron en grupo

**Criterios de aceptación:**
- Se selecciona: lote, fecha, labor
- El sistema lista los trabajadores activos asignados a ese lote
- Se pueden desmarcar individualmente antes de confirmar
- Se genera un registro por cada trabajador seleccionado

**Estado:** ❌ Pendiente

---

### Escenarios de prueba — Epic 2

```gherkin
Feature: Registro de labores

  Scenario: Registrar labor en día normal
    Given existe una quincena abierta para mayo 2026
    And existe un trabajador activo asignado a la quincena
    When se envía POST /api/registros-labor/ con fecha 2026-05-05 (lunes)
    Then responde 201 Created

  Scenario: No permitir labor en domingo
    When se envía POST /api/registros-labor/ con fecha 2026-05-10 (domingo)
    Then responde 400 Bad Request
    And el mensaje indica "No se pueden registrar labores en domingo"

  Scenario: Permitir labor en festivo colombiano
    Given el 2026-05-18 es festivo (Ascensión)
    When se envía POST /api/registros-labor/ con fecha 2026-05-18
    Then responde 201 Created

  Scenario: Registrar múltiples fechas
    When se envía POST /api/registros-labor/crear_multiples/ con fechas ["2026-05-05", "2026-05-06", "2026-05-07"]
    Then responde 201 Created
    And se crean 3 registros individuales

  Scenario: Rechazar segunda labor normal el mismo día
    Given el trabajador ya tiene "Día Básico" registrado el 2026-05-05
    When se intenta registrar "Chapeo" (labor normal) el mismo día
    Then responde 400 Bad Request

  Scenario: Permitir labor adicional sobre labor normal
    Given el trabajador ya tiene "Día Básico" registrado el 2026-05-05
    When se registra "Control" (labor adicional) el mismo día
    Then responde 201 Created
```

---

## EPIC 3 — Cálculo y Pago de Nómina

> **Objetivo:** Calcular automáticamente el pago correcto de cada trabajador aplicando todas las reglas de la ley colombiana.

### HU-3.1 — Calcular nómina de quincena completa
**Como** administrador  
**Quiero** calcular la nómina de todos los trabajadores de una quincena con un clic  
**Para** generar los valores a pagar sin cálculo manual

**Criterios de aceptación:**
- Calcula para todos los trabajadores activos de la quincena
- Aplica: labores, dominicales, festivos, auxilio de transporte, salud, pensión
- Distingue trabajadores CON_CONTRATO vs SIN_CONTRATO
- Los festivos del período se calculan automáticamente por calendario colombiano
- El resultado queda en estado `pendiente` para revisión antes de aprobar

**Estado:** ✅ Implementado

---

### HU-3.2 — Ver desglose detallado de nómina
**Como** administrador  
**Quiero** ver el desglose completo de devengos y deducciones de cada trabajador  
**Para** verificar que el cálculo es correcto antes de aprobar

**Criterios de aceptación:**
- Muestra: cada labor con cantidad, precio y subtotal
- Muestra: dominicales, festivos, auxilio de transporte
- Muestra: descuentos salud, pensión, adelantos
- Muestra: total devengado, total deducciones, neto a pagar

**Estado:** ✅ Implementado

---

### HU-3.3 — Aplicar deducciones y devengos manuales
**Como** administrador  
**Quiero** agregar un devengo o deducción manual a la nómina de un trabajador  
**Para** casos especiales como bonificaciones o descuentos puntuales

**Criterios de aceptación:**
- Se puede agregar monto y descripción para devengo adicional
- Se puede agregar monto y descripción para deducción adicional
- **La descripción es obligatoria** — sin descripción el ajuste no se aplica
- El ajuste aparece como línea separada en el desglose

**Estado:** ✅ Implementado  
**Nota:** El campo descripción es requerido — sin él el ajuste se ignora silenciosamente. Pendiente: validación explícita en UI.

---

### HU-3.4 — Generar comprobante de pago en PDF
**Como** administrador  
**Quiero** generar el comprobante de pago de cada trabajador  
**Para** entregárselo como soporte de su pago

**Estado:** ✅ Implementado

---

### HU-3.5 — Exportar nómina a Excel
**Como** administrador  
**Quiero** exportar la nómina completa a Excel  
**Para** hacer el pago masivo desde el banco

**Estado:** ✅ Implementado  
**Pendiente:** Archivo plano en formato ACH/CSV específico del banco para pago masivo automático

---

### HU-3.6 — Archivo plano para pago bancario *(pendiente)*
**Como** administrador  
**Quiero** generar un archivo en el formato que acepta mi banco  
**Para** cargar el pago de nómina sin digitar cada trabajador manualmente

**Criterios de aceptación:**
- Formato configurable por banco (Bancolombia, Davivienda, etc.)
- Incluye: número de cuenta, banco, tipo de cuenta, valor neto
- Se puede descargar el archivo y cargarlo directamente al portal bancario

**Estado:** ❌ Pendiente

---

### HU-3.7 — Enviar comprobante por WhatsApp/email *(pendiente)*
**Como** administrador  
**Quiero** enviar el comprobante de pago directamente al trabajador  
**Para** no tener que imprimirlo ni entregarlo en mano

**Estado:** ❌ Pendiente

---

### Escenarios de prueba — Epic 3

```gherkin
Feature: Cálculo de nómina

  Scenario: Calcular nómina quincena con festivo
    Given la quincena 2026-Q1-mayo tiene el festivo 2026-05-18 (Ascensión)
    And el trabajador CON_CONTRATO tiene 10 días de "Día Básico" registrados
    When se calcula la nómina
    Then el total devengado incluye 10 días básico + 1 festivo
    And el detalle muestra una línea "FESTIVO" con cantidad=1

  Scenario: Trabajador SIN_CONTRATO no tiene descuento de salud/pensión
    Given un trabajador con tipo_contrato=SIN_CONTRATO
    When se calcula su nómina
    Then no existen líneas de deducción SALUD ni PENSION en su detalle

  Scenario: Descuento de adelanto en nómina
    Given el trabajador tiene un adelanto activo con cuota=$50.000
    When se calcula la nómina de la quincena
    Then el detalle tiene una línea PRESTAMO con valor=50000
    And la cuota queda en estado "descontada"

  Scenario: Deducción adicional sin descripción no se aplica
    Given una nómina calculada
    When se agrega deducciones_adicionales=30000 sin descripcion
    And se recalcula
    Then el total deducciones no incluye los 30000

  Scenario: Deducción adicional con descripción sí se aplica
    Given una nómina calculada
    When se agrega deducciones_adicionales=30000 con descripcion="Daño herramienta"
    And se recalcula
    Then el detalle muestra una línea DEDUCCION_ADICIONAL con valor=30000
```

---

## EPIC 4 — Adelantos de Nómina

> **Objetivo:** Gestionar préstamos internos a trabajadores con descuento automático en quincenas.

### HU-4.1 — Registrar adelanto
**Como** administrador  
**Quiero** registrar un adelanto de nómina a un trabajador  
**Para** descontarlo automáticamente en las siguientes quincenas

**Criterios de aceptación:**
- Se registra: monto, fecha, tipo de pago (único o en cuotas), número de cuotas
- Si es en cuotas, el valor por cuota se calcula automáticamente
- El adelanto queda en estado `activo`

**Estado:** ✅ Implementado

---

### HU-4.2 — Descuento automático en nómina
**Como** administrador  
**Quiero** que las cuotas del adelanto se descuenten automáticamente al calcular la nómina  
**Para** no tener que hacerlo manualmente cada quincena

**Criterios de aceptación:**
- En cada cálculo de nómina se busca la cuota pendiente más antigua del trabajador
- La cuota se descuenta del neto a pagar
- La cuota queda marcada como `descontada` con referencia a la nómina

**Estado:** ✅ Implementado

---

### HU-4.3 — Ver estado de adelanto
**Como** administrador  
**Quiero** ver el saldo pendiente y el historial de cuotas de cada adelanto  
**Para** saber cuánto le falta pagar al trabajador

**Estado:** ✅ Implementado

---

### Escenarios de prueba — Epic 4

```gherkin
Feature: Adelantos de nómina

  Scenario: Crear adelanto en cuotas
    When se envía POST /api/prestamos/ con monto=200000 y numero_cuotas=2
    Then responde 201 Created
    And se crean 2 cuotas de 100000 cada una en estado "pendiente"

  Scenario: Cuota descuentada en nómina
    Given el trabajador tiene una cuota pendiente de 100000
    When se calcula la nómina de la quincena
    Then el neto del trabajador es menor en 100000
    And la cuota queda en estado "descontada"

  Scenario: Adelanto pagado completo
    Given todas las cuotas de un adelanto están "descontadas"
    Then el adelanto queda en estado "pagado"
```

---

## EPIC 5 — Obligaciones Laborales

> **Objetivo:** Calcular y registrar los aportes a seguridad social (PILA) y las provisiones de prestaciones sociales.

### HU-5.1 — Calcular PILA mensual
**Como** administrador  
**Quiero** calcular la planilla de seguridad social del mes  
**Para** saber cuánto debo aportar por cada trabajador

**Criterios de aceptación:**
- Calcula aportes de: Salud (8.5%), Pensión (12%), ARL (1.044%), Caja (4%)
- Solo aplica a trabajadores CON_CONTRATO
- El IBC se calcula a partir del salario quincenal
- Genera PDF de planilla

**Estado:** ✅ Implementado  
**Pendiente:** Exportación en formato UNE para operadores (SOI, Mi Planilla, Aportes en Línea)

---

### HU-5.2 — Calcular provisiones de prestaciones
**Como** administrador  
**Quiero** calcular mensualmente las provisiones de cesantías, prima y vacaciones  
**Para** tener un control del pasivo laboral acumulado

**Criterios de aceptación:**
- Cesantías: 8.33% del salario
- Intereses cesantías: 1% del salario
- Prima: 8.33% del salario
- Vacaciones: 4.17% del salario
- Genera reporte consolidado por mes

**Estado:** ✅ Implementado

---

### HU-5.3 — Exportación PILA formato operador *(pendiente)*
**Como** administrador  
**Quiero** exportar la PILA en el formato aceptado por el operador de planilla  
**Para** no digitar los valores manualmente en el portal

**Estado:** ❌ Pendiente

---

---

## EPIC 6 — Inventario por Finca

> **Objetivo:** Controlar qué insumos hay en cada finca, qué se consume por lote y cuándo reponer.

### HU-6.1 — Catálogo de productos
**Como** administrador  
**Quiero** crear y gestionar el catálogo de insumos y materiales  
**Para** tener una lista estándar de productos que se usan en las fincas

**Criterios de aceptación:**
- Se registra: nombre, descripción, categoría, unidad de medida, stock mínimo
- Categorías: Agroquímicos, Materiales, Herramientas, Combustibles, Otros
- Un producto puede estar activo o inactivo

**Estado:** ✅ Implementado (modelo + API)  
**Pendiente:** UI completa en frontend

---

### HU-6.2 — Registrar entrada de insumos
**Como** bodeguero  
**Quiero** registrar cuando llegan insumos a una finca  
**Para** que el stock se actualice automáticamente

**Criterios de aceptación:**
- Se registra: producto, finca destino, cantidad, fecha, observaciones
- El stock de esa finca aumenta con la cantidad ingresada
- Se guarda un movimiento de tipo ENTRADA con stock_antes y stock_despues

**Estado:** ⚠️ Parcial (modelo + API, UI incompleta)

---

### HU-6.3 — Registrar salida de insumos por lote
**Como** bodeguero  
**Quiero** registrar el consumo de insumos indicando el lote donde se usaron  
**Para** poder hacer reportes de gasto por lote

**Criterios de aceptación:**
- Se registra: producto, finca, lote, cantidad, fecha, labor asociada (opcional)
- El stock de la finca disminuye
- El movimiento queda vinculado al lote
- No se puede sacar más de lo que hay en stock

**Estado:** ⚠️ Parcial — falta vínculo con lote y labor

---

### HU-6.4 — Alerta de stock bajo
**Como** administrador  
**Quiero** ver una alerta cuando el stock de un producto baje del mínimo  
**Para** hacer el pedido a tiempo

**Criterios de aceptación:**
- El dashboard muestra productos con stock_actual <= stock_minimo
- La alerta indica: producto, finca, stock actual, stock mínimo

**Estado:** ⚠️ Parcial — el campo existe, falta la alerta en dashboard

---

### HU-6.5 — Reporte de gasto por lote/quincena
**Como** administrador  
**Quiero** ver cuánto de cada insumo se gastó en cada lote durante una quincena  
**Para** analizar costos de producción por lote

**Criterios de aceptación:**
- Filtros: finca, lote, producto, período
- Muestra: producto, unidad, cantidad total consumida, costo estimado
- Exportable a Excel

**Estado:** ❌ Pendiente

---

### HU-6.6 — Historial de movimientos
**Como** administrador  
**Quiero** ver todos los movimientos de un producto en una finca  
**Para** tener trazabilidad completa

**Estado:** ⚠️ Parcial (API existe, UI incompleta)

---

### Escenarios de prueba — Epic 6

```gherkin
Feature: Inventario por finca

  Scenario: Registrar entrada aumenta stock
    Given el producto "Abono NPK" tiene stock_actual=50 en Finca La Esperanza
    When se registra una ENTRADA de 20 unidades
    Then el stock_actual queda en 70
    And el movimiento queda registrado con stock_antes=50 y stock_despues=70

  Scenario: Registrar salida disminuye stock
    Given el producto "Abono NPK" tiene stock_actual=70
    When se registra una SALIDA de 10 unidades para el Lote 3
    Then el stock_actual queda en 60

  Scenario: No se puede sacar más de lo disponible
    Given stock_actual=5
    When se intenta registrar una SALIDA de 10 unidades
    Then responde 400 Bad Request
    And el mensaje indica "Stock insuficiente"

  Scenario: Alerta de stock bajo
    Given stock_minimo=20 y stock_actual=15
    Then el producto aparece en GET /api/inventario/stocks/?stock_bajo=true
```

---

## EPIC 7 — Dashboard e Indicadores

> **Objetivo:** Dar una vista rápida del estado operativo de la empresa al entrar al sistema.

### HU-7.1 — Dashboard principal
**Como** administrador  
**Quiero** ver los indicadores más importantes al entrar al sistema  
**Para** tener un panorama rápido sin navegar por cada módulo

**Criterios de aceptación:**
- Muestra: número de trabajadores activos por finca
- Muestra: estado de la quincena actual (abierta / en cálculo / pagada)
- Muestra: nómina total del último período
- Muestra: adelantos activos pendientes de cobro
- Muestra: productos con stock bajo (si los hay)
- Muestra: contratos por vencer en los próximos 30 días

**Estado:** ⚠️ Parcial — existe la página pero sin indicadores completos

---

### HU-7.2 — Auditoría de cambios *(pendiente)*
**Como** administrador  
**Quiero** ver quién hizo qué cambio y cuándo en el sistema  
**Para** detectar errores o usos indebidos

**Criterios de aceptación:**
- Registra: usuario, acción, módulo, fecha y hora, datos antes/después
- Se puede filtrar por usuario, módulo y período

**Estado:** ⚠️ Parcial — el modelo `AuditoriaLog` existe pero no hay UI

---

---

## EPIC 8 — Estimados y Control de Producción de Banano *(futura)*

> **Objetivo:** Proyectar la producción de banano por lote usando conteo de cintas y comparar con la producción real.

### HU-8.1 — Registro de conteo de cintas
**Como** supervisor  
**Quiero** registrar el conteo de cintas por mata en cada lote  
**Para** estimar cuántas cajas de banano saldrán en las próximas semanas

**Estado:** ❌ Pendiente — requiere diseño de modelo de datos

---

### HU-8.2 — Registro de producción real
**Como** supervisor  
**Quiero** registrar cuántas cajas/racimos salieron realmente de cada lote  
**Para** compararlo con el estimado y medir precisión

**Estado:** ❌ Pendiente

---

### HU-8.3 — Reporte estimado vs real por lote
**Como** administrador  
**Quiero** ver la serie histórica de producción estimada vs real por lote  
**Para** identificar lotes de bajo rendimiento

**Estado:** ❌ Pendiente

---

---

## EPIC 9 — Sugerencias Agronómicas *(futura)*

> **Objetivo:** Usar el historial de labores e insumos para sugerir cuándo hacer labores críticas en cada lote.

### HU-9.1 — Historial de labores por lote
**Como** administrador  
**Quiero** ver con qué frecuencia se ha abonado, fumigado o hecho labores críticas en cada lote  
**Para** tomar decisiones informadas

**Estado:** ❌ Pendiente — requiere EPIC 6 completa

---

### HU-9.2 — Alerta de labor vencida en lote
**Como** administrador  
**Quiero** recibir una alerta cuando un lote lleva más de X semanas sin una labor crítica  
**Para** no olvidar actividades importantes del cultivo

**Estado:** ❌ Pendiente

---

### HU-9.3 — Costo por hectárea por lote
**Como** administrador  
**Quiero** ver el costo total (mano de obra + insumos) por hectárea de cada lote  
**Para** comparar eficiencia entre lotes y fincas

**Estado:** ❌ Pendiente — requiere EPIC 6 y EPIC 2 completas

---

---

## Deuda técnica y mejoras transversales

| ID | Descripción | Prioridad | Estado |
|----|-------------|-----------|--------|
| DT-1 | Validación explícita en UI cuando falta descripción en ajuste manual de nómina | 🟡 Media | ❌ Pendiente |
| DT-2 | Archivo plano bancario para pago masivo | 🔴 Alta | ❌ Pendiente |
| DT-3 | Exportación PILA en formato UNE | 🟡 Media | ❌ Pendiente |
| DT-4 | Envío de comprobante por email/WhatsApp | 🟡 Media | ❌ Pendiente |
| DT-5 | Entorno de staging (rama develop + deploy separado) | 🟡 Media | ❌ Pendiente |
| DT-6 | `.env.example` documentado | 🟢 Baja | ❌ Pendiente |
| DT-7 | Firma digital en contratos | 🟢 Baja | ❌ Pendiente |
| DT-8 | Registro masivo de labores por lote | 🟡 Media | ❌ Pendiente |
| DT-9 | Liquidación de contrato con cálculo de prestaciones | 🔴 Alta | ❌ Pendiente |
| DT-10 | Límite configurable de adelantos por trabajador | 🟢 Baja | ❌ Pendiente |

---

## Hoja de ruta sugerida

### Fase actual — Completar MVP operativo
1. ✅ Sistema de nómina colombiana completo
2. ⬜ Completar módulo de inventario (EPIC 6 — HU-6.2, 6.3, 6.5)
3. ⬜ Dashboard con indicadores reales (EPIC 7 — HU-7.1)
4. ⬜ Liquidación de contrato (DT-9)
5. ⬜ Archivo plano bancario (DT-2)

### Fase 2 — Inteligencia operativa
6. ⬜ Estimados de producción de banano (EPIC 8)
7. ⬜ Historial y costo por lote (EPIC 9 parcial)
8. ⬜ Alertas automáticas (contratos, stock, labores)

### Fase 3 — Escalabilidad y venta
9. ⬜ Sugerencias agronómicas (EPIC 9 completa)
10. ⬜ Multi-tenant (si se expande a más clientes)
11. ⬜ App móvil para supervisores (registro de labores offline)

---

## Cobertura de pruebas objetivo

| Módulo | Pruebas unitarias | Pruebas integración | Pruebas E2E (Karate) |
|--------|:-----------------:|:-------------------:|:--------------------:|
| Festivos colombianos | ✅ | — | — |
| Calculadora nómina | ⬜ | ⬜ | ⬜ |
| Trabajadores | — | ⬜ | ⬜ |
| Registro labores | — | ⬜ | ✅ (escenarios definidos) |
| Nómina completa | — | ⬜ | ✅ (escenarios definidos) |
| Adelantos | — | ⬜ | ✅ (escenarios definidos) |
| Inventario | — | ⬜ | ✅ (escenarios definidos) |
| PILA | — | ⬜ | ⬜ |
| Contratos | — | ⬜ | ⬜ |

---

*Documento generado el 2026-06-12. Actualizar con cada sprint o módulo completado.*
