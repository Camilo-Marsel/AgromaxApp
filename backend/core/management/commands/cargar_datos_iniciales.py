# backend/core/management/commands/cargar_datos_iniciales.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import (
    Rol, UnidadMedida, TipoContrato, Labor, 
    VariablesNomina, ListaPrecios
)
from decimal import Decimal

class Command(BaseCommand):
    help = 'Carga datos iniciales en la base de datos'

    def handle(self, *args, **kwargs):
        self.stdout.write('Cargando datos iniciales...')
        
        # 1. Roles
        self.stdout.write('Creando roles...')
        roles_data = [
            {
                'nombre': Rol.SUPER_ADMIN,
                'descripcion': 'Acceso total al sistema',
                'permisos': {
                    'trabajadores': ['read', 'write', 'delete'],
                    'nomina': ['read', 'write', 'calculate'],
                    'info_bancaria': ['read'],
                    'configuracion': ['read', 'write']
                }
            },
            {
                'nombre': Rol.DIGITADOR,
                'descripcion': 'Puede ingresar labores y ver nómina',
                'permisos': {
                    'trabajadores': ['read'],
                    'nomina': ['read'],
                    'registros': ['read', 'write'],
                }
            },
            {
                'nombre': Rol.SOLO_LECTURA,
                'descripcion': 'Solo puede ver información',
                'permisos': {
                    'trabajadores': ['read'],
                    'nomina': ['read'],
                    'reportes': ['read'],
                }
            },
        ]
        
        for rol_data in roles_data:
            Rol.objects.get_or_create(
                nombre=rol_data['nombre'],
                defaults=rol_data
            )
        
        # 2. Unidades de Medida
        self.stdout.write('Creando unidades de medida...')
        unidades = [
            (UnidadMedida.DIA, 'Medida en días trabajados'),
            (UnidadMedida.UNIDAD, 'Medida en unidades (matas, plantas, etc.)'),
            (UnidadMedida.HECTAREA, 'Medida en hectáreas'),
            (UnidadMedida.METRO, 'Medida en metros lineales'),
        ]
        
        for nombre, descripcion in unidades:
            UnidadMedida.objects.get_or_create(
                nombre=nombre,
                defaults={'descripcion': descripcion}
            )
        
        # 3. Tipos de Contrato
        self.stdout.write('Creando tipos de contrato...')
        TipoContrato.objects.get_or_create(
            nombre=TipoContrato.CON_CONTRATO,
            defaults={
                'descripcion': 'Trabajador con contrato formal',
                'aplica_deducciones': True,
                'aplica_dominicales': True,
                'aplica_auxilio_transporte': True,
            }
        )
        
        TipoContrato.objects.get_or_create(
            nombre=TipoContrato.SIN_CONTRATO,
            defaults={
                'descripcion': 'Trabajador sin contrato formal',
                'aplica_deducciones': False,
                'aplica_dominicales': False,
                'aplica_auxilio_transporte': False,
            }
        )
        
        # 4. Labores Especiales
        self.stdout.write('Creando labores especiales...')
        unidad_dia = UnidadMedida.objects.get(nombre=UnidadMedida.DIA)
        unidad_unidad = UnidadMedida.objects.get(nombre=UnidadMedida.UNIDAD)
        
        labores_especiales = [
            {
                'codigo': 'LAB001',
                'nombre': 'Día Básico',
                'unidad_medida': unidad_dia,
                'es_especial': False,
                'solo_con_contrato': False,
            },
            {
                'codigo': 'LAB002',
                'nombre': 'Festivo',
                'unidad_medida': unidad_dia,
                'es_especial': True,
                'solo_con_contrato': True,
            },
            {
                'codigo': 'LAB003',
                'nombre': 'Dominical',
                'unidad_medida': unidad_dia,
                'es_especial': True,
                'solo_con_contrato': True,
            },
            {
                'codigo': 'LAB004',
                'nombre': 'Incapacidad Médica',
                'unidad_medida': unidad_dia,
                'es_especial': True,
                'solo_con_contrato': False,
            },
            {
                'codigo': 'LAB005',
                'nombre': 'Ausencia No Justificada',
                'unidad_medida': unidad_dia,
                'es_especial': True,
                'solo_con_contrato': False,
            },
            {
                'codigo': 'LAB006',
                'nombre': 'Embolse',
                'unidad_medida': unidad_unidad,
                'es_especial': False,
                'solo_con_contrato': False,
            },
            {
                'codigo': 'LAB007',
                'nombre': 'Desflore',
                'unidad_medida': unidad_unidad,
                'es_especial': False,
                'solo_con_contrato': False,
            },
            {
                'codigo': 'LAB008',
                'nombre': 'Amarre',
                'unidad_medida': unidad_unidad,
                'es_especial': False,
                'solo_con_contrato': False,
            },
        ]
        
        for labor_data in labores_especiales:
            Labor.objects.get_or_create(
                codigo=labor_data['codigo'],
                defaults=labor_data
            )
        
        # 5. Variables de Nómina (2025)
        self.stdout.write('Creando variables de nómina...')
        fecha_inicio = timezone.now().date().replace(month=1, day=1)
        
        variables = [
            {
                'nombre': VariablesNomina.SALARIO_MINIMO,
                'valor': Decimal('1423500'),
                'descripcion': 'Salario mínimo 2025'
            },
            {
                'nombre': VariablesNomina.AUXILIO_TRANSPORTE,
                'valor': Decimal('200000'),
                'descripcion': 'Auxilio de transporte 2025'
            },
            {
                'nombre': VariablesNomina.PORCENTAJE_SALUD,
                'valor': Decimal('4.00'),
                'descripcion': 'Porcentaje de descuento para salud'
            },
            {
                'nombre': VariablesNomina.PORCENTAJE_PENSION,
                'valor': Decimal('4.00'),
                'descripcion': 'Porcentaje de descuento para pensión'
            },
        ]
        
        for var_data in variables:
            VariablesNomina.objects.get_or_create(
                nombre=var_data['nombre'],
                fecha_inicio_vigencia=fecha_inicio,
                defaults=var_data
            )
        
        # 6. Precios iniciales para labores
        self.stdout.write('Creando precios iniciales...')
        precios_iniciales = [
            ('LAB001', Decimal('47450')),  # Día básico (salario/30)
            ('LAB006', Decimal('500')),     # Embolse por unidad
            ('LAB007', Decimal('500')),     # Desflore por unidad
            ('LAB008', Decimal('300')),     # Amarre por unidad
        ]
        
        for codigo, precio in precios_iniciales:
            try:
                labor = Labor.objects.get(codigo=codigo)
                ListaPrecios.objects.get_or_create(
                    labor=labor,
                    fecha_inicio_vigencia=fecha_inicio,
                    defaults={
                        'precio': precio,
                        'created_by': None,
                    }
                )
            except Labor.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'Labor {codigo} no encontrada'))
        
        self.stdout.write(self.style.SUCCESS('¡Datos iniciales cargados exitosamente!'))