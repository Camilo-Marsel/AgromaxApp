# backend/core/models/config.py

from django.db import models
from django.core.exceptions import ValidationError


class ConfiguracionEmpresa(models.Model):
    razon_social = models.CharField(max_length=200, verbose_name='Razón Social')
    nit = models.CharField(max_length=20, verbose_name='NIT')
    representante_legal = models.CharField(max_length=200, verbose_name='Representante Legal')
    tipo_documento_representante = models.CharField(
        max_length=10,
        choices=[('CC', 'Cédula de Ciudadanía'), ('CE', 'Cédula de Extranjería'), ('PAS', 'Pasaporte')],
        default='CC',
        verbose_name='Tipo Documento Representante'
    )
    documento_representante = models.CharField(max_length=20, verbose_name='Documento Representante')
    correo = models.EmailField(verbose_name='Correo Electrónico')
    telefono = models.CharField(max_length=20, verbose_name='Teléfono')
    direccion = models.CharField(max_length=300, verbose_name='Dirección')
    ciudad = models.CharField(max_length=100, verbose_name='Ciudad', blank=True)
    departamento = models.CharField(max_length=100, verbose_name='Departamento', blank=True)
    logo_path = models.CharField(max_length=300, default='logos/logo_completo.jpeg', verbose_name='Ruta del Logo')

    # Configuración de producción
    umbral_desviacion_produccion = models.DecimalField(
        max_digits=5, decimal_places=2, default=10,
        verbose_name='Umbral desviación producción (%)',
        help_text='Porcentaje de desviación permitido antes de emitir alerta (default 10%)'
    )
    umbral_matas_sin_reportar = models.PositiveIntegerField(
        default=5,
        verbose_name='Umbral matas sin reportar',
        help_text='Número máximo de matas sin reportar antes de emitir alerta (default 5)'
    )

    # Configuración de nómina
    periodo_pago = models.CharField(
        max_length=20,
        choices=[('QUINCENAL', 'Quincenal'), ('MENSUAL', 'Mensual'), ('SEMANAL', 'Semanal')],
        default='QUINCENAL',
        verbose_name='Período de Pago'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuración de Empresa"
        verbose_name_plural = "Configuración de Empresa"

    def __str__(self):
        return self.razon_social

    def clean(self):
        if not self.pk and ConfiguracionEmpresa.objects.exists():
            raise ValidationError('Solo puede existir una configuración de empresa. Edite el registro existente.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        config, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'razon_social': 'AGROMAXD S.A.S.',
                'nit': '901944190-0',
                'representante_legal': 'LESLIE JOHANA VANEGAS DUQUE',
                'documento_representante': '43149280',
                'correo': 'agromaxd@gmail.com',
                'telefono': '333 724 3020',
                'direccion': 'BELÉN DE BAJIRÁ',
                'ciudad': 'Belén de Bajirá',
                'departamento': 'Chocó',
            }
        )
        return config
