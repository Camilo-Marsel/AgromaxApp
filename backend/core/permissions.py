# backend/core/permissions.py

from rest_framework import permissions
from .models import Rol

class IsSuperAdmin(permissions.BasePermission):
    """Permiso solo para Super Administradores"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.rol and
            request.user.rol.nombre == Rol.SUPER_ADMIN
        )


class IsDigitadorOrAbove(permissions.BasePermission):
    """Permiso para Digitador y roles superiores"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if not request.user.rol:
            return False
        
        allowed_roles = [Rol.SUPER_ADMIN, Rol.DIGITADOR]
        return request.user.rol.nombre in allowed_roles


class CanViewSensitiveData(permissions.BasePermission):
    """Permiso para ver información sensible (info bancaria)"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.rol and
            request.user.rol.nombre == Rol.SUPER_ADMIN
        )


class ReadOnly(permissions.BasePermission):
    """Permiso de solo lectura"""
    
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS