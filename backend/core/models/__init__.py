# backend/core/models/__init__.py

# Import all models to maintain existing imports throughout the codebase
# This ensures zero breaking changes - all existing code will continue to work

from .hr import Rol, Usuario, TipoContrato, Trabajador, Contrato, DocumentoContrato
from .farm import Finca, Lote
from .labor import UnidadMedida, Labor, ListaPrecios, Quincena, RegistroLabor
from .payroll import VariablesNomina, Nomina, DetalleNomina
from .loans import Prestamo, CuotaPrestamo
from .audit import AuditoriaLog
from .config import ConfiguracionEmpresa

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
]
