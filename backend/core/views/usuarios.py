# backend/core/views/usuarios.py

from rest_framework import viewsets, permissions
from rest_framework.filters import SearchFilter, OrderingFilter

from ..models import Usuario, Rol
from ..serializers import RolSerializer, UsuarioSerializer, UsuarioCreateSerializer
from ..permissions import IsAdministrador

IsSuperAdmin = IsAdministrador


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
