# backend/core/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    Usuario, Rol, TipoContrato, Finca, Lote, Trabajador,
    UnidadMedida, Labor, ListaPrecios, VariablesNomina,
    Quincena, RegistroLabor, Nomina, DetalleNomina,
    Prestamo, CuotaPrestamo, AuditoriaLog,
    Contrato, DocumentoContrato
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

@admin.register(Finca)
class FincaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'ubicacion', 'activa', 'created_at']
    list_filter = ['activa']
    search_fields = ['nombre', 'ubicacion']


@admin.register(Lote)
class LoteAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'finca', 'medida', 'unidad_medida', 'activo']
    list_filter = ['finca', 'activo', 'unidad_medida']
    search_fields = ['nombre', 'finca__nombre']

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
        return False# Código temporal para agregar al final de admin.py

# ============================================================================
# CONTRATOS
# ============================================================================

class DocumentoContratoInline(admin.TabularInline):
    """Inline para documentos de contrato"""
    model = DocumentoContrato
    extra = 0
    fields = ['tipo_documento', 'nombre', 'archivo', 'fecha_documento']
    readonly_fields = ['created_at', 'created_by']


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = [
        'numero_contrato',
        'trabajador',
        'cargo',
        'tipo_contrato',
        'fecha_inicio',
        'fecha_fin',
        'get_estado_badge',
        'get_alerta',
        'salario_pactado'
    ]
    list_filter = ['estado', 'tipo_contrato', 'created_at']
    search_fields = [
        'numero_contrato',
        'trabajador__nombres',
        'trabajador__apellidos',
        'cargo'
    ]
    date_hierarchy = 'fecha_inicio'
    readonly_fields = [
        'numero_contrato',
        'created_at',
        'updated_at',
        'created_by',
        'get_duracion_info',
        'get_progreso_bar'
    ]

    fieldsets = (
        ('Información Básica', {
            'fields': (
                'numero_contrato',
                'trabajador',
                'tipo_contrato',
                'cargo',
                'salario_pactado'
            )
        }),
        ('Fechas', {
            'fields': (
                'fecha_inicio',
                'fecha_fin',
                'fecha_liquidacion'
            )
        }),
        ('Estado', {
            'fields': (
                'estado',
                'motivo_finalizacion',
                'observaciones'
            )
        }),
        ('Información Calculada', {
            'fields': (
                'get_duracion_info',
                'get_progreso_bar'
            ),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': (
                'created_at',
                'updated_at',
                'created_by'
            ),
            'classes': ('collapse',)
        })
    )

    inlines = [DocumentoContratoInline]

    def get_estado_badge(self, obj):
        """Badge de color para el estado"""
        colors = {
            'ACTIVO': 'green',
            'FINALIZADO': 'orange',
            'LIQUIDADO': 'blue',
            'CANCELADO': 'red'
        }
        color = colors.get(obj.estado, 'gray')

        from django.utils.html import format_html
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_estado_display()
        )
    get_estado_badge.short_description = 'Estado'

    def get_alerta(self, obj):
        """Indicador de alerta (por vencer / vencido)"""
        if obj.esta_vencido:
            from django.utils.html import format_html
            return format_html(
                '<span style="color: red; font-weight: bold;">🔴 Vencido hace {} días</span>',
                abs(obj.dias_restantes) if obj.dias_restantes else 0
            )
        elif obj.esta_por_vencer:
            from django.utils.html import format_html
            return format_html(
                '<span style="color: orange; font-weight: bold;">⏰ Vence en {} días</span>',
                obj.dias_restantes
            )
        else:
            return '✓ OK'
    get_alerta.short_description = 'Alerta'

    def get_duracion_info(self, obj):
        """Información de duración del contrato"""
        if not obj.duracion_dias:
            return 'N/A'

        from django.utils.html import format_html
        return format_html(
            '<strong>Duración:</strong> {} meses ({} días)<br>'
            '<strong>Días restantes:</strong> {}<br>'
            '<strong>Progreso:</strong> {}%',
            obj.duracion_meses or 'N/A',
            obj.duracion_dias,
            obj.dias_restantes if obj.dias_restantes is not None else 'N/A',
            obj.progreso_contrato or 0
        )
    get_duracion_info.short_description = 'Duración'

    def get_progreso_bar(self, obj):
        """Barra de progreso visual"""
        if not obj.progreso_contrato:
            return 'N/A'

        progreso = obj.progreso_contrato
        color = 'green' if progreso < 75 else 'orange' if progreso < 90 else 'red'

        from django.utils.html import format_html
        return format_html(
            '<div style="width: 200px; background-color: #e0e0e0; border-radius: 5px; overflow: hidden;">'
            '<div style="width: {}%; background-color: {}; height: 20px; text-align: center; color: white; font-size: 12px; line-height: 20px;">'
            '{}%'
            '</div>'
            '</div>',
            progreso,
            color,
            int(progreso)
        )
    get_progreso_bar.short_description = 'Progreso'

    def save_model(self, request, obj, form, change):
        """Guardar usuario que crea el contrato"""
        if not change:  # Si es creación
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(DocumentoContrato)
class DocumentoContratoAdmin(admin.ModelAdmin):
    list_display = [
        'contrato',
        'tipo_documento',
        'nombre',
        'fecha_documento',
        'created_at',
        'created_by'
    ]
    list_filter = ['tipo_documento', 'fecha_documento', 'created_at']
    search_fields = [
        'contrato__numero_contrato',
        'nombre',
        'descripcion'
    ]
    date_hierarchy = 'fecha_documento'
    readonly_fields = ['created_at', 'created_by']

    fieldsets = (
        ('Información del Documento', {
            'fields': (
                'contrato',
                'tipo_documento',
                'nombre',
                'descripcion',
                'archivo',
                'fecha_documento'
            )
        }),
        ('Auditoría', {
            'fields': (
                'created_at',
                'created_by'
            ),
            'classes': ('collapse',)
        })
    )

    def save_model(self, request, obj, form, change):
        """Guardar usuario que sube el documento"""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
