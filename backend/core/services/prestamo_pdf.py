# backend/core/services/prestamo_pdf.py

from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from datetime import datetime


def generar_estado_cuenta_pdf(trabajador):
    """
    Genera un estado de cuenta consolidado de todos los adelantos de un trabajador.
    Incluye: info del trabajador, cada préstamo con sus cuotas, resumen global.
    """
    from ..models import Prestamo

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.5*inch, bottomMargin=0.5*inch,
        leftMargin=0.5*inch, rightMargin=0.5*inch,
    )

    styles = getSampleStyleSheet()
    AZUL   = colors.HexColor('#1e3a8a')
    AZUL_L = colors.HexColor('#dbeafe')
    VERDE  = colors.HexColor('#166534')
    VERDE_L= colors.HexColor('#dcfce7')
    ROJO_L = colors.HexColor('#fee2e2')
    AMBER_L= colors.HexColor('#fef3c7')
    GRIS_L = colors.HexColor('#f3f4f6')

    title_style = ParagraphStyle('T', parent=styles['Normal'], fontSize=13,
                                 fontName='Helvetica-Bold', textColor=AZUL, alignment=TA_CENTER)
    sub_style   = ParagraphStyle('S', parent=styles['Normal'], fontSize=8,
                                 alignment=TA_CENTER)
    section_style = ParagraphStyle('Sec', parent=styles['Normal'], fontSize=9,
                                   fontName='Helvetica-Bold', textColor=AZUL, spaceAfter=4)
    small = ParagraphStyle('Sm', parent=styles['Normal'], fontSize=8)

    def fmt(v):
        if v is None: return '$0'
        return f"${int(v):,}".replace(',', '.')

    prestamos = Prestamo.objects.filter(trabajador=trabajador).prefetch_related(
        'cuotas', 'cuotas__quincena'
    ).order_by('fecha_prestamo')

    elements = []

    # ── ENCABEZADO ──────────────────────────────────────────────────────────
    elements.append(Paragraph('ESTADO DE CUENTA — ADELANTOS DE NÓMINA', title_style))
    elements.append(Paragraph(
        f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        sub_style
    ))
    elements.append(Spacer(1, 0.15*inch))

    # ── INFO TRABAJADOR ──────────────────────────────────────────────────────
    finca = trabajador.finca.nombre if trabajador.finca else 'N/A'
    info_data = [
        ['Trabajador:', trabajador.nombre_completo,
         'Documento:', f"{trabajador.get_tipo_documento_display()} {trabajador.numero_documento}"],
        ['Finca:', finca,
         'Teléfono:', trabajador.telefono or 'N/A'],
    ]
    info_t = Table(info_data, colWidths=[1*inch, 2.7*inch, 1*inch, 2.7*inch])
    info_t.setStyle(TableStyle([
        ('FONTNAME',   (0,0),(0,-1), 'Helvetica-Bold'),
        ('FONTNAME',   (2,0),(2,-1), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0),(-1,-1), 8),
        ('BACKGROUND', (0,0),(0,-1), GRIS_L),
        ('BACKGROUND', (2,0),(2,-1), GRIS_L),
        ('GRID',       (0,0),(-1,-1), 0.5, colors.grey),
        ('TOPPADDING', (0,0),(-1,-1), 3),
        ('BOTTOMPADDING',(0,0),(-1,-1), 3),
        ('LEFTPADDING', (0,0),(-1,-1), 4),
    ]))
    elements.append(info_t)
    elements.append(Spacer(1, 0.2*inch))

    # ── PRÉSTAMOS ────────────────────────────────────────────────────────────
    MESES = {1:'Ene',2:'Feb',3:'Mar',4:'Abr',5:'May',6:'Jun',
             7:'Jul',8:'Ago',9:'Sep',10:'Oct',11:'Nov',12:'Dic'}

    total_otorgado   = 0
    total_descontado = 0

    for prestamo in prestamos:
        estado_color = {
            'ACTIVO':   AZUL_L,
            'PAGADO':   VERDE_L,
            'CANCELADO':ROJO_L,
        }.get(prestamo.estado, GRIS_L)

        # Encabezado del préstamo
        pagado_prestamo = int(prestamo.monto_total - prestamo.saldo_pendiente)
        header_data = [[
            f"Adelanto #{prestamo.id}  —  {prestamo.fecha_prestamo.strftime('%d/%m/%Y')}",
            f"Estado: {prestamo.get_estado_display()}",
            f"Monto: {fmt(prestamo.monto_total)}",
            f"Pagado: {fmt(pagado_prestamo)}",
            f"Saldo: {fmt(prestamo.saldo_pendiente)}",
        ]]
        header_t = Table(header_data, colWidths=[1.8*inch,1*inch,1.1*inch,1.1*inch,1.4*inch])
        header_t.setStyle(TableStyle([
            ('BACKGROUND',   (0,0),(-1,0), estado_color),
            ('FONTNAME',     (0,0),(0,0),  'Helvetica-Bold'),
            ('FONTSIZE',     (0,0),(-1,0), 8),
            ('TOPPADDING',   (0,0),(-1,0), 4),
            ('BOTTOMPADDING',(0,0),(-1,0), 4),
            ('LEFTPADDING',  (0,0),(-1,0), 5),
            ('GRID',         (0,0),(-1,0), 0.5, colors.grey),
        ]))
        elements.append(header_t)

        # Observaciones del préstamo
        if prestamo.observaciones:
            elements.append(Spacer(1, 0.03*inch))
            elements.append(Paragraph(
                f"<i>Nota: {prestamo.observaciones}</i>", small
            ))

        # Tabla de cuotas
        cuotas = list(prestamo.cuotas.all().order_by('numero_cuota'))
        if cuotas:
            cuota_rows = [['#', 'Valor', 'Quincena', 'Fecha descuento', 'Estado']]
            for c in cuotas:
                q = c.quincena
                quincena_str = f"Q{q.numero} {MESES.get(q.mes,'?')}/{q.año}" if q else '-'
                fecha_str = c.fecha_descuento.strftime('%d/%m/%Y') if c.fecha_descuento else '-'
                estado_txt = {'PENDIENTE':'Pendiente','DESCONTADA':'Descontada','CANCELADA':'Cancelada'}.get(c.estado, c.estado)
                cuota_rows.append([
                    str(c.numero_cuota),
                    fmt(c.valor_cuota),
                    quincena_str,
                    fecha_str,
                    estado_txt,
                ])
            cuota_t = Table(cuota_rows, colWidths=[0.4*inch,1.1*inch,1.4*inch,1.4*inch,1.1*inch])
            cuota_style = [
                ('BACKGROUND',   (0,0),(-1,0), AZUL),
                ('TEXTCOLOR',    (0,0),(-1,0), colors.whitesmoke),
                ('FONTNAME',     (0,0),(-1,0), 'Helvetica-Bold'),
                ('FONTSIZE',     (0,0),(-1,-1), 7.5),
                ('ALIGN',        (1,0),(1,-1),  'RIGHT'),
                ('ALIGN',        (0,0),(0,-1),  'CENTER'),
                ('GRID',         (0,0),(-1,-1), 0.5, colors.grey),
                ('TOPPADDING',   (0,0),(-1,-1), 2),
                ('BOTTOMPADDING',(0,0),(-1,-1), 2),
                ('LEFTPADDING',  (0,0),(-1,-1), 4),
            ]
            for i, c in enumerate(cuotas, start=1):
                if c.estado == 'DESCONTADA':
                    cuota_style.append(('BACKGROUND', (0,i),(-1,i), VERDE_L))
                elif c.estado == 'CANCELADA':
                    cuota_style.append(('BACKGROUND', (0,i),(-1,i), ROJO_L))
                elif c.estado == 'PENDIENTE':
                    cuota_style.append(('BACKGROUND', (0,i),(-1,i), AMBER_L))
            cuota_t.setStyle(TableStyle(cuota_style))
            elements.append(cuota_t)
        else:
            elements.append(Paragraph('(Pago único — sin cuotas detalladas)', small))

        elements.append(Spacer(1, 0.15*inch))

        total_otorgado   += int(prestamo.monto_total)
        total_descontado += pagado_prestamo

    # ── RESUMEN GLOBAL ────────────────────────────────────────────────────────
    # El saldo pendiente real es solo de préstamos no cancelados (activo/pagado)
    saldo_real = sum(
        int(p.saldo_pendiente)
        for p in prestamos
        if p.estado != 'CANCELADO'
    )
    elements.append(Paragraph('RESUMEN CONSOLIDADO', section_style))
    resumen_data = [
        ['Total descontado acumulado (histórico)', fmt(total_descontado)],
        ['Saldo pendiente actual', fmt(saldo_real)],
    ]
    resumen_t = Table(resumen_data, colWidths=[4*inch, 2*inch])
    resumen_t.setStyle(TableStyle([
        ('FONTNAME',     (0,0),(0,-1), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0),(-1,-1), 9),
        ('ALIGN',        (1,0),(1,-1),  'RIGHT'),
        ('GRID',         (0,0),(-1,-1), 0.5, colors.grey),
        ('BACKGROUND',   (0,0),(-1,0), VERDE_L),
        ('BACKGROUND',   (0,1),(-1,1), AMBER_L),
        ('FONTNAME',     (0,1),(-1,1), 'Helvetica-Bold'),
        ('TOPPADDING',   (0,0),(-1,-1), 4),
        ('BOTTOMPADDING',(0,0),(-1,-1), 4),
        ('LEFTPADDING',  (0,0),(-1,-1), 6),
    ]))
    elements.append(resumen_t)

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generar_autorizacion_pdf(prestamo):
    """Generar documento de autorización de descuento por nómina (adelanto)"""
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
        ['MONTO DEL ADELANTO:', monto_formateado],
        ['FORMA DE PAGO:', tipo_pago],
        ['VALOR POR CUOTA:', cuota_formateada],
        ['FECHA DEL ADELANTO:', prestamo.fecha_prestamo.strftime('%d/%m/%Y')],
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
    1. He recibido el monto total del adelanto de nómina en efectivo/transferencia.<br/>
    2. Autorizo el descuento automático de mi nómina quincenal hasta liquidar la deuda.<br/>
    3. Conozco que el descuento se realizará quincenalmente hasta liquidar el total del adelanto.<br/>
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
    del adelanto de nómina No. <b>{prestamo.id}</b> otorgado el día
    <b>{prestamo.fecha_prestamo.strftime('%d de %B de %Y')}</b>.
    """
    
    elements.append(Paragraph(texto, body_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Detalles
    data = [
        ['Monto del Adelanto:', monto_formateado],
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