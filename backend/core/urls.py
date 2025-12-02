# backend/core/urls.py

from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Endpoint de prueba para verificar que la API funciona"""
    return Response({
        'status': 'ok',
        'message': 'API Finca Platanera funcionando correctamente'
    })

urlpatterns = [
    path('health/', health_check, name='health_check'),
]