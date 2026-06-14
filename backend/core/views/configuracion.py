# backend/core/views/configuracion.py

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import ConfiguracionEmpresa
from ..serializers import ConfiguracionEmpresaSerializer
from ..permissions import CanModifyData


class ConfiguracionEmpresaViewSet(viewsets.ModelViewSet):
    """ViewSet para la configuración de empresa (singleton)."""
    queryset = ConfiguracionEmpresa.objects.all()
    serializer_class = ConfiguracionEmpresaSerializer
    permission_classes = [CanModifyData]

    def list(self, request, *args, **kwargs):
        """Retorna la configuración única de empresa"""
        config = ConfiguracionEmpresa.get_config()
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Crear o actualizar la configuración única"""
        config = ConfiguracionEmpresa.get_config()
        serializer = self.get_serializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        config = ConfiguracionEmpresa.get_config()
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        config = ConfiguracionEmpresa.get_config()
        serializer = self.get_serializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def actual(self, request):
        """Obtener la configuración actual de empresa"""
        config = ConfiguracionEmpresa.get_config()
        serializer = self.get_serializer(config)
        return Response(serializer.data)
