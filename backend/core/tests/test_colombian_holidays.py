from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from core.models import (
    Finca,
    Labor,
    ListaPrecios,
    Nomina,
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
            aplica_dominicales=True,
            aplica_auxilio_transporte=False,
        )
        self.tipo_sin_contrato = TipoContrato.objects.create(
            nombre='SIN_CONTRATO',
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
        self.trabajador_sin_contrato = Trabajador.objects.create(
            nombres='Luis',
            apellidos='Sin Contrato',
            tipo_documento='CC',
            numero_documento='987654321',
            fecha_nacimiento=date(1991, 1, 1),
            tipo_contrato=self.tipo_sin_contrato,
            finca=self.finca,
            fecha_ingreso=date(2026, 1, 1),
            estado=Trabajador.CONTRATADO,
        )
        self.trabajador_estado_inactivo = Trabajador.objects.create(
            nombres='Marta',
            apellidos='Inactiva',
            tipo_documento='CC',
            numero_documento='111222333',
            fecha_nacimiento=date(1992, 1, 1),
            tipo_contrato=self.tipo_contrato,
            finca=self.finca,
            fecha_ingreso=date(2026, 1, 1),
            estado=Trabajador.SIN_CONTRATO,
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

    def test_bulk_payroll_includes_non_retired_workers(self):
        nominas = NominaCalculator(self.quincena).calcular_quincena_completa(None)

        trabajadores_ids = {nomina.trabajador_id for nomina in nominas}

        self.assertEqual(len(nominas), 3)
        self.assertEqual(
            trabajadores_ids,
            {
                self.trabajador.id,
                self.trabajador_sin_contrato.id,
                self.trabajador_estado_inactivo.id,
            }
        )
        self.assertEqual(Nomina.objects.count(), 3)

    def test_non_contract_worker_does_not_receive_holiday_payment(self):
        nomina = NominaCalculator(self.quincena).calcular_trabajador(self.trabajador_sin_contrato, None)

        self.assertFalse(nomina.detalles.filter(concepto='FESTIVO').exists())

    def test_holiday_does_not_cause_loss_of_weekly_dominical(self):
        for work_day in [
            date(2026, 3, 24),
            date(2026, 3, 25),
            date(2026, 3, 26),
            date(2026, 3, 27),
            date(2026, 3, 28),
        ]:
            RegistroLabor.objects.create(
                trabajador=self.trabajador,
                labor=self.labor_basica,
                quincena=self.quincena,
                fecha=work_day,
                cantidad=Decimal('1.0000'),
            )

        nomina = NominaCalculator(self.quincena).calcular_trabajador(self.trabajador, None)
        detalle_dominical = nomina.detalles.get(concepto='DOMINICAL')

        self.assertEqual(detalle_dominical.cantidad, Decimal('1'))
        self.assertEqual(detalle_dominical.valor_unitario, Decimal('40000.00'))
        self.assertEqual(detalle_dominical.valor_total, Decimal('40000.00'))
