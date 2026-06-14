# backend/core/views/dashboard.py

from datetime import date, timedelta
from decimal import Decimal

import logging
from django.db.models import Sum, Count, F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from ..models import (
    Trabajador, Finca, Quincena, Nomina, Prestamo,
    StockFinca, Contrato,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_resumen(request):
    try:
        return _dashboard_resumen_impl(request)
    except Exception as exc:
        logger.exception('Error en dashboard_resumen')
        from rest_framework import status
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _dashboard_resumen_impl(request):
    hoy = date.today()

    # 1. Trabajadores activos total y por finca
    trabajadores_qs = Trabajador.objects.filter(estado='CONTRATADO')
    total_trabajadores = trabajadores_qs.count()

    por_finca = list(
        trabajadores_qs
        .values('finca__id', 'finca__nombre')
        .annotate(total=Count('id'))
        .order_by('finca__nombre')
    )
    trabajadores_por_finca = [
        {
            'finca_id': f['finca__id'],
            'finca': f['finca__nombre'] or 'Sin finca',
            'total': f['total'],
        }
        for f in por_finca
    ]

    # 2. Quincena actual (la más reciente abierta, o la última si no hay abierta)
    quincena_actual = (
        Quincena.objects.filter(estado='ABIERTA').order_by('-fecha_inicio').first()
        or Quincena.objects.order_by('-fecha_inicio').first()
    )
    quincena_info = None
    if quincena_actual:
        nominas_q = Nomina.objects.filter(quincena=quincena_actual)
        quincena_info = {
            'id': quincena_actual.id,
            'nombre': str(quincena_actual),
            'estado': quincena_actual.estado,
            'fecha_inicio': quincena_actual.fecha_inicio,
            'fecha_fin': quincena_actual.fecha_fin,
            'total_nominas': nominas_q.count(),
            'nominas_aprobadas': nominas_q.filter(estado='APROBADA').count(),
            'nominas_pendientes': nominas_q.filter(estado='PENDIENTE').count(),
        }

    # 3. Total nómina del último período aprobado
    ultima_quincena_aprobada = (
        Quincena.objects.filter(
            nominas__estado='APROBADA'
        ).distinct().order_by('-fecha_inicio').first()
    )
    total_ultima_nomina = None
    ultima_quincena_nombre = None
    if ultima_quincena_aprobada:
        total_ultima_nomina = (
            Nomina.objects.filter(
                quincena=ultima_quincena_aprobada,
                estado='APROBADA'
            ).aggregate(total=Sum('total_neto'))['total'] or Decimal('0')
        )
        ultima_quincena_nombre = str(ultima_quincena_aprobada)

    # 4. Adelantos activos pendientes de cobro
    adelantos_activos = Prestamo.objects.filter(estado='ACTIVO')
    total_adelantos_pendientes = (
        adelantos_activos.aggregate(total=Sum('saldo_pendiente'))['total'] or Decimal('0')
    )
    num_adelantos = adelantos_activos.count()

    # 5. Productos con stock bajo (stock_actual <= stock_minimo y stock_minimo > 0)
    stocks_bajos = (
        StockFinca.objects
        .filter(stock_minimo__gt=0, stock_actual__lte=F('stock_minimo'))
        .select_related('producto', 'bodega')
        .order_by('bodega__nombre', 'producto__nombre')
    )
    alertas_stock = [
        {
            'producto': s.producto.nombre,
            'bodega': s.bodega.nombre if s.bodega else '—',
            'stock_actual': float(s.stock_actual),
            'stock_minimo': float(s.stock_minimo),
            'unidad': s.producto.get_unidad_display(),
        }
        for s in stocks_bajos
    ]

    # 6. Contratos que vencen en los próximos 30 días
    limite = hoy + timedelta(days=30)
    contratos_por_vencer = (
        Contrato.objects
        .filter(
            estado='ACTIVO',
            tipo_contrato='TERMINO_FIJO',
            fecha_fin__gte=hoy,
            fecha_fin__lte=limite,
        )
        .select_related('trabajador', 'trabajador__finca')
        .order_by('fecha_fin')
    )
    alertas_contratos = [
        {
            'contrato_id': c.id,
            'trabajador': c.trabajador.nombre_completo,
            'finca': c.trabajador.finca.nombre if c.trabajador.finca else '—',
            'fecha_fin': c.fecha_fin,
            'dias_restantes': (c.fecha_fin - hoy).days,
        }
        for c in contratos_por_vencer
    ]

    return Response({
        'trabajadores': {
            'total': total_trabajadores,
            'por_finca': trabajadores_por_finca,
        },
        'quincena_actual': quincena_info,
        'ultima_nomina': {
            'quincena': ultima_quincena_nombre,
            'total_neto': float(total_ultima_nomina) if total_ultima_nomina is not None else None,
        },
        'adelantos': {
            'count': num_adelantos,
            'total_pendiente': float(total_adelantos_pendientes),
        },
        'alertas_stock': alertas_stock,
        'alertas_contratos': alertas_contratos,
    })


