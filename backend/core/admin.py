# backend/core/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    Usuario, Rol, TipoContrato, Trabajador,
    UnidadMedida, Labor, ListaPrecios, VariablesNomina,
    Quincena, RegistroLabor, Nomina, DetalleNomina,
    Prestamo, CuotaPrestamo, AuditoriaLog
)

# ============================================================================
# USUARIOS Y ROLES
# ============================================================================

@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion']
    search_fields = ['nombre']


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'get_full_name', 'rol', 'es_activo', 'ultimo_acceso']
    list_filter = ['es_activo', 'rol', 'is_staff']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Información Adicional', {
            'fields': ('rol', 'es_activo', 'ultimo_acceso')
        }),
    )


# ============================================================================
# TRABAJADORES Y CONTRATOS
# ============================================================================

@admin.register(TipoContrato)
class TipoContratoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'aplica_deducciones', 'aplica_dominicales', 'aplica_auxilio_transporte']


@admin.register(Trabajador)
class TrabajadorAdmin(admin.ModelAdmin):
    list_display = ['numero_documento', 'nombre_completo', 'tipo_contrato', 'estado', 'fecha_ingreso']
    list_filter = ['estado', 'tipo_contrato']
    search_fields = ['nombres', 'apellidos', 'numero_documento']
    date_hierarchy = 'fecha_ingreso'
    
    fieldsets = (
        ('Información Personal', {
            'fields': ('nombres', 'apellidos', 'tipo_documento', 'numero_documento', 
                      'lugar_expedicion_documento', 'fecha_nacimiento')
        }),
        ('Contacto', {
            'fields': ('telefono', 'direccion', 'correo')
        }),
        ('Información Laboral', {
            'fields': ('eps', 'tipo_contrato', 'fecha_ingreso', 'fecha_retiro', 'estado')
        }),
        ('Información Bancaria', {
            'fields': ('banco', 'numero_cuenta_bancaria'),
            'classes': ('collapse',),
        }),
    )


# ============================================================================
# CATÁLOGOS
# ============================================================================

@admin.register(UnidadMedida)
class UnidadMedidaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion']


@admin.register(Labor)
class LaborAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'unidad_medida', 'es_especial', 'solo_con_contrato', 'activa']
    list_filter = ['activa', 'es_especial', 'solo_con_contrato', 'unidad_medida']
    search_fields = ['codigo', 'nombre']


@admin.register(ListaPrecios)
class ListaPreciosAdmin(admin.ModelAdmin):
    list_display = ['labor', 'precio', 'fecha_inicio_vigencia', 'fecha_fin_vigencia', 'vigente']
    list_filter = ['fecha_inicio_vigencia']
    search_fields = ['labor__nombre']
    date_hierarchy = 'fecha_inicio_vigencia'


@admin.register(VariablesNomina)
class VariablesNominaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'valor', 'fecha_inicio_vigencia', 'fecha_fin_vigencia', 'vigente']
    list_filter = ['nombre', 'fecha_inicio_vigencia']
    date_hierarchy = 'fecha_inicio_vigencia'


# ============================================================================
# QUINCENAS Y REGISTROS
# ============================================================================

@admin.register(Quincena)
class QuincenaAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'fecha_inicio', 'fecha_fin', 'fecha_cierre_registro', 'estado']
    list_filter = ['estado', 'año', 'mes']
    date_hierarchy = 'fecha_inicio'


@admin.register(RegistroLabor)
class RegistroLaborAdmin(admin.ModelAdmin):
    list_display = ['trabajador', 'labor', 'fecha', 'cantidad', 'quincena']
    list_filter = ['fecha', 'labor', 'quincena']
    search_fields = ['trabajador__nombres', 'trabajador__apellidos', 'labor__nombre']
    date_hierarchy = 'fecha'


# ============================================================================
# NÓMINA
# ============================================================================

@admin.register(Nomina)
class NominaAdmin(admin.ModelAdmin):
    list_display = ['trabajador', 'quincena', 'total_devengado', 'total_deducciones', 
                    'total_neto', 'estado', 'fecha_calculo']
    list_filter = ['estado', 'quincena']
    search_fields = ['trabajador__nombres', 'trabajador__apellidos']
    date_hierarchy = 'fecha_calculo'


@admin.register(DetalleNomina)
class DetalleNominaAdmin(admin.ModelAdmin):
    list_display = ['nomina', 'tipo', 'concepto', 'valor_total']
    list_filter = ['tipo', 'concepto']


# ============================================================================
# PRÉSTAMOS
# ============================================================================

@admin.register(Prestamo)
class PrestamoAdmin(admin.ModelAdmin):
    list_display = ['trabajador', 'monto_total', 'tipo_pago', 'saldo_pendiente', 
                    'estado', 'fecha_prestamo']
    list_filter = ['estado', 'tipo_pago']
    search_fields = ['trabajador__nombres', 'trabajador__apellidos']
    date_hierarchy = 'fecha_prestamo'


@admin.register(CuotaPrestamo)
class CuotaPrestamoAdmin(admin.ModelAdmin):
    list_display = ['prestamo', 'numero_cuota', 'valor_cuota', 'estado', 'fecha_descuento']
    list_filter = ['estado']


# ============================================================================
# AUDITORÍA
# ============================================================================

@admin.register(AuditoriaLog)
class AuditoriaLogAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'accion', 'tabla_afectada', 'registro_id', 'ip_address', 'created_at']
    list_filter = ['accion', 'tabla_afectada', 'created_at']
    search_fields = ['usuario__username', 'tabla_afectada']
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False