# backend/core/views/prestamos.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse

from ..models import Prestamo, CuotaPrestamo
from ..serializers import PrestamoSerializer, PrestamoCreateSerializer
from ..permissions import CanModifyData, FincaFilterMixin


class PrestamoViewSet(FincaFilterMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de préstamos (adelantos de nómina)"""
    queryset = Prestamo.objects.all()
    serializer_class = PrestamoSerializer
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['trabajador', 'estado', 'tipo_pago']
    search_fields = ['trabajador__nombres', 'trabajador__apellidos', 'trabajador__numero_documento']
    ordering = ['-fecha_prestamo']
    finca_field = 'trabajador__finca'

    def get_serializer_class(self):
        if self.action == 'create':
            return PrestamoCreateSerializer
        return PrestamoSerializer

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancelar un préstamo (marca como CANCELADO)"""
        prestamo = self.get_object()

        if prestamo.estado == 'CANCELADO':
            return Response(
                {'error': 'Este adelanto ya está cancelado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        prestamo.estado = 'CANCELADO'
        prestamo.save()

        CuotaPrestamo.objects.filter(
            prestamo=prestamo,
            estado__in=['PENDIENTE', 'DESCONTADA']
        ).update(estado='CANCELADA')

        serializer = self.get_serializer(prestamo)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def generar_autorizacion(self, request, pk=None):
        """Generar documento de autorización de descuento PDF"""
        prestamo = self.get_object()

        from ..services.prestamo_pdf import generar_autorizacion_pdf

        pdf_buffer = generar_autorizacion_pdf(prestamo)

        nombre_limpio = prestamo.trabajador.nombre_completo.replace(' ', '_')
        filename = f"Autorizacion_Prestamo_{nombre_limpio}_{prestamo.id}.pdf"

        response = FileResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'])
    def generar_paz_y_salvo(self, request, pk=None):
        """Generar certificado de paz y salvo PDF"""
        prestamo = self.get_object()

        if prestamo.estado != 'PAGADO':
            return Response(
                {'error': 'Solo se puede generar paz y salvo para préstamos pagados'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from ..services.prestamo_pdf import generar_paz_y_salvo_pdf

        pdf_buffer = generar_paz_y_salvo_pdf(prestamo)

        nombre_limpio = prestamo.trabajador.nombre_completo.replace(' ', '_')
        filename = f"Paz_y_Salvo_{nombre_limpio}_{prestamo.id}.pdf"

        response = FileResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
