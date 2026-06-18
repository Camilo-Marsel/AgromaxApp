# backend/core/services/liquidacion_calculator.py

from decimal import Decimal, ROUND_HALF_UP
from datetime import date


def calcular_liquidacion(trabajador, fecha_retiro: date) -> dict:
    """
    Calcula la liquidación de contrato de un trabajador a la fecha de retiro.

    Fuente de datos: ProvisionPrestaciones mensuales ya calculadas al liquidar PILA.
    Si hay meses sin provisión (trabajador sin labores ese mes) se consideran en cero.

    Devuelve un dict con todos los componentes y el total.
    """
    from ..models import ProvisionPrestaciones, Nomina

    fecha_ingreso = trabajador.fecha_ingreso

    provisiones = ProvisionPrestaciones.objects.filter(
        trabajador=trabajador,
    ).exclude(
        # Excluir meses anteriores al ingreso
        año__lt=fecha_ingreso.year,
    ).exclude(
        año=fecha_ingreso.year,
        mes__lt=fecha_ingreso.month,
    ).exclude(
        # Excluir meses posteriores al retiro
        año__gt=fecha_retiro.year,
    ).exclude(
        año=fecha_retiro.year,
        mes__gt=fecha_retiro.month,
    )

    total_cesantias       = Decimal('0.00')
    total_intereses       = Decimal('0.00')
    total_prima           = Decimal('0.00')
    total_vacaciones      = Decimal('0.00')
    total_salario_base    = Decimal('0.00')

    meses_con_datos = []
    for p in provisiones.order_by('año', 'mes'):
        total_cesantias    += p.cesantias
        total_intereses    += p.intereses_cesantias
        total_prima        += p.prima
        total_vacaciones   += p.vacaciones
        total_salario_base += p.salario_base
        meses_con_datos.append({'mes': p.mes, 'año': p.año, 'salario_base': float(p.salario_base)})

    # Si no hay provisiones calculadas, estimamos desde las nóminas aprobadas
    if not meses_con_datos:
        nominas = Nomina.objects.filter(
            trabajador=trabajador,
            estado='APROBADA',
        ).exclude(
            quincena__fecha_fin__lt=fecha_ingreso,
        ).exclude(
            quincena__fecha_inicio__gt=fecha_retiro,
        ).select_related('quincena')

        for n in nominas:
            total_salario_base += n.total_devengado

        # Calcular porcentajes manuales sobre la base acumulada
        total_cesantias  = (total_salario_base * Decimal('0.0833')).quantize(Decimal('0.01'), ROUND_HALF_UP)
        total_prima      = (total_salario_base * Decimal('0.0833')).quantize(Decimal('0.01'), ROUND_HALF_UP)
        total_vacaciones = (total_salario_base * Decimal('0.0417')).quantize(Decimal('0.01'), ROUND_HALF_UP)
        # Intereses: 12% anual de las cesantías, prorateado por días
        dias_trabajados = (fecha_retiro - fecha_ingreso).days
        total_intereses  = (total_cesantias * Decimal('0.12') * dias_trabajados / 365).quantize(Decimal('0.01'), ROUND_HALF_UP)

    total = (total_cesantias + total_intereses + total_prima + total_vacaciones).quantize(Decimal('0.01'), ROUND_HALF_UP)

    # Días trabajados en el período
    dias_trabajados = (fecha_retiro - fecha_ingreso).days

    return {
        'trabajador_id':    trabajador.id,
        'trabajador_nombre': trabajador.nombre_completo,
        'trabajador_cedula': trabajador.numero_documento,
        'finca':            trabajador.finca.nombre if trabajador.finca else '—',
        'fecha_ingreso':    fecha_ingreso,
        'fecha_retiro':     fecha_retiro,
        'dias_trabajados':  dias_trabajados,
        'meses_calculados': len(meses_con_datos),
        'fuente':           'provisiones' if meses_con_datos else 'nominas',
        'salario_base_total': float(total_salario_base),
        'cesantias':        float(total_cesantias),
        'intereses_cesantias': float(total_intereses),
        'prima':            float(total_prima),
        'vacaciones':       float(total_vacaciones),
        'total':            float(total),
    }
