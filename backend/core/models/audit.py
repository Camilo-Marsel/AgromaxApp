# backend/core/models/audit.py

from django.db import models

# ============================================================================
# AUDITORÍA
# ============================================================================

class AuditoriaLog(models.Model):
    """Registro de todas las acciones importantes en el sistema"""

    ACCION_CHOICES = [
        ('CREATE', 'Crear'),
        ('UPDATE', 'Actualizar'),
        ('DELETE', 'Eliminar'),
        ('VIEW_SENSITIVE', 'Ver Información Sensible'),
    ]

    usuario = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        related_name='acciones_auditoria'
    )
    accion = models.CharField(max_length=20, choices=ACCION_CHOICES)
    tabla_afectada = models.CharField(max_length=100)
    registro_id = models.IntegerField()
    datos_anteriores = models.JSONField(null=True, blank=True)
    datos_nuevos = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log de Auditoría"
        verbose_name_plural = "Logs de Auditoría"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tabla_afectada', 'registro_id']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.usuario} - {self.get_accion_display()} - {self.tabla_afectada} ({self.created_at})"
