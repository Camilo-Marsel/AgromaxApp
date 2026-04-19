# backend/core/serializers.py

from rest_framework import serializers
from core.utils import is_colombian_holiday
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from .models import (
    Usuario, Rol, TipoContrato, Finca, Lote, Trabajador,
    UnidadMedida, Labor, ListaPrecios, VariablesNomina,
    Quincena, RegistroLabor, Nomina, DetalleNomina,
    Prestamo, CuotaPrestamo, AuditoriaLog,
    Contrato, DocumentoContrato, ConfiguracionEmpresa,
    PILA, DetallePILA, ProvisionPrestaciones, ResumenPrestaciones,
    PORCENTAJE_SALUD_EMPLEADOR, PORCENTAJE_PENSION_EMPLEADOR,
    PORCENTAJE_ARL, PORCENTAJE_CAJA_COMPENSACION,
    PORCENTAJE_CESANTIAS, PORCENTAJE_INTERESES_CESANTIAS,
    PORCENTAJE_PRIMA, PORCENTAJE_VACACIONES,
)
from decimal import Decimal
from datetime import date

# ============================================================================
# AUTENTICACIÓN
# ============================================================================

class LoginSerializer(serializers.Serializer):
    """Serializer para login"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('Usuario inactivo')
                data['user'] = user
            else:
                raise serializers.ValidationError('Credenciales inválidas')
        else:
            raise serializers.ValidationError('Debe incluir username y password')
        
        return data


# ============================================================================
# USUARIOS Y ROLES
# ============================================================================

class RolSerializer(serializers.ModelSerializer):
    nombre_display = serializers.CharField(source='get_nombre_display', read_only=True)
    
    class Meta:
        model = Rol
        fields = ['id', 'nombre', 'nombre_display', 'descripcion', 'permisos']


class FincaSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para mostrar fincas asignadas"""
    class Meta:
        model = Finca
        fields = ['id', 'nombre']


class UsuarioSerializer(serializers.ModelSerializer):
    rol_info = RolSerializer(source='rol', read_only=True)
    nombre_completo = serializers.SerializerMethodField()
    fincas_asignadas_info = FincaSimpleSerializer(source='fincas_asignadas', many=True, read_only=True)
    es_administrador = serializers.BooleanField(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'nombre_completo', 'rol', 'rol_info', 'es_activo',
            'ultimo_acceso', 'date_joined', 'fincas_asignadas',
            'fincas_asignadas_info', 'es_administrador'
        ]
        read_only_fields = ['date_joined', 'ultimo_acceso']

    def get_nombre_completo(self, obj):
        return obj.get_full_name() or obj.username


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    fincas_asignadas = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Finca.objects.all(), required=False
    )

    class Meta:
        model = Usuario
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'rol', 'es_activo',
            'fincas_asignadas'
        ]

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        fincas = validated_data.pop('fincas_asignadas', [])
        user = Usuario.objects.create(**validated_data)
        user.set_password(password)
        user.fincas_asignadas.set(fincas)
        user.save()
        return user


# ============================================================================
# FINCAS Y LOTES
# ============================================================================

class LoteSerializer(serializers.ModelSerializer):
    finca_nombre = serializers.CharField(source='finca.nombre', read_only=True)
    unidad_medida_display = serializers.CharField(source='get_unidad_medida_display', read_only=True)
    
    class Meta:
        model = Lote
        fields = [
            'id', 'finca', 'finca_nombre', 'nombre', 'medida',
            'unidad_medida', 'unidad_medida_display', 'activo',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class FincaSerializer(serializers.ModelSerializer):
    lotes = LoteSerializer(many=True, read_only=True)
    total_lotes = serializers.SerializerMethodField()
    
    class Meta:
        model = Finca
        fields = [
            'id', 'nombre', 'ubicacion', 'activa',
            'lotes', 'total_lotes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_total_lotes(self, obj):
        return obj.lotes.count()


class FincaSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple sin lotes para uso en otras entidades"""
    
    class Meta:
        model = Finca
        fields = ['id', 'nombre', 'ubicacion', 'activa']


# ============================================================================
# TRABAJADORES
# ============================================================================

class TipoContratoSerializer(serializers.ModelSerializer):
    nombre_display = serializers.CharField(source='get_nombre_display', read_only=True)
    
    class Meta:
        model = TipoContrato
        fields = [
            'id', 'nombre', 'nombre_display', 'descripcion',
            'aplica_deducciones', 'aplica_dominicales', 'aplica_auxilio_transporte'
        ]


class TrabajadorSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para incluir información mínima del trabajador"""
    nombre_completo = serializers.CharField(read_only=True)

    class Meta:
        model = Trabajador
        fields = ['id', 'nombres', 'apellidos', 'nombre_completo', 'numero_documento']
        read_only_fields = fields


class TrabajadorListSerializer(serializers.ModelSerializer):
    """Serializer para listado (sin info bancaria completa)"""
    tipo_contrato_info = TipoContratoSerializer(source='tipo_contrato', read_only=True)
    finca_info = FincaSimpleSerializer(source='finca', read_only=True)
    nombre_completo = serializers.CharField(read_only=True)
    cuenta_oculta = serializers.CharField(read_only=True)
    tipo_documento_display = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tipo_cuenta_display = serializers.CharField(source='get_tipo_cuenta_bancaria_display', read_only=True)
    
    class Meta:
        model = Trabajador
        fields = [
            'id', 'nombres', 'apellidos', 'nombre_completo',
            'tipo_documento', 'tipo_documento_display', 'numero_documento',
            'es_administrativo', 'salario_quincenal',
            'fecha_nacimiento', 'telefono', 'correo',
            'tipo_contrato', 'tipo_contrato_info',
            'finca', 'finca_info',
            'fecha_ingreso', 'fecha_retiro', 'estado', 'estado_display',
            'cuenta_oculta', 'banco', 'tipo_cuenta_bancaria', 'tipo_cuenta_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TrabajadorDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle (con info bancaria para SUPER_ADMIN)"""
    tipo_contrato_info = TipoContratoSerializer(source='tipo_contrato', read_only=True)
    finca_info = FincaSimpleSerializer(source='finca', read_only=True)
    nombre_completo = serializers.CharField(read_only=True)
    tipo_documento_display = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tipo_cuenta_display = serializers.CharField(source='get_tipo_cuenta_bancaria_display', read_only=True)

    class Meta:
        model = Trabajador
        fields = [
            'id', 'nombres', 'apellidos', 'nombre_completo',
            'tipo_documento', 'tipo_documento_display', 'numero_documento',
            'lugar_expedicion_documento', 'fecha_nacimiento', 'nacionalidad',
            'telefono', 'direccion', 'correo', 'eps', 'arl',
            'tipo_contrato', 'tipo_contrato_info',
            'finca', 'finca_info',
            'es_administrativo', 'salario_quincenal',
            'fecha_ingreso', 'fecha_retiro', 'estado', 'estado_display',
            'numero_cuenta_bancaria', 'banco', 'tipo_cuenta_bancaria', 'tipo_cuenta_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Ocultar cuenta bancaria según rol del usuario"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Si no es SUPER_ADMIN, ocultar cuenta completa
        if request and hasattr(request, 'user'):
            user = request.user
            if not user.rol or user.rol.nombre != Rol.SUPER_ADMIN:
                data['numero_cuenta_bancaria'] = instance.cuenta_oculta
        
        return data


class TrabajadorCreateUpdateSerializer(serializers.ModelSerializer):
    fecha_retiro = serializers.DateField(required=False, allow_null=True, default=None)

    class Meta:
        model = Trabajador
        fields = [
            'nombres', 'apellidos', 'tipo_documento', 'numero_documento',
            'lugar_expedicion_documento', 'fecha_nacimiento', 'nacionalidad',
            'telefono', 'direccion', 'correo', 'eps', 'arl',
            'tipo_contrato', 'finca',
            'es_administrativo', 'salario_quincenal',
            'fecha_ingreso', 'fecha_retiro', 'estado',
            'numero_cuenta_bancaria', 'banco', 'tipo_cuenta_bancaria'
        ]

    def validate(self, data):
        # Validar que si es administrativo, tenga salario
        if data.get('es_administrativo') and not data.get('salario_quincenal'):
            raise serializers.ValidationError({
                'salario_quincenal': 'El salario quincenal es requerido para trabajadores administrativos'
            })

        # Auto-set fecha_retiro cuando el estado cambia a RETIRADO
        estado = data.get('estado')
        if estado == Trabajador.RETIRADO and not data.get('fecha_retiro'):
            data['fecha_retiro'] = date.today()

        return data
    
    def validate_numero_documento(self, value):
        """Validar que el documento sea único"""
        instance = getattr(self, 'instance', None)
        if instance and instance.numero_documento == value:
            return value
        
        if Trabajador.objects.filter(numero_documento=value).exists():
            raise serializers.ValidationError("Ya existe un trabajador con este número de documento")
        
        return value


# ============================================================================
# CATÁLOGOS
# ============================================================================

class UnidadMedidaSerializer(serializers.ModelSerializer):
    nombre_display = serializers.CharField(source='get_nombre_display', read_only=True)
    
    class Meta:
        model = UnidadMedida
        fields = ['id', 'nombre', 'nombre_display', 'descripcion']


class LaborListSerializer(serializers.ModelSerializer):
    unidad_medida_info = UnidadMedidaSerializer(source='unidad_medida', read_only=True)
    precio_actual = serializers.SerializerMethodField()
    
    class Meta:
        model = Labor
        fields = [
            'id', 'codigo', 'nombre', 'descripcion',
            'unidad_medida', 'unidad_medida_info',
            'es_especial', 'solo_con_contrato', 'activa',
            'precio_actual', 'created_at'
        ]
    
    def get_precio_actual(self, obj):
        """Obtener precio vigente actual"""
        from django.utils import timezone
        precio = obj.precios.filter(
            fecha_inicio_vigencia__lte=timezone.now().date(),
            fecha_fin_vigencia__isnull=True
        ).first()
        return precio.precio if precio else None


class LaborCreateUpdateSerializer(serializers.ModelSerializer):
    # Campos adicionales para crear el precio inicial (solo en creación)
    precio_inicial = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        write_only=True,
        help_text="Precio inicial de la labor (obligatorio al crear)"
    )
    fecha_inicio_vigencia_precio = serializers.DateField(
        required=False,
        write_only=True,
        help_text="Fecha desde cuando es válido el precio (obligatorio al crear)"
    )

    class Meta:
        model = Labor
        fields = [
            'codigo', 'nombre', 'descripcion', 'unidad_medida',
            'es_especial', 'solo_con_contrato', 'activa',
            'precio_inicial', 'fecha_inicio_vigencia_precio'
        ]
        extra_kwargs = {
            'codigo': {'read_only': True},
        }

    def validate(self, data):
        """Validar que al crear una labor se incluya el precio"""
        # Solo validar en creación (no en actualización)
        if not self.instance:  # Es creación
            if 'precio_inicial' not in data or data['precio_inicial'] is None:
                raise serializers.ValidationError({
                    'precio_inicial': 'El precio inicial es obligatorio al crear una labor.'
                })
            if 'fecha_inicio_vigencia_precio' not in data or data['fecha_inicio_vigencia_precio'] is None:
                raise serializers.ValidationError({
                    'fecha_inicio_vigencia_precio': 'La fecha de inicio de vigencia del precio es obligatoria al crear una labor.'
                })
            if data['precio_inicial'] < 0:
                raise serializers.ValidationError({
                    'precio_inicial': 'El precio no puede ser negativo.'
                })
        return data

    def create(self, validated_data):
        """Generar código automático y crear precio inicial"""
        # Extraer datos del precio
        precio_inicial = validated_data.pop('precio_inicial')
        fecha_inicio_vigencia_precio = validated_data.pop('fecha_inicio_vigencia_precio')

        # Generar código automático: LAB001, LAB002, etc.
        last = Labor.objects.order_by('-codigo').first()
        if last and last.codigo.startswith('LAB'):
            try:
                num = int(last.codigo[3:]) + 1
            except ValueError:
                num = Labor.objects.count() + 1
        else:
            num = 1
        validated_data['codigo'] = f'LAB{num:03d}'

        # Crear la labor
        labor = super().create(validated_data)

        # Crear el precio inicial automáticamente
        from core.models import ListaPrecios
        ListaPrecios.objects.create(
            labor=labor,
            precio=precio_inicial,
            fecha_inicio_vigencia=fecha_inicio_vigencia_precio,
            fecha_fin_vigencia=None,  # Sin fecha de fin = vigente indefinidamente
            created_by=self.context['request'].user
        )

        return labor


class ListaPreciosSerializer(serializers.ModelSerializer):
    labor_info = LaborListSerializer(source='labor', read_only=True)
    created_by_info = UsuarioSerializer(source='created_by', read_only=True)
    vigente = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ListaPrecios
        fields = [
            'id', 'labor', 'labor_info', 'precio',
            'fecha_inicio_vigencia', 'fecha_fin_vigencia',
            'vigente', 'created_at', 'created_by', 'created_by_info'
        ]
        read_only_fields = ['created_at', 'created_by']


class ListaPreciosCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListaPrecios
        fields = ['labor', 'precio', 'fecha_inicio_vigencia']
    
    def validate(self, data):
        """Validar que no haya otro precio vigente para la misma labor"""
        labor = data['labor']
        fecha_inicio = data['fecha_inicio_vigencia']
        
        # Buscar precios que se superpongan
        precios_superpuestos = ListaPrecios.objects.filter(
            labor=labor,
            fecha_inicio_vigencia__lte=fecha_inicio,
            fecha_fin_vigencia__isnull=True
        )
        
        if precios_superpuestos.exists():
            raise serializers.ValidationError(
                "Ya existe un precio vigente para esta labor. "
                "Debe cerrarse el precio anterior antes de crear uno nuevo."
            )
        
        return data
    
    def create(self, validated_data):
        # Cerrar precio anterior si existe
        labor = validated_data['labor']
        fecha_inicio = validated_data['fecha_inicio_vigencia']
        
        # Cerrar precios anteriores
        ListaPrecios.objects.filter(
            labor=labor,
            fecha_fin_vigencia__isnull=True,
            fecha_inicio_vigencia__lt=fecha_inicio
        ).update(fecha_fin_vigencia=fecha_inicio)
        
        # Crear nuevo precio
        return super().create(validated_data)


class VariablesNominaSerializer(serializers.ModelSerializer):
    nombre_display = serializers.CharField(source='get_nombre_display', read_only=True)
    created_by_info = UsuarioSerializer(source='created_by', read_only=True)
    vigente = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = VariablesNomina
        fields = [
            'id', 'nombre', 'nombre_display', 'valor',
            'fecha_inicio_vigencia', 'fecha_fin_vigencia',
            'descripcion', 'vigente',
            'created_at', 'created_by', 'created_by_info'
        ]
        read_only_fields = ['created_at', 'created_by']


# ============================================================================
# QUINCENAS Y REGISTROS
# ============================================================================

class QuincenaSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    puede_registrar = serializers.BooleanField(read_only=True)
    total_registros = serializers.SerializerMethodField()
    
    class Meta:
        model = Quincena
        fields = [
            'id', 'año', 'mes', 'numero',
            'fecha_inicio', 'fecha_fin', 'fecha_cierre_registro',
            'estado', 'estado_display', 'puede_registrar',
            'total_registros', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_total_registros(self, obj):
        return obj.registros.count()


class RegistroLaborSerializer(serializers.ModelSerializer):
    trabajador_info = TrabajadorListSerializer(source='trabajador', read_only=True)
    labor_info = LaborListSerializer(source='labor', read_only=True)
    quincena_info = QuincenaSerializer(source='quincena', read_only=True)
    created_by_info = UsuarioSerializer(source='created_by', read_only=True)
    updated_by_info = UsuarioSerializer(source='updated_by', read_only=True)
    
    class Meta:
        model = RegistroLabor
        fields = [
            'id', 'trabajador', 'trabajador_info',
            'labor', 'labor_info',
            'quincena', 'quincena_info',
            'fecha', 'cantidad', 'observaciones',
            'created_at', 'created_by', 'created_by_info',
            'updated_at', 'updated_by', 'updated_by_info'
        ]
        read_only_fields = ['created_at', 'created_by', 'updated_at', 'updated_by']
    
    def validate(self, attrs):
        """Validación adicional en el serializer"""
        # Crear una instancia temporal para ejecutar clean()
        instance = RegistroLabor(**attrs)
        if self.instance:
            instance.pk = self.instance.pk
        
        try:
            instance.clean()
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))
        
        return attrs


class RegistroLaborCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroLabor
        fields = ['trabajador', 'labor', 'quincena', 'fecha', 'cantidad', 'observaciones']
    
    def validate(self, data):
        """Validaciones de negocio"""
        quincena = data.get('quincena')
        fecha = data.get('fecha')
        labor = data.get('labor')
        cantidad = data.get('cantidad')
        trabajador = data.get('trabajador')

        # Validar que la fecha esté dentro de la quincena
        if fecha < quincena.fecha_inicio or fecha > quincena.fecha_fin:
            raise serializers.ValidationError(
                f"La fecha debe estar entre {quincena.fecha_inicio} y {quincena.fecha_fin}"
            )

        # Validar que "Domingo extra" solo se registre en domingos
        if labor and labor.nombre == 'Domingo extra':
            if fecha.weekday() != 6:  # 6 = domingo en Python
                raise serializers.ValidationError(
                    "La labor 'Domingo extra' solo puede registrarse en días domingo."
                )
        elif fecha and is_colombian_holiday(fecha):
            raise serializers.ValidationError(
                "No se pueden registrar labores en festivos de Colombia."
            )

        # Validar que la quincena permita registro
        if not quincena.puede_registrar:
            raise serializers.ValidationError(
                "Esta quincena ya no permite registros (fecha límite superada)"
            )

        # Validaciones específicas para "Horas Trabajadas"
        # Lista de labores adicionales que pueden combinarse libremente
        LABORES_ADICIONALES = ['Control', 'Resiembra CabezaToro', 'Siembra Nueva', 'Amarre', 'Amarre 3 pitas']

        if labor and labor.nombre == 'Horas Trabajadas':
            # Validación 1: No más de 8 horas por día
            if cantidad > 8:
                raise serializers.ValidationError(
                    "No se pueden registrar más de 8 horas por día. "
                    "Si trabajó horas extras, debe registrarlas con otra labor."
                )

            # Validación 2: No se puede combinar con otras labores NORMALES
            # Pero SÍ puede combinarse con labores adicionales
            registros_existentes = RegistroLabor.objects.filter(
                trabajador=trabajador,
                fecha=fecha,
                quincena=quincena
            ).select_related('labor')

            # Si estamos editando, excluir el registro actual
            if self.instance:
                registros_existentes = registros_existentes.exclude(pk=self.instance.pk)

            if registros_existentes.exists():
                # Verificar si hay otra "Horas Trabajadas"
                tiene_horas = registros_existentes.filter(labor__nombre='Horas Trabajadas').exists()
                if tiene_horas:
                    raise serializers.ValidationError(
                        f"Ya existe un registro de 'Horas Trabajadas' para el {fecha.strftime('%d/%m/%Y')}."
                    )

                # Verificar si hay labores normales (no adicionales)
                labores_normales = registros_existentes.exclude(labor__nombre__in=LABORES_ADICIONALES)
                if labores_normales.exists():
                    labor_normal = labores_normales.first().labor.nombre
                    raise serializers.ValidationError(
                        f"No se puede combinar 'Horas Trabajadas' con '{labor_normal}' (labor normal). "
                        f"Solo puede combinarse con labores adicionales."
                    )
                # Si solo hay labores adicionales, permitir (no hacer nada)

        # Validación inversa: Si se intenta registrar otra labor normal y ya existe "Horas Trabajadas"
        if labor and labor.nombre != 'Horas Trabajadas' and labor.nombre not in LABORES_ADICIONALES:
            registros_horas = RegistroLabor.objects.filter(
                trabajador=trabajador,
                fecha=fecha,
                quincena=quincena,
                labor__nombre='Horas Trabajadas'
            )

            # Si estamos editando, excluir el registro actual
            if self.instance:
                registros_horas = registros_horas.exclude(pk=self.instance.pk)

            if registros_horas.exists():
                raise serializers.ValidationError(
                    f"El trabajador ya tiene registrado 'Horas Trabajadas' para el {fecha.strftime('%d/%m/%Y')}. "
                    f"No se pueden combinar con otras labores normales."
                )
        # Si es una labor adicional, la validación se maneja en el modelo RegistroLabor.clean()

        return data


# ============================================================================
# NÓMINA
# ============================================================================

class DetalleNominaSerializer(serializers.ModelSerializer):
    labor_info = LaborListSerializer(source='labor', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    concepto_display = serializers.CharField(source='get_concepto_display', read_only=True)
    
    class Meta:
        model = DetalleNomina
        fields = [
            'id', 'tipo', 'tipo_display',
            'concepto', 'concepto_display',
            'descripcion', 'labor', 'labor_info',
            'cantidad', 'valor_unitario', 'valor_total',
            'created_at'
        ]


class NominaSerializer(serializers.ModelSerializer):
    trabajador_info = TrabajadorListSerializer(source='trabajador', read_only=True)
    quincena_info = QuincenaSerializer(source='quincena', read_only=True)
    detalles = DetalleNominaSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    created_by_info = UsuarioSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = Nomina
        fields = [
            'id', 'trabajador', 'trabajador_info',
            'quincena', 'quincena_info',
            'total_devengado', 'total_deducciones', 'total_neto',
            'estado', 'estado_display',
            'fecha_calculo', 'fecha_aprobacion',
            'devengos_adicionales', 'descripcion_devengos_adicionales',
            'deducciones_adicionales', 'descripcion_deducciones_adicionales',
            'observaciones', 'detalles',
            'created_at', 'created_by', 'created_by_info',
            'updated_at'
        ]
        read_only_fields = [
            'total_devengado', 'total_deducciones', 'total_neto',
            'fecha_calculo', 'created_at', 'updated_at'
        ]


# ============================================================================
# PRÉSTAMOS
# ============================================================================

class CuotaPrestamoSerializer(serializers.ModelSerializer):
    quincena_info = QuincenaSerializer(source='quincena', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = CuotaPrestamo
        fields = [
            'id', 'numero_cuota', 'valor_cuota',
            'quincena', 'quincena_info',
            'fecha_descuento', 'estado', 'estado_display',
            'created_at'
        ]


class PrestamoSerializer(serializers.ModelSerializer):
    trabajador_info = TrabajadorSimpleSerializer(source='trabajador', read_only=True)
    cuotas = CuotaPrestamoSerializer(many=True, read_only=True)
    tipo_pago_display = serializers.CharField(source='get_tipo_pago_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    created_by_info = UsuarioSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = Prestamo
        fields = [
            'id', 'trabajador', 'trabajador_info',
            'monto_total', 'fecha_prestamo',
            'tipo_pago', 'tipo_pago_display',
            'numero_cuotas', 'valor_cuota', 'saldo_pendiente',
            'estado', 'estado_display', 'observaciones',
            'cuotas', 'created_at', 'created_by', 'created_by_info',
            'updated_at'
        ]
        read_only_fields = ['valor_cuota', 'saldo_pendiente', 'created_at', 'created_by', 'updated_at']


class PrestamoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prestamo
        fields = [
            'trabajador', 'monto_total', 'tipo_pago',
            'numero_cuotas', 'fecha_prestamo', 'observaciones'
        ]
    
    def validate(self, data):
        # Validar monto máximo
        if data.get('monto_total') and data['monto_total'] > 3000000:
            raise serializers.ValidationError({
                'monto_total': 'El monto máximo permitido es $3,000,000'
            })
        
        # Validar que si es CUOTAS, tenga número de cuotas
        if data.get('tipo_pago') == 'CUOTAS' and not data.get('numero_cuotas'):
            raise serializers.ValidationError({
                'numero_cuotas': 'Debe especificar el número de cuotas'
            })
        
        # Validar que el trabajador no tenga préstamos activos
        trabajador = data.get('trabajador')
        if trabajador and Prestamo.objects.filter(trabajador=trabajador, estado='ACTIVO').exists():
            raise serializers.ValidationError({
                'trabajador': 'El trabajador ya tiene un préstamo activo'
            })
        
        return data
    
    def create(self, validated_data):
        """Crear préstamo y cuotas si corresponde"""
        tipo_pago = validated_data['tipo_pago']
        monto_total = validated_data['monto_total']
        numero_cuotas = validated_data.get('numero_cuotas', 1)

        # Calcular valor de cuota
        if tipo_pago == 'UNICO':
            valor_cuota = monto_total
            numero_cuotas = 1
        else:
            valor_cuota = (monto_total / numero_cuotas).quantize(Decimal('0.01'))

        # Crear préstamo con saldo pendiente
        prestamo = Prestamo.objects.create(
            **validated_data,
            valor_cuota=valor_cuota,
            saldo_pendiente=monto_total,
            estado='ACTIVO'
        )

        # Crear cuotas si es tipo CUOTAS
        if tipo_pago == 'CUOTAS':
            for i in range(1, numero_cuotas + 1):
                CuotaPrestamo.objects.create(
                    prestamo=prestamo,
                    numero_cuota=i,
                    valor_cuota=valor_cuota,
                    estado='PENDIENTE'
                )

        return prestamo


# ============================================================================
# AUDITORÍA
# ============================================================================

class AuditoriaLogSerializer(serializers.ModelSerializer):
    usuario_info = UsuarioSerializer(source='usuario', read_only=True)
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)

    class Meta:
        model = AuditoriaLog
        fields = [
            'id', 'usuario', 'usuario_info',
            'accion', 'accion_display',
            'tabla_afectada', 'registro_id',
            'datos_anteriores', 'datos_nuevos',
            'ip_address', 'created_at'
        ]
        read_only_fields = ['created_at']


# ============================================================================
# CONTRATOS
# ============================================================================

class DocumentoContratoSerializer(serializers.ModelSerializer):
    """Serializer para documentos de contrato"""
    tipo_documento_display = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    created_by_info = UsuarioSerializer(source='created_by', read_only=True)
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentoContrato
        fields = [
            'id', 'contrato', 'tipo_documento', 'tipo_documento_display',
            'nombre', 'archivo', 'archivo_url', 'descripcion',
            'fecha_documento', 'created_at', 'created_by', 'created_by_info'
        ]
        read_only_fields = ['created_at', 'created_by']

    def get_archivo_url(self, obj):
        """Obtener URL completa del archivo"""
        if obj.archivo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo.url)
            return obj.archivo.url
        return None


class ContratoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado de contratos"""
    trabajador_info = serializers.SerializerMethodField()
    tipo_contrato_display = serializers.CharField(source='get_tipo_contrato_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    motivo_finalizacion_display = serializers.CharField(source='get_motivo_finalizacion_display', read_only=True)

    # Properties calculadas
    duracion_meses = serializers.IntegerField(read_only=True)
    duracion_dias = serializers.IntegerField(read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True)
    esta_por_vencer = serializers.BooleanField(read_only=True)
    esta_vencido = serializers.BooleanField(read_only=True)
    progreso_contrato = serializers.FloatField(read_only=True)

    class Meta:
        model = Contrato
        fields = [
            'id', 'numero_contrato', 'trabajador', 'trabajador_info',
            'tipo_contrato', 'tipo_contrato_display',
            'fecha_inicio', 'fecha_fin', 'cargo', 'salario_pactado',
            'estado', 'estado_display',
            'motivo_finalizacion', 'motivo_finalizacion_display',
            'fecha_liquidacion', 'recibe_auxilio_transporte',
            # Properties calculadas
            'duracion_meses', 'duracion_dias', 'dias_restantes',
            'esta_por_vencer', 'esta_vencido', 'progreso_contrato',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['numero_contrato', 'created_at', 'updated_at']

    def get_trabajador_info(self, obj):
        """Información resumida del trabajador"""
        return {
            'id': obj.trabajador.id,
            'nombre_completo': obj.trabajador.nombre_completo,
            'numero_documento': obj.trabajador.numero_documento,
            'finca': obj.trabajador.finca.nombre if obj.trabajador.finca else None
        }


class ContratoDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de contrato"""
    trabajador_info = TrabajadorSimpleSerializer(source='trabajador', read_only=True)
    tipo_contrato_display = serializers.CharField(source='get_tipo_contrato_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    motivo_finalizacion_display = serializers.CharField(source='get_motivo_finalizacion_display', read_only=True)
    created_by_info = UsuarioSerializer(source='created_by', read_only=True)
    documentos = DocumentoContratoSerializer(many=True, read_only=True)

    # Properties calculadas
    duracion_meses = serializers.IntegerField(read_only=True)
    duracion_dias = serializers.IntegerField(read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True)
    esta_por_vencer = serializers.BooleanField(read_only=True)
    esta_vencido = serializers.BooleanField(read_only=True)
    progreso_contrato = serializers.FloatField(read_only=True)

    class Meta:
        model = Contrato
        fields = [
            'id', 'numero_contrato', 'trabajador', 'trabajador_info',
            'tipo_contrato', 'tipo_contrato_display',
            'fecha_inicio', 'fecha_fin', 'cargo', 'salario_pactado',
            'estado', 'estado_display',
            'motivo_finalizacion', 'motivo_finalizacion_display',
            'fecha_liquidacion', 'observaciones', 'recibe_auxilio_transporte',
            # Properties calculadas
            'duracion_meses', 'duracion_dias', 'dias_restantes',
            'esta_por_vencer', 'esta_vencido', 'progreso_contrato',
            # Documentos
            'documentos',
            # Auditoría
            'created_at', 'updated_at', 'created_by', 'created_by_info'
        ]
        read_only_fields = ['numero_contrato', 'created_at', 'updated_at', 'created_by']


class ContratoCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar contratos"""

    class Meta:
        model = Contrato
        fields = [
            'id', 'trabajador', 'tipo_contrato',
            'fecha_inicio', 'fecha_fin', 'cargo', 'salario_pactado',
            'estado', 'observaciones', 'recibe_auxilio_transporte'
        ]
        read_only_fields = ['id']

    def validate(self, data):
        from django.core.exceptions import ValidationError as DjangoValidationError
        # Construir instancia temporal para correr clean() del modelo
        instance = self.instance or Contrato()
        for attr, value in data.items():
            setattr(instance, attr, value)
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)
        return data

    def create(self, validated_data):
        """Crear contrato con usuario actual"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ContratoFinalizarSerializer(serializers.Serializer):
    """Serializer para finalizar un contrato"""
    motivo = serializers.ChoiceField(choices=Contrato.MOTIVO_FINALIZACION_CHOICES)
    observaciones = serializers.CharField(required=False, allow_blank=True)


class ContratoLiquidarSerializer(serializers.Serializer):
    """Serializer para liquidar un contrato"""
    fecha_liquidacion = serializers.DateField(required=False)
    observaciones = serializers.CharField(required=False, allow_blank=True)


class ContratoCancelarSerializer(serializers.Serializer):
    """Serializer para cancelar un contrato"""
    motivo = serializers.ChoiceField(choices=Contrato.MOTIVO_FINALIZACION_CHOICES)
    observaciones = serializers.CharField(required=False, allow_blank=True)


class ContratoReactivarSerializer(serializers.Serializer):
    """Serializer para reactivar un contrato"""
    observaciones = serializers.CharField(required=False, allow_blank=True)


# ============================================================================
# CONFIGURACIÓN EMPRESA
# ============================================================================

class ConfiguracionEmpresaSerializer(serializers.ModelSerializer):
    """Serializer para la configuración de empresa (singleton)"""
    tipo_documento_representante_display = serializers.CharField(
        source='get_tipo_documento_representante_display', read_only=True
    )
    periodo_pago_display = serializers.CharField(
        source='get_periodo_pago_display', read_only=True
    )

    class Meta:
        model = ConfiguracionEmpresa
        fields = [
            'id', 'razon_social', 'nit',
            'representante_legal', 'tipo_documento_representante',
            'tipo_documento_representante_display', 'documento_representante',
            'correo', 'telefono', 'direccion',
            'ciudad', 'departamento', 'logo_path',
            'periodo_pago', 'periodo_pago_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


# ============================================================================
# PILA - SEGURIDAD SOCIAL
# ============================================================================

class TrabajadorPILASerializer(serializers.ModelSerializer):
    """Serializer simplificado de trabajador para PILA"""
    class Meta:
        model = Trabajador
        fields = ['id', 'nombres', 'apellidos', 'numero_documento', 'nombre_completo', 'finca']


class DetallePILASerializer(serializers.ModelSerializer):
    """Serializer para detalle de aportes PILA por trabajador"""
    trabajador_info = TrabajadorPILASerializer(source='trabajador', read_only=True)

    class Meta:
        model = DetallePILA
        fields = [
            'id', 'pila', 'trabajador', 'trabajador_info',
            'ibc', 'dias_cotizados',
            'aporte_salud', 'aporte_pension', 'aporte_arl', 'aporte_caja',
            'total_aportes', 'nomina', 'created_at'
        ]
        read_only_fields = ['created_at']


class PILAListSerializer(serializers.ModelSerializer):
    """Serializer para listado de PILA"""
    periodo_display = serializers.CharField(read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    num_trabajadores = serializers.SerializerMethodField()

    class Meta:
        model = PILA
        fields = [
            'id', 'mes', 'año', 'tipo', 'tipo_display',
            'quincena', 'periodo_display',
            'total_ibc', 'total_salud', 'total_pension',
            'total_arl', 'total_caja', 'total_aportes',
            'estado', 'estado_display', 'fecha_pago',
            'numero_planilla', 'num_trabajadores'
        ]

    def get_num_trabajadores(self, obj):
        return obj.detalles.count()


class PILADetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de PILA con todos los aportes"""
    periodo_display = serializers.CharField(read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    detalles = DetallePILASerializer(many=True, read_only=True)
    created_by_info = UsuarioSerializer(source='created_by', read_only=True)

    class Meta:
        model = PILA
        fields = [
            'id', 'mes', 'año', 'tipo', 'tipo_display',
            'quincena', 'periodo_display',
            'total_ibc', 'total_salud', 'total_pension',
            'total_arl', 'total_caja', 'total_aportes',
            'estado', 'estado_display', 'fecha_pago',
            'numero_planilla', 'observaciones',
            'detalles', 'created_by', 'created_by_info',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class PILACreateSerializer(serializers.ModelSerializer):
    """Serializer para crear/calcular PILA"""

    class Meta:
        model = PILA
        fields = ['mes', 'año', 'tipo', 'quincena', 'observaciones']

    def validate(self, data):
        tipo = data.get('tipo', 'MES')
        if tipo == 'MES':
            if PILA.objects.filter(mes=data['mes'], año=data['año'], tipo='MES').exists():
                raise serializers.ValidationError(
                    f"Ya existe una PILA mensual para {data['mes']:02d}/{data['año']}"
                )
        elif tipo == 'QUINCENA':
            quincena = data.get('quincena')
            if quincena and PILA.objects.filter(quincena=quincena, tipo='QUINCENA').exists():
                raise serializers.ValidationError(
                    f"Ya existe una PILA para esa quincena"
                )
        return data


class PILAMarcarPagadaSerializer(serializers.Serializer):
    """Serializer para marcar PILA como pagada"""
    fecha_pago = serializers.DateField()
    numero_planilla = serializers.CharField(max_length=50)


# ============================================================================
# PRESTACIONES SOCIALES
# ============================================================================

class ProvisionPrestacionesSerializer(serializers.ModelSerializer):
    """Serializer para provisiones individuales por trabajador"""
    trabajador_info = TrabajadorPILASerializer(source='trabajador', read_only=True)

    class Meta:
        model = ProvisionPrestaciones
        fields = [
            'id', 'mes', 'año', 'trabajador', 'trabajador_info',
            'salario_base', 'cesantias', 'intereses_cesantias',
            'prima', 'vacaciones', 'total_provision',
            'nomina', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ResumenPrestacionesListSerializer(serializers.ModelSerializer):
    """Serializer para listado de resúmenes de prestaciones"""
    periodo_display = serializers.CharField(read_only=True)

    class Meta:
        model = ResumenPrestaciones
        fields = [
            'id', 'mes', 'año', 'periodo_display',
            'total_salario_base', 'total_cesantias',
            'total_intereses_cesantias', 'total_prima',
            'total_vacaciones', 'total_provisiones',
            'num_trabajadores', 'created_at'
        ]


class ResumenPrestacionesDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de resumen con provisiones individuales"""
    periodo_display = serializers.CharField(read_only=True)
    provisiones = serializers.SerializerMethodField()
    created_by_info = UsuarioSerializer(source='created_by', read_only=True)

    class Meta:
        model = ResumenPrestaciones
        fields = [
            'id', 'mes', 'año', 'periodo_display',
            'total_salario_base', 'total_cesantias',
            'total_intereses_cesantias', 'total_prima',
            'total_vacaciones', 'total_provisiones',
            'num_trabajadores', 'provisiones',
            'created_by', 'created_by_info',
            'created_at', 'updated_at'
        ]

    def get_provisiones(self, obj):
        provisiones = ProvisionPrestaciones.objects.filter(
            mes=obj.mes, año=obj.año
        ).select_related('trabajador')
        return ProvisionPrestacionesSerializer(provisiones, many=True).data


class ResumenPrestacionesCreateSerializer(serializers.Serializer):
    """Serializer para calcular prestaciones de un periodo"""
    mes = serializers.IntegerField(min_value=1, max_value=12)
    año = serializers.IntegerField(min_value=2020)

    def validate(self, data):
        if ResumenPrestaciones.objects.filter(mes=data['mes'], año=data['año']).exists():
            raise serializers.ValidationError(
                f"Ya existe un resumen de prestaciones para {data['mes']:02d}/{data['año']}"
            )
        return data


# ============================================================================
# RESUMEN OBLIGACIONES LABORALES (Dashboard)
# ============================================================================

class ObligacionesResumenSerializer(serializers.Serializer):
    """Serializer para resumen general de obligaciones laborales"""
    # PILA del mes actual
    pila_mes_actual = PILAListSerializer(allow_null=True)
    pila_pendientes = serializers.IntegerField()
    total_pila_pendiente = serializers.DecimalField(max_digits=15, decimal_places=2)

    # Prestaciones del mes actual
    prestaciones_mes_actual = ResumenPrestacionesListSerializer(allow_null=True)
    total_provisiones_año = serializers.DecimalField(max_digits=15, decimal_places=2)

    # Porcentajes vigentes
    porcentajes = serializers.DictField()


class PorcentajesObligacionesSerializer(serializers.Serializer):
    """Serializer para mostrar los porcentajes de obligaciones"""
    # Seguridad Social
    salud_empleador = serializers.DecimalField(max_digits=5, decimal_places=3)
    pension_empleador = serializers.DecimalField(max_digits=5, decimal_places=3)
    arl = serializers.DecimalField(max_digits=5, decimal_places=4)
    caja_compensacion = serializers.DecimalField(max_digits=5, decimal_places=3)
    total_seguridad_social = serializers.DecimalField(max_digits=5, decimal_places=3)

    # Prestaciones Sociales
    cesantias = serializers.DecimalField(max_digits=5, decimal_places=4)
    intereses_cesantias = serializers.DecimalField(max_digits=5, decimal_places=4)
    prima = serializers.DecimalField(max_digits=5, decimal_places=4)
    vacaciones = serializers.DecimalField(max_digits=5, decimal_places=4)
    total_prestaciones = serializers.DecimalField(max_digits=5, decimal_places=4)
