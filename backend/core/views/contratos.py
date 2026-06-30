# backend/core/views/contratos.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse

from ..models import Contrato, DocumentoContrato, Nomina, AuditoriaLog, PlantillaContrato
from ..serializers import (
    ContratoListSerializer, ContratoDetailSerializer, ContratoCreateUpdateSerializer,
    ContratoFinalizarSerializer, ContratoLiquidarSerializer,
    ContratoCancelarSerializer, ContratoReactivarSerializer,
    DocumentoContratoSerializer, PlantillaContratoSerializer,
)
from ..permissions import CanModifyData, FincaFilterMixin


class PlantillaContratoViewSet(viewsets.ModelViewSet):
    """CRUD de plantillas de contrato."""
    queryset = PlantillaContrato.objects.all()
    serializer_class = PlantillaContratoSerializer
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['activa']
    search_fields = ['nombre', 'empleador_nombre']
    ordering = ['nombre']


class ContratoViewSet(FincaFilterMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de contratos laborales"""
    queryset = Contrato.objects.select_related('trabajador', 'created_by').all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['numero_contrato', 'trabajador__nombres', 'trabajador__apellidos', 'cargo']
    filterset_fields = ['estado', 'trabajador', 'tipo_contrato']
    ordering = ['-fecha_inicio']
    finca_field = 'trabajador__finca'

    def get_serializer_class(self):
        if self.action == 'list':
            return ContratoListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ContratoCreateUpdateSerializer
        elif self.action in ['finalizar', 'liquidar', 'cancelar', 'reactivar']:
            return ContratoDetailSerializer
        return ContratoDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        por_vencer = self.request.query_params.get('por_vencer', None)
        if por_vencer and por_vencer.lower() == 'true':
            from datetime import date, timedelta
            fecha_limite = date.today() + timedelta(days=15)
            queryset = queryset.filter(
                estado=Contrato.ACTIVO,
                fecha_fin__lte=fecha_limite,
                fecha_fin__gte=date.today()
            )

        vencidos = self.request.query_params.get('vencidos', None)
        if vencidos and vencidos.lower() == 'true':
            from datetime import date
            queryset = queryset.filter(
                estado=Contrato.ACTIVO,
                fecha_fin__lt=date.today()
            )

        return queryset

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas generales de contratos"""
        from datetime import date, timedelta

        total_contratos = Contrato.objects.count()
        activos = Contrato.objects.filter(estado=Contrato.ACTIVO).count()
        finalizados = Contrato.objects.filter(estado=Contrato.FINALIZADO).count()
        liquidados = Contrato.objects.filter(estado=Contrato.LIQUIDADO).count()
        cancelados = Contrato.objects.filter(estado=Contrato.CANCELADO).count()

        fecha_limite = date.today() + timedelta(days=15)
        por_vencer = Contrato.objects.filter(
            estado=Contrato.ACTIVO,
            fecha_fin__lte=fecha_limite,
            fecha_fin__gte=date.today()
        ).count()

        vencidos = Contrato.objects.filter(
            estado=Contrato.ACTIVO,
            fecha_fin__lt=date.today()
        ).count()

        return Response({
            'total_contratos': total_contratos,
            'activos': activos,
            'finalizados': finalizados,
            'liquidados': liquidados,
            'cancelados': cancelados,
            'por_vencer': por_vencer,
            'vencidos': vencidos
        })

    @action(detail=False, methods=['get'])
    def alertas(self, request):
        """Contratos por vencer y vencidos"""
        from datetime import date, timedelta

        fecha_limite = date.today() + timedelta(days=15)

        por_vencer = Contrato.objects.filter(
            estado=Contrato.ACTIVO,
            fecha_fin__lte=fecha_limite,
            fecha_fin__gte=date.today()
        ).select_related('trabajador')

        vencidos = Contrato.objects.filter(
            estado=Contrato.ACTIVO,
            fecha_fin__lt=date.today()
        ).select_related('trabajador')

        por_vencer_serializer = ContratoListSerializer(por_vencer, many=True, context={'request': request})
        vencidos_serializer = ContratoListSerializer(vencidos, many=True, context={'request': request})

        return Response({
            'por_vencer': por_vencer_serializer.data,
            'vencidos': vencidos_serializer.data
        })

    @action(detail=False, methods=['get'], url_path='trabajador/(?P<trabajador_id>[^/.]+)')
    def por_trabajador(self, request, trabajador_id=None):
        """Historial de contratos de un trabajador"""
        contratos = Contrato.objects.filter(
            trabajador_id=trabajador_id
        ).select_related('trabajador', 'created_by').order_by('-fecha_inicio')

        serializer = ContratoListSerializer(contratos, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        """Finalizar contrato (ACTIVO → FINALIZADO)"""
        contrato = self.get_object()
        serializer = ContratoFinalizarSerializer(data=request.data)

        if serializer.is_valid():
            try:
                contrato.finalizar_contrato(
                    motivo=serializer.validated_data['motivo'],
                    observaciones=serializer.validated_data.get('observaciones', ''),
                    usuario=request.user
                )
                detail_serializer = ContratoDetailSerializer(contrato, context={'request': request})
                return Response(detail_serializer.data)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def liquidar(self, request, pk=None):
        """Liquidar contrato (FINALIZADO → LIQUIDADO)"""
        contrato = self.get_object()
        serializer = ContratoLiquidarSerializer(data=request.data)

        if serializer.is_valid():
            try:
                contrato.liquidar_contrato(
                    fecha_liquidacion=serializer.validated_data.get('fecha_liquidacion'),
                    observaciones=serializer.validated_data.get('observaciones', ''),
                    usuario=request.user
                )
                detail_serializer = ContratoDetailSerializer(contrato, context={'request': request})
                return Response(detail_serializer.data)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancelar contrato (ACTIVO → CANCELADO)"""
        contrato = self.get_object()
        serializer = ContratoCancelarSerializer(data=request.data)

        if serializer.is_valid():
            try:
                contrato.cancelar_contrato(
                    motivo=serializer.validated_data['motivo'],
                    observaciones=serializer.validated_data.get('observaciones', ''),
                    usuario=request.user
                )
                detail_serializer = ContratoDetailSerializer(contrato, context={'request': request})
                return Response(detail_serializer.data)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reactivar(self, request, pk=None):
        """Reactivar contrato (CANCELADO → ACTIVO)"""
        contrato = self.get_object()
        serializer = ContratoReactivarSerializer(data=request.data)

        if serializer.is_valid():
            try:
                contrato.reactivar_contrato(
                    observaciones=serializer.validated_data.get('observaciones', ''),
                    usuario=request.user
                )
                detail_serializer = ContratoDetailSerializer(contrato, context={'request': request})
                return Response(detail_serializer.data)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def generar_pdf(self, request, pk=None):
        """Generar PDF del contrato laboral (visualización en línea)"""
        from ..services.contract_pdf_generator import generar_contrato_pdf

        contrato = self.get_object()

        try:
            pdf_buffer = generar_contrato_pdf(contrato)

            response = FileResponse(
                pdf_buffer,
                content_type='application/pdf',
                as_attachment=False,
                filename=f'contrato_{contrato.numero_contrato}.pdf'
            )
            response['Content-Disposition'] = f'inline; filename="contrato_{contrato.numero_contrato}.pdf"'
            return response

        except Exception:
            import logging
            logging.getLogger(__name__).exception("Error generando PDF contrato %s", contrato.pk)
            return Response(
                {'error': 'Error al generar el PDF. Intente de nuevo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def descargar_pdf(self, request, pk=None):
        """Descargar PDF del contrato laboral"""
        from ..services.contract_pdf_generator import generar_contrato_pdf

        contrato = self.get_object()

        try:
            pdf_buffer = generar_contrato_pdf(contrato)

            response = FileResponse(
                pdf_buffer,
                content_type='application/pdf',
                as_attachment=True,
                filename=f'contrato_{contrato.numero_contrato}.pdf'
            )
            return response

        except Exception:
            import logging
            logging.getLogger(__name__).exception("Error descargando PDF contrato %s", contrato.pk)
            return Response(
                {'error': 'Error al generar el PDF. Intente de nuevo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Obtener historial de cambios del contrato desde auditoría"""
        contrato = self.get_object()

        logs = AuditoriaLog.objects.filter(
            tabla_afectada='Contrato',
            registro_id=str(contrato.id)
        ).select_related('usuario').order_by('-created_at')

        historial = []
        for log in logs:
            historial.append({
                'accion': log.get_accion_display(),
                'fecha': log.created_at,
                'usuario': log.usuario.get_full_name() if log.usuario else 'Sistema',
                'descripcion': self._format_cambios(log.datos_anteriores, log.datos_nuevos)
            })

        if not historial:
            historial.append({
                'accion': 'Creación',
                'fecha': contrato.created_at,
                'usuario': contrato.created_by.get_full_name() if contrato.created_by else 'Sistema',
                'descripcion': f'Contrato {contrato.numero_contrato} creado'
            })

        return Response(historial)

    def _format_cambios(self, datos_ant, datos_new):
        """Formatear cambios para mostrar en historial"""
        if not datos_ant and not datos_new:
            return 'Sin detalles'

        cambios = []
        if datos_new:
            for key, value in datos_new.items():
                if key in ['created_at', 'updated_at', 'id']:
                    continue
                old_val = datos_ant.get(key, 'N/A') if datos_ant else 'N/A'
                if old_val != value:
                    cambios.append(f'{key}: {old_val} → {value}')

        return ', '.join(cambios) if cambios else 'Actualización de datos'

    @action(detail=True, methods=['get'])
    def nominas(self, request, pk=None):
        """Obtener nóminas del trabajador asociado al contrato"""
        contrato = self.get_object()
        trabajador = contrato.trabajador

        nominas_qs = Nomina.objects.filter(
            trabajador=trabajador
        ).select_related('quincena').order_by('-quincena__año', '-quincena__mes', '-quincena__numero')

        if contrato.fecha_inicio:
            nominas_qs = nominas_qs.filter(quincena__fecha_inicio__gte=contrato.fecha_inicio)
        if contrato.fecha_fin:
            nominas_qs = nominas_qs.filter(quincena__fecha_fin__lte=contrato.fecha_fin)

        nominas_data = []
        for nomina in nominas_qs[:20]:
            nominas_data.append({
                'id': nomina.id,
                'quincena_info': {
                    'id': nomina.quincena.id,
                    'nombre': f'Q{nomina.quincena.numero} - {nomina.quincena.mes}/{nomina.quincena.año}',
                    'fecha_inicio': nomina.quincena.fecha_inicio,
                    'fecha_fin': nomina.quincena.fecha_fin,
                },
                'total_devengado': nomina.total_devengado,
                'total_deducciones': nomina.total_deducciones,
                'total_neto': nomina.total_neto,
                'total_pagar': nomina.total_neto,
                'estado': nomina.estado,
                'estado_display': nomina.get_estado_display(),
                'fecha_calculo': nomina.fecha_calculo,
            })

        return Response(nominas_data)


class DocumentoContratoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de documentos de contratos"""
    queryset = DocumentoContrato.objects.select_related('contrato', 'created_by').all()
    serializer_class = DocumentoContratoSerializer
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['contrato', 'tipo_documento']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
