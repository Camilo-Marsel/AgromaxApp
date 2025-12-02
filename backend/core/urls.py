# backend/core/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .views import *

# Router para ViewSets
router = DefaultRouter()
router.register(r'roles', RolViewSet, basename='rol')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'tipos-contrato', TipoContratoViewSet, basename='tipo-contrato')
router.register(r'trabajadores', TrabajadorViewSet, basename='trabajador')
router.register(r'unidades-medida', UnidadMedidaViewSet, basename='unidad-medida')
router.register(r'labores', LaborViewSet, basename='labor')
router.register(r'precios', ListaPreciosViewSet, basename='precio')
router.register(r'variables-nomina', VariablesNominaViewSet, basename='variable-nomina')
router.register(r'quincenas', QuincenaViewSet, basename='quincena')
router.register(r'registros-labor', RegistroLaborViewSet, basename='registro-labor')
router.register(r'nominas', NominaViewSet, basename='nomina')
router.register(r'prestamos', PrestamoViewSet, basename='prestamo')
router.register(r'auditoria', AuditoriaLogViewSet, basename='auditoria')

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Endpoint de prueba para verificar que la API funciona"""
    return Response({
        'status': 'ok',
        'message': 'API Finca Platanera funcionando correctamente'
    })

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('', include(router.urls)),
]