# backend/core/models/config.py

from django.db import models
from django.core.exceptions import ValidationError


class ConfiguracionEmpresa(models.Model):
    """
    Configuración de la empresa empleadora.
    Solo debe existir un registro (singleton pattern).
    Se usa para generar contratos y documentos legales.
    """

    # Información básica de la empresa
    razon_social = models.CharField(
        max_length=200,
        verbose_name='Razón Social',
        help_text='Nombre legal de la empresa (ej: AGROMAXD S.A.S.)'
    )

    nit = models.CharField(
        max_length=20,
        verbose_name='NIT',
        help_text='Número de Identificación Tributaria (ej: 901944190-0)'
    )

    # Representante Legal
    representante_legal = models.CharField(
        max_length=200,
        verbose_name='Representante Legal',
        help_text='Nombre completo del representante legal'
    )

    tipo_documento_representante = models.CharField(
        max_length=10,
        choices=[
            ('CC', 'Cédula de Ciudadanía'),
            ('CE', 'Cédula de Extranjería'),
            ('PAS', 'Pasaporte'),
        ],
        default='CC',
        verbose_name='Tipo Documento Representante'
    )

    documento_representante = models.CharField(
        max_length=20,
        verbose_name='Documento Representante',
        help_text='Número de documento del representante legal'
    )

    # Contacto de la empresa
    correo = models.EmailField(
        verbose_name='Correo Electrónico',
        help_text='Correo oficial de la empresa'
    )

    telefono = models.CharField(
        max_length=20,
        verbose_name='Teléfono',
        help_text='Teléfono de contacto de la empresa'
    )

    direccion = models.CharField(
        max_length=300,
        verbose_name='Dirección',
        help_text='Dirección principal de la empresa'
    )

    # Información adicional para contratos
    ciudad = models.CharField(
        max_length=100,
        verbose_name='Ciudad',
        help_text='Ciudad donde opera la empresa',
        blank=True
    )

    departamento = models.CharField(
        max_length=100,
        verbose_name='Departamento',
        blank=True
    )

    # Logo de la empresa (ruta relativa)
    logo_path = models.CharField(
        max_length=300,
        default='logos/logo_completo.jpeg',
        verbose_name='Ruta del Logo',
        help_text='Ruta al archivo del logo (relativa a static/)'
    )

    # Configuración de nómina
    periodo_pago = models.CharField(
        max_length=20,
        choices=[
            ('QUINCENAL', 'Quincenal'),
            ('MENSUAL', 'Mensual'),
            ('SEMANAL', 'Semanal'),
        ],
        default='QUINCENAL',
        verbose_name='Período de Pago'
    )

    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuración de Empresa"
        verbose_name_plural = "Configuración de Empresa"

    def __str__(self):
        return self.razon_social

    def clean(self):
        """Asegurar que solo exista un registro"""
        if not self.pk and ConfiguracionEmpresa.objects.exists():
            raise ValidationError(
                'Solo puede existir una configuración de empresa. '
                'Edite el registro existente.'
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Obtiene la configuración de empresa (singleton)"""
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
