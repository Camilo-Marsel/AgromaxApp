# backend/core/views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    Usuario, Rol, TipoContrato, Trabajador,
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