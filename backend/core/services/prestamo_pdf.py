# backend/core/services/prestamo_pdf.py

from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from datetime import datetime


def generar_autorizacion_pdf(prestamo):
    """Generar documento de autorización de descuento por nómina"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        alignment=TA_JUSTIFY,
        spaceAfter=12,
        leading=16
    )
    
    # Título
    elements.append(Paragraph("AUTORIZACIÓN DE DESCUENTO POR NÓMINA", title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Cuerpo del documento
    trabajador = prestamo.trabajador
    
    texto = f"""
    Yo, <b>{trabajador.nombre_completo}</b>, identificado(a) con cédula de ciudadanía 
    No. <b>{trabajador.numero_documento}</b>, en mi calidad de trabajador(a) de 
    <b>AGROMAXD DC S.A.S.</b>, AUTORIZO de manera expresa, voluntaria e irrevocable 
    para que se descuente de mi salario quincenal las siguientes cantidades:
    """
    
    elements.append(Paragraph(texto, body_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Tabla de detalles del préstamo
    monto_formateado = f"${prestamo.monto_total:,.0f}".replace(',', '.')
    cuota_formateada = f"${prestamo.valor_cuota:,.0f}".replace(',', '.')
    
    tipo_pago = "Pago Único" if prestamo.tipo_pago == 'UNICO' else f"{prestamo.numero_cuotas} Cuotas"
    
    data = [
        ['MONTO DEL PRÉSTAMO:', monto_formateado],
        ['FORMA DE PAGO:', tipo_pago],
        ['VALOR POR CUOTA:', cuota_formateada],
        ['FECHA DEL PRÉSTAMO:', prestamo.fecha_prestamo.strftime('%d/%m/%Y')],
    ]
    
    table = Table(data, colWidths=[3*inch, 3*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e5e7eb')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Manifestaciones
    texto2 = """
    <b>Manifiesto que:</b><br/>
    <br/>
    1. He recibido el monto total del préstamo en efectivo/transferencia.<br/>
    2. Autorizo el descuento automático de mi nómina quincenal hasta liquidar la deuda.<br/>
    3. Conozco que el descuento se realizará quincenalmente hasta liquidar el total del préstamo.<br/>
    4. En caso de retiro, autorizo descontar el saldo pendiente de mi liquidación final.<br/>
    5. Este documento tiene plena validez legal para efectos de descuento por nómina.
    """
    
    elements.append(Paragraph(texto2, body_style))
    elements.append(Spacer(1, 0.5*inch))
    
    # Firmas
    firma_data = [
        ['_____________________________', '_____________________________'],
        ['Firma del Trabajador', 'Firma del Empleador'],
        [f'C.C. {trabajador.numero_documento}', 'AGROMAXD DC S.A.S.'],
        ['', ''],
        [f'Fecha: {datetime.now().strftime("%d/%m/%Y")}', f'Fecha: {datetime.now().strftime("%d/%m/%Y")}'],
    ]
    
    firma_table = Table(firma_data, colWidths=[3*inch, 3*inch])
    firma_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    elements.append(firma_table)
    
    # Construir PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer


def generar_paz_y_salvo_pdf(prestamo):
    """Generar certificado de paz y salvo"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Estilos
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#059669'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=12,
        alignment=TA_JUSTIFY,
        spaceAfter=15,
        leading=18
    )
    
    # Título
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("CERTIFICADO DE PAZ Y SALVO", title_style))
    elements.append(Spacer(1, 0.5*inch))
    
    # Cuerpo
    trabajador = prestamo.trabajador
    monto_formateado = f"${prestamo.monto_total:,.0f}".replace(',', '.')
    
    texto = f"""
    <b>AGROMAXD DC S.A.S.</b> certifica que el(la) señor(a) 
    <b>{trabajador.nombre_completo}</b>, identificado(a) con C.C. 
    <b>{trabajador.numero_documento}</b>, se encuentra <b>A PAZ Y SALVO</b> por concepto 
    del préstamo No. <b>{prestamo.id}</b> otorgado el día 
    <b>{prestamo.fecha_prestamo.strftime('%d de %B de %Y')}</b>.
    """
    
    elements.append(Paragraph(texto, body_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Detalles
    data = [
        ['Monto del Préstamo:', monto_formateado],
        ['Total Pagado:', monto_formateado],
        ['Saldo Pendiente:', '$0'],
        ['Fecha de Liquidación:', datetime.now().strftime('%d/%m/%Y')],
    ]
    
    table = Table(data, colWidths=[3*inch, 2.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#d1fae5')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#059669')),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 0.5*inch))
    
    texto2 = """
    Se expide el presente certificado a solicitud del interesado para los fines que 
    considere pertinentes.
    """
    
    elements.append(Paragraph(texto2, body_style))
    elements.append(Spacer(1, inch))
    
    # Firma
    firma_style = ParagraphStyle(
        'Firma',
        parent=styles['BodyText'],
        fontSize=11,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    elements.append(Paragraph("_____________________________", firma_style))
    elements.append(Paragraph("Firma Autorizada", firma_style))
    elements.append(Paragraph("AGROMAXD DC S.A.S.", firma_style))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph(f"Fecha: {datetime.now().strftime('%d de %B de %Y')}", firma_style))
    
    # Construir PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer