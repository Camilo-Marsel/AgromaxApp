# backend/core/services/pdf_generator.py
# REEMPLAZA TODO EL ARCHIVO CON ESTA VERSIÓN COMPACTA:

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime

class ComprobantePDFGenerator:
    """Generador de comprobantes de pago en PDF - Versión Compacta"""
    
    def __init__(self, nomina):
        self.nomina = nomina
        self.trabajador = nomina.trabajador
        self.quincena = nomina.quincena
        self.buffer = BytesIO()
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Configurar estilos personalizados"""
        self.styles.add(ParagraphStyle(
            name='CompactTitle',
            fontSize=12,
            textColor=colors.HexColor('#1e3a8a'),
            spaceAfter=4,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='CompactHeading',
            fontSize=9,
            textColor=colors.HexColor('#1e3a8a'),
            spaceAfter=2,
            fontName='Helvetica-Bold'
        ))
    
    def generar(self):
        """Generar el PDF completo"""
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=letter,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.4*inch,
            bottomMargin=0.4*inch
        )
        
        story = []
        
        # Encabezado compacto
        story.extend(self._crear_encabezado())
        story.append(Spacer(1, 0.1*inch))
        
        # Info en 2 columnas
        story.extend(self._crear_info_compacta())
        story.append(Spacer(1, 0.15*inch))
        
        # Tabla única de conceptos
        story.extend(self._crear_tabla_conceptos())
        story.append(Spacer(1, 0.1*inch))
        
        # Total destacado
        story.extend(self._crear_total())
        
        doc.build(story)
        self.buffer.seek(0)
        return self.buffer
    
    def _crear_encabezado(self):
        """Encabezado compacto"""
        elementos = []
        
        titulo = Paragraph("COMPROBANTE DE PAGO - AGROMAXD DC S.A.S", self.styles['CompactTitle'])
        elementos.append(titulo)
        
        subtitulo = Paragraph(
            f"<font size=8>Quincena {self.quincena.numero} - {self.quincena.mes}/{self.quincena.año} "
            f"({self.quincena.fecha_inicio.strftime('%d/%m')} al {self.quincena.fecha_fin.strftime('%d/%m/%Y')})</font>",
            ParagraphStyle(name='Sub', alignment=TA_CENTER, fontSize=8)
        )
        elementos.append(subtitulo)
        
        return elementos
    
    def _crear_info_compacta(self):
        """Info del trabajador en formato compacto"""
        elementos = []
        
        # Datos en tabla de 2 columnas
        cuenta = self.trabajador.cuenta_oculta if self.trabajador.numero_cuenta_bancaria else 'N/A'
        tipo_cuenta = self.trabajador.get_tipo_cuenta_bancaria_display() if self.trabajador.tipo_cuenta_bancaria else ''
        finca = self.trabajador.finca.nombre if self.trabajador.finca else 'N/A'  # NUEVO
        
        datos = [
            ['Trabajador:', self.trabajador.nombre_completo, 
            'Documento:', f"{self.trabajador.get_tipo_documento_display()} {self.trabajador.numero_documento}"],
            ['Finca:', finca,  # NUEVO
            'Contrato:', self.trabajador.tipo_contrato.get_nombre_display()],
            ['Banco:', f"{self.trabajador.banco or 'N/A'} - {tipo_cuenta}",
            'Cuenta:', cuenta],
        ]
        
        tabla = Table(datos, colWidths=[1*inch, 2.5*inch, 1*inch, 2*inch])
        tabla.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f3f4f6')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elementos.append(tabla)
        
        return elementos
    
    def _crear_tabla_conceptos(self):
        """Tabla única con todos los conceptos"""
        elementos = []
        
        # Encabezado
        datos = [['CONCEPTO', 'CANTIDAD', 'V. UNITARIO', 'VALOR']]
        
        # DEVENGOS
        devengos = self.nomina.detalles.filter(tipo='DEVENGO').order_by('id')
        for dev in devengos:
            cant = f"{dev.cantidad}" if dev.cantidad else '-'
            v_unit = self._format_money_short(dev.valor_unitario) if dev.valor_unitario else '-'
            datos.append([
                dev.descripcion or dev.get_concepto_display(),
                cant,
                v_unit,
                self._format_money_short(dev.valor_total)
            ])
        
        # Subtotal devengado
        datos.append([
            'SUBTOTAL DEVENGADO',
            '',
            '',
            self._format_money_short(self.nomina.total_devengado)
        ])
        
        # DEDUCCIONES
        deducciones = self.nomina.detalles.filter(tipo='DEDUCCION').order_by('id')
        if deducciones.exists():
            for ded in deducciones:
                datos.append([
                    f"(-) {ded.descripcion or ded.get_concepto_display()}",
                    '',
                    '',
                    f"-{self._format_money_short(ded.valor_total)}"
                ])
            
            # Subtotal deducciones
            datos.append([
                'SUBTOTAL DEDUCCIONES',
                '',
                '',
                f"-{self._format_money_short(self.nomina.total_deducciones)}"
            ])
        
        # Calcular índices de filas especiales
        num_devengos = devengos.count()
        idx_subtotal_dev = num_devengos + 1
        idx_subtotal_ded = idx_subtotal_dev + deducciones.count() + 1 if deducciones.exists() else -1
        
        tabla = Table(datos, colWidths=[3.5*inch, 0.8*inch, 1.2*inch, 1*inch])
        
        # Estilos base
        estilos = [
            # Encabezado
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            
            # Contenido
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            
            # Subtotal devengado
            ('BACKGROUND', (0, idx_subtotal_dev), (-1, idx_subtotal_dev), colors.HexColor('#d1fae5')),
            ('FONTNAME', (0, idx_subtotal_dev), (-1, idx_subtotal_dev), 'Helvetica-Bold'),
            
            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]
        
        # Subtotal deducciones si existe
        if idx_subtotal_ded > 0:
            estilos.extend([
                ('BACKGROUND', (0, idx_subtotal_ded), (-1, idx_subtotal_ded), colors.HexColor('#fee2e2')),
                ('FONTNAME', (0, idx_subtotal_ded), (-1, idx_subtotal_ded), 'Helvetica-Bold'),
            ])
        
        tabla.setStyle(TableStyle(estilos))
        elementos.append(tabla)
        
        return elementos
    
    def _crear_total(self):
        """Total neto destacado"""
        elementos = []
        
        datos = [['NETO A PAGAR:', self._format_money(self.nomina.total_neto)]]
        
        tabla = Table(datos, colWidths=[5*inch, 1.5*inch])
        tabla.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#1e3a8a')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elementos.append(tabla)
        
        # Nota pequeña al final
        elementos.append(Spacer(1, 0.1*inch))
        nota = Paragraph(
            f"<font size=7><i>Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}</i></font>",
            ParagraphStyle(name='Nota', alignment=TA_RIGHT, fontSize=7)
        )
        elementos.append(nota)
        
        return elementos
    
    def _format_money(self, valor):
        """Formatear valor como moneda"""
        if valor is None:
            return '$0'
        return f"${int(valor):,}".replace(',', '.')
    
    def _format_money_short(self, valor):
        """Formatear valor como moneda (versión corta)"""
        if valor is None:
            return '$0'
        return f"${int(valor):,}".replace(',', '.')


def generar_comprobante_pdf(nomina):
    """Función helper para generar PDF de una nómina"""
    generator = ComprobantePDFGenerator(nomina)
    return generator.generar()


def generar_colillas_consolidadas(nominas):
    """
    Generar un PDF consolidado con todas las colillas de pago.
    Combina múltiples colillas en un solo PDF, una página por trabajador.

    Args:
        nominas: QuerySet o lista de objetos Nomina

    Returns:
        BytesIO buffer con el PDF consolidado
    """
    from PyPDF2 import PdfMerger

    if not nominas:
        # Si no hay nóminas, retornar PDF vacío con mensaje
        return _generar_pdf_vacio()

    # Crear merger de PDFs
    merger = PdfMerger()

    # Generar PDF individual para cada nómina y agregarla al merger
    for nomina in nominas:
        # Generar PDF individual
        pdf_buffer = generar_comprobante_pdf(nomina)
        pdf_buffer.seek(0)

        # Agregar al documento consolidado
        merger.append(pdf_buffer)

    # Escribir el PDF consolidado a un buffer
    output_buffer = BytesIO()
    merger.write(output_buffer)
    merger.close()

    # Posicionar al inicio para lectura
    output_buffer.seek(0)

    return output_buffer


def _generar_pdf_vacio():
    """Generar PDF con mensaje de 'No hay datos'"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)

    elements = []
    styles = getSampleStyleSheet()

    # Mensaje de no hay datos
    message_style = ParagraphStyle(
        'MessageStyle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=20
    )

    elements.append(Spacer(1, 3*inch))
    elements.append(Paragraph("No hay nóminas para generar", message_style))
    elements.append(Paragraph("Verifique los filtros seleccionados", message_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer