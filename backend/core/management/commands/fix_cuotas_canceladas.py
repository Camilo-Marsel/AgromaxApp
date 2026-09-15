"""
Comando de corrección de datos: restaura cuotas pagadas que fueron
incorrectamente marcadas como CANCELADA al cancelar un préstamo.

El bug: views/prestamos.py cancelar() filtraba PENDIENTE + DESCONTADA,
convirtiendo cuotas ya pagadas en CANCELADA. Ya corregido en código.

Uso: python manage.py fix_cuotas_canceladas --prestamo 16 --cuotas 1,2,3
"""

from django.core.management.base import BaseCommand
from core.models import CuotaPrestamo, Prestamo


class Command(BaseCommand):
    help = 'Restaura cuotas con fecha_descuento de CANCELADA a DESCONTADA en un préstamo cancelado'

    def add_arguments(self, parser):
        parser.add_argument('--prestamo', type=int, required=True, help='ID del préstamo')
        parser.add_argument('--cuotas', type=str, required=True,
                            help='Números de cuota separados por coma (ej: 1,2,3)')
        parser.add_argument('--dry-run', action='store_true',
                            help='Solo muestra qué haría sin aplicar cambios')

    def handle(self, *args, **options):
        prestamo_id = options['prestamo']
        numeros = [int(n.strip()) for n in options['cuotas'].split(',')]
        dry_run = options['dry_run']

        try:
            prestamo = Prestamo.objects.get(pk=prestamo_id)
        except Prestamo.DoesNotExist:
            self.stderr.write(f'Préstamo #{prestamo_id} no encontrado')
            return

        self.stdout.write(f'Préstamo #{prestamo_id} — {prestamo.trabajador.nombre_completo} '
                          f'— Estado: {prestamo.estado}')

        cuotas = CuotaPrestamo.objects.filter(
            prestamo=prestamo,
            numero_cuota__in=numeros,
            estado='CANCELADA',
        )

        if not cuotas.exists():
            self.stdout.write(self.style.WARNING(
                f'No se encontraron cuotas CANCELADA con números {numeros} en el préstamo #{prestamo_id}'
            ))
            return

        for c in cuotas.order_by('numero_cuota'):
            quincena = f"Q{c.quincena.numero}-{c.quincena.mes}/{c.quincena.año}" if c.quincena else 'sin quincena'
            fecha = c.fecha_descuento.strftime('%d/%m/%Y') if c.fecha_descuento else 'sin fecha'
            self.stdout.write(
                f'  Cuota {c.numero_cuota}: ${c.valor_cuota} — {quincena} — {fecha} '
                f'→ {"[DRY RUN] " if dry_run else ""}DESCONTADA'
            )

        if not dry_run:
            updated = cuotas.update(estado='DESCONTADA')
            self.stdout.write(self.style.SUCCESS(f'{updated} cuota(s) restauradas a DESCONTADA.'))
        else:
            self.stdout.write(self.style.WARNING('DRY RUN — no se aplicaron cambios.'))
