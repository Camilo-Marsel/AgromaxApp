# backend/core/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .views import *
from .views import VariablesNominaViewSet  # Agregado explícito

# Router para ViewSets
router = DefaultRouter()
router.register(r'roles', RolViewSet, basename='rol')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'prestamos', PrestamoViewSet, basename='prestamo')
router.register(r'trabajadores', TrabajadorViewSet, basename='trabajador')
router.register(r'fincas', FincaViewSet, basename='finca')
router.register(r'lotes', LoteViewSet, basename='lote')
router.register(r'unidades-medida', UnidadMedidaViewSet, basename='unidad-medida')
router.register(r'tipos-contrato', TipoContratoViewSet, basename='tipo-contrato')
router.register(r'labores', LaborViewSet, basename='labor')
router.register(r'lista-precios', ListaPreciosViewSet, basename='lista-precios')
router.register(r'labor-insumos', LaborInsumoViewSet, basename='labor-insumo')
router.register(r'variables-nomina', VariablesNominaViewSet, basename='variables-nomina')
router.register(r'quincenas', QuincenaViewSet, basename='quincena')
router.register(r'registros-labor', RegistroLaborViewSet, basename='registro-labor')
router.register(r'nominas', NominaViewSet, basename='nomina')
router.register(r'auditoria', AuditoriaLogViewSet, basename='auditoria')
router.register(r'contratos', ContratoViewSet, basename='contrato')
router.register(r'documentos-contrato', DocumentoContratoViewSet, basename='documento-contrato')
router.register(r'configuracion-empresa', ConfiguracionEmpresaViewSet, basename='configuracion-empresa')

# Obligaciones Laborales
router.register(r'pila', PILAViewSet, basename='pila')
router.register(r'prestaciones', PrestacionesViewSet, basename='prestaciones')

# Inventario
router.register(r'inventario/bodegas', BodegaViewSet, basename='bodega')
# Producción
router.register(r'produccion/matas-caidas', MataCaidaViewSet, basename='mata-caida')
router.register(r'produccion/embarques', EmbarqueViewSet, basename='embarque')
router.register(r'inventario/productos', ProductoViewSet, basename='producto')
router.register(r'inventario/stocks', StockFincaViewSet, basename='stock-finca')
router.register(r'inventario/movimientos', MovimientoInventarioViewSet, basename='movimiento-inventario')

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