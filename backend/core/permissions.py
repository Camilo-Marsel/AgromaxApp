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