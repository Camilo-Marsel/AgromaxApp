# backend/core/services/liquidacion_pdf.py

from io import BytesIO
from decimal import Decimal
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable


AZUL       = colors.HexColor('#1e3a8a')
AZUL_CLARO = colors.HexColor('#dbeafe')
VERDE      = colors.HexColor('#166534')
VERDE_CLARO= colors.HexColor('#dcfce7')
GRIS       = colors.HexColor('#f8fafc')
GRIS_BORDE = colors.HexColor('#e2e8f0')


def fmt(value):
    """Formatea un número como moneda COP sin decimales."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return '—'
    return f"$ {v:,.0f}".replace(',', '.')


def generar_liquidacion_pdf(data: dict) -> BytesIO:
    """
    Genera el PDF de liquidación de contrato.
    `data` es el dict devuelto por calcular_liquidacion().
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('Titulo',   fontSize=13, textColor=AZUL,  alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=2))
    styles.add(ParagraphStyle('SubTitulo',fontSize=9,  textColor=AZUL,  alignment=TA_CENTER, fontName='Helvetica',     spaceAfter=6))
    styles.add(ParagraphStyle('SecHead',  fontSize=9,  textColor=AZUL,  fontName='Helvetica-Bold', spaceBefore=8, spaceAfter=3))
    styles.add(ParagraphStyle('Normal8',  fontSize=8,  textColor=colors.black, fontName='Helvetica'))
    styles.add(ParagraphStyle('Nota',     fontSize=7,  textColor=colors.HexColor('#6b7280'), fontName='Helvetica-Oblique', spaceAfter=4))

    story = []

    # ── Encabezado ────────────────────────────────────────────────────────────
    story.append(Paragraph("LIQUIDACIÓN DE CONTRATO — AGROMAXD DC S.A.S", styles['Titulo']))
    story.append(Paragraph(
        f"Fecha de expedición: {date.today().strftime('%d/%m/%Y')}",
        styles['SubTitulo'],
    ))
    story.append(HRFlowable(width='100%', thickness=1.5, color=AZUL, spaceAfter=8))

    # ── Datos del trabajador ──────────────────────────────────────────────────
    story.append(Paragraph("Datos del trabajador", styles['SecHead']))

    info_rows = [
        ['Trabajador:', data['trabajador_nombre'], 'Cédula:', data.get('trabajador_cedula', '—')],
        ['Finca:', data['finca'], 'Fecha de ingreso:', _fmt_fecha(data['fecha_ingreso'])],
        ['Fecha de retiro:', _fmt_fecha(data['fecha_retiro']), 'Días laborados:', str(data['dias_trabajados'])],
    ]
    info_table = Table(info_rows, colWidths=[1.3*inch, 2.5*inch, 1.3*inch, 2.0*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME',    (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE',    (0, 0), (-1, -1), 8),
        ('FONTNAME',    (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME',    (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR',   (0, 0), (0, -1), AZUL),
        ('TEXTCOLOR',   (2, 0), (2, -1), AZUL),
        ('TOPPADDING',  (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 3),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.15 * inch))

    # ── Tabla de conceptos ────────────────────────────────────────────────────
    story.append(Paragraph("Detalle de la liquidación", styles['SecHead']))

    conceptos = [
        ['Concepto', 'Base / Descripción', 'Valor'],
        [
            'Cesantías',
            f"8.33% sobre salario devengado\nBase: {fmt(data['salario_base_total'])}",
            fmt(data['cesantias']),
        ],
        [
            'Intereses sobre cesantías',
            f"Provisión mensual acumulada\n(ver nota sobre fórmula)",
            fmt(data['intereses_cesantias']),
        ],
        [
            'Prima de servicios',
            f"8.33% sobre salario devengado\nBase: {fmt(data['salario_base_total'])}",
            fmt(data['prima']),
        ],
        [
            'Vacaciones',
            f"4.17% sobre salario devengado\nBase: {fmt(data['salario_base_total'])}",
            fmt(data['vacaciones']),
        ],
    ]

    col_widths = [2.0 * inch, 4.0 * inch, 1.3 * inch]
    ct = Table(conceptos, colWidths=col_widths)
    ct.setStyle(TableStyle([
        # Encabezado
        ('BACKGROUND',   (0, 0), (-1, 0), AZUL),
        ('TEXTCOLOR',    (0, 0), (-1, 0), colors.white),
        ('FONTNAME',     (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0, 0), (-1, 0), 8),
        ('ALIGN',        (-1, 0), (-1, 0), 'RIGHT'),
        # Filas
        ('FONTNAME',     (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE',     (0, 1), (-1, -1), 8),
        ('FONTNAME',     (0, 1), (0, -1), 'Helvetica-Bold'),
        ('ALIGN',        (-1, 1), (-1, -1), 'RIGHT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, GRIS]),
        ('GRID',         (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ('TOPPADDING',   (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 5),
        ('LEFTPADDING',  (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(ct)
    story.append(Spacer(1, 0.1 * inch))

    # ── Total ─────────────────────────────────────────────────────────────────
    total_table = Table(
        [['TOTAL A PAGAR AL TRABAJADOR', fmt(data['total'])]],
        colWidths=[6.0 * inch, 1.3 * inch],
    )
    total_table.setStyle(TableStyle([
        ('BACKGROUND',   (0, 0), (-1, -1), VERDE_CLARO),
        ('TEXTCOLOR',    (0, 0), (-1, -1), VERDE),
        ('FONTNAME',     (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE',     (0, 0), (-1, -1), 10),
        ('ALIGN',        (-1, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING',   (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 8),
        ('LEFTPADDING',  (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('BOX',          (0, 0), (-1, -1), 1, VERDE),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 0.15 * inch))

    # ── Nota legal ────────────────────────────────────────────────────────────
    fuente_txt = (
        "calculados sobre provisiones mensuales PILA registradas en el sistema"
        if data.get('fuente') == 'provisiones'
        else "estimados sobre nóminas aprobadas (no se encontraron provisiones PILA)"
    )
    story.append(Paragraph(
        f"Nota: Valores {fuente_txt}. "
        "Los intereses sobre cesantías están sujetos a verificación contable (fórmula 12% anual prorateado, Art. 99 Ley 50/1990). "
        "Este documento es de carácter informativo; la liquidación definitiva debe ser firmada por ambas partes.",
        styles['Nota'],
    ))

    # ── Firmas ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.4 * inch))
    firmas = Table(
        [
            ['_______________________', '', '_______________________'],
            ['Empleador / Representante', '', 'Trabajador'],
            [data.get('empresa', 'AGROMAXD DC S.A.S'), '', data['trabajador_nombre']],
        ],
        colWidths=[2.5 * inch, 2.3 * inch, 2.5 * inch],
    )
    firmas.setStyle(TableStyle([
        ('FONTNAME',    (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE',    (0, 0), (-1, -1), 8),
        ('ALIGN',       (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME',    (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('TOPPADDING',  (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 2),
    ]))
    story.append(firmas)

    doc.build(story)
    buffer.seek(0)
    return buffer


def _fmt_fecha(f):
    if isinstance(f, str):
        return f
    if isinstance(f, date):
        return f.strftime('%d/%m/%Y')
    return '—'
