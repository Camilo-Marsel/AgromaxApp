# backend/core/models/__init__.py

# Import all models to maintain existing imports throughout the codebase
# This ensures zero breaking changes - all existing code will continue to work

from .hr import Rol, Usuario, TipoContrato, Trabajador, Contrato, DocumentoContrato
from .farm import Bodega, Finca, Lote
from .labor import UnidadMedida, Labor, ListaPrecios, Quincena, RegistroLabor
from .payroll import VariablesNomina, Nomina, DetalleNomina
from .loans import Prestamo, CuotaPrestamo
from .audit import AuditoriaLog
from .config import ConfiguracionEmpresa
from .inventario import Producto, StockFinca, MovimientoInventario
from .obligations import (
    PILA, DetallePILA, ProvisionPrestaciones, ResumenPrestaciones,
    PORCENTAJE_SALUD_EMPLEADOR, PORCENTAJE_PENSION_EMPLEADOR,
    PORCENTAJE_ARL, PORCENTAJE_CAJA_COMPENSACION,
    PORCENTAJE_CESANTIAS, PORCENTAJE_INTERESES_CESANTIAS,
    PORCENTAJE_PRIMA, PORCENTAJE_VACACIONES,
)

# Export all models so they can be imported as: from core.models import ModelName
__all__ = [
    # HR models
    'Rol',
    'Usuario',
    'TipoContrato',
    'Trabajador',
    'Contrato',
    'DocumentoContrato',

    # Farm models
    'Bodega',
    'Finca',
    'Lote',

    # Labor models
    'UnidadMedida',
    'Labor',
    'ListaPrecios',
    'Quincena',
    'RegistroLabor',

    # Payroll models
    'VariablesNomina',
    'Nomina',
    'DetalleNomina',

    # Loan models
    'Prestamo',
    'CuotaPrestamo',

    # Audit models
    'AuditoriaLog',

    # Config models
    'ConfiguracionEmpresa',

    # Inventory models
    'Producto',
    'StockFinca',
    'MovimientoInventario',

    # Obligations models (PILA and Prestaciones)
    'PILA',
    'DetallePILA',
    'ProvisionPrestaciones',
    'ResumenPrestaciones',

    # Obligation constants
    'PORCENTAJE_SALUD_EMPLEADOR',
    'PORCENTAJE_PENSION_EMPLEADOR',
    'PORCENTAJE_ARL',
    'PORCENTAJE_CAJA_COMPENSACION',
    'PORCENTAJE_CESANTIAS',
    'PORCENTAJE_INTERESES_CESANTIAS',
    'PORCENTAJE_PRIMA',
    'PORCENTAJE_VACACIONES',
]
