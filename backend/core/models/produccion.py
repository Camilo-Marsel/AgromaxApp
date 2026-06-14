# backend/core/models/produccion.py

from decimal import Decimal, InvalidOperation
from django.db import models
from django.core.validators import MinValueValidator


# Ciclo de 10 colores en orden. Semana ISO 1 = MORADO, luego repite.
COLORES_CINTA = [
    ('MORADO',   'Morado'),
    ('CAFE',     'Café'),
    ('NEGRO',    'Negro'),
    ('NARANJA',  'Naranja'),
    ('VERDE',    'Verde'),
    ('AMARILLO', 'Amarillo'),
    ('BLANCO',   'Blanco'),
    ('AZUL',     'Azul'),
    ('HABANO',   'Habano'),
    ('GRIS',     'Gris'),
]

COLOR_CYCLE = [c[0] for c in COLORES_CINTA]  # índice 0=MORADO

def color_para_semana(semana_iso: int) -> str:
    """Devuelve el color esperado dado un número de semana ISO (1-based)."""
    return COLOR_CYCLE[(semana_iso - 1) % 10]


class MataCaida(models.Model):
    """
    Registro de matas caídas durante el ciclo de 10 semanas.
    Finca obligatoria; lote opcional (si se conoce el lote específico).
    """
    finca = models.ForeignKey(
        'Finca', on_delete=models.CASCADE,
        related_name='matas_caidas', verbose_name='Finca'
    )
    lote = models.ForeignKey(
        'Lote', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='matas_caidas', verbose_name='Lote'
    )
    color_cinta = models.CharField(max_length=10, choices=COLORES_CINTA)
    semana_año = models.CharField(
        max_length=8,
        verbose_name='Semana (YYYY-WW)',
        help_text='Semana ISO en la que se embolsó la mata (ej: 2026-23)'
    )
    cantidad_caidas = models.PositiveIntegerField(verbose_name='Cantidad caídas')
    fecha_reporte = models.DateField(verbose_name='Fecha de reporte')
    observaciones = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        'Usuario', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='matas_caidas_creadas'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Mata Caída'
        verbose_name_plural = 'Matas Caídas'
        ordering = ['-fecha_reporte']

    def __str__(self):
        ubicacion = self.lote.nombre if self.lote else self.finca.nombre
        return f'{ubicacion} / {self.color_cinta} / sem {self.semana_año} — {self.cantidad_caidas}'


class Embarque(models.Model):
    """
    Registro de un corte/embarque de banano.
    Finca obligatoria; lote opcional.
    Las cintas se cuentan en tres semanas (anterior/actual/siguiente) para capturar
    la variabilidad del ciclo de maduración.
    """
    finca = models.ForeignKey(
        'Finca', on_delete=models.CASCADE,
        related_name='embarques', verbose_name='Finca'
    )
    lote = models.ForeignKey(
        'Lote', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='embarques', verbose_name='Lote'
    )
    fecha_embarque = models.DateField(verbose_name='Fecha de embarque')
    semana_año = models.CharField(
        max_length=8,
        verbose_name='Semana (YYYY-WW)',
        help_text='Semana ISO del embarque (ej: 2026-24)'
    )
    color_cinta = models.CharField(
        max_length=10, choices=COLORES_CINTA,
        verbose_name='Color de cinta cortada'
    )

    # Cintas contadas en empacadora (pueden venir de 3 semanas distintas)
    cintas_semana_anterior  = models.PositiveIntegerField(default=0, verbose_name='Cintas sem. anterior')
    cintas_semana_actual    = models.PositiveIntegerField(default=0, verbose_name='Cintas sem. actual')
    cintas_semana_siguiente = models.PositiveIntegerField(default=0, verbose_name='Cintas sem. siguiente')

    cajas_empacadas  = models.PositiveIntegerField(verbose_name='Cajas empacadas')
    cajas_rechazadas = models.PositiveIntegerField(default=0, verbose_name='Cajas rechazadas')

    observaciones = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        'Usuario', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='embarques_creados'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Embarque'
        verbose_name_plural = 'Embarques'
        ordering = ['-fecha_embarque']

    def __str__(self):
        ref = self.lote.nombre if self.lote else self.finca.nombre
        return f'{ref} — {self.fecha_embarque} ({self.color_cinta})'

    @property
    def total_cintas(self) -> int:
        return self.cintas_semana_anterior + self.cintas_semana_actual + self.cintas_semana_siguiente

    @property
    def cajas_netas(self) -> int:
        return max(0, self.cajas_empacadas - self.cajas_rechazadas)

    @property
    def ratio(self):
        """Matas por caja. None si cajas_netas == 0."""
        if self.cajas_netas == 0:
            return None
        try:
            return round(Decimal(str(self.total_cintas)) / Decimal(str(self.cajas_netas)), 4)
        except (InvalidOperation, ZeroDivisionError):
            return None
