# backend/core/views/prestamos.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse

from ..models import Prestamo, CuotaPrestamo, Trabajador
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

    @action(detail=False, methods=['get'], url_path='estado_cuenta')
    def estado_cuenta(self, request):
        """Descargar estado de cuenta PDF de todos los adelantos de un trabajador"""
        trabajador_id = request.query_params.get('trabajador')
        if not trabajador_id:
            return Response({'error': 'Se requiere el parámetro trabajador'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            trabajador = Trabajador.objects.get(pk=trabajador_id)
        except Trabajador.DoesNotExist:
            return Response({'error': 'Trabajador no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        from ..services.prestamo_pdf import generar_estado_cuenta_pdf
        pdf_buffer = generar_estado_cuenta_pdf(trabajador)

        nombre_limpio = trabajador.nombre_completo.replace(' ', '_')
        filename = f'Estado_Cuenta_Adelantos_{nombre_limpio}.pdf'
        response = FileResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['post'], url_path='enviar_estado_cuenta')
    def enviar_estado_cuenta(self, request):
        """Enviar estado de cuenta de adelantos por correo al trabajador"""
        trabajador_id = request.data.get('trabajador')
        if not trabajador_id:
            return Response({'error': 'Se requiere el campo trabajador'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            trabajador = Trabajador.objects.get(pk=trabajador_id)
        except Trabajador.DoesNotExist:
            return Response({'error': 'Trabajador no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        from ..services.email_service import EmailService
        resultado = EmailService.enviar_estado_cuenta_prestamos(trabajador)
        http_status = status.HTTP_200_OK if resultado['success'] else status.HTTP_400_BAD_REQUEST
        return Response(resultado, status=http_status)

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
