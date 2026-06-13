# backend/core/models/farm.py

from django.db import models

# ============================================================================
# BODEGA
# ============================================================================

class Bodega(models.Model):
    """Bodega física compartida entre una o varias fincas."""
    nombre      = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activa      = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bodegas'
        verbose_name = 'Bodega'
        verbose_name_plural = 'Bodegas'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


# ============================================================================
# FINCAS Y LOTES
# ============================================================================

class Finca(models.Model):
    """Fincas donde trabajan los empleados"""
    nombre    = models.CharField(max_length=100, unique=True)
    ubicacion = models.CharField(max_length=200, blank=True, null=True)
    bodega    = models.ForeignKey(
        Bodega, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fincas',
    )
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fincas'
        verbose_name = 'Finca'
        verbose_name_plural = 'Fincas'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Lote(models.Model):
    """Lotes que pertenecen a una finca"""
    UNIDAD_MEDIDA_CHOICES = [
        ('HECTAREA', 'Hectárea'),
        ('METRO_CUADRADO', 'Metro Cuadrado'),
    ]

    finca = models.ForeignKey(
        Finca,
        on_delete=models.CASCADE,
        related_name='lotes'
    )
    nombre = models.CharField(max_length=100)
    medida = models.DecimalField(max_digits=10, decimal_places=2)
    unidad_medida = models.CharField(
        max_length=20,
        choices=UNIDAD_MEDIDA_CHOICES,
        default='HECTAREA'
    )
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lotes'
        verbose_name = 'Lote'
        verbose_name_plural = 'Lotes'
        ordering = ['finca', 'nombre']
        unique_together = [['finca', 'nombre']]

    def __str__(self):
        return f"{self.finca.nombre} - {self.nombre}"
