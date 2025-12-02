# backend/core/serializers.py

from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    Usuario, Rol, TipoContrato, Trabajador,
    UnidadMedida, Labor, ListaPrecios, VariablesNomina,
    Quincena, RegistroLabor, Nomina, DetalleNomina,
    Prestamo, CuotaPrestamo, AuditoriaLog
)
from decimal import Decimal

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


class UsuarioSerializer(serializers.ModelSerializer):
    rol_info = RolSerializer(source='rol', read_only=True)
    nombre_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'nombre_completo', 'rol', 'rol_info', 'es_activo',
            'ultimo_acceso', 'date_joined'
        ]
        read_only_fields = ['date_joined', 'ultimo_acceso']
    
    def get_nombre_completo(self, obj):
        return obj.get_full_name() or obj.username


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = Usuario
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'rol', 'es_activo'
        ]
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = Usuario.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


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


class TrabajadorListSerializer(serializers.ModelSerializer):
    """Serializer para listado (sin info bancaria completa)"""
    tipo_contrato_info = TipoContratoSerializer(source='tipo_contrato', read_only=True)
    nombre_completo = serializers.CharField(read_only=True)
    cuenta_oculta = serializers.CharField(read_only=True)
    tipo_documento_display = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = Trabajador
        fields = [
            'id', 'nombres', 'apellidos', 'nombre_completo',
            'tipo_documento', 'tipo_documento_display', 'numero_documento',
            'fecha_nacimiento', 'telefono', 'correo',
            'tipo_contrato', 'tipo_contrato_info',
            'fecha_ingreso', 'fecha_retiro', 'estado', 'estado_display',
            'cuenta_oculta', 'banco',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TrabajadorDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle (con info bancaria para SUPER_ADMIN)"""
    tipo_contrato_info = TipoContratoSerializer(source='tipo_contrato', read_only=True)
    nombre_completo = serializers.CharField(read_only=True)
    tipo_documento_display = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = Trabajador
        fields = [
            'id', 'nombres', 'apellidos', 'nombre_completo',
            'tipo_documento', 'tipo_documento_display', 'numero_documento',
            'lugar_expedicion_documento', 'fecha_nacimiento',
            'telefono', 'direccion', 'correo', 'eps',
            'tipo_contrato', 'tipo_contrato_info',
            'fecha_ingreso', 'fecha_retiro', 'estado', 'estado_display',
            'numero_cuenta_bancaria', 'banco',
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
    class Meta:
        model = Trabajador
        fields = [
            'nombres', 'apellidos', 'tipo_documento', 'numero_documento',
            'lugar_expedicion_documento', 'fecha_nacimiento',
            'telefono', 'direccion', 'correo', 'eps',
            'tipo_contrato', 'fecha_ingreso', 'fecha_retiro', 'estado',
            'numero_cuenta_bancaria', 'banco'
        ]
    
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
    class Meta:
        model = Labor
        fields = [
            'codigo', 'nombre', 'descripcion', 'unidad_medida',
            'es_especial', 'solo_con_contrato', 'activa'
        ]
    
    def validate_codigo(self, value):
        """Validar que el código sea único"""
        instance = getattr(self, 'instance', None)
        if instance and instance.codigo == value:
            return value
        
        if Labor.objects.filter(codigo=value).exists():
            raise serializers.ValidationError("Ya existe una labor con este código")
        
        return value


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


class RegistroLaborCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroLabor
        fields = ['trabajador', 'labor', 'quincena', 'fecha', 'cantidad', 'observaciones']
    
    def validate(self, data):
        """Validaciones de negocio"""
        quincena = data.get('quincena')
        fecha = data.get('fecha')
        
        # Validar que la fecha esté dentro de la quincena
        if fecha < quincena.fecha_inicio or fecha > quincena.fecha_fin:
            raise serializers.ValidationError(
                f"La fecha debe estar entre {quincena.fecha_inicio} y {quincena.fecha_fin}"
            )
        
        # Validar que la quincena permita registro
        if not quincena.puede_registrar:
            raise serializers.ValidationError(
                "Esta quincena ya no permite registros (fecha límite superada)"
            )
        
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
            'fecha_calculo', 'fecha_aprobacion', 'fecha_pago',
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
    trabajador_info = TrabajadorListSerializer(source='trabajador', read_only=True)
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
            'cuotas', 'created_at', 'created_by', 'created_by_info'
        ]
        read_only_fields = ['saldo_pendiente', 'created_at', 'created_by']


class PrestamoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prestamo
        fields = [
            'trabajador', 'monto_total', 'fecha_prestamo',
            'tipo_pago', 'numero_cuotas', 'observaciones'
        ]
    
    def validate(self, data):
        """Validar lógica de préstamos"""
        tipo_pago = data.get('tipo_pago')
        numero_cuotas = data.get('numero_cuotas')
        monto_total = data.get('monto_total')
        
        if tipo_pago == Prestamo.TIPO_PAGO_CHOICES[1][0]:  # CUOTAS
            if not numero_cuotas or numero_cuotas < 1:
                raise serializers.ValidationError(
                    "Debe especificar el número de cuotas para préstamos a cuotas"
                )
        
        return data
    
    def create(self, validated_data):
        """Crear préstamo y sus cuotas si aplica"""
        tipo_pago = validated_data['tipo_pago']
        monto_total = validated_data['monto_total']
        numero_cuotas = validated_data.get('numero_cuotas')
        
        # Calcular valor de cuota si es a cuotas
        if tipo_pago == 'CUOTAS' and numero_cuotas:
            validated_data['valor_cuota'] = monto_total / numero_cuotas
        
        # Inicializar saldo pendiente
        validated_data['saldo_pendiente'] = monto_total
        
        # Crear préstamo
        prestamo = super().create(validated_data)
        
        # Crear cuotas si es a cuotas
        if tipo_pago == 'CUOTAS':
            valor_cuota = prestamo.valor_cuota
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