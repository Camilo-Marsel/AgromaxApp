"""
Management command: seed_lotes
Carga los lotes técnicos de Luna Sol, La Duquesa y Luna Sol 2.
Uso: python manage.py seed_lotes [--clear]

Fuente datos Luna Sol: cuadro de áreas (versión foto, usada en nómina)
Fuente datos Duquesa: PDF "FINCA LA DUQUEZA OJA CACULOS.pdf"
Luna Sol 2: copia exacta de Luna Sol.
"""
from django.core.management.base import BaseCommand
from core.models import Finca, Lote


# ── LUNA SOL — 7 lotes regulares (foto, versión nómina) ────────────────────
# Columnas: numero, cp_long, cp_area, cs_long, cs_area, ct_long, ct_area,
#           cab_long, cab_area, area_bruta, area_neta
LUNA_SOL_LOTES = [
    (1, 162.40,  194.88, 410.50, 1149.40, 2169.00, 4121.10, 426.90, 512.28, 34686.00, 28708.34),
    (2,  86.90,  104.28, 494.90, 1385.72, 2327.10, 4421.49, 410.10, 492.12, 34421.00, 28017.39),
    (3,  88.50,  106.20, 527.70, 1477.56, 2534.90, 4816.31, 396.10, 475.32, 33607.00, 26731.61),
    (4, 173.40,  208.08, 377.30, 1056.44, 2405.90, 4571.21, 374.40, 449.28, 32397.78, 26112.77),
    (5,  86.80,  104.16, 448.90, 1256.92, 2350.60, 4466.14, 358.40, 430.08, 31033.00, 24775.70),
    (6, 258.89,  310.67, 345.60,  967.68, 1642.30, 3120.37, 414.20, 497.04, 29234.87, 24069.48),
    (7, 477.70,  573.24, 310.00,  868.00,  879.30, 1670.67, 356.70, 428.04, 26573.04, 23033.09),
]

# ── LUNA SOL — 5 lotes plantación vieja ────────────────────────────────────
# Se nombran "Lote 1V" … "Lote 5V"
LUNA_SOL_VIEJA = [
    (1, 262.20, 314.64,  57.60,  161.28,  547.50, 1040.25, 386.30, 463.56, 23571.00, 21591.27),
    (2,   0.00,   0.00, 349.50,  978.60, 1202.80, 2285.32, 351.60, 421.92, 22895.00, 19209.16),
    (3,   0.00,   0.00, 291.40,  815.92,  542.80, 1031.32, 355.30, 426.36, 21212.00, 18938.40),
    (4,   0.00,   0.00, 377.20, 1056.16,  530.70, 1008.33, 301.70, 362.04, 18096.00, 15669.47),
    (5,   0.00,   0.00, 215.00,  602.00,  322.40,  612.56, 208.10, 249.72,  8748.00,  7283.72),
]

# ── DUQUESA — 8 lotes (PDF) ─────────────────────────────────────────────────
DUQUESA_LOTES = [
    (1,  577.80,  693.36,  503.30, 1409.24, 1627.50, 3092.25, 488.60,  586.32, 39380.00, 33598.83),
    (2,   85.90,  103.08,  444.60, 1244.88, 1909.00, 3627.10, 541.60,  649.92, 35015.00, 29390.02),
    (3,   85.90,  103.08,  320.50,  897.40, 1737.60, 3301.44, 599.30,  719.16, 32622.00, 27600.92),
    (4,   85.90,  103.08,  352.10,  985.88, 1547.70, 2940.63, 433.70,  520.44, 28915.00, 24364.97),
    (5,   67.60,   81.12,  398.00, 1114.40, 1502.10, 2853.99, 424.50,  509.40, 34178.00, 29619.09),
    (6,  712.40,  854.88,  651.80, 1825.04, 2413.10, 4584.89, 633.90,  760.68, 53648.00, 45622.51),
    (7,  216.70,  260.04,  646.90, 1811.32, 3205.10, 6089.69, 722.60,  867.12, 57003.00, 47974.83),
    (8,  766.30,  919.56,    0.00,    0.00, 2639.00, 5014.10, 658.50,  790.20, 56038.00, 49314.14),
]


def _defaults(row):
    num, cp_l, cp_a, cs_l, cs_a, ct_l, ct_a, cab_l, cab_a, bruta, neta = row
    return {
        'numero_lote': num,
        'canal_primario_longitud':   cp_l  or None,
        'canal_primario_area':       cp_a  or None,
        'canal_secundario_longitud': cs_l  or None,
        'canal_secundario_area':     cs_a  or None,
        'canal_terciario_longitud':  ct_l  or None,
        'canal_terciario_area':      ct_a  or None,
        'cables_longitud':           cab_l or None,
        'cables_area':               cab_a or None,
        'area_bruta': bruta,
        'area_neta':  neta,
        'activo': True,
    }


class Command(BaseCommand):
    help = 'Carga los lotes técnicos de Luna Sol, La Duquesa y Luna Sol 2'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Elimina los lotes existentes de estas fincas antes de insertar',
        )

    def handle(self, *args, **options):
        finca_map = {f.nombre.lower(): f for f in Finca.objects.all()}

        luna_sol   = self._find(finca_map, ['luna sol'],   exclude=['luna sol - 2', 'luna sol 2', 'lunasol2', 'luna sol2'])
        luna_sol_2 = self._find(finca_map, ['luna sol - 2', 'luna sol 2', 'lunasol2', 'luna sol2'])
        duquesa    = self._find(finca_map, ['duquesa', 'duqueza'])

        if not luna_sol:
            self.stderr.write('No se encontró Luna Sol. Verifica el nombre en la BD.')
            return
        if not duquesa:
            self.stderr.write('No se encontró La Duquesa/Duqueza. Verifica el nombre en la BD.')
            return
        if not luna_sol_2:
            self.stdout.write(self.style.WARNING('Luna Sol - 2 no encontrada — se omite.'))

        # Definir qué cargar en cada finca
        # (finca, lotes_regulares, lotes_vieja, label)
        targets = [(luna_sol, LUNA_SOL_LOTES, LUNA_SOL_VIEJA, 'Luna Sol')]
        if luna_sol_2:
            targets.append((luna_sol_2, LUNA_SOL_LOTES, LUNA_SOL_VIEJA, 'Luna Sol 2'))
        targets.append((duquesa, DUQUESA_LOTES, [], 'La Duquesa'))

        for finca, regulares, viejos, label in targets:
            if options['clear']:
                deleted, _ = Lote.objects.filter(finca=finca).delete()
                self.stdout.write(f'  [{label}] {deleted} lotes eliminados.')

            created = updated = 0

            for row in regulares:
                nombre = f'Lote {row[0]}'
                _, was_created = Lote.objects.update_or_create(
                    finca=finca, nombre=nombre, defaults=_defaults(row),
                )
                created += was_created
                updated += not was_created

            for row in viejos:
                nombre = f'Lote {row[0]}V'
                defaults = _defaults(row)
                defaults['numero_lote'] = row[0]  # numero sin V
                _, was_created = Lote.objects.update_or_create(
                    finca=finca, nombre=nombre, defaults=defaults,
                )
                created += was_created
                updated += not was_created

            self.stdout.write(
                self.style.SUCCESS(f'  [{label}] {created} creados, {updated} actualizados.')
            )

        self.stdout.write(self.style.SUCCESS('Seed de lotes completado.'))

    def _find(self, finca_map, keywords, exclude=None):
        exclude = exclude or []
        for nombre_lower, finca in finca_map.items():
            if any(ex in nombre_lower for ex in exclude):
                continue
            if any(kw in nombre_lower for kw in keywords):
                return finca
        return None
