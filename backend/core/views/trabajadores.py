# backend/core/views/trabajadores.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from ..models import TipoContrato, Trabajador, Finca, Lote
from ..serializers import (
    TipoContratoSerializer, TrabajadorListSerializer, TrabajadorDetailSerializer,
    TrabajadorCreateUpdateSerializer, FincaSerializer, LoteSerializer,
)
from ..permissions import CanModifyData, FincaFilterMixin
from ..filters import TrabajadorFilter


class TipoContratoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para Tipos de Contrato"""
    queryset = TipoContrato.objects.all()
    serializer_class = TipoContratoSerializer
    permission_classes = [permissions.IsAuthenticated]


class TrabajadorViewSet(FincaFilterMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de trabajadores"""
    queryset = Trabajador.objects.all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TrabajadorFilter
    search_fields = ['nombres', 'apellidos', 'numero_documento']
    ordering_fields = ['apellidos', 'fecha_ingreso', 'created_at']
    ordering = ['apellidos', 'nombres']
    finca_field = 'finca'

    def get_serializer_class(self):
        if self.action == 'list':
            return TrabajadorListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return TrabajadorCreateUpdateSerializer
        return TrabajadorDetailSerializer

    @action(detail=True, methods=['post'])
    def retirar(self, request, pk=None):
        """Retirar un trabajador. Requiere: motivo_retiro"""
        from django.utils import timezone

        trabajador = self.get_object()

        if trabajador.estado == Trabajador.RETIRADO:
            return Response(
                {'error': 'El trabajador ya está retirado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        motivo = request.data.get('motivo_retiro')
        if not motivo:
            return Response(
                {'error': 'Debe indicar el motivo de retiro'},
                status=status.HTTP_400_BAD_REQUEST
            )

        adelantos_pendientes = trabajador.prestamos.filter(estado='ACTIVO')
        if adelantos_pendientes.exists():
            total_pendiente = sum(a.saldo_pendiente for a in adelantos_pendientes)
            warning = f'El trabajador tiene adelantos pendientes por ${total_pendiente}'
        else:
            warning = None

        trabajador.estado = Trabajador.RETIRADO
        trabajador.motivo_retiro = motivo
        trabajador.observaciones_retiro = request.data.get('observaciones_retiro', '')
        trabajador.fecha_retiro = request.data.get('fecha_retiro') or timezone.now().date()
        trabajador.save()

        serializer = self.get_serializer(trabajador)
        response_data = serializer.data
        if warning:
            response_data['warning'] = warning

        return Response(response_data)

    @action(detail=True, methods=['post'])
    def reactivar(self, request, pk=None):
        """Reactivar un trabajador retirado. Vuelve a estado SIN_CONTRATO."""
        trabajador = self.get_object()

        if trabajador.estado != Trabajador.RETIRADO:
            return Response(
                {'error': 'Solo se pueden reactivar trabajadores retirados'},
                status=status.HTTP_400_BAD_REQUEST
            )

        trabajador.estado = Trabajador.SIN_CONTRATO
        trabajador.fecha_retiro = None
        trabajador.motivo_retiro = None
        trabajador.observaciones_retiro = None
        trabajador.save()

        serializer = self.get_serializer(trabajador)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='liquidacion')
    def liquidacion(self, request, pk=None):
        """
        Calcula la liquidación de contrato de un trabajador.
        Query params:
          - fecha_retiro: YYYY-MM-DD (requerido)
          - pdf: 'true' para descargar el PDF
        """
        from datetime import date
        from django.http import HttpResponse
        from ..services.liquidacion_calculator import calcular_liquidacion
        from ..services.liquidacion_pdf import generar_liquidacion_pdf

        trabajador = self.get_object()

        fecha_str = request.query_params.get('fecha_retiro')
        if not fecha_str:
            return Response(
                {'error': 'El parámetro fecha_retiro (YYYY-MM-DD) es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            fecha_retiro = date.fromisoformat(fecha_str)
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if fecha_retiro < trabajador.fecha_ingreso:
            return Response(
                {'error': 'La fecha de retiro no puede ser anterior a la fecha de ingreso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = calcular_liquidacion(trabajador, fecha_retiro)

        if request.query_params.get('pdf') == 'true':
            buffer = generar_liquidacion_pdf(data)
            nombre = f"liquidacion_{trabajador.numero_documento}_{fecha_str}.pdf"
            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{nombre}"'
            return response

        return Response(data)

    @action(detail=False, methods=['get'], url_path='lista-simple')
    def lista_simple(self, request):
        """Lista simple sin paginación (útil para selects en formularios)"""
        qs = self.filter_queryset(self.get_queryset())
        serializer = TrabajadorListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class FincaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de fincas"""
    queryset = Finca.objects.all()
    serializer_class = FincaSerializer
    permission_classes = [CanModifyData]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nombre', 'ubicacion']
    ordering_fields = ['nombre', 'created_at']
    ordering = ['nombre']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user or not user.is_authenticated:
            return queryset.none()

        if user.es_administrador:
            return queryset

        return user.fincas_asignadas.all()

    @action(detail=True, methods=['get'])
    def trabajadores(self, request, pk=None):
        """Obtener trabajadores activos de una finca (CONTRATADO o SIN_CONTRATO)"""
        finca = self.get_object()
        trabajadores = finca.trabajadores.exclude(estado=Trabajador.RETIRADO)
        serializer = TrabajadorListSerializer(trabajadores, many=True, context={'request': request})
        return Response(serializer.data)


class LoteViewSet(FincaFilterMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de lotes"""
    queryset = Lote.objects.all()
    serializer_class = LoteSerializer
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    finca_field = 'finca'
    filterset_fields = ['finca', 'activo']
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'finca__nombre']
    ordering = ['finca__nombre', 'nombre']
