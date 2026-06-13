# backend/core/models/produccion.py

from decimal import Decimal, InvalidOperation
from django.db import models
from django.core.validators import MinValueValidator


COLORES_CINTA = [
    ('ROJO',     'Rojo'),
    ('VERDE',    'Verde'),
    ('AZUL',     'Azul'),
    ('AMARILLO', 'Amarillo'),
    ('NEGRO',    'Negro'),
    ('BLANCO',   'Blanco'),
    ('NARANJA',  'Naranja'),
    ('MORADO',   'Morado'),
    ('ROSADO',   'Rosado'),
    ('CAFE',     'Café'),
]


class MataCaida(models.Model):
    """
    Registro de matas caídas durante el ciclo de 10 semanas.
    Finca obligatoria; lote opcional (si se conoce el lote específico).
    """
    finca = models.ForeignKey(
        'Finca', on_delete=models.CASCADE, related_name='matas_caidas',
    )
    lote = models.ForeignKey(
        'Lote', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='matas_caidas',
    )
    color_cinta = models.CharField(max_length=10, choices=COLORES_CINTA)
    # Semana ISO en formato "YYYY-WW" de cuando fueron encintadas
    semana_año = models.CharField(
        max_length=8,
        help_text='Semana de encintado, formato YYYY-WW (ej: 2026-23)',
    )
    cantidad_caidas = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
    )
    fecha_reporte = models.DateField()
    observaciones = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'Usuario', on_delete=models.SET_NULL, null=True,
        related_name='matas_caidas_creadas',
    )

    class Meta:
        db_table = 'matas_caidas'
        verbose_name = 'Mata Caída'
        verbose_name_plural = 'Matas Caídas'
        ordering = ['-fecha_reporte']

    def __str__(self):
        ubicacion = self.lote or self.finca
        return f'{ubicacion} / {self.color_cinta} / sem {self.semana_año} — {self.cantidad_caidas}'


class Embarque(models.Model):
    """
    Registro del corte y empaque semanal a nivel de finca.
    Lote opcional para mayor granularidad cuando se conoce.
    """
    finca = models.ForeignKey(
        'Finca', on_delete=models.CASCADE, related_name='embarques',
    )
    lote = models.ForeignKey(
        'Lote', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='embarques',
    )
    fecha_embarque = models.DateField()
    semana_año = models.CharField(
        max_length=8,
        help_text='Semana ISO del color principal cortado, formato YYYY-WW',
    )
    color_cinta = models.CharField(
        max_length=10, choices=COLORES_CINTA,
        help_text='Color de la semana principal cortada',
    )

    # Cintas contadas en empacadora (pueden venir de 3 semanas)
    cintas_semana_actual    = models.PositiveIntegerField(default=0)
    cintas_semana_anterior  = models.PositiveIntegerField(default=0)
    cintas_semana_siguiente = models.PositiveIntegerField(default=0)

    # Resultado
    cajas_empacadas  = models.PositiveIntegerField()
    cajas_rechazadas = models.PositiveIntegerField(default=0)
    observaciones    = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'Usuario', on_delete=models.SET_NULL, null=True,
        related_name='embarques_creados',
    )

    class Meta:
        db_table = 'embarques'
        verbose_name = 'Embarque'
        verbose_name_plural = 'Embarques'
        ordering = ['-fecha_embarque']

    def __str__(self):
        ref = f'Lote {self.lote}' if self.lote else str(self.finca)
        return f'{ref} — {self.fecha_embarque} ({self.color_cinta})'

    # ── Propiedades calculadas ────────────────────────────────────────────────

    @property
    def total_cintas(self):
        return self.cintas_semana_actual + self.cintas_semana_anterior + self.cintas_semana_siguiente

    @property
    def cajas_netas(self):
        return max(0, self.cajas_empacadas - self.cajas_rechazadas)

    @property
    def ratio(self):
        """Cintas por caja neta. None si cajas_netas == 0."""
        if not self.cajas_netas:
            return None
        try:
            return round(Decimal(str(self.total_cintas)) / Decimal(str(self.cajas_netas)), 4)
        except (InvalidOperation, ZeroDivisionError):
            return None
