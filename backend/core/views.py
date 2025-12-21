# backend/core/views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .services.nomina_calculator import NominaCalculator
from django.http import FileResponse
from .services.pdf_generator import generar_comprobante_pdf
from .services.excel_generator import ExcelGenerator
from rest_framework.filters import SearchFilter 
from django.utils import timezone


from .models import (
    Usuario, Rol, TipoContrato, Finca, Lote, Trabajador,  # Agregar Finca y Lote
    UnidadMedida, Labor, ListaPrecios, VariablesNomina,
    Quincena, RegistroLabor, Nomina, DetalleNomina,
    Prestamo, CuotaPrestamo, AuditoriaLog
)
from .serializers import *
from .permissions import IsSuperAdmin, IsDigitadorOrAbove, ReadOnly
from .filters import *

# ============================================================================
# USUARIOS Y ROLES
# ============================================================================

class RolViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para Roles"""
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [permissions.IsAuthenticated]


class UsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de usuarios"""
    queryset = Usuario.objects.all()
    permission_classes = [IsSuperAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'date_joined']
    ordering = ['-date_joined']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        return UsuarioSerializer


# ============================================================================
# TRABAJADORES
# ============================================================================

class TipoContratoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para Tipos de Contrato"""
    queryset = TipoContrato.objects.all()
    serializer_class = TipoContratoSerializer
    permission_classes = [permissions.IsAuthenticated]


class TrabajadorViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de trabajadores"""
    queryset = Trabajador.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TrabajadorFilter
    search_fields = ['nombres', 'apellidos', 'numero_documento']
    ordering_fields = ['apellidos', 'fecha_ingreso', 'created_at']
    ordering = ['apellidos', 'nombres']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TrabajadorListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return TrabajadorCreateUpdateSerializer
        return TrabajadorDetailSerializer
    
    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        """Activar trabajador"""
        trabajador = self.get_object()
        trabajador.estado = 'ACTIVO'
        trabajador.save()
        serializer = self.get_serializer(trabajador)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def inactivar(self, request, pk=None):
        """Inactivar trabajador"""
        trabajador = self.get_object()
        trabajador.estado = 'INACTIVO'
        trabajador.save()
        serializer = self.get_serializer(trabajador)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='lista-simple')
    def lista_simple(self, request):
        """Lista simple sin paginación (útil para selects en formularios)"""
        qs = self.filter_queryset(self.get_queryset())
        serializer = TrabajadorListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)



# ============================================================================
# FINCAS Y LOTES
# ============================================================================

class FincaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de fincas"""
    queryset = Finca.objects.all()
    serializer_class = FincaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nombre', 'ubicacion']
    ordering_fields = ['nombre', 'created_at']
    ordering = ['nombre']
    
    @action(detail=True, methods=['get'])
    def trabajadores(self, request, pk=None):
        """Obtener trabajadores de una finca"""
        finca = self.get_object()
        trabajadores = finca.trabajadores.filter(estado='ACTIVO')
        serializer = TrabajadorListSerializer(trabajadores, many=True, context={'request': request})
        return Response(serializer.data)


class LoteViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de lotes"""
    queryset = Lote.objects.all()
    serializer_class = LoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['finca', 'activo']
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'finca__nombre']
    ordering = ['finca__nombre', 'nombre']


# ============================================================================
# CATÁLOGOS
# ============================================================================

class UnidadMedidaViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para Unidades de Medida"""
    queryset = UnidadMedida.objects.all()
    serializer_class = UnidadMedidaSerializer
    permission_classes = [permissions.IsAuthenticated]


class LaborViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de labores"""
    queryset = Labor.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = LaborFilter
    search_fields = ['codigo', 'nombre']
    ordering_fields = ['codigo', 'nombre', 'created_at']
    ordering = ['nombre']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return LaborCreateUpdateSerializer
        return LaborListSerializer


class ListaPreciosViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de precios"""
    queryset = ListaPrecios.objects.all()
    permission_classes = [IsDigitadorOrAbove]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['labor', 'fecha_inicio_vigencia']
    ordering_fields = ['fecha_inicio_vigencia', 'created_at']
    ordering = ['-fecha_inicio_vigencia']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ListaPreciosCreateSerializer
        return ListaPreciosSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class VariablesNominaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de variables de nómina"""
    queryset = VariablesNomina.objects.all()
    serializer_class = VariablesNominaSerializer
    permission_classes = [IsDigitadorOrAbove]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['nombre']
    ordering = ['-fecha_inicio_vigencia']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ============================================================================
# QUINCENAS Y REGISTROS
# ============================================================================

class QuincenaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de quincenas"""
    queryset = Quincena.objects.all()
    serializer_class = QuincenaSerializer
    permission_classes = [IsDigitadorOrAbove]
    filter_backends = [OrderingFilter]
    ordering = ['-año', '-mes', '-numero']
    
    @action(detail=False, methods=['post'])
    def crear_actual(self, request):
        """Crear quincena actual si no existe"""
        from django.utils import timezone
        from datetime import datetime, timedelta
        
        hoy = timezone.now().date()
        año = hoy.year
        mes = hoy.month
        
        # Determinar si es primera o segunda quincena
        if hoy.day <= 15:
            numero = 1
            fecha_inicio = hoy.replace(day=1)
            fecha_fin = hoy.replace(day=15)
        else:
            numero = 2
            fecha_inicio = hoy.replace(day=16)
            # Último día del mes
            if mes == 12:
                fecha_fin = hoy.replace(day=31)
            else:
                fecha_fin = (hoy.replace(month=mes + 1, day=1) - timedelta(days=1))
        
        fecha_cierre_registro = fecha_fin + timedelta(days=15)
        
        # Verificar si ya existe
        quincena, created = Quincena.objects.get_or_create(
            año=año,
            mes=mes,
            numero=numero,
            defaults={
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
                'fecha_cierre_registro': fecha_cierre_registro,
                'estado': 'ABIERTA'
            }
        )
        
        serializer = self.get_serializer(quincena)
        
        if created:
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'message': 'La quincena actual ya existe', 'data': serializer.data},
                status=status.HTTP_200_OK
            )
    
    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        """Cerrar quincena para preparar nómina"""
        quincena = self.get_object()
        quincena.estado = 'EN_CALCULO'
        quincena.save()
        serializer = self.get_serializer(quincena)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """Obtener estadísticas de registros de la quincena"""
        quincena = self.get_object()
        
        # Total de trabajadores activos
        trabajadores_activos = Trabajador.objects.filter(estado='ACTIVO').count()
        
        # Trabajadores con al menos un registro en esta quincena
        trabajadores_con_registros = RegistroLabor.objects.filter(
            quincena=quincena
        ).values('trabajador').distinct().count()
        
        # Total de registros
        total_registros = RegistroLabor.objects.filter(quincena=quincena).count()
        
        # Trabajadores sin registros
        trabajadores_sin_registros = trabajadores_activos - trabajadores_con_registros
        
        return Response({
            'trabajadores_activos': trabajadores_activos,
            'trabajadores_con_registros': trabajadores_con_registros,
            'trabajadores_sin_registros': trabajadores_sin_registros,
            'total_registros': total_registros,
            'porcentaje_cobertura': round(
                (trabajadores_con_registros / trabajadores_activos * 100) if trabajadores_activos > 0 else 0,
                2
            )
        })


class RegistroLaborViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de registros de labores"""
    queryset = RegistroLabor.objects.all()
    permission_classes = [IsDigitadorOrAbove]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = RegistroLaborFilter
    ordering = ['-fecha', 'trabajador']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RegistroLaborCreateUpdateSerializer
        return RegistroLaborSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=['post'])
    def crear_multiples(self, request):
        """Crear múltiples registros de labor (para labores tipo DÍA con múltiples fechas)"""
        trabajador_id = request.data.get('trabajador')
        labor_id = request.data.get('labor')
        fechas = request.data.get('fechas', [])  # Lista de fechas
        quincena_id = request.data.get('quincena')
        observaciones = request.data.get('observaciones', '')
        
        if not all([trabajador_id, labor_id, fechas, quincena_id]):
            return Response(
                {'error': 'Faltan campos requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            trabajador = Trabajador.objects.get(id=trabajador_id)
            labor = Labor.objects.get(id=labor_id)
            quincena = Quincena.objects.get(id=quincena_id)
        except (Trabajador.DoesNotExist, Labor.DoesNotExist, Quincena.DoesNotExist):
            return Response(
                {'error': 'Trabajador, Labor o Quincena no encontrados'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        registros_creados = []
        errores = []
        
        for fecha_str in fechas:
            from datetime import datetime
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            
            # Validar domingo
            if fecha.weekday() == 6:
                errores.append(f"{fecha_str}: No se puede registrar en domingo")
                continue
            
            # Validar duplicado
            if RegistroLabor.objects.filter(
                trabajador=trabajador,
                fecha=fecha,
                quincena=quincena
            ).exists():
                errores.append(f"{fecha_str}: Ya existe un registro para este día")
                continue
            
            # Crear registro
            registro = RegistroLabor.objects.create(
                trabajador=trabajador,
                labor=labor,
                fecha=fecha,
                quincena=quincena,
                cantidad=1,  # Para labores tipo DÍA siempre es 1
                observaciones=observaciones,
                created_by=request.user
            )
            registros_creados.append(registro)
        
        # Serializar respuesta
        serializer = self.get_serializer(registros_creados, many=True)
        
        return Response({
            'message': f'{len(registros_creados)} registros creados correctamente',
            'registros': serializer.data,
            'errores': errores
        }, status=status.HTTP_201_CREATED if registros_creados else status.HTTP_400_BAD_REQUEST)

# ============================================================================
# NÓMINA
# ============================================================================




class NominaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de nóminas"""
    queryset = Nomina.objects.all()
    serializer_class = NominaSerializer
    permission_classes = [IsDigitadorOrAbove]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = NominaFilter
    ordering = ['-quincena', 'trabajador']
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_class = NominaFilter
    search_fields = ['trabajador__nombres', 'trabajador__apellidos', 'trabajador__numero_documento']
    
    ordering = ['-quincena', 'trabajador']
    
    # AGREGAR esto para desactivar paginación (mostrar todas):
    pagination_class = None

    @action(detail=False, methods=['get'])
    def exportar_excel_quincena(self, request):
        """Exportar lista de pagos de una quincena a Excel"""
        quincena_id = request.query_params.get('quincena')
        
        if not quincena_id:
            return Response(
                {'error': 'Se requiere el parámetro quincena'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            quincena = Quincena.objects.get(id=quincena_id)
        except Quincena.DoesNotExist:
            return Response(
                {'error': 'Quincena no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # CAMBIO: Obtener nóminas de la quincena (cualquier estado excepto BORRADOR)
        nominas = self.queryset.filter(
            quincena=quincena,
            estado__in=['CALCULADA', 'APROBADA', 'PAGADA']  # PERMITIR CALCULADAS TAMBIÉN
        ).select_related('trabajador', 'quincena').order_by('trabajador__apellidos', 'trabajador__nombres')
        # Obtener filtro opcional de finca desde query params
        finca_id = request.query_params.get('finca')

        if finca_id:
            nominas = nominas.filter(trabajador__finca__id=finca_id)
    
        nominas = nominas.order_by('trabajador__apellidos', 'trabajador__nombres')

        if not nominas.exists():
            return Response(
                {'error': 'No hay nóminas calculadas para esta quincena'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generar Excel
        generator = ExcelGenerator(nominas, quincena)
        return generator.generar_lista_pagos()

    @action(detail=False, methods=['post'])
    def calcular_quincena(self, request):
        """Calcular nómina para toda la quincena"""
        quincena_id = request.data.get('quincena_id')
        
        if not quincena_id:
            return Response(
                {'error': 'quincena_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            quincena = Quincena.objects.get(id=quincena_id)
        except Quincena.DoesNotExist:
            return Response(
                {'error': 'Quincena no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calcular nómina
        calculator = NominaCalculator(quincena)
        nominas = calculator.calcular_quincena_completa(request.user)
        
        serializer = self.get_serializer(nominas, many=True)
        
        return Response({
            'message': f'Nómina calculada para {len(nominas)} trabajadores',
            'nominas': serializer.data
        })
    

    @action(detail=True, methods=['post'])
    def recalcular(self, request, pk=None):
        """Recalcular nómina manteniendo ajustes manuales"""
        nomina = self.get_object()
        
        # Solo se puede recalcular si está en CALCULADA
        if nomina.estado != 'CALCULADA':
            return Response(
                {'error': 'Solo se pueden recalcular nóminas en estado CALCULADA'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Importar calculador
            from .services.nomina_calculator import NominaCalculator
            
            # Guardar ajustes manuales actuales
            devengos_adicionales = nomina.devengos_adicionales
            descripcion_devengos = nomina.descripcion_devengos_adicionales
            deducciones_adicionales = nomina.deducciones_adicionales
            descripcion_deducciones = nomina.descripcion_deducciones_adicionales
            
            # Recalcular
            calculator = NominaCalculator(nomina.quincena)
            nomina_actualizada = calculator.calcular_trabajador(
                nomina.trabajador,
                request.user
            )
            
            # Restaurar ajustes manuales
            nomina_actualizada.devengos_adicionales = devengos_adicionales
            nomina_actualizada.descripcion_devengos_adicionales = descripcion_devengos
            nomina_actualizada.deducciones_adicionales = deducciones_adicionales
            nomina_actualizada.descripcion_deducciones_adicionales = descripcion_deducciones
            nomina_actualizada.save()
            
            # Recalcular con ajustes
            nomina_actualizada = calculator.calcular_trabajador(
                nomina.trabajador,
                request.user
            )
            
            serializer = self.get_serializer(nomina_actualizada)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar nómina calculada"""
        nomina = self.get_object()
        
        if nomina.estado != 'CALCULADA':
            return Response(
                {'error': 'Solo se pueden aprobar nóminas en estado CALCULADA'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cambiar estado
        nomina.estado = 'APROBADA'
        nomina.fecha_aprobacion = timezone.now()
        nomina.save()
        
        serializer = self.get_serializer(nomina)
        return Response(serializer.data)


    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar nómina aprobada (regresa a CALCULADA)"""
        nomina = self.get_object()
        
        if nomina.estado != 'APROBADA':
            return Response(
                {'error': 'Solo se pueden rechazar nóminas en estado APROBADA'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener motivo del rechazo (opcional)
        motivo = request.data.get('motivo', '')
        
        # Regresar a calculada
        nomina.estado = 'CALCULADA'
        nomina.fecha_aprobacion = None
        
        # Agregar motivo a observaciones
        if motivo:
            fecha_hora = timezone.now().strftime('%Y-%m-%d %H:%M')
            nota = f"\n[{fecha_hora}] Nómina rechazada: {motivo}"
            nomina.observaciones = (nomina.observaciones or '') + nota
        
        nomina.save()
        
        serializer = self.get_serializer(nomina)
        return Response(serializer.data)


    @action(detail=True, methods=['post'])
    def marcar_pagada(self, request, pk=None):
        """Marcar nómina como pagada"""
        nomina = self.get_object()
        
        if nomina.estado != 'APROBADA':
            return Response(
                {'error': 'Solo se pueden marcar como pagadas las nóminas APROBADAS'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cambiar estado
        nomina.estado = 'PAGADA'
        nomina.fecha_pago = timezone.now()
        nomina.save()
        
        serializer = self.get_serializer(nomina)
        return Response(serializer.data)


    @action(detail=False, methods=['post'])
    def aprobar_masivo(self, request):
        """Aprobar todas las nóminas CALCULADAS de una quincena (con filtro opcional de finca)"""
        quincena_id = request.data.get('quincena_id')
        finca_id = request.data.get('finca_id')
        
        if not quincena_id:
            return Response(
                {'error': 'El ID de quincena es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filtrar nóminas
        nominas = Nomina.objects.filter(
            quincena_id=quincena_id,
            estado='CALCULADA'
        )
        
        # Aplicar filtro de finca si se proporciona
        if finca_id:
            nominas = nominas.filter(trabajador__finca_id=finca_id)
        
        # Contar antes de actualizar
        count = nominas.count()
        
        if count == 0:
            return Response(
                {'error': 'No hay nóminas CALCULADAS para aprobar con los filtros aplicados'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Aprobar todas
        nominas.update(
            estado='APROBADA',
            fecha_aprobacion=timezone.now()
        )
        
        return Response({
            'message': f'{count} nómina(s) aprobada(s) correctamente',
            'count': count
        })


    @action(detail=False, methods=['post'])
    def marcar_pagadas_masivo(self, request):
        """Marcar todas las nóminas APROBADAS como PAGADAS (con filtro opcional de finca)"""
        quincena_id = request.data.get('quincena_id')
        finca_id = request.data.get('finca_id')
        
        if not quincena_id:
            return Response(
                {'error': 'El ID de quincena es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filtrar nóminas
        nominas = Nomina.objects.filter(
            quincena_id=quincena_id,
            estado='APROBADA'
        )
        
        # Aplicar filtro de finca si se proporciona
        if finca_id:
            nominas = nominas.filter(trabajador__finca_id=finca_id)
        
        # Contar antes de actualizar
        count = nominas.count()
        
        if count == 0:
            return Response(
                {'error': 'No hay nóminas APROBADAS para marcar como pagadas con los filtros aplicados'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Marcar como pagadas
        nominas.update(
            estado='PAGADA',
            fecha_pago=timezone.now()
        )
        
        return Response({
            'message': f'{count} nómina(s) marcada(s) como pagada(s) correctamente',
            'count': count
        })


    @action(detail=False, methods=['post'])
    def rechazar_masivo(self, request):
        """Rechazar todas las nóminas APROBADAS de una quincena (regresa a CALCULADA)"""
        quincena_id = request.data.get('quincena_id')
        finca_id = request.data.get('finca_id')
        motivo = request.data.get('motivo', '')
        
        if not quincena_id:
            return Response(
                {'error': 'El ID de quincena es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filtrar nóminas
        nominas = Nomina.objects.filter(
            quincena_id=quincena_id,
            estado='APROBADA'
        )
        
        # Aplicar filtro de finca si se proporciona
        if finca_id:
            nominas = nominas.filter(trabajador__finca_id=finca_id)
        
        # Contar antes de actualizar
        count = nominas.count()
        
        if count == 0:
            return Response(
                {'error': 'No hay nóminas APROBADAS para rechazar con los filtros aplicados'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Agregar motivo a observaciones si se proporciona
        if motivo:
            fecha_hora = timezone.now().strftime('%Y-%m-%d %H:%M')
            for nomina in nominas:
                nota = f"\n[{fecha_hora}] Rechazo masivo: {motivo}"
                nomina.observaciones = (nomina.observaciones or '') + nota
                nomina.estado = 'CALCULADA'
                nomina.fecha_aprobacion = None
                nomina.save()
        else:
            nominas.update(
                estado='CALCULADA',
                fecha_aprobacion=None
            )
        
        return Response({
            'message': f'{count} nómina(s) rechazada(s) correctamente',
            'count': count
        })
    
    @action(detail=True, methods=['get'])
    def descargar_pdf(self, request, pk=None):
        """Descargar comprobante de pago en PDF"""
        nomina = self.get_object()
        
        # Generar PDF
        pdf_buffer = generar_comprobante_pdf(nomina)
        
        # Nombre del archivo
        filename = f"comprobante_nomina_{nomina.trabajador.numero_documento}_{nomina.quincena.año}_{nomina.quincena.mes}_Q{nomina.quincena.numero}.pdf"
        
        # Retornar como descarga
        response = FileResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response


# ============================================================================
# PRÉSTAMOS
# ============================================================================

class PrestamoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de préstamos"""
    queryset = Prestamo.objects.all()
    permission_classes = [IsDigitadorOrAbove]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = PrestamoFilter
    ordering = ['-fecha_prestamo']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PrestamoCreateSerializer
        return PrestamoSerializer

    def perform_create(self, serializer):
        # Guardar el creador del préstamo
        serializer.save(created_by=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ============================================================================
# AUDITORÍA
# ============================================================================

class AuditoriaLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para logs de auditoría"""
    queryset = AuditoriaLog.objects.all()
    serializer_class = AuditoriaLogSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['accion', 'tabla_afectada', 'usuario']
    ordering = ['-created_at']


# ============================================================================
# PRESTAMOS Y CUOTAS
# ============================================================================  

class PrestamoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de préstamos"""
    queryset = Prestamo.objects.all()
    serializer_class = PrestamoSerializer
    permission_classes = [IsDigitadorOrAbove]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['trabajador', 'estado', 'tipo_pago']
    search_fields = ['trabajador__nombres', 'trabajador__apellidos', 'trabajador__numero_documento']
    ordering = ['-fecha_prestamo']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PrestamoCreateSerializer
        return PrestamoSerializer
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancelar un préstamo (marca como CANCELADO)"""
        prestamo = self.get_object()
        
        if prestamo.estado == 'PAGADO':
            return Response(
                {'error': 'No se puede cancelar un préstamo ya pagado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        prestamo.estado = 'CANCELADO'
        prestamo.save()
        
        # Cancelar cuotas pendientes
        CuotaPrestamo.objects.filter(
            prestamo=prestamo,
            estado='PENDIENTE'
        ).update(estado='CANCELADA')
        
        serializer = self.get_serializer(prestamo)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def generar_autorizacion(self, request, pk=None):
        """Generar documento de autorización de descuento PDF"""
        prestamo = self.get_object()
        
        from .services.prestamo_pdf import generar_autorizacion_pdf
        
        # Generar PDF
        pdf_buffer = generar_autorizacion_pdf(prestamo)
        
        # Nombre del archivo
        filename = f"autorizacion_prestamo_{prestamo.id}_{prestamo.trabajador.numero_documento}.pdf"
        
        # Retornar como descarga
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
        
        from .services.prestamo_pdf import generar_paz_y_salvo_pdf
        
        # Generar PDF
        pdf_buffer = generar_paz_y_salvo_pdf(prestamo)
        
        # Nombre del archivo
        filename = f"paz_y_salvo_prestamo_{prestamo.id}_{prestamo.trabajador.numero_documento}.pdf"
        
        # Retornar como descarga
        response = FileResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response


class VariablesNominaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de variables de nómina"""
    queryset = VariablesNomina.objects.all()
    serializer_class = VariablesNominaSerializer
    permission_classes = [IsDigitadorOrAbove]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['nombre']
    ordering = ['-fecha_inicio_vigencia']
    
    @action(detail=False, methods=['get'])
    def vigentes(self, request):
        """Obtener variables vigentes actualmente"""
        from django.utils import timezone
        hoy = timezone.now().date()
        
        variables_vigentes = {}
        
        for nombre_var in [
            VariablesNomina.SALARIO_MINIMO,
            VariablesNomina.AUXILIO_TRANSPORTE,
            VariablesNomina.PORCENTAJE_SALUD,
            VariablesNomina.PORCENTAJE_PENSION
        ]:
            variable = VariablesNomina.objects.filter(
                nombre=nombre_var,
                fecha_inicio_vigencia__lte=hoy,
                fecha_fin_vigencia__isnull=True
            ).first()
            
            if variable:
                variables_vigentes[nombre_var] = {
                    'id': variable.id,
                    'nombre': variable.get_nombre_display(),
                    'valor': str(variable.valor),
                    'fecha_inicio_vigencia': variable.fecha_inicio_vigencia,
                }
        
        return Response(variables_vigentes)
    
    @action(detail=False, methods=['post'])
    def actualizar_variable(self, request):
        """Crear nueva versión de una variable (cierra la anterior)"""
        nombre = request.data.get('nombre')
        valor = request.data.get('valor')
        fecha_inicio = request.data.get('fecha_inicio_vigencia')
        descripcion = request.data.get('descripcion', '')
        
        if not all([nombre, valor, fecha_inicio]):
            return Response(
                {'error': 'Faltan campos requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Cerrar variable anterior
            VariablesNomina.objects.filter(
                nombre=nombre,
                fecha_fin_vigencia__isnull=True
            ).update(fecha_fin_vigencia=fecha_inicio)
            
            # Crear nueva variable
            nueva_variable = VariablesNomina.objects.create(
                nombre=nombre,
                valor=valor,
                fecha_inicio_vigencia=fecha_inicio,
                descripcion=descripcion,
                created_by=request.user
            )
            
            serializer = self.get_serializer(nueva_variable)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )