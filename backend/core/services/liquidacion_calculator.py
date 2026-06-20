# backend/core/services/liquidacion_calculator.py

from decimal import Decimal, ROUND_HALF_UP
from datetime import date
import calendar


def _dias_en_mes(año: int, mes: int) -> int:
    return calendar.monthrange(año, mes)[1]


def _factor_mes_parcial(año: int, mes: int, fecha_inicio: date, fecha_retiro: date) -> Decimal:
    """
    Retorna la fracción del mes que debe contabilizarse.
    Si el mes es completo (ni el primero ni el último parcial) → 1.
    Si el mes coincide con el mes de ingreso o retiro → días reales / días del mes.
    """
    dias_mes = _dias_en_mes(año, mes)
    primer_dia = 1
    ultimo_dia = dias_mes

    # Ajustar por fecha de ingreso
    if año == fecha_inicio.year and mes == fecha_inicio.month:
        primer_dia = fecha_inicio.day

    # Ajustar por fecha de retiro
    if año == fecha_retiro.year and mes == fecha_retiro.month:
        ultimo_dia = fecha_retiro.day

    dias_a_contar = ultimo_dia - primer_dia + 1
    return Decimal(dias_a_contar) / Decimal(dias_mes)


def calcular_liquidacion(trabajador, fecha_retiro: date) -> dict:
    """
    Calcula la liquidación de contrato de un trabajador a la fecha de retiro.

    Fuente de datos: ProvisionPrestaciones mensuales ya calculadas al liquidar PILA.
    Los meses parciales (primero y último del período) se pro-ratean por días.

    Devuelve un dict con todos los componentes y el total.
    """
    from ..models import ProvisionPrestaciones, Nomina

    fecha_ingreso = trabajador.fecha_ingreso

    provisiones = ProvisionPrestaciones.objects.filter(
        trabajador=trabajador,
    ).exclude(
        año__lt=fecha_ingreso.year,
    ).exclude(
        año=fecha_ingreso.year,
        mes__lt=fecha_ingreso.month,
    ).exclude(
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
        factor = _factor_mes_parcial(p.año, p.mes, fecha_ingreso, fecha_retiro)
        total_cesantias    += (p.cesantias * factor).quantize(Decimal('0.01'), ROUND_HALF_UP)
        total_intereses    += (p.intereses_cesantias * factor).quantize(Decimal('0.01'), ROUND_HALF_UP)
        total_prima        += (p.prima * factor).quantize(Decimal('0.01'), ROUND_HALF_UP)
        total_vacaciones   += (p.vacaciones * factor).quantize(Decimal('0.01'), ROUND_HALF_UP)
        total_salario_base += (p.salario_base * factor).quantize(Decimal('0.01'), ROUND_HALF_UP)
        meses_con_datos.append({'mes': p.mes, 'año': p.año, 'salario_base': float(p.salario_base * factor)})

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
