# backend/core/services/email_service.py
# Usando Resend API (HTTP) en lugar de SMTP porque Render bloquea SMTP

import resend
from django.conf import settings
from io import BytesIO
import logging
import base64

logger = logging.getLogger(__name__)


class EmailService:
    """Servicio para envío de correos electrónicos usando Resend API"""

    MESES = {
        1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
        5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
        9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
    }

    @staticmethod
    def enviar_recibo_nomina(nomina, pdf_buffer=None):
        """
        Envía el recibo de nómina por correo electrónico al trabajador.

        Args:
            nomina: Objeto Nomina con la información del pago
            pdf_buffer: BytesIO con el PDF del comprobante (opcional, se genera si no se proporciona)

        Returns:
            dict: {'success': bool, 'message': str}
        """
        trabajador = nomina.trabajador

        # Verificar que el trabajador tenga correo
        if not trabajador.correo:
            return {
                'success': False,
                'message': f'El trabajador {trabajador.nombre_completo} no tiene correo registrado'
            }

        # Verificar configuración de Resend
        resend_api_key = getattr(settings, 'RESEND_API_KEY', None)
        if not resend_api_key:
            return {
                'success': False,
                'message': 'El sistema de correo no está configurado (falta RESEND_API_KEY)'
            }

        try:
            # Configurar Resend
            resend.api_key = resend_api_key

            # Generar PDF si no se proporcionó
            if pdf_buffer is None:
                from .pdf_generator import generar_comprobante_pdf
                pdf_buffer = generar_comprobante_pdf(nomina)

            # Preparar datos para el email
            quincena = nomina.quincena
            nombre_mes = EmailService.MESES.get(quincena.mes, f"Mes {quincena.mes}")
            periodo = f"Q{quincena.numero} - {nombre_mes} {quincena.año}"

            # Nombre del archivo PDF con nombre del trabajador
            nombre_limpio = trabajador.nombre_completo.replace(' ', '_')
            filename = f'Colilla_{nombre_limpio}_{nombre_mes}_{quincena.año}_Q{quincena.numero}.pdf'

            # Leer el PDF y convertir a base64
            pdf_buffer.seek(0)
            pdf_content = pdf_buffer.read()

            # Cuerpo del mensaje en HTML
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #2E7D32; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; }}
                    .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
                    .amount {{ font-size: 24px; color: #2E7D32; font-weight: bold; }}
                    .details {{ background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }}
                    .row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>AGROMAXD S.A.S.</h1>
                        <p>Recibo de Pago</p>
                    </div>
                    <div class="content">
                        <p>Estimado(a) <strong>{trabajador.nombre_completo}</strong>,</p>
                        <p>Adjunto encontrará su comprobante de pago correspondiente al período:</p>

                        <div class="details">
                            <div class="row">
                                <span>Período:</span>
                                <span><strong>{periodo}</strong></span>
                            </div>
                            <div class="row">
                                <span>Fecha de inicio:</span>
                                <span>{quincena.fecha_inicio.strftime('%d/%m/%Y')}</span>
                            </div>
                            <div class="row">
                                <span>Fecha de fin:</span>
                                <span>{quincena.fecha_fin.strftime('%d/%m/%Y')}</span>
                            </div>
                            <div class="row">
                                <span>Total Devengado:</span>
                                <span>${nomina.total_devengado:,.0f}</span>
                            </div>
                            <div class="row">
                                <span>Total Deducciones:</span>
                                <span>${nomina.total_deducciones:,.0f}</span>
                            </div>
                            <div class="row" style="border-bottom: none;">
                                <span><strong>Neto a Pagar:</strong></span>
                                <span class="amount">${nomina.total_neto:,.0f}</span>
                            </div>
                        </div>

                        <p>Para mayor detalle, consulte el archivo PDF adjunto.</p>
                        <p>Si tiene alguna inquietud sobre su pago, comuníquese con el área administrativa.</p>
                    </div>
                    <div class="footer">
                        <p>Este es un mensaje automático, por favor no responda a este correo.</p>
                        <p>AGROMAXD S.A.S. - Sistema de Gestión de Nómina</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Enviar usando Resend API
            params = {
                "from": getattr(settings, 'DEFAULT_FROM_EMAIL', 'AGROMAXD <onboarding@resend.dev>'),
                "to": [trabajador.correo],
                "subject": f'Recibo de Pago - {periodo} | AGROMAXD',
                "html": html_content,
                "attachments": [
                    {
                        "filename": filename,
                        "content": list(pdf_content),  # Resend acepta lista de bytes
                    }
                ],
            }

            response = resend.Emails.send(params)

            logger.info(f'Recibo enviado exitosamente a {trabajador.correo}. ID: {response.get("id", "N/A")}')

            return {
                'success': True,
                'message': f'Recibo enviado exitosamente a {trabajador.correo}'
            }

        except Exception as e:
            logger.error(f'Error al enviar recibo a {trabajador.correo}: {str(e)}')
            return {
                'success': False,
                'message': f'Error al enviar correo: {str(e)}'
            }

    @staticmethod
    def enviar_recibos_masivo(nominas):
        """
        Envía recibos de nómina a múltiples trabajadores.

        Args:
            nominas: QuerySet o lista de objetos Nomina

        Returns:
            dict: {'exitosos': int, 'fallidos': int, 'detalles': list}
        """
        resultados = {
            'exitosos': 0,
            'fallidos': 0,
            'detalles': []
        }

        for nomina in nominas:
            resultado = EmailService.enviar_recibo_nomina(nomina)

            if resultado['success']:
                resultados['exitosos'] += 1
            else:
                resultados['fallidos'] += 1

            resultados['detalles'].append({
                'trabajador': nomina.trabajador.nombre_completo,
                'correo': nomina.trabajador.correo or 'Sin correo',
                **resultado
            })

        return resultados


def enviar_recibo_nomina(nomina, pdf_buffer=None):
    """Función de conveniencia para enviar un recibo individual"""
    return EmailService.enviar_recibo_nomina(nomina, pdf_buffer)


def enviar_recibos_masivo(nominas):
    """Función de conveniencia para enviar recibos masivos"""
    return EmailService.enviar_recibos_masivo(nominas)
