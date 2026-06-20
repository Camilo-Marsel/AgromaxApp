# backend/core/views/liquidaciones.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from ..models import LiquidacionRegistro
from ..serializers import (
    LiquidacionRegistroListSerializer,
    LiquidacionRegistroDetailSerializer,
    LiquidacionRegistroCreateSerializer,
)
from ..permissions import CanModifyData


class LiquidacionRegistroViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de liquidaciones de contrato registradas."""

    queryset = LiquidacionRegistro.objects.select_related(
        'trabajador', 'trabajador__finca', 'contrato', 'created_by', 'aprobada_by'
    ).all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'fuente', 'trabajador', 'trabajador__finca']
    search_fields = [
        'trabajador__nombres', 'trabajador__apellidos',
        'trabajador__numero_documento', 'notas',
    ]
    ordering_fields = ['created_at', 'fecha_retiro', 'total']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return LiquidacionRegistroListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return LiquidacionRegistroCreateSerializer
        return LiquidacionRegistroDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Marcar una liquidación como aprobada."""
        liq = self.get_object()
        if liq.estado == LiquidacionRegistro.APROBADA:
            return Response(
                {'error': 'Esta liquidación ya está aprobada'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        liq.estado = LiquidacionRegistro.APROBADA
        liq.aprobada_by = request.user
        liq.aprobada_at = timezone.now()
        liq.save()
        return Response(LiquidacionRegistroDetailSerializer(liq).data)

    @action(detail=True, methods=['post'])
    def revertir(self, request, pk=None):
        """Revertir liquidación aprobada a borrador."""
        liq = self.get_object()
        if liq.estado != LiquidacionRegistro.APROBADA:
            return Response(
                {'error': 'Solo se pueden revertir liquidaciones aprobadas'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        liq.estado = LiquidacionRegistro.BORRADOR
        liq.aprobada_by = None
        liq.aprobada_at = None
        liq.save()
        return Response(LiquidacionRegistroDetailSerializer(liq).data)
