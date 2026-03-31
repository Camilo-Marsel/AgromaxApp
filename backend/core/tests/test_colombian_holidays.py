from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from core.models import (
    Finca,
    Labor,
    ListaPrecios,
    Quincena,
    RegistroLabor,
    TipoContrato,
    Trabajador,
    UnidadMedida,
)
from core.services.nomina_calculator import NominaCalculator
from core.utils import is_colombian_holiday


class ColombianHolidaysTestCase(TestCase):
    def setUp(self):
        self.finca = Finca.objects.create(nombre='Finca Prueba')
        self.tipo_contrato = TipoContrato.objects.create(
            nombre='CON_CONTRATO',
            aplica_deducciones=False,
            aplica_dominicales=False,
            aplica_auxilio_transporte=False,
        )
        self.unidad_dia = UnidadMedida.objects.create(nombre=UnidadMedida.DIA)
        self.labor_festivo = Labor.objects.create(
            codigo='LAB002',
            nombre='Festivo',
            unidad_medida=self.unidad_dia,
            es_especial=True,
            solo_con_contrato=True,
        )
        self.labor_basica = Labor.objects.create(
            codigo='LAB001',
            nombre='Día Básico',
            unidad_medida=self.unidad_dia,
        )
        ListaPrecios.objects.create(
            labor=self.labor_festivo,
            precio=Decimal('50000.00'),
            fecha_inicio_vigencia=date(2026, 1, 1),
        )
        ListaPrecios.objects.create(
            labor=self.labor_basica,
            precio=Decimal('40000.00'),
            fecha_inicio_vigencia=date(2026, 1, 1),
        )
        self.quincena = Quincena.objects.create(
            año=2026,
            mes=3,
            numero=2,
            fecha_inicio=date(2026, 3, 16),
            fecha_fin=date(2026, 3, 31),
            fecha_cierre_registro=date(2026, 4, 15),
        )
        self.trabajador = Trabajador.objects.create(
            nombres='Ana',
            apellidos='Prueba',
            tipo_documento='CC',
            numero_documento='123456789',
            fecha_nacimiento=date(1990, 1, 1),
            tipo_contrato=self.tipo_contrato,
            finca=self.finca,
            fecha_ingreso=date(2026, 1, 1),
            estado=Trabajador.CONTRATADO,
        )

    def test_monday_march_23_2026_is_detected_as_holiday(self):
        self.assertTrue(is_colombian_holiday(date(2026, 3, 23)))

    def test_nomina_pays_holiday_automatically_for_march_23_2026(self):
        nomina = NominaCalculator(self.quincena).calcular_trabajador(self.trabajador, None)

        detalle_festivo = nomina.detalles.get(concepto='FESTIVO')

        self.assertEqual(detalle_festivo.cantidad, Decimal('1'))
        self.assertEqual(detalle_festivo.valor_unitario, Decimal('50000.00'))
        self.assertEqual(detalle_festivo.valor_total, Decimal('50000.00'))
        self.assertIn('23/03/2026', detalle_festivo.descripcion)

    def test_cannot_register_labors_on_colombian_holidays(self):
        registro = RegistroLabor(
            trabajador=self.trabajador,
            labor=self.labor_basica,
            quincena=self.quincena,
            fecha=date(2026, 3, 23),
            cantidad=Decimal('1.0000'),
        )

        with self.assertRaises(ValidationError):
            registro.full_clean()
