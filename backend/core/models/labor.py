# backend/core/models/labor.py

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.utils import is_colombian_holiday

# ============================================================================
# CATÁLOGOS DE LABORES
# ============================================================================

class UnidadMedida(models.Model):
    """Unidades de medida para labores"""

    DIA = 'DIA'
    UNIDAD = 'UNIDAD'
    HECTAREA = 'HECTAREA'
    METRO = 'METRO'
    HORAS = 'HORAS'

    UNIDAD_CHOICES = [
        (DIA, 'Día'),
        (UNIDAD, 'Unidad'),
        (HECTAREA, 'Hectárea'),
        (METRO, 'Metro'),
        (HORAS, 'Horas'),
    ]

    nombre = models.CharField(max_length=20, choices=UNIDAD_CHOICES, unique=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = "Unidad de Medida"
        verbose_name_plural = "Unidades de Medida"

    def __str__(self):
        return self.get_nombre_display()


class Labor(models.Model):
    """Catálogo de labores (84+)"""

    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        related_name='labores'
    )
    es_especial = models.BooleanField(
        default=False,
        help_text="True para: festivo, incapacidad, ausencia no justificada, dominical"
    )
    solo_con_contrato = models.BooleanField(
        default=False,
        help_text="True para festivos y dominicales"
    )
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Labor"
        verbose_name_plural = "Labores"
        ordering = ['nombre']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class ListaPrecios(models.Model):
    """Histórico de precios de cada labor con vigencias"""

    labor = models.ForeignKey(
        Labor,
        on_delete=models.CASCADE,
        related_name='precios'
    )
    precio = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    fecha_inicio_vigencia = models.DateField()
    fecha_fin_vigencia = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='precios_creados'
    )

    class Meta:
        verbose_name = "Lista de Precio"
        verbose_name_plural = "Listas de Precios"
        ordering = ['-fecha_inicio_vigencia']
        constraints = [
            models.UniqueConstraint(
                fields=['labor', 'fecha_inicio_vigencia'],
                name='unique_labor_fecha_inicio'
            )
        ]

    def __str__(self):
        return f"{self.labor.nombre} - ${self.precio} ({self.fecha_inicio_vigencia})"

    @property
    def vigente(self):
        """Verifica si este precio está vigente actualmente"""
        from django.utils import timezone
        hoy = timezone.now().date()
        return (self.fecha_inicio_vigencia <= hoy and
                (self.fecha_fin_vigencia is None or self.fecha_fin_vigencia >= hoy))


# ============================================================================
# QUINCENAS Y REGISTROS
# ============================================================================

class Quincena(models.Model):
    """Períodos de nómina (1-15, 16-fin de mes)"""

    ESTADO_CHOICES = [
        ('ABIERTA', 'Abierta'),
        ('EN_CALCULO', 'En Cálculo'),
        ('CALCULADA', 'Calculada'),
        ('PAGADA', 'Pagada'),
    ]

    año = models.IntegerField()
    mes = models.IntegerField()  # 1-12
    numero = models.IntegerField()  # 1 o 2
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    fecha_cierre_registro = models.DateField(
        help_text="15 días después de fecha_fin para permitir correcciones"
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ABIERTA')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Quincena"
        verbose_name_plural = "Quincenas"
        ordering = ['-año', '-mes', '-numero']
        constraints = [
            models.UniqueConstraint(
                fields=['año', 'mes', 'numero'],
                name='unique_quincena'
            )
        ]

    def __str__(self):
        return f"{self.año}-{self.mes:02d} Quincena {self.numero}"

    @property
    def puede_registrar(self):
        """Verifica si se pueden registrar labores"""
        from django.utils import timezone
        hoy = timezone.now().date()
        return hoy <= self.fecha_cierre_registro


class RegistroLabor(models.Model):
    """Registro diario de labores realizadas por cada trabajador"""

    trabajador = models.ForeignKey(
        'Trabajador',
        on_delete=models.CASCADE,
        related_name='registros_labor'
    )
    labor = models.ForeignKey(
        Labor,
        on_delete=models.PROTECT,
        related_name='registros'
    )
    quincena = models.ForeignKey(
        Quincena,
        on_delete=models.CASCADE,
        related_name='registros'
    )
    fecha = models.DateField()
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        validators=[MinValueValidator(Decimal('0.0001'))],
        help_text="Cantidad según unidad de medida"
    )
    observaciones = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='registros_creados'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='registros_actualizados'
    )

    class Meta:
        db_table = 'registros_labor'
        verbose_name = 'Registro de Labor'
        verbose_name_plural = 'Registros de Labor'
        ordering = ['-fecha', 'trabajador']
        # REMOVER: unique_together = [['trabajador', 'fecha', 'quincena']]
        # Ya no hay restricción única, la validación será en clean()

    def __str__(self):
        return f"{self.trabajador.nombre_completo} - {self.labor.nombre} - {self.fecha}"

    def clean(self):
        """Validaciones personalizadas"""
        from django.core.exceptions import ValidationError

        # Validar que no sea domingo
        if self.fecha.weekday() == 6:  # 6 = domingo
            raise ValidationError('No se pueden registrar labores en domingo')

        if is_colombian_holiday(self.fecha):
            raise ValidationError('No se pueden registrar labores en festivos de Colombia')

        # Validar que la fecha esté dentro de la quincena
        if not (self.quincena.fecha_inicio <= self.fecha <= self.quincena.fecha_fin):
            raise ValidationError('La fecha debe estar dentro de la quincena')

        # Labores especiales que pueden agregarse como "adicionales" a cualquier día
        LABORES_ADICIONALES = ['Control', 'Resiembra CabezaToro', 'Siembra Nueva', 'Amarre', 'Amarre 3 pitas']

        # Validar duplicados: NO permitir múltiples labores "normales" el mismo día
        # EXCEPCIÓN: Las labores adicionales pueden agregarse libremente
        #
        # Regla: Máximo 1 labor normal + cualquier combinación de labores adicionales
        #
        # Ejemplos válidos:
        # - Día Básico (1 normal)
        # - Día Básico + Control (1 normal + 1 adicional)
        # - Día Básico + Resiembra CabezaToro + Siembra Nueva (1 normal + 2 adicionales)
        # - Control + Resiembra CabezaToro + Siembra Nueva (3 adicionales)
        # - Resiembra CabezaToro + Siembra Nueva (2 adicionales)
        # - Día Básico + Amarre + Amarre 3 pitas (1 normal + 2 adicionales)

        registros_mismo_dia = RegistroLabor.objects.filter(
            trabajador=self.trabajador,
            fecha=self.fecha,
            quincena=self.quincena
        )

        # Si estamos editando, excluir el registro actual
        if self.pk:
            registros_mismo_dia = registros_mismo_dia.exclude(pk=self.pk)

        if registros_mismo_dia.exists():
            # Obtener las labores existentes ese día
            labores_existentes = list(registros_mismo_dia.values_list('labor__nombre', flat=True))
            labor_actual = self.labor.nombre

            # Clasificar labores existentes
            labores_normales_existentes = [l for l in labores_existentes if l not in LABORES_ADICIONALES]
            labores_adicionales_existentes = [l for l in labores_existentes if l in LABORES_ADICIONALES]

            # Si la labor actual es adicional, siempre puede agregarse
            if labor_actual in LABORES_ADICIONALES:
                # Verificar que no esté duplicada (no puede haber 2 veces la misma labor adicional)
                if labor_actual in labores_existentes:
                    raise ValidationError(
                        f'Ya existe un registro de {labor_actual} para este día.'
                    )
                # Si no está duplicada, permitir agregarla
                pass
            else:
                # Es una labor normal, verificar que no haya otra labor normal
                if labores_normales_existentes:
                    # Ya existe una labor normal, no permitir otra
                    raise ValidationError(
                        f'Ya existe un registro de {labores_normales_existentes[0]} para este día. '
                        f'Solo puede agregar labores adicionales (Control, Resiembra CabezaToro, Siembra Nueva, Amarre, Amarre 3 pitas).'
                    )
                # Si no hay labores normales, permitir agregar esta
                pass

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
