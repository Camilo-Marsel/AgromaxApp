# backend/core/services/contract_pdf_generator.py

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, Image, PageBreak, Frame, PageTemplate
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT, TA_JUSTIFY
from io import BytesIO
from datetime import datetime
from django.conf import settings
import os
import num2words


def numero_a_letras(numero):
    """Convierte un número a palabras en español"""
    try:
        entero = int(numero)
        palabras = num2words.num2words(entero, lang='es')
        return palabras.capitalize()
    except:
        return str(numero)


class ContratoPDFGenerator:
    """Generador de contratos de trabajo en PDF"""

    # Colores corporativos
    COLOR_VERDE_CLARO = colors.HexColor('#7ED321')
    COLOR_VERDE_OSCURO = colors.HexColor('#2D5016')
    COLOR_GRIS = colors.HexColor('#666666')

    def __init__(self, contrato):
        self.contrato = contrato
        self.trabajador = contrato.trabajador
        self.empresa = self._get_empresa()
        self.buffer = BytesIO()
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self.page_number = 0
        self.total_pages = 8

    def _get_empresa(self):
        """Obtener configuración de la empresa"""
        from core.models import ConfiguracionEmpresa
        return ConfiguracionEmpresa.get_config()

    def _setup_custom_styles(self):
        """Configurar estilos personalizados"""
        # Título principal
        self.styles.add(ParagraphStyle(
            name='TituloContrato',
            fontSize=14,
            textColor=self.COLOR_VERDE_OSCURO,
            spaceAfter=6,
            spaceBefore=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Subtítulo
        self.styles.add(ParagraphStyle(
            name='SubtituloContrato',
            fontSize=11,
            textColor=self.COLOR_VERDE_OSCURO,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Encabezado de sección
        self.styles.add(ParagraphStyle(
            name='SeccionTitulo',
            fontSize=10,
            textColor=colors.black,
            spaceBefore=10,
            spaceAfter=4,
            fontName='Helvetica-Bold'
        ))

        # Cláusula título
        self.styles.add(ParagraphStyle(
            name='ClausulaTitulo',
            fontSize=10,
            textColor=colors.black,
            spaceBefore=10,
            spaceAfter=4,
            fontName='Helvetica-Bold',
            alignment=TA_JUSTIFY
        ))

        # Texto normal justificado
        self.styles.add(ParagraphStyle(
            name='TextoNormal',
            fontSize=9,
            textColor=colors.black,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
            fontName='Helvetica',
            leading=12
        ))

        # Texto de lista
        self.styles.add(ParagraphStyle(
            name='TextoLista',
            fontSize=9,
            textColor=colors.black,
            spaceAfter=3,
            leftIndent=20,
            alignment=TA_JUSTIFY,
            fontName='Helvetica',
            leading=11
        ))

        # Pie de página
        self.styles.add(ParagraphStyle(
            name='PiePagina',
            fontSize=8,
            textColor=self.COLOR_VERDE_OSCURO,
            alignment=TA_LEFT
        ))

    def generar(self):
        """Generar el PDF completo del contrato"""
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=1.2*inch,
            bottomMargin=0.8*inch
        )

        story = []

        # Página 1: Encabezado y datos
        story.extend(self._crear_encabezado())
        story.extend(self._crear_tabla_empleador())
        story.extend(self._crear_tabla_trabajador())
        story.extend(self._crear_tabla_contrato())
        story.extend(self._crear_introduccion())
        story.extend(self._crear_clausula_primera())

        # Página 2-3: Obligaciones
        story.append(PageBreak())
        story.extend(self._crear_paragrafos_iniciales())
        story.extend(self._crear_clausula_segunda())

        # Página 3: Prohibiciones
        story.append(PageBreak())
        story.extend(self._crear_clausula_tercera())

        # Página 4: Remuneración
        story.append(PageBreak())
        story.extend(self._crear_clausula_remuneracion())
        story.extend(self._crear_clausula_lugar())
        story.extend(self._crear_clausula_duracion())

        # Página 5: Jornada y periodo de prueba
        story.append(PageBreak())
        story.extend(self._crear_clausula_jornada())
        story.extend(self._crear_clausula_periodo_prueba())
        story.extend(self._crear_clausula_exencion())
        story.extend(self._crear_clausula_terminacion())

        # Página 6: Causales de terminación
        story.append(PageBreak())
        story.extend(self._crear_causales_terminacion())
        story.extend(self._crear_clausula_modificaciones())
        story.extend(self._crear_clausula_vigilancia())

        # Página 7: Políticas adicionales
        story.append(PageBreak())
        story.extend(self._crear_politicas_adicionales())

        # Página 8: Firmas
        story.append(PageBreak())
        story.extend(self._crear_clausulas_finales())
        story.extend(self._crear_firmas())

        doc.build(story, onFirstPage=self._header_footer, onLaterPages=self._header_footer)
        self.buffer.seek(0)
        return self.buffer

    def _header_footer(self, canvas, doc):
        """Agregar encabezado y pie de página"""
        canvas.saveState()

        # Logo en encabezado (esquina superior derecha)
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'logos', 'logo_completo.jpeg')
        if os.path.exists(logo_path):
            canvas.drawImage(logo_path, doc.width + doc.leftMargin - 1.5*inch,
                           doc.height + doc.topMargin - 0.3*inch,
                           width=1.8*inch, height=0.6*inch, preserveAspectRatio=True)

        # Info empresa en encabezado (izquierda)
        canvas.setFont('Helvetica-Bold', 10)
        canvas.setFillColor(self.COLOR_VERDE_CLARO)
        canvas.drawString(doc.leftMargin, doc.height + doc.topMargin + 0.1*inch,
                         self.empresa.razon_social)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(self.COLOR_GRIS)
        canvas.drawString(doc.leftMargin, doc.height + doc.topMargin - 0.1*inch,
                         f"NIT: {self.empresa.nit}")

        # Línea verde decorativa debajo del encabezado
        canvas.setStrokeColor(self.COLOR_VERDE_CLARO)
        canvas.setLineWidth(2)
        canvas.line(doc.leftMargin, doc.height + doc.topMargin - 0.25*inch,
                   doc.width + doc.leftMargin, doc.height + doc.topMargin - 0.25*inch)

        # Pie de página
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(self.COLOR_VERDE_OSCURO)
        canvas.drawString(doc.leftMargin, 0.4*inch,
                         f"Teléfono: {self.empresa.telefono}")
        canvas.drawString(doc.leftMargin, 0.25*inch,
                         f"Correo: {self.empresa.correo}")

        # Número de página
        self.page_number += 1
        canvas.drawRightString(doc.width + doc.leftMargin, 0.3*inch,
                              f"Página {self.page_number} de {self.total_pages}")

        # Línea verde decorativa encima del pie
        canvas.setStrokeColor(self.COLOR_VERDE_CLARO)
        canvas.setLineWidth(3)
        canvas.line(doc.leftMargin, 0.55*inch,
                   doc.width + doc.leftMargin, 0.55*inch)

        canvas.restoreState()

    def _crear_encabezado(self):
        """Crear encabezado del contrato"""
        elementos = []

        elementos.append(Spacer(1, 0.3*inch))

        titulo = Paragraph(
            "CONTRATO INDIVIDUAL DE TRABAJO",
            self.styles['TituloContrato']
        )
        elementos.append(titulo)

        # Subtítulo según tipo de contrato
        tipo_texto = "A TÉRMINO FIJO INFERIOR A UN AÑO" if self.contrato.tipo_contrato == 'TERMINO_FIJO' else "A TÉRMINO INDEFINIDO"
        subtitulo = Paragraph(tipo_texto, self.styles['SubtituloContrato'])
        elementos.append(subtitulo)

        elementos.append(Spacer(1, 0.2*inch))

        return elementos

    def _crear_tabla_empleador(self):
        """Crear tabla con datos del empleador"""
        elementos = []

        titulo = Paragraph("DATOS DEL EMPLEADOR", self.styles['SeccionTitulo'])
        elementos.append(titulo)

        datos = [
            ['Empleador:', self.empresa.razon_social, 'Nit:', self.empresa.nit],
            ['RTE. Legal:', self.empresa.representante_legal, 'Identificación:', self.empresa.documento_representante],
            ['Correo:', self.empresa.correo, 'Teléfono:', self.empresa.telefono],
            ['Dirección:', self.empresa.direccion, '', ''],
        ]

        tabla = Table(datos, colWidths=[1.1*inch, 2.4*inch, 1.1*inch, 2*inch])
        tabla.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f5f5f5')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elementos.append(tabla)
        elementos.append(Spacer(1, 0.15*inch))

        return elementos

    def _crear_tabla_trabajador(self):
        """Crear tabla con datos del trabajador"""
        elementos = []

        titulo = Paragraph("DATOS DEL TRABAJADOR", self.styles['SeccionTitulo'])
        elementos.append(titulo)

        # Formatear cuenta bancaria
        tipo_cuenta = self.trabajador.get_tipo_cuenta_bancaria_display() if self.trabajador.tipo_cuenta_bancaria else ''
        banco = self.trabajador.banco or ''
        cuenta_info = f"{tipo_cuenta} - {banco}" if tipo_cuenta and banco else "N/A"

        datos = [
            ['Nombre:', self.trabajador.nombre_completo, 'Cedula:', self.trabajador.numero_documento],
            ['Correo:', self.trabajador.correo or '', 'Nacionalidad:', self.trabajador.nacionalidad],
            ['Dirección:', self.trabajador.direccion or '', 'Teléfono:', self.trabajador.telefono or ''],
            ['No.Cuenta:', self.trabajador.numero_cuenta_bancaria or '', 'Tipo y Banco:', cuenta_info],
        ]

        tabla = Table(datos, colWidths=[1.1*inch, 2.4*inch, 1.1*inch, 2*inch])
        tabla.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f5f5f5')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elementos.append(tabla)
        elementos.append(Spacer(1, 0.15*inch))

        return elementos

    def _crear_tabla_contrato(self):
        """Crear tabla con datos del contrato"""
        elementos = []

        titulo = Paragraph("DATOS DEL CONTRATO", self.styles['SeccionTitulo'])
        elementos.append(titulo)

        # Formatear fechas
        fecha_inicio = self.contrato.fecha_inicio.strftime('%d de %B de %Y').replace(
            'January', 'enero').replace('February', 'febrero').replace('March', 'marzo'
            ).replace('April', 'abril').replace('May', 'mayo').replace('June', 'junio'
            ).replace('July', 'julio').replace('August', 'agosto').replace('September', 'septiembre'
            ).replace('October', 'octubre').replace('November', 'noviembre').replace('December', 'diciembre')

        fecha_fin = ''
        if self.contrato.fecha_fin:
            fecha_fin = self.contrato.fecha_fin.strftime('%d de %B de %Y').replace(
                'January', 'enero').replace('February', 'febrero').replace('March', 'marzo'
                ).replace('April', 'abril').replace('May', 'mayo').replace('June', 'junio'
                ).replace('July', 'julio').replace('August', 'agosto').replace('September', 'septiembre'
                ).replace('October', 'octubre').replace('November', 'noviembre').replace('December', 'diciembre')

        # Finca
        finca = self.trabajador.finca.nombre if self.trabajador.finca else ''

        # Tipo de contrato
        tipo_contrato_texto = self.contrato.get_tipo_contrato_display()
        if self.contrato.tipo_contrato == 'TERMINO_FIJO':
            tipo_contrato_texto = "TERMINO FIJO INFERIOR A UN AÑO"

        # Salario
        salario = int(self.contrato.salario_pactado)
        salario_letras = numero_a_letras(salario)
        salario_texto = f"SMMLV - $ {salario:,} – {salario_letras}".replace(',', '.')

        # Auxilio de transporte (obtener de variables de nómina)
        from core.models import VariablesNomina
        try:
            aux_transporte = VariablesNomina.get_valor_vigente('AUXILIO_TRANSPORTE', self.contrato.fecha_inicio)
            aux_letras = numero_a_letras(int(aux_transporte))
            aux_texto = f"ATMMLV -$ {int(aux_transporte):,} – {aux_letras}".replace(',', '.')
        except:
            aux_texto = "Según ley vigente"

        datos = [
            ['Cargo:', self.contrato.cargo, 'Finca:', finca],
            ['Tipo Cont.', tipo_contrato_texto, 'Fecha Inicio:', fecha_inicio],
            ['Periodos:', self.empresa.periodo_pago, 'Fecha Fin:', fecha_fin],
        ]

        tabla1 = Table(datos, colWidths=[1.1*inch, 2.4*inch, 1.1*inch, 2*inch])
        tabla1.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f5f5f5')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elementos.append(tabla1)

        # Tabla de salario (ocupa todo el ancho)
        datos_salario = [
            ['Salario:', salario_texto],
            ['Aux. Trans.', aux_texto],
        ]

        tabla2 = Table(datos_salario, colWidths=[1.1*inch, 5.5*inch])
        tabla2.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elementos.append(tabla2)
        elementos.append(Spacer(1, 0.2*inch))

        return elementos

    def _crear_introduccion(self):
        """Crear texto de introducción del contrato"""
        elementos = []

        texto = """Entre los suscritos, EMPLEADOR y TRABAJADOR, identificados en la parte inicial de este
documento, se ha convenido celebrar el presente contrato individual de trabajo a término fijo
inferior a un año, el cual se rige además de las disposiciones del ordenamiento jurídico
colombiano en materia laboral, por las siguientes cláusulas:"""

        elementos.append(Paragraph(texto, self.styles['TextoNormal']))

        return elementos

    def _crear_clausula_primera(self):
        """Crear cláusula primera - Objeto"""
        elementos = []

        titulo = Paragraph(
            "<b>PRIMERA. Objeto</b>—El empleador contrata los servicios personales del trabajador y este se "
            "obliga a: a) A poner al servicio del empleador toda su capacidad normal de trabajo, en forma "
            "exclusiva en el desempeño de las funciones propias del oficio mencionado y en las labores "
            "anexas y complementarias del mismo, de conformidad con las órdenes e instrucciones que le "
            "imparta el empleador o sus representantes. b) desarrollar las funciones establecidas en el "
            "manual de funciones y observar lo estipulado en el reglamento interno de trabajo. C) A no "
            "prestar directa ni indirectamente servicios laborales o de prestación de servicios a otros "
            "empleadores o contratistas ni a trabajar por cuenta propia en el mismo oficio u otro, durante la "
            "vigencia de este contrato.",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        return elementos

    def _crear_paragrafos_iniciales(self):
        """Crear parágrafos 1 y 2"""
        elementos = []

        p1 = Paragraph(
            "<b>PARÁGRAFO 1. -</b> Las partes declaran que en el presente contrato se entienden incorporadas, "
            "en lo pertinente, las disposiciones legales que regulan las relaciones entre la empresa y sus "
            "trabajadores, en especial, las del manual de funciones para el cargo que se contrata y que se "
            "encuentra consignado en el encabezado de este documento, las obligaciones, deberes y "
            "prohibiciones consignadas en el reglamento interno de trabajo de la empresa, los reglamentos "
            "y políticas de higiene, sanidad y seguridad industrial, las políticas de gestión de rendimiento y "
            "calidad de la empresa y el Sistema de Gestión de Seguridad y Salud en el Trabajo.",
            self.styles['TextoNormal']
        )
        elementos.append(p1)

        p2 = Paragraph(
            "<b>PARÁGRAFO 2.</b> Con la firma de este contrato el trabajador declara y deja constancia de haber "
            "recibido la notificación y socialización y por ende conocer, entender y aceptar íntegramente la "
            "normativa citada en el parágrafo anterior.",
            self.styles['TextoNormal']
        )
        elementos.append(p2)

        return elementos

    def _crear_clausula_segunda(self):
        """Crear cláusula segunda - Obligaciones del trabajador"""
        elementos = []

        titulo = Paragraph(
            "<b>SEGUNDA. – Obligaciones Del Trabajador.</b> En relación con la actividad propia del trabajador, "
            "éste las ejecutará dentro de las siguientes modalidades que implican claras obligaciones para "
            "el mismo trabajador así:",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        obligaciones = [
            "Observar rigurosamente las disposiciones contenidas en el reglamento interno de trabajo de la empresa, los reglamentos y políticas de higiene, sanidad y seguridad industrial, las políticas de gestión de rendimiento calidad de la empresa y el Sistema de Gestión de Seguridad y Salud en el Trabajo.",
            "Observar rigurosamente las normas y protocolos que le fije la empresa para la realización de las labores a que se refiere el presente contrato y el manual de funciones del cargo contratado.",
            "Guardar absoluta reserva, salvo autorización expresa de la empresa que conste por escrito, de toda información que lleguen a su conocimiento en razón a su trabajo y que sean por su naturaleza privadas.",
            "Cuidar permanentemente los intereses de la Empresa.",
            "Dedicar la totalidad de su jornada de trabajo a cumplir a cabalidad con sus funciones.",
            "Programar diariamente su Trabajo y asistir puntualmente a las reuniones que efectúe La Empresa a las cuales hubiere sido citado.",
            "Desarrollar con ética, integridad y respeto su relacionamiento con los clientes, con sus superiores y compañeros de trabajo, en sus relaciones personales y en la ejecución de su labor.",
            "Cumplir permanentemente con espíritu de lealtad, colaboración y disciplina con la empresa.",
            "Avisar oportunamente a la empresa todo cambio de dirección, teléfono o ciudad de residencia, así como cambio de información personal relevante para la relación contractual.",
            "Preservar el decoro y el respeto hacia sus compañeros y jefes inmediatos, y no realizar actos obscenos de ninguna naturaleza dentro de la empresa o por fuera de ellas que involucre los intereses de esta, conforme a lo establecido en la ley 2365 de 2024.",
            "No ocuparse en el servicio de ningún otro patrono, ni a dedicarse a negocios propios de ninguna índole.",
            "Laborar la jornada ordinaria en los turnos y dentro de las horas que le asigne EL EMPLEADOR, pudiendo ésta ordenar los cambios o ajustes que sean necesarios para el adecuado funcionamiento de las actividades y labores, basando su decisión en el principio laboral del (IUS VARIANDI)."
        ]

        for i, oblig in enumerate(obligaciones, 1):
            p = Paragraph(f"{i}. {oblig}", self.styles['TextoLista'])
            elementos.append(p)

        return elementos

    def _crear_clausula_tercera(self):
        """Crear cláusula tercera - Prohibiciones"""
        elementos = []

        titulo = Paragraph(
            "<b>TERCERA. – Prohibiciones para el Trabajador.</b> Además de las establecidas en la ley, el "
            "reglamento interno de trabajo de la empresa, los reglamentos y políticas de higiene, sanidad y "
            "seguridad industrial, las políticas de gestión de rendimiento calidad de la empresa y el Sistema "
            "de Gestión de Seguridad y Salud en el Trabajo. Le está prohibido al trabajador:",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        prohibiciones = [
            "Exigir o solicitar directa o soterradamente a usuarios, clientes, proveedores o terceros, propinas o dádivas de cualquier clase.",
            "Recibir pagos en dinero o especie de los clientes o usuarios por cualquier motivo.",
            "Usar el uniforme de trabajo en asuntos diferentes al mismo, salvo autorización de EL EMPLEADOR.",
            "Adulterar los documentos presentados a la empresa.",
            "Ejercer actos de maltrato y o violencia en contra de alguna persona en ocasión a sus interacciones personales en el desarrollo de sus funciones.",
            "Realizar en la obra o/y puesto de trabajo, actos indecentes o inmorales.",
            "Dar a los recursos asignados por la empresa (herramientas, material, equipos, uniformes y elementos de protección) un uso o destino diferente a aquel para el cual le fueron entregados.",
            "Ceder o cambiar o comercializar recursos asignados por la empresa mientras se encuentren en su poder.",
            "Emplear en su trabajo y en el trato con sus compañeros de trabajo, subordinados, superiores, clientes o visitantes, un vocabulario descortés, indecoroso o indecente.",
            "Realizar actos que impliquen acoso laboral, violencia basada en género, maltrato o discriminación de cualquier clase."
        ]

        for i, prohib in enumerate(prohibiciones, 1):
            p = Paragraph(f"{i}. {prohib}", self.styles['TextoLista'])
            elementos.append(p)

        return elementos

    def _crear_clausula_remuneracion(self):
        """Crear cláusula de remuneración"""
        elementos = []

        titulo = Paragraph(
            "<b>TERCERA. - REMUNERACIÓN:</b> El empleador pagará al trabajador por la prestación de sus "
            "servicios el salario indicado, en el encabezado de este documento, pagadero en las "
            "oportunidades también señaladas arriba. Dentro de este pago se encuentra incluida la "
            "remuneración de los descansos dominicales y festivos de que tratan los capítulos I y II del título "
            "V del Código Sustantivo del Trabajo.",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        p1 = Paragraph(
            "<b>PARÁGRAFO PRIMERO:</b> Las partes expresamente acuerdan que lo que recibe el trabajador o "
            "llegue a recibir en el futuro adicional a su salario ordinario, ya sean beneficios o auxilios "
            "habituales u ocasionales, tales como alimentación, habitación, vestuario, auxilio de "
            "movilización, viáticos, gastos de representación, bonificaciones ocasionales o cualquier otra "
            "que reciba durante la vigencia de este contrato de trabajo en dinero o en especie, no "
            "constituyen salario conforme a lo establecido en el artículo 128 del C.S.T.",
            self.styles['TextoNormal']
        )
        elementos.append(p1)

        p2 = Paragraph(
            "<b>PARÁGRAFO SEGUNDO:</b> El trabajo suplementario o en horas extras, así como todo trabajo "
            "en domingo o festivo en los que deba concederse descanso, será remunerado conforme a la "
            "Ley, al igual que los respectivos recargos nocturnos.",
            self.styles['TextoNormal']
        )
        elementos.append(p2)

        p3 = Paragraph(
            "<b>PARÁGRAFO TERCERO:</b> EL EMPLEADOR no suministra ninguna clase de salario en especie, "
            "pero estos podrán ser pactados si lo consideran ambas partes de forma escrita.",
            self.styles['TextoNormal']
        )
        elementos.append(p3)

        p4 = Paragraph(
            "EL TRABAJADOR autoriza de manera expresa la consignación por todo concepto de "
            "remuneración y pago de acreencias laborales, por parte del empleador la cuenta bancaria "
            "consignada en el encabezado de este documento.",
            self.styles['TextoNormal']
        )
        elementos.append(p4)

        p5 = Paragraph(
            "<b>PARÁGRAFO QUINTO:</b> El salario será incrementado cuando y como corresponda según las "
            "disposiciones legales del ordenamiento jurídico laboral colombiano.",
            self.styles['TextoNormal']
        )
        elementos.append(p5)

        return elementos

    def _crear_clausula_lugar(self):
        """Crear cláusula de lugar de ejecución"""
        elementos = []

        titulo = Paragraph(
            f"<b>CUARTA. – Lugar De Ejecución Del Contrato.</b> Los servicios laborales de EL TRABAJADOR "
            f"serán prestados en la localidad establecida en el encabezado de este documento además de "
            f"donde disponga el empleador aplicando el principio de (ius variandi).",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        return elementos

    def _crear_clausula_duracion(self):
        """Crear cláusula de duración"""
        elementos = []

        titulo = Paragraph(
            "<b>QUINTA. - Duración Del Contrato.</b> El presente contrato tendrá una duración fija dentro del "
            "periodo establecido en el encabezado de este documento como fecha de inicio y fin del "
            "contrato.",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        return elementos

    def _crear_clausula_jornada(self):
        """Crear cláusula de jornada de trabajo"""
        elementos = []

        titulo = Paragraph(
            "<b>SEXTO. - Jornada De Trabajo.</b> EL TRABAJADOR se obliga a cumplir una jornada de cuarenta "
            "y cuatro (44) horas semanales, pudiendo el empleador hacer ajustes o cambios de horario "
            "cuando lo estime conveniente.",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        p1 = Paragraph(
            "<b>PARÁGRAFO PRIMERO:</b> la jornada laboral será reducida conforme a lo establecido en la ley "
            "2101 de 2021, dando aplicabilidad a la reducción estipulada.",
            self.styles['TextoNormal']
        )
        elementos.append(p1)

        return elementos

    def _crear_clausula_periodo_prueba(self):
        """Crear cláusula de periodo de prueba"""
        elementos = []

        titulo = Paragraph(
            "<b>SÉPTIMA. - Periodo De Prueba.</b> Las tres quintas partes (3/5) iniciales del periodo de duración "
            "del presente contrato se consideran como período de prueba, por consiguiente, cualquiera de "
            "las partes podrá terminar el contrato unilateralmente, en cualquier momento durante dicho "
            "periodo sin que se cause el pago de indemnización alguna, en forma unilateral, de conformidad "
            "con el artículo 80 del Código Sustantivo del trabajo. Vencido este, la duración del contrato será "
            "la definida mientras subsistan las causas que le dieron origen y la materia del trabajo y que no "
            "exista causal para su terminación. Si antes de la fecha de vencimiento ninguna de las partes "
            "avisare por escrito a la otra su determinación de no prorrogar el contrato con una antelación "
            "no inferior a treinta (30) días, este se entenderá prorrogado por un periodo igual al inicialmente "
            "pactado, de conformidad con el Art. 46 del C.S.T.",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        return elementos

    def _crear_clausula_exencion(self):
        """Crear cláusula de exención de responsabilidad"""
        elementos = []

        titulo = Paragraph(
            "<b>OCTAVA. - Exención De Responsabilidad.</b> El empleador no asume los riesgos que se deriven "
            "de la negligencia de la actividad ejercida por el empleado en el desarrollo de sus funciones, por "
            "ello, expresamente EL TRABAJADOR deja constancia de que se compromete a asumir los "
            "daños que por su culpa, dolo o negligencia cause en su persona, a la empresa, a terceros o "
            "bienes de estos, en la ejecución de las labores contratadas.",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        return elementos

    def _crear_clausula_terminacion(self):
        """Crear cláusula de terminación unilateral"""
        elementos = []

        titulo = Paragraph(
            "<b>NOVENA. - Terminación Unilateral.</b> Son justas causas para dar por terminado unilateralmente "
            "este contrato por cualquiera de las partes, las expresadas en los artículos 57, 62 y 63 y "
            "siguientes del Código Sustantivo del Trabajo, en concordancia con las modificaciones "
            "introducidas por el artículo 7° del Decreto 2351 de 1965. Además, por parte del empleador, "
            "las que para el efecto se establezcan como graves en el reglamento interno de trabajo de la "
            "empresa. Además de las siguientes:",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        return elementos

    def _crear_causales_terminacion(self):
        """Crear lista de causales específicas de terminación"""
        elementos = []

        causales = [
            ("<b>Negligencia Fitosanitaria:</b>", "El incumplimiento de los protocolos aseo y de desinfección de herramientas y lugar de trabajo para prevenir enfermedades y contaminación del producto."),
            ("<b>Daño a la Fruta:</b>", "El manejo inadecuado del racimo (golpes, cicatrices o caídas) que afecte la calidad y clasificación de exportación."),
            ("<b>Seguridad Industrial:</b>", "La negativa sistemática a usar los Elementos de Protección Personal (EPP) suministrados por la empresa."),
            ("<b>Bajo Rendimiento:</b>", "El incumplimiento recurrente de las metas de producción o mantenimiento fijadas por el administrador de la plantación."),
            ("<b>Bioseguridad y Contaminación:</b>", "Cualquier acción que ponga en riesgo la integridad de la carga o que sugiera la manipulación de la mercancía con fines ilícitos."),
            ("<b>Inasistencia:</b>", "En caso de fuerza mayor o enfermedad, el TRABAJADOR deberá informar al EMPLEADOR antes del inicio de la jornada. Dos (2) inasistencias injustificadas, o tres (3) retrasos superiores a 15 minutos, facultarán al EMPLEADOR para iniciar proceso de terminación de contrato por justa causa."),
            ("<b>Renuencia al Embarque:</b>", "El proceso de embarque es una función inherente y esencial del cargo. La negativa del TRABAJADOR a participar en las jornadas de embarque, será considerada como un acto de indisciplina y desobediencia grave."),
        ]

        for i, (titulo, texto) in enumerate(causales, 1):
            p = Paragraph(f"{i}. {titulo} {texto}", self.styles['TextoLista'])
            elementos.append(p)

        return elementos

    def _crear_clausula_modificaciones(self):
        """Crear cláusula de modificaciones"""
        elementos = []

        titulo = Paragraph(
            "<b>DECIMA. - Modificaciones De Las Condiciones Laborales.</b> Las partes podrán convenir que el "
            "trabajo se preste en lugar distinto del inicialmente contratado, siempre que tales traslados no "
            "desmejoren las condiciones laborales o de remuneración del trabajador, o impliquen perjuicios "
            "para él. EL TRABAJADOR se obliga a aceptar los cambios de oficio que decida el empleador "
            "dentro de su poder subordinante, siempre que se respeten las condiciones laborales del "
            "trabajador y no se le causen perjuicios.",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        return elementos

    def _crear_clausula_vigilancia(self):
        """Crear cláusula de vigilancia y tratamiento de datos"""
        elementos = []

        titulo = Paragraph(
            "<b>DECIMA PRIMERA. – Vigilancia y tratamiento de datos.</b> Con la firma de este documento se "
            "notifica al trabajador que para el control de los bienes del EMPLEADOR y seguridad de los "
            "empleados la empresa cuenta con cámaras de seguridad, salvaguardando la integridad, "
            "intimidad y privacidad de los empleados. Y El TRABAJADOR autoriza expresamente la captura "
            "de su imagen y voz mediante los sistemas de cámaras de seguridad de la empresa.",
            self.styles['TextoNormal']
        )
        elementos.append(titulo)

        return elementos

    def _crear_politicas_adicionales(self):
        """Crear políticas adicionales"""
        elementos = []

        p1 = Paragraph(
            "<b>DECIMA SEGUNDA. - Uso de celulares.</b> La empresa dentro de su normativa interna limita "
            "el uso de Smartphone (celulares) o cualquier dispositivo electrónico de uso personal dentro "
            "de las horas laborales.",
            self.styles['TextoNormal']
        )
        elementos.append(p1)

        p2 = Paragraph(
            "<b>DECIMA TERCERA. - Política de alcohol y drogas.</b> EL TRABAJADOR autoriza al empleador, a "
            "efectuar sorpresivamente pruebas de alcohol y drogas por cualquier medio.",
            self.styles['TextoNormal']
        )
        elementos.append(p2)

        p3 = Paragraph(
            "<b>DÉCIMA CUARTA. - Derecho De Retención.</b> El empleado autoriza expresamente al empleador "
            "para que durante la vigencia del presente contrato o a su terminación por cualquier causa, "
            "compense o descuente, del valor de sus salarios, prestaciones sociales, e indemnizaciones, "
            "que le llegaren a corresponder, las sumas que quedare adeudando al empleador por conceptos "
            "como: prestamos, el valor de elementos perdidos o dañados, dineros confiados para recaudo, etc.",
            self.styles['TextoNormal']
        )
        elementos.append(p3)

        p4 = Paragraph(
            "<b>DÉCIMA QUINTA.</b> Las invenciones o descubrimientos realizados por EL TRABAJADOR "
            "pertenecen AL EMPLEADOR cuando él realice la invención mediante datos o medios "
            "conocidos o utilizados en razón a la labor desempeñada.",
            self.styles['TextoNormal']
        )
        elementos.append(p4)

        return elementos

    def _crear_clausulas_finales(self):
        """Crear cláusulas finales"""
        elementos = []

        p1 = Paragraph(
            "<b>DÉCIMA SEXTA. – Notificaciones.</b> Con la firma de este contrato el trabajador autoriza de "
            "manera expresa a recibir comunicaciones y notificaciones de parte del empleador a los canales "
            "de contacto; correo y celular, consignados en el encabezado de este documento.",
            self.styles['TextoNormal']
        )
        elementos.append(p1)

        p2 = Paragraph(
            "<b>DÉCIMA SÉPTIMA. - Efectos.</b> El presente contrato reemplaza en su integridad y deja sin efecto "
            "alguno cualquiera otro contrato verbal o escrito celebrado entre las partes con anterioridad. "
            "Las modificaciones que se acuerden al presente contrato se anotarán a continuación de su "
            "texto.",
            self.styles['TextoNormal']
        )
        elementos.append(p2)

        cierre = Paragraph(
            "En constancia de lo aquí acordado, el presente contrato se firma por las partes, a saber.",
            self.styles['TextoNormal']
        )
        elementos.append(cierre)
        elementos.append(Spacer(1, 0.5*inch))

        return elementos

    def _crear_firmas(self):
        """Crear sección de firmas"""
        elementos = []

        datos = [
            ['EMPLEADOR', 'TRABAJADOR'],
            ['', ''],
            ['', ''],
            ['', ''],
            ['___________________________', '___________________________'],
            [self.empresa.representante_legal.upper(), self.trabajador.nombre_completo.upper()],
            ['Representante Legal', f"C.c. No. {self.trabajador.numero_documento}"],
            [self.empresa.razon_social, ''],
        ]

        tabla = Table(datos, colWidths=[3.25*inch, 3.25*inch])
        tabla.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elementos.append(tabla)

        return elementos


def generar_contrato_pdf(contrato):
    """Función helper para generar PDF de un contrato"""
    generator = ContratoPDFGenerator(contrato)
    return generator.generar()
