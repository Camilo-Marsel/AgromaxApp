# backend/core/views/produccion.py

from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum

from ..models import MataCaida, Embarque, RegistroLabor, ConfiguracionEmpresa
from ..serializers import (
    MataCaidaSerializer, MataCaidaCreateSerializer,
    EmbarqueSerializer, EmbarqueCreateSerializer,
)
from ..permissions import CanModifyData

SEMANA_ANO_FIELD = 'semana_año'


def _get_umbrales():
    try:
        cfg = ConfiguracionEmpresa.get_config()
        return Decimal(str(cfg.umbral_desviacion_produccion)), int(cfg.umbral_matas_sin_reportar)
    except Exception:
        return Decimal('10'), 5


class MataCaidaViewSet(viewsets.ModelViewSet):
    queryset = MataCaida.objects.select_related('finca', 'lote', 'created_by').all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['finca', 'lote', 'color_cinta', SEMANA_ANO_FIELD]
    ordering_fields = ['fecha_reporte', 'created_at']
    ordering = ['-fecha_reporte']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MataCaidaCreateSerializer
        return MataCaidaSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EmbarqueViewSet(viewsets.ModelViewSet):
    queryset = Embarque.objects.select_related('finca', 'lote', 'created_by').all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['finca', 'lote', 'color_cinta', SEMANA_ANO_FIELD]
    ordering_fields = ['fecha_embarque', 'created_at']
    ordering = ['-fecha_embarque']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return EmbarqueCreateSerializer
        return EmbarqueSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='ratio-finca')
    def ratio_finca(self, request):
        finca_id = request.query_params.get('finca')
        lote_id = request.query_params.get('lote')
        if not finca_id:
            return Response({'error': 'Parametro finca requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = Embarque.objects.filter(finca_id=finca_id)
        if lote_id:
            qs = qs.filter(lote_id=lote_id)
        ultimos = qs.order_by('-fecha_embarque')[:4]
        ratios = [e.ratio for e in ultimos if e.ratio is not None]
        if not ratios:
            return Response({'finca': finca_id, 'lote': lote_id, 'ratio_actual': None, 'embarques_usados': 0})
        ratio_actual = sum(ratios) / len(ratios)
        return Response({'finca': finca_id, 'lote': lote_id, 'ratio_actual': round(ratio_actual, 4), 'embarques_usados': len(ratios)})

    @action(detail=False, methods=['get'], url_path='tendencia')
    def tendencia(self, request):
        finca_id = request.query_params.get('finca')
        lote_id = request.query_params.get('lote')
        n = int(request.query_params.get('n', 12))
        if not finca_id:
            return Response({'error': 'Parametro finca requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = Embarque.objects.filter(finca_id=finca_id)
        if lote_id:
            qs = qs.filter(lote_id=lote_id)
        embarques = list(qs.order_by('-fecha_embarque')[:n])
        embarques.reverse()
        data = [
            {
                'id': e.id,
                'semana_' + 'á' + 'o': getattr(e, 'semana_año'),
                'fecha_embarque': str(e.fecha_embarque),
                'color_cinta': e.color_cinta,
                'total_cintas': e.total_cintas,
                'cajas_netas': e.cajas_netas,
                'ratio': float(e.ratio) if e.ratio is not None else None,
            }
            for e in embarques
        ]
        return Response(data)

    @action(detail=True, methods=['get'], url_path='validacion')
    def validacion(self, request, pk=None):
        embarque = self.get_object()
        finca_id = embarque.finca_id
        lote_id = embarque.lote_id
        color = embarque.color_cinta
        semana = getattr(embarque, 'semana_año')
        if lote_id:
            labor_filter = dict(lote_id=lote_id, color_cinta=color, labor__nombre='Embolse')
            caida_filter = dict(lote_id=lote_id, color_cinta=color)
            ratio_qs = Embarque.objects.filter(finca_id=finca_id, lote_id=lote_id)
        else:
            labor_filter = dict(lote__finca_id=finca_id, color_cinta=color, labor__nombre='Embolse')
            caida_filter = dict(finca_id=finca_id, color_cinta=color)
            ratio_qs = Embarque.objects.filter(finca_id=finca_id, lote__isnull=True)
        encintadas = RegistroLabor.objects.filter(**labor_filter).aggregate(total=Sum('cantidad'))['total'] or Decimal('0')
        caidas = MataCaida.objects.filter(**caida_filter).aggregate(total=Sum('cantidad_caidas'))['total'] or 0
        matas_corte = embarque.total_cintas
        esperadas = int(encintadas) - int(caidas)
        matas_sin_reportar = esperadas - matas_corte
        ultimos = ratio_qs.order_by('-fecha_embarque')[:4]
        ratios = [e.ratio for e in ultimos if e.ratio is not None]
        ratio_actual = (sum(ratios) / len(ratios)) if ratios else None
        cajas_esperadas = None
        desviacion = None
        alerta_desviacion = False
        umbral_desviacion, umbral_matas = _get_umbrales()
        if ratio_actual and esperadas > 0:
            try:
                cajas_esperadas = round(Decimal(str(esperadas)) / Decimal(str(ratio_actual)), 2)
                cajas_netas = embarque.cajas_netas
                if cajas_netas and cajas_esperadas:
                    desviacion = round(abs(Decimal(str(cajas_netas)) - cajas_esperadas) / cajas_esperadas * 100, 2)
                    alerta_desviacion = desviacion > umbral_desviacion
            except (InvalidOperation, ZeroDivisionError):
                pass
        alerta_matas = matas_sin_reportar > umbral_matas
        return Response({
            'embarque_id': embarque.id,
            'finca': finca_id,
            'lote': lote_id,
            'color_cinta': color,
            'semana_' + 'á' + 'o': semana,
            'scope': 'lote' if lote_id else 'finca',
            'encintadas': int(encintadas),
            'caidas_reportadas': int(caidas),
            'esperadas': esperadas,
            'matas_corte': matas_corte,
            'matas_sin_reportar': matas_sin_reportar,
            'cajas_netas': embarque.cajas_netas,
            'cajas_esperadas': float(cajas_esperadas) if cajas_esperadas is not None else None,
            'ratio_actual': float(ratio_actual) if ratio_actual is not None else None,
            'desviacion_pct': float(desviacion) if desviacion is not None else None,
            'alerta_desviacion': alerta_desviacion,
            'alerta_matas_sin_reportar': alerta_matas,
            'umbral_desviacion_pct': float(umbral_desviacion),
            'umbral_matas': umbral_matas,
        })