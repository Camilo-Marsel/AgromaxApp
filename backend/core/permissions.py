# backend/core/permissions.py

from rest_framework import permissions
from .models import Rol


class IsAdministrador(permissions.BasePermission):
    """
    Permiso solo para Administradores.
    ADMINISTRADOR: Acceso total + gestión de usuarios
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.rol and
            request.user.rol.nombre == Rol.ADMINISTRADOR
        )


# Alias para compatibilidad con código existente
IsSuperAdmin = IsAdministrador


class IsSupervisorOrAbove(permissions.BasePermission):
    """
    Permiso para Supervisor y Administrador.
    Permite todas las operaciones excepto gestión de usuarios.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.rol:
            return False

        allowed_roles = [Rol.ADMINISTRADOR, Rol.SUPERVISOR]
        return request.user.rol.nombre in allowed_roles


# Alias para compatibilidad
IsDigitadorOrAbove = IsSupervisorOrAbove


class IsConsultaOrAbove(permissions.BasePermission):
    """
    Permiso para Consulta, Supervisor y Administrador.
    Solo lectura para CONSULTA, escritura para los demás.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.rol:
            return False

        # CONSULTA solo puede hacer operaciones de lectura
        if request.user.rol.nombre == Rol.CONSULTA:
            return request.method in permissions.SAFE_METHODS

        # SUPERVISOR y ADMINISTRADOR pueden hacer todo
        allowed_roles = [Rol.ADMINISTRADOR, Rol.SUPERVISOR]
        return request.user.rol.nombre in allowed_roles


class CanModifyData(permissions.BasePermission):
    """
    Permiso para modificar datos (crear, editar, eliminar).
    Solo ADMINISTRADOR y SUPERVISOR pueden modificar.
    CONSULTA solo puede ver.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.rol:
            return False

        # Operaciones de lectura permitidas para todos
        if request.method in permissions.SAFE_METHODS:
            return True

        # Operaciones de escritura solo para ADMINISTRADOR y SUPERVISOR
        allowed_roles = [Rol.ADMINISTRADOR, Rol.SUPERVISOR]
        return request.user.rol.nombre in allowed_roles


class CanViewSensitiveData(permissions.BasePermission):
    """Permiso para ver información sensible (info bancaria)"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.rol and
            request.user.rol.nombre == Rol.ADMINISTRADOR
        )


class ReadOnly(permissions.BasePermission):
    """Permiso de solo lectura"""

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


# ============================================================================
# MIXIN PARA FILTRAR POR FINCAS ASIGNADAS
# ============================================================================

class FincaFilterMixin:
    """
    Mixin para filtrar querysets por fincas asignadas al usuario.

    Uso:
        class TrabajadorViewSet(FincaFilterMixin, viewsets.ModelViewSet):
            finca_field = 'finca'  # Campo que relaciona con Finca

        Para modelos con relación indirecta:
            finca_field = 'trabajador__finca'  # Para Nomina
            finca_field = 'trabajador__finca'  # Para Prestamo
    """

    # Campo que relaciona el modelo con Finca
    # Sobreescribir en cada ViewSet según corresponda
    finca_field = 'finca'

    def get_queryset(self):
        """
        Filtra el queryset por las fincas asignadas al usuario.
        Administradores ven todo.
        """
        queryset = super().get_queryset()
        user = self.request.user

        # Si no está autenticado, retornar vacío
        if not user or not user.is_authenticated:
            return queryset.none()

        # Administradores ven todo
        if user.es_administrador:
            return queryset

        # Obtener fincas asignadas
        fincas_ids = list(user.fincas_asignadas.values_list('id', flat=True))

        # Si no tiene fincas asignadas, no ve nada
        if not fincas_ids:
            return queryset.none()

        # Filtrar por el campo de finca
        if self.finca_field:
            filter_kwargs = {f'{self.finca_field}__id__in': fincas_ids}
            return queryset.filter(**filter_kwargs)

        return queryset

    def get_fincas_usuario(self):
        """Helper para obtener las fincas del usuario actual"""
        user = self.request.user
        if user.es_administrador:
            from .models import Finca
            return Finca.objects.all()
        return user.fincas_asignadas.all()