# backend/core/views/__init__.py

from .usuarios import RolViewSet, UsuarioViewSet
from .trabajadores import TipoContratoViewSet, TrabajadorViewSet, FincaViewSet, LoteViewSet
from .catalogo import UnidadMedidaViewSet, LaborViewSet, ListaPreciosViewSet
from .nomina import (
    VariablesNominaViewSet, QuincenaViewSet, RegistroLaborViewSet,
    NominaViewSet, AuditoriaLogViewSet,
)
from .prestamos import PrestamoViewSet
from .contratos import ContratoViewSet, DocumentoContratoViewSet
from .configuracion import ConfiguracionEmpresaViewSet
from .obligaciones import PILAViewSet, PrestacionesViewSet
from .inventario import BodegaViewSet, ProductoViewSet, StockFincaViewSet, MovimientoInventarioViewSet

__all__ = [
    'RolViewSet', 'UsuarioViewSet',
    'TipoContratoViewSet', 'TrabajadorViewSet', 'FincaViewSet', 'LoteViewSet',
    'UnidadMedidaViewSet', 'LaborViewSet', 'ListaPreciosViewSet',
    'VariablesNominaViewSet', 'QuincenaViewSet', 'RegistroLaborViewSet',
    'NominaViewSet', 'AuditoriaLogViewSet',
    'PrestamoViewSet',
    'ContratoViewSet', 'DocumentoContratoViewSet',
    'ConfiguracionEmpresaViewSet',
    'PILAViewSet', 'PrestacionesViewSet',
    'BodegaViewSet', 'ProductoViewSet', 'StockFincaViewSet', 'MovimientoInventarioViewSet',
]
