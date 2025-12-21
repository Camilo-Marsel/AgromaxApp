# backend/core/management/commands/cargar_fincas_iniciales.py

from django.core.management.base import BaseCommand
from core.models import Finca, Lote

class Command(BaseCommand):
    help = 'Carga fincas y lotes iniciales'

    def handle(self, *args, **kwargs):
        self.stdout.write('Cargando fincas iniciales...')
        
        # Crear finca por defecto
        finca1, created = Finca.objects.get_or_create(
            nombre='Finca Principal',
            defaults={
                'ubicacion': 'Por definir',
                'activa': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Finca creada: {finca1.nombre}'))
        else:
            self.stdout.write(self.style.WARNING(f'- Finca ya existe: {finca1.nombre}'))
        
        # Crear lote de ejemplo
        lote1, created = Lote.objects.get_or_create(
            finca=finca1,
            nombre='Lote 1',
            defaults={
                'medida': 10.0,
                'unidad_medida': 'HECTAREA',
                'activo': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Lote creado: {lote1}'))
        else:
            self.stdout.write(self.style.WARNING(f'- Lote ya existe: {lote1}'))
        
        # Asignar finca a trabajadores que no tienen
        from core.models import Trabajador
        trabajadores_sin_finca = Trabajador.objects.filter(finca__isnull=True)
        count = trabajadores_sin_finca.count()
        
        if count > 0:
            trabajadores_sin_finca.update(finca=finca1)
            self.stdout.write(self.style.SUCCESS(f'✓ {count} trabajadores asignados a {finca1.nombre}'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Carga completada exitosamente'))